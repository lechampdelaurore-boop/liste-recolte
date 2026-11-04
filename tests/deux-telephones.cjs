// Test de bout en bout : deux téléphones (François et Aurore) ouvrent l'appli,
// partagent les coches et l'ordre via un faux Firebase, et on vérifie les caisses et les filtres.
// Lancement depuis la racine du dépôt : npm install --no-save playwright && node tests/deux-telephones.cjs
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');
const fauxFirebase = require('./faux-firebase.cjs');

const RACINE = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const PORT_SITE = 8790, PORT_BASE = 8791;

function serveurSite() {
  return new Promise((ok) => {
    const s = http.createServer((q, r) => {
      let f = decodeURIComponent(new URL(q.url, 'http://x').pathname);
      if (f.endsWith('/')) f += 'index.html';
      const chemin = path.join(RACINE, f);
      if (!chemin.startsWith(RACINE) || !fs.existsSync(chemin)) { r.writeHead(404); return r.end(); }
      r.writeHead(200, { 'Content-Type': TYPES[path.extname(chemin)] || 'application/octet-stream' });
      fs.createReadStream(chemin).pipe(r);
    });
    s.listen(PORT_SITE, () => ok(s));
  });
}

let echecs = 0;
function verifie(cond, msg) { console.log((cond ? 'OK    ' : 'ÉCHEC ') + msg); if (!cond) echecs++; }

(async () => {
  const site = await serveurSite();
  const base = await fauxFirebase(PORT_BASE);
  const nav = await chromium.launch();
  const erreurs = [];

  const telephone = async (nom) => {
    const ctx = await nav.newContext({ ...devices['Pixel 7'], serviceWorkers: 'block' });
    await ctx.addInitScript((n) => localStorage.setItem('recolte.qui', JSON.stringify(n)), nom);
    // L'appli utilise le faux Firebase au lieu de l'adresse de config.js.
    await ctx.route('**/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: `window.RECOLTE_DB_URL='http://localhost:${PORT_BASE}';` }));
    const p = await ctx.newPage();
    p.on('pageerror', (e) => erreurs.push(nom + ' : ' + e.message));
    await p.goto(`http://localhost:${PORT_SITE}/`);
    await p.waitForSelector('li.item');
    return { p, ctx };
  };
  const ordre = (p) => p.$$eval('#todo li.item', (e) => e.map((x) => x.dataset.id));

  const A = (await telephone('François')).p;
  const { p: B, ctx: ctxB } = await telephone('Aurore');
  await A.waitForTimeout(500);
  verifie((await A.textContent('#sync')).includes('Partagé'), 'François est connecté à la base');

  // 1. Cocher chez François, voir chez Aurore
  await A.click('li[data-id="mesclun"] .box');
  await B.waitForTimeout(500);
  verifie((await B.textContent('#doneCount')) === '1', 'la coche de François arrive chez Aurore');
  verifie((await B.textContent('#done li .by')).includes('François'), 'Aurore voit qui a récolté');
  verifie(!(await ordre(B)).includes('mesclun'), 'la ligne cochée quitte la liste principale');

  // 2. Appui long puis glisser au doigt chez Aurore, voir l'ordre chez François
  const cdp = await ctxB.newCDPSession(B);
  const doigt = async (id, versY, attente) => {
    const boite = await (await B.$(`li[data-id="${id}"] .prod`)).boundingBox();
    const x = boite.x + 20, y = boite.y + boite.height / 2;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await B.waitForTimeout(attente);
    for (let i = 1; i <= 12; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + (versY - y) * i / 12 }] });
      await B.waitForTimeout(30);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await B.waitForTimeout(300);
  };
  // Fait défiler pour que le haut de la liste soit juste sous la barre des filtres (la bette doit être à l'écran).
  const voirListe = () => B.evaluate(() => scrollTo(0, document.querySelector('#todo').getBoundingClientRect().top + scrollY - document.querySelector('.controls').getBoundingClientRect().height - 20));
  await voirListe(); await B.waitForTimeout(100);
  const avant = await ordre(B);
  const premiere = await (await B.$('#todo li.item')).boundingBox();
  await doigt('bette', premiere.y + 5, 50);
  verifie((await ordre(B)).join() === avant.join(), 'un glissement rapide (défilement) ne déplace pas la ligne');
  await voirListe(); await B.waitForTimeout(100);
  const premiere2 = await (await B.$('#todo li.item')).boundingBox();
  await doigt('bette', premiere2.y + 5, 650);
  await A.waitForTimeout(500);
  verifie((await ordre(A))[0] === 'bette', 'après un appui long, la bette glissée en tête chez Aurore est en tête chez François');

  // 3. Caisses (mesclun coché : 2 PH en moins). Panier adéquat, Locavore et Ferme Deschamps sont en colis bois :
  //    la bette des paniers (3,5 colis GH) compte 4 grands colis bois, le persil Deschamps (1 colis PB) 1 petit colis bois.
  const noms = await B.$$eval('.crate .nm', (e) => e.map((x) => x.textContent));
  verifie(noms.slice(4).join(',') === 'Petit colis bois,Moyen colis bois,Grand colis bois', 'les colis bois s\'ajoutent aux caisses (obtenu ' + noms.join(' / ') + ')');
  const caisses = await B.$$eval('.crate', (e) => e.map((x) => x.querySelector('b').textContent));
  verifie(caisses.join(',') === '2,18,2,10,1,1,4', 'à remplir PB,PH,GB,GH,petit,moyen,grand bois = 2,18,2,10,1,1,4 (obtenu ' + caisses.join(',') + ')');
  await B.click('#crates summary');
  await B.click('#perCirc');
  const regroupees = await B.$$eval('.crate', (e) => e.map((x) => x.querySelector('b').textContent));
  verifie(regroupees.join(',') === '1,18,1,10,1,1,4', 'demi-colis regroupés = 1,18,1,10,1,1,4 (obtenu ' + regroupees.join(',') + ')');
  verifie((await B.textContent('#crateAlt')).includes('Panier adéquat, Locavore, Ferme Deschamps : PB → petit colis bois, PH → moyen colis bois, GB → grand colis bois, GH → grand colis bois'), 'le rappel du colisage bois est affiché');

  // 3 bis. Vue Détail : le circuit en colis bois dit lequel, les autres gardent « colis »
  await B.click('[data-view="detail"]');
  const tagsBette = await B.$$eval('li[data-id="bette"] .tag', (e) => e.map((x) => x.textContent));
  verifie(tagsBette.includes('Panier adéquat : 3,5 grands colis bois de 5 kg') && tagsBette.includes('TA : 1 colis') && tagsBette.includes('GH · 5 kg'), 'détail bette : Panier adéquat en grands colis bois de 5 kg (même contenu que GH), TA en colis (obtenu ' + tagsBette.join(' / ') + ')');
  const tagsPersil = await B.$$eval('li[data-id="persil"] .tag', (e) => e.map((x) => x.textContent));
  verifie(tagsPersil.includes('Deschamps : 1 petit colis bois de 10 bouquets'), 'détail persil : 1 petit colis bois de 10 bouquets (obtenu ' + tagsPersil.join(' / ') + ')');
  await B.click('[data-view="recolte"]');

  // 4. Filtre circuit
  await B.click('[data-c="lv"]');
  const lv = await B.$$eval('#todo li.item', (e) => e.length);
  verifie(lv === 7, 'filtre Locavore : 7 lignes (obtenu ' + lv + ')');
  await B.click('[data-c="fd"]');
  const fd = await B.$$eval('#todo li.item', (e) => e.map((x) => x.dataset.id + ' ' + x.querySelector('.qty').textContent));
  verifie(fd.join() === 'persil 1 petit colis boisde 10 bouquets,carotte 1 moyen colis boisde 8 kg', 'filtre Ferme Deschamps : persil en petit colis bois de 10 bouquets, carotte en moyen colis bois de 8 kg (obtenu ' + fd.join() + ')');
  await B.click('[data-c="lm"]');
  const lm = await B.$$eval('#todo li.item', (e) => e.map((x) => x.dataset.id + ' ' + x.querySelector('.qty').textContent));
  verifie(lm.join() === 'radis-noir 1 colis5 kg,patate-douce 5 kg', 'filtre Panier La Magic : radis noir 1 colis (PH), patate douce 5 kg (obtenu ' + lm.join() + ')');
  await B.click('[data-c="ps"]');
  const betteps = await B.$eval('li[data-id="bette"] .qty', (x) => x.textContent);
  verifie(betteps === '3,5 grands colis boisde 5 kg · 17,5 kg', 'filtre Panier adéquat : bette 3,5 grands colis bois de 5 kg, 17,5 kg comme en GH (obtenu ' + betteps + ')');
  await B.click('[data-c=""]');

  // 5. Décocher
  await A.click('#doneSec summary');
  await A.click('#done li[data-id="mesclun"] .box');
  await B.waitForTimeout(500);
  verifie((await B.textContent('#doneCount')) === '0', 'décocher chez François remet la ligne chez Aurore');

  // 6. Barre de progression (liste du 4/11 : 183 kg et 66 unités ; tomates « tout » non comptées)
  verifie((await B.textContent('#progPct')) === '0 %' && (await B.textContent('#progSum')) === '0 sur 183 kg, 0 sur 66 unités', 'barre globale à 0 % : 0 sur 183 kg, 0 sur 66 unités (obtenu ' + (await B.textContent('#progSum')) + ')');
  verifie(!(await B.isVisible('#progU')), 'le détail est replié au départ');
  await A.click('li[data-id="endive"] .box');
  await A.click('li[data-id="celeri-branche"] .box');
  await B.waitForTimeout(500);
  // (50 + 5,5) kg + 34 bottes = 89,5 sur 249 → 36 %
  verifie((await B.textContent('#progPct')) === '36 %', 'les coches de François font avancer la barre globale chez Aurore : 36 % (obtenu ' + (await B.textContent('#progPct')) + ')');
  verifie((await B.getAttribute('#progBar', 'aria-valuenow')) === '36', 'la barre verte est remplie à 36 %');
  await B.click('#prog .arrow');
  const u = await B.textContent('#progU'), k = await B.textContent('#progK');
  verifie(await B.isVisible('#progU') && u.includes('34 sur 66') && u.includes('52 %') && u.includes('Reste : 7 bottes, 10 bouquets, 10 poireaux, 5 pièces'), 'la flèche déplie la barre des unités : 34 sur 66, 52 % (obtenu ' + u.replace(/\s+/g, ' ').trim() + ')');
  verifie(k.includes('55,5 sur 183 kg') && k.includes('30 %') && k.includes('Reste : 127,5 kg'), 'barre des kilos : 55,5 sur 183 kg, 30 % (obtenu ' + k.replace(/\s+/g, ' ').trim() + ')');
  verifie((await B.textContent('#progNote')).includes('Non compté (pas de quantité) : Tomates'), 'les tomates « tout » sont signalées comme non comptées');

  // 5. Lieu des récoltes masqué pour l'instant (décision du 4/11/2026)
  verifie((await B.$$('li.item .ou')).length === 0, 'aucun emplacement (T1-3, B4…) sous les produits');
  verifie(!(await B.isVisible('#zones')), 'les puces de zone sont cachées');
  await B.click('[data-view="detail"]');
  const tags = await B.$$eval('li.item .tag', (e) => e.map((x) => x.textContent.trim()));
  verifie(tags.length > 0 && !tags.some((t) => ['Tunnel', 'Plein champ', 'Stock'].includes(t)), 'la vue Détail n\'affiche plus la zone');
  await B.click('[data-view="recolte"]');
  verifie((await B.$$('#resetOrder')).length === 0, 'le bouton « Remettre l\'ordre par zone » a disparu');

  verifie(erreurs.length === 0, 'aucune erreur JavaScript' + (erreurs.length ? ' : ' + erreurs.join(' | ') : ''));
  await nav.close(); site.close(); base.close();
  process.exit(echecs ? 1 : 0);
})();
