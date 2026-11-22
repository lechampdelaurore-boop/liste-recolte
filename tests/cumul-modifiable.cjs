// Cumul modifiable sur le téléphone (demande de François du 18/11) : toucher une case du tableau « Cumul » ouvre une
// petite fenêtre avec la même case que dans « Répartir » (clavier, − et +, unité, « tout », coche du reste 03 → 63).
// Deux téléphones et un ordinateur, via un faux Firebase. Vérifie l'écriture dans la base, le tableau, l'autre
// téléphone, la page « Répartir », l'impression et que l'ordinateur garde sa grille.
// Lancement depuis la racine du dépôt : node tests/cumul-modifiable.cjs
// Captures d'écran (facultatif) : CAPTURES=dossier node tests/cumul-modifiable.cjs
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');
const { PIXEL, sautePixel } = require('./apparence-env.cjs'); // APPARENCE=pixel : le même test dans l'apparence pixel art (étape 48)
const fauxFirebase = require('./faux-firebase.cjs');

const RACINE = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const PORT_SITE = 8890, PORT_BASE = 8891;
const CAPTURES = process.env.CAPTURES || '';

function serveurSite() {
  return new Promise((ok) => {
    const s = http.createServer((q, r) => {
      let f = decodeURIComponent(new URL(q.url, 'http://x').pathname);
      if (f.endsWith('/')) f += 'index.html';
      // Sans clé web : pas de compte (le fichier du dépôt, une fois rempli par François, n'est pas lu par les tests).
      if (f === '/cle-web.js') { r.writeHead(200, { 'Content-Type': 'text/javascript' }); return r.end("window.RECOLTE_CLE_WEB='';"); }
      if (f === '/config.js') { r.writeHead(200, { 'Content-Type': 'text/javascript' }); return r.end(`window.RECOLTE_DB_URL='http://localhost:${PORT_BASE}';`); }
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
const lundi = () => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d; };

(async () => {
  const site = await serveurSite();
  const base = await fauxFirebase(PORT_BASE);
  const SEM = iso(lundi()), CHEMIN = `http://localhost:${PORT_BASE}/listes/semaines/${SEM}`;
  const lire = async (k) => (await fetch(`${CHEMIN}/${k}.json`)).json();
  const nav = await chromium.launch();
  const erreurs = [];
  const appareil = async (nom, modele) => {
    const ctx = await nav.newContext({ ...modele, serviceWorkers: 'block' });
    await ctx.addInitScript((n) => localStorage.setItem('recolte.qui', JSON.stringify(n)), nom);
    const p = await ctx.newPage();
    p.on('pageerror', (e) => erreurs.push(nom + ' : ' + e.message));
    p.on('dialog', (d) => d.accept());
    await p.goto(`http://localhost:${PORT_SITE}/`);
    await p.click('[data-view="semaine"]');
    await p.waitForSelector('#semView:not([hidden])');
    return p;
  };
  const A = await appareil('François', devices['Pixel 7']);
  const B = await appareil('Aurore', devices['iPhone 13']);
  const capture = async (p, nom) => { if (CAPTURES) await p.screenshot({ path: path.join(CAPTURES, nom + '.png') }); };
  const attendre = (p, ms) => p.waitForTimeout(ms || 500);
  const cellule = (pid, k) => `#semTable tr[data-pid="${pid}"] td[data-k="${k}"]`;
  const texte = async (p, pid, k) => (await p.textContent(cellule(pid, k))).trim();
  const dlg = '#semEd';

  // Deux produits dans la semaine, ajoutés comme d'habitude, puis la bette répartie dans « Répartir ».
  await A.click('[data-a="ajouter"]');
  for (const n of ['Bette', 'Radis long rose']) { await A.fill('#addQ', n); await A.click(`#addList [data-nom="${n}"]`); }
  await A.click('#addClose');
  await A.click('section.sp[data-pid="bette"] .sp-head');
  await A.fill('section.sp[data-pid="bette"] .sr[data-k="dispo"] input', '10'); await A.press('section.sp[data-pid="bette"] .sr[data-k="dispo"] input', 'Enter');
  await A.fill('section.sp[data-pid="bette"] .sr[data-k="q/ta-mar"] input', '2'); await A.press('section.sp[data-pid="bette"] .sr[data-k="q/ta-mar"] input', 'Enter');
  await attendre(A);

  // 1. Le Cumul du téléphone : une phrase d'aide, des cases à toucher ; le reste n'en est pas une.
  await A.click('[data-sem="cumul"]');
  await A.waitForSelector('#semTable tr[data-pid="bette"]');
  verifie((await A.textContent('#semTab .sem-tab-hint')).trim() === 'Toucher une case pour la modifier.', 'Cumul : « Toucher une case pour la modifier. » au-dessus du tableau');
  const k = await A.$$eval('#semTable tr[data-pid="bette"] td', (e) => e.map((x) => x.dataset.k || '-'));
  verifie(k.join() === '-,dispo,stock/ta,q/ta-mar,q/lm,q/ps,q/lv,q/ta-jeu,q/av03,q/av63,q/mk,q/el,-,report/av63', 'chaque case de la ligne se touche (disponible, stock, chaque livraison, reste 03 → 63) sauf le nom et le reste (obtenu ' + k.join() + ')');
  verifie((await texte(A, 'bette', 'dispo')) === '10' && (await texte(A, 'bette', 'q/ta-mar')) === '2', 'le tableau montre toujours les chiffres en texte (dispo 10, TA mar 2)');
  verifie(!(await A.isVisible(dlg)), 'fenêtre fermée au départ');

  // 2. Toucher une case vide : la fenêtre s'ouvre sur cette case, le clavier aussi.
  await A.click(cellule('bette', 'q/lv'));
  await A.waitForSelector(dlg + '[open]');
  verifie((await A.textContent('#semEdTitre')).trim() === 'Bette' && (await A.textContent(dlg + ' .sp-colis')).trim() === 'GH de 5 kg', 'la fenêtre porte le nom du produit et son colis (« Bette », « GH de 5 kg »)');
  verifie((await A.$$eval(dlg + ' .sr[data-k]', (e) => e.map((x) => x.dataset.k))).join() === 'q/lv', 'une seule case dans la fenêtre : celle touchée (Locavore)');
  verifie((await A.textContent(dlg + ' .sr[data-k="q/lv"] .sr-nom')).includes('Locavore'), 'la case dit le débouché : Locavore');
  verifie(await A.evaluate(() => document.activeElement === document.querySelector('#semEd .sr-ctl input')), 'le curseur est dans la case : le clavier s\'ouvre tout de suite');
  verifie((await A.textContent(dlg + ' .sr.total .reste')).trim() === 'À placer : 8 GH (40 kg)', 'le reste du produit est rappelé (obtenu « ' + (await A.textContent(dlg + ' .sr.total .reste')).trim() + ' »)');
  await capture(A, '1-telephone-fenetre');
  await A.fill(dlg + ' .sr-ctl input', '3'); await A.press(dlg + ' .sr-ctl input', 'Enter');
  await attendre(A);
  verifie((await A.textContent(dlg + ' .sr.total .reste')).trim() === 'À placer : 5 GH (25 kg)', 'taper 3 puis OK : le reste de la fenêtre passe à 5 GH');
  verifie((await texte(A, 'bette', 'q/lv')) === '3' && (await A.textContent('#semTable tr[data-pid="bette"] td.r-aplacer')).trim() === '5 GH (25 kg)', 'le tableau derrière suit : Locavore 3, reste 5 GH');
  const qlv = await lire('q/bette/lv');
  verifie(qlv && qlv.n === 3 && qlv.u === 'colis' && qlv.by === 'François', 'écrit au même endroit que « Répartir », signé François (obtenu ' + JSON.stringify(qlv && { n: qlv.n, u: qlv.u, by: qlv.by }) + ')');

  // 3. Boutons + et −, unité, puis fermer.
  await A.click(dlg + ' [data-a="plus"]');
  verifie((await A.inputValue(dlg + ' .sr-ctl input')) === '3.5' || (await A.inputValue(dlg + ' .sr-ctl input')) === '3,5', 'bouton + : 3,5 (obtenu ' + (await A.inputValue(dlg + ' .sr-ctl input')) + ')');
  await A.click(dlg + ' [data-a="moins"]');
  verifie((await A.inputValue(dlg + ' .sr-ctl input')) === '3', 'bouton − : de nouveau 3');
  await A.click(dlg + ' [data-a="unite"]');
  await attendre(A);
  const enKg = await lire('q/bette/lv');
  verifie(enKg.u === 'kg' && enKg.n === 15, 'bouton d\'unité : 3 GH deviennent 15 kg (obtenu ' + enKg.n + ' ' + enKg.u + ')');
  verifie((await texte(A, 'bette', 'q/lv')) === '15 kg', 'le tableau écrit « 15 kg »');
  await A.click(dlg + ' [data-a="ed-fermer"]');
  verifie(!(await A.isVisible(dlg)), 'bouton « Fermer » : la fenêtre se ferme');

  // 4. « tout », sur une case de livraison ; puis case vidée = effacée.
  await A.click(cellule('bette', 'q/el'));
  await A.waitForSelector(dlg + '[open]');
  await A.click(dlg + ' [data-a="tout"]');
  verifie((await texte(A, 'bette', 'q/el')) === 'tout' && (await A.textContent(dlg + ' .sr-toutv')).includes('Tout ce qui reste'), 'bouton « tout » dans la fenêtre : la case Élie dit « tout »');
  await A.keyboard.press('Escape');
  verifie(!(await A.isVisible(dlg)), 'touche Échap : la fenêtre se ferme');
  await A.click(cellule('bette', 'q/ta-mar'));
  await A.waitForSelector(dlg + '[open]');
  verifie((await A.inputValue(dlg + ' .sr-ctl input')) === '2', 'case remplie : la fenêtre montre sa valeur (2)');
  await A.fill(dlg + ' .sr-ctl input', ''); await A.press(dlg + ' .sr-ctl input', 'Enter');
  await attendre(A);
  verifie((await texte(A, 'bette', 'q/ta-mar')) === '' && (await lire('q/bette/ta-mar')) === null, 'case vidée : effacée, dans le tableau et dans la base');
  // Toucher le fond grisé ferme aussi.
  await A.mouse.click(5, 5);
  verifie(!(await A.isVisible(dlg)), 'toucher à côté de la fenêtre la ferme');

  // 5. Disponible, stock chez Très Allier et reste 03 → 63 : mêmes réglages que dans « Répartir ».
  await A.click(cellule('radis-long-rose', 'dispo'));
  await A.waitForSelector(dlg + '[open]');
  verifie((await A.textContent(dlg + ' .sr[data-k="dispo"] .sr-nom')).trim() === 'Disponible', 'case « Dispo » : la fenêtre dit « Disponible »');
  await A.fill(dlg + ' .sr-ctl input', '6'); await A.press(dlg + ' .sr-ctl input', 'Enter');
  await attendre(A);
  verifie((await texte(A, 'radis-long-rose', 'dispo')) === '6', 'disponible du radis : 6');
  await A.keyboard.press('Escape');
  await A.click(cellule('radis-long-rose', 'stock/ta'));
  await A.waitForSelector(dlg + '[open]');
  verifie((await A.textContent(dlg + ' .sr-nom')).includes('Stock chez Très Allier'), 'case stock : « Stock chez Très Allier »');
  await A.fill(dlg + ' .sr-ctl input', '1'); await A.press(dlg + ' .sr-ctl input', 'Enter');
  await attendre(A);
  verifie((await texte(A, 'radis-long-rose', 'stock/ta')).startsWith('1'), 'stock du radis chez Très Allier : 1');
  await A.keyboard.press('Escape');
  await A.click(cellule('radis-long-rose', 'report/av63'));
  await A.waitForSelector(dlg + '[open]');
  const coche = dlg + ' input[data-a="propose"]';
  verifie(!(await A.isChecked(coche)) && (await A.$$(dlg + ' .sr.report')).length === 0 && (await A.textContent(dlg + ' .sr-opt')).includes('Proposé à Auvabio'), 'case reste 03 → 63 : la coche « Proposé à Auvabio », pas cochée (rien chez Auvabio 03), comme dans « Répartir »');
  await A.check(coche); await attendre(A);
  verifie(await A.isChecked(coche) && (await A.$$(dlg + ' .sr.report')).length === 1 && (await A.isVisible(dlg)), 'cocher : le reste proposé apparaît dans la fenêtre, qui reste ouverte');
  verifie((await lire('propose/radis-long-rose/av63')).v === true, 'la coche est écrite dans la base');
  verifie((await texte(A, 'radis-long-rose', 'report/av63')) !== '', 'le tableau montre le reste proposé (' + (await texte(A, 'radis-long-rose', 'report/av63')) + ')');
  await A.keyboard.press('Escape');

  // 6. Aurore, sur un autre téléphone, voit tout de suite ; sa fenêtre suit un changement de François.
  await B.click('[data-sem="cumul"]');
  await B.waitForSelector('#semTable tr[data-pid="bette"]');
  await attendre(B, 800);
  verifie((await texte(B, 'bette', 'q/lv')) === '15 kg' && (await texte(B, 'bette', 'q/el')) === 'tout' && (await texte(B, 'radis-long-rose', 'dispo')) === '6', 'Aurore voit les changements faits dans le Cumul de François');
  await B.click(cellule('radis-long-rose', 'q/ps'));
  await B.waitForSelector(dlg + '[open]');
  await B.evaluate(() => document.activeElement.blur());
  await A.click(cellule('radis-long-rose', 'q/ps'));
  await A.waitForSelector(dlg + '[open]');
  await A.fill(dlg + ' .sr-ctl input', '2'); await A.press(dlg + ' .sr-ctl input', 'Enter');
  await attendre(B, 1200);
  verifie((await B.inputValue(dlg + ' .sr-ctl input')) === '2', 'la fenêtre ouverte chez Aurore passe à 2 quand François tape 2');
  await capture(B, '2-telephone-deux');
  await B.keyboard.press('Escape'); await A.keyboard.press('Escape');

  // 7. « Répartir » montre les mêmes chiffres ; la fenêtre se ferme si on change de page.
  await A.click(cellule('bette', 'dispo'));
  await A.waitForSelector(dlg + '[open]');
  await A.evaluate(() => { document.querySelector('[data-sem="repartir"]').click(); });
  verifie(!(await A.isVisible(dlg)), 'changer de page ferme la fenêtre');
  await A.click('section.sp[data-pid="radis-long-rose"] .sp-head');
  verifie((await A.inputValue('section.sp[data-pid="radis-long-rose"] .sr[data-k="q/ps"] input')) === '2' && (await A.inputValue('section.sp[data-pid="radis-long-rose"] .sr[data-k="dispo"] input')) === '6', 'page « Répartir » : mêmes chiffres que ceux tapés dans le Cumul');
  await A.click('[data-sem="cumul"]');
  await capture(A, '3-telephone-cumul');

  // 8. L'impression garde un tableau sans cases à toucher.
  await A.evaluate(() => { window.print = () => {}; });
  await A.click('#semFiltre [data-a="imprimer"]');
  const imp = await A.evaluate(() => [document.querySelectorAll('#semPrint td').length, document.querySelectorAll('#semPrint td[data-a]').length]);
  verifie(imp[0] > 0 && imp[1] === 0, 'impression : le même tableau, sans cases à toucher (' + imp[0] + ' cases, ' + imp[1] + ' à toucher)');

  // 9. Ordinateur : pas de page « Cumul », la grille reste la même (déjà modifiable).
  const C = await appareil('François', { viewport: { width: 1280, height: 800 } });
  await C.waitForSelector('#semGrid tr[data-pid="bette"]');
  verifie(!(await C.isVisible('[data-sem="cumul"]')) && !(await C.isVisible('#semTab')) && (await C.$$('#semGrid input.g-in')).length > 0, 'ordinateur : pas de page « Cumul », la grille à cases reste');
  await capture(C, '4-ordinateur');

  verifie(erreurs.length === 0, 'aucune erreur JavaScript' + (erreurs.length ? ' : ' + erreurs.join(' | ') : ''));
  await nav.close(); site.close(); base.close();
  process.exit(echecs ? 1 : 0);
})();
