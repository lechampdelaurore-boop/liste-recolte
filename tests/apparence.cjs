// Cumul, étape 48 : choisir l'apparence, classique ou pixel art (contrat docs/CONTRAT_APPARENCE_PIXEL_ART.md, quatre
// points confirmés par François le 22/11/2026). Tests T1, T2, T4 à T13 du contrat (T3 = les autres fichiers de tests
// lancés avec APPARENCE=pixel). Faux Firebase, sans compte, données inventées (tests/donnees-apparence.cjs), heure figée.
// T2 compare l'apparence classique de cette version à celle de la référence REF (par défaut origin/main) : 0 point
// différent attendu (faire « git fetch origin main » avant). Lancement depuis la racine du dépôt : node tests/apparence.cjs
//   (CAPTURES=dossier pour garder les captures ; REF=… pour une autre référence ; SEUL=T2 pour ne lancer qu'une partie)
// Il faut pdftotext et pdffonts (paquet poppler) pour T9.
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync, execSync } = require('child_process');
const { chromium, devices } = require('playwright');
const fauxFirebase = require('./faux-firebase.cjs');
const D = require('./donnees-apparence.cjs');

const RACINE = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.md': 'text/plain' };
const PORT_SITE = 8984, PORT_BASE = 8985, PORT_REF = 8986, PORT_BASE_REF = 8987;
const CAPTURES = process.env.CAPTURES || '';
const REF = process.env.REF || 'origin/main';
const SEUL = (process.env.SEUL || '').split(',').filter(Boolean);
const fait = (t) => !SEUL.length || SEUL.includes(t);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'apparence-'));
const PC = { viewport: { width: 1920, height: 1080 }, locale: 'fr-FR', timezoneId: 'Europe/Paris' };
const PC1366 = { viewport: { width: 1366, height: 768 }, locale: 'fr-FR', timezoneId: 'Europe/Paris' };
const TEL = { ...devices['Pixel 5'], viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, locale: 'fr-FR', timezoneId: 'Europe/Paris' };
const PIXEL = 'pixel', CLASSIQUE = 'classique';

function serveurSite(racine, port, base) {
  return new Promise((ok) => {
    const s = http.createServer((q, r) => {
      let f = decodeURIComponent(new URL(q.url, 'http://x').pathname);
      if (f.endsWith('/')) f += 'index.html';
      if (f === '/magasin') f = '/magasin.html';
      // Sans clé web : pas de compte (le fichier du dépôt n'est pas lu par les tests).
      if (f === '/cle-web.js') { r.writeHead(200, { 'Content-Type': 'text/javascript' }); return r.end("window.RECOLTE_CLE_WEB='';"); }
      if (f === '/config.js') { r.writeHead(200, { 'Content-Type': 'text/javascript' }); return r.end(`window.RECOLTE_DB_URL='http://localhost:${base}';`); }
      const chemin = path.join(racine, f);
      if (!chemin.startsWith(racine) || !fs.existsSync(chemin) || fs.statSync(chemin).isDirectory()) { r.writeHead(404); return r.end(); }
      r.writeHead(200, { 'Content-Type': TYPES[path.extname(chemin)] || 'application/octet-stream' });
      fs.createReadStream(chemin).pipe(r);
    });
    s.listen(port, () => ok(s));
  });
}

let echecs = 0;
function verifie(cond, msg) { console.log((cond ? 'OK    ' : 'ÉCHEC ') + msg); if (!cond) echecs++; }
const attendreQue = async (fn, ms = 8000) => { const fin = Date.now() + ms; while (Date.now() < fin) { try { if (await fn()) return true; } catch (e) { /* page en cours */ } await new Promise((x) => setTimeout(x, 120)); } return false; };
const pause = (ms) => new Promise((x) => setTimeout(x, ms));
const capture = async (page, nom, opts = {}) => { if (!CAPTURES) return; fs.mkdirSync(CAPTURES, { recursive: true }); await pause(300); await page.screenshot({ path: path.join(CAPTURES, nom), ...opts }); };
const ecritures = (base) => base.journal.filter((x) => x.m !== 'GET').length;

// Un appareil : heure figée, prénom choisi, page et semaine posées une fois (comme un appareil déjà servi), apparence
// déjà choisie (ou aucune : appareil neuf).
async function appareil(nav, opts, apparence, site, ui, sw) {
  const ctx = await nav.newContext({ ...opts, serviceWorkers: sw ? 'allow' : 'block' });
  await ctx.addInitScript(([a, ui, w]) => {
    if (sessionStorage.getItem('pose')) return; sessionStorage.setItem('pose', '1');
    localStorage.setItem('recolte.qui', '"François"');
    localStorage.setItem('recolte.ui', JSON.stringify({ ...(ui || {}), semaine: w, semaineLe: '2026-11-25' }));
    if (a) localStorage.setItem('recolte.apparence', JSON.stringify(a));
  }, [apparence, ui || { view: 'recolte' }, D.W]);
  const page = await ctx.newPage();
  await page.clock.setFixedTime(D.T0);
  page.erreurs = []; page.on('pageerror', (e) => page.erreurs.push(String(e)));
  page.requetes = []; page.on('request', (r) => page.requetes.push(r.url()));
  page.on('dialog', (d) => d.accept());
  page.site = site;
  return { ctx, page };
}
async function ouvrir(page, chemin) {
  await page.goto(page.site + (chemin || '/'));
  await page.waitForSelector('#tabs button[aria-pressed="true"]');
  await page.evaluate(() => document.fonts.ready);
  await pause(600);
}
const aller = async (page, vue, sous) => {
  await page.click(`#tabs [data-view="${vue}"]`);
  if (sous) await page.click(sous);
  await pause(400);
};
const estPixel = (page) => page.evaluate(() => document.documentElement.getAttribute('data-apparence') === 'pixel');
function contraste(a, b) {
  const lum = (c) => { const v = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return Math.round((l1 + 0.05) / (l2 + 0.05) * 100) / 100;
}
// Un point compte comme différent au-delà de 8 sur 255 sur une couleur : entre main et main, le lissage du texte varie
// déjà de 1 à 4 d'un chargement à l'autre (mesuré le 22/11/2026). Un vrai changement de style (couleur, place, taille,
// police) donne des écarts bien plus grands.
const SEUIL_POINT = 8;
async function pointsDifferents(page, a, b) {
  if (a.equals(b)) return 0;
  return page.evaluate(async ([a, b, SEUIL_POINT]) => {
    const lire = async (s) => { const im = new Image(); im.src = 'data:image/png;base64,' + s; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); return { w: im.width, h: im.height, d: x.getImageData(0, 0, im.width, im.height).data }; };
    const A = await lire(a), B = await lire(b);
    if (A.w !== B.w || A.h !== B.h) return [-1, '      (tailles différentes)'];
    let n = 0, ec = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let i = 0; i < A.d.length; i += 4) {
      const e = Math.max(Math.abs(A.d[i] - B.d[i]), Math.abs(A.d[i + 1] - B.d[i + 1]), Math.abs(A.d[i + 2] - B.d[i + 2]));
      if (e > SEUIL_POINT) { n++; ec = Math.max(ec, e); const p = i / 4, x = p % A.w, y = (p - x) / A.w; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    }
    return [n, n ? `      (écart : ${n} points, de ${x0},${y0} à ${x1},${y1}, au plus ${ec} sur 255)` : ''];
  }, [a.toString('base64'), b.toString('base64'), SEUIL_POINT]).then(([n, info]) => { if (info) console.log(info); return n; });
}

(async () => {
  const site = await serveurSite(RACINE, PORT_SITE, PORT_BASE);
  const base = await fauxFirebase(PORT_BASE);
  await D.remplir(`http://localhost:${PORT_BASE}`);
  const SITE = `http://localhost:${PORT_SITE}`;
  const nav = await chromium.launch();

  // ================= T1 et T4 : le choix, gardé sur l'appareil seulement, jamais écrit dans la base =================
  if (fait('T1')) {
    const { ctx, page: P } = await appareil(nav, PC, null, SITE, { view: 'semaine', semPage: 'repartir' });
    await ouvrir(P);
    const neuf = await P.evaluate(() => ({ attr: document.documentElement.hasAttribute('data-apparence'), style: document.documentElement.hasAttribute('style'), cle: localStorage.getItem('recolte.apparence') }));
    verifie(!neuf.attr && !neuf.style && neuf.cle === null, 'T1. appareil neuf : apparence classique, aucun attribut sur <html> ' + JSON.stringify(neuf));
    const pixelCharge = P.requetes.filter((u) => /press-start|vt323|signes-pixel|apparence\/fond|cadre-carte/.test(u));
    verifie(pixelCharge.length === 0, 'R11. en classique, ni les polices ni les images du pixel art ne sont téléchargées par la page' + (pixelCharge.length ? ' (' + pixelCharge.join(', ') + ')' : ''));
    await aller(P, 'reglages', '#regSub [data-reg="apparence"]');
    const page = await P.evaluate(() => { const s = document.querySelector('#debView .app-page'), b = Array.from(s.querySelectorAll('.app-b'));
      return { pastilles: Array.from(document.querySelectorAll('#regSub button')).filter((x) => !x.hidden).map((x) => x.textContent + ':' + x.getAttribute('aria-pressed')).join(), titre: s.querySelector('h2').textContent, phrase: s.querySelector('p').textContent,
        boutons: b.map((x) => x.textContent.trim() + ':' + x.getAttribute('aria-pressed')).join(), images: b.every((x) => x.querySelector('img') && x.querySelector('img').complete && x.querySelector('img').naturalWidth === 300) }; });
    verifie(page.pastilles === 'Débouchés:false,Jours de récolte:false,Apparence:true' && page.titre === 'Apparence de cet appareil' && page.phrase === 'Ce choix ne vaut que pour cet appareil. Les autres gardent le leur.' && page.boutons === 'Classique:true,Pixel art:false' && page.images,
      'R1. Réglages → page « Apparence », visible sans compte : Classique (marqué) et Pixel art, chacun avec sa vignette ' + JSON.stringify(page));
    const avant = ecritures(base);
    await P.click('[data-apparence-choix="pixel"]');
    await pause(1200);
    const apres = await P.evaluate(() => ({ attr: document.documentElement.getAttribute('data-apparence'), cle: localStorage.getItem('recolte.apparence'), theme: document.querySelector('meta[name="theme-color"]').content, vue: JSON.parse(localStorage.getItem('recolte.ui')).view, presse: Array.from(document.querySelectorAll('.app-b')).map((b) => b.getAttribute('aria-pressed')).join() }));
    verifie(apres.attr === 'pixel' && apres.cle === '"pixel"' && apres.vue === 'reglages' && apres.presse === 'false,true', 'T1. « Pixel art » : tout de suite, attribut posé, clé recolte.apparence = "pixel", toujours sur la même page, bouton marqué ' + JSON.stringify(apres));
    verifie(apres.theme === '#3a2420', 'R18. barre du navigateur du téléphone (theme-color) brun #3a2420 en pixel art');
    verifie(ecritures(base) === avant, `T1. aucune écriture dans la base (${ecritures(base) - avant} appel PUT, PATCH ou DELETE de plus)`);
    // T4 : au rechargement, l'attribut est là avant le premier affichage (le corps de la page n'existe pas encore).
    await P.addInitScript(() => { window.__vu = []; const voir = (q) => window.__vu.push(q + ':' + document.documentElement.getAttribute('data-apparence'));
      new MutationObserver((m, o) => { if (document.body) { voir('corps'); o.disconnect(); } }).observe(document, { childList: true, subtree: true });
      requestAnimationFrame(() => voir('premiere-image')); });
    await P.reload(); await P.waitForSelector('.app-page');
    const vu = await P.evaluate(() => window.__vu);
    verifie(vu.length >= 2 && vu.every((x) => /:pixel$/.test(x)), 'T4. au rechargement, pixel art dès le premier affichage, sans éclair du classique (' + vu.join(', ') + ')');
    verifie(ecritures(base) === avant, 'T1. rechargement en pixel art : toujours aucune écriture');
    verifie(await P.evaluate(() => Array.from(document.querySelectorAll('.app-b')).map((b) => b.getAttribute('aria-pressed')).join() === 'false,true'), 'T1. après rechargement : « Pixel art » toujours marqué');
    await P.click('[data-apparence-choix="classique"]');
    const cl = await P.evaluate(() => ({ attr: document.documentElement.hasAttribute('data-apparence'), style: document.documentElement.hasAttribute('style'), cle: localStorage.getItem('recolte.apparence'), theme: document.querySelector('meta[name="theme-color"]').content }));
    verifie(!cl.attr && !cl.style && cl.cle === '"classique"' && cl.theme === '#373737', 'T1. retour à « Classique » : attribut retiré, rien sur <html>, barre du navigateur #373737 ' + JSON.stringify(cl));
    await P.evaluate(() => localStorage.setItem('recolte.apparence', '"violet"'));
    await P.reload(); await P.waitForSelector('.app-page');
    verifie(await P.evaluate(() => !document.documentElement.hasAttribute('data-apparence')), 'R4. valeur inconnue dans la clé : classique');
    await P.evaluate(() => localStorage.setItem('recolte.apparence', 'pixel-pas-json'));
    await P.reload(); await P.waitForSelector('.app-page');
    verifie(await P.evaluate(() => !document.documentElement.hasAttribute('data-apparence')) && P.erreurs.length === 0, 'R4. clé abîmée : classique, sans erreur dans la page' + (P.erreurs.length ? ' : ' + P.erreurs.join(' / ') : ''));
    // Un autre onglet du même appareil suit le choix.
    const P2 = await ctx.newPage(); await P2.clock.setFixedTime(D.T0); await P2.goto(SITE + '/'); await P2.waitForSelector('#tabs button[aria-pressed="true"]');
    await P.evaluate(() => { localStorage.setItem('recolte.apparence', '"pixel"'); });
    await P2.evaluate(() => window.dispatchEvent(new StorageEvent('storage', { key: 'recolte.apparence' })));
    verifie(await estPixel(P2), 'un autre onglet du même appareil suit le choix');
    await P2.close();
    await ctx.close();
    const { ctx: c2, page: Q } = await appareil(nav, TEL, null, SITE);
    await ouvrir(Q);
    verifie(!(await estPixel(Q)), 'R3. un autre appareil reste en classique');
    await c2.close();
    // Ce qu'écrit l'appli dans la base pendant tout T1 : rien qui parle d'apparence.
    verifie(!JSON.stringify(base.lire('') || {}).includes('apparence') && !base.journal.some((x) => /apparence/.test(x.p)), 'R3, R20. le mot « apparence » n\'apparaît nulle part dans la base');
  }

  // ================= T5, T7, T10 (requêtes) : l'habillage pixel art sur l'ordinateur =================
  if (fait('T5')) {
    const { ctx, page: P } = await appareil(nav, PC, PIXEL, SITE, { view: 'semaine', semPage: 'repartir' });
    await ouvrir(P);
    await P.waitForSelector('#semGrid tbody tr[data-pid="carotte"]');
    await capture(P, 'pixel-ordinateur-repartir.png');
    const s = await P.evaluate(() => {
      const cs = (q, p) => getComputedStyle(document.querySelector(q), p || null);
      return {
        carte: cs('#semRep').borderImageSource + '|' + cs('#semRep').borderImageSlice + '|' + cs('#semRep').borderImageWidth,
        tete: cs('#semRep .sem-barre').backgroundImage, n: cs('.sem-sum .n').color + '/' + cs('.sem-sum .n').textShadow + '/' + cs('.sem-sum .n').fontFamily,
        ajout: cs('#semRep .sem-barre .sem-add').backgroundColor + '/' + cs('#semRep .sem-barre .sem-add').color,
        grille: cs('#semGrid tbody .g-in').fontFamily + '/' + cs('#semGrid tbody .g-in').fontSize + '/' + cs('#semGrid tbody .g-prod').fontSize, interieur: cs('#semGrid tbody td').backgroundColor,
        filtres: Array.from(document.querySelectorAll('*')).filter((e) => { const c = getComputedStyle(e); return c.filter !== 'none' || c.backdropFilter !== 'none'; }).length,
        fond: cs('body', '::before').backgroundImage + '|' + cs('body', '::before').backgroundSize + '|' + cs('body', '::before').position + '|' + cs('body', '::before').imageRendering,
        menu: cs('.tabs').backgroundImage + '|' + document.querySelector('.tabs').getBoundingClientRect().width, logo: cs('.brand img').content + '/' + cs('.brand img').width,
        choisi: cs('#tabs [aria-pressed="true"]').backgroundColor,
        arrondis: Array.from(document.querySelectorAll('main *, .appbar *, .tabs *')).filter((e) => e.getBoundingClientRect().width && parseFloat(getComputedStyle(e).borderTopLeftRadius) > 0).map((e) => e.tagName + '.' + e.className).slice(0, 5),
        colonne: (() => { scrollTo(3000, 0); const r = document.querySelector('#semGrid tbody td.g-prod, #semGrid tbody th.g-prod').getBoundingClientRect().left >= document.querySelector('#tabs').getBoundingClientRect().right - 1; scrollTo(0, 0); return r; })(),
      };
    });
    verifie(/cadre-carte\.png/.test(s.carte) && /\|15 15 21 fill\|15px 15px 21px$/.test(s.carte), 'T5. la grille Répartir est une carte : cadre posé par border-image (cadre-carte.png, 9 morceaux) ' + s.carte.replace(/^url\("?[^)]*\/(cadre-carte\.png)"?\)/, '$1'));
    verifie(/rgb\(224, 112, 159\)/.test(s.tete) && /rgb\(248, 180, 208\)/.test(s.tete) && /rgb\(196, 80, 138\)/.test(s.tete) && /rgb\(58, 32, 22\)/.test(s.tete) && /rgb\(247, 220, 196\)/.test(s.tete), 'T5. haut de la carte rose #e0709f, reflet #f8b4d0, ombre #c4508a, trait #3a2016, filet #f7dcc4');
    verifie(/^rgb\(255, 255, 255\)\//.test(s.n) && /rgb\(138, 42, 90\)/.test(s.n) && /Press Start 2P/.test(s.n), 'T5, écart 3. compteur « N produits » sur le haut rose : blanc à contour #8a2a5a, Press Start 2P');
    verifie(s.ajout === 'rgb(255, 244, 228)/rgb(168, 64, 111)', 'écart 3. « Ajouter un produit » crème sur le haut rose (' + s.ajout + ')');
    verifie(/VT323/.test(s.grille) && /\/21px\/21px$/.test(s.grille) && s.interieur === 'rgb(255, 244, 228)', 'T5, écart 8. grille en VT323 de 21 points, intérieur crème #fff4e4 (' + s.grille + ')');
    verifie(/fond-ordinateur\.png/.test(s.fond) && /\|1920px 1080px\|fixed\|pixelated$/.test(s.fond), 'A1. fond de l\'ordinateur 480 × 270 agrandi 4 fois (1920 × 1080), calque fixe, sans lissage');
    verifie(/linear-gradient/.test(s.menu) && /\|200$/.test(s.menu) && /logo-pixel\.png/.test(s.logo) && /\/64px$/.test(s.logo) && s.choisi === 'rgb(224, 112, 159)', 'A3, R15. menu de gauche de 200 points, crème puis fondu, logo pixel de 64 points, page choisie en rose');
    verifie(s.colonne, 'R15. la colonne des produits reste collée au menu sans passer dessous');
    verifie(s.filtres === 0, 'T11. aucun filtre graphique (filter, backdrop-filter) dans la page');
    verifie(s.arrondis.length === 0, 'A9. aucun arrondi lisse dans la page, la barre et le menu' + (s.arrondis.length ? ' (' + s.arrondis.join(', ') + ')' : ''));
    // T7 : polices chargées depuis le site ; aucun signe dessiné par une police du système.
    const polices = await P.evaluate(async () => { await document.fonts.load('21px VT323'); await document.fonts.load('13px "Press Start 2P"'); await document.fonts.load('20px "Signes pixel"');
      return { vt: document.fonts.check('21px VT323'), ps: document.fonts.check('13px "Press Start 2P"'), sp: document.fonts.check('20px "Signes pixel"') }; });
    const urls = [...new Set(P.requetes.filter((u) => /\.woff2$/.test(u)).map((u) => new URL(u).host + ' ' + u.replace(/^.*\//, '')))];
    verifie(polices.vt && polices.ps && polices.sp && ['vt323.woff2', 'press-start-2p.woff2', 'signes-pixel.woff2'].every((f) => urls.includes('localhost:' + PORT_SITE + ' ' + f)), 'T7. VT323, Press Start 2P et Signes pixel chargées depuis le site (' + urls.join(', ') + ')');
    const cdp = await ctx.newCDPSession(P);
    await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
    const policesDe = async (sel) => { const { root } = await cdp.send('DOM.getDocument', { depth: -1 }); const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: sel });
      const r = []; for (const id of nodeIds) { const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId: id }); r.push(...fonts.map((f) => f.familyName)); } return [...new Set(r)]; };
    const ok = (l) => l.length > 0 && l.every((f) => /^(VT323|Press Start 2P|Signes pixel)$/.test(f));
    const signes = { '＋ (Ajouter un produit)': await policesDe('#semRep .sem-add'), '▾ (Filtre)': await policesDe('.sf-chev') };
    await aller(P, 'recolte'); await P.click(`#recJours [data-jour="${D.MER}"]`); await pause(400);
    signes['⋯ (Récolte)'] = await policesDe('#todo li.item .menu');
    await aller(P, 'reglages', '#regSub [data-reg="debouches"]'); await P.waitForSelector('.db-ordre .sem-btn');
    signes['▲ ▼ (ordre des débouchés)'] = await policesDe('.db-ordre .sem-btn');
    await aller(P, 'semaine', '#semSub [data-sem="stock"]'); await P.waitForSelector('.stk-l .sr-ctl button[data-a="moins"]');
    signes['− + (stock)'] = await policesDe('.stk-l .sr-ctl button[data-a="moins"], .stk-l .sr-ctl button[data-a="plus"]');
    for (const [nom, l] of Object.entries(signes)) verifie(ok(l) && (nom.startsWith('−') || l.includes('Signes pixel')), `T7. ${nom} dessiné par les polices pixel (${l.join(', ')})`);
    await capture(P, 'pixel-ordinateur-stock.png');
    // R12, T8 : la grille Répartir tient en entier sur 1366 points, sans défilement de côté.
    await P.setViewportSize({ width: 1366, height: 768 });
    await aller(P, 'semaine', '#semSub [data-sem="repartir"]'); await P.waitForSelector('#semGrid tbody tr[data-pid="carotte"]'); await pause(400);
    const l1366 = await P.evaluate(() => ({ page: document.scrollingElement.scrollWidth, fen: innerWidth, grille: Math.round(document.querySelector('#semGrid').getBoundingClientRect().right) }));
    verifie(l1366.page <= l1366.fen && l1366.grille <= l1366.fen, `T8. 1366 points : la grille Répartir tient en entier, sans défilement de côté (page ${l1366.page}, grille jusqu'à ${l1366.grille})`);
    await capture(P, 'pixel-ordinateur-1366-repartir.png');
    const autres = P.requetes.filter((u) => { const h = new URL(u); return h.protocol !== 'data:' && !['localhost:' + PORT_SITE, 'localhost:' + PORT_BASE].includes(h.host); });
    verifie(autres.length === 0, 'T10. pixel art : aucune requête vers un autre site' + (autres.length ? ' (' + autres.join(', ') + ')' : ''));
    verifie(P.erreurs.length === 0, 'ordinateur en pixel art : aucune erreur dans la page' + (P.erreurs.length ? ' : ' + P.erreurs.join(' / ') : ''));
    await ctx.close();
  }

  // ================= Téléphone en pixel art : T5, T6, T8 (contrastes, zones à toucher), A1, écart 2 =================
  if (fait('TEL')) {
    const { ctx, page: T } = await appareil(nav, TEL, PIXEL, SITE, { view: 'recolte' });
    await ouvrir(T);
    await T.click(`#recJours [data-jour="${D.MER}"]`); await T.waitForSelector('#todo li.item'); await pause(800);
    await capture(T, 'pixel-telephone-recolte.png');
    const s = await T.evaluate(() => { const cs = (q, p) => getComputedStyle(document.querySelector(q), p || null);
      return { prod: cs('#todo li.item .prod').fontFamily + '/' + cs('#todo li.item .prod').fontSize, qte: cs('#todo li.item .qty').fontSize + '/' + cs('#todo li.item .qty').color,
        titre: cs('#todo', '::before').content + '/' + cs('#todo', '::before').fontFamily + '/' + cs('#todo', '::before').color, nb: cs('#todo', '::after').content, n: document.querySelectorAll('#todo li.item').length,
        carte: cs('#todo').borderImageSource, fond: cs('body', '::before').backgroundImage + '|' + cs('body', '::before').backgroundSize,
        logo: cs('.brand img').width, barre: cs('.appbar').backgroundColor + '/' + cs('.appbar').borderBottomColor + '/' + cs('.appbar').position, bas: cs('.tabs').backgroundColor + '/' + cs('.tabs').borderTopColor, choisi: cs('#tabs [aria-pressed="true"]').backgroundColor,
        textes: Array.from(document.querySelectorAll('main *')).filter((e) => e.offsetWidth && e.childNodes.length && Array.from(e.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim()) && /VT323/.test(getComputedStyle(e).fontFamily.split(',')[0]) && parseFloat(getComputedStyle(e).fontSize) < 18).map((e) => e.tagName.toLowerCase() + (e.className ? '.' + e.className : '') + ' « ' + e.textContent.trim().slice(0, 20) + ' » ' + getComputedStyle(e).fontSize).slice(0, 6),
        minis: Array.from(document.querySelectorAll('#todo img.mini-px')).map((i) => i.dataset.e + ':' + i.naturalWidth + ':' + i.getBoundingClientRect().width) };
    });
    verifie(/^"?VT323/.test(s.prod) && /\/23px$/.test(s.prod) && s.qte === '23px/rgb(30, 95, 134)', `T5, R12. téléphone : produits et quantités en VT323 de 23 points, quantité bleue #1e5f86 (${s.prod}, ${s.qte})`);
    verifie(s.titre.startsWith('"À récolter"/') && /Press Start 2P/.test(s.titre) && s.nb === `"${s.n} produits"` && /cadre-carte\.png/.test(s.carte), `écart 2. la liste de la Récolte est une carte au titre « À récolter » et au nombre de produits (${s.nb})`);
    verifie(s.textes.length === 0, 'R12. aucun texte en VT323 sous 18 points sur le téléphone' + (s.textes.length ? ' (' + s.textes.join(', ') + ')' : ''));
    verifie(/fond-telephone\.png/.test(s.fond) && /\|390px 844px$/.test(s.fond), 'A1. fond du téléphone 195 × 422 agrandi 2 fois (390 × 844)');
    verifie(s.logo === '32px' && s.barre === 'rgb(58, 36, 32)/rgb(240, 138, 60)/relative' && s.bas === 'rgb(58, 36, 32)/rgb(240, 138, 60)' && s.choisi === 'rgb(224, 112, 159)', 'A2, R16. logo de 32 points, barres brunes à filet orange, la barre du haut part avec la page, page choisie en rose');
    verifie(s.minis.length >= 5 && s.minis.every((m) => /:14:28$/.test(m)), 'T6. téléphone : miniatures en pixels de 14 × 14, agrandies 2 fois (' + s.minis.slice(0, 4).join(', ') + '…)');
    // Zones à toucher d'au moins 44 × 44 points (taille + zone agrandie par ::after).
    const zones = async () => T.evaluate(() => {
      const z = (q) => { const e = document.querySelector(q); if (!e || !e.offsetWidth) return null; const b = e.getBoundingClientRect(), a = getComputedStyle(e, '::after'); const ab = a.content !== 'none' && a.position === 'absolute';
        return { q, l: Math.round(b.width + (ab ? -2 * parseFloat(a.left) : 0)), h: Math.round(b.height + (ab ? -2 * parseFloat(a.top) : 0)) }; };
      return ['#todo li.item .box', '#todo li.item .menu', '#todo li.item .more', '#recJours button', '#circs .chip', '#tabs button', '#prepList .grp-head .box', '#prepList li.pitem .menu', '.stk-l .sr-ctl button[data-a="moins"]', '.stk-l .sr-ctl button[data-a="plus"]', '.stk-l .sr-ctl input', '#regSub button'].map(z).filter(Boolean);
    });
    const z1 = await zones();
    await aller(T, 'prep', '#prepSort [data-sort="client"]'); const z2 = await zones();
    await capture(T, 'pixel-telephone-preparation.png');
    await aller(T, 'semaine', '#semSub [data-sem="stock"]'); await T.waitForSelector('.stk-l'); const z3 = await zones();
    const stk = await T.evaluate(() => { const b = getComputedStyle(document.querySelector('.stk-l .sr-ctl button[data-a="plus"]')); return b.backgroundColor; });
    await capture(T, 'pixel-telephone-stock.png');
    await aller(T, 'reglages', '#regSub [data-reg="apparence"]'); const z4 = await zones();
    const pastilles = await T.evaluate(() => Array.from(document.querySelectorAll('#regSub button')).filter((b) => b.offsetWidth).every((b) => b.scrollWidth <= b.clientWidth + 1 && b.getBoundingClientRect().right <= innerWidth));
    const toutes = [...z1, ...z2, ...z3, ...z4], petites = toutes.filter((x) => x.l < 44 || x.h < 44);
    verifie(petites.length === 0, 'R12. téléphone : zones à toucher d\'au moins 44 × 44 points (' + [...new Map(toutes.map((x) => [x.q, x])).values()].map((x) => `${x.q.replace(/^.* /, '')} ${x.l}×${x.h}`).join(', ') + ')');
    verifie(stk === 'rgb(224, 112, 159)', 'écart 6. « + » et « − » du stock en rose');
    verifie(pastilles, 'R1. téléphone : les pages des Réglages restent lisibles, sans texte coupé');
    // Contrastes, mesurés sur les couleurs réelles de la page (téléphone).
    await aller(T, 'recolte');
    const paires = await T.evaluate(() => {
      const cs = (q) => getComputedStyle(document.querySelector(q)), creme = 'rgb(255, 244, 228)';
      const p = (nom, q, fond, gros) => { const e = document.querySelector(q); if (!e) return null; const c = getComputedStyle(e); return { nom, txt: c.color, fond: fond || c.backgroundColor, gros: !!gros, contour: /rgb\(138, 42, 90\)|rgb\(58, 36, 32\)|rgb\(138, 42, 30\)/.test(c.textShadow) }; };
      return [p('produit', '#todo li.item .prod', creme), p('quantité', '#todo li.item .qty', creme), p('détail', '#todo li.item .qty small', creme), p('Récolté par', '#done li.item .by', creme),
        p('barre du haut', '.brand', 'rgb(58, 36, 32)'), p('page de la barre du bas', '#tabs button[aria-pressed="false"]', 'rgb(58, 36, 32)'), p('page choisie', '#tabs button[aria-pressed="true"]', null),
        p('« ⋯ »', '#todo li.item .menu', null, true), p('jour de récolte', '#recJours button[aria-pressed="false"]'), p('jour choisi', '#recJours button[aria-pressed="true"]'),
        p('titre de page (sur le fond)', 'h1', 'rgb(240, 138, 60)', true), p('texte sur le fond', '#pour', 'rgb(240, 138, 60)'), p('Récolté (titre)', '#progPct', creme, true)].filter(Boolean);
    });
    await aller(T, 'prep', '#prepSort [data-sort="client"]');
    paires.push(...await T.evaluate(() => { const p = (nom, q, fond) => { const e = document.querySelector(q); if (!e) return null; const c = getComputedStyle(e); return { nom, txt: c.color, fond: fond || c.backgroundColor, contour: /rgb\(138, 42, 90\)/.test(c.textShadow) }; };
      return [p('« Récolté »', '.rec.ok'), p('« Pas encore récolté »', '.rec.no'), p('nom du client (haut rose)', '.grp-name', 'rgb(224, 112, 159)')].filter(Boolean); }));
    await aller(T, 'semaine', '#semSub [data-sem="repartir"]');
    paires.push(...await T.evaluate(() => { const p = (nom, q, fond) => { const e = document.querySelector(q); if (!e) return null; const c = getComputedStyle(e); return { nom, txt: c.color, fond: fond || c.backgroundColor, contour: false }; };
      return [p('bouton rose « Ajouter un produit »', '#semRep .sem-add'), p('« Placé »', '.legende .reste.place'), p('« À placer »', '.legende .reste.aplacer'), p('« Manque »', '.legende .reste.manque')].filter(Boolean); }));
    const lignes = paires.map((x) => ({ ...x, r: contraste(x.txt, x.fond) }));
    const rates = lignes.filter((x) => x.r < (x.gros ? 3 : 4.5) && !x.contour);
    console.log('      contrastes : ' + lignes.map((x) => `${x.nom} ${x.r}${x.contour ? ' (+ contour)' : ''}`).join(' ; '));
    verifie(rates.length === 0, 'T8. contrastes : texte ordinaire au moins 4,5, gros titres au moins 3, blanc sur rose ou texte sur le fond seulement avec son contour' + (rates.length ? ' (trop faibles : ' + rates.map((x) => x.nom + ' ' + x.r).join(', ') + ')' : ''));
    const bleus = await T.evaluate(() => Array.from(document.querySelectorAll('button')).filter((b) => b.offsetWidth).map((b) => getComputedStyle(b).backgroundColor).filter((c) => { const v = c.match(/\d+/g).map(Number); return v[2] > v[0] + 40 && v[2] > v[1] + 20; }));
    verifie(bleus.length === 0, 'R12. aucun bouton bleu' + (bleus.length ? ' (' + bleus.join(', ') + ')' : ''));
    verifie(T.erreurs.length === 0, 'téléphone en pixel art : aucune erreur dans la page' + (T.erreurs.length ? ' : ' + T.erreurs.join(' / ') : ''));
    await ctx.close();
  }

  // ================= T6 : miniatures en pixels (le bon dessin, calculé une fois par espèce, fichiers d'origine intacts) =================
  if (fait('T6')) {
    const especes = async (apparence) => {
      const { ctx, page: P } = await appareil(nav, PC, apparence, SITE, { view: 'semaine', semPage: 'repartir' });
      await ouvrir(P); await P.waitForSelector('#semGrid tbody tr[data-pid="carotte"]'); await pause(1200);
      const r = await P.evaluate(() => Array.from(document.querySelectorAll('#semGrid tbody .g-prod')).map((td) => {
        const u = td.querySelector('svg.mini use'), im = td.querySelector('img.mini-px');
        if (u) return td.closest('tr').dataset.pid + '=' + u.getAttribute('href').replace(/^especes\/(plants|modifies)\.svg#/, '');
        if (!im) return td.closest('tr').dataset.pid + '=';
        const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
        const d = x.getImageData(0, 0, c.width, c.height).data; let demi = 0, plein = 0; for (let i = 3; i < d.length; i += 4) { if (d[i] && d[i] < 255) demi++; if (d[i] === 255) plein++; }
        return td.closest('tr').dataset.pid + '=' + im.dataset.e + (im.naturalWidth === 16 && im.naturalHeight === 16 && !demi && plein > 20 ? '' : '!' + im.naturalWidth + 'x' + im.naturalHeight + ',' + demi + ',' + plein);
      }));
      const dessins = P.requetes.filter((u) => /especes\/(plants|modifies)\.svg$/.test(u)).length;
      await capture(P, apparence + '-ordinateur-miniatures.png', { clip: { x: 200, y: 0, width: 600, height: 1080 } });
      // Changer de page refait l'affichage : aucun nouveau calcul (le dessin est gardé le temps de la visite).
      const calc = await P.evaluate(() => { let n = 0; const o = HTMLCanvasElement.prototype.toDataURL; HTMLCanvasElement.prototype.toDataURL = function(){ n++; return o.apply(this, arguments); }; window.__nCalc = () => n; return true; });
      await aller(P, 'recolte'); await aller(P, 'semaine'); await pause(600);
      const recalc = calc ? await P.evaluate(() => window.__nCalc()) : -1;
      await ctx.close();
      return { r, dessins, recalc };
    };
    const c = await especes(CLASSIQUE), p = await especes(PIXEL);
    verifie(c.r.length >= 14 && c.r.join() === p.r.join(), 'T6. pixel art : chaque miniature montre la même espèce qu\'en classique, en 16 × 16 sans demi-transparence (' + p.r.join(', ') + ')');
    verifie(p.dessins <= 2 && p.recalc === 0, `T6, T11. les dessins sont lus une fois (${p.dessins} lecture) et chaque miniature calculée une seule fois par espèce (${p.recalc} calcul de plus en changeant de page)`);
    const empreinte = crypto.createHash('sha256').update(fs.readFileSync(path.join(RACINE, 'especes/plants.svg'))).digest('hex');
    const lis = fs.readFileSync(path.join(RACINE, 'especes/LISEZMOI.md'), 'utf8');
    let nouveaux = '';
    try { nouveaux = execSync(`git -C "${RACINE}" diff --name-only ${REF} -- especes`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() + execSync(`git -C "${RACINE}" ls-files --others --exclude-standard especes`).toString().trim(); } catch (e) { nouveaux = '(référence introuvable)'; }
    verifie(lis.includes(empreinte) && nouveaux === '', 'T6. especes/plants.svg garde son empreinte (LISEZMOI.md) et rien ne change dans especes/' + (nouveaux ? ' (' + nouveaux + ')' : ''));
  }

  // ================= T12 : changer d'apparence garde la page, la semaine, le jour et le filtre =================
  if (fait('T12')) {
    const { ctx, page: P } = await appareil(nav, TEL, null, SITE, { view: 'recolte' });
    await ouvrir(P);
    await P.click(`#recJours [data-jour="${D.MER}"]`); await P.waitForSelector('#todo li.item');
    await P.click('#circs .chip[data-c="mk"]'); await pause(300);
    await P.evaluate(() => scrollTo(0, 400)); await pause(200);
    const etat = () => P.evaluate(() => { const u = JSON.parse(localStorage.getItem('recolte.ui')); const h = document.querySelector('#todo li.item'); return { vue: u.view, semaine: u.semaine, jour: document.querySelector('#recJours [aria-pressed="true"]').dataset.jour, circ: u.circ, haut: Array.from(document.querySelectorAll('#todo li.item')).find((l) => l.getBoundingClientRect().bottom > 60).dataset.id, n: document.querySelectorAll('#todo li.item').length }; });
    const avant = await etat();
    // Le choix fait dans un autre onglet arrive ici : la page en cours change seulement d'habillage.
    await P.evaluate(() => { localStorage.setItem('recolte.apparence', '"pixel"'); window.dispatchEvent(new StorageEvent('storage', { key: 'recolte.apparence' })); });
    await pause(500);
    const apres = await etat();
    verifie(await estPixel(P) && JSON.stringify(apres) === JSON.stringify(avant), 'T12. pixel art en cours de récolte : même page, même semaine, même jour, même circuit, même produit en haut de l\'écran ' + JSON.stringify(apres));
    await aller(P, 'reglages', '#regSub [data-reg="apparence"]');
    await P.click('[data-apparence-choix="classique"]'); await pause(300);
    await aller(P, 'recolte');
    const retour = await P.evaluate(() => ({ jour: document.querySelector('#recJours [aria-pressed="true"]').dataset.jour, circ: JSON.parse(localStorage.getItem('recolte.ui')).circ }));
    verifie(!(await estPixel(P)) && retour.jour === avant.jour && retour.circ === avant.circ, 'T12. retour au classique depuis les Réglages : la Récolte garde son jour et son circuit ' + JSON.stringify(retour));
    await ctx.close();
  }

  // ================= T9 : l'impression de la grille reste sobre (même texte, mêmes polices) =================
  if (fait('T9')) {
    const lire = async (apparence) => {
      const { ctx, page: P } = await appareil(nav, PC, apparence, SITE, { view: 'semaine', semPage: 'repartir' });
      await ouvrir(P); await P.waitForSelector('#semGrid tbody tr[data-pid="carotte"]');
      await P.evaluate(() => { window.print = () => {}; });
      await P.click('.sf-imp'); await pause(500);
      await P.emulateMedia({ media: 'print' });
      const f = path.join(TMP, `impression-${apparence}.pdf`);
      await P.pdf({ path: f, preferCSSPageSize: true, printBackground: true });
      await ctx.close();
      return { texte: execFileSync('pdftotext', [f, '-']).toString(), polices: execFileSync('pdffonts', [f]).toString().split('\n').slice(2).filter(Boolean).map((l) => l.split(/\s+/)[0].replace(/^[A-Z]{6}\+/, '')).sort(), f };
    };
    const c = await lire(CLASSIQUE), p = await lire(PIXEL);
    if (c.texte !== p.texte) { let i = 0; while (c.texte[i] === p.texte[i]) i++; console.log('      première différence : classique « ' + c.texte.slice(Math.max(0, i - 40), i + 40).replace(/\n/g, '⏎') + ' » / pixel art « ' + p.texte.slice(Math.max(0, i - 40), i + 40).replace(/\n/g, '⏎') + ' »'); }
    verifie(c.texte.length > 300 && c.texte === p.texte, `T9. impression de la grille : même texte en classique et en pixel art (${c.texte.length} caractères)`);
    verifie(c.polices.join() === p.polices.join() && !p.polices.some((x) => /VT323|PressStart|Press|Signes/i.test(x)), 'T9. impression : mêmes polices, ni Press Start 2P ni VT323 (' + [...new Set(p.polices)].join(', ') + ')');
    if (CAPTURES) { fs.mkdirSync(CAPTURES, { recursive: true }); fs.copyFileSync(p.f, path.join(CAPTURES, 'impression-depuis-pixel-art.pdf')); }
  }

  // ================= T10 : hors ligne =================
  if (fait('T10')) {
    const sw = fs.readFileSync(path.join(RACINE, 'sw.js'), 'utf8');
    const shell = JSON.parse(sw.match(/var SHELL = (\[[^\]]*\])/)[1].replace(/\/\/[^\n]*/g, '').replace(/'/g, '"'));
    const voulus = ['./apparence/fond-ordinateur.png', './apparence/fond-telephone.png', './apparence/cadre-carte.png', './apparence/logo-pixel.png', './apparence/coche-pixel.svg', './apparence/vignette-classique.png', './apparence/vignette-pixel.png', './polices/press-start-2p.woff2', './polices/vt323.woff2', './polices/signes-pixel.woff2'];
    const manque = voulus.filter((f) => !shell.includes(f) || !fs.existsSync(path.join(RACINE, f)));
    verifie(manque.length === 0, 'T10. chaque nouveau fichier existe et est gardé hors ligne (SHELL de sw.js)' + (manque.length ? ' (manque : ' + manque.join(', ') + ')' : ''));
    const html = fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8');
    const bloc = html.slice(html.lastIndexOf('/*', html.indexOf('PIXEL-ART-DEBUT')), html.indexOf('PIXEL-ART-FIN'));
    const appels = [...new Set([...bloc.matchAll(/url\(([^)"']+)\)/g)].map((m) => './' + m[1]))];
    verifie(appels.length >= 7 && appels.every((f) => shell.includes(f)), 'T10. tous les fichiers appelés par le bloc pixel art sont gardés hors ligne (' + appels.length + ')');
    // R6 : tout le style pixel art est dans le bloc, chaque règle commence par :root[data-apparence="pixel"].
    const regles = bloc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@font-face\{[^}]*\}/g, '').replace(/@media[^{]*\{/g, '').match(/[^{}]+(?=\{)/g).map((x) => x.trim()).filter(Boolean);
    const hors = regles.filter((sel) => sel.split(',').some((x) => !x.trim().startsWith(':root[data-apparence="pixel"]')));
    verifie(regles.length > 100 && hors.length === 0 && html.indexOf('PIXEL-ART-DEBUT') > html.indexOf('CHARTE-DOUCE-FIN') && (html.match(/data-apparence="pixel"\]/g) || []).length === (bloc.match(/data-apparence="pixel"\]/g) || []).length,
      `R6. ${regles.length} règles pixel art, toutes dans le bloc PIXEL-ART-DEBUT … FIN (après CHARTE-DOUCE-FIN) et chacune sous :root[data-apparence="pixel"]` + (hors.length ? ' (hors : ' + hors.slice(0, 3).join(' | ') + ')' : ''));
    const faces = (html.match(/@font-face\{[^}]*\}/g) || []).filter((f) => /Press Start 2P|VT323|Signes pixel/.test(f));
    verifie(faces.length === 3 && faces.every((f) => bloc.includes(f)), 'R11. les trois polices pixel sont déclarées seulement dans le bloc pixel art');
    let cacheRef = '';
    try { cacheRef = (execSync(`git -C "${RACINE}" show ${REF}:sw.js`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().match(/var CACHE = '([^']+)'/) || [])[1] || ''; } catch (e) { /* pas de référence */ }
    const cache = (sw.match(/var CACHE = '([^']+)'/) || [])[1];
    verifie(!!cacheRef && cache !== cacheRef, `T10. CACHE changé (${cache} ; ${REF} : ${cacheRef || 'introuvable'})`);
    const { ctx, page: P } = await appareil(nav, TEL, null, SITE, { view: 'recolte' }, true);
    await ouvrir(P);
    await P.evaluate(() => navigator.serviceWorker.ready);
    await P.reload(); await P.waitForSelector('#tabs button[aria-pressed="true"]');
    await attendreQue(() => P.evaluate(() => !!navigator.serviceWorker.controller));
    await pause(1500);
    await ctx.setOffline(true);
    await aller(P, 'reglages', '#regSub [data-reg="apparence"]');
    await P.click('[data-apparence-choix="pixel"]'); await pause(500);
    const horsl = await P.evaluate(async () => {
      const f = async (u) => { try { const r = await fetch(u); return r.ok && (await r.blob()).size > 100; } catch (e) { return false; } };
      await Promise.all(['23px VT323', '18px "Press Start 2P"', '20px "Signes pixel"'].map((x) => document.fonts.load(x).catch(() => null)));
      return { fond: await f('apparence/fond-telephone.png'), cadre: await f('apparence/cadre-carte.png'), polices: document.fonts.check('23px VT323') && document.fonts.check('18px "Press Start 2P"'), attr: document.documentElement.getAttribute('data-apparence') };
    });
    verifie(horsl.attr === 'pixel' && horsl.fond && horsl.cadre && horsl.polices, 'T10. sans réseau, passer en pixel art affiche le fond, le cadre et les polices (gardés par le service) ' + JSON.stringify(horsl));
    await capture(P, 'pixel-telephone-hors-ligne.png');
    await ctx.setOffline(false);
    await ctx.close();
  }

  // ================= T11 : pas plus de 20 % plus lent (processeur ralenti 4 fois) =================
  if (fait('T11')) {
    // 40 produits et 12 débouchés dans Répartir ; 30 produits à récolter le mercredi.
    const deb0 = JSON.parse(fs.readFileSync(path.join(RACINE, 'referentiel/debouches.json'), 'utf8'));
    const debs = JSON.parse(JSON.stringify(deb0.debouches));
    for (let i = 1; i <= 5; i++) debs.push({ id: 'x' + i, nom: 'Client ' + i, colis: 'plastique', livraisons: [{ id: 'x' + i, jours: ['mercredi'] }] });
    const W = D.W, A = D.T0 - 3600000, put = (p, v) => fetch(`http://localhost:${PORT_BASE}/${p}.json`, { method: 'PUT', body: JSON.stringify(v) });
    await put('listes/reglages/debouches', { source: deb0.source, debouches: debs, recoltes: deb0.recoltes, rec: true, by: 'François', at: A });
    const noms = Object.keys(D.FICHES), sem = { produits: {}, q: {} };
    for (let i = 0; i < 40; i++) { const k = noms[i % noms.length], id = k + (i >= noms.length ? '-' + i : ''); sem.produits[id] = { ...D.FICHES[k], nom: D.FICHES[k].nom + (i >= noms.length ? ' ' + i : ''), by: 'François', at: A };
      sem.q[id] = i < 30 ? { mk: { n: 1 + (i % 3), u: 'colis', by: 'François', at: A }, ['x' + (1 + i % 5)]: { n: 1, u: 'colis', by: 'François', at: A } } : { 'ta-mar': { n: 1, u: 'colis', by: 'François', at: A } }; }
    await put('listes/semaines/' + W, sem);
    const mesure = async (apparence, vue, sel) => {
      const { ctx, page: P } = await appareil(nav, PC, apparence, SITE, vue);
      await ouvrir(P); await P.waitForSelector(sel); await pause(1500);
      const cdp = await ctx.newCDPSession(P); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      const t = await P.evaluate(async (b) => { const r = [];
        for (let i = 0; i < 9; i++) { const d = performance.now(); document.querySelector(b).click(); document.body.getBoundingClientRect(); await new Promise((ok) => requestAnimationFrame(() => setTimeout(ok, 0))); r.push(performance.now() - d); }
        r.sort((a, b) => a - b); return r[4]; }, vue.view === 'semaine' ? '#semSub [data-sem="repartir"]' : `#recJours [data-jour="${D.MER}"]`);
      const n = await P.evaluate((s) => document.querySelectorAll(s).length, sel);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      await ctx.close();
      return { t: Math.round(t), n };
    };
    const rc = await mesure(CLASSIQUE, { view: 'semaine', semPage: 'repartir' }, '#semGrid tbody tr[data-pid]'), rp = await mesure(PIXEL, { view: 'semaine', semPage: 'repartir' }, '#semGrid tbody tr[data-pid]');
    verifie(rp.t <= rc.t * 1.2 + 5, `T11. Répartir, ${rp.n} produits et 12 débouchés, processeur ralenti 4 fois : ${rp.t} ms en pixel art contre ${rc.t} ms en classique (au plus 20 % de plus)`);
    const kc = await mesure(CLASSIQUE, { view: 'recolte' }, '#todo li.item'), kp = await mesure(PIXEL, { view: 'recolte' }, '#todo li.item');
    verifie(kp.t <= kc.t * 1.2 + 5, `T11. Récolte, ${kp.n} produits, processeur ralenti 4 fois : ${kp.t} ms en pixel art contre ${kc.t} ms en classique (au plus 20 % de plus)`);
    await put('listes/reglages/debouches', null);
    await D.remplir(`http://localhost:${PORT_BASE}`);
  }

  // ================= T13 : la page du magasin reste en classique, inchangée =================
  if (fait('T13')) {
    let refMag = '';
    try { refMag = execSync(`git -C "${RACINE}" show ${REF}:magasin.html`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString(); } catch (e) { refMag = ''; }
    const ici = fs.readFileSync(path.join(RACINE, 'magasin.html'), 'utf8');
    verifie(!!refMag && refMag === ici, 'T13, R19. magasin.html identique à ' + REF);
    const { ctx, page: M } = await appareil(nav, TEL, PIXEL, SITE);
    await M.goto(SITE + '/magasin'); await pause(1500);
    const m = await M.evaluate(() => ({ attr: document.documentElement.hasAttribute('data-apparence'), cle: localStorage.getItem('recolte.apparence'), fond: getComputedStyle(document.body).backgroundColor, polices: Array.from(document.fonts).filter((f) => f.status === 'loaded').map((f) => f.family.replace(/"/g, '')).join() }));
    verifie(m.cle === '"pixel"' && !m.attr && m.fond === 'rgb(248, 248, 248)' && !/VT323|Press Start/.test(m.polices), 'T13. sur un appareil en pixel art, la page du magasin reste en classique ' + JSON.stringify(m));
    await ctx.close();
  }

  // ================= T2 : l'apparence classique ne change pas d'un point =================
  if (fait('T2')) {
    const refDir = path.join(TMP, 'reference');
    let refOk = false;
    try { fs.mkdirSync(refDir); execSync(`git -C "${RACINE}" archive ${REF} | tar -x -C "${refDir}"`, { stdio: ['ignore', 'ignore', 'pipe'] }); refOk = fs.existsSync(path.join(refDir, 'index.html')); } catch (e) { refOk = false; }
    verifie(refOk, `T2. version de référence (${REF}) extraite pour la comparaison`);
    if (refOk) {
      const siteRef = await serveurSite(refDir, PORT_REF, PORT_BASE_REF);
      const baseRef = await fauxFirebase(PORT_BASE_REF);
      await D.remplir(`http://localhost:${PORT_BASE_REF}`);
      const mer = async (P) => { await P.click(`#recJours [data-jour="${D.MER}"]`); await P.locator('#todo li.item:visible, #prepList li.pitem:visible').first().waitFor(); };
      const VUES_TEL = [
        ['Semaine, Répartir', { view: 'semaine', semPage: 'repartir' }, async (P) => { await P.waitForSelector('section.sp[data-pid="carotte"]'); await P.click('section.sp[data-pid="carotte"] .sp-head'); }],
        ['Semaine, Cumul', { view: 'semaine', semPage: 'cumul' }, async (P) => { await P.waitForSelector('#semTable td'); }],
        ['Semaine, À récolter', { view: 'semaine', semPage: 'recolter' }, async () => {}],
        ['Semaine, Stock', { view: 'semaine', semPage: 'stock' }, async (P) => { await P.waitForSelector('.stk-l'); await P.evaluate(() => scrollTo(0, 300)); }],
        ['Récolte', { view: 'recolte' }, mer],
        ['Récolte, la liste', { view: 'recolte', doneOpen: true }, async (P) => { await mer(P); await P.click('#todo li.item[data-id="carotte"] .more'); await P.evaluate(() => scrollTo(0, document.querySelector('#todo').getBoundingClientRect().top + scrollY)); }],
        ['Préparation par client', { view: 'prep', prepSort: 'client' }, mer],
        ['Préparation par produit', { view: 'prep', prepSort: 'produit' }, mer],
        ['Réglages, Débouchés', { view: 'reglages', regPage: 'debouches' }, async (P) => { await P.waitForSelector('.db-tete'); }],
        ['Réglages, Jours de récolte', { view: 'reglages', regPage: 'recoltes' }, async () => {}],
        ['Historique', { view: 'historique' }, async () => {}],
      ];
      const VUES_PC = [
        ['Semaine, Répartir', { view: 'semaine', semPage: 'repartir' }, async (P) => { await P.waitForSelector('#semGrid tbody tr[data-pid="carotte"]'); }],
        ['Semaine, Répartir (bas)', { view: 'semaine', semPage: 'repartir' }, async (P) => { await P.waitForSelector('#semGrid tbody tr[data-pid="carotte"]'); await P.evaluate(() => scrollTo(0, 1e5)); }],
        ['Semaine, Stock', { view: 'semaine', semPage: 'stock' }, async (P) => { await P.waitForSelector('.stk-l'); }],
        ['Récolte', { view: 'recolte' }, async (P) => { await mer(P); await P.hover('#todo li.item[data-id="carotte"]'); }],
        ['Préparation', { view: 'prep', prepSort: 'client' }, mer],
        ['Réglages, Débouchés', { view: 'reglages', regPage: 'debouches' }, async (P) => { await P.waitForSelector('.db-tete'); }],
      ];
      for (const [nomEcran, opts, vues] of [['téléphone 390 × 844', TEL, VUES_TEL], ['ordinateur 1366 × 768', PC1366, VUES_PC], ['ordinateur 1920 × 1080', PC, VUES_PC]]) {
        for (const [nomVue, ui, faire] of vues) {
          // Deux essais au plus : un point d'écart venu du chargement (police, pastille de connexion) se refait ; une vraie
          // différence revient à chaque fois.
          let n = -1, caps = [];
          for (let essai = 0; essai < 2 && n !== 0; essai++) {
          caps = [];
          for (const s of [SITE, `http://localhost:${PORT_REF}`]) {
            const { ctx, page: P } = await appareil(nav, opts, null, s, ui);
            await P.emulateMedia({ reducedMotion: 'reduce' });
            // Masquages posés avant le premier affichage, pour ne rien redessiner juste avant la capture (un logo redessiné
            // n'a pas toujours exactement les mêmes points) : les pages des Réglages (#regSub ; la 4e, « Apparence », est la
            // différence permise de l'étape 48, et leurs tuiles ont changé le 22/11, vérifiées par tests/reglages-onglets.cjs),
            // et le point rond de la pastille de connexion, dont le bord varie d'un chargement à l'autre même
            // entre main et main (écart jusqu'à 31 sur 255 mesuré le 22/11).
            await P.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = '#regSub{display:none!important}.pill i{visibility:hidden}'; document.head.appendChild(st); }));
            await ouvrir(P);
            await faire(P); await pause(700);
            // Le lien de la page du magasin donne l'adresse du serveur de test, dont le port diffère entre les deux versions.
            await P.evaluate(() => { const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); for (let n; (n = w.nextNode());) if (/localhost:\d+/.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace(/localhost:\d+/g, 'localhost:0000'); });
            // Images (logo) entièrement décodées avant la capture.
            await P.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => {}))));
            await P.mouse.move(0, 0).catch(() => {}); if (nomVue === 'Récolte' && opts !== TEL) await P.hover('#todo li.item[data-id="carotte"]');
            await P.evaluate(() => document.fonts.ready); await pause(300);
            caps.push(await P.screenshot({ animations: 'disabled', caret: 'hide' }));
            await ctx.close();
          }
          const { ctx: cc, page: C } = await appareil(nav, PC, null, SITE); await C.goto(SITE + '/');
          n = await pointsDifferents(C, caps[0], caps[1]); await cc.close();
          }
          verifie(n === 0, `T2. classique, ${nomEcran}, ${nomVue} : ${n} point différent de ${REF}`);
          if (n !== 0 && CAPTURES) { fs.mkdirSync(CAPTURES, { recursive: true }); const f = `T2-${opts === TEL ? 'tel' : opts.viewport.width}-${nomVue.replace(/\W+/g, '-')}`; fs.writeFileSync(path.join(CAPTURES, f + '-branche.png'), caps[0]); fs.writeFileSync(path.join(CAPTURES, f + '-ref.png'), caps[1]); }
        }
      }
      siteRef.close(); baseRef.close();
    }
  }

  await nav.close();
  site.close(); base.close();
  if (!process.env.GARDER) fs.rmSync(TMP, { recursive: true, force: true }); else console.log('fichiers gardés : ' + TMP);
  console.log(echecs ? `\n${echecs} ÉCHEC(S)` : '\nTout est vert.');
  process.exit(echecs ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
