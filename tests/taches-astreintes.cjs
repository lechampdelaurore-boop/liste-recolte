// Aurore Task, étape 36C : les astreintes. Modèles dans la liste Astreintes (jours, zone, heure, « En pause », pastilles
// des jours), « Répartir les astreintes » à la main (menu de la liste, bouton sur l'ordinateur) : copie dans chaque jour à
// la fin de sa zone avec ses sous-tâches et le signe « astreinte », encart supprimé qui revient, aucun doublon au deuxième
// appui, en pause et sans jour ignorées, liste verrouillée laissée telle quelle, copie cochée reposée au prochain appui.
// Lancement depuis la racine du dépôt : node tests/taches-astreintes.cjs   (CAPTURES=dossier pour garder les captures)
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');
const fauxFirebase = require('./faux-firebase.cjs');

const RACINE = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' };
const PORT_SITE = 8964, PORT_BASE = 8965;
const BASE = `http://localhost:${PORT_BASE}`;
const SITE = `http://localhost:${PORT_SITE}`;
const CLE = 'cle-de-test';
const MDP = { francois: 'mdp-francois-1', aurore: 'mdp-aurore-1', martin: 'mdp-martin-1' };
const CAPTURES = process.env.CAPTURES || '';
const IDS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

function serveurSite() {
  return new Promise((ok) => {
    const s = http.createServer((q, r) => {
      let f = decodeURIComponent(new URL(q.url, 'http://x').pathname);
      if (f.endsWith('/')) f += 'index.html';
      if (f === '/taches' || f === '/magasin') f += '.html';
      if (f === '/config.js') { r.writeHead(200, { 'Content-Type': 'text/javascript' }); return r.end(`window.RECOLTE_DB_URL='${BASE}';window.RECOLTE_AUTH_URL='${BASE}/v1';window.RECOLTE_JETON_URL='${BASE}/v1';`); }
      if (f === '/cle-web.js') { r.writeHead(200, { 'Content-Type': 'text/javascript' }); return r.end(`window.RECOLTE_CLE_WEB='${CLE}';`); }
      const chemin = path.join(RACINE, f);
      if (!chemin.startsWith(RACINE) || !fs.existsSync(chemin) || fs.statSync(chemin).isDirectory()) { r.writeHead(404); return r.end(); }
      r.writeHead(200, { 'Content-Type': TYPES[path.extname(chemin)] || 'application/octet-stream' });
      fs.createReadStream(chemin).pipe(r);
    });
    s.listen(PORT_SITE, () => ok(s));
  });
}

let echecs = 0;
function verifie(cond, msg) { console.log((cond ? 'OK    ' : 'ÉCHEC ') + msg); if (!cond) echecs++; }
const attendreQue = async (fn, ms = 8000) => { const fin = Date.now() + ms; while (Date.now() < fin) { try { if (await fn()) return true; } catch (e) { /* page en cours */ } await new Promise((x) => setTimeout(x, 120)); } return false; };
const pause = (ms) => new Promise((x) => setTimeout(x, ms));
const jourIdx = () => (new Date().getDay() + 6) % 7;

// Contenu affiché d'une liste, encart par encart : « rdv: 08:00 Banque, 09:30 Véto | p1: … »
const encarts = (page, L) => page.evaluate((L) => Array.from(document.querySelectorAll(`.pan[data-l="${L}"] .encart`)).map((e) => e.dataset.e + ': ' + Array.from(e.querySelectorAll('li.t[data-id]')).map((li) => (li.querySelector('.tx') || {}).textContent).join(', ')).join(' | '), L);
const tachesBase = (base) => base.lire('taches/t') || {};
const parTexte = (base, texte) => Object.entries(tachesBase(base)).find(([, t]) => t.texte === texte);
const ligne = (L, texte) => `.pan[data-l="${L}"] li.t[data-id]:has(> .tx:has-text("${texte}"))`;

async function connecter(page, id) {
  await page.goto(SITE + '/taches');
  await page.waitForSelector('#authDlg[open]');
  await page.fill('#authId', id);
  await page.fill('#authMdp', MDP[id]);
  await page.click('#authOk');
}
async function glisserDoigt(cdp, x, y, x2, y2) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await pause(650);
  for (let i = 1; i <= 14; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + (x2 - x) * i / 14, y: y + (y2 - y) * i / 14 }] }); await pause(25); }
  await pause(150);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await pause(250);
}
const centre = async (page, sel) => { const b = await page.locator(sel).first().boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, b }; };

(async () => {
  const site = await serveurSite();
  const base = await fauxFirebase(PORT_BASE, { comptes: { cle: CLE } });
  const uid = {};
  for (const id of Object.keys(MDP)) uid[id] = base.creerCompte(id + '@ferme.invalid', MDP[id]);
  base.profil(uid.francois, 'ferme'); base.profil(uid.aurore, 'ferme'); base.profil(uid.martin, 'equipe');

  const navigateur = await chromium.launch();
  const ctxA = await navigateur.newContext({ ...devices['Pixel 5'], locale: 'fr-FR' });
  const A = await ctxA.newPage();
  const erreursA = []; A.on('pageerror', (e) => erreursA.push(String(e)));
  await connecter(A, 'francois');
  await A.waitForSelector('.pan[data-l="astreintes"]');
  await attendreQue(() => A.evaluate(() => document.querySelector('#statut').textContent.includes('Partagé')));
  const AST = 'astreintes';

  // Une tâche déjà là le lundi en P1 : la copie de l'astreinte doit venir après.
  await A.click('#bande .pil[data-l="lundi"]'); await pause(400);
  await A.click('.pan[data-l="lundi"] .plus'); await A.waitForSelector('.pan[data-l="lundi"] textarea.ed');
  await A.keyboard.type('Déjà là'); await A.keyboard.press('Enter'); await A.keyboard.press('Escape');

  // ---------- Les modèles dans la liste Astreintes ----------
  await A.click(`#bande .pil[data-l="${AST}"]`); await pause(400);
  await A.click(`.pan[data-l="${AST}"] .plus`); await A.waitForSelector(`.pan[data-l="${AST}"] textarea.ed`);
  for (const t of ['Irrig serre', 'Contrôle endives', 'Compta', 'Sans jour']) { await A.keyboard.type(t); await A.keyboard.press('Enter'); }
  await A.keyboard.press('Escape');
  verifie(await attendreQue(() => ['Irrig serre', 'Contrôle endives', 'Compta', 'Sans jour'].every((t) => parTexte(base, t))), 'quatre astreintes écrites dans la liste Astreintes');
  const menu = async (texte) => { await A.click(`${ligne(AST, texte)} .pt`); await A.waitForSelector('#tacheDlg[open]'); };
  const fermer = async () => { await A.click('#tacheDlg [data-a="fermer"]'); await pause(200); };
  await menu('Irrig serre');
  verifie(await A.evaluate(() => { const t = document.getElementById('tacheDlg').textContent; return ['Jours', 'Zone', 'En pause', 'Pour qui ?', 'Couleur du texte'].every((x) => t.includes(x)) && document.querySelectorAll('#tacheDlg [data-jour]').length === 7; }), 'menu d\'une astreinte : sept jours, zone, « En pause », pour qui, couleur');
  verifie(await A.evaluate(() => document.querySelector('#tacheDlg [data-azone="p1"]').getAttribute('aria-pressed') === 'true'), 'zone P1 par défaut');
  for (const j of [0, 2, 4]) { await A.click(`#tacheDlg [data-jour="${j}"]`); await pause(80); }
  await A.click('#tacheDlg [data-pour="aurore"]');
  await A.click('#tacheDlg [data-a="sous-tache"]');
  await A.waitForSelector(`.pan[data-l="${AST}"] textarea.ed`);
  await A.keyboard.type('Vanne 1'); await A.keyboard.press('Enter'); await A.keyboard.press('Escape');
  verifie(await attendreQue(() => { const t = parTexte(base, 'Irrig serre')[1]; return t.jours === '024' && t.pour === 'aurore'; }), 'jours lundi, mercredi, vendredi enregistrés (« 024 »), pour Aurore');
  verifie(await attendreQue(() => A.evaluate((s) => { const i = document.querySelector(s + ' .ast-info'); return i && i.textContent === 'LunMerVenP1'; }, `li.t[data-id="${parTexte(base, 'Irrig serre')[0]}"]`)), 'sous l\'astreinte : ses jours en pastilles et sa zone');
  verifie(await A.evaluate(() => !document.querySelector('li.t[data-n="1"] .ast-info')), 'pas de pastilles sous une sous-tâche');

  await menu('Contrôle endives');
  await A.click('#tacheDlg [data-jour="1"]');
  await A.click('#tacheDlg [data-azone="rdv"]');
  await A.waitForSelector('#tacheHeure');
  await A.fill('#tacheHeure', '07:30'); await A.dispatchEvent('#tacheHeure', 'change'); await fermer();
  verifie(await attendreQue(() => { const t = parTexte(base, 'Contrôle endives')[1]; return t.jours === '1' && t.zone === 'rdv' && t.heure === '07:30'; }), 'astreinte du mardi en RDV à 07:30');

  await menu('Compta');
  await A.click('#tacheDlg [data-jour="3"]');
  await A.check('#tachePause'); await fermer();
  verifie(await attendreQue(() => { const t = parTexte(base, 'Compta')[1]; return t.jours === '3' && t.pause === true; }), 'astreinte du jeudi « En pause »');
  verifie(await attendreQue(() => A.evaluate((s) => { const li = document.querySelector(s); return li.classList.contains('en-pause') && li.querySelector('.ast-info').textContent.includes('En pause'); }, `li.t[data-id="${parTexte(base, 'Compta')[0]}"]`)), 'astreinte en pause : grisée, marquée « En pause »');
  verifie(await A.evaluate((s) => document.querySelector(s + ' .ast-info').textContent.startsWith('Aucun jour'), `li.t[data-id="${parTexte(base, 'Sans jour')[0]}"]`), 'astreinte sans jour : « Aucun jour »');

  // Mardi sans encart RDV (supprimé à la main) ; vendredi verrouillé.
  await A.evaluate(() => { supprimerEncart('mardi', 'rdv'); verrouiller('vendredi', true); });
  await attendreQue(() => base.lire('taches/listes/mardi/encarts/rdv') === false && base.lire('taches/listes/vendredi/verrou'));
  const avantRepartir = Object.keys(tachesBase(base)).length;
  verifie(avantRepartir === 6, 'rien n\'est recopié tout seul');

  // ---------- Répartir (menu de la liste Astreintes) ----------
  await A.click(`.pan[data-l="${AST}"] [data-a="menu-liste"]`); await A.waitForSelector('#listeDlg[open]');
  verifie(await A.evaluate(() => document.getElementById('listeDlg').textContent.includes('Répartir les astreintes')), '« ⋯ » de la liste Astreintes : « Répartir les astreintes »');
  await A.click('#listeDlg [data-a="repartir"]');
  verifie(await attendreQue(() => A.evaluate(() => { const b = document.getElementById('bandeau'); return !b.hidden && b.firstElementChild.textContent === '3 tâches posées, 1 en pause, 1 sans jour, 1 dans une liste verrouillée'; })), 'bandeau : « 3 tâches posées, 1 en pause, 1 sans jour, 1 dans une liste verrouillée »');
  const idIrrig = parTexte(base, 'Irrig serre')[0], idCtrl = parTexte(base, 'Contrôle endives')[0];
  const copies = () => Object.entries(tachesBase(base)).filter(([, t]) => /^a:/.test(t.origine || ''));
  verifie(await attendreQue(() => copies().length === 3), 'trois copies dans la base');
  const copie = (L, id) => copies().find(([, t]) => t.liste === L && t.origine === 'a:' + id);
  const cl = copie('lundi', idIrrig), cm = copie('mercredi', idIrrig), cmar = copie('mardi', idCtrl);
  verifie(cl && cm && cl[1].encart === 'p1' && cm[1].encart === 'p1' && cl[1].pour === 'aurore' && cl[1].texte === 'Irrig serre', 'lundi et mercredi : « Irrig serre » en P1, pour Aurore');
  verifie(!copie('vendredi', idIrrig) && !copies().some(([, t]) => t.liste === 'jeudi'), 'rien le vendredi (verrouillé) ni le jeudi (en pause)');
  verifie(cmar && cmar[1].encart === 'rdv' && cmar[1].heure === '07:30', 'mardi : « Contrôle endives » en RDV à 07:30');
  verifie(base.lire('taches/listes/mardi/encarts/rdv') === true, 'l\'encart RDV supprimé du mardi revient pour l\'accueillir');
  const sousL = Object.entries(tachesBase(base)).filter(([, t]) => t.parent === cl[0]);
  verifie(sousL.length === 1 && sousL[0][1].texte === 'Vanne 1' && sousL[0][1].liste === 'lundi' && sousL[0][1].encart === 'p1', 'la sous-tâche « Vanne 1 » est recopiée sous sa tâche');
  await A.click('#bande .pil[data-l="lundi"]'); await pause(500);
  verifie(await attendreQue(async () => (await encarts(A, 'lundi')) === 'rdv:  | p1: Déjà là, Irrig serre, Vanne 1 | p2: '), 'lundi : la copie arrive à la fin de P1, après ce qui y était');
  verifie(await A.evaluate((s) => !!document.querySelector(s + ' .origine') && !document.querySelector(s + ' .ast-info'), `li.t[data-id="${cl[0]}"]`), 'la copie porte le petit signe « astreinte » (sans les pastilles des jours)');

  // ---------- Deuxième appui : aucun doublon ----------
  await A.evaluate(() => repartirAstreintes());
  verifie(await attendreQue(() => A.evaluate(() => document.getElementById('bandeau').firstElementChild.textContent.startsWith('0 tâche posée, 3 déjà présentes'))), 'deuxième appui : « 0 tâche posée, 3 déjà présentes »');
  await pause(500);
  verifie(copies().length === 3, 'aucun doublon dans la base');

  // ---------- Copie modifiée puis cochée : le modèle ne bouge pas ; cochée, elle revient au prochain appui ----------
  await A.click(`li.t[data-id="${cl[0]}"] .tx`); await A.waitForSelector('.pan[data-l="lundi"] textarea.ed');
  await A.fill('.pan[data-l="lundi"] textarea.ed', 'Irrig serre nord'); await pause(100);
  await A.click('.pan[data-l="lundi"] .pan-titre');
  verifie(await attendreQue(() => tachesBase(base)[cl[0]] && tachesBase(base)[cl[0]].texte === 'Irrig serre nord' && tachesBase(base)[idIrrig].texte === 'Irrig serre'), 'modifier la copie ne touche pas au modèle');
  await A.click(`li.t[data-id="${cl[0]}"] .coche`);
  verifie(await attendreQue(() => !tachesBase(base)[cl[0]]), 'copie cochée');
  await A.evaluate(() => repartirAstreintes());
  verifie(await attendreQue(() => A.evaluate(() => document.getElementById('bandeau').firstElementChild.textContent.startsWith('1 tâche posée, 2 déjà présentes'))), 'cochée, elle est reposée au prochain appui (1 posée, 2 déjà présentes)');

  // ---------- Remise en route d'une astreinte en pause ----------
  await A.click(`#bande .pil[data-l="${AST}"]`); await pause(400);
  await menu('Compta'); await A.uncheck('#tachePause'); await fermer();
  verifie(await attendreQue(() => parTexte(base, 'Compta')[1].pause === undefined), 'plus en pause');

  // ---------- Ordinateur : bouton « Répartir les astreintes » en haut ----------
  const ctxP = await navigateur.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fr-FR' });
  const P = await ctxP.newPage();
  const erreursP = []; P.on('pageerror', (e) => erreursP.push(String(e)));
  await connecter(P, 'aurore');
  await P.waitForSelector('.pan[data-l="astreintes"] li.t[data-id]');
  verifie(await P.evaluate(() => { const b = document.querySelector('.outils [data-a="repartir"]'); return b && b.offsetWidth > 0 && b.classList.contains('secondaire'); }), 'ordinateur : bouton secondaire « Répartir les astreintes » en haut');
  verifie(await A.evaluate(() => { const b = document.querySelector('.outils [data-a="repartir"]'); return !b || b.offsetWidth === 0; }), 'téléphone : pas de bouton en haut (le « ⋯ » de la liste)');
  await P.click('.outils [data-a="repartir"]');
  verifie(await attendreQue(() => copies().some(([, t]) => t.liste === 'jeudi' && t.texte === 'Compta')), 'la Compta, remise en route, arrive le jeudi');
  verifie(await attendreQue(() => P.evaluate(() => document.getElementById('bandeau').firstElementChild.textContent.startsWith('1 tâche posée, 3 déjà présentes'))), 'bandeau : 1 posée, 3 déjà présentes');

  if (CAPTURES) {
    fs.mkdirSync(CAPTURES, { recursive: true });
    await A.click(`#bande .pil[data-l="${AST}"]`); await pause(500);
    await A.screenshot({ path: path.join(CAPTURES, 'telephone-astreintes.png') });
    await menu('Contrôle endives'); await pause(300);
    await A.screenshot({ path: path.join(CAPTURES, 'telephone-menu-astreinte.png') });
    await fermer();
    await A.click('#bande .pil[data-l="mardi"]'); await pause(500);
    await A.screenshot({ path: path.join(CAPTURES, 'telephone-mardi.png') });
    await P.screenshot({ path: path.join(CAPTURES, 'ordinateur.png') });
  }

  const erreurs = erreursA.concat(erreursP);
  verifie(!erreurs.length, 'aucune erreur JavaScript' + (erreurs.length ? ' : ' + erreurs.join(' / ') : ''));
  await navigateur.close(); site.close(); base.close();
  console.log(echecs ? `\n${echecs} vérification(s) en échec.` : '\nTout est bon.');
  process.exit(echecs ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
