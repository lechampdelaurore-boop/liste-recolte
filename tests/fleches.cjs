// Test des flèches du clavier dans la grille « Répartir » de l'ordinateur (demande de François du 9/11) :
// haut et bas = même colonne, ligne du dessus ou du dessous ; gauche et droite = case d'à côté sur la même ligne,
// quand le curseur est au bord du texte ou que tout le texte est sélectionné (sinon le curseur bouge dans la case) ;
// les colonnes masquées par le filtre sont sautées ; le menu d'unité garde ses flèches. Données factices (faux Firebase).
// Lancement depuis la racine du dépôt : node tests/fleches.cjs
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const fauxFirebase = require('./faux-firebase.cjs');

const RACINE = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const PORT_SITE = 8818, PORT_BASE = 8819;
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
  const put = (p, v) => fetch(`${BASE}/${p}.json`, { method: 'PUT', body: JSON.stringify(v) });
  await put('listes/semaines/' + SEM, {
    produits: { bette: { nom: 'Bette', caisse: 'GH', unite: '5 kg', kg: 5 }, chou: { nom: 'Chou', caisse: 'GH', unite: 'pièce' } },
    dispo: { bette: q(10), chou: q(6) },
    q: { bette: { lv: q(12) } },
  });

  const nav = await chromium.launch();
  const erreurs = [];
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, serviceWorkers: 'block' });
  await ctx.addInitScript(() => localStorage.setItem('recolte.qui', JSON.stringify('Martin')));
  const C = await ctx.newPage();
  C.on('pageerror', (e) => erreurs.push(e.message));
  await C.goto(`http://localhost:${PORT_SITE}/`);
  await C.click('[data-view="semaine"]');
  await C.waitForSelector('#semGrid tbody tr[data-pid="chou"]');
  const attendre = (ms) => C.waitForTimeout(ms || 300);
  const actif = () => C.evaluate(() => { const a = document.activeElement; return a && a.dataset.cell ? a.dataset.cell + (a.tagName === 'SELECT' ? ' (menu)' : '') : a ? a.tagName : ''; });
  const ligne = (pid) => C.$$eval('#semGrid tr[data-pid="' + pid + '"] input[type="text"][data-cell]', (e) => e.map((x) => x.dataset.cell));
  const touche = async (t) => { await C.keyboard.press(t); await attendre(); return actif(); };

  // 1. Droite et gauche sur la ligne de la bette
  const L = await ligne('bette');
  verifie(L[0] === 'bette|dispo' && L.length >= 8, 'ligne de la bette : ' + L.length + ' cases à taper (' + L.join(', ') + ')');
  await C.click('#semGrid input[data-cell="bette|dispo"]');
  verifie((await touche('ArrowRight')) === L[1], 'flèche droite depuis « Disponible » : case d\'à côté (' + L[1] + ')');
  verifie((await touche('ArrowRight')) === L[2], 'flèche droite encore : case suivante (' + L[2] + ')');
  verifie((await touche('ArrowLeft')) === L[1], 'flèche gauche : retour à la case d\'avant (' + L[1] + ')');
  verifie((await touche('ArrowLeft')) === 'bette|dispo', 'flèche gauche : retour à « Disponible »');
  verifie((await touche('ArrowLeft')) === 'bette|dispo', 'flèche gauche sur la première case : on reste');
  await C.focus('#semGrid input[data-cell="' + L[L.length - 1] + '"]');
  verifie((await touche('ArrowRight')) === L[L.length - 1], 'flèche droite sur la dernière case : on reste');

  // 2. Le curseur dans le texte : la flèche le déplace d'abord, puis change de case une fois au bord
  const iLv = L.indexOf('bette|q/lv');
  await C.click('#semGrid input[data-cell="bette|q/lv"]');
  await C.keyboard.press('End');
  verifie((await touche('ArrowLeft')) === 'bette|q/lv' && (await C.evaluate(() => document.activeElement.selectionStart)) === 1, 'dans « 12 », curseur à la fin : flèche gauche = curseur entre 1 et 2, même case');
  verifie((await touche('ArrowLeft')) === 'bette|q/lv', 'flèche gauche : curseur au début, même case');
  verifie((await touche('ArrowLeft')) === L[iLv - 1], 'flèche gauche au début du texte : case d\'avant (' + L[iLv - 1] + ')');
  await C.focus('#semGrid input[data-cell="bette|q/lv"]');
  await C.keyboard.press('End');
  verifie((await touche('Shift+ArrowLeft')) === 'bette|q/lv', 'Maj + flèche : sélection du texte, on reste dans la case');

  // 3. Taper un nombre puis flèche droite : la saisie est enregistrée et on passe à la case d'à côté
  const iMar = L.indexOf('bette|q/ta-mar');
  await C.click('#semGrid input[data-cell="bette|q/ta-mar"]');
  await C.keyboard.type('2');
  verifie((await touche('ArrowRight')) === L[iMar + 1], 'taper 2 puis flèche droite : case suivante (' + L[iMar + 1] + ')');
  await attendre(500);
  const ecrit = base.lire('listes/semaines/' + SEM + '/q/bette/ta-mar');
  verifie(ecrit && ecrit.n === 2 && ecrit.u === 'colis', 'le 2 est enregistré en colis pour Très Allier mardi (' + JSON.stringify(ecrit && { n: ecrit.n, u: ecrit.u }) + ')');
  verifie((await actif()) === L[iMar + 1], 'après l\'enregistrement, le curseur reste dans la nouvelle case');

  // 4. Haut et bas : même colonne
  await C.click('#semGrid input[data-cell="bette|q/lv"]');
  verifie((await touche('ArrowDown')) === 'chou|q/lv', 'flèche bas : même colonne, ligne du chou');
  verifie((await touche('ArrowUp')) === 'bette|q/lv', 'flèche haut : retour à la bette');

  // 5. Colonnes masquées par le filtre : sautées
  await C.click('#semFiltre input[data-j="lundi"]');
  await attendre(500);
  const L2 = await ligne('bette');
  verifie(!L2.includes('bette|q/ta-mar') && !L2.includes('bette|q/lm'), 'lundi décoché : Très Allier mardi et La Magic ne sont plus dans la grille');
  const avant = L.slice(0, iMar).filter((c) => L2.includes(c)).pop();
  await C.click('#semGrid input[data-cell="' + avant + '"]');
  const apres = await touche('ArrowRight');
  verifie(apres === L2[L2.indexOf(avant) + 1] && apres !== 'bette|q/ta-mar' && apres !== 'bette|q/lm', 'flèche droite depuis ' + avant + ' : on saute les colonnes masquées (' + apres + ')');
  await C.click('#semFiltre input[data-j="lundi"]');
  await attendre(500);

  // 6. Le menu d'unité garde ses propres flèches
  await C.focus('#semGrid select[data-cell="bette|dispo"]');
  const m = await touche('ArrowRight');
  await attendre(500);
  const dsp = base.lire('listes/semaines/' + SEM + '/dispo/bette');
  verifie(dsp.u === 'kg' && dsp.n === 50, 'la flèche change l\'unité dans le menu : 10 colis deviennent ' + dsp.n + ' ' + dsp.u);
  verifie((await actif()) === 'bette|dispo (menu)', 'après le changement d\'unité, le curseur reste dans le menu');
  verifie(m === 'bette|dispo (menu)', 'dans le menu d\'unité, les flèches ne font pas changer de case (' + m + ')');

  verifie(erreurs.length === 0, 'aucune erreur JavaScript' + (erreurs.length ? ' : ' + erreurs.join(' | ') : ''));
  await nav.close(); site.close(); base.close();
  process.exit(echecs ? 1 : 0);
})();
