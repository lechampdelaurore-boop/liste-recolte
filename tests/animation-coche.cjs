// Test de l'animation de la coche dans l'onglet Récolte (demande de François du 9/11) : la ligne qu'on vient de
// cocher reste à sa place, en vert, environ 3 secondes, puis part dans « Récoltes déjà effectuées ». La coche est
// enregistrée tout de suite ; un second toucher pendant l'animation la retire. Téléphone et ordinateur.
// Données factices : la liste en fichier du 4/11 et un faux Firebase, rien n'est écrit dans la vraie base.
// Lancement depuis la racine du dépôt : node tests/animation-coche.cjs
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');
const fauxFirebase = require('./faux-firebase.cjs');

const RACINE = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const PORT_SITE = 8830, PORT_BASE = 8831;
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
  const ouvrir = async (nom, opts) => {
    const ctx = await nav.newContext({ ...opts, serviceWorkers: 'block' });
    await ctx.addInitScript((n) => localStorage.setItem('recolte.qui', JSON.stringify(n)), nom);
    const p = await ctx.newPage();
    p.on('pageerror', (e) => erreurs.push(nom + ' : ' + e.message));
    await p.goto(`http://localhost:${PORT_SITE}/?liste=2026-11-04`);
    await p.waitForSelector('#todo li.item');
    await p.waitForTimeout(400);
    return p;
  };
  const TEL = { ...devices['Pixel 7'], ...(CAPTURES ? {} : { deviceScaleFactor: 1 }) };
  const A = await ouvrir('François', TEL);
  const B = await ouvrir('Aurore', TEL);
  const ligne = (id) => `#todo li.item[data-id="${id}"]`;
  const coche = (id) => base.lire('listes/2026-11-04/done/' + id);
  const etat = (p, id) => p.evaluate((sel) => {
    const li = document.querySelector(sel);
    if (!li) return null;
    const s = getComputedStyle(li), r = li.getBoundingClientRect();
    return { anim: li.classList.contains('vient-coche'), fond: s.backgroundColor, h: Math.round(r.height), op: +s.opacity,
      ecran: r.bottom > 0 && r.top < innerHeight, aria: li.querySelector('.box').getAttribute('aria-label'),
      caseFond: getComputedStyle(li.querySelector('.box')).backgroundColor };
  }, ligne(id));
  const ordre = (p) => p.$$eval('#todo li.item', (e) => e.map((x) => x.dataset.id));
  const dansFaites = (p, id) => p.$$eval('#done li.item', (e, i) => e.some((x) => x.dataset.id === i), id);
  const VERT = 'rgb(10, 90, 28)';

  // 1. Téléphone : la ligne cochée reste à sa place, en vert, environ 3 secondes
  const ids = await ordre(A);
  const id = ids[2], suivant = ids[3];
  const t0 = Date.now();
  await A.click(ligne(id) + ' .box');
  await A.waitForTimeout(500);
  let e = await etat(A, id);
  verifie(e && e.anim && e.ecran, 'téléphone, 0,5 s après la coche : la ligne « ' + id + ' » est toujours là, à l\'écran');
  verifie(e && e.fond === VERT && e.caseFond === VERT, 'la ligne est en vert plein et sa case cochée en vert (fond ' + (e && e.fond) + ')');
  verifie(e && /^Décocher/.test(e.aria), 'sa case dit « Décocher » : un second toucher annule la coche');
  verifie((await ordre(A)).indexOf(id) === 2, 'elle n\'a pas bougé dans la liste (3e ligne)');
  verifie(coche(id) && coche(id).by === 'François', 'la coche est enregistrée tout de suite (faux Firebase), sans attendre la fin de l\'animation');
  verifie((await A.textContent('#doneCount')) === '1', 'le compteur « Récoltes déjà effectuées » passe à 1 tout de suite');
  verifie(!(await dansFaites(A, id)), 'pendant l\'animation, la ligne n\'est pas encore rangée dans les récoltes effectuées');
  await B.waitForTimeout(300);
  verifie(await dansFaites(B, id) && !(await B.$(ligne(id))), 'sur le téléphone d\'Aurore, la coche arrive normalement, sans animation');
  // Un nouvel affichage (coche reçue d'un autre téléphone) ne relance pas l'animation
  await B.click(ligne(suivant) + ' .box');
  await A.waitForTimeout(700);
  const temps = await A.$eval(ligne(id), (li) => li.getAnimations().filter((a) => a.animationName === 'coche-ligne').map((a) => Math.round(a.effect.getComputedTiming().progress * a.effect.getComputedTiming().duration))[0]);
  verifie(temps > 1300, 'une coche reçue d\'Aurore pendant l\'animation ne la relance pas (animation à ' + temps + ' ms)');
  verifie(!(await A.$(ligne(suivant))), 'la ligne cochée par Aurore part tout de suite chez François (pas d\'animation pour les coches des autres)');
  // Au bout d'environ 2 s, toujours visible
  await A.waitForTimeout(Math.max(0, 1900 - (Date.now() - t0)));
  e = await etat(A, id);
  verifie(e && e.anim && e.op > 0.9 && e.fond === VERT, 'à 1,9 s, la ligne est encore bien visible en vert');
  // Puis elle part
  await A.waitForTimeout(Math.max(0, 3300 - (Date.now() - t0)));
  verifie(!(await A.$(ligne(id))) && await dansFaites(A, id), 'à 3,3 s, la ligne est partie dans « Récoltes déjà effectuées »');
  verifie((await ordre(A)).join() === ids.filter((x) => x !== id && x !== suivant).join(), 'les autres lignes gardent leur ordre');

  // Images de l'animation, pour François : 0,2 s, 1 s, 2,3 s et 2,6 s après la coche
  if (CAPTURES) {
    const id3 = ids[4];
    await A.evaluate((sel) => document.querySelector(sel).scrollIntoView({ block: 'center' }), ligne(id3));
    const t1 = Date.now();
    await A.click(ligne(id3) + ' .box');
    for (const [ms, n] of [[200, 'a'], [1000, 'b'], [2300, 'c'], [2600, 'd']]) {
      await A.waitForTimeout(Math.max(0, ms - (Date.now() - t1)));
      await A.screenshot({ path: path.join(CAPTURES, '3-sequence-' + n + '-' + ms + 'ms.png') });
    }
    await A.waitForTimeout(800);
  }

  // 2. Décocher pendant l'animation : la ligne redevient normale tout de suite
  const id2 = ids[0];
  await A.click(ligne(id2) + ' .box');
  await A.waitForTimeout(600);
  await A.click(ligne(id2) + ' .box');
  await A.waitForTimeout(300);
  e = await etat(A, id2);
  verifie(e && !e.anim && e.fond !== VERT && coche(id2) === null, 'un second toucher pendant l\'animation décoche : ligne blanche, coche retirée de la base');
  await A.waitForTimeout(3000);
  verifie(!!(await A.$(ligne(id2))) && !(await dansFaites(A, id2)), 'et la ligne reste dans « à récolter » après le délai');

  // 3. Deux coches rapprochées : les deux lignes s'animent
  const [x1, x2] = ids.slice(5, 7);
  await A.click(ligne(x1) + ' .box');
  await A.waitForTimeout(250);
  await A.click(ligne(x2) + ' .box');
  await A.waitForTimeout(500);
  verifie((await etat(A, x1)).anim && (await etat(A, x2)).anim, 'deux produits cochés coup sur coup : les deux lignes restent en vert');
  if (CAPTURES) await A.screenshot({ path: path.join(CAPTURES, '1-telephone-coche.png') });
  // Appui long sur une ligne en animation : pas de glisser
  const bb = await (await A.$(ligne(x1) + ' .prod')).boundingBox();
  await A.mouse.move(bb.x + 5, bb.y + 5); await A.mouse.down(); await A.waitForTimeout(600);
  verifie((await A.$$('#todo li.item.dragging')).length === 0, 'un appui long sur une ligne en animation ne la décolle pas');
  await A.mouse.up();
  await A.waitForTimeout(3000);
  verifie(await dansFaites(A, x1) && await dansFaites(A, x2), 'puis les deux partent dans les récoltes effectuées');

  // 4. Ordinateur : même animation, lignes compactes
  const P = await ouvrir('Martin', { viewport: { width: 1366, height: 768 }, deviceScaleFactor: CAPTURES ? 2 : 1 });
  const idsP = await ordre(P);
  const boxAvant = await (await P.$(ligne(idsP[1]) + ' .box')).boundingBox();
  await P.click(ligne(idsP[1]) + ' .box');
  await P.mouse.move(1300, 5);
  await P.waitForTimeout(700);
  e = await etat(P, idsP[1]);
  const boxPendant = await (await P.$(ligne(idsP[1]) + ' .box')).boundingBox();
  verifie(e && e.anim && e.fond === VERT && e.h >= 40, 'ordinateur : la ligne cochée reste en vert à sa place (' + (e && e.h) + ' px de haut)');
  verifie(Math.abs(boxAvant.x - boxPendant.x) < 2, 'ordinateur : la case ne saute pas de côté');
  if (CAPTURES) {
    await P.evaluate((sel) => document.querySelector(sel).scrollIntoView({ block: 'center' }), ligne(idsP[1]));
    await P.screenshot({ path: path.join(CAPTURES, '2-ordinateur-coche.png') });
  }
  await P.waitForTimeout(2600);
  verifie(await dansFaites(P, idsP[1]), 'ordinateur : puis elle part dans les récoltes effectuées');

  verifie(erreurs.length === 0, 'aucune erreur JavaScript' + (erreurs.length ? ' : ' + erreurs.join(' | ') : ''));
  await nav.close(); site.close(); base.close();
  console.log(echecs ? echecs + ' échec(s).' : 'Tout est bon.');
  process.exit(echecs ? 1 : 0);
})();
