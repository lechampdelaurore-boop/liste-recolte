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
  const avant = await ordre(B);
  const premiere = await (await B.$('#todo li.item')).boundingBox();
  await doigt('bette', premiere.y + 5, 50);
  verifie((await ordre(B)).join() === avant.join(), 'un glissement rapide (défilement) ne déplace pas la ligne');
  await B.evaluate(() => scrollTo(0, 0));
  const premiere2 = await (await B.$('#todo li.item')).boundingBox();
  await doigt('bette', premiere2.y + 5, 650);
  await A.waitForTimeout(500);
  verifie((await ordre(A))[0] === 'bette', 'après un appui long, la bette glissée en tête chez Aurore est en tête chez François');

  // 3. Caisses (mesclun coché : 2 PH en moins)
  const caisses = await B.$$eval('.crate', (e) => e.map((x) => x.querySelector('b').textContent));
  verifie(caisses.join(',') === '2,17,2,14', 'caisses à remplir PB,PH,GB,GH = 2,17,2,14 (obtenu ' + caisses.join(',') + ')');
  await B.click('#crates summary');
  await B.click('#perCirc');
  const regroupees = await B.$$eval('.crate', (e) => e.map((x) => x.querySelector('b').textContent));
  verifie(regroupees.join(',') === '1,17,1,13', 'demi-colis regroupés = 1,17,1,13 (obtenu ' + regroupees.join(',') + ')');

  // 4. Filtre circuit
  await B.click('[data-c="lv"]');
  const lv = await B.$$eval('#todo li.item', (e) => e.length);
  verifie(lv === 7, 'filtre Locavore : 7 lignes (obtenu ' + lv + ')');

  // 5. Décocher
  await A.click('#doneSec summary');
  await A.click('#done li[data-id="mesclun"] .box');
  await B.waitForTimeout(500);
  verifie((await B.textContent('#doneCount')) === '0', 'décocher chez François remet la ligne chez Aurore');

  verifie(erreurs.length === 0, 'aucune erreur JavaScript' + (erreurs.length ? ' : ' + erreurs.join(' | ') : ''));
  await nav.close(); site.close(); base.close();
  process.exit(echecs ? 1 : 0);
})();
