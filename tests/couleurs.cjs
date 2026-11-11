// Test de la couleur des débouchés (demande de François du 8/11) : choix dans Réglages > Débouchés, couleur par
// défaut pour chaque débouché (y compris une fiche gardée dans la base avant les couleurs), et dans la page
// « Répartir » (grille de l'ordinateur, fiches du téléphone, page Cumul) titre, menu d'unité et chiffres de chaque
// débouché dans sa couleur. Un téléphone (François) et un ordinateur (Martin) via un faux Firebase.
// Lancement depuis la racine du dépôt : node tests/couleurs.cjs
// Captures d'écran (facultatif) : CAPTURES=dossier node tests/couleurs.cjs
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');
const fauxFirebase = require('./faux-firebase.cjs');

const RACINE = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const PORT_SITE = 8806, PORT_BASE = 8807;
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


// Contraste d'une couleur avec le fond blanc (formule WCAG).
const contraste = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.substr(i, 2), 16) / 255).map((v) => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 1.05 / (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] + 0.05);
};
const rgb = (hex) => 'rgb(' + [1, 3, 5].map((i) => parseInt(hex.substr(i, 2), 16)).join(', ') + ')';
const BLEU = '#0b3d91', FRAMBOISE = '#a0105c', VERT = '#0a5a1c', VIOLET = '#5e1a91', OLIVE = '#4a5700';

(async () => {
  const site = await serveurSite();
  const base = await fauxFirebase(PORT_BASE);
  const SEM = iso(lundi(0));
  const depart = JSON.parse(fs.readFileSync(path.join(RACINE, 'referentiel/debouches.json'), 'utf8'));
  // Fiche déjà gardée dans la base AVANT les couleurs (sans aucune couleur), avec un débouché en plus
  // (Ferme Deschamps), absent du fichier de départ : il doit prendre la première couleur libre.
  const ancienne = JSON.parse(JSON.stringify(depart));
  ancienne.debouches.forEach((d) => delete d.couleur);
  ancienne.debouches.push({ id: 'fd', nom: 'Ferme Deschamps', colis: 'bois', livraisons: [{ id: 'fd', jours: ['mercredi'], court: 'Deschamps' }] });
  const fiche0 = { debouches: ancienne.debouches, recoltes: ancienne.recoltes, by: 'Aurore', at: 1793730000000 };
  const bette = { nom: 'Bette', caisse: 'GH', unite: '5 kg', kg: 5 };
  const put = (p, v) => fetch(`${BASE}/${p}.json`, { method: 'PUT', body: JSON.stringify(v) });
  await put('listes/reglages/debouches', fiche0);
  await put('listes/semaines/' + SEM, {
    produits: { bette }, dispo: { bette: { n: 10, u: 'colis', by: 'Aurore', at: 1793730000000 } },
    q: { bette: { lv: { n: 2, u: 'colis', by: 'Aurore', at: 1793730000000 }, 'ta-mar': { n: 3, u: 'kg', by: 'Aurore', at: 1793730000000 }, av03: { n: 1, u: 'colis', by: 'Aurore', at: 1793730000000 } } },
    propose: { bette: { av63: { v: true, by: 'Aurore', at: 1793730000000 } } },
  });

  const nav = await chromium.launch();
  const erreurs = [];
  const ouvrir = async (nom, opts) => {
    const ctx = await nav.newContext({ ...opts, serviceWorkers: 'block' });
    await ctx.addInitScript((n) => localStorage.setItem('recolte.qui', JSON.stringify(n)), nom);
    const p = await ctx.newPage();
    p.on('pageerror', (e) => erreurs.push(nom + ' : ' + e.message));
    p.on('dialog', (d) => d.accept());
    await p.goto(`http://localhost:${PORT_SITE}/`);
    return p;
  };
  const A = await ouvrir('François', devices['Pixel 7']);
  const C = await ouvrir('Martin', { viewport: { width: 1366, height: 768 }, deviceScaleFactor: CAPTURES ? 2 : 1 });
  const capture = async (p, nom) => { if (CAPTURES) await p.screenshot({ path: path.join(CAPTURES, nom + '.png'), fullPage: true }); };
  const attendre = (p, ms) => p.waitForTimeout(ms || 600);
  const fiche = (d) => `#debView section.db[data-d="${d}"]`;
  // Fiches repliées par défaut (demande de François du 10/11) : les déplier pour voir les couleurs.
  const deplier = async (p) => { const sel = '#debView .db-tete[aria-expanded="false"]'; while (await p.$(sel)) await p.click(sel); };
  const coche = (p, d) => p.$eval(`${fiche(d)} input[data-f="couleur"]:checked`, (e) => e.value).catch(() => null);
  const debDe = (id) => (base.lire('listes/reglages/debouches').debouches || []).filter((d) => d.id === id)[0];

  // 1. La palette
  await A.click('[data-view="reglages"]');
  await A.waitForSelector('#debView section.db');
  await deplier(A);
  const palette = await A.$$eval(`${fiche('ta')} label.dc-c`, (e) => e.map((x) => [x.querySelector('input').value, x.textContent.trim()]));
  verifie(palette.length >= 8 && palette.every((x) => contraste(x[0]) >= 7), 'palette de ' + palette.length + ' couleurs, toutes au moins 7 fois plus contrastées que le fond blanc (plus faible : ' + Math.min(...palette.map((x) => contraste(x[0]))).toFixed(1) + ')');
  verifie(palette.every((x) => x[0] !== '#ffffff') && new Set(palette.map((x) => x[0])).size === palette.length, 'pas de blanc, pas de doublon');
  verifie(depart.debouches.every((d) => palette.some((x) => x[0] === d.couleur)) && new Set(depart.debouches.map((d) => d.couleur)).size === depart.debouches.length, 'fichier de départ : une couleur différente, de la palette, pour chacun des ' + depart.debouches.length + ' débouchés');

  // 2. Réglages : chaque débouché a sa couleur ; une fiche gardée avant les couleurs prend celles du départ
  const n = await A.$$eval(`${fiche('ta')} input[data-f="couleur"]`, (e) => e.length);
  verifie(n === palette.length, 'chaque débouché a ' + palette.length + ' pastilles de couleur à toucher');
  const h = await A.$eval(`${fiche('ta')} label.dc-c`, (e) => e.getBoundingClientRect().height);
  verifie(h >= 44, 'pastille assez grande pour le doigt (' + Math.round(h) + ' px de haut)');
  verifie((await coche(A, 'ta')) === BLEU && (await coche(A, 'lm')) === FRAMBOISE && (await coche(A, 'lv')) === VERT && (await coche(A, 'av')) === VIOLET, 'fiche gardée sans couleur : Très Allier bleu, La Magic framboise, Locavore vert, Auvabio violet (couleurs du départ)');
  verifie((await coche(A, 'fd')) === OLIVE, 'débouché absent du départ (Ferme Deschamps) : première couleur libre, olive');
  verifie(base.lire('listes/reglages/debouches').by === 'Aurore' && !debDe('ta').couleur, 'rien n\'est écrit dans la base tant qu\'on ne choisit pas');
  const bord = await A.$eval(fiche('ta'), (e) => getComputedStyle(e).borderLeftColor);
  verifie(bord === rgb(BLEU), 'la fiche de Très Allier a un bord gauche bleu (obtenu ' + bord + ')');
  await capture(A, '1-reglages-couleurs');

  // 3. Grille de l'ordinateur : titre, menu d'unité et chiffres dans la couleur du débouché
  await C.click('[data-view="semaine"]');
  await C.waitForSelector('#semGrid tbody tr');
  const col = (sel, prop) => C.$eval(sel, (e, p) => getComputedStyle(e)[p], prop || 'color');
  const thDe = async (txt) => C.$$eval('#semGrid thead th', (e, t) => { const x = e.filter((y) => y.textContent.startsWith(t))[0]; return x ? getComputedStyle(x).color : null; }, txt);
  verifie((await thDe('Très Allier')) === rgb(BLEU) && (await thDe('Locavore')) === rgb(VERT) && (await thDe('Panier La Magic')) === rgb(FRAMBOISE), 'grille : titres Très Allier en bleu, Locavore en vert, La Magic en framboise');
  verifie((await thDe('Stock Très Allier')) === rgb(BLEU) && (await thDe('Reste Auvabio 03')) === rgb(VIOLET) && (await thDe('Auvabio 63')) === rgb(VIOLET), 'grille : stock Très Allier en bleu ; Auvabio 63 et le reste proposé 03 → 63 en violet');
  const cell = (k) => `#semGrid tr[data-pid="bette"] input.g-in[data-k="${k}"]`, unite = (k) => `#semGrid tr[data-pid="bette"] select.g-u[data-k="${k}"]`;
  verifie((await C.inputValue(cell('q/lv'))) === '2' && (await col(cell('q/lv'))) === rgb(VERT) && (await col(unite('q/lv'))) === rgb(VERT), 'grille : le chiffre (2) et l\'unité de Locavore sont en vert');
  verifie((await C.inputValue(cell('q/ta-mar'))) === '3' && (await col(cell('q/ta-mar'))) === rgb(BLEU) && (await col(unite('q/ta-mar'))) === rgb(BLEU) && (await C.inputValue(unite('q/ta-mar'))) === 'kg', 'grille : 3 kg pour Très Allier mardi, chiffre et unité en bleu');
  verifie((await col(cell('dispo'))) === 'rgb(0, 0, 0)' && (await col('#semGrid tr[data-pid="bette"] td.g-reste')) !== rgb(VERT), 'disponible et reste gardent leurs couleurs');
  await capture(C, '2-grille-couleurs');

  // 4. Changer une couleur (téléphone) : la base la garde, l'ordinateur suit
  await A.click(`${fiche('lv')} label.dc-c:has(input[value="${VIOLET}"])`);
  await attendre(A);
  verifie(debDe('lv').couleur === VIOLET && base.lire('listes/reglages/debouches').by === 'François', 'Locavore passé en violet : la base garde la couleur, avec le prénom');
  verifie((await coche(A, 'lv')) === VIOLET && (await A.$eval(`${fiche('lv')} [data-f="nom"]`, (e) => getComputedStyle(e).color)) === rgb(VIOLET), 'la fiche Locavore montre le violet coché, son nom en violet');
  verifie(debDe('ta').couleur === BLEU && debDe('av').couleur === VIOLET && debDe('fd').couleur === OLIVE && (await coche(A, 'fd')) === OLIVE, 'les autres gardent la couleur qu\'ils avaient, écrite dans la base (Ferme Deschamps reste olive)');
  await attendre(C, 800);
  verifie((await thDe('Locavore')) === rgb(VIOLET) && (await col(cell('q/lv'))) === rgb(VIOLET), 'sur l\'ordinateur, la colonne Locavore passe en violet, sans recharger');

  // 5. Nouveau débouché : une couleur libre
  await A.fill('#debNom', 'Biocoop');
  await A.click('#debView .db-new input[data-j="samedi"]');
  await A.click('[data-a="nouveau"]');
  await attendre(A);
  const bio = debDe('biocoop'), prises = ['ta', 'lm', 'ps', 'lv', 'av', 'mk', 'el', 'fd'].map((x) => debDe(x).couleur);
  verifie(bio && palette.some((x) => x[0] === bio.couleur) && prises.indexOf(bio.couleur) < 0, 'nouveau débouché : une couleur de la palette pas encore prise (' + (bio && bio.couleur) + ')');

  // 6. Téléphone, page Répartir : la ligne de chaque livraison dans sa couleur
  await A.click('[data-view="semaine"]');
  await A.waitForSelector('#semView section.sp');
  await A.click('#semView section.sp[data-pid="bette"] .sp-head');
  await A.waitForSelector('#semView .sr[data-k="q/lv"]');
  const sr = (k, s) => A.$eval(`#semView section.sp[data-pid="bette"] .sr[data-k="${k}"] ${s}`, (e) => getComputedStyle(e).color);
  verifie((await sr('q/lv', '.sr-nom')) === rgb(VIOLET) && (await sr('q/lv', '.sr-ctl input')) === rgb(VIOLET) && (await sr('q/lv', 'button[data-a="unite"]')) === rgb(VIOLET), 'téléphone : titre, chiffre et unité de Locavore en violet');
  verifie((await sr('q/ta-mar', '.sr-nom')) === rgb(BLEU) && (await sr('stock/ta', '.sr-nom')) === rgb(BLEU) && (await sr('dispo', '.sr-nom')) === 'rgb(0, 0, 0)', 'téléphone : Très Allier et son stock en bleu, le disponible en noir');
  await capture(A, '3-telephone-couleurs');
  await A.click('[data-sem="cumul"]');
  const tdLv = await A.$$eval('#semTable thead th', (e) => { const i = e.findIndex((x) => x.textContent === 'Locavore'); const td = document.querySelectorAll('#semTable tr[data-pid="bette"] td')[i]; return [getComputedStyle(e[i]).color, td.textContent, getComputedStyle(td).color]; });
  verifie(tdLv[0] === rgb(VIOLET) && tdLv[1] === '2' && tdLv[2] === rgb(VIOLET), 'page Cumul : colonne Locavore (titre et chiffre) en violet');

  // 7. Rechargement : les couleurs restent
  await A.reload();
  await A.click('[data-view="reglages"]');
  await A.waitForSelector('#debView section.db');
  await deplier(A);
  verifie((await coche(A, 'lv')) === VIOLET && (await coche(A, 'ta')) === BLEU, 'après rechargement, Locavore reste violet et Très Allier bleu');

  verifie(erreurs.length === 0, 'aucune erreur JavaScript' + (erreurs.length ? ' : ' + erreurs.join(' | ') : ''));
  await nav.close(); site.close(); base.close();
  process.exit(echecs ? 1 : 0);
})();
