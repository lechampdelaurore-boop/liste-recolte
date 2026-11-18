// Charte douce (étape 42, 18/11/2026, six choix de François) : page gris très clair, blocs blancs, bordures fines, trois
// polices hébergées dans le dépôt (et gardées hors ligne), texte courant 13 px mais noms de produits, quantités et boutons
// d'au moins 16 px, barre du haut anthracite et barre du bas à 4 pages sur le téléphone, menu à gauche sur l'ordinateur,
// icônes au trait de 1,7 px à la place des emojis ✓ et 👤, jamais de bleu sur un bouton. Style seulement.
// Lancement depuis la racine du dépôt : node tests/charte.cjs   (CAPTURES=dossier pour garder les captures)
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');
const fauxFirebase = require('./faux-firebase.cjs');

const RACINE = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' };
const PORT_SITE = 8950, PORT_BASE = 8951;
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

(async () => {
  const site = await serveurSite();
  const base = await fauxFirebase(PORT_BASE);
  const W = iso(lundi(0));
  const A0 = 1793730000000;
  await fetch(`${BASE}/listes/semaines/${W}.json`, { method: 'PUT', body: JSON.stringify({
    produits: { bette: { nom: 'Bette', caisse: 'GH', unite: '5 kg', kg: 5, by: 'Aurore', at: A0 } },
    dispo: { bette: { n: 2, u: 'colis', by: 'Aurore', at: A0 } },
    q: { bette: { mk: { n: 1, u: 'colis', by: 'Aurore', at: A0 } } },
  }) });

  // Fichiers : polices et licence dans le dépôt, gardées hors ligne, mêmes polices sur la page du magasin.
  const POLICES = ['bricolage-grotesque', 'dm-sans', 'open-sans'];
  verifie(POLICES.every((p) => fs.existsSync(path.join(RACINE, 'polices', p + '.woff2'))) && fs.readFileSync(path.join(RACINE, 'polices', 'OFL.txt'), 'utf8').includes('SIL Open Font License'), 'les trois polices et leur licence OFL sont dans le dépôt (polices/)');
  const sw = fs.readFileSync(path.join(RACINE, 'sw.js'), 'utf8');
  verifie(POLICES.every((p) => sw.includes(`'./polices/${p}.woff2'`)), 'sw.js garde les trois polices pour le hors ligne');
  const idx = fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8'), mag = fs.readFileSync(path.join(RACINE, 'magasin.html'), 'utf8');
  const faces = (s) => (s.match(/@font-face\{[^}]*\}/g) || []).join('\n');
  verifie(faces(idx).length > 0 && faces(idx) === faces(mag), 'mêmes polices déclarées dans index.html et magasin.html');
  verifie(!/fonts\.googleapis|fonts\.gstatic/.test(idx + mag), 'aucune police chargée depuis un autre site');
  verifie(!/[✓👤]/u.test(idx.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '')) && !/[✓👤]/u.test(mag.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '')), 'plus d\'emoji ✓ ni 👤 dans le code des pages');

  const nav = await chromium.launch();
  const erreurs = [];
  const appareil = async (opts, qui) => {
    const ctx = await nav.newContext({ ...opts, serviceWorkers: 'block' });
    await ctx.addInitScript((a) => {
      localStorage.setItem('recolte.qui', JSON.stringify(a.qui));
      localStorage.setItem('recolte.ui', JSON.stringify({ semaineLe: ((d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'))(new Date()), semaine: a.w }));
    }, { w: W, qui });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => erreurs.push(qui + ' : ' + e.message));
    await p.goto(`http://localhost:${PORT_SITE}/`);
    await p.waitForFunction(() => document.fonts.status === 'loaded');
    return p;
  };
  const cap = async (p, nom) => { if (CAPTURES) await p.screenshot({ path: path.join(CAPTURES, nom + '.png') }); };
  const style = (p, sel, props) => p.$eval(sel, (e, l) => { const s = getComputedStyle(e); const o = {}; l.forEach((k) => (o[k] = s[k])); return o; }, props);

  // ---------- Téléphone ----------
  const T = await appareil(devices['Pixel 7'], 'François');
  const polOk = await T.evaluate(() => ['300 20px "Bricolage Grotesque"', '500 16px "DM Sans"', '400 13px "Open Sans"'].map((f) => document.fonts.check(f)));
  const charg = await T.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/"/g, '')).sort().join(','));
  verifie(charg.includes('DM Sans') && charg.includes('Open Sans') && polOk.every(Boolean), 'les polices DM Sans et Open Sans sont chargées depuis le site (' + charg + ')');
  const corps = await style(T, 'body', ['backgroundColor', 'fontSize', 'fontFamily', 'color']);
  verifie(corps.backgroundColor === 'rgb(248, 248, 248)' && corps.fontSize === '13px' && corps.fontFamily.startsWith('"Open Sans"') && corps.color === 'rgb(17, 17, 17)', 'page gris très clair, texte courant 13 px en Open Sans, texte très foncé (' + JSON.stringify(corps) + ')');
  const haut = await style(T, '.appbar', ['backgroundColor']);
  verifie(haut.backgroundColor === 'rgb(55, 55, 55)', 'téléphone : barre du haut anthracite');
  const who = await T.$eval('#who', (b) => ({ t: b.textContent.trim(), svg: !!b.querySelector('svg.ico'), sw: b.querySelector('svg') && getComputedStyle(b.querySelector('svg')).strokeWidth }));
  verifie(who.t === 'François' && who.svg && who.sw === '1.7px', 'nom de la personne avec une icône au trait de 1,7 px, sans emoji (' + JSON.stringify(who) + ')');
  const barre = await T.evaluate(() => { const n = document.querySelector('#tabs').getBoundingClientRect(); const b = [...document.querySelectorAll('#tabs button')].filter((x) => !x.hidden); return { bas: n.bottom === innerHeight, n: b.length, noms: b.map((x) => x.querySelector('span').textContent.trim()).join(','), sw: getComputedStyle(b[0].querySelector('svg')).strokeWidth }; });
  verifie(barre.bas && barre.n === 4 && barre.noms === 'Semaine,Récolte,Préparation,Réglages' && barre.sw === '1.7px', 'téléphone : barre du bas avec les 4 pages, icônes au trait de 1,7 px (' + JSON.stringify(barre) + ')');
  await T.click('#tabs [data-view="semaine"]');
  await T.waitForSelector('#semView:not([hidden])');
  const choisi = await style(T, '#tabs [data-view="semaine"]', ['backgroundColor', 'color']);
  verifie(choisi.backgroundColor === 'rgb(11, 105, 77)' && choisi.color === 'rgb(255, 255, 255)', 'page courante en pastille verte');
  const h1 = await style(T, 'h1', ['fontFamily', 'fontWeight']);
  verifie(h1.fontFamily.startsWith('"Bricolage Grotesque"') && h1.fontWeight === '300', 'titre de page en Bricolage Grotesque fin (300)');
  await T.click('section.sp[data-pid="bette"] .sp-head');
  await T.waitForSelector('section.sp[data-pid="bette"] .sr[data-k="q/mk"] .sr-ctl input');
  const tailles = await T.evaluate(() => {
    const t = (s) => { const e = document.querySelector(s); return e ? parseFloat(getComputedStyle(e).fontSize) : 0; };
    const boutons = [...document.querySelectorAll('main button, #tabs button')].filter((b) => b.offsetParent && !b.closest('#tabs')).map((b) => parseFloat(getComputedStyle(b).fontSize));
    return { nom: t('section.sp[data-pid="bette"] .sp-nom'), qte: t('section.sp[data-pid="bette"] .sr[data-k="q/mk"] .sr-ctl input'), bmin: Math.min(...boutons) };
  });
  verifie(tailles.nom >= 16 && tailles.qte >= 16 && tailles.bmin >= 16, 'téléphone : nom du produit, quantité et boutons d\'au moins 16 px (' + JSON.stringify(tailles) + ')');
  const ajout = await style(T, '.sem-add', ['backgroundColor', 'color']);
  verifie(ajout.backgroundColor === 'rgb(11, 105, 77)' && ajout.color === 'rgb(255, 255, 255)', 'téléphone : bouton d\'action vert plein');
  const fonds = await T.evaluate(() => [...document.querySelectorAll('button')].filter((b) => b.offsetParent).map((b) => getComputedStyle(b).backgroundColor));
  verifie(!fonds.some((c) => ['rgb(10, 61, 145)', 'rgb(37, 78, 143)', 'rgb(31, 111, 178)', 'rgb(11, 61, 145)'].includes(c)), 'aucun bouton bleu');
  const carte = await style(T, 'section.sp[data-pid="bette"]', ['borderTopColor', 'borderTopWidth', 'backgroundColor']);
  verifie(carte.borderTopColor === 'rgb(221, 221, 221)' && carte.borderTopWidth === '1px' && carte.backgroundColor === 'rgb(255, 255, 255)', 'bloc blanc à bordure fine grise (' + JSON.stringify(carte) + ')');
  await cap(T, '1-telephone-semaine');
  await T.context().close();

  // ---------- Ordinateur ----------
  const P = await appareil({ viewport: { width: 1366, height: 800 }, deviceScaleFactor: CAPTURES ? 2 : 1 }, 'Aurore');
  const menu = await P.evaluate(() => { const n = document.querySelector('#tabs'), r = n.getBoundingClientRect(), m = document.querySelector('main').getBoundingClientRect(); return { g: r.left, l: r.width, h: r.height, fond: getComputedStyle(n).backgroundColor, main: m.left, choisi: getComputedStyle(document.querySelector('#tabs [aria-pressed="true"]')).backgroundColor, haut: getComputedStyle(document.querySelector('.appbar')).backgroundColor }; });
  verifie(menu.g === 0 && menu.l > 150 && menu.l < 260 && menu.h > 500 && menu.fond === 'rgb(231, 241, 238)' && menu.main >= menu.l && menu.choisi === 'rgb(11, 105, 77)' && menu.haut === 'rgb(231, 241, 238)', 'ordinateur : menu à gauche vert très pâle, entrée choisie en vert plein, contenu à droite (' + JSON.stringify(menu) + ')');
  await P.click('#tabs [data-view="semaine"]');
  await P.waitForSelector('#semGrid tbody tr[data-pid="bette"]');
  const ong = await P.evaluate(() => { const s = document.querySelector('#semSub'), r = s.getBoundingClientRect(), g = document.querySelector('#semGrid').getBoundingClientRect(); return { avant: r.bottom <= g.top, pastille: getComputedStyle(s.querySelector('[aria-pressed="true"]')).backgroundColor }; });
  verifie(ong.avant && ong.pastille === 'rgb(11, 105, 77)', 'ordinateur : pages de la semaine en onglets au-dessus de la grille');
  const col = await P.evaluate(() => { scrollTo(2000, 0); return document.querySelector('#semGrid tbody td.g-prod').getBoundingClientRect().left >= document.querySelector('#tabs').getBoundingClientRect().right - 1; });
  verifie(col, 'ordinateur : la colonne des produits ne passe pas sous le menu');
  await P.evaluate(() => scrollTo(0, 0));
  await cap(P, '2-ordinateur-semaine');
  await P.context().close();

  verifie(erreurs.length === 0, 'aucune erreur JavaScript' + (erreurs.length ? ' : ' + erreurs.join(' | ') : ''));
  await nav.close(); site.close(); base.close();
  console.log(echecs ? `\n${echecs} échec(s)` : '\nTout est bon.');
  process.exit(echecs ? 1 : 0);
})().catch((x) => { console.error(x); process.exit(1); });
