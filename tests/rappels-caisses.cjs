// Test des rappels sous les caisses de la récolte (demande de François du 25/11 : « dans la case où il y a le total
// des caisses […] rajouter une case pour les élastiques et une case pour les emballages. Qui sera systématique. C'est
// juste pour ne pas les oublier » ; « La case emballage précise que ce sont les fonds de caisse et les complexes »).
// Deux cases toujours là, sans chiffre, qui ne comptent pas dans le total des caisses. Téléphone et ordinateur.
// Données factices (faux Firebase).
// Lancement depuis la racine du dépôt : node tests/rappels-caisses.cjs (CAPTURES=dossier pour des captures)
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');
const { PIXEL, sautePixel } = require('./apparence-env.cjs'); // APPARENCE=pixel : le même test dans l'apparence pixel art (étape 48)
const fauxFirebase = require('./faux-firebase.cjs');

const RACINE = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const PORT_SITE = 9002, PORT_BASE = 9003;
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
  const site = await serveurSite();
  const base = await fauxFirebase(PORT_BASE);
  const W = iso(lundi(1)), MER = plus(W, 2);
  const A0 = 1793730000000, q = (n, u) => ({ n, u: u || 'colis', by: 'Aurore', at: A0 });
  const put = (p, v) => fetch(`${BASE}/${p}.json`, { method: 'PUT', body: JSON.stringify(v) });
  await put('listes/semaines/' + W, {
    produits: {
      'celeri-branche': { nom: 'Céleri-branche', caisse: 'GB', unite: '5 kg', kg: 5, by: 'Aurore', at: A0 },
      'celeri-rave': { nom: 'Céleri-rave', caisse: 'PH', unite: '5 kg', kg: 5, by: 'Aurore', at: A0 },
    },
    q: { 'celeri-branche': { mk: q(2) }, 'celeri-rave': { mk: q(1), 'ta-jeu': q(2) } },
  });
  const avant = JSON.stringify(base.lire('listes/semaines/' + W));
  const nav = await chromium.launch();
  const erreurs = [];
  const app = PIXEL ? 'pixel' : 'classique';

  async function essai(nom, opts) {
    const ctx = await nav.newContext({ ...opts, serviceWorkers: 'block' });
    await ctx.addInitScript((w) => {
      localStorage.setItem('recolte.qui', JSON.stringify('Martin'));
      if (!localStorage.getItem('recolte.ui')) localStorage.setItem('recolte.ui', JSON.stringify({ semaineLe: ((d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'))(new Date()), semaine: w }));
    }, W);
    const T = await ctx.newPage();
    T.on('pageerror', (e) => erreurs.push(nom + ' : ' + e.message));
    await T.goto(`http://localhost:${PORT_SITE}/`);
    await T.click('[data-view="recolte"]');
    await T.waitForSelector('#recJours button');
    await T.click(`#recJours [data-jour="${MER}"]`);
    await T.waitForSelector('li.item[data-id="celeri-branche"]');
    // Caisses repliées : les rappels sont dans le cadre, cachés avec lui
    verifie(!(await T.isVisible('#crateRappels')), nom + ' : cadre des caisses replié, rappels cachés avec lui');
    await T.click('#crates summary');
    await T.waitForSelector('#crateRappels .rappel', { state: 'visible' });
    const r = await T.$$eval('#crateRappels .rappel', (e) => e.map((x) => [...x.querySelectorAll('span')].map((s) => s.textContent.trim()).join(' | ')));
    verifie(r.join(' / ') === 'Élastiques | À emporter à chaque récolte / Emballages | Fonds de caisse et complexes', nom + ' : les deux cases « ' + r.join(' / ') + ' »');
    const tuiles = await T.$$eval('.crate', (e) => e.map((x) => x.dataset.c + '=' + x.querySelector('b').textContent));
    verifie(tuiles.join(', ') === 'PB=0, PH=3, GB=2, GH=0', nom + ' : les caisses ne changent pas (obtenu ' + tuiles.join(', ') + ')');
    const sum = (await T.textContent('#crateSum')).replace(/\s+/g, ' ').trim();
    verifie(sum === '· 5 à remplir', nom + ' : le total ne compte pas les rappels (obtenu « ' + sum + ' »)');
    const g = await T.evaluate(() => {
      const grille = document.querySelector('#crateGrid').getBoundingClientRect();
      const b = [...document.querySelectorAll('#crateRappels .rappel')].map((x) => x.getBoundingClientRect());
      const deborde = [...document.querySelectorAll('#crateRappels .rappel, #crateRappels .rappel span')].some((x) => x.scrollWidth > x.clientWidth + 1);
      return { sous: b.every((x) => x.top >= grille.bottom - 1), cote: Math.abs(b[0].top - b[1].top) < 2 && b[0].right <= b[1].left, dedans: b.every((x) => x.left >= 0 && x.right <= innerWidth), deborde, page: document.documentElement.scrollWidth <= innerWidth, h: b.map((x) => Math.round(x.height)) };
    });
    verifie(g.sous && g.cote, nom + ' : sous les caisses, côte à côte (' + JSON.stringify(g) + ')');
    verifie(g.dedans && !g.deborde && g.page, nom + ' : rien ne déborde, pas de défilement de côté');
    if (CAPTURES) {
      await T.$eval('#crates', (e) => { e.scrollIntoView(); window.scrollBy(0, -90); });
      await T.waitForTimeout(200);
      await T.screenshot({ path: path.join(CAPTURES, app + '-' + nom + '-caisses.png') });
    }
    verifie(JSON.stringify(base.lire('listes/semaines/' + W)) === avant, nom + ' : rien n\'est écrit dans la base');
    await ctx.close();
  }
  await essai('telephone', devices['Pixel 7']);
  await essai('ordinateur', { viewport: { width: 1366, height: 900 } });

  verifie(erreurs.length === 0, 'aucune erreur JavaScript' + (erreurs.length ? ' : ' + erreurs.join(' | ') : ''));
  await nav.close(); site.close(); base.close();
  console.log(echecs ? `\n${echecs} échec(s)` : '\nTout est bon.');
  process.exit(echecs ? 1 : 0);
})().catch((x) => { console.error(x); process.exit(1); });
