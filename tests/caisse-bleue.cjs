// Test de la caisse bleue (demande de François du 9/11) : la carotte lavée est toujours récoltée en caisse bleue
// de 16 kg (comptée dans le cadre « Caisses » d'après son poids total), puis conditionnée au choix en petite haute
// de 8 kg (PH) ou en caisse bleue de 16 kg (CB), case par case dans l'onglet Semaine. Une semaine saisie avant ce
// changement (fiche de la carotte sans ces réglages) en profite sans que rien ne soit écrit dans la base.
// Données factices (faux Firebase).
// Lancement depuis la racine du dépôt : node tests/caisse-bleue.cjs
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');
const fauxFirebase = require('./faux-firebase.cjs');

const RACINE = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const PORT_SITE = 8822, PORT_BASE = 8823;
const BASE = `http://localhost:${PORT_BASE}`;
const CAPTURES = process.env.CAPTURES || '';

function serveurSite() {
  return new Promise((ok) => {
    const s = http.createServer((q, r) => {
      let f = decodeURIComponent(new URL(q.url, 'http://x').pathname);
      if (f.endsWith('/')) f += 'index.html';
      // Sans clé web : pas de compte (le fichier du dépôt, une fois rempli par François, n'est pas lu par les tests).
      if (f === '/cle-web.js') { r.writeHead(200, { 'Content-Type': 'text/javascript' }); return r.end("window.RECOLTE_CLE_WEB='';"); }
      if (f === '/config.js') { r.writeHead(200, { 'Content-Type': 'text/javascript' }); return r.end(`window.RECOLTE_DB_URL='${BASE}';`); }
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
const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const lundi = (decal) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7 + 7 * decal); return d; };
const plus = (id, n) => { const p = id.split('-'); const d = new Date(+p[0], p[1] - 1, +p[2]); d.setDate(d.getDate() + n); return iso(d); };
const attendreQue = async (fn, ms = 8000) => { const fin = Date.now() + ms; while (Date.now() < fin) { if (await fn()) return true; await new Promise((x) => setTimeout(x, 150)); } return false; };
const net = (t) => String(t || '').replace(/\s+/g, ' ').trim();

(async () => {
  // 0. Le référentiel : la caisse bleue, et la carotte lavée (PH de 8 kg gardé comme colis principal)
  const REF = JSON.parse(fs.readFileSync(path.join(RACINE, 'referentiel/conditionnements.json'), 'utf8'));
  const car = REF.produits.find((p) => p.produit === 'Carotte lavée');
  verifie(REF.caisses.CB === 'caisse bleue' && ['PB', 'PH', 'GB', 'GH'].every((k) => REF.caisses[k]), 'référentiel : caisse « CB » (caisse bleue) ajoutée à PB, PH, GB, GH');
  verifie(car.caisse === 'PH' && car.kg === 8 && car.unite === '8 kg', 'carotte lavée : colis principal inchangé, PH de 8 kg');
  verifie(JSON.stringify(car.autres_colis) === JSON.stringify([{ caisse: 'CB', kg: 16 }]) && JSON.stringify(car.recolte_en) === JSON.stringify({ caisse: 'CB', kg: 16 }), 'carotte lavée : autre conditionnement CB de 16 kg, récoltée en CB de 16 kg');
  verifie(REF.produits.filter((p) => p.recolte_en || p.autres_colis).length === 1, 'aucun autre produit ne change');

  const site = await serveurSite();
  const base = await fauxFirebase(PORT_BASE);
  const W = iso(lundi(1)), MER = plus(W, 2), SUIV = iso(lundi(2));
  const A0 = 1793730000000, q = (n, u) => ({ n, u: u || 'colis', by: 'Aurore', at: A0 });
  const put = (p, v) => fetch(`${BASE}/${p}.json`, { method: 'PUT', body: JSON.stringify(v) });
  // Une semaine saisie comme avant le 9/11 : fiche de la carotte sans autre conditionnement ni caisse de récolte.
  // Mercredi (jour habituel) : Très Allier jeudi 1 CB, marché 3 PH, Locavore (colis bois) 2 PH = 56 kg.
  await put('listes/semaines/' + W, {
    produits: {
      'carotte-lavee': { nom: 'Carotte lavée', caisse: 'PH', unite: '8 kg', kg: 8, by: 'Aurore', at: A0 },
      bette: { nom: 'Bette', caisse: 'GH', unite: '5 kg', kg: 5, by: 'Aurore', at: A0 },
    },
    dispo: { 'carotte-lavee': q(10) },
    q: { 'carotte-lavee': { 'ta-jeu': q(1, 'CB'), mk: q(3), lv: q(2) }, bette: { mk: q(1) } },
  });
  const avant = JSON.stringify(base.lire('listes/semaines/' + W));

  const nav = await chromium.launch();
  const erreurs = [];
  const appareil = async (opts) => {
    const ctx = await nav.newContext({ ...opts, serviceWorkers: 'block' });
    await ctx.addInitScript((w) => {
      localStorage.setItem('recolte.qui', JSON.stringify('Martin'));
      if (!localStorage.getItem('recolte.ui')) localStorage.setItem('recolte.ui', JSON.stringify({ semaine: w }));
    }, W);
    const p = await ctx.newPage();
    p.on('pageerror', (e) => erreurs.push(e.message));
    p.on('dialog', (d) => d.accept());
    await p.goto(`http://localhost:${PORT_SITE}/`);
    return p;
  };
  const capture = async (p, nom) => { if (CAPTURES) await p.screenshot({ path: path.join(CAPTURES, nom + '.png'), fullPage: true }); };
  const T = await appareil(devices['Pixel 7']);

  // 1. Récolte du mercredi : la carotte en « 5 PH + 1 CB », 56 kg
  await T.waitForSelector('#recJours button');
  await T.click(`#recJours [data-jour="${MER}"]`);
  await T.waitForSelector('li.item[data-id="carotte-lavee"]');
  const qte = await T.$eval('li.item[data-id="carotte-lavee"] .qty', (e) => ({ total: e.childNodes[0].textContent, kg: e.querySelector('small') ? e.querySelector('small').textContent : '' }));
  verifie(qte.total === '5 PH + 1 CB' && qte.kg === '56 kg', 'Récolte : carotte lavée « 5 PH + 1 CB », « 56 kg » (obtenu « ' + qte.total + ' », « ' + qte.kg + ' »)');

  // 2. Cadre « Caisses » : la carotte comptée en caisses bleues, d'après son poids (56 kg / 16 = 4), tous circuits ensemble
  await T.click('#crates summary');
  await T.waitForTimeout(200);
  const tuiles = await T.$$eval('.crate', (e) => e.map((x) => x.dataset.c + '=' + x.querySelector('b').textContent));
  verifie(tuiles.includes('CB=4'), 'caisses : 4 caisses bleues pour 56 kg de carotte (obtenu ' + tuiles.join(', ') + ')');
  verifie(tuiles.includes('PH=0') && tuiles.includes('GH=1') && tuiles.includes('Moyen colis bois=0'), 'la carotte n\'est plus comptée en PH ni en moyen colis bois ; la bette reste en GH');
  verifie((await T.textContent('.crate[data-c="CB"] .nm')) === 'Caisse bleue (CB)', 'la tuile s\'appelle « Caisse bleue (CB) »');
  const sum = net(await T.textContent('#crateSum'));
  verifie(sum === '· 5 à remplir', 'total des caisses : 4 CB + 1 GH = 5 (obtenu « ' + sum + ' »)');
  await T.uncheck('#perCirc');
  const regroupe = await T.$eval('.crate[data-c="CB"] b', (x) => x.textContent);
  verifie(regroupe === '4', 'case « Une caisse par circuit » décochée : toujours 4 caisses bleues');
  await T.check('#perCirc');
  await capture(T, '1-caisses');

  // 3. Préparation, par produit : chaque client avec son conditionnement
  await T.click('[data-view="prep"]');
  await T.click('#prepSort [data-sort="produit"]');
  await T.waitForSelector('#prepList li.pitem');
  const prep = await T.$$eval('#prepList li.pitem', (e) => e.filter((x) => x.dataset.k.indexOf('carotte-lavee') >= 0)
    .map((x) => x.querySelector('.prod').textContent + ' : ' + x.querySelector('.qty').textContent.replace(/\s+/g, ' ').trim()));
  const ligne = (n) => prep.find((x) => x.startsWith(n + ' : ')) || '';
  verifie(ligne('Très Allier') === 'Très Allier : 1 CB16 kg', 'Préparation : Très Allier « 1 CB », 16 kg (obtenu « ' + ligne('Très Allier') + ' »)');
  verifie(ligne('Marché de Tronget') === 'Marché de Tronget : 3 PH24 kg', 'Préparation : marché « 3 PH », 24 kg (obtenu « ' + ligne('Marché de Tronget') + ' »)');
  verifie(ligne('Locavore') === 'Locavore : 2 moyens colis boisde 8 kg · 16 kg', 'Préparation : Locavore en colis bois comme avant, 16 kg (obtenu « ' + ligne('Locavore') + ' »)');
  await capture(T, '2-preparation');

  // 4. Semaine (téléphone) : fiche, bouton d'unité et « À récolter »
  await T.click('[data-view="semaine"]');
  await T.click('[data-sem="repartir"]');
  await T.waitForSelector('#semList section.sp[data-pid="carotte-lavee"]');
  const colis = net(await T.textContent('#semList section.sp[data-pid="carotte-lavee"] .sp-colis'));
  verifie(colis === 'PH de 8 kg ou CB de 16 kg', 'fiche de la carotte : « ' + colis + ' »');
  await T.click('#semList section.sp[data-pid="carotte-lavee"] .sp-head');
  const ta = '#semList section.sp[data-pid="carotte-lavee"] .sr[data-k="q/ta-jeu"]';
  verifie(net(await T.textContent(ta + ' [data-a="unite"]')) === 'CB' && net(await T.textContent(ta + ' .sr-eq')).startsWith('= 16 kg'), 'case Très Allier jeudi : 1 CB, « = 16 kg »');
  const el = '#semList section.sp[data-pid="carotte-lavee"] .sr[data-k="q/el"]';
  const unites = [];
  for (let i = 0; i < 3; i++) { unites.push(net(await T.textContent(el + ' [data-a="unite"]'))); await T.click(el + ' [data-a="unite"]'); }
  verifie(unites.join(',') === 'PH,CB,kg', 'bouton d\'unité d\'une case vide : PH, puis CB, puis kg (obtenu ' + unites.join(',') + ')');
  const reste = net(await T.textContent('#semList section.sp[data-pid="carotte-lavee"] .sp-head'));
  verifie(reste.includes('À placer : 3 PH (24 kg)'), 'reste : 10 PH disponibles − (2 + 3 + 2) = 3 PH (24 kg) (obtenu « ' + reste + ' »)');
  await T.waitForTimeout(500);
  verifie(JSON.stringify(base.lire('listes/semaines/' + W)) === avant, 'ouvrir la semaine, la récolte et la préparation n\'écrit rien dans la base');
  await T.click('[data-sem="recolter"]');
  // Jours repliés (9/11) : déplier chacun par sa flèche.
  await T.waitForSelector('#semRecList .rc-tete');
  for (let i = 0; i < 9 && (await T.$('#semRecList .rc-tete[aria-expanded="false"]')); i++) await T.click('#semRecList .rc-tete[aria-expanded="false"]');
  await T.waitForSelector('#semRecList li[data-pid="carotte-lavee"]');
  const arec = net(await T.textContent('#semRecList li[data-pid="carotte-lavee"] b'));
  verifie(arec === '7 PH (56 kg) · récolte : 4 CB', 'À récolter, mercredi : « ' + arec + ' »');

  // 5. Grille de l'ordinateur : menu d'unité et saisie
  const P = await appareil({ viewport: { width: 1280, height: 900 } });
  await P.click('[data-view="semaine"]');
  await P.click('[data-sem="repartir"]');
  await P.waitForSelector('#semGrid tr[data-pid="carotte-lavee"]');
  const menu = (pid, k) => P.$$eval(`#semGrid select[data-cell="${pid}|${k}"] option`, (e) => e.map((x) => x.textContent));
  verifie((await menu('carotte-lavee', 'q/el')).join(',') === 'PH,CB,kg' && (await menu('bette', 'q/el')).join(',') === 'GH,kg', 'menu d\'unité : PH, CB, kg pour la carotte ; GH, kg pour la bette (inchangé)');
  verifie((await P.inputValue('#semGrid select[data-cell="carotte-lavee|q/ta-jeu"]')) === 'CB', 'la case Très Allier jeudi affiche CB');
  const cellule = '#semGrid input[data-cell="carotte-lavee|q/el"]';
  await P.fill(cellule, '2 caisses bleues');
  await P.press(cellule, 'Tab');
  await attendreQue(() => base.lire('listes/semaines/' + W + '/q/carotte-lavee/el'));
  const qel = base.lire('listes/semaines/' + W + '/q/carotte-lavee/el') || {};
  verifie(qel.n === 2 && qel.u === 'CB' && qel.by === 'Martin', '« 2 caisses bleues » tapé pour Élie : 2 CB (' + JSON.stringify(qel) + ')');
  await P.waitForTimeout(300);
  const resteG = net(await P.textContent('#semGrid tr[data-pid="carotte-lavee"] .g-reste'));
  verifie(resteG === 'Manque : 1 PH (8 kg)', 'reste : 3 PH − 2 CB (4 PH) = manque 1 PH (8 kg) (obtenu « ' + resteG + ' »)');
  await P.fill(cellule, '1 GH');
  await P.press(cellule, 'Tab');
  await P.waitForTimeout(300);
  const err = net(await P.getAttribute(cellule, 'class')).includes('err');
  const qel2 = base.lire('listes/semaines/' + W + '/q/carotte-lavee/el') || {};
  verifie(err && qel2.n === 2 && qel2.u === 'CB', '« 1 GH » refusé pour la carotte, la case garde 2 CB');
  await P.selectOption('#semGrid select[data-cell="carotte-lavee|q/el"]', 'colis');
  await attendreQue(() => (base.lire('listes/semaines/' + W + '/q/carotte-lavee/el') || {}).u === 'colis');
  const qel3 = base.lire('listes/semaines/' + W + '/q/carotte-lavee/el') || {};
  verifie(qel3.n === 4 && qel3.u === 'colis', 'menu d\'unité passé à PH : 2 CB deviennent 4 PH (' + JSON.stringify(qel3) + ')');
  await P.selectOption('#semGrid select[data-cell="carotte-lavee|q/el"]', 'kg');
  await attendreQue(() => (base.lire('listes/semaines/' + W + '/q/carotte-lavee/el') || {}).u === 'kg');
  verifie((base.lire('listes/semaines/' + W + '/q/carotte-lavee/el') || {}).n === 32, 'puis kg : 32 kg');
  const fiche = base.lire('listes/semaines/' + W + '/produits/carotte-lavee');
  verifie(fiche.autres_colis === undefined && fiche.recolte_en === undefined && fiche.at === A0, 'la fiche déjà saisie de la carotte n\'est pas réécrite');
  await capture(P, '3-grille');

  // 6. « Ajouter un produit » dans une autre semaine : la fiche copiée porte les deux réglages
  await P.click('[data-a="semSuiv"]');
  await P.click('[data-a="ajouter"]');
  await P.waitForSelector('#addDlg[open]');
  await P.fill('#addQ', 'carotte lav');
  await P.waitForTimeout(150);
  const prop = await P.$$eval('#addList button', (e) => e.map((x) => x.querySelector('small').textContent));
  verifie(prop.join() === 'PH de 8 kg ou CB de 16 kg', 'Ajouter un produit : « Carotte lavée · PH de 8 kg ou CB de 16 kg » (obtenu ' + prop.join(' / ') + ')');
  await P.click('#addList button');
  await attendreQue(() => base.lire('listes/semaines/' + SUIV + '/produits/carotte-lavee'));
  const nf = base.lire('listes/semaines/' + SUIV + '/produits/carotte-lavee') || {};
  verifie(nf.caisse === 'PH' && nf.kg === 8 && JSON.stringify(nf.autres_colis) === JSON.stringify([{ caisse: 'CB', kg: 16 }]) && JSON.stringify(nf.recolte_en) === JSON.stringify({ caisse: 'CB', kg: 16 }), 'fiche copiée dans la semaine : PH de 8 kg, autre conditionnement CB, récolte en CB');
  await P.click('#addClose');

  verifie(erreurs.length === 0, 'aucune erreur JavaScript' + (erreurs.length ? ' : ' + erreurs.join(' | ') : ''));
  await nav.close(); site.close(); base.close();
  console.log(echecs ? `\n${echecs} échec(s)` : '\nTout est bon.');
  process.exit(echecs ? 1 : 0);
})().catch((x) => { console.error(x); process.exit(1); });
