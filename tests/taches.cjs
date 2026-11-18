// Aurore Task (étape 36A, le socle) : la page des tâches qui remplace Google Tasks (docs/CAHIER_DES_CHARGES_AURORE_TASK.md).
// Deux téléphones simulés et un ordinateur, sur le faux Firebase (règle « taches » : profils « ferme » et « equipe ») :
// connexion (même compte que le Cumul), listes de départ (sept jours + Astreintes) créées une seule fois, ouverture sur la
// liste du jour, « + » puis Entrée en rafale, modification du texte, sous-tâches sur plusieurs niveaux, séparateur,
// cocher avec « Annuler », « Faites récemment » (remettre, effacement après 7 jours), glisser au doigt (appui long, dans la
// liste, en sous-tâche, d'une liste à l'autre par le bord de l'écran), glisser à la souris (d'une colonne à l'autre,
// colonnes déplacées), balayage entre les listes, listes créées, renommées, supprimées, partage en direct, hors ligne,
// installable (manifeste, icônes, service), compte de l'équipe, compte refusé, charte d'origine du module d'irrigation.
// Lancement depuis la racine du dépôt : node tests/taches.cjs   (CAPTURES=dossier pour garder les captures)
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');
const fauxFirebase = require('./faux-firebase.cjs');

const RACINE = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' };
const PORT_SITE = 8960, PORT_BASE = 8961;
const BASE = `http://localhost:${PORT_BASE}`;
const SITE = `http://localhost:${PORT_SITE}`;
const CLE = 'cle-de-test';
const MDP = { francois: 'mdp-francois-1', aurore: 'mdp-aurore-1', martin: 'mdp-martin-1', tresallier: 'mdp-magasin-1' };
const CAPTURES = process.env.CAPTURES || '';
const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

function serveurSite() {
  return new Promise((ok) => {
    const s = http.createServer((q, r) => {
      let f = decodeURIComponent(new URL(q.url, 'http://x').pathname);
      if (f.endsWith('/')) f += 'index.html';
      if (f === '/taches' || f === '/magasin') f += '.html'; // comme Cloudflare Pages
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

// Les tâches d'une liste, dans l'ordre affiché, avec leur niveau : [{texte, n, sep}]
const lignes = (page, L) => page.evaluate((L) => Array.from(document.querySelectorAll(`.pan[data-l="${L}"] ul.taches > li.t[data-id]`)).map((li) => ({ id: li.dataset.id, texte: li.classList.contains('sep') ? '------' : (li.querySelector('.tx') || {}).textContent, n: +li.dataset.n })), L);
const textes = async (page, L) => (await lignes(page, L)).map((x) => '  '.repeat(x.n) + x.texte).join(' | ');
const tachesBase = (base) => base.lire('taches/t') || {};
const parTexte = (base, texte) => Object.entries(tachesBase(base)).find(([, t]) => t.texte === texte);

async function connecter(page, id) {
  await page.goto(SITE + '/taches');
  await page.waitForSelector('#authDlg[open]');
  await page.fill('#authId', id);
  await page.fill('#authMdp', MDP[id]);
  await page.click('#authOk');
}
// Appui long au doigt (0,45 s et plus), puis glisser jusqu'à (x2, y2), par étapes ; « tenir » ms contre le point d'arrivée.
async function glisserDoigt(page, cdp, x, y, x2, y2, tenir = 0) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await pause(650);
  for (let i = 1; i <= 14; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + (x2 - x) * i / 14, y: y + (y2 - y) * i / 14 }] }); await pause(25); }
  if (tenir) { const fin = Date.now() + tenir; while (Date.now() < fin) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x2, y: y2 }] }); await pause(100); } }
  await pause(150);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await pause(250);
}
const centre = async (page, sel) => { const b = await page.locator(sel).first().boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, b }; };
const ligneDe = (texte) => `li.t:has(> .tx:text-is("${texte}"))`;

(async () => {
  const site = await serveurSite();
  const base = await fauxFirebase(PORT_BASE, { comptes: { cle: CLE } });
  const uid = {};
  for (const id of Object.keys(MDP)) uid[id] = base.creerCompte(id + '@ferme.invalid', MDP[id]);
  base.profil(uid.francois, 'ferme'); base.profil(uid.aurore, 'ferme'); base.profil(uid.martin, 'equipe'); base.profil(uid.tresallier, 'magasin:ta');

  // ---------- Fichiers : page, manifeste, icônes, service, règle ----------
  const html = fs.readFileSync(path.join(RACINE, 'taches.html'), 'utf8');
  const man = JSON.parse(fs.readFileSync(path.join(RACINE, 'taches.webmanifest'), 'utf8'));
  verifie(man.name === 'Aurore Task' && man.short_name === 'Aurore Task' && man.display === 'standalone' && man.start_url === './taches' && man.id === './taches', 'manifeste à part : « Aurore Task », plein écran, ouvre /taches');
  verifie(man.icons.length === 3 && man.icons.every((i) => fs.existsSync(path.join(RACINE, i.src))) && man.icons.some((i) => i.purpose === 'maskable'), 'icônes de l\'appli présentes (dont l\'icône « maskable » d\'Android)');
  verifie(/rel="manifest" href="taches\.webmanifest"/.test(html) && /apple-touch-icon" href="icons\/taches-180\.png"/.test(html) && fs.existsSync(path.join(RACINE, 'icons/taches-180.png')), 'la page déclare son manifeste et son icône pour l\'iPhone');
  const sw = fs.readFileSync(path.join(RACINE, 'sw.js'), 'utf8');
  verifie(/\/taches/.test(sw) && /register\('sw\.js'\)/.test(html), 'le service hors ligne sert aussi la page des tâches (sans retomber sur le Cumul)');
  const regles = JSON.parse(fs.readFileSync(path.join(RACINE, 'docs/regles-base/fermees.json'), 'utf8')).rules;
  verifie(regles.taches && /'ferme'/.test(regles.taches['.read']) && /'equipe'/.test(regles.taches['.read']) && regles.taches['.read'] === regles.taches['.write'] && !/equipe/.test(JSON.stringify(regles.listes)), 'règle « taches » : ferme et équipe lisent et écrivent les tâches ; l\'équipe n\'ouvre pas les listes de vente');
  verifie(!/fonts\.googleapis|fonts\.gstatic|https?:\/\/(?!localhost)/.test(html.replace(/https:\/\/(identitytoolkit|securetoken)\.googleapis\.com\/v1/g, '')), 'aucune ressource chargée depuis un autre site');
  verifie(!/Champ de l'Aurore|Tronget|François|Aurore'|Martin/.test(html.replace(/Aurore Task/g, '')), 'rien de propre à la ferme dans le code (ni prénom ni nom de ferme)');

  const navigateur = await chromium.launch();
  const tel = devices['Pixel 5'];
  const ctxA = await navigateur.newContext({ ...tel, locale: 'fr-FR' });
  const A = await ctxA.newPage();
  const erreursA = []; A.on('pageerror', (e) => erreursA.push(String(e)));
  const cdpA = await ctxA.newCDPSession(A);

  // ---------- Connexion, listes de départ, ouverture sur la liste du jour ----------
  await connecter(A, 'francois');
  verifie(await attendreQue(() => A.evaluate(() => document.querySelectorAll('#piste .pan').length === 8)), 'listes de départ : les sept jours et Astreintes');
  const listes0 = base.lire('taches/listes') || {};
  verifie(Object.keys(listes0).length === 8 && JOURS.every((j, i) => Object.values(listes0).some((l) => l.nom === j && l.type === 'jour' && l.jour === i)) && Object.values(listes0).some((l) => l.type === 'astreintes'), 'dans la base : sept listes « jour » numérotées et la liste Astreintes');
  const jour = JOURS[jourIdx()], LJ = Object.keys(listes0).find((k) => listes0[k].jour === jourIdx());
  verifie(await attendreQue(() => A.evaluate(() => { const p = document.querySelector('.pil.on'); return p && p.textContent; }).then((t) => t === jour)), `ouverture sur la liste du jour (${jour}), pastille verte dans la bande du bas`);
  const visible = async (page) => page.evaluate(() => { const pi = document.getElementById('piste'); const r = pi.getBoundingClientRect(); const p = Array.from(pi.children).find((x) => { const b = x.getBoundingClientRect(); return Math.abs(b.left - r.left) < 3; }); return p ? p.querySelector('.pan-titre').textContent : null; });
  verifie(await attendreQue(async () => (await visible(A)) === jour), 'la liste du jour est celle qu\'on voit à l\'écran');
  verifie(await A.evaluate(() => JSON.parse(localStorage.getItem('recolte.compte')).id === 'francois'), 'compte gardé sous la même clé que le Cumul (connecté une fois pour les deux)');
  verifie(await attendreQue(() => A.evaluate(() => document.querySelector('#statut').textContent.includes('Partagé'))), 'statut « Partagé »');

  // ---------- « + » puis Entrée en rafale ----------
  await A.click(`.pan[data-l="${LJ}"] .plus`);
  await A.waitForSelector(`.pan[data-l="${LJ}"] textarea.ed`);
  verifie(await A.evaluate(() => document.activeElement && document.activeElement.matches('textarea.ed')), 'un appui sur « + » : la ligne s\'ouvre, on écrit tout de suite');
  await A.keyboard.type('Plantation endive'); await A.keyboard.press('Enter');
  verifie(await A.evaluate(() => document.activeElement && document.activeElement.matches('textarea.ed') && document.activeElement.value === ''), 'Entrée enregistre et ouvre la ligne suivante (saisie en rafale)');
  await A.keyboard.type('Irrig plants'); await A.keyboard.press('Enter');
  await A.keyboard.type('Contrôle et irrig Endives'); await A.keyboard.press('Enter');
  await A.keyboard.press('Enter');
  verifie(await A.evaluate(() => !document.querySelector('textarea.ed')), 'Entrée sur une ligne vide : la saisie se ferme');
  verifie((await textes(A, LJ)) === 'Plantation endive | Irrig plants | Contrôle et irrig Endives', 'trois tâches, dans l\'ordre tapé');
  verifie(await attendreQue(() => Object.values(tachesBase(base)).length === 3 && Object.values(tachesBase(base)).every((t) => t.liste === LJ && t.by === 'francois' && t.parent === '')), 'enregistrées dans la base (taches/t), avec qui et quand');

  // Deuxième téléphone : le partage en direct.
  const ctxB = await navigateur.newContext({ ...tel, locale: 'fr-FR' });
  const B = await ctxB.newPage();
  const erreursB = []; B.on('pageerror', (e) => erreursB.push(String(e)));
  const cdpB = await ctxB.newCDPSession(B);
  await connecter(B, 'aurore');
  verifie(await attendreQue(async () => (await textes(B, LJ)) === 'Plantation endive | Irrig plants | Contrôle et irrig Endives'), 'deuxième téléphone : les mêmes tâches');
  verifie(Object.keys(base.lire('taches/listes')).length === 8, 'les listes de départ ne sont pas recréées par le deuxième téléphone');

  // ---------- Modifier le texte en le touchant ----------
  await A.click(`.pan[data-l="${LJ}"] ${ligneDe('Irrig plants')} .tx`);
  await A.waitForSelector(`.pan[data-l="${LJ}"] textarea.ed`);
  await A.fill(`.pan[data-l="${LJ}"] textarea.ed`, 'Irrig plants serre 2');
  await A.keyboard.press('Escape');
  verifie((await textes(A, LJ)).includes('Irrig plants |'), 'Échap annule la modification');
  await A.click(`.pan[data-l="${LJ}"] ${ligneDe('Irrig plants')} .tx`);
  await A.fill(`.pan[data-l="${LJ}"] textarea.ed`, 'Irrig plants serre 2 et vérifier le goutte-à-goutte de la planche 14 qui fuit depuis lundi');
  await A.click(`.pan[data-l="${LJ}"] .pan-titre`);
  verifie(await attendreQue(async () => (await textes(B, LJ)).includes('Irrig plants serre 2 et vérifier le goutte-à-goutte de la planche 14 qui fuit depuis lundi')), 'texte modifié en le touchant, vu sur l\'autre téléphone');
  const haut = await A.locator(`.pan[data-l="${LJ}"] ${ligneDe('Irrig plants serre 2 et vérifier le goutte-à-goutte de la planche 14 qui fuit depuis lundi')}`).boundingBox();
  verifie(haut && haut.height > 50, 'une tâche longue tient sur plusieurs lignes (texte jamais coupé)');
  await A.click(`.pan[data-l="${LJ}"] ${ligneDe('Irrig plants serre 2 et vérifier le goutte-à-goutte de la planche 14 qui fuit depuis lundi')} .tx`);
  await A.fill(`.pan[data-l="${LJ}"] textarea.ed`, 'Irrig plants');
  await A.keyboard.press('Enter'); await A.keyboard.press('Enter');

  // ---------- Sous-tâches sur plusieurs niveaux (menu de la tâche) ----------
  const menuTache = async (page, L, texte) => { await page.click(`.pan[data-l="${L}"] ${ligneDe(texte)} .pt`); await page.waitForSelector('#tacheDlg[open]'); };
  await menuTache(A, LJ, 'Plantation endive');
  verifie(await A.evaluate(() => ['Ajouter une sous-tâche', 'Décaler à droite', 'Décaler à gauche', 'Déplacer vers une autre liste', 'Ajouter un séparateur en dessous', 'Supprimer la tâche'].every((t) => document.querySelector('#tacheDlg').textContent.includes(t))), 'menu de la tâche : sous-tâche, décaler, déplacer, séparateur, supprimer');
  await A.click('#tacheDlg [data-a="sous-tache"]');
  await A.waitForSelector(`.pan[data-l="${LJ}"] textarea.ed`);
  await A.keyboard.type('Rang 1'); await A.keyboard.press('Enter');
  await A.keyboard.type('Rang 2'); await A.keyboard.press('Enter'); await A.keyboard.press('Enter');
  await menuTache(A, LJ, 'Rang 2');
  await A.click('#tacheDlg [data-a="sous-tache"]');
  await A.keyboard.type('Arroser après'); await A.keyboard.press('Enter'); await A.keyboard.press('Enter');
  await menuTache(A, LJ, 'Arroser après');
  await A.click('#tacheDlg [data-a="sous-tache"]');
  await A.keyboard.type('Vérifier la pression'); await A.keyboard.press('Enter'); await A.keyboard.press('Enter');
  let L1 = await lignes(A, LJ);
  verifie(L1.map((x) => x.texte + ':' + x.n).join(' ') === 'Plantation endive:0 Rang 1:1 Rang 2:1 Arroser après:2 Vérifier la pression:3 Irrig plants:0 Contrôle et irrig Endives:0', 'sous-tâches sur quatre niveaux (sans limite)');
  const decal = await A.evaluate((L) => Array.from(document.querySelectorAll(`.pan[data-l="${L}"] li.t[data-id]`)).map((li) => li.querySelector('.coche').getBoundingClientRect().left), LJ);
  verifie(decal[1] > decal[0] && decal[3] > decal[2] && decal[4] > decal[3], 'chaque niveau est décalé vers la droite');
  await menuTache(A, LJ, 'Rang 2');
  await A.click('#tacheDlg [data-a="gauche"]');
  verifie((await textes(A, LJ)).startsWith('Plantation endive |   Rang 1 | Rang 2 |   Arroser après |     Vérifier la pression | Irrig plants'), 'décaler à gauche : la tâche remonte d\'un niveau, ses sous-tâches la suivent');
  await menuTache(A, LJ, 'Rang 2');
  await A.click('#tacheDlg [data-a="droite"]');
  verifie((await textes(A, LJ)).startsWith('Plantation endive |   Rang 1 |   Rang 2 |     Arroser après |       Vérifier la pression | Irrig plants'), 'décaler à droite : sous-tâche de la tâche du dessus');

  // ---------- Séparateur ----------
  await menuTache(A, LJ, 'Irrig plants');
  await A.click('#tacheDlg [data-a="separateur"]');
  verifie((await textes(A, LJ)).endsWith('Irrig plants | ------ | Contrôle et irrig Endives'), 'séparateur ajouté en dessous par le menu');
  await A.click(`.pan[data-l="${LJ}"] .plus`);
  await A.keyboard.type('------'); await A.keyboard.press('Enter'); await A.keyboard.press('Enter');
  verifie(await A.evaluate((L) => document.querySelectorAll(`.pan[data-l="${L}"] li.t.sep`).length === 2, LJ), 'taper « ------ » fait aussi un séparateur');
  verifie(Object.values(tachesBase(base)).filter((t) => t.sep).length === 2 || await attendreQue(() => Object.values(tachesBase(base)).filter((t) => t.sep).length === 2), 'séparateurs enregistrés comme tels');
  // Supprimer le séparateur du haut (menu du séparateur).
  await A.click(`.pan[data-l="${LJ}"] li.t.sep .pt`);
  await A.waitForSelector('#tacheDlg[open]');
  verifie(await A.evaluate(() => document.querySelector('#tacheDlg [data-a="supprimer-tache"]').textContent === 'Supprimer le séparateur'), 'le séparateur a son menu (supprimer, déplacer)');
  await A.click('#tacheDlg [data-a="supprimer-tache"]');
  verifie(await A.evaluate((L) => document.querySelectorAll(`.pan[data-l="${L}"] li.t.sep`).length === 1, LJ), 'séparateur supprimé');

  // ---------- Cocher : disparaît, avec ses sous-tâches ; « Annuler » ----------
  await A.click(`.pan[data-l="${LJ}"] ${ligneDe('Plantation endive')} .coche`);
  const anim = await A.evaluate((L) => Array.from(document.querySelectorAll(`.pan[data-l="${L}"] li.t.vient-coche`)).map((li) => [li.querySelector('.tx') ? li.querySelector('.tx').textContent : '', getComputedStyle(li).animationName]), LJ);
  verifie(anim.length === 5 && anim[0][0] === 'Plantation endive' && /coche-ligne/.test(anim[0][1]), 'cocher : animation comme dans le Cumul (la tâche et ses sous-tâches restent un instant, en vert)');
  await pause(1200);
  const vert = await A.evaluate((L) => { const li = document.querySelector(`.pan[data-l="${L}"] li.t.vient-coche`); return li && getComputedStyle(li).backgroundColor; }, LJ);
  verifie(vert === 'rgb(11, 105, 77)', 'pendant l\'animation : fond vert plein');
  verifie(await attendreQue(async () => !(await textes(A, LJ)).includes('Plantation endive') && !(await A.evaluate(() => document.querySelector('li.vient-coche'))), 4000), 'puis la tâche et ses sous-tâches disparaissent (environ 3 secondes)');
  verifie(await A.evaluate(() => !document.getElementById('bandeau').hidden && document.getElementById('bandeau').textContent.includes('Faite : Plantation endive')), 'bandeau « Faite : … » avec « Annuler »');
  verifie(await attendreQue(() => !parTexte(base, 'Plantation endive') && Object.values(base.lire('taches/faites') || {}).some((f) => f.texte === 'Plantation endive' && Object.keys(f.t).length === 5)), 'dans la base : retirée des tâches, gardée dans « faites » avec ses 4 sous-tâches');
  await A.click('#bandeau [data-a="annuler"]');
  verifie((await textes(A, LJ)).startsWith('Plantation endive |   Rang 1 |   Rang 2 |     Arroser après'), '« Annuler » remet la tâche et ses sous-tâches à leur place');
  verifie(await attendreQue(() => !!parTexte(base, 'Vérifier la pression') && !Object.values(base.lire('taches/faites') || {}).some((f) => f.texte === 'Plantation endive')), 'remise aussi dans la base');
  // Toucher de nouveau la case pendant l'animation remet la tâche.
  await A.click(`.pan[data-l="${LJ}"] ${ligneDe('Irrig plants')} .coche`);
  await pause(400);
  await A.click(`.pan[data-l="${LJ}"] li.vient-coche .coche`);
  await pause(300);
  verifie(await attendreQue(async () => (await textes(A, LJ)).includes('Irrig plants') && !(await A.evaluate(() => document.querySelector('li.vient-coche')))), 'toucher la case pendant l\'animation remet la tâche');
  verifie(await attendreQue(() => !!parTexte(base, 'Irrig plants')), 'remise dans la base');
  await A.click(`.pan[data-l="${LJ}"] ${ligneDe('Contrôle et irrig Endives')} .coche`);
  await pause(3300);
  // « Faites récemment » (menu de la liste) : remettre.
  await A.click(`.pan[data-l="${LJ}"] .menu-l`);
  await A.waitForSelector('#listeDlg[open]');
  verifie(await A.evaluate(() => document.querySelector('#listeDlg').textContent.includes('Faites récemment')), 'menu de la liste : « Faites récemment »');
  await A.click('#listeDlg [data-a="faites"]');
  await A.waitForSelector('#choixDlg[open]');
  verifie(await A.evaluate(() => document.querySelector('#choixListe').textContent.includes('Contrôle et irrig Endives') && document.querySelector('#choixListe').textContent.includes('par francois')), '« Faites récemment » montre la tâche cochée, par qui');
  await A.click('#choixListe [data-f]');
  await A.click('#choixDlg [data-a="fermer"]');
  verifie((await textes(A, LJ)).includes('Contrôle et irrig Endives'), '« Remettre » la remet dans sa liste');

  // ---------- Glisser au doigt : appui long, dans la liste ----------
  verifie((await textes(B, LJ)).endsWith('Irrig plants | ------ | Contrôle et irrig Endives'), 'autre téléphone à jour avant de glisser');
  let a = await centre(B, `.pan[data-l="${LJ}"] ${ligneDe('Contrôle et irrig Endives')} .tx`);
  let c = await centre(B, `.pan[data-l="${LJ}"] ${ligneDe('Plantation endive')}`);
  await glisserDoigt(B, cdpB, a.x, a.y, a.x, c.b.y + 4);
  verifie((await textes(B, LJ)).startsWith('Contrôle et irrig Endives | Plantation endive'), 'appui long puis glisser : la tâche monte en haut de la liste');
  verifie(await attendreQue(async () => (await textes(A, LJ)).startsWith('Contrôle et irrig Endives | Plantation endive')), 'nouvel ordre vu sur l\'autre téléphone');
  // Un glisser rapide (sans appui long) fait défiler, ne déplace rien.
  const avantRapide = await textes(B, LJ);
  a = await centre(B, `.pan[data-l="${LJ}"] ${ligneDe('Irrig plants')} .tx`);
  await cdpB.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: a.x, y: a.y }] });
  for (let i = 1; i <= 6; i++) { await cdpB.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: a.x, y: a.y - i * 15 }] }); await pause(20); }
  await cdpB.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await pause(500);
  verifie((await textes(B, LJ)) === avantRapide, 'un glisser rapide sans appui long ne déplace rien');
  // Glisser vers la droite sous une tâche : devient sa sous-tâche (avec ses sous-tâches à elle).
  a = await centre(B, `.pan[data-l="${LJ}"] ${ligneDe('Irrig plants')} .tx`);
  c = await centre(B, `.pan[data-l="${LJ}"] ${ligneDe('Contrôle et irrig Endives')}`);
  await glisserDoigt(B, cdpB, a.x, a.y, a.x + 30, c.b.y + c.b.height - 2);
  verifie((await textes(B, LJ)).startsWith('Contrôle et irrig Endives |   Irrig plants | Plantation endive'), 'glisser un peu vers la droite : sous-tâche de la tâche du dessus');

  // ---------- Glisser d'une liste à l'autre : tenir contre le bord de l'écran ----------
  const ids = await B.evaluate(() => Array.from(document.querySelectorAll('#piste .pan')).map((p) => p.dataset.l));
  const LS = ids[ids.indexOf(LJ) + 1] || ids[ids.indexOf(LJ) - 1], vers = ids.indexOf(LS) > ids.indexOf(LJ) ? 1 : -1;
  a = await centre(B, `.pan[data-l="${LJ}"] ${ligneDe('Plantation endive')} .tx`);
  const W = await B.evaluate(() => innerWidth);
  await glisserDoigt(B, cdpB, a.x, a.y, vers > 0 ? W - 8 : 8, 300, 1100);
  verifie(await attendreQue(async () => (await textes(B, LS)).startsWith('Plantation endive |   Rang 1 |   Rang 2 |     Arroser après |       Vérifier la pression')), `tenue contre le bord : la tâche passe dans la liste voisine (${listes0[LS].nom}) avec ses sous-tâches`);
  verifie(!(await textes(B, LJ)).includes('Plantation endive'), 'et quitte la liste du jour');
  verifie(await attendreQue(() => { const t = tachesBase(base); return ['Plantation endive', 'Rang 1', 'Rang 2', 'Arroser après', 'Vérifier la pression'].every((x) => Object.values(t).some((y) => y.texte === x && y.liste === LS)); }), 'dans la base, les sous-tâches ont suivi');
  verifie(await attendreQue(async () => (await textes(A, LS)).startsWith('Plantation endive')), 'vu sur l\'autre téléphone');

  // ---------- Balayage entre les listes, bande du bas ----------
  await A.click(`#bande .pil[data-l="${LJ}"]`);
  await attendreQue(async () => (await visible(A)) === listes0[LJ].nom);
  const piste = await centre(A, '#piste');
  await cdpA.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: piste.x + 120, y: piste.y }] });
  for (let i = 1; i <= 10; i++) { await cdpA.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: piste.x + 120 - i * 26, y: piste.y }] }); await pause(16); }
  await cdpA.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const apres = ids[ids.indexOf(LJ) + 1] ? listes0[ids[ids.indexOf(LJ) + 1]].nom : null;
  if (apres) {
    verifie(await attendreQue(async () => (await visible(A)) === apres, 4000), `balayer vers la gauche : la liste suivante (${apres})`);
    verifie(await attendreQue(async () => (await A.evaluate(() => document.querySelector('.pil.on').textContent)) === apres, 3000), 'la bande du bas suit (pastille verte)');
  } else { verifie(true, 'balayage : dimanche est la dernière liste (non essayé vers la droite)'); verifie(true, 'bande du bas (non essayé)'); }
  await A.click('#bande .pil[data-l="astreintes"]');
  verifie(await attendreQue(async () => (await visible(A)) === 'Astreintes'), 'toucher un nom dans la bande ouvre cette liste');

  // ---------- Listes : créer, renommer, déplacer (appui long dans la bande), supprimer ----------
  await A.click('#bande .pil.nouv');
  await A.waitForSelector('#nomDlg[open]');
  await A.fill('#nomVal', 'Check-list marché');
  await A.click('#nomForm [type="submit"]');
  verifie(await attendreQue(async () => (await visible(A)) === 'Check-list marché'), 'nouvelle liste créée, affichée tout de suite');
  verifie(await attendreQue(() => Object.values(base.lire('taches/listes')).some((l) => l.nom === 'Check-list marché' && l.type === 'simple')), 'nouvelle liste dans la base (liste simple)');
  const idMarche = await A.evaluate(() => document.querySelector('.pil.on').dataset.l);
  await A.click(`.pan[data-l="${idMarche}"] .menu-l`);
  await A.click('#listeDlg [data-a="renommer"]');
  await A.fill('#nomVal', 'Marché');
  await A.click('#nomForm [type="submit"]');
  verifie(await attendreQue(async () => (await A.evaluate(() => document.querySelector('.pil.on').textContent)) === 'Marché' && base.lire(`taches/listes/${idMarche}/nom`) === 'Marché'), 'liste renommée');
  // Appui long sur « Marché » dans la bande, glissé avant « Lundi ».
  await A.evaluate(() => { document.getElementById('bande').scrollLeft = 0; });
  await pause(100);
  const pLundi = await centre(A, '#bande .pil[data-l="lundi"]');
  await A.evaluate((id) => document.querySelector(`#bande .pil[data-l="${id}"]`).scrollIntoView({ inline: 'nearest' }), idMarche);
  await pause(150);
  let pM = await centre(A, `#bande .pil[data-l="${idMarche}"]`);
  await A.evaluate(() => { document.getElementById('bande').scrollLeft = 0; });
  await pause(100);
  // La bande défile pendant le glisser quand on tient près de son bord : on part de la pastille visible.
  await A.evaluate((id) => { const b = document.getElementById('bande'); const p = document.querySelector(`#bande .pil[data-l="${id}"]`); b.scrollLeft = p.offsetLeft - 60; }, idMarche);
  await pause(150);
  pM = await centre(A, `#bande .pil[data-l="${idMarche}"]`);
  await glisserDoigt(A, cdpA, pM.x, pM.y, 12, pM.y, 2500);
  verifie(await attendreQue(() => A.evaluate(() => document.querySelector('#bande .pil[data-l]').textContent === 'Marché')), 'appui long sur un nom de la bande : la liste se déplace (ici en premier)');
  verifie(await attendreQue(() => { const l = base.lire('taches/listes'); return Object.keys(l).sort((x, y) => l[x].ordre - l[y].ordre)[0] === idMarche; }), 'nouvel ordre des listes dans la base');
  verifie(await attendreQue(() => B.evaluate(() => document.querySelector('#bande .pil[data-l]').textContent === 'Marché')), 'nouvel ordre vu sur l\'autre téléphone');
  // Menu d'un jour : pas de « Supprimer » ; liste simple : supprimer avec confirmation.
  await A.click('#bande .pil[data-l="lundi"]');
  await attendreQue(async () => (await visible(A)) === 'Lundi');
  await A.click('.pan[data-l="lundi"] .menu-l');
  await A.waitForSelector('#listeDlg[open]');
  verifie(await A.evaluate(() => !document.querySelector('#listeDlg [data-a="supprimer-liste"]')), 'un jour ne peut pas être supprimé');
  await A.click('#listeDlg [data-a="fermer"]');
  await A.click(`#bande .pil[data-l="${idMarche}"]`);
  await A.click(`.pan[data-l="${idMarche}"] .plus`);
  await A.keyboard.type('Tonnelle'); await A.keyboard.press('Enter'); await A.keyboard.press('Enter');
  await A.click(`.pan[data-l="${idMarche}"] .menu-l`);
  await A.click('#listeDlg [data-a="supprimer-liste"]');
  await A.waitForSelector('#confDlg[open]');
  verifie(await A.evaluate(() => document.querySelector('#confTexte').textContent.includes('Marché') && document.querySelector('#confTexte').textContent.includes('1 tâche')), 'supprimer une liste demande confirmation (avec le nombre de tâches)');
  await A.click('#confOui');
  verifie(await attendreQue(() => !base.lire(`taches/listes/${idMarche}`) && !parTexte(base, 'Tonnelle')), 'liste et tâches supprimées de la base');
  verifie(await attendreQue(() => B.evaluate((id) => !document.querySelector(`.pan[data-l="${id}"]`), idMarche)), 'liste disparue sur l\'autre téléphone');

  // ---------- Déplacer vers une autre liste (menu) ----------
  await A.click(`#bande .pil[data-l="${LJ}"]`);
  await menuTache(A, LJ, 'Contrôle et irrig Endives');
  await A.click('#tacheDlg [data-a="deplacer"]');
  await A.waitForSelector('#choixDlg[open]');
  await A.click('#choixListe [data-l="astreintes"]');
  verifie(await attendreQue(async () => (await textes(A, 'astreintes')).startsWith('Contrôle et irrig Endives |   Irrig plants')), 'menu « Déplacer vers une autre liste » : en haut de la liste choisie, avec ses sous-tâches');

  // ---------- Hors ligne ----------
  await ctxA.setOffline(true);
  await pause(300);
  await A.click(`#bande .pil[data-l="${LJ}"]`);
  await A.click(`.pan[data-l="${LJ}"] .plus`);
  await A.keyboard.type('Écrite sans réseau'); await A.keyboard.press('Enter'); await A.keyboard.press('Enter');
  verifie((await textes(A, LJ)).includes('Écrite sans réseau'), 'sans réseau : la tâche s\'ajoute quand même');
  verifie(await attendreQue(() => A.evaluate(() => document.querySelector('#statut').textContent.includes('Hors ligne'))), 'statut « Hors ligne · 1 en attente »');
  verifie(!parTexte(base, 'Écrite sans réseau'), 'pas encore dans la base');
  // (Playwright ne coupe pas le réseau des requêtes qui passent par le service : la tâche peut partir après rechargement.)
  await A.reload();
  verifie(await attendreQue(async () => (await textes(A, LJ)).includes('Écrite sans réseau')), 'rechargée sans réseau : la page s\'ouvre (service hors ligne) et garde la tâche');
  await ctxA.setOffline(false);
  await A.evaluate(() => dispatchEvent(new Event('online')));
  verifie(await attendreQue(() => !!parTexte(base, 'Écrite sans réseau'), 20000), 'au retour du réseau, elle part toute seule');
  verifie(await attendreQue(async () => (await textes(B, LJ)).includes('Écrite sans réseau'), 10000), 'et arrive sur l\'autre téléphone');

  // ---------- Ordinateur : colonnes, glisser à la souris, colonnes déplacées, cases « Listes affichées » ----------
  const ctxP = await navigateur.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fr-FR' });
  const P = await ctxP.newPage();
  const erreursP = []; P.on('pageerror', (e) => erreursP.push(String(e)));
  await connecter(P, 'aurore');
  await P.waitForSelector(`.pan[data-l="${LJ}"] li.t`);
  verifie(await P.evaluate(() => { const m = document.querySelector('.menu'); return getComputedStyle(m).display !== 'none' && m.getBoundingClientRect().width === 184 && getComputedStyle(m).backgroundColor === 'rgb(231, 241, 238)'; }), 'ordinateur : menu à gauche vert très pâle (Planning, Astreintes, Réglages)');
  verifie(await P.evaluate(() => { const p = Array.from(document.querySelectorAll('#piste .pan')).slice(0, 3).map((x) => x.getBoundingClientRect()); return p[0].top === p[1].top && p[1].left > p[0].right; }), 'les listes en colonnes côte à côte');
  verifie(await P.evaluate(() => getComputedStyle(document.querySelector('.bande')).display === 'none'), 'pas de bande du bas sur l\'ordinateur');
  // Glisser « Écrite sans réseau » à la souris dans la colonne Astreintes, sous « Contrôle et irrig Endives » (au même niveau).
  await P.evaluate(() => { const p = document.querySelector('.pan[data-l="astreintes"]'); p.scrollIntoView({ inline: 'nearest' }); });
  await P.evaluate((L) => document.querySelector(`.pan[data-l="${L}"]`).scrollIntoView({ inline: 'nearest' }), LJ);
  await pause(200);
  const visibles = await P.evaluate(() => { const r = document.getElementById('piste').getBoundingClientRect(); return Array.from(document.querySelectorAll('#piste .pan')).filter((p) => { const b = p.getBoundingClientRect(); return b.left >= r.left - 1 && b.right <= r.right + 1; }).map((p) => p.dataset.l); });
  const autre = visibles.find((x) => x !== LJ) || 'astreintes';
  a = await centre(P, `.pan[data-l="${LJ}"] ${ligneDe('Écrite sans réseau')} .tx`);
  const col = await centre(P, `.pan[data-l="${autre}"] .pan-corps`);
  await P.mouse.move(a.x, a.y); await P.mouse.down();
  for (let i = 1; i <= 12; i++) { await P.mouse.move(a.x + (col.x - a.x) * i / 12, a.y + (col.b.y + 20 - a.y) * i / 12); await pause(16); }
  await pause(100); await P.mouse.up(); await pause(300);
  verifie(await attendreQue(async () => (await textes(P, autre)).startsWith('Écrite sans réseau')), 'souris : la tâche passe d\'une colonne à l\'autre (trait vert à l\'endroit du dépôt)');
  verifie(await attendreQue(async () => (await textes(B, autre)).startsWith('Écrite sans réseau')), 'vu sur le téléphone');
  // Un simple clic (sans bouger) ouvre la modification, pas le glisser.
  await P.click(`.pan[data-l="${autre}"] ${ligneDe('Écrite sans réseau')} .tx`);
  verifie(await P.evaluate(() => !!document.querySelector('textarea.ed')), 'un clic sur le texte le modifie');
  await P.keyboard.press('Escape');
  // Clic droit : le menu de la tâche.
  await P.click(`.pan[data-l="${autre}"] ${ligneDe('Écrite sans réseau')} .tx`, { button: 'right' });
  verifie(await P.evaluate(() => document.querySelector('#tacheDlg').open), 'clic droit : le menu de la tâche');
  await P.click('#tacheDlg [data-a="fermer"]');
  // Déplacer une colonne par son titre : Astreintes avant la première colonne.
  await P.evaluate(() => { document.getElementById('piste').scrollLeft = 0; });
  await pause(150);
  const premiere = await P.evaluate(() => document.querySelector('#piste .pan').dataset.l);
  await P.evaluate(() => { const p = document.getElementById('piste'); p.scrollLeft = p.scrollWidth; });
  await pause(150);
  let tA = await centre(P, '.pan[data-l="astreintes"] .pan-titre');
  await P.mouse.move(tA.x, tA.y); await P.mouse.down();
  await P.mouse.move(tA.x - 20, tA.y);
  // Tenir près du bord gauche : les colonnes défilent jusqu'au début.
  for (let i = 1; i <= 12; i++) { await P.mouse.move(tA.x - 20 - (tA.x - 300) * i / 12, tA.y); await pause(16); }
  for (let i = 0; i < 40; i++) { await P.mouse.move(200 + (i % 2), tA.y); await pause(40); }
  const p0 = await centre(P, `.pan[data-l="${premiere}"]`);
  await P.mouse.move(p0.b.x + 20, tA.y); await pause(80);
  await P.mouse.up(); await pause(300);
  verifie(await attendreQue(() => P.evaluate(() => document.querySelector('#piste .pan').dataset.l === 'astreintes')), 'ordinateur : une colonne se déplace en attrapant son titre');
  verifie(await attendreQue(() => A.evaluate(() => document.querySelector('#bande .pil[data-l]').dataset.l === 'astreintes')), 'nouvel ordre vu sur le téléphone');
  // Cacher une colonne (choix gardé sur l'ordinateur seulement).
  await P.uncheck('#affichees input[data-l="dimanche"]');
  verifie(await P.evaluate(() => getComputedStyle(document.querySelector('.pan[data-l="dimanche"]')).display === 'none'), '« Listes affichées » : décocher cache la colonne');
  await P.reload();
  await P.waitForSelector('#piste .pan');
  verifie(await P.evaluate(() => getComputedStyle(document.querySelector('.pan[data-l="dimanche"]')).display === 'none' && !document.querySelector('#affichees input[data-l="dimanche"]').checked), 'colonne toujours cachée après rechargement (gardé sur l\'ordinateur)');
  verifie(await A.evaluate(() => !!document.querySelector('#bande .pil[data-l="dimanche"]')), 'le téléphone voit toujours toutes les listes');

  // ---------- Effacement après 7 jours ----------
  const vieux = Date.now() - 8 * 864e5;
  await fetch(`${BASE}/taches/faites/vieux.json?auth=x`).catch(() => {});
  const jetonF = (await fetch(`${BASE}/v1/accounts:signInWithPassword?key=${CLE}`, { method: 'POST', body: JSON.stringify({ email: 'francois@ferme.invalid', password: MDP.francois }) }).then((x) => x.json())).idToken;
  await fetch(`${BASE}/taches/faites/vieux.json?auth=${jetonF}`, { method: 'PUT', body: JSON.stringify({ at: vieux, by: 'aurore', liste: LJ, texte: 'Vieille tâche', t: { vieux: { liste: LJ, parent: '', ordre: 1, texte: 'Vieille tâche', at: vieux } } }) });
  await fetch(`${BASE}/taches/faites/recent.json?auth=${jetonF}`, { method: 'PUT', body: JSON.stringify({ at: Date.now() - 2 * 864e5, by: 'aurore', liste: LJ, texte: 'Récente', t: { recent: { liste: LJ, parent: '', ordre: 1, texte: 'Récente', at: 1 } } }) });
  const ctxC = await navigateur.newContext({ ...tel, locale: 'fr-FR' });
  const C = await ctxC.newPage();
  await connecter(C, 'francois');
  verifie(await attendreQue(() => !base.lire('taches/faites/vieux') && !!base.lire('taches/faites/recent')), 'une tâche cochée depuis plus de 7 jours est effacée pour de bon ; une récente reste');

  // ---------- Compte de l'équipe, compte refusé ----------
  const ctxM = await navigateur.newContext({ ...tel, locale: 'fr-FR' });
  const M = await ctxM.newPage();
  await connecter(M, 'martin');
  verifie(await attendreQue(async () => (await textes(M, 'astreintes')).startsWith('Contrôle et irrig Endives')), 'compte de l\'équipe (Martin) : voit les mêmes tâches');
  await M.click('#bande .pil[data-l="lundi"]');
  await M.click('.pan[data-l="lundi"] .plus');
  await M.keyboard.type('Tâche de l\'équipe'); await M.keyboard.press('Enter'); await M.keyboard.press('Enter');
  verifie(await attendreQue(() => { const x = parTexte(base, 'Tâche de l\'équipe'); return x && x[1].by === 'martin'; }), 'et en ajoute');
  const lectureListes = await fetch(`${BASE}/v1/accounts:signInWithPassword?key=${CLE}`, { method: 'POST', body: JSON.stringify({ email: 'martin@ferme.invalid', password: MDP.martin }) }).then((x) => x.json()).then((j) => fetch(`${BASE}/listes.json?auth=${j.idToken}`));
  verifie(lectureListes.status === 401, 'le compte de l\'équipe n\'ouvre pas les listes de vente');
  const ctxT = await navigateur.newContext({ ...tel, locale: 'fr-FR' });
  const T = await ctxT.newPage();
  await connecter(T, 'tresallier');
  verifie(await attendreQue(() => T.evaluate(() => !document.getElementById('message').hidden && document.getElementById('message').textContent.includes('n\'ouvre pas les tâches'))), 'compte du magasin : « Ce compte n\'ouvre pas les tâches »');
  verifie(await T.evaluate(() => !document.querySelector('#piste .pan')), 'et ne voit aucune liste');

  // ---------- Installable : service actif, manifeste lu ----------
  const sw2 = await A.evaluate(async () => { const r = await navigator.serviceWorker.ready; return !!(r && r.active); });
  verifie(sw2, 'service hors ligne actif sur la page des tâches (condition pour l\'installer comme une appli)');
  const manifeste = await A.evaluate(async () => { const l = document.querySelector('link[rel="manifest"]'); return fetch(l.href).then((r) => r.json()); });
  verifie(manifeste.name === 'Aurore Task', 'manifeste servi avec la page');

  // ---------- Charte d'origine ----------
  const charte = await A.evaluate(() => {
    const cs = (s) => getComputedStyle(document.querySelector(s));
    const barre = document.querySelector('.barre-in').getBoundingClientRect();
    const btn = Array.from(document.querySelectorAll('button')).map((b) => getComputedStyle(b).backgroundColor);
    return {
      fond: getComputedStyle(document.body).backgroundColor, barre: cs('.barre').backgroundColor, haut: barre.height,
      titre: cs('.pan-titre').fontFamily + '/' + cs('.pan-titre').fontWeight, tache: cs('.tx').fontFamily + '/' + cs('.tx').fontSize,
      pil: cs('.pil').fontFamily, plus: cs('.plus').backgroundColor, coche: cs('.coche').borderRadius + '/' + cs('.coche').width,
      bloc: cs('.bloc').borderRadius + '/' + cs('.bloc').boxShadow + '/' + cs('.bloc').borderStyle,
      bleu: btn.filter((c) => /rgb\((\d+), (\d+), (\d+)\)/.test(c) && (([, r, g, b]) => +b > +r + 40 && +b > +g + 20)(c.match(/rgb\((\d+), (\d+), (\d+)\)/))),
      polices: document.fonts ? Array.from(document.fonts).filter((f) => f.status === 'loaded').map((f) => f.family.replace(/"/g, '')) : [],
    };
  });
  verifie(charte.fond === 'rgb(248, 248, 248)' && charte.barre === 'rgb(55, 55, 55)' && charte.haut === 36, 'charte : feuille #f8f8f8, barre du haut anthracite de 36 px');
  verifie(/Bricolage Grotesque/.test(charte.titre) && /\/300$/.test(charte.titre) && /Open Sans/.test(charte.tache) && parseFloat(charte.tache.split('/')[1]) >= 13 && /DM Sans/.test(charte.pil), 'charte : titres Bricolage Grotesque 300, tâches en Open Sans d\'au moins 13 px, interface en DM Sans');
  verifie(charte.plus === 'rgb(11, 105, 77)' && charte.coche === '6px/22px' && /^9\.75px\/.*rgba\(0, 0, 0, 0\.06\).*\/none$/.test(charte.bloc), 'charte : « + » vert plein, cases carrées de 22 px, blocs blancs sans bordure à ombre douce');
  verifie(!charte.bleu.length, 'charte : jamais de bleu sur un bouton');
  verifie(['Bricolage Grotesque', 'Open Sans', 'DM Sans'].every((f) => charte.polices.includes(f)), 'les trois polices du dépôt sont chargées');
  if (CAPTURES) {
    fs.mkdirSync(CAPTURES, { recursive: true });
    await A.click(`#bande .pil[data-l="${LS}"]`); await pause(500);
    await A.screenshot({ path: path.join(CAPTURES, 'telephone-liste.png') });
    await menuTache(A, LS, 'Rang 2'); await pause(300);
    await A.screenshot({ path: path.join(CAPTURES, 'telephone-menu-tache.png') });
    await A.click('#tacheDlg [data-a="fermer"]');
    await P.screenshot({ path: path.join(CAPTURES, 'ordinateur.png') });
  }

  verifie(!erreursA.length && !erreursB.length && !erreursP.length, 'aucune erreur JavaScript' + (erreursA.concat(erreursB, erreursP).length ? ' : ' + erreursA.concat(erreursB, erreursP).join(' / ') : ''));
  await navigateur.close(); site.close(); base.close();
  console.log(echecs ? `\n${echecs} vérification(s) en échec.` : '\nTout est bon.');
  process.exit(echecs ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
