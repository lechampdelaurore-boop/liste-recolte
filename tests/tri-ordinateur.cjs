// Test du tri de l'onglet Récolte sur ordinateur (demande de François du 9/11) : lignes compactes d'environ 48 px,
// poignée à gauche qui glisse tout de suite (sans appui long), boutons « tout en haut, monter, descendre, tout en bas »
// sur la ligne survolée. Le téléphone ne change pas (lignes, appui long, pas de poignée ni de boutons).
// Données factices : la liste en fichier du 4/11 et un faux Firebase, rien n'est écrit dans la vraie base.
// Lancement depuis la racine du dépôt : node tests/tri-ordinateur.cjs
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');
const fauxFirebase = require('./faux-firebase.cjs');

const RACINE = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const PORT_SITE = 8820, PORT_BASE = 8821;
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
    return { p, ctx };
  };
  const ORDI = { viewport: { width: 1366, height: 768 }, deviceScaleFactor: CAPTURES ? 2 : 1 };
  const { p: P } = await ouvrir('Martin', ORDI);
  const { p: Q } = await ouvrir('François', ORDI);
  const attendre = (ms) => P.waitForTimeout(ms || 300);
  const ordre = (p) => p.$$eval('#todo li.item', (e) => e.map((x) => x.dataset.id));
  const ordreBase = () => base.lire('listes/2026-11-04/order') || [];
  const ligne = (id) => `#todo li.item[data-id="${id}"]`;
  const vu = (p, sel) => p.$eval(sel, (e) => { const s = getComputedStyle(e); return s.display !== 'none' && s.visibility !== 'hidden'; });

  // 1. Lignes compactes, poignée et texte d'aide sur l'ordinateur
  const hauteurs = await P.$$eval('#todo li.item', (e) => e.map((x) => Math.round(x.getBoundingClientRect().height)));
  const maxH = Math.max(...hauteurs);
  verifie(hauteurs.length === 22 && maxH <= 52, 'ordinateur : 22 lignes compactes, la plus haute fait ' + maxH + ' px (au plus 52) ; hauteurs : ' + hauteurs.join(' '));
  const dansEcran = await P.$$eval('#todo li.item', (e) => e.filter((x) => x.getBoundingClientRect().bottom <= innerHeight).length);
  verifie(true, 'ordinateur 1366 × 768 : ' + dansEcran + ' lignes entières à l\'écran sans défiler (pour information)');
  const ordre0 = await ordre(P);
  const premier = ordre0[0], dernier = ordre0[ordre0.length - 1];
  verifie(await vu(P, ligne(premier) + ' .poignee'), 'la poignée est visible à gauche de chaque ligne');
  const poigneeGauche = await P.$eval(ligne(premier), (li) => li.querySelector('.poignee').getBoundingClientRect().right <= li.querySelector('.box').getBoundingClientRect().left);
  verifie(poigneeGauche, 'la poignée est à gauche de la case à cocher');
  verifie((await P.$$('#done li.item .poignee')).length === 0, 'pas de poignée dans les récoltes déjà effectuées');
  verifie((await P.textContent('#dragHint')).length > 0 && await vu(P, '#dragHint .pc') && !(await vu(P, '#dragHint .tel')), 'texte d\'aide de l\'ordinateur (poignée et boutons), pas celui de l\'appui long');

  // 2. Boutons au survol seulement, désactivés aux bouts
  await P.mouse.move(1300, 5);
  verifie(!(await vu(P, ligne(premier) + ' .bouger')), 'sans survol, les boutons de tri ne se voient pas');
  await P.hover(ligne(premier) + ' .prod');
  verifie(await vu(P, ligne(premier) + ' .bouger'), 'au survol d\'une ligne, ses quatre boutons apparaissent');
  verifie(!(await vu(P, ligne(ordre0[1]) + ' .bouger')), 'les boutons des autres lignes restent cachés');
  const off = await P.$$eval(ligne(premier) + ' .bouger button', (e) => e.map((b) => b.dataset.a + (b.disabled ? ':non' : ':oui')).join(' '));
  verifie(off === 'haut:non monter:non descendre:oui bas:oui', 'première ligne : tout en haut et monter désactivés (' + off + ')');
  const offB = await P.$$eval(ligne(dernier) + ' .bouger button', (e) => e.map((b) => b.dataset.a + (b.disabled ? ':non' : ':oui')).join(' '));
  verifie(offB === 'haut:oui monter:oui descendre:non bas:non', 'dernière ligne : descendre et tout en bas désactivés (' + offB + ')');
  const lab = await P.$eval(ligne(premier) + ' .bouger [data-a="bas"]', (b) => b.getAttribute('aria-label') + ' / ' + b.title);
  verifie(/tout en bas/.test(lab), 'chaque bouton porte son nom en clair au survol (' + lab + ')');

  // 3. Tout en bas, tout en haut
  await P.click(ligne(premier) + ' .bouger [data-a="bas"]');
  await attendre(500);
  let o = await ordre(P);
  verifie(o[o.length - 1] === premier && o[0] === ordre0[1], '« Tout en bas » : ' + premier + ' passe en dernier');
  verifie(ordreBase()[ordreBase().length - 1] === premier, 'le nouvel ordre est enregistré (faux Firebase)');
  await Q.waitForTimeout(300);
  verifie((await ordre(Q)).join() === o.join(), 'le même ordre arrive sur l\'autre ordinateur');
  const ap = o[o.length - 2];
  await P.hover(ligne(ap) + ' .prod');
  await P.click(ligne(ap) + ' .bouger [data-a="haut"]');
  await attendre(400);
  o = await ordre(P);
  verifie(o[0] === ap, '« Tout en haut » : ' + ap + ' passe en premier');

  // 4. Monter et descendre d'un cran : la ligne reste sous la souris
  const cible = o[4];
  await P.hover(ligne(cible) + ' .prod');
  const btD = await (await P.$(ligne(cible) + ' .bouger [data-a="descendre"]')).boundingBox();
  const sx = btD.x + btD.width / 2, sy = btD.y + btD.height / 2;
  await P.mouse.move(sx, sy);
  for (let i = 0; i < 3; i++) { await P.mouse.down(); await P.mouse.up(); await attendre(250); }
  o = await ordre(P);
  verifie(o[7] === cible, '« Descendre » trois fois de suite sans bouger la souris : ' + cible + ' passe de la 5e à la 8e place');
  const sous = await P.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); const li = e && e.closest('li.item'); return li ? li.dataset.id : ''; }, [sx, sy]);
  verifie(sous === cible, 'la ligne déplacée est restée sous la souris (sous la souris : ' + sous + ')');
  const btM = await (await P.$(ligne(cible) + ' .bouger [data-a="monter"]')).boundingBox();
  await P.mouse.move(btM.x + btM.width / 2, btM.y + btM.height / 2);
  await P.mouse.down(); await P.mouse.up(); await attendre(300);
  o = await ordre(P);
  verifie(o[6] === cible, '« Monter » : ' + cible + ' remonte d\'un cran (7e place)');
  verifie(ordreBase().join() === o.join(), 'l\'ordre enregistré suit chaque bouton');

  // 5. La poignée glisse tout de suite, sans appui long
  await P.evaluate(() => scrollTo(0, 0));
  await attendre(200);
  o = await ordre(P);
  const g = o[0];
  const poi = await (await P.$(ligne(g) + ' .poignee')).boundingBox();
  const dest = await (await P.$(ligne(o[3]))).boundingBox();
  await P.mouse.move(poi.x + poi.width / 2, poi.y + poi.height / 2);
  await P.mouse.down();
  await P.mouse.move(poi.x + poi.width / 2, dest.y + dest.height * 0.75, { steps: 6 });
  verifie((await P.$$('#todo li.item.dragging')).length === 1, 'la ligne se décolle dès qu\'on tire la poignée (aucune attente)');
  await P.mouse.up();
  await attendre(400);
  o = await ordre(P);
  verifie(o[3] === g, 'glissée par la poignée, ' + g + ' arrive à la 4e place');
  verifie(ordreBase().join() === o.join(), 'l\'ordre glissé est enregistré');

  // 6. Glisser vite sur le nom (sans poignée ni appui long) ne déplace rien
  const avant = await ordre(P);
  const nom = await (await P.$(ligne(avant[0]) + ' .prod')).boundingBox();
  await P.mouse.move(nom.x + 10, nom.y + nom.height / 2);
  await P.mouse.down();
  await P.mouse.move(nom.x + 10, nom.y + 200, { steps: 4 });
  await P.mouse.up();
  await attendre(300);
  verifie((await ordre(P)).join() === avant.join(), 'tirer le nom sans attendre ne déplace pas la ligne');

  // 7. Avec un filtre de circuit : monter passe au-dessus de la voisine affichée ; tout en haut reste en haut sans filtre
  await P.click('#circs .chip[data-c="ta"]');
  await attendre(300);
  const f = await ordre(P);
  const fx = f[f.length - 1];
  await P.hover(ligne(fx) + ' .prod');
  await P.click(ligne(fx) + ' .bouger [data-a="monter"]');
  await attendre(300);
  const f2 = await ordre(P);
  verifie(f2[f2.length - 2] === fx && f2[f2.length - 1] === f[f.length - 2], 'filtre Très Allier : « Monter » passe au-dessus de la ligne affichée juste avant');
  await P.hover(ligne(fx) + ' .prod');
  await P.click(ligne(fx) + ' .bouger [data-a="haut"]');
  await attendre(300);
  verifie((await ordre(P))[0] === fx, 'filtre Très Allier : « Tout en haut »');
  await P.click('#circs .chip[data-c=""]');
  await attendre(300);
  verifie((await ordre(P))[0] === fx, 'sans filtre, ' + fx + ' est tout en haut de toute la liste');

  // 8. Au clavier : la touche Tab fait apparaître les boutons de la ligne
  await P.mouse.move(1300, 5);
  await P.focus(ligne(fx) + ' .box');
  await P.keyboard.press('Tab');
  const foc = await P.evaluate(() => { const a = document.activeElement; return a && a.closest('.bouger') ? a.dataset.a : a.className; });
  verifie(foc === 'descendre' && await vu(P, ligne(fx) + ' .bouger'), 'au clavier, Tab depuis la case mène aux boutons, qui se montrent (' + foc + ')');

  if (CAPTURES) {
    await P.evaluate(() => document.activeElement && document.activeElement.blur());
    await P.click(ligne('bette') + ' .more');
    await P.click(ligne('mesclun') + ' .box');
    await P.click('#doneSec summary');
    await attendre(300);
    await P.evaluate(() => scrollTo(0, document.querySelector('#dragHint').getBoundingClientRect().top + scrollY - 140));
    const l3 = (await ordre(P))[2];
    await P.hover(ligne(l3) + ' .prod');
    await attendre(200);
    await P.screenshot({ path: path.join(CAPTURES, '1-ordinateur-survol.png') });
  }

  // 9. Le téléphone ne change pas, ni une fenêtre étroite sur l'ordinateur
  const { p: T } = await ouvrir('Aurore', devices['Pixel 7']);
  const hT = await T.$$eval('#todo li.item', (e) => Math.min(...e.map((x) => x.getBoundingClientRect().height)));
  verifie(hT >= 80, 'téléphone : lignes inchangées, la plus basse fait ' + Math.round(hT) + ' px');
  verifie((await T.$$eval('#todo li.item .poignee, #todo li.item .bouger', (e) => e.filter((x) => getComputedStyle(x).display !== 'none').length)) === 0, 'téléphone : ni poignée ni boutons de tri');
  verifie(await vu(T, '#dragHint .tel') && !(await vu(T, '#dragHint .pc')), 'téléphone : le texte reste « Appui long sur une ligne pour la déplacer. »');
  const colonnes = await T.$eval('#todo li.item', (li) => getComputedStyle(li).gridTemplateColumns.split(' ').length);
  verifie(colonnes === 3, 'téléphone : toujours trois colonnes par ligne (case, nom, quantité)');
  if (CAPTURES) await T.screenshot({ path: path.join(CAPTURES, '2-telephone-inchange.png') });
  const { p: E } = await ouvrir('Martin', { viewport: { width: 900, height: 768 } });
  verifie(!(await vu(E, '#todo li.item .poignee')) && await vu(E, '#dragHint .tel'), 'ordinateur en fenêtre étroite (900 px) : affichage du téléphone, comme pour l\'onglet Semaine');

  verifie(erreurs.length === 0, 'aucune erreur JavaScript' + (erreurs.length ? ' : ' + erreurs.join(' | ') : ''));
  await nav.close(); site.close(); base.close();
  console.log(echecs ? echecs + ' échec(s).' : 'Tout est bon.');
  process.exit(echecs ? 1 : 0);
})();
