// Test du céleri-branche au kilo en grande basse (demande de François du 25/11 : « Ce sont des grandes basses,
// pas des grandes hautes ») : dans le référentiel, sa caisse passe de GH à GB (5 kg), sans changer son nom, qui fait
// son identifiant dans la base. Une semaine déjà saisie garde la caisse qu'elle a enregistrée (rien n'est écrit
// dans la base) ; une semaine nouvelle (produit ajouté ou « Reprendre ») prend la grande basse, et les caisses à
// remplir la comptent en GB.
// Données factices (faux Firebase).
// Lancement depuis la racine du dépôt : node tests/celeri-branche-gb.cjs
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');
const { PIXEL, sautePixel } = require('./apparence-env.cjs'); // APPARENCE=pixel : le même test dans l'apparence pixel art (étape 48)
const fauxFirebase = require('./faux-firebase.cjs');

const RACINE = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const PORT_SITE = 8998, PORT_BASE = 8999;
const BASE = `http://localhost:${PORT_BASE}`;

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
  // 0. Le référentiel : même produit, même identifiant, grande basse de 5 kg
  const REF = JSON.parse(fs.readFileSync(path.join(RACINE, 'referentiel/conditionnements.json'), 'utf8'));
  const cb = REF.produits.filter((p) => p.produit === 'Céleri-branche');
  verifie(cb.length === 1 && JSON.stringify(cb[0]) === JSON.stringify({ produit: 'Céleri-branche', caisse: 'GB', unite: '5 kg', kg: 5 }),
    'référentiel : « Céleri-branche » (au kilo), une seule fiche, GB de 5 kg (' + JSON.stringify(cb[0]) + ')');
  verifie(REF.caisses.GB === 'grande basse', 'référentiel : GB = « ' + REF.caisses.GB + ' »');
  const bq = REF.produits.filter((p) => p.produit === 'Céleri-branche en bouquet');
  verifie(bq.length === 1 && bq[0].caisse === 'GB' && bq[0].par_colis === 10, 'le céleri-branche en bouquet ne change pas (GB de 10 bouquets)');
  verifie(REF.produits.filter((p) => /c[ée]leri-branche/i.test(p.produit)).length === 2, 'toujours deux céleris-branches au référentiel, aucun renommé ni ajouté');

  const site = await serveurSite();
  const base = await fauxFirebase(PORT_BASE);
  const SEM = iso(lundi(0)), SUIV = iso(lundi(1)), MER = plus(SUIV, 2);
  const A0 = 1793730000000, q = (n, u) => ({ n, u: u || 'colis', by: 'Aurore', at: A0 });
  const put = (p, v) => fetch(`${BASE}/${p}.json`, { method: 'PUT', body: JSON.stringify(v) });
  // Une semaine déjà saisie avant le changement : le céleri-branche y est enregistré en grande haute.
  const VIEUX = { nom: 'Céleri-branche', caisse: 'GH', unite: '5 kg', kg: 5, by: 'Aurore', at: A0 };
  await put('listes/semaines/' + SEM, { produits: { 'celeri-branche': VIEUX }, q: { 'celeri-branche': { mk: q(1) } } });
  const avant = JSON.stringify(base.lire('listes/semaines/' + SEM));

  const nav = await chromium.launch();
  const erreurs = [];
  const ctx = await nav.newContext({ ...devices['Pixel 7'], serviceWorkers: 'block' });
  await ctx.addInitScript(() => localStorage.setItem('recolte.qui', JSON.stringify('Martin')));
  const T = await ctx.newPage();
  T.on('pageerror', (e) => erreurs.push(e.message));
  T.on('dialog', (d) => d.accept());
  await T.goto(`http://localhost:${PORT_SITE}/`);
  await T.click('[data-view="semaine"]');
  await T.click('[data-sem="repartir"]');
  await T.waitForSelector('#semList section.sp[data-pid="celeri-branche"]');

  // 1. La semaine déjà saisie garde sa grande haute, sans rien écrire dans la base
  const vieux = net(await T.textContent('#semList section.sp[data-pid="celeri-branche"] .sp-colis'));
  verifie(vieux === 'GH de 5 kg', 'semaine déjà saisie : le céleri-branche reste « GH de 5 kg » (obtenu « ' + vieux + ' »)');
  await T.waitForTimeout(800);
  verifie(JSON.stringify(base.lire('listes/semaines/' + SEM)) === avant, 'ouvrir la semaine déjà saisie n\'écrit rien dans la base');

  // 2. Semaine suivante, vide : « Ajouter un produit » propose le céleri-branche en grande basse
  await T.click('[data-a="semSuiv"]');
  await T.waitForSelector('#semVide [data-a="reprendre"]');
  await T.click('[data-a="ajouter"]');
  await T.waitForSelector('#addDlg[open]');
  await T.fill('#addQ', 'celeri');
  await T.waitForTimeout(150);
  const prop = await T.$$eval('#addList button', (e) => e.map((x) => x.querySelector('span').textContent + ' | ' + x.querySelector('small').textContent));
  verifie(prop.join(' / ') === 'Céleri-branche | GB de 5 kg / Céleri-branche en bouquet | GB de 10 bouquets / Céleri-rave | PH de 5 kg',
    'recherche « celeri » : céleri-branche en GB de 5 kg (obtenu ' + prop.join(' / ') + ')');
  await T.click('#addClose');
  verifie(base.lire('listes/semaines/' + SUIV) === null, 'chercher sans choisir n\'écrit rien');

  // 3. « Reprendre les produits de la semaine précédente » : le céleri-branche repris en grande basse, même identifiant
  await T.click('#semVide [data-a="reprendre"]');
  await attendreQue(() => base.lire('listes/semaines/' + SUIV + '/produits/celeri-branche'));
  const repris = base.lire('listes/semaines/' + SUIV + '/produits/celeri-branche') || {};
  verifie(repris.nom === 'Céleri-branche' && repris.caisse === 'GB' && repris.unite === '5 kg' && repris.kg === 5,
    'repris dans la semaine suivante sous « celeri-branche » : GB de 5 kg (' + JSON.stringify(repris) + ')');
  verifie(JSON.stringify(base.lire('listes/semaines/' + SEM)) === avant, 'la semaine précédente garde sa grande haute et sa quantité (rien d\'effacé ni de changé)');
  await T.waitForSelector('#semList section.sp[data-pid="celeri-branche"]');
  const neuf = net(await T.textContent('#semList section.sp[data-pid="celeri-branche"] .sp-colis'));
  verifie(neuf === 'GB de 5 kg', 'fiche de la semaine suivante : « ' + neuf + ' »');

  // 4. Récolte du mercredi : 2 colis au marché, comptés en grandes basses dans les caisses à remplir
  await put('listes/semaines/' + SUIV + '/q/celeri-branche', { mk: q(2) });
  await T.click('[data-view="recolte"]');
  await T.waitForSelector('#recJours button');
  await T.click(`#recJours [data-jour="${MER}"]`);
  await T.waitForSelector('li.item[data-id="celeri-branche"]');
  const qte = net(await T.textContent('li.item[data-id="celeri-branche"] .qty'));
  verifie(qte === '2 colis10 kg', 'Récolte : céleri-branche « 2 colis », « 10 kg » (obtenu « ' + qte + ' »)');
  await T.click('#crates summary');
  await T.waitForTimeout(200);
  const tuiles = await T.$$eval('.crate', (e) => e.map((x) => x.dataset.c + '=' + x.querySelector('b').textContent));
  verifie(tuiles.join(', ') === 'PB=0, PH=0, GB=2, GH=0', 'caisses à remplir : 2 GB, aucune GH (obtenu ' + tuiles.join(', ') + ')');

  verifie(erreurs.length === 0, 'aucune erreur JavaScript' + (erreurs.length ? ' : ' + erreurs.join(' | ') : ''));
  await nav.close(); site.close(); base.close();
  console.log(echecs ? `\n${echecs} échec(s)` : '\nTout est bon.');
  process.exit(echecs ? 1 : 0);
})().catch((x) => { console.error(x); process.exit(1); });
