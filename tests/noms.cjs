// Test des noms proposés dans « Qui récolte ? » (demande de François du 18/11/2026) : François, Aurore et Martin
// sont des boutons pour tout le monde ; un prénom tapé dans « Autre prénom » ne vaut que pour ce téléphone.
// Données factices : la liste en fichier du 4/11 et un faux Firebase, rien n'est écrit dans la vraie base.
// Lancement depuis la racine du dépôt : node tests/noms.cjs
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

(async () => {
  const site = await serveurSite();
  const base = await fauxFirebase(PORT_BASE);
  const nav = await chromium.launch();
  const erreurs = [];
  const ctx = await nav.newContext({ ...devices['Pixel 7'], deviceScaleFactor: 1, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => erreurs.push(e.message));
  await p.goto(`http://localhost:${PORT_SITE}/?liste=2026-11-04`);
  await p.waitForSelector('#todo li.item');

  // 1. Sans nom, cocher une ligne ouvre « Qui récolte ? » avec les trois prénoms
  const id = await p.$eval('#todo li.item', (li) => li.dataset.id);
  await p.click(`#todo li.item[data-id="${id}"] .box`);
  await p.waitForSelector('#whoDlg[open]');
  const noms = await p.$$eval('#whoDlg [data-name]', (b) => b.map((x) => x.textContent.trim()));
  verifie(JSON.stringify(noms) === JSON.stringify(['François', 'Aurore', 'Martin']), 'la fenêtre propose François, Aurore et Martin (' + noms.join(', ') + ')');
  verifie(await p.isVisible('#whoDlg [data-name="Martin"]'), 'le bouton Martin est visible sur le téléphone');

  // 2. Toucher Martin : le nom est pris, la coche est signée Martin
  await p.click('#whoDlg [data-name="Martin"]');
  await p.waitForTimeout(600);
  verifie(!(await p.$('#whoDlg[open]')), 'la fenêtre se ferme');
  verifie((await p.textContent('#who')).includes('Martin'), 'le nom en haut de l\'écran est « Martin »');
  const qui = await p.evaluate(() => localStorage.getItem('recolte.qui'));
  verifie(qui && qui.includes('Martin'), 'le téléphone retient Martin (' + qui + ')');
  const c = base.lire('listes/2026-11-04/done/' + id);
  verifie(c && JSON.stringify(c).includes('Martin'), 'la coche enregistrée porte le nom de Martin (' + JSON.stringify(c) + ')');

  // 3. Un autre prénom tapé : pris sur ce téléphone, mais pas ajouté aux boutons
  await p.click('#who');
  await p.waitForSelector('#whoDlg[open]');
  await p.fill('#whoOther', 'Léa');
  await p.click('#whoOk');
  await p.waitForTimeout(300);
  verifie((await p.textContent('#who')).includes('Léa'), 'un prénom tapé (« Léa ») devient le nom de ce téléphone');
  const noms2 = await p.$$eval('#whoDlg [data-name]', (b) => b.map((x) => x.dataset.name));
  verifie(noms2.length === 3 && !noms2.includes('Léa'), 'il ne devient pas un bouton : toujours les trois mêmes prénoms');

  verifie(erreurs.length === 0, 'aucune erreur dans la page' + (erreurs.length ? ' : ' + erreurs.join(' | ') : ''));
  await nav.close(); site.close(); base.close && base.close();
  console.log(echecs ? `\n${echecs} échec(s)` : '\nTout est bon.');
  process.exit(echecs ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
