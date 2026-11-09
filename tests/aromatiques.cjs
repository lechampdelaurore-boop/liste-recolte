// Test des aromatiques ajoutés le 9/11 (demande de François) : persil frisé, persil plat et thym, conditionnés
// comme les aromatiques (petite basse, 6 bottes par colis). L'ancien « Persil frisé (bouquet) » n'est plus proposé,
// mais une semaine qui le contient déjà le garde tel quel, et « Reprendre les produits de la semaine précédente »
// le remplace par « Persil frisé ». Données factices (faux Firebase).
// Lancement depuis la racine du dépôt : node tests/aromatiques.cjs
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');
const fauxFirebase = require('./faux-firebase.cjs');

const RACINE = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const PORT_SITE = 8820, PORT_BASE = 8821;
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
const attendreQue = async (fn, ms = 8000) => { const fin = Date.now() + ms; while (Date.now() < fin) { if (await fn()) return true; await new Promise((x) => setTimeout(x, 150)); } return false; };

(async () => {
  // 0. Le référentiel lui-même
  const REF = JSON.parse(fs.readFileSync(path.join(RACINE, 'referentiel/conditionnements.json'), 'utf8'));
  const arom = REF.produits.find((p) => p.produit === 'Aromatiques');
  const garde = (k) => ({ caisse: k.caisse, unite: k.unite, par_colis: k.par_colis, type: k.type });
  ['Persil frisé', 'Persil plat', 'Thym'].forEach((n) => {
    const p = REF.produits.filter((x) => x.produit === n);
    verifie(p.length === 1 && JSON.stringify(garde(p[0])) === JSON.stringify(garde(arom)) && !p[0].masque, n + ' : une seule fiche, conditionnée comme les aromatiques (' + JSON.stringify(p[0] ? garde(p[0]) : null) + ')');
  });
  const ancien = REF.produits.find((p) => p.produit === 'Persil frisé (bouquet)');
  verifie(ancien && ancien.masque === true && ancien.remplace_par === 'Persil frisé' && ancien.caisse === 'PB' && ancien.par_colis === 6 && ancien.type === 'bouquet', 'l\'ancien « Persil frisé (bouquet) » est gardé tel quel, marqué « masque », remplacé par « Persil frisé »');

  const site = await serveurSite();
  const base = await fauxFirebase(PORT_BASE);
  const SEM = iso(lundi(0)), SUIV = iso(lundi(1));
  const A0 = 1793730000000, q = (n, u) => ({ n, u: u || 'colis', by: 'Aurore', at: A0 });
  const VIEUX = { nom: 'Persil frisé (bouquet)', caisse: 'PB', unite: 'Bouquet (x6)', par_colis: 6, type: 'bouquet', by: 'Aurore', at: A0 };
  const put = (p, v) => fetch(`${BASE}/${p}.json`, { method: 'PUT', body: JSON.stringify(v) });
  // Une semaine déjà saisie avec l'ancien persil (comme une vraie semaine d'avant le 9/11).
  await put('listes/semaines/' + SEM, {
    produits: { 'persil-frise-bouquet': VIEUX, bette: { nom: 'Bette', caisse: 'GH', unite: '5 kg', kg: 5, by: 'Aurore', at: A0 } },
    dispo: { 'persil-frise-bouquet': q(3) },
    q: { 'persil-frise-bouquet': { lv: q(12, 'u') } },
  });
  const avant = JSON.stringify(base.lire('listes/semaines/' + SEM));

  const nav = await chromium.launch();
  const erreurs = [];
  const ctx = await nav.newContext({ ...devices['Pixel 7'], serviceWorkers: 'block' });
  await ctx.addInitScript(() => localStorage.setItem('recolte.qui', JSON.stringify('Martin')));
  const T = await ctx.newPage();
  T.on('pageerror', (e) => erreurs.push(e.message));
  await T.goto(`http://localhost:${PORT_SITE}/`);
  await T.click('[data-view="semaine"]');
  await T.waitForSelector('#semList section.sp[data-pid="persil-frise-bouquet"]');

  // 1. La semaine déjà saisie garde l'ancien persil, sans rien changer dans la base
  const vieux = await T.textContent('#semList section.sp[data-pid="persil-frise-bouquet"] .sp-head');
  verifie(vieux.includes('Persil frisé (bouquet)') && vieux.includes('bouquet'), 'semaine déjà saisie : l\'ancien persil reste affiché avec son nom et ses bouquets (« ' + vieux.replace(/\s+/g, ' ').trim() + ' »)');
  await T.waitForTimeout(800);
  verifie(JSON.stringify(base.lire('listes/semaines/' + SEM)) === avant, 'ouvrir la semaine n\'écrit rien dans la base (ancien persil et ses quantités intacts)');

  // 2. « Ajouter un produit » : les trois nouveaux, pas l'ancien
  await T.click('[data-a="ajouter"]');
  await T.waitForSelector('#addDlg[open]');
  const chercher = async (t) => { await T.fill('#addQ', t); await T.waitForTimeout(150); return T.$$eval('#addList button', (e) => e.map((x) => x.querySelector('span').textContent + ' | ' + x.querySelector('small').textContent)); };
  const persil = await chercher('persil');
  verifie(persil.length === 2 && persil[0].startsWith('Persil frisé | ') && persil[1].startsWith('Persil plat | '), 'recherche « persil » : Persil frisé et Persil plat, sans l\'ancien en bouquets (obtenu ' + persil.join(' / ') + ')');
  const thym = await chercher('thym');
  verifie(thym.length === 1 && thym[0].startsWith('Thym | '), 'recherche « thym » : Thym (obtenu ' + thym.join(' / ') + ')');
  const aro = await chercher('aromatiques');
  verifie(aro.length === 1 && persil.concat(thym).every((x) => x.split(' | ')[1] === aro[0].split(' | ')[1]), 'même colis que « Aromatiques » : « ' + aro[0].split(' | ')[1] + ' »');
  await chercher('persil plat');
  await T.click('#addList button');
  await attendreQue(() => base.lire('listes/semaines/' + SEM + '/produits/persil-plat'));
  const plat = base.lire('listes/semaines/' + SEM + '/produits/persil-plat') || {};
  verifie(plat.nom === 'Persil plat' && plat.caisse === 'PB' && plat.par_colis === 6 && plat.type === 'botte' && plat.unite === 'Botte (x6)', 'Persil plat ajouté à la semaine : PB, 6 bottes par colis (' + JSON.stringify(plat) + ')');
  await T.click('#addClose');
  verifie(base.lire('listes/semaines/' + SEM + '/produits/persil-frise-bouquet') !== null && JSON.stringify(base.lire('listes/semaines/' + SEM + '/q')) === JSON.stringify({ 'persil-frise-bouquet': { lv: q(12, 'u') } }), 'l\'ancien persil et sa quantité restent dans la semaine à côté du nouveau');

  // 3. Saisie en bottes dans la case du persil plat
  await T.waitForSelector('#semList section.sp[data-pid="persil-plat"]');
  const tete = (await T.textContent('#semList section.sp[data-pid="persil-plat"] .sp-colis')).trim();
  verifie(/PB/.test(tete) && /6 bottes/.test(tete), 'fiche du persil plat : « ' + tete + ' »');

  // 4. Semaine suivante : « Reprendre » remplace l'ancien persil par « Persil frisé »
  await T.click('[data-a="semSuiv"]');
  await T.waitForSelector('#semVide [data-a="reprendre"]');
  // Semaine vide : l'ancien persil n'est pas déjà dans la semaine, il pourrait donc être proposé ; il ne l'est pas.
  await T.click('[data-a="ajouter"]');
  await T.waitForSelector('#addDlg[open]');
  const tous = await chercher('');
  verifie(tous.length === REF.produits.length - 1 && !tous.some((x) => x.startsWith('Persil frisé (bouquet) | ')), 'semaine vide, liste complète : ' + tous.length + ' produits proposés sur ' + REF.produits.length + ', sans l\'ancien « Persil frisé (bouquet) »');
  const persil2 = await chercher('persil');
  verifie(persil2.join(' / ') === 'Persil frisé | PB de 6 bottes / Persil plat | PB de 6 bottes', 'semaine vide, recherche « persil » : ' + persil2.join(' / '));
  await T.click('#addClose');
  verifie(base.lire('listes/semaines/' + SUIV) === null, 'chercher sans choisir n\'écrit rien');
  await T.click('#semVide [data-a="reprendre"]');
  await attendreQue(() => base.lire('listes/semaines/' + SUIV + '/produits'));
  await T.waitForTimeout(500);
  const repris = Object.keys(base.lire('listes/semaines/' + SUIV + '/produits') || {}).sort();
  verifie(repris.join() === 'bette,persil-frise,persil-plat', 'reprendre la semaine précédente : bette, persil frisé (à la place de l\'ancien en bouquets), persil plat (obtenu ' + repris.join() + ')');
  const pf = base.lire('listes/semaines/' + SUIV + '/produits/persil-frise') || {};
  verifie(pf.nom === 'Persil frisé' && pf.type === 'botte' && pf.par_colis === 6 && pf.caisse === 'PB', 'le persil frisé repris a la fiche des aromatiques (' + JSON.stringify(pf) + ')');
  verifie(base.lire('listes/semaines/' + SUIV + '/q') === null && base.lire('listes/semaines/' + SUIV + '/dispo') === null, 'aucune quantité recopiée dans la semaine suivante');
  verifie(base.lire('listes/semaines/' + SEM + '/produits/persil-frise-bouquet') !== null && base.lire('listes/semaines/' + SEM + '/dispo/persil-frise-bouquet') !== null, 'la semaine précédente garde son ancien persil (rien d\'effacé)');

  verifie(erreurs.length === 0, 'aucune erreur JavaScript' + (erreurs.length ? ' : ' + erreurs.join(' | ') : ''));
  await nav.close(); site.close(); base.close();
  console.log(echecs ? `\n${echecs} échec(s)` : '\nTout est bon.');
  process.exit(echecs ? 1 : 0);
})().catch((x) => { console.error(x); process.exit(1); });
