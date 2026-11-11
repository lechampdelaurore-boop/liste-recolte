// Test de bout en bout : deux téléphones (François et Aurore) ouvrent l'appli,
// partagent les coches et l'ordre via un faux Firebase, et on vérifie les caisses et les filtres,
// puis le mode hors ligne (coches en attente, « la dernière action gagne », liste gardée sur le téléphone).
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
      // L'appli utilise le faux Firebase au lieu de l'adresse de config.js (servi ici pour que le service worker l'ait aussi).
      // Sans clé web : pas de compte (le fichier du dépôt, une fois rempli par François, n'est pas lu par les tests).
      if (f === '/cle-web.js') { r.writeHead(200, { 'Content-Type': 'text/javascript' }); return r.end("window.RECOLTE_CLE_WEB='';"); }
      if (f === '/config.js') { r.writeHead(200, { 'Content-Type': 'text/javascript' }); return r.end(`window.RECOLTE_DB_URL='http://localhost:${PORT_BASE}';`); }
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
    const p = await ctx.newPage();
    p.on('pageerror', (e) => erreurs.push(nom + ' : ' + e.message));
    await p.goto(`http://localhost:${PORT_SITE}/?liste=2026-11-04`);
    await p.waitForSelector('li.item');
    return { p, ctx };
  };
  const ordre = (p) => p.$$eval('#todo li.item', (e) => e.map((x) => x.dataset.id));

  const { p: A, ctx: ctxA } = await telephone('François');
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
  // Les 10 PH d'endives (caisses déjà sur place, 11/11/2026) ne sont plus comptés : 19 PH → 9 PH.
  verifie(caisses.join(',') === '2,9,2,10,1,1,4', 'à remplir PB,PH,GB,GH,petit,moyen,grand bois = 2,9,2,10,1,1,4, sans les 10 PH d\'endives (obtenu ' + caisses.join(',') + ')');
  await B.click('#crates summary');
  await B.click('#perCirc');
  const regroupees = await B.$$eval('.crate', (e) => e.map((x) => x.querySelector('b').textContent));
  verifie(regroupees.join(',') === '1,9,1,10,1,1,4', 'demi-colis regroupés = 1,9,1,10,1,1,4 (obtenu ' + regroupees.join(',') + ')');
  verifie((await B.textContent('#crateAlt')).includes('Panier adéquat, Locavore, Ferme Deschamps : PB → petit colis bois, PH → moyen colis bois, GB → grand colis bois, GH → grand colis bois'), 'le rappel du colisage bois est affiché');

  // 3 bis. Onglet Détail supprimé (caché le 4/11/2026, supprimé le 9/11/2026 à la demande de François)
  const onglets = await B.$$eval('#tabs button[data-view]', (e) => e.map((x) => x.dataset.view));
  verifie(onglets.join() === 'semaine,recolte,prep,reglages', 'quatre onglets, plus d\'onglet Détail dans la page (obtenu ' + onglets.join() + ')');
  verifie(!(await B.evaluate(() => /MONTRER_DETAIL/.test(document.documentElement.outerHTML))), 'le réglage MONTRER_DETAIL n\'existe plus');
  await B.evaluate(() => localStorage.setItem('recolte.ui', JSON.stringify(Object.assign(JSON.parse(localStorage.getItem('recolte.ui') || '{}'), { view: 'detail' }))));
  await B.reload(); await B.waitForSelector('li.item');
  verifie((await B.getAttribute('[data-view="recolte"]', 'aria-pressed')) === 'true' && await B.isVisible('#todo'), 'un téléphone resté sur Détail rouvre sur Récolte');
  verifie(JSON.parse(await B.evaluate(() => localStorage.getItem('recolte.ui'))).view === 'recolte', 'et le garde : il ne retombe plus sur Détail');
  // Petite flèche sous chaque produit (onglet Récolte) : répartition par client, colisage et poids
  verifie((await B.$$('#todo li.item .more')).length === (await B.$$('#todo li.item')).length && (await B.$$('.repart')).length === 0, 'chaque produit a sa petite flèche, tout est replié au départ');
  await B.click('li[data-id="bette"] .more');
  const repBette = await B.$$eval('li[data-id="bette"] .repart li', (e) => e.map((x) => x.innerText.replace(/\s+/g, ' ').trim()));
  verifie(repBette.join(' | ') === 'Colis GH de 5 kg | Très Allier 1 colis 5 kg | Marché ven. 1,5 colis 7,5 kg | Panier adéquat 3,5 grands colis bois de 5 kg · 17,5 kg | Locavore 1 × 1 kg + 4 × 500 g', 'la flèche de la bette déplie la répartition par client avec colisage et poids (obtenu ' + repBette.join(' | ') + ')');
  verifie((await B.getAttribute('li[data-id="bette"] .more', 'aria-expanded')) === 'true' && (await B.$$('.repart')).length === 1, 'seule la bette est dépliée');
  verifie((await B.textContent('#doneCount')) === '1', 'toucher la flèche ne coche pas le produit');
  await A.click('li[data-id="poireau"] .box'); await B.waitForTimeout(500);
  verifie((await B.$$('li[data-id="bette"] .repart')).length === 1, 'la répartition reste ouverte quand une coche arrive de l\'autre téléphone');
  await A.click('#doneSec summary'); await A.click('#done li[data-id="poireau"] .box'); await A.click('#doneSec summary'); await B.waitForTimeout(500);
  await B.click('li[data-id="persil"] .more');
  const repPersil = await B.$$eval('li[data-id="persil"] .repart li', (e) => e.map((x) => x.innerText.replace(/\s+/g, ' ').trim()));
  verifie(repPersil.includes('Ferme Deschamps 1 petit colis bois de 10 bouquets'), 'persil : Ferme Deschamps en 1 petit colis bois de 10 bouquets (obtenu ' + repPersil.join(' | ') + ')');
  verifie(await B.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'pas de défilement de côté avec la répartition ouverte');
  await B.click('li[data-id="bette"] .more'); await B.click('li[data-id="persil"] .more');
  verifie((await B.$$('.repart')).length === 0, 'la flèche replie la répartition');


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
  const phLm = await B.$eval('.crate[data-c="PH"] b', (x) => x.textContent);
  verifie(phLm === '2', 'Panier La Magic : les 5 kg de patates douces hors colis prennent une caisse PH de plus, avec le radis noir = 2 PH (obtenu ' + phLm + ')');
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
  verifie((await B.$$('#resetOrder')).length === 0, 'le bouton « Remettre l\'ordre par zone » a disparu');

  // 7. Préparation de commandes (endive et céleri-branche sont récoltés à ce stade, rien d'autre)
  const recolteAvant = await B.textContent('#doneCount');
  await A.click('[data-view="prep"]');
  await B.click('[data-view="prep"]');
  verifie(await B.isVisible('#prepView') && !(await B.isVisible('#todo')) && await B.isVisible('#prepSort'), 'l\'onglet Préparation remplace la liste de récolte et montre le choix du tri');
  verifie((await B.getAttribute('[data-sort="client"]', 'aria-pressed')) === 'true', 'tri par client par défaut');
  const clients = await B.$$eval('#prepList section.grp', (e) => e.map((x) => x.dataset.circ));
  verifie(clients.join() === 'av,el,fd,lv,mk,ps,lm,ta', 'un bloc par client, par ordre alphabétique : Auvabio, Élie (accent compris), Ferme Deschamps, Locavore, Marché, Panier adéquat, Panier La Magic, Très Allier (obtenu ' + clients.join() + ')');
  const fr = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });
  const enOrdre = (t) => t.every((x, i) => i === 0 || fr.compare(t[i - 1], x) <= 0);
  const prodsClients = await B.$$eval('#prepList section.grp', (e) => e.map((s) => [...s.querySelectorAll('li.pitem .prod')].map((x) => x.textContent)));
  verifie(prodsClients.length === 8 && prodsClients.every(enOrdre), 'dans chaque client, les produits sont par ordre alphabétique (Très Allier : ' + prodsClients[7].join(', ') + ')');
  const nLignes = await B.$$eval('#prepList li.pitem', (e) => e.length);
  verifie(nLignes === 38, 'une ligne par produit et par client : 38 lignes (obtenu ' + nLignes + ')');
  const ligne = (p, k) => p.$(`li.pitem[data-k="${k}"]`);
  verifie((await (await ligne(B, 'av/endive')).textContent()).includes('✓ Récolté'), 'l\'endive (récoltée) porte « Récolté »');
  verifie((await (await ligne(B, 'ta/bette')).textContent()).includes('Pas encore récolté'), 'la bette (pas récoltée) porte « Pas encore récolté »');
  const qPs = await (await ligne(B, 'ps/bette')).$eval('.qty', (x) => x.textContent);
  verifie(qPs === '3,5 grands colis boisde 5 kg · 17,5 kg', 'Panier adéquat, bette : 3,5 grands colis bois de 5 kg, 17,5 kg (obtenu ' + qPs + ')');
  // Cocher une ligne chez François (toucher la ligne entière), la voir chez Aurore ; la récolte ne bouge pas
  await (await ligne(A, 'ta/mesclun')).click();
  await B.waitForTimeout(500);
  verifie(await (await ligne(B, 'ta/mesclun')).evaluate((x) => x.classList.contains('done')), 'une ligne préparée chez François est cochée chez Aurore');
  verifie((await (await ligne(B, 'ta/mesclun')).textContent()).includes('Préparé par François'), 'Aurore voit qui a préparé');
  verifie(!(await (await ligne(B, 'mk/mesclun')).evaluate((x) => x.classList.contains('done'))), 'le mesclun du marché reste à préparer (une coche par client)');
  verifie((await B.textContent('#doneCount')) === recolteAvant && (await (await ligne(B, 'ta/mesclun')).textContent()).includes('Pas encore récolté'), 'cocher la préparation ne coche pas la récolte');
  // Commande prête : Élie (poireau) part en bas, dans « Commandes prêtes », et reste visible
  await B.click('section[data-circ="el"] .box[data-client]');
  await A.waitForTimeout(500);
  verifie((await A.$$('#prepList section[data-circ="el"]')).length === 0 && (await A.textContent('#prepDoneCount')) === '1', 'la commande Élie prête chez Aurore passe en bas chez François');
  await A.click('#prepDoneSec summary');
  const ellie = await A.textContent('#prepDone section[data-circ="el"]');
  verifie(ellie.includes('Élie') && !ellie.includes('Ellie'), 'le client s\'appelle « Élie » (identifiant « el » inchangé, coches gardées)');
  verifie(ellie.includes('Poireau') && ellie.includes('Attention : 1 ligne pas cochée'), 'la commande prête reste visible en bas, avec l\'alerte de la ligne pas cochée');
  // Tri par produit : cocher la bette de Locavore, la voir cochée chez François dans le tri par client
  await B.click('[data-sort="produit"]');
  const lignesBette = await B.$$eval('section[data-item="bette"] li.pitem .prod', (e) => e.map((x) => x.textContent));
  verifie(lignesBette.join() === 'Locavore,Marché ven.,Panier adéquat,Très Allier', 'tri par produit : la bette a une ligne par client, clients par ordre alphabétique (obtenu ' + lignesBette.join() + ')');
  const nomsProduits = await B.$$eval('#prepList section.grp .grp-name', (e) => e.map((x) => x.textContent));
  verifie(nomsProduits.length > 5 && enOrdre(nomsProduits), 'tri par produit : produits par ordre alphabétique (obtenu ' + nomsProduits.join(', ') + ')');
  verifie((await B.textContent('section[data-item="bette"] .grp-head')).includes('Pas encore récolté'), 'tri par produit : l\'indicateur de récolte est sur le produit');
  verifie(!(await B.isVisible('#prepDoneSec')), 'tri par produit : pas de section « Commandes prêtes »');
  await (await ligne(B, 'lv/bette')).click();
  await A.waitForTimeout(500);
  verifie(await (await ligne(A, 'lv/bette')).evaluate((x) => x.classList.contains('done')), 'la bette Locavore cochée en tri par produit est cochée chez François en tri par client');
  // Filtre de circuit dans la préparation
  await B.click('[data-c="fd"]');
  const fdPrep = await B.$$eval('#prepList li.pitem', (e) => e.map((x) => x.dataset.k));
  verifie(fdPrep.join() === 'fd/carotte,fd/persil', 'filtre Ferme Deschamps : 2 lignes (obtenu ' + fdPrep.join() + ')');
  await B.click('[data-c=""]');
  // Les coches de préparation reviennent de la base après rechargement
  await B.reload(); await B.waitForSelector('li.pitem'); await B.waitForTimeout(500);
  verifie((await B.getAttribute('[data-sort="produit"]', 'aria-pressed')) === 'true', 'après rechargement, l\'onglet et le tri choisis sont gardés');
  await B.click('[data-sort="client"]');
  const garde = async (k) => (await ligne(B, k)).evaluate((x) => x.classList.contains('done'));
  verifie((await B.textContent('#prepDoneCount')) === '1' && await garde('lv/bette') && await garde('ta/mesclun'), 'après rechargement, Élie est toujours prête, le mesclun TA et la bette Locavore cochés');
  // Rouvrir la commande, décocher une ligne
  await A.click('#prepDone section[data-circ="el"] .box[data-client]');
  await A.waitForTimeout(300); // l'écho de la base redessine la liste
  await (await ligne(A, 'ta/mesclun')).click();
  await B.waitForTimeout(500);
  verifie((await B.textContent('#prepDoneCount')) === '0' && !(await (await ligne(B, 'ta/mesclun')).evaluate((x) => x.classList.contains('done'))), 'rouvrir la commande et décocher une ligne chez François se voit chez Aurore');
  verifie(await B.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'pas de défilement de côté dans la préparation');
  await B.click('[data-view="recolte"]');
  verifie((await B.textContent('#doneCount')) === recolteAvant && await B.isVisible('#todo'), 'retour à l\'onglet Récolte : les coches de récolte sont inchangées');

  // 8. Mode hors ligne (étape 21). Endive et céleri-branche sont récoltés à ce stade, rien d'autre.
  await A.click('[data-view="recolte"]');
  const pastille = async (p) => (await p.textContent('#sync')).trim();
  const partage = (p) => p.waitForFunction(() => document.querySelector('#sync').textContent.includes('Partagé'), null, { timeout: 15000 });
  // Coché : rangé dans « Récoltes déjà effectuées », ou encore en animation (vert) à sa place juste après la coche.
  const estCoche = (p, id) => p.$$eval('#done li, #todo li.vient-coche', (e, i) => e.some((x) => x.dataset.id === i), id);
  const cocher = (p, id) => p.click(`#todo li[data-id="${id}"] .box`);
  const decocher = async (p, id) => {
    if (!(await p.$eval('#doneSec', (d) => d.open))) await p.click('#doneSec summary');
    await p.click(`#done li[data-id="${id}"] .box`);
  };
  const enAttente = (p) => p.evaluate((k) => JSON.parse(localStorage.getItem(k) || '[]').length, 'recolte.pending.2026-11-04');
  // Coupure du réseau d'un téléphone : plus aucune requête, et le flux temps réel est fermé.
  const couper = async (ctx) => { await ctx.setOffline(true); base.couperFlux(); await partage(B); };
  const LISTE = 'listes/2026-11-04';

  await couper(ctxA);
  await A.waitForTimeout(300);
  verifie((await pastille(A)) === 'Hors ligne', 'sans réseau, la pastille dit « Hors ligne » (obtenu « ' + (await pastille(A)) + ' »)');
  await cocher(A, 'mesclun');
  await cocher(A, 'carotte');
  verifie((await pastille(A)) === 'Hors ligne · 2 coches en attente', 'deux coches sans réseau : « Hors ligne · 2 coches en attente » (obtenu « ' + (await pastille(A)) + ' »)');
  verifie((await A.textContent('#doneCount')) === '4' && await estCoche(A, 'mesclun'), 'les coches faites sans réseau s\'affichent tout de suite sur le téléphone');
  await A.click('[data-view="prep"]');
  await A.click('li.pitem[data-k="ta/bette"]');
  await A.click('[data-view="recolte"]');
  verifie((await pastille(A)) === 'Hors ligne · 3 coches en attente', 'une coche de préparation s\'ajoute à l\'attente : 3 coches (obtenu « ' + (await pastille(A)) + ' »)');
  verifie((await enAttente(A)) === 3, 'les 3 coches en attente sont gardées dans le téléphone');
  await B.waitForTimeout(500);
  verifie((await B.textContent('#doneCount')) === '2' && base.lire(LISTE + '/done/mesclun') === null, 'tant que François est hors ligne, rien n\'est parti : Aurore ne voit pas ses coches');
  await ctxA.setOffline(false);
  await partage(A);
  await B.waitForTimeout(500);
  verifie((await B.textContent('#doneCount')) === '4' && await estCoche(B, 'carotte') && (await B.textContent('#done li[data-id="mesclun"] .by')).includes('François'), 'au retour du réseau, les coches partent seules : Aurore voit mesclun et carotte cochés par François');
  verifie(base.lire(LISTE + '/prep/ta/bette') !== null, 'la coche de préparation faite hors ligne est arrivée dans la base');
  verifie(typeof base.lire(LISTE + '/maj/done/mesclun') === 'number', 'la base garde l\'heure de chaque action (maj), pour trancher les conflits');
  verifie((await pastille(A)) === 'Partagé', 'la pastille repasse à « Partagé » (obtenu « ' + (await pastille(A)) + ' »)');

  // Conflits : « la dernière action gagne ». Aurore coche le chou vert, puis François passe hors ligne.
  await cocher(B, 'chou-vert');
  await A.waitForTimeout(500);
  await couper(ctxA);
  await cocher(A, 'persil');            // François coche le persil hors ligne…
  await A.waitForTimeout(50);
  await decocher(A, 'chou-vert');       // … et décoche le chou vert, après la coche d'Aurore
  verifie((await pastille(A)) === 'Hors ligne · 2 coches en attente', 'deux actions en attente chez François (obtenu « ' + (await pastille(A)) + ' »)');
  await B.waitForTimeout(50);
  await cocher(B, 'persil');            // Aurore, en ligne, coche puis décoche le persil, après François
  await B.waitForTimeout(400);
  await decocher(B, 'persil');
  await B.waitForTimeout(400);
  await ctxA.setOffline(false);
  await partage(A);
  await B.waitForTimeout(500);
  verifie(!(await estCoche(A, 'persil')) && !(await estCoche(B, 'persil')), 'persil : Aurore l\'a décoché après la coche hors ligne de François ; sa décoche (la dernière action) gagne sur les deux téléphones');
  verifie(!(await estCoche(A, 'chou-vert')) && !(await estCoche(B, 'chou-vert')), 'chou vert : François l\'a décoché hors ligne après la coche d\'Aurore ; sa décoche (la dernière action) gagne sur les deux téléphones');
  verifie((await pastille(A)) === 'Partagé' && (await enAttente(A)) === 0, 'plus rien en attente chez François');

  // La liste reste sur le téléphone : un téléphone qui a la page en cache mais pas la liste du jour
  // (par exemple juste après une première visite) s'ouvre quand même sans réseau, avec la copie gardée.
  const ctxD = await nav.newContext({ ...devices['Pixel 7'] });
  await ctxD.addInitScript(() => localStorage.setItem('recolte.qui', JSON.stringify('Martin')));
  const D = await ctxD.newPage();
  D.on('pageerror', (e) => erreurs.push('Martin : ' + e.message));
  await D.goto(`http://localhost:${PORT_SITE}/?liste=2026-11-04`);
  await D.waitForSelector('li.item');
  await D.evaluate(() => navigator.serviceWorker.ready);
  await D.evaluate(async () => {
    for (const k of await caches.keys()) {
      const c = await caches.open(k);
      for (const r of await c.keys()) if (r.url.includes('/listes/2026-')) await c.delete(r);
    }
  });
  await ctxD.setOffline(true);
  await D.reload();
  await D.waitForSelector('li.item', { timeout: 5000 }).catch(() => {});
  verifie((await D.textContent('#titre')) === 'Récolte du mercredi 4 novembre' && (await D.$$('#todo li.item')).length > 0, 'sans réseau, la liste du jour gardée sur le téléphone s\'ouvre (obtenu « ' + (await D.textContent('#titre')) + ' »)');
  verifie((await D.textContent('#doneCount')) === '4' && (await pastille(D)) === 'Hors ligne', 'avec les dernières coches connues et la pastille « Hors ligne » (obtenu ' + (await D.textContent('#doneCount')) + ' coches, « ' + (await pastille(D)) + ' »)');
  await cocher(D, 'radis');
  verifie((await pastille(D)) === 'Hors ligne · 1 coche en attente', 'une coche sur la liste gardée : « Hors ligne · 1 coche en attente » (obtenu « ' + (await pastille(D)) + ' »)');
  await ctxD.setOffline(false);
  await partage(D);
  await B.waitForTimeout(500);
  verifie(await estCoche(B, 'radis') && (await B.textContent('#done li[data-id="radis"] .by')).includes('Martin'), 'au retour du réseau, la coche de Martin arrive chez Aurore');

  // Plus de message de félicitations (demande de François du 6/11) : tout cocher ne fait apparaître aucun texte.
  for (const id of await D.$$eval('#todo li.item', (ls) => ls.map((l) => l.dataset.id))) await cocher(D, id);
  await D.waitForTimeout(3300); // fin de l'animation de la dernière coche (2,8 s)
  const corps = await D.textContent('body');
  verifie((await D.$$('#todo li')).length === 0 && (await D.textContent('#progPct')) === '100 %' && !/Bravo|Tout est récolté/.test(corps),
    'tout coché : la liste à faire reste vide, sans « Tout est récolté. Bravo. » (barre à ' + (await D.textContent('#progPct')) + ', obtenu « ' + (await D.textContent('#progSum')) + ' »)');
  const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  verifie(!/Bravo|Tout est préparé|Toutes les commandes sont prêtes|Tout est récolté/.test(source), 'aucun message de félicitations dans l\'appli (Préparation comprise)');
  await ctxD.close();

  verifie(erreurs.length === 0, 'aucune erreur JavaScript' + (erreurs.length ? ' : ' + erreurs.join(' | ') : ''));
  await nav.close(); site.close(); base.close();
  process.exit(echecs ? 1 : 0);
})();
