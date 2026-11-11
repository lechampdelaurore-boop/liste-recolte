// Test du céleri-branche en bouquet (demande de François du 11/11) : un nouveau produit à côté du céleri-branche
// au kilo, qui reste inchangé (le nom d'un produit fait son identifiant dans la base). Conditionnement : 10 bouquets
// par grande basse (GB) pour les débouchés en caisses plastiques, grand colis bois pour ceux en colis bois.
// Données factices (faux Firebase).
// Lancement depuis la racine du dépôt : node tests/celeri-bouquet.cjs
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');
const fauxFirebase = require('./faux-firebase.cjs');

const RACINE = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const PORT_SITE = 8870, PORT_BASE = 8871;
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
  // 0. Le référentiel : le nouveau produit, et le céleri-branche au kilo inchangé
  const REF = JSON.parse(fs.readFileSync(path.join(RACINE, 'referentiel/conditionnements.json'), 'utf8'));
  const bq = REF.produits.filter((p) => p.produit === 'Céleri-branche en bouquet');
  verifie(bq.length === 1 && bq[0].caisse === 'GB' && bq[0].par_colis === 10 && bq[0].type === 'bouquet' && bq[0].unite === 'Bouquet (x10)' && !bq[0].masque && !bq[0].kg,
    'référentiel : « Céleri-branche en bouquet », une seule fiche, GB de 10 bouquets (' + JSON.stringify(bq[0]) + ')');
  const cb = REF.produits.filter((p) => p.produit === 'Céleri-branche');
  verifie(cb.length === 1 && JSON.stringify(cb[0]) === JSON.stringify({ produit: 'Céleri-branche', caisse: 'GH', unite: '5 kg', kg: 5 }), 'référentiel : le céleri-branche au kilo est inchangé (GH de 5 kg)');
  verifie(REF.colisages.bois.GB === 'Grand colis bois', 'colisage bois : GB → grand colis bois');

  const site = await serveurSite();
  const base = await fauxFirebase(PORT_BASE);
  const W = iso(lundi(1)), MER = plus(W, 2);
  const A0 = 1793730000000, q = (n, u) => ({ n, u: u || 'colis', by: 'Aurore', at: A0 });
  const put = (p, v) => fetch(`${BASE}/${p}.json`, { method: 'PUT', body: JSON.stringify(v) });
  // Mercredi (jour habituel) : marché 2 colis et Très Allier jeudi 1 colis (caisses plastiques), Locavore 1 colis (colis bois).
  // Le céleri-branche au kilo à côté, au marché.
  await put('listes/semaines/' + W, {
    produits: { 'celeri-branche': { nom: 'Céleri-branche', caisse: 'GH', unite: '5 kg', kg: 5, by: 'Aurore', at: A0 } },
    q: { 'celeri-branche': { mk: q(1) } },
  });

  const nav = await chromium.launch();
  const erreurs = [];
  const ctx = await nav.newContext({ ...devices['Pixel 7'], serviceWorkers: 'block' });
  await ctx.addInitScript((w) => {
    localStorage.setItem('recolte.qui', JSON.stringify('Martin'));
    if (!localStorage.getItem('recolte.ui')) localStorage.setItem('recolte.ui', JSON.stringify({ semaine: w }));
  }, W);
  const T = await ctx.newPage();
  const capture = async (p, nom) => { if (CAPTURES) await p.screenshot({ path: path.join(CAPTURES, nom + '.png'), fullPage: true }); };
  T.on('pageerror', (e) => erreurs.push(e.message));
  T.on('dialog', (d) => d.accept());
  await T.goto(`http://localhost:${PORT_SITE}/`);

  // 1. « Ajouter un produit » (onglet Semaine) : le nouveau produit est proposé à côté des deux autres céleris
  await T.click('[data-view="semaine"]');
  await T.click('[data-sem="repartir"]');
  await T.waitForSelector('#semList section.sp[data-pid="celeri-branche"]');
  await T.click('[data-a="ajouter"]');
  await T.waitForSelector('#addDlg[open]');
  await T.fill('#addQ', 'celeri');
  await T.waitForTimeout(150);
  const prop = await T.$$eval('#addList button', (e) => e.map((x) => x.querySelector('span').textContent + ' | ' + x.querySelector('small').textContent));
  verifie(prop.join(' / ') === 'Céleri-branche en bouquet | GB de 10 bouquets / Céleri-rave | PH de 5 kg', 'recherche « celeri » : le céleri-branche déjà dans la semaine n\'est pas reproposé (obtenu ' + prop.join(' / ') + ')');
  await capture(T, '1-ajouter');
  await T.click('#addList button[data-nom="Céleri-branche en bouquet"]');
  await attendreQue(() => base.lire('listes/semaines/' + W + '/produits/celeri-branche-en-bouquet'));
  const fiche = base.lire('listes/semaines/' + W + '/produits/celeri-branche-en-bouquet') || {};
  verifie(fiche.nom === 'Céleri-branche en bouquet' && fiche.caisse === 'GB' && fiche.par_colis === 10 && fiche.type === 'bouquet' && fiche.unite === 'Bouquet (x10)', 'ajouté à la semaine avec son identifiant propre « celeri-branche-en-bouquet » : GB, 10 bouquets (' + JSON.stringify(fiche) + ')');
  verifie(JSON.stringify(base.lire('listes/semaines/' + W + '/produits/celeri-branche')) === JSON.stringify({ nom: 'Céleri-branche', caisse: 'GH', unite: '5 kg', kg: 5, by: 'Aurore', at: A0 }) && JSON.stringify(base.lire('listes/semaines/' + W + '/q/celeri-branche')) === JSON.stringify({ mk: q(1) }), 'le céleri-branche au kilo et sa quantité restent tels quels dans la semaine');
  await T.click('#addClose');
  await T.waitForSelector('#semList section.sp[data-pid="celeri-branche-en-bouquet"]');
  const colis = net(await T.textContent('#semList section.sp[data-pid="celeri-branche-en-bouquet"] .sp-colis'));
  verifie(colis === 'GB de 10 bouquets', 'fiche de la semaine : « ' + colis + ' »');
  const mini = await T.$eval('#semList section.sp[data-pid="celeri-branche-en-bouquet"] .sp-head', (e) => { const u = e.querySelector('svg use, .mini use'); return u ? (u.getAttribute('href') || u.getAttribute('xlink:href') || '') : (e.querySelector('.mini') ? e.querySelector('.mini').outerHTML.slice(0, 200) : ''); });
  verifie(mini === 'especes/plants.svg#celeri-branche', 'miniature : le dessin du céleri-branche (obtenu « ' + mini + ' »)');

  // Quantités du mercredi, saisies directement (comme le ferait la grille)
  await put('listes/semaines/' + W + '/q/celeri-branche-en-bouquet', { mk: q(2), 'ta-jeu': q(1), lv: q(1) });

  // 2. Récolte du mercredi
  await T.click('[data-view="recolte"]');
  await T.waitForSelector('#recJours button');
  await T.click(`#recJours [data-jour="${MER}"]`);
  await T.waitForSelector('li.item[data-id="celeri-branche-en-bouquet"]');
  const qte = net(await T.textContent('li.item[data-id="celeri-branche-en-bouquet"] .qty'));
  const qte2 = net(await T.textContent('li.item[data-id="celeri-branche"] .qty'));
  verifie(qte === '4 colis40 bouquets', 'Récolte : céleri-branche en bouquet « 4 colis », « 40 bouquets » (obtenu « ' + qte + ' »)');
  verifie(qte2 === '1 colis5 kg', 'Récolte : céleri-branche au kilo à part, « 1 colis », « 5 kg » (obtenu « ' + qte2 + ' »)');
  await T.click('#crates summary');
  await T.waitForTimeout(200);
  const tuiles = await T.$$eval('.crate', (e) => e.map((x) => x.dataset.c + '=' + x.querySelector('b').textContent));
  verifie(tuiles.join(', ') === 'PB=0, PH=0, GB=3, GH=1, Petit colis bois=0, Moyen colis bois=0, Grand colis bois=1', 'caisses : 3 GB (marché 2, Très Allier 1), 1 grand colis bois (Locavore), 1 GH (céleri au kilo) (obtenu ' + tuiles.join(', ') + ')');
  const sum = net(await T.textContent('#crateSum'));
  verifie(sum === '· 5 à remplir', 'total des caisses : 5 (obtenu « ' + sum + ' »)');
  await capture(T, '2-recolte');

  // 3. Préparation par produit
  await T.click('[data-view="prep"]');
  await T.click('#prepSort [data-sort="produit"]');
  await T.waitForSelector('#prepList li.pitem');
  const prep = await T.$$eval('#prepList li.pitem', (e) => e.filter((x) => x.dataset.k.indexOf('celeri-branche-en-bouquet') >= 0)
    .map((x) => x.querySelector('.prod').textContent + ' : ' + x.querySelector('.qty').textContent.replace(/\s+/g, ' ').trim()));
  verifie(prep.join(' | ') === 'Locavore : 1 grand colis boisde 10 bouquets | Marché de Tronget : 2 colis20 bouquets | Très Allier : 1 colis10 bouquets', 'Préparation : Locavore en grand colis bois de 10 bouquets, marché et Très Allier en caisses de 10 bouquets (obtenu ' + prep.join(' | ') + ')');
  await capture(T, '3-preparation');

  verifie(erreurs.length === 0, 'aucune erreur JavaScript' + (erreurs.length ? ' : ' + erreurs.join(' | ') : ''));
  await nav.close(); site.close(); base.close();
  console.log(echecs ? `\n${echecs} échec(s)` : '\nTout est bon.');
  process.exit(echecs ? 1 : 0);
})().catch((x) => { console.error(x); process.exit(1); });
