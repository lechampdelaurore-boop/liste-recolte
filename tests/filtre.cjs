// Test du filtre par jour de récolte et de l'impression du tableau de la semaine (demande de François du 8/11) :
// une case par jour de récolte en haut des pages « Répartir » et « Cumul », toutes cochées au départ ; décocher un
// jour masque les colonnes de ses livraisons (et le stock d'un débouché dont toutes les livraisons sont masquées),
// sans changer le reste ni la base ; bouton « Imprimer » qui imprime le tableau tel que filtré, en paysage.
// Un téléphone (François) et un ordinateur (Martin) via un faux Firebase.
// Lancement depuis la racine du dépôt : node tests/filtre.cjs
// Captures d'écran et PDF (facultatif) : CAPTURES=dossier node tests/filtre.cjs
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');
const fauxFirebase = require('./faux-firebase.cjs');

const RACINE = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const PORT_SITE = 8816, PORT_BASE = 8817;
const CAPTURES = process.env.CAPTURES || '';
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



(async () => {
  const site = await serveurSite();
  const base = await fauxFirebase(PORT_BASE);
  const SEM = iso(lundi(0));
  const A0 = 1793730000000, q = (n, u) => ({ n, u: u || 'colis', by: 'Aurore', at: A0 });
  const bette = { nom: 'Bette', caisse: 'GH', unite: '5 kg', kg: 5 };
  const put = (p, v) => fetch(`${BASE}/${p}.json`, { method: 'PUT', body: JSON.stringify(v) });
  await put('listes/semaines/' + SEM, {
    produits: { bette }, dispo: { bette: q(10) },
    q: { bette: { 'ta-mar': q(2), lm: q(1), lv: q(3), 'ta-jeu': q(1), el: q(1) } },
    stock: { bette: { ta: q(1) } },
  });
  const ecrit = JSON.stringify(base.lire('listes/semaines/' + SEM));

  const nav = await chromium.launch();
  const erreurs = [];
  const ouvrir = async (nom, opts) => {
    const ctx = await nav.newContext({ ...opts, serviceWorkers: 'block' });
    await ctx.addInitScript((n) => { localStorage.setItem('recolte.qui', JSON.stringify(n)); window.__imprime = 0; window.print = () => { window.__imprime++; }; }, nom);
    const p = await ctx.newPage();
    p.on('pageerror', (e) => erreurs.push(nom + ' : ' + e.message));
    p.on('dialog', (d) => d.accept());
    await p.goto(`http://localhost:${PORT_SITE}/`);
    return p;
  };
  const A = await ouvrir('François', devices['Pixel 7']);
  const C = await ouvrir('Martin', { viewport: { width: 1366, height: 768 }, deviceScaleFactor: CAPTURES ? 2 : 1 });
  const capture = async (p, nom) => { if (CAPTURES) await p.screenshot({ path: path.join(CAPTURES, nom + '.png'), fullPage: true }); };
  const attendre = (p, ms) => p.waitForTimeout(ms || 500);
  const cases = (p) => p.$$eval('#semFiltre input[data-a="filtre"]', (e) => e.map((x) => x.dataset.j + (x.checked ? '+' : '-')));
  const titres = (p, t) => p.$$eval(t + ' thead th', (e) => e.map((x) => x.firstChild ? x.firstChild.textContent.trim() : ''));
  const lignes = (p) => p.$$eval('#semView section.sp[data-pid="bette"] .sr[data-k]', (e) => e.map((x) => x.dataset.k));
  const reste = (p) => p.$eval('#semView section.sp[data-pid="bette"] .sp-head .reste', (e) => e.textContent);

  // 1. Téléphone : le filtre, tout coché au départ
  await A.click('[data-view="semaine"]');
  await A.waitForSelector('#semView section.sp');
  verifie(await A.isVisible('#semFiltre'), 'page Répartir : le filtre « Récoltes affichées » est en haut');
  verifie((await cases(A)).join() === 'lundi+,mercredi+,sans+', 'une case par jour de récolte (lundi, mercredi) et une pour les livraisons sans jour (Élie), toutes cochées (obtenu ' + (await cases(A)).join() + ')');
  const txtLun = await A.textContent('#semFiltre label:has(input[data-j="lundi"])');
  verifie(txtLun.includes('Lundi') && txtLun.includes('TA mar') && txtLun.includes('La Magic'), 'la case du lundi dit ce qu\'on y récolte (' + txtLun.trim() + ')');
  const h0 = await A.$eval('#semFiltre label:has(input[data-j="lundi"])', (e) => e.getBoundingClientRect().height);
  verifie(h0 >= 48, 'case assez grande pour le doigt (' + Math.round(h0) + ' px)');
  await A.click('#semView section.sp[data-pid="bette"] .sp-head');
  const l0 = await lignes(A), r0 = await reste(A);
  verifie(l0.includes('q/ta-mar') && l0.includes('q/lm') && l0.includes('q/lv') && l0.includes('stock/ta'), 'tout coché : toutes les livraisons dans la fiche');

  // 2. Décocher le lundi
  await A.click('#semFiltre input[data-j="lundi"]');
  await attendre(A);
  const l1 = await lignes(A);
  verifie(!l1.includes('q/ta-mar') && !l1.includes('q/lm') && l1.includes('q/lv') && l1.includes('q/ta-jeu') && l1.includes('stock/ta'), 'lundi décoché : Très Allier mardi et La Magic disparaissent, Locavore et Très Allier jeudi (avec son stock) restent');
  verifie((await reste(A)) === r0, 'le reste ne change pas (' + r0 + ')');
  verifie((await A.textContent('#semFiltre .sf-note')).includes('TA mar, La Magic'), 'une note dit quelles colonnes sont masquées');
  verifie(JSON.stringify(base.lire('listes/semaines/' + SEM)) === ecrit && !base.lire('listes/reglages'), 'rien n\'est écrit dans la base');
  await capture(A, '1-telephone-lundi-decoche');
  await A.click('[data-sem="cumul"]');
  await attendre(A);
  const t1 = await titres(A, '#semTable');
  verifie(await A.isVisible('#semFiltre') && !t1.includes('TA mar') && !t1.includes('La Magic') && t1.includes('Locavore') && t1.includes('TA jeu'), 'page Cumul : même filtre, mêmes colonnes masquées (obtenu ' + t1.join('|') + ')');
  await A.click('[data-sem="recolter"]');
  verifie(!(await A.isVisible('#semFiltre')), 'page À récolter : pas de filtre');
  await A.click('[data-sem="repartir"]');

  // 3. L'ordinateur a son propre choix ; puis lundi et mercredi décochés
  await C.click('[data-view="semaine"]');
  await C.waitForSelector('#semGrid tbody tr');
  const g0 = await titres(C, '#semGrid');
  verifie(g0.includes('Très Allier') && g0.includes('Panier La Magic') && (await cases(C)).join() === 'lundi+,mercredi+,sans+', 'sur l\'ordinateur, le choix du téléphone ne s\'applique pas : tout est affiché');
  await C.click('#semFiltre input[data-j="lundi"]');
  await attendre(C);
  const g1 = await C.$$eval('#semGrid thead th', (e) => e.map((x) => x.textContent));
  verifie(!g1.some((x) => x.includes('Panier La Magic')) && g1.filter((x) => x.startsWith('Très Allier')).length === 1 && g1.some((x) => x.startsWith('Stock Très Allier')), 'grille, lundi décoché : La Magic et Très Allier mardi masqués, Très Allier jeudi et son stock restent');
  await C.click('#semFiltre input[data-j="mercredi"]');
  await attendre(C);
  const g2 = await C.$$eval('#semGrid thead th', (e) => e.map((x) => x.textContent));
  verifie(!g2.some((x) => x.startsWith('Stock Très Allier')) && !g2.some((x) => x.startsWith('Locavore')) && g2.some((x) => x.startsWith('Élie')), 'lundi et mercredi décochés : le stock Très Allier part aussi, Élie (sans jour) reste');
  verifie((await C.inputValue('#semGrid input[data-k="q/el"]')) === '1' && (await C.inputValue('#semGrid input[data-k="dispo"]')) === '10', 'les cases restantes gardent leurs chiffres');
  await C.click('#semFiltre input[data-j="mercredi"]');
  await attendre(C);
  await capture(C, '2-grille-lundi-decoche');

  // 4. Impression (ordinateur, lundi décoché)
  await C.click('#semFiltre [data-a="imprimer"]');
  await attendre(C, 300);
  verifie((await C.evaluate(() => window.__imprime)) === 1, 'le bouton « Imprimer » ouvre l\'impression');
  const p1 = await titres(C, '#semPrint table');
  verifie(!p1.includes('TA mar') && !p1.includes('La Magic') && p1.includes('Locavore') && p1.includes('Stock Très Allier') && p1[0] === 'Produit', 'la feuille imprimée suit le filtre (obtenu ' + p1.join('|') + ')');
  const ent = await C.textContent('#semPrint');
  verifie(ent.includes('Répartition · semaine du') && ent.includes('Récoltes : mercredi') && !ent.includes('Récoltes : lundi'), 'la feuille dit la semaine et les récoltes imprimées');
  await C.emulateMedia({ media: 'print' });
  verifie(!(await C.isVisible('main.wrap')) && !(await C.isVisible('#tabs')) && (await C.isVisible('#semPrint table')), 'à l\'impression, seul le tableau sort (ni onglets ni boutons)');
  const coulLv = await C.$$eval('#semPrint thead th', (e) => { const x = e.filter((y) => y.textContent === 'Locavore')[0]; return x && getComputedStyle(x).color; });
  verifie(coulLv === 'rgb(10, 90, 28)', 'à l\'impression, la colonne Locavore garde sa couleur (' + coulLv + ')');
  if (CAPTURES) await C.pdf({ path: path.join(CAPTURES, '3-impression.pdf'), preferCSSPageSize: true, printBackground: true });
  const pdf = await C.pdf({ preferCSSPageSize: true, printBackground: true });
  verifie(pdf.length > 1000, 'la feuille se transforme en PDF (paysage A4)');
  await C.emulateMedia({ media: 'screen' });

  // 5. Rechargement : le choix reste sur l'appareil
  await A.reload();
  await A.click('[data-view="semaine"]').catch(() => {});
  await A.waitForSelector('#semFiltre input[data-j="lundi"]');
  verifie((await cases(A)).join() === 'lundi-,mercredi+,sans+', 'après rechargement, le lundi reste décoché sur le téléphone');
  await A.click('#semFiltre input[data-j="lundi"]');
  await attendre(A);
  verifie((await cases(A)).join() === 'lundi+,mercredi+,sans+' && !(await A.$('#semFiltre .sf-note')), 'lundi recoché : tout revient, la note part');
  verifie(JSON.stringify(base.lire('listes/semaines/' + SEM)) === ecrit, 'la semaine dans la base est inchangée du début à la fin');

  verifie(erreurs.length === 0, 'aucune erreur JavaScript' + (erreurs.length ? ' : ' + erreurs.join(' | ') : ''));
  await nav.close(); site.close(); base.close();
  process.exit(echecs ? 1 : 0);
})();
