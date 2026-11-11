// Test des endives (demande de François du 11/11) : leurs caisses sont rangées là où on les récolte, donc jamais
// comptées dans le total des caisses à emporter (cadre « Caisses » de l'onglet Récolte). Réglage par produit dans le
// référentiel (« caisses_sur_place »), pas un cas écrit en dur : un autre produit, ou une autre ferme, le règle pareil.
// La quantité d'endives reste affichée sur sa ligne ; rien n'est écrit dans la base. Données factices (faux Firebase).
// Lancement depuis la racine du dépôt : node tests/endives-sur-place.cjs
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');
const fauxFirebase = require('./faux-firebase.cjs');

const RACINE = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const PORT_SITE = 8842, PORT_BASE = 8843;
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
  // 0. Le référentiel : seules les endives ont « caisses_sur_place »
  const REF = JSON.parse(fs.readFileSync(path.join(RACINE, 'referentiel/conditionnements.json'), 'utf8'));
  const sp = REF.produits.filter((p) => p.caisses_sur_place);
  verifie(sp.length === 1 && sp[0].produit === 'Endive' && sp[0].caisses_sur_place === true && sp[0].caisse === 'PH' && sp[0].kg === 5, 'référentiel : seule l\'endive a « caisses_sur_place », toujours en PH de 5 kg');

  const site = await serveurSite();
  const base = await fauxFirebase(PORT_BASE);
  const W = iso(lundi(1)), MER = plus(W, 2);
  const A0 = 1793730000000, q = (n, u) => ({ n, u: u || 'colis', by: 'Aurore', at: A0 });
  const put = (p, v) => fetch(`${BASE}/${p}.json`, { method: 'PUT', body: JSON.stringify(v) });
  // Mercredi (jour habituel) : endives 2 PH Très Allier jeudi + 1 PH marché ; bette 1 GH marché ; ail sec 1 PH marché.
  await put('listes/semaines/' + W, {
    produits: {
      endive: { nom: 'Endive', caisse: 'PH', unite: '5 kg', kg: 5, by: 'Aurore', at: A0 },
      bette: { nom: 'Bette', caisse: 'GH', unite: '5 kg', kg: 5, by: 'Aurore', at: A0 },
      'ail-sec': { nom: 'Ail sec', caisse: 'PH', unite: '5 kg', kg: 5, by: 'Aurore', at: A0 },
    },
    q: { endive: { 'ta-jeu': q(2), mk: q(1) }, bette: { mk: q(1) }, 'ail-sec': { mk: q(1) } },
  });
  const pq = () => { const w = base.lire('listes/semaines/' + W) || {}; return JSON.stringify({ produits: w.produits, q: w.q }); };
  const avant = pq();

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

  for (const [nom, opts] of [['téléphone', devices['Pixel 7']], ['ordinateur', { viewport: { width: 1280, height: 900 } }]]) {
    const T = await appareil(opts);
    await T.waitForSelector('#recJours button');
    await T.click(`#recJours [data-jour="${MER}"]`);
    await T.waitForSelector('li.item[data-id="endive"]');
    // 1. La ligne des endives garde sa quantité
    const qte = net(await T.textContent('li.item[data-id="endive"] .qty'));
    verifie(qte.startsWith('3 colis') && qte.includes('15 kg'), nom + ' : la ligne des endives garde « 3 colis », 15 kg (obtenu « ' + qte + ' »)');
    // 2. Cadre « Caisses » : les endives hors du total, nommées dessous
    if (!(await T.$eval('#crates', (d) => d.open))) await T.click('#crates summary');
    await T.waitForTimeout(200);
    const tuiles = await T.$$eval('.crate', (e) => e.map((x) => x.dataset.c + '=' + x.querySelector('b').textContent));
    verifie(tuiles.includes('PH=1') && tuiles.includes('GH=1'), nom + ' : PH = 1 (l\'ail seul, pas les 3 PH d\'endives), GH = 1 (obtenu ' + tuiles.join(', ') + ')');
    const sum = net(await T.textContent('#crateSum'));
    verifie(sum === '· 2 à remplir', nom + ' : total des caisses à emporter 2, sans les endives (obtenu « ' + sum + ' »)');
    const note = net(await T.textContent('#cratePlace'));
    verifie(!(await T.$eval('#cratePlace', (x) => x.hidden)) && note === 'Pas comptées, caisses déjà sur place : Endive (3 PH).', nom + ' : note sous le cadre (obtenu « ' + note + ' »)');
    // 3. Une fois les endives cochées, le total ne bouge pas
    await T.click('li.item[data-id="endive"] .box');
    await T.waitForTimeout(3800);
    verifie(net(await T.textContent('#crateSum')) === '· 2 à remplir', nom + ' : endives cochées, total toujours 2');
    await T.$eval('#doneSec', (d) => { d.open = true; });
    await T.click('li.item[data-id="endive"] .box');
    await T.waitForTimeout(3800);
    if (CAPTURES) await (await T.$('#crates')).screenshot({ path: path.join(CAPTURES, (nom === 'téléphone' ? '1-telephone' : '2-ordinateur') + '.png') });
    await T.context().close();
  }

  // 4. Une autre ferme, sans ce réglage : les endives comptent comme avant
  const REF2 = JSON.parse(JSON.stringify(REF));
  REF2.produits.forEach((p) => { delete p.caisses_sur_place; });
  const T2ctx = await nav.newContext({ ...devices['Pixel 7'], serviceWorkers: 'block' });
  await T2ctx.route('**/referentiel/conditionnements.json', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(REF2) }));
  await T2ctx.addInitScript((w) => { localStorage.setItem('recolte.qui', JSON.stringify('Martin')); localStorage.setItem('recolte.ui', JSON.stringify({ semaine: w })); }, W);
  const T2 = await T2ctx.newPage();
  T2.on('pageerror', (e) => erreurs.push(e.message));
  await T2.goto(`http://localhost:${PORT_SITE}/`);
  await T2.waitForSelector('#recJours button');
  await T2.click(`#recJours [data-jour="${MER}"]`);
  await T2.waitForSelector('li.item[data-id="endive"]');
  if (!(await T2.$eval('#crates', (d) => d.open))) await T2.click('#crates summary');
  await T2.waitForTimeout(200);
  const sum2 = net(await T2.textContent('#crateSum'));
  verifie(sum2 === '· 5 à remplir' && (await T2.$eval('#cratePlace', (x) => x.hidden)), 'autre ferme sans le réglage : endives comptées (5 caisses), pas de note (obtenu « ' + sum2 + ' »)');

  await new Promise((x) => setTimeout(x, 300));
  const apres = pq();
  verifie(apres === avant, 'produits et quantités de la semaine non réécrits dans la base');
  verifie(erreurs.length === 0, 'aucune erreur JavaScript' + (erreurs.length ? ' : ' + erreurs.join(' | ') : ''));
  await nav.close(); site.close(); base.close();
  console.log(echecs ? `\n${echecs} échec(s)` : '\nTout est bon.');
  process.exit(echecs ? 1 : 0);
})().catch((x) => { console.error(x); process.exit(1); });
