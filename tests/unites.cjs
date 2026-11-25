// Test des unités au poids moyen (demande de François du 25/11 : « En plus des colis type PH, GB, etc., et des
// kilos, je veux pouvoir sélectionner unité aussi » ; choix : poids moyen d'une unité, pour tous les légumes au kilo
// qui se comptent, poids trouvés sur Internet, docs/POIDS_UNITES.md). Le référentiel donne « poids_unite » (kg) ;
// une case peut se remplir en unités, converties en kilos puis en colis pour le reste, la récolte et les caisses.
// Les semaines déjà saisies en profitent sans rien écrire ; le stock reste en colis ou en kilos.
// Données factices (faux Firebase).
// Lancement depuis la racine du dépôt : node tests/unites.cjs (CAPTURES=dossier pour des captures)
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');
const { PIXEL, sautePixel } = require('./apparence-env.cjs'); // APPARENCE=pixel : le même test dans l'apparence pixel art (étape 48)
const fauxFirebase = require('./faux-firebase.cjs');

const RACINE = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const PORT_SITE = 9006, PORT_BASE = 9007;
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
  // 0. Le référentiel : 35 légumes au kilo avec un poids moyen, aucun pour les feuilles en vrac et petits légumes
  const REF = JSON.parse(fs.readFileSync(path.join(RACINE, 'referentiel/conditionnements.json'), 'utf8'));
  const avec = REF.produits.filter((p) => p.poids_unite !== undefined);
  verifie(avec.length === 35, 'référentiel : 35 produits avec un poids moyen par unité (obtenu ' + avec.length + ')');
  verifie(avec.every((p) => p.kg > 0 && !p.masque && p.poids_unite > 0 && p.poids_unite < p.kg), 'chacun est au kilo, proposé, et son unité pèse moins qu\'un colis');
  const SANS = ['Epinard (feuille)', 'Fève', 'Haricot Vert', 'Mâche', 'Mesclun', 'Petit-Pois', 'Pois Mange-Tout', 'Roquette', 'Tomate Cerise', 'Chou Kale', 'Bette mini (pied)', 'Radis noir rond', "Radis d'hiver en mélange"];
  verifie(SANS.every((n) => { const p = REF.produits.find((x) => x.produit === n); return p && p.poids_unite === undefined; }), 'sans unité : feuilles en vrac, petits légumes, kale, et les trois sans source');
  verifie(REF.produits.find((p) => p.produit === 'Céleri-branche').poids_unite === 0.65 && REF.produits.find((p) => p.produit === 'Chou fleur').poids_unite === 1.5, 'exemples : céleri-branche 650 g, chou-fleur 1,5 kg');
  verifie(REF.produits.filter((p) => p.poids_unite !== undefined && (p.par_colis || p.type)).length === 0, 'les produits en bottes, bouquets ou pièces ne changent pas');

  const site = await serveurSite();
  const base = await fauxFirebase(PORT_BASE);
  const W = iso(lundi(1)), MER = plus(W, 2);
  const A0 = 1793730000000, q = (n, u) => ({ n, u: u || 'colis', by: 'Aurore', at: A0 });
  const put = (p, v) => fetch(`${BASE}/${p}.json`, { method: 'PUT', body: JSON.stringify(v) });
  // Une semaine saisie avant le 25/11 : fiches sans poids moyen. Céleri-branche 2 GB disponibles, chou-fleur au marché.
  const FICHE_CB = { nom: 'Céleri-branche', caisse: 'GB', unite: '5 kg', kg: 5, by: 'Aurore', at: A0 };
  await put('listes/semaines/' + W, {
    produits: { 'celeri-branche': FICHE_CB, 'chou-fleur': { nom: 'Chou fleur', caisse: 'GH', unite: '7 kg', kg: 7, by: 'Aurore', at: A0 }, mache: { nom: 'Mâche', caisse: 'PB', unite: '1 kg', kg: 1, by: 'Aurore', at: A0 } },
    dispo: { 'celeri-branche': q(2) },
    q: { 'chou-fleur': { mk: q(1) } },
  });
  const qB = (pid, c) => { const x = base.lire(`listes/semaines/${W}/q/${pid}/${c}`); return x && JSON.stringify({ n: x.n, u: x.u }); };
  const nav = await chromium.launch();
  const erreurs = [];
  const app = PIXEL ? 'pixel' : 'classique';
  const appareil = async (opts, qui) => {
    const ctx = await nav.newContext({ ...opts, serviceWorkers: 'block' });
    await ctx.addInitScript((a) => {
      localStorage.setItem('recolte.qui', JSON.stringify(a.qui));
      if (!localStorage.getItem('recolte.ui')) localStorage.setItem('recolte.ui', JSON.stringify({ semaineLe: ((d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'))(new Date()), semaine: a.w }));
    }, { w: W, qui });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => erreurs.push(qui + ' : ' + e.message));
    p.on('dialog', (d) => d.accept());
    await p.goto(`http://localhost:${PORT_SITE}/`);
    await p.click('[data-view="semaine"]');
    await p.waitForSelector('#semView:not([hidden])');
    return p;
  };
  const cap = async (p, nom, sel) => { if (CAPTURES) await (sel ? (await p.$(sel)).screenshot({ path: path.join(CAPTURES, app + '-' + nom + '.png') }) : p.screenshot({ path: path.join(CAPTURES, app + '-' + nom + '.png') })); };

  // ---------- Téléphone ----------
  const T = await appareil(devices['Pixel 7'], 'François');
  await T.click('[data-sem="repartir"]');
  const carte = 'section.sp[data-pid="celeri-branche"]', lv = carte + ' .sr[data-k="q/lv"]', inp = lv + ' .sr-ctl input', bU = lv + ' [data-a="unite"]';
  await T.waitForSelector(carte);
  await T.click(carte + ' .sp-head');
  await T.waitForSelector(lv);
  // 1. Le bouton d'unité fait le tour : GB → kg → unités → GB (case vide, rien d'écrit)
  const tour = [net(await T.textContent(bU))];
  for (let i = 0; i < 3; i++) { await T.click(bU); await T.waitForTimeout(150); tour.push(net(await T.textContent(bU))); }
  verifie(tour.join(' → ') === 'GB → kg → unités → GB', 'téléphone : le bouton d\'unité fait GB → kg → unités → GB (obtenu ' + tour.join(' → ') + ')');
  verifie(qB('celeri-branche', 'lv') === null, 'changer l\'unité d\'une case vide n\'écrit rien');
  await T.click(bU); await T.click(bU); // → unités
  // 2. « 3 » en unités → {n:3, u:'u'} ; 1,95 kg ; le reste en tient compte
  await T.fill(inp, '3'); await T.press(inp, 'Enter');
  verifie(await attendreQue(() => qB('celeri-branche', 'lv') === JSON.stringify({ n: 3, u: 'u' })), 'téléphone : 3 unités enregistrées (obtenu ' + qB('celeri-branche', 'lv') + ')');
  await T.waitForTimeout(300);
  const eq = net(await T.textContent(lv + ' .sr-eq'));
  verifie(eq.startsWith('= 1,95 kg (0,39 GB)'), 'sous la case : « ' + eq + ' »');
  const reste = net(await T.textContent(carte + ' .sp-head .reste'));
  verifie(reste === 'À placer : 1,61 GB (8,05 kg)', 'reste : 2 GB − 1,95 kg → « ' + reste + ' »');
  await cap(T, 'telephone-case', carte);
  // − et + avancent d'une unité ; changer d'unité convertit
  await T.click(lv + ' [data-a="plus"]');
  verifie(await attendreQue(() => qB('celeri-branche', 'lv') === JSON.stringify({ n: 4, u: 'u' })), '+ : 4 unités');
  await T.click(lv + ' [data-a="moins"]');
  verifie(await attendreQue(() => qB('celeri-branche', 'lv') === JSON.stringify({ n: 3, u: 'u' })), '− : 3 unités');
  await T.click(bU);
  verifie(await attendreQue(() => qB('celeri-branche', 'lv') === JSON.stringify({ n: 0.39, u: 'colis' })), 'unités → GB : 3 unités deviennent 0,39 GB (obtenu ' + qB('celeri-branche', 'lv') + ')');
  await T.click(bU); await T.click(bU);
  verifie(await attendreQue(() => qB('celeri-branche', 'lv') === JSON.stringify({ n: 3, u: 'u' })), 'GB → kg → unités : de nouveau 3 unités');
  // 3. Écrit en toutes lettres, dans n'importe quelle case
  const mk = carte + ' .sr[data-k="q/mk"] .sr-ctl input';
  await T.fill(mk, '2 unités'); await T.press(mk, 'Enter');
  verifie(await attendreQue(() => qB('celeri-branche', 'mk') === JSON.stringify({ n: 2, u: 'u' })), '« 2 unités » tapé dans la case du marché');
  // 4. Le stock reste en colis ou en kilos
  const stk = await T.$$eval(carte + ' .sr[data-k^="stock/"]', (e) => e.length);
  if (stk) {
    const bs = carte + ' .sr[data-k^="stock/"] [data-a="unite"]', vus = [];
    for (let i = 0; i < 3; i++) { vus.push(net(await T.textContent(bs))); await T.click(bs); await T.waitForTimeout(150); }
    verifie(!vus.includes('unités'), 'stock : pas d\'unités (' + vus.join(', ') + ')');
  } else verifie(true, 'stock : pas de case de stock dans cette semaine (rien à vérifier)');
  // 5. La mâche n'a pas d'unités
  await T.click('section.sp[data-pid="mache"] .sp-head');
  const bm = 'section.sp[data-pid="mache"] .sr[data-k="q/lv"] [data-a="unite"]';
  await T.waitForSelector(bm);
  const vm = []; for (let i = 0; i < 3; i++) { vm.push(net(await T.textContent(bm))); await T.click(bm); await T.waitForTimeout(150); }
  verifie(!vm.includes('unités'), 'mâche : colis et kg seulement (' + vm.join(', ') + ')');
  const imk = 'section.sp[data-pid="mache"] .sr[data-k="q/lv"] .sr-ctl input';
  await T.fill(imk, '3 unités'); await T.press(imk, 'Enter'); await T.waitForTimeout(400);
  verifie(qB('mache', 'lv') === null, 'mâche : « 3 unités » refusé, rien d\'écrit');
  // La semaine déjà saisie n'a rien reçu de plus dans sa fiche
  verifie(JSON.stringify(base.lire(`listes/semaines/${W}/produits/celeri-branche`)) === JSON.stringify(FICHE_CB), 'fiche de la semaine inchangée (le poids moyen vient du référentiel)');

  // 6. Récolte du mercredi : 3 unités (Locavore) + 2 unités (marché) = 5 unités = 3,25 kg ; caisses comptées au poids
  await T.click('[data-view="recolte"]');
  await T.waitForSelector('#recJours button');
  await T.click(`#recJours [data-jour="${MER}"]`);
  await T.waitForSelector('li.item[data-id="celeri-branche"]');
  const qte = net(await T.textContent('li.item[data-id="celeri-branche"] .qty'));
  verifie(qte === '5 unités3,25 kg', 'Récolte : « 5 unités », « 3,25 kg » (obtenu « ' + qte + ' »)');
  await T.click('#crates summary');
  await T.waitForTimeout(200);
  const tuiles = await T.$$eval('.crate', (e) => e.map((x) => x.dataset.c + '=' + x.querySelector('b').textContent));
  verifie(tuiles.join(', ') === 'PB=0, PH=0, GB=2, GH=1', 'caisses : céleri en 2 GB (une par circuit), chou-fleur 1 GH (obtenu ' + tuiles.join(', ') + ')');
  await cap(T, 'telephone-recolte');
  // 7. Préparation : « 3 unités » chez Locavore
  await T.click('[data-view="prep"]');
  await T.click('#prepSort [data-sort="produit"]');
  await T.waitForSelector('#prepList li.pitem');
  const prep = await T.$$eval('#prepList li.pitem', (e) => e.filter((x) => x.dataset.k.indexOf('celeri-branche') >= 0).map((x) => x.querySelector('.prod').textContent + ' : ' + x.querySelector('.qty').textContent.replace(/\s+/g, ' ').trim()));
  verifie(prep.join(' | ') === 'Locavore : 3 unités1,95 kg | Marché de Tronget : 2 unités1,3 kg', 'Préparation : ' + prep.join(' | '));
  await cap(T, 'telephone-preparation');

  // ---------- Ordinateur ----------
  const O = await appareil({ viewport: { width: 1366, height: 900 } }, 'Aurore');
  await O.waitForSelector('#semGrid tr[data-pid="chou-fleur"]');
  const sel = (pid, k) => `#semGrid tr[data-pid="${pid}"] select[data-k="${k}"]`, gi = (pid, k) => `#semGrid tr[data-pid="${pid}"] input[data-k="${k}"]`;
  const opts = await O.$$eval(sel('chou-fleur', 'q/mk'), (s) => [...s[0].options].map((o) => o.textContent));
  verifie(opts.join(', ') === 'GH, kg, unités', 'grille : menu d\'unité GH, kg, unités (obtenu ' + opts.join(', ') + ')');
  verifie((await O.$eval(sel('celeri-branche', 'q/lv'), (s) => s.value)) === 'u' && (await O.inputValue(gi('celeri-branche', 'q/lv'))) === '3', 'grille : la case Locavore montre 3 en unités');
  await O.selectOption(sel('chou-fleur', 'q/mk'), 'u');
  verifie(await attendreQue(() => qB('chou-fleur', 'mk') === JSON.stringify({ n: 4.67, u: 'u' })), 'grille : 1 GH de chou-fleur (7 kg) = 4,67 unités de 1,5 kg (obtenu ' + qB('chou-fleur', 'mk') + ')');
  await O.fill(gi('chou-fleur', 'q/mk'), '4'); await O.press(gi('chou-fleur', 'q/mk'), 'Tab');
  verifie(await attendreQue(() => qB('chou-fleur', 'mk') === JSON.stringify({ n: 4, u: 'u' })), 'grille : 4 unités tapées');
  await O.waitForTimeout(300);
  const titre = await O.getAttribute(gi('chou-fleur', 'q/mk'), 'title');
  verifie(/4 unités/.test(titre) && /6 kg/.test(titre), 'grille : bulle de la case « ' + titre + ' »');
  await cap(O, 'ordinateur-grille', '#semGrid');

  verifie(erreurs.length === 0, 'aucune erreur JavaScript' + (erreurs.length ? ' : ' + erreurs.join(' | ') : ''));
  await nav.close(); site.close(); base.close();
  console.log(echecs ? `\n${echecs} échec(s)` : '\nTout est bon.');
  process.exit(echecs ? 1 : 0);
})().catch((x) => { console.error(x); process.exit(1); });
