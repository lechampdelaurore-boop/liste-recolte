// Onglets des Réglages du Cumul (22/11/2026, demande de François : sur le téléphone, en apparence classique, les quatre
// pages des Réglages étaient des ronds d'où le texte débordait). Classique : quatre tuiles avec une icône au trait, 2 × 2 sur
// le téléphone, sur une ligne sur l'ordinateur, jamais de texte coupé (même en grand texte) ; pixel art inchangé (icônes
// cachées, tailles d'avant). Faux Firebase, sans compte. Lancement depuis la racine du dépôt : node tests/reglages-onglets.cjs
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');
const fauxFirebase = require('./faux-firebase.cjs');

const RACINE = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
const PORT_SITE = 8994, PORT_BASE = 8995;
let echecs = 0;
function verifie(cond, msg) { console.log((cond ? 'OK    ' : 'ÉCHEC ') + msg); if (!cond) echecs++; }
const pause = (ms) => new Promise((x) => setTimeout(x, ms));

(async () => {
  const site = http.createServer((q, r) => {
    let f = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (f.endsWith('/')) f += 'index.html';
    if (f === '/cle-web.js') { r.writeHead(200, { 'Content-Type': 'text/javascript' }); return r.end("window.RECOLTE_CLE_WEB='';"); }
    if (f === '/config.js') { r.writeHead(200, { 'Content-Type': 'text/javascript' }); return r.end(`window.RECOLTE_DB_URL='http://localhost:${PORT_BASE}';`); }
    const c = path.join(RACINE, f); if (!c.startsWith(RACINE) || !fs.existsSync(c) || fs.statSync(c).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': TYPES[path.extname(c)] || 'application/octet-stream' }); fs.createReadStream(c).pipe(r);
  }).listen(PORT_SITE);
  const base = await fauxFirebase(PORT_BASE);
  const nav = await chromium.launch();

  // Ouvre Réglages → Apparence ; « compte » : l'onglet Compte montré comme sur un appareil connecté ; « police » : taille
  // du texte de base (grand texte du téléphone).
  async function mesure(largeur, hauteur, apparence, { compte = true, police = 16 } = {}) {
    const ctx = await nav.newContext({ ...devices['Pixel 5'], viewport: { width: largeur, height: hauteur }, deviceScaleFactor: 1, hasTouch: largeur < 1000, isMobile: largeur < 1000, locale: 'fr-FR', serviceWorkers: 'block' });
    await ctx.addInitScript((a) => { localStorage.setItem('recolte.qui', '"François"'); localStorage.setItem('recolte.ui', JSON.stringify({ view: 'reglages', regPage: 'apparence' })); if (a) localStorage.setItem('recolte.apparence', JSON.stringify(a)); }, apparence === 'pixel' ? 'pixel' : null);
    const P = await ctx.newPage(); const erreurs = []; P.on('pageerror', (e) => erreurs.push(String(e)));
    await P.goto(`http://localhost:${PORT_SITE}/`); await P.waitForSelector('#regSub button[aria-pressed="true"]');
    await P.evaluate(([c, f]) => { if (c) document.querySelector('#regSub [data-reg="compte"]').hidden = false; document.documentElement.style.fontSize = f + 'px'; }, [compte, police]);
    await P.evaluate(() => document.fonts.ready); await pause(400);
    const m = await P.evaluate(() => Array.from(document.querySelectorAll('#regSub button')).filter((b) => b.offsetWidth).map((b) => {
      const r = b.getBoundingClientRect(), s = b.querySelector('span'), sr = s.getBoundingClientRect(), ic = b.querySelector('svg'), cs = getComputedStyle(b);
      return { nom: b.textContent.trim(), choisi: b.getAttribute('aria-pressed') === 'true', x: Math.round(r.left), y: Math.round(r.top), l: Math.round(r.width), h: Math.round(r.height),
        coupe: b.scrollWidth > b.clientWidth + 1 || b.scrollHeight > b.clientHeight + 1 || sr.right > r.right + 0.5 || sr.left < r.left - 0.5 || sr.bottom > r.bottom + 0.5,
        dehors: r.left < 0 || r.right > innerWidth, icone: ic.getBoundingClientRect().width > 0 ? getComputedStyle(ic).strokeWidth + '/' + getComputedStyle(ic).stroke : 'cachée',
        fond: cs.backgroundColor, texte: cs.color, police: cs.fontSize, rayon: cs.borderTopLeftRadius };
    }));
    await ctx.close();
    if (erreurs.length) verifie(false, 'erreurs de la page : ' + erreurs.join(' | '));
    return m;
  }
  const lignes = (m) => new Set(m.map((b) => b.y)).size;
  const resume = (m) => m.map((b) => `${b.nom} ${b.l}×${b.h}`).join(', ');

  // 1. Classique, téléphones : 2 × 2, mêmes tailles, rien de coupé ni hors de l'écran, zones à toucher d'au moins 44 × 44.
  for (const [l, h] of [[390, 844], [411, 914], [360, 760], [320, 640]]) {
    const m = await mesure(l, h, 'classique');
    verifie(m.length === 4 && lignes(m) === 2 && new Set(m.map((b) => b.x)).size === 2 && m.every((b) => b.l === m[0].l && b.h === m[0].h && b.l >= 44 && b.h >= 44 && !b.coupe && !b.dehors),
      `classique, téléphone ${l} px : quatre tuiles en 2 × 2, de même taille, sans texte coupé (${resume(m)})`);
    if (l === 390) {
      const c = m.find((b) => b.choisi), a = m.find((b) => !b.choisi);
      verifie(m.map((b) => b.nom).join() === 'Débouchés,Jours de récolte,Compte,Apparence' && c.nom === 'Apparence', 'classique : ordre des pages gardé, la page ouverte est marquée');
      verifie(m.every((b) => /^1\.7px\//.test(b.icone)) && c.fond === 'rgb(11, 105, 77)' && c.texte === 'rgb(255, 255, 255)' && c.icone === '1.7px/rgb(255, 255, 255)' && a.fond === 'rgb(255, 255, 255)' && a.icone === '1.7px/rgb(11, 105, 77)' && a.police === '16px' && a.rayon === '16px',
        'classique (charte douce) : icônes au trait de 1,7 px, vertes, blanches sur la page ouverte en vert plein ; texte 16 px ; rayon 1 rem ' + JSON.stringify({ c, a }));
    }
  }
  // 2. Grand texte du téléphone (texte agrandi de 30 %) : toujours rien de coupé ; l'icône passe au-dessus du nom.
  for (const l of [320, 360, 411]) {
    const m = await mesure(l, 800, 'classique', { police: 21 });
    verifie(m.length === 4 && lignes(m) === 2 && m.every((b) => !b.coupe && !b.dehors && b.h === m[0].h), `classique, téléphone ${l} px, grand texte : rien de coupé (${resume(m)})`);
  }
  // 3. Sans l'onglet Compte (appareil sans compte) : la dernière tuile prend toute la largeur, pas de trou.
  {
    const m = await mesure(390, 844, 'classique', { compte: false });
    verifie(m.length === 3 && lignes(m) === 2 && m[2].nom === 'Apparence' && m[2].l > m[0].l * 1.9 && !m.some((b) => b.coupe), 'classique, sans compte : trois tuiles, « Apparence » sur toute la largeur (' + resume(m) + ')');
  }
  // 4. Classique, ordinateur : une seule ligne, quatre tuiles de même largeur, texte sur une ligne.
  for (const [l, h] of [[1366, 768], [1920, 1080]]) {
    const m = await mesure(l, h, 'classique');
    verifie(m.length === 4 && lignes(m) === 1 && m.every((b) => b.l === m[0].l && b.h === m[0].h && b.h <= 60 && !b.coupe), `classique, ordinateur ${l} px : les quatre pages sur une ligne, sans texte coupé (${resume(m)})`);
  }
  // 5. Pixel art : rien ne change (icônes cachées, 2 × 2 au téléphone de 174 × 46, une ligne de 145 × 46 sur l'ordinateur).
  {
    const t = await mesure(390, 844, 'pixel'), o = await mesure(1366, 768, 'pixel');
    verifie(t.every((b) => b.icone === 'cachée' && b.l === 174 && b.h === 46 && !b.coupe) && lignes(t) === 2, 'pixel art, téléphone : pages des Réglages inchangées, sans icône (' + resume(t) + ')');
    verifie(o.every((b) => b.icone === 'cachée' && b.l === 145 && b.h === 46 && !b.coupe) && lignes(o) === 1, 'pixel art, ordinateur : pages des Réglages inchangées, sans icône (' + resume(o) + ')');
  }

  await nav.close(); site.close(); base.close();
  console.log(echecs ? `\n${echecs} ÉCHEC(S)` : '\nTout est vert.');
  process.exit(echecs ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
