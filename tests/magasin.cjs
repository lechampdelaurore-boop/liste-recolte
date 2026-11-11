// Test de bout en bout de la page du magasin (étape 13C) : un seul compte pour le magasin (profil « magasin:ta »),
// le prénom demandé d'abord puis modifiable, chaque saisie avec prénom et heure, le journal jamais effacé, le
// stock vu par la ferme dans l'onglet Semaine (la dernière saisie l'emporte) et l'écran « Qui a saisi ».
// Le faux Firebase imite les règles de docs/regles-base/fermees.json (la forme des données est vérifiée par
// tests/regles.cjs, sur l'émulateur officiel).
// Lancement depuis la racine du dépôt : npm install --no-save playwright && node tests/magasin.cjs
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');
const fauxFirebase = require('./faux-firebase.cjs');

const RACINE = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const PORT_SITE = 8800, PORT_BASE = 8801;
const BASE = `http://localhost:${PORT_BASE}`;
const CLE = 'cle-de-test';
const MDP_F = 'mot-de-passe-francois', MDP_M = 'mot-de-passe-magasin', MDP_E = 'mot-de-passe-essai';
const CAPTURES = process.env.CAPTURES || '';

function serveurSite() {
  return new Promise((ok) => {
    const s = http.createServer((q, r) => {
      let f = decodeURIComponent(new URL(q.url, 'http://x').pathname);
      if (f.endsWith('/')) f += 'index.html';
      if (f === '/magasin') f = '/magasin.html'; // comme Cloudflare Pages
      if (f === '/config.js') { r.writeHead(200, { 'Content-Type': 'text/javascript' }); return r.end(`window.RECOLTE_DB_URL='${BASE}';window.RECOLTE_AUTH_URL='${BASE}/v1';window.RECOLTE_JETON_URL='${BASE}/v1';`); }
      if (f === '/cle-web.js') { r.writeHead(200, { 'Content-Type': 'text/javascript' }); return r.end(`window.RECOLTE_CLE_WEB='${CLE}';`); }
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
// Numéro de semaine ISO, calculé autrement que dans l'appli (jeudi de la semaine, en UTC), pour vérifier l'affichage.
const numSemaine = (d) => { if (typeof d === 'string') { const p = d.split('-'); d = new Date(+p[0], p[1] - 1, +p[2]); } const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7)); return Math.ceil(((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7); };
const attendreQue = async (fn, ms = 8000) => { const fin = Date.now() + ms; while (Date.now() < fin) { if (await fn()) return true; await new Promise((x) => setTimeout(x, 150)); } return false; };

(async () => {
  const site = await serveurSite();
  const base = await fauxFirebase(PORT_BASE, { comptes: { cle: CLE } });
  const uidF = base.creerCompte('francois@ferme.invalid', MDP_F);
  const uidM = base.creerCompte('tresallier@ferme.invalid', MDP_M);
  base.creerCompte('essai@ferme.invalid', MDP_E);
  base.profil(uidF, 'ferme'); base.profil(uidM, 'magasin:ta');
  const SEM = iso(lundi(0)), AVANT = iso(lundi(-1)), hier = lundi(-1).getTime() + 3 * 86400000 + 9 * 3600000;
  // Semaine en cours de la ferme : trois produits ; le magasin avait compté 8 kg de poireau la semaine d'avant.
  const fiches = { 'carotte-lavee': { nom: 'Carotte lavée', caisse: 'PH', unite: '8 kg', kg: 8 }, 'ail-sec': { nom: 'Ail sec', caisse: 'PH', unite: '5 kg', kg: 5 }, poireau: { nom: 'Poireau', caisse: 'GH', unite: '10 kg', kg: 10 } };
  // Données de départ, écrites avec les comptes de la ferme et du magasin.
  const jetonF = (await fetch(`${BASE}/v1/accounts:signInWithPassword?key=${CLE}`, { method: 'POST', body: JSON.stringify({ email: 'francois@ferme.invalid', password: MDP_F }) }).then((x) => x.json())).idToken;
  await fetch(`${BASE}/listes/semaines/${SEM}.json?auth=${jetonF}`, { method: 'PUT', body: JSON.stringify({ produits: fiches }) });
  const jetonM0 = (await fetch(`${BASE}/v1/accounts:signInWithPassword?key=${CLE}`, { method: 'POST', body: JSON.stringify({ email: 'tresallier@ferme.invalid', password: MDP_M }) }).then((x) => x.json())).idToken;
  await fetch(`${BASE}/magasins/ta/semaines/${AVANT}/poireau.json?auth=${jetonM0}`, { method: 'PUT', body: JSON.stringify({ n: 8, u: 'kg', by: 'Igor', at: hier }) });

  const nav = await chromium.launch();
  const erreurs = [], dialogues = [];
  let refuser = false;
  const ouvrir = async (nom, url, opts = devices['Pixel 7']) => {
    const ctx = await nav.newContext({ ...opts, serviceWorkers: 'block' });
    await ctx.addInitScript((n) => localStorage.setItem('recolte.qui', JSON.stringify(n)), nom);
    const p = await ctx.newPage();
    p.on('pageerror', (e) => erreurs.push(nom + ' : ' + e.message));
    p.on('dialog', (d) => { dialogues.push(d.message()); if (refuser) d.dismiss(); else d.accept(); });
    await p.goto(`http://localhost:${PORT_SITE}/${url}`);
    return { p, ctx };
  };
  const connecter = async (p, id, mdp) => { await p.fill('#authId', id); await p.fill('#authMdp', mdp); await p.click('#authOk'); };
  const statut = async (p) => (await p.textContent('#sync')).trim();
  const capture = async (p, nom) => { if (CAPTURES) await p.screenshot({ path: path.join(CAPTURES, nom + '.png'), fullPage: true }); };
  const ligne = (pid) => `#liste .p[data-pid="${pid}"]`;
  const journal = () => Object.values(base.lire(`magasins/ta/journal/${SEM}`) || {}).sort((a, b) => a.at - b.at);

  // 0. Avant la publication des nouvelles règles : la ferme n'est pas gênée, le magasin est prévenu.
  base.reglesAvant13C = true;
  const { p: F } = await ouvrir('François', '?liste=2026-11-04');
  await connecter(F, 'francois', MDP_F);
  await F.click('[data-view="semaine"]');
  await F.waitForSelector('#semView section.sp');
  await F.click('[data-sem="stock"]');
  await F.waitForSelector('#semStkList .stk-bloc');
  await F.waitForTimeout(1500);
  verifie((await statut(F)) === 'Partagé', 'règles d\'avant : la ferme, page Stock ouverte, reste « Partagé » malgré le refus du stock du magasin (obtenu « ' + (await statut(F)) + ' »)');
  const { p: M0, ctx: ctxM0 } = await ouvrir('x', 'magasin');
  await connecter(M0, 'tresallier', MDP_M);
  await M0.waitForSelector('#msg .err');
  verifie((await M0.textContent('#msg')).includes('publier les nouvelles règles'), 'règles d\'avant : la page du magasin dit que la ferme doit publier les nouvelles règles');
  await ctxM0.close();
  base.reglesAvant13C = false;

  // 1. La page du magasin : connexion, puis le prénom d'abord
  const { p: M } = await ouvrir('x', 'magasin');
  await M.waitForTimeout(300);
  verifie(await M.isVisible('#authDlg'), 'la page du magasin demande d\'abord de se connecter');
  const avantConnexion = base.journal.length;
  await M.waitForTimeout(300);
  verifie(base.journal.length === avantConnexion, 'aucun appel à la base avant la connexion');
  await capture(M, '1-connexion');
  await connecter(M, 'tresallier', MDP_M);
  await M.waitForSelector('#quiDlg[open]');
  verifie(!(await M.isVisible('#authDlg')) && (await M.isVisible('#quiDlg')), 'une fois connecté : « Qui saisit ? » est demandé tout de suite');
  verifie(!(await M.isVisible('#quiAnnuler')), 'sans prénom, on ne peut pas fermer la question');
  await capture(M, '2-prenom');
  await M.fill('#quiAutre', 'igor');
  await M.click('#quiForm button[type="submit"]');
  await M.waitForSelector('#actions:not([hidden])');
  await M.waitForFunction(() => !document.querySelector('#reprendre').hidden, null, { timeout: 8000 }).catch(() => {});
  verifie((await M.textContent('#quiNom')) === 'Igor · changer', 'le prénom tapé « igor » devient « Igor », en haut de l\'écran (obtenu « ' + (await M.textContent('#quiNom')) + ' »)');
  await attendreQue(() => base.lire('magasins/ta/personnes/igor'));
  verifie((base.lire('magasins/ta/personnes/igor') || {}).nom === 'Igor', 'le prénom est gardé dans la liste des prénoms du magasin');
  verifie((await M.textContent('#titre')) === 'Stock · Très Allier' && (await M.textContent('#navTxt')) === 'Semaine ' + numSemaine(lundi(0)) + ' · du lundi ' + lundi(0).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) + 'Cette semaine', 'le magasin du compte (Très Allier) et la semaine en cours sont affichés, avec « Cette semaine » (obtenu « ' + (await M.textContent('#navTxt')) + ' »)');
  verifie((await M.$$('#liste .p')).length === 0 && (await M.textContent('#liste')).includes('Aucun produit pour cette semaine'), 'au départ, la liste est vide : « Aucun produit pour cette semaine »');
  verifie(await M.isVisible('#reprendre'), 'le bouton « Reprendre les produits de la semaine d\'avant » est proposé (le poireau y était compté)');
  await capture(M, '3-liste-vide');
  await M.click('#reprendre');
  await M.waitForSelector(ligne('poireau'));
  verifie((await M.$$eval('#liste .p', (e) => e.map((x) => x.dataset.pid))).join() === 'poireau' && (await M.textContent(ligne('poireau') + ' .p-qui')).startsWith('Semaine d\'avant : 8 kg (Igor, '), 'reprendre la semaine d\'avant : le poireau arrive, case vide, avec « Semaine d\'avant : 8 kg (Igor, …) »');
  verifie(!(await M.isVisible('#reprendre')), 'le bouton « Reprendre » disparaît une fois la liste commencée');
  verifie(base.lire(`magasins/ta/semaines/${SEM}`) === null, 'ajouter un produit à la liste n\'écrit rien dans la base (seul le chiffre part)');

  // 1 bis. Ajouter un produit un par un, en colis par défaut
  await M.click('#ajouter');
  await M.waitForSelector('#addDlg[open]');
  verifie((await M.$$('#addList button')).length === 76, 'la fenêtre « Ajouter un produit » propose tous les produits du référentiel, sauf ceux déjà dans la liste et l\'ancien « Persil frisé (bouquet) » (obtenu ' + (await M.$$('#addList button')).length + ')');
  await M.fill('#addQ', 'persil');
  verifie((await M.$$eval('#addList button', (e) => e.map((x) => x.dataset.pid))).join() === 'persil-frise,persil-plat', 'la recherche « persil » propose persil frisé et persil plat, plus l\'ancien en bouquets (9/11)');
  await M.fill('#addQ', 'carotte');
  verifie((await M.$$eval('#addList button', (e) => e.map((x) => x.dataset.pid))).join() === 'carotte-botte,carotte-lavee', 'la recherche « carotte » ne garde que les carottes');
  await capture(M, '3-ajouter');
  await M.click('#addList button[data-pid="carotte-lavee"]');
  await M.waitForSelector(ligne('carotte-lavee'));
  verifie(!(await M.isVisible('#addDlg')) && (await M.evaluate(() => document.activeElement.closest('.p') && document.activeElement.closest('.p').dataset.pid)) === 'carotte-lavee', 'un appui sur « Carotte lavée » : la fenêtre se ferme, le curseur est dans la case de la carotte');
  verifie((await M.$$eval('#liste .p', (e) => e.map((x) => x.dataset.pid))).join() === 'carotte-lavee,poireau', 'la liste a maintenant deux produits, par ordre alphabétique');
  verifie((await M.textContent(ligne('carotte-lavee') + ' button[data-a="unite"]')) === 'PH', 'une case vide se remplit en colis par défaut (PH pour la carotte lavée)');
  await M.click(ligne('carotte-lavee') + ' button[data-a="unite"]');
  verifie((await M.textContent(ligne('carotte-lavee') + ' button[data-a="unite"]')) === 'kg', 'un appui sur l\'unité passe en kilos');
  await capture(M, '3-liste');

  // 2. Une saisie : prénom et heure, journal
  await M.fill(ligne('carotte-lavee') + ' input', '12');
  await M.press(ligne('carotte-lavee') + ' input', 'Enter');
  await attendreQue(() => base.lire(`magasins/ta/semaines/${SEM}/carotte-lavee`));
  let s = base.lire(`magasins/ta/semaines/${SEM}/carotte-lavee`) || {};
  verifie(s.n === 12 && s.u === 'kg' && s.by === 'Igor' && s.at > 0, '12 kg de carotte lavée enregistrés avec le prénom Igor et l\'heure');
  let j = journal();
  verifie(j.length === 1 && j[0].pid === 'carotte-lavee' && j[0].n === 12 && j[0].by === 'Igor' && j[0].an === undefined, 'une ligne au journal : Igor, carotte lavée, 12 kg, sans valeur d\'avant');
  await M.waitForFunction(() => document.querySelector('#sync').textContent.includes('Enregistré'));
  verifie((await M.textContent(ligne('carotte-lavee') + ' .p-qui')).startsWith('12 kg · Igor, '), 'sous la case : « 12 kg · Igor, <jour> à <heure> »');
  await M.click(ligne('carotte-lavee') + ' button[data-a="plus"]');
  await attendreQue(() => journal().length === 2);
  j = journal();
  verifie(base.lire(`magasins/ta/semaines/${SEM}/carotte-lavee`).n === 13 && j.length === 2 && j[1].n === 13 && j[1].an === 12, 'le bouton + passe à 13 kg ; le journal garde 12 puis 13 (avant : 12)');
  await M.fill(ligne('carotte-lavee') + ' input', 'beaucoup');
  await M.press(ligne('carotte-lavee') + ' input', 'Enter');
  await M.waitForTimeout(200);
  verifie((await M.textContent(ligne('carotte-lavee'))).includes('Écrire un nombre') && base.lire(`magasins/ta/semaines/${SEM}/carotte-lavee`).n === 13, 'un texte qui n\'est pas un nombre est refusé, avec une explication');
  verifie((await M.inputValue(ligne('carotte-lavee') + ' input')) === '13', 'en quittant la case, elle revient à la dernière valeur enregistrée (13)');

  // 3. Le magasin ne lit rien d'autre que son stock
  const jetonM = await M.evaluate(() => JSON.parse(localStorage.getItem('magasin.compte')).jeton);
  const lu = async (chemin, opts) => (await fetch(`${BASE}/${chemin}.json?auth=${jetonM}`, opts)).status;
  verifie((await lu('listes')) === 401 && (await lu(`listes/semaines/${SEM}`)) === 401 && (await lu('listes/reglages/debouches')) === 401, 'avec le compte du magasin, la base refuse les listes, les semaines et les débouchés');
  verifie((await lu(`magasins/ta/journal/${SEM}`)) === 401 && (await lu('magasins/lv/semaines/' + SEM)) === 401 && (await lu('profils/' + uidF)) === 401, 'le magasin ne lit ni le journal, ni le stock d\'un autre magasin, ni le profil d\'un autre compte');
  const cle0 = Object.keys(base.lire(`magasins/ta/journal/${SEM}`))[0];
  verifie((await lu(`magasins/ta/journal/${SEM}/${cle0}`, { method: 'DELETE' })) === 401 && (await lu(`magasins/ta/journal/${SEM}/${cle0}`, { method: 'PUT', body: '{"pid":"x","by":"y","at":1}' })) === 401, 'le magasin ne peut ni effacer ni réécrire une ligne du journal');
  verifie((await lu('profils/' + uidM, { method: 'PUT', body: '"ferme"' })) === 401, 'le magasin ne peut pas se donner le profil de la ferme');

  // 4. Un deuxième téléphone du magasin, une autre personne
  const { p: M2 } = await ouvrir('x', 'magasin');
  await connecter(M2, 'tresallier', MDP_M);
  await M2.waitForSelector('#quiDlg[open] #quiConnus button');
  verifie((await M2.$$eval('#quiConnus button', (e) => e.map((x) => x.textContent))).join() === 'Igor', 'sur un autre téléphone, « Igor » est proposé en un appui');
  await M2.fill('#quiAutre', 'Léa');
  await M2.click('#quiForm button[type="submit"]');
  await M2.waitForSelector(ligne('carotte-lavee'));
  verifie((await M2.$$eval('#liste .p', (e) => e.map((x) => x.dataset.pid))).join() === 'carotte-lavee' && (await M2.inputValue(ligne('carotte-lavee') + ' input')) === '13', 'sur le deuxième téléphone, la liste a le produit déjà saisi : Léa voit les 13 kg saisis par Igor');
  await M2.click('#ajouter');
  await M2.fill('#addQ', 'ail');
  await M2.click('#addList button[data-pid="ail-sec"]');
  await M2.waitForSelector(ligne('ail-sec'));
  verifie((await M2.textContent(ligne('ail-sec') + ' button[data-a="unite"]')) === 'PH', 'Léa ajoute l\'ail sec : en colis par défaut (PH)');
  await M2.fill(ligne('ail-sec') + ' input', '2');
  await M2.press(ligne('ail-sec') + ' input', 'Enter');
  await attendreQue(() => base.lire(`magasins/ta/semaines/${SEM}/ail-sec`));
  s = base.lire(`magasins/ta/semaines/${SEM}/ail-sec`) || {};
  verifie(s.n === 2 && s.u === 'colis' && s.by === 'Léa', 'Léa saisit 2 PH d\'ail sec : enregistré à son prénom');
  await attendreQue(async () => (await M.inputValue(ligne('ail-sec') + ' input')) === '2');
  verifie((await M.inputValue(ligne('ail-sec') + ' input')) === '2' && (await M.textContent(ligne('ail-sec') + ' .p-qui')).includes('Léa'), 'le premier téléphone voit tout de suite la saisie de Léa, l\'ail sec s\'ajoute à sa liste');

  // 5. Changer de prénom d'un appui ; « igor. » est le même Igor
  await M2.click('#qui');
  await M2.waitForSelector('#quiDlg[open]');
  verifie((await M2.$$eval('#quiConnus button', (e) => e.map((x) => x.textContent))).sort().join() === 'Igor,Léa' && (await M2.isVisible('#quiAnnuler')), 'appui sur le prénom : la question revient, avec Igor et Léa, et un bouton Annuler');
  await M2.fill('#quiAutre', ' igor. ');
  await M2.click('#quiForm button[type="submit"]');
  await M2.waitForTimeout(300);
  verifie((await M2.textContent('#quiNom')) === 'Igor · changer' && Object.keys(base.lire('magasins/ta/personnes')).sort().join() === 'igor,lea', '« igor. » est reconnu comme Igor : pas de doublon dans les prénoms');
  await M2.click('#qui');
  await M2.click('#quiConnus button[data-nom="Léa"]');
  await M2.waitForTimeout(200);
  verifie((await M2.textContent('#quiNom')) === 'Léa · changer', 'un appui sur « Léa » la remet comme personne qui saisit');

  // 6. La ferme voit le stock du magasin dans sa Semaine
  await F.reload();
  await F.waitForSelector('#semStkList .stk-bloc');
  const caseF = (pid) => `#semStkList .stk-l[data-pid="${pid}"] .sr[data-k="stock/ta"]`;
  await F.waitForFunction(() => { const i = document.querySelector('#semStkList .stk-l[data-pid="carotte-lavee"] input'); return i && i.value === '13'; }, null, { timeout: 8000 }).catch(() => {});
  verifie((await F.inputValue(caseF('carotte-lavee') + ' input')) === '13' && (await F.textContent(caseF('carotte-lavee') + ' button[data-a="unite"]')) === 'kg' && (await F.textContent(caseF('carotte-lavee') + ' .sr-eq')).includes('Igor (magasin), '), 'page Stock de la ferme : carotte lavée 13 kg, « Igor (magasin) » et l\'heure');
  verifie((await F.inputValue(caseF('ail-sec') + ' input')) === '2' && (await F.textContent(caseF('ail-sec') + ' .sr-eq')).includes('Léa (magasin)'), 'ail sec : 2 PH, « Léa (magasin) »');
  verifie((await F.inputValue(caseF('poireau') + ' input')) === '' && (await F.textContent(caseF('poireau') + ' .sr-eq')).includes('Magasin, semaine d\'avant : 8 kg (Igor, '), 'poireau : case vide, avec « Magasin, semaine d\'avant : 8 kg (Igor, …) » en aide');
  verifie((await F.textContent('#semStkList .sp-by')).startsWith('2 produits sur 3 renseignés · dernière saisie : Léa (magasin)'), 'en tête : « 2 produits sur 3 renseignés · dernière saisie : Léa (magasin) … »');
  verifie(base.lire(`listes/semaines/${SEM}/stock`) === null, 'la ferme n\'a rien écrit dans sa semaine pour afficher le stock du magasin');
  verifie((await F.textContent('#semStkList')).includes('/magasin'), 'la page Stock donne l\'adresse de la page du magasin');
  verifie((await statut(F)) === 'Partagé', 'la pastille de la ferme reste « Partagé »');

  // 7. « Qui a saisi au magasin »
  await F.click('#semStkList [data-a="journal"]');
  await F.waitForSelector('#semStkList .mag-qui');
  const qui = await F.$$eval('#semStkList .mag-qui', (e) => e.map((x) => x.textContent));
  verifie(qui.join('|') === 'Igor · 2 saisies|Léa · 1 saisie', 'regroupé par personne : Igor · 2 saisies, Léa · 1 saisie (obtenu ' + qui.join('|') + ')');
  const lignesJ = await F.$$eval('#semStkList .mag-l li', (e) => e.map((x) => x.textContent));
  verifie(lignesJ.some((t) => t.endsWith('Carotte lavée : 13 kg (avant : 12 kg)')) && lignesJ.some((t) => t.endsWith('Ail sec : 2 PH')), 'chaque saisie : heure, produit, nouvelle valeur et valeur d\'avant');
  await capture(F, '4-ferme-stock-qui');

  // 8. La dernière saisie l'emporte, de la ferme ou du magasin
  await F.fill(caseF('carotte-lavee') + ' input', '10');
  await F.press(caseF('carotte-lavee') + ' input', 'Enter');
  await attendreQue(() => base.lire(`listes/semaines/${SEM}/stock/carotte-lavee/ta`));
  s = base.lire(`listes/semaines/${SEM}/stock/carotte-lavee/ta`) || {};
  verifie(s.n === 10 && s.u === 'kg' && s.by === 'François', 'la ferme corrige à 10 kg : écrit dans sa semaine, dans l\'unité affichée (kg), à son nom');
  verifie(base.lire(`magasins/ta/semaines/${SEM}/carotte-lavee`).n === 13, 'la saisie du magasin n\'est pas touchée');
  await F.waitForTimeout(300);
  verifie((await F.inputValue(caseF('carotte-lavee') + ' input')) === '10' && (await F.textContent(caseF('carotte-lavee') + ' .sr-eq')).includes('François'), 'la ferme voit 10 kg, à son nom (plus récent)');
  await M.fill(ligne('carotte-lavee') + ' input', '9');
  await M.press(ligne('carotte-lavee') + ' input', 'Enter');
  await F.waitForFunction(() => document.querySelector('#semStkList .stk-l[data-pid="carotte-lavee"] input').value === '9', null, { timeout: 8000 }).catch(() => {});
  verifie((await F.inputValue(caseF('carotte-lavee') + ' input')) === '9' && (await F.textContent(caseF('carotte-lavee') + ' .sr-eq')).includes('Igor (magasin)'), 'puis Igor saisit 9 kg au magasin : la ferme voit 9 kg tout de suite, sans recharger');
  await F.fill(caseF('carotte-lavee') + ' input', '');
  await F.press(caseF('carotte-lavee') + ' input', 'Enter');
  await attendreQue(() => (base.lire(`listes/semaines/${SEM}/stock/carotte-lavee/ta`) || {}).vide);
  await F.waitForTimeout(300);
  verifie((await F.inputValue(caseF('carotte-lavee') + ' input')) === '' && (base.lire(`listes/semaines/${SEM}/stock/carotte-lavee/ta`) || {}).vide === true && base.lire(`magasins/ta/semaines/${SEM}/carotte-lavee`).n === 9, 'la ferme vide la case : elle reste vide (trace datée), la saisie du magasin est gardée');

  // 9. Le tableau et la grille de l'ordinateur
  await F.click('[data-sem="cumul"]');
  await F.waitForSelector('#semTable');
  const ligneT = await F.$$eval('#semTable tbody tr[data-pid="ail-sec"] td.stk', (e) => e.map((x) => x.textContent));
  verifie(ligneT.length === 1 && ligneT[0].startsWith('2Léa (magasin) · '), 'le Cumul montre le stock du magasin (ail sec : 2), avec « Léa (magasin) · date heure » (obtenu ' + ligneT.join() + ')');
  const { p: PC } = await ouvrir('François', '?liste=2026-11-04', { viewport: { width: 1280, height: 900 } });
  await connecter(PC, 'francois', MDP_F);
  await PC.click('[data-view="semaine"]');
  await PC.waitForSelector('#semGrid input[data-cell="poireau|stock/ta"]');
  await PC.waitForFunction(() => document.querySelector('#semGrid input[data-cell="ail-sec|stock/ta"]').value === '2', null, { timeout: 8000 }).catch(() => {});
  verifie((await PC.inputValue('#semGrid input[data-cell="ail-sec|stock/ta"]')) === '2' && (await PC.getAttribute('#semGrid input[data-cell="poireau|stock/ta"]', 'placeholder')) === '(8 kg)', 'grille de l\'ordinateur : ail sec 2 ; poireau vide avec « (8 kg) » de la semaine d\'avant en grisé');
  const quiG = await PC.textContent('#semGrid tr[data-pid="ail-sec"] td.g-stk .g-qui').catch(() => '');
  verifie(/^Léa \(magasin\) · \d\d\/\d\d \d\d:\d\d$/.test(quiG) && !(await PC.$('#semGrid tr[data-pid="poireau"] td.g-stk .g-qui')), 'grille : sous la case du stock, qui et quand (« ' + quiG + ' ») ; rien sous une case vide');

  await PC.fill('#semGrid input[data-cell="carotte-lavee|stock/ta"]', '7');
  await PC.press('#semGrid input[data-cell="carotte-lavee|stock/ta"]', 'Tab');
  await attendreQue(() => (base.lire(`listes/semaines/${SEM}/stock/carotte-lavee/ta`) || {}).n === 7);
  await PC.waitForTimeout(300);
  const quiF = await PC.textContent('#semGrid tr[data-pid="carotte-lavee"] td.g-stk .g-qui').catch(() => '');
  verifie(/^François · \d\d\/\d\d \d\d:\d\d$/.test(quiF), 'saisie dans le tableau de l\'ordinateur : la case montre « François · date heure » (obtenu « ' + quiF + ' »)');

  // 9 bis. Un produit compté au magasin mais absent de la semaine de la ferme
  await M.click('#ajouter');
  await M.fill('#addQ', 'fenouil');
  await M.click('#addList button[data-pid="fenouil"]');
  await M.waitForSelector(ligne('fenouil'));
  await M.fill(ligne('fenouil') + ' input', '3');
  await M.press(ligne('fenouil') + ' input', 'Enter');
  await attendreQue(() => base.lire(`magasins/ta/semaines/${SEM}/fenouil`));
  await F.click('[data-sem="stock"]');
  await attendreQue(() => base.lire(`listes/semaines/${SEM}/produits/fenouil`));
  const pf = base.lire(`listes/semaines/${SEM}/produits/fenouil`) || {};
  verifie(pf.nom === 'Fenouil' && pf.by === 'Igor (magasin)' && base.lire(`listes/semaines/${SEM}/magAjout/ta/fenouil`) === base.lire(`magasins/ta/semaines/${SEM}/fenouil`).at, 'le fenouil saisi au magasin entre tout seul dans la semaine de la ferme (fiche du référentiel, « Igor (magasin) »)');
  await F.waitForSelector(caseF('fenouil') + ' input', { timeout: 8000 }).catch(() => {});
  verifie((await F.inputValue(caseF('fenouil') + ' input')) === '3' && (await F.textContent(caseF('fenouil') + ' .sr-eq')).includes('Igor (magasin)') && (await F.$$('#semStkList .mag-hors')).length === 0, 'page Stock de la ferme : le fenouil a sa case, 3 PH, « Igor (magasin) »');
  await capture(F, '4-ferme-stock-auto');
  await F.click('[data-sem="repartir"]');
  await F.waitForSelector('#semView section.sp');
  verifie(((await F.textContent('#semView')) || '').includes('Fenouil'), 'page Répartir : le fenouil y est aussi');
  await PC.waitForSelector('#semGrid input[data-cell="fenouil|stock/ta"]', { timeout: 8000 }).catch(() => {});
  await PC.waitForFunction(() => { const i = document.querySelector('#semGrid input[data-cell="fenouil|stock/ta"]'); return i && i.value === '3'; }, null, { timeout: 8000 }).catch(() => {});
  verifie((await PC.inputValue('#semGrid input[data-cell="fenouil|stock/ta"]').catch(() => '')) === '3', 'grille de l\'ordinateur : fenouil, 3 dans la colonne « Stock Très Allier »');
  await capture(PC, '4-ordinateur-repartir');
  // La ferme retire le fenouil : il ne revient pas tout seul, il reste proposé à part.
  await PC.click('#semGrid tr[data-pid="fenouil"] button[data-a="retirer"]');
  await attendreQue(() => !base.lire(`listes/semaines/${SEM}/produits/fenouil`));
  await F.click('[data-sem="stock"]');
  await F.waitForSelector('#semStkList li[data-hors="fenouil"]', { timeout: 8000 }).catch(() => {});
  await F.waitForTimeout(800);
  const hors = await F.$$eval('#semStkList .mag-hors li', (e) => e.map((x) => x.textContent));
  verifie(!base.lire(`listes/semaines/${SEM}/produits/fenouil`) && hors.length === 1 && hors[0].startsWith('Fenouil : 3 PH · Igor, '), 'retiré par la ferme : le fenouil ne revient pas tout seul ; il est proposé dans « Compté par le magasin, pas dans votre semaine » (obtenu ' + hors.join('|') + ')');
  await capture(F, '4-ferme-hors-semaine');
  await F.click('#semStkList [data-a="ajouter-produit"][data-p="fenouil"]');
  await attendreQue(() => base.lire(`listes/semaines/${SEM}/produits/fenouil`));
  await F.waitForSelector(caseF('fenouil') + ' input', { timeout: 8000 }).catch(() => {});
  verifie(!!base.lire(`listes/semaines/${SEM}/produits/fenouil`) && (await F.inputValue(caseF('fenouil') + ' input')) === '3' && (await F.$$('#semStkList .mag-hors')).length === 0, '« Ajouter à la semaine » : le fenouil revient, avec les 3 du magasin dans sa case');
  await F.click('[data-a="semPrec"]');
  await attendreQue(() => base.lire(`listes/semaines/${AVANT}/produits/poireau`));
  await F.waitForSelector(caseF('poireau') + ' input', { timeout: 8000 }).catch(() => {});
  await F.waitForFunction(() => { const i = document.querySelector('#semStkList .stk-l[data-pid="poireau"] input'); return i && i.value === '8'; }, null, { timeout: 8000 }).catch(() => {});
  verifie((await F.inputValue(caseF('poireau') + ' input').catch(() => '')) === '8' && Object.keys(base.lire(`listes/semaines/${AVANT}/produits`) || {}).join() === 'poireau', 'semaine passée, sans produit chez la ferme : le poireau compté par le magasin (8 kg) y entre aussi');
  await F.click('[data-a="semSuiv"]');

  // 9 ter. Le magasin change de semaine, toujours avec une confirmation
  refuser = true;
  await M.click('#nav [data-a="prec"]');
  await M.waitForTimeout(200);
  verifie(dialogues[dialogues.length - 1] === 'Passer à la semaine ' + numSemaine(lundi(-1)) + ' (du lundi ' + lundi(-1).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) + ') ? Les saisies iront dans cette semaine-là.' && (await M.textContent('#navTxt')).endsWith('Cette semaine'), 'flèche ‹ : la page demande confirmation ; en refusant, on reste sur la semaine en cours (message « ' + dialogues[dialogues.length - 1] + ' »)');
  refuser = false;
  await M.click('#nav [data-a="prec"]');
  await M.waitForFunction(() => document.querySelector('#navTxt').textContent.endsWith('Semaine passée'));
  await M.waitForFunction(() => { const i = document.querySelector('#liste .p[data-pid="poireau"] input'); return i && i.value === '8'; }, null, { timeout: 8000 }).catch(() => {});
  verifie((await M.$$eval('#liste .p', (e) => e.map((x) => x.dataset.pid))).join() === 'poireau' && (await M.inputValue(ligne('poireau') + ' input')) === '8', 'en confirmant : « Semaine passée », avec le poireau à 8 kg saisi cette semaine-là');
  await capture(M, '6-semaine-passee');
  await M.click('#nav [data-a="suiv"]');
  await M.waitForFunction(() => document.querySelector('#navTxt').textContent.endsWith('Cette semaine'));
  verifie(dialogues[dialogues.length - 1].endsWith('(cette semaine) ? Les saisies iront dans cette semaine-là.') && (await M.$$eval('#liste .p', (e) => e.map((x) => x.dataset.pid))).join() === 'ail-sec,carotte-lavee,fenouil,poireau', 'retour à la semaine en cours (« (cette semaine) » dans la question), la liste est retrouvée');

  // 9 quater. Retirer un produit de la liste
  await M.click(ligne('fenouil') + ' button[data-a="retirer"]');
  await attendreQue(() => base.lire(`magasins/ta/semaines/${SEM}/fenouil`) === null);
  await M.waitForTimeout(200);
  verifie(dialogues[dialogues.length - 1].startsWith('Retirer « Fenouil » de la semaine ?') && !(await M.$(ligne('fenouil'))) && base.lire(`magasins/ta/semaines/${SEM}/fenouil`) === null && journal().some((x) => x.pid === 'fenouil' && x.n === undefined && x.an === 3), '× sur le fenouil : confirmation, il quitte la liste, sa saisie est effacée et le journal le note (avant : 3)');

  // 10. Hors ligne au magasin : la saisie attend, puis part
  const ctxM = M.context();
  await ctxM.setOffline(true);
  await M.evaluate(() => window.dispatchEvent(new Event('offline')));
  await M.fill(ligne('poireau') + ' input', '5');
  await M.press(ligne('poireau') + ' input', 'Enter');
  await M.waitForTimeout(400);
  verifie((await statut(M)) === 'Hors ligne · 1 saisie en attente' && (await M.inputValue(ligne('poireau') + ' input')) === '5', 'sans réseau : la saisie s\'affiche, « Hors ligne · 1 saisie en attente »');
  await ctxM.setOffline(false);
  await M.evaluate(() => window.dispatchEvent(new Event('online')));
  await attendreQue(() => base.lire(`magasins/ta/semaines/${SEM}/poireau`), 20000);
  s = base.lire(`magasins/ta/semaines/${SEM}/poireau`) || {};
  verifie(s.n === 5 && s.by === 'Igor' && journal().some((x) => x.pid === 'poireau' && x.n === 5), 'au retour du réseau : les 5 kg de poireau partent, avec leur ligne au journal');

  // 11. Autres comptes sur la page du magasin
  const { p: FM } = await ouvrir('x', 'magasin');
  await connecter(FM, 'francois', MDP_F);
  await FM.waitForSelector('#msg .err');
  verifie((await FM.textContent('#msg')).includes('Ce compte est celui de la ferme') && (await FM.$$('#liste .p')).length === 0, 'avec le compte de la ferme, la page du magasin explique qu\'il faut le compte du magasin');
  const { p: E } = await ouvrir('x', 'magasin');
  await connecter(E, 'essai', MDP_E);
  await E.waitForSelector('#msg .err');
  verifie((await E.textContent('#msg')).includes('n\'a pas accès') && (await E.$$('#liste .p')).length === 0, 'un compte sans profil : « Ce compte n\'a pas accès à la saisie du stock »');
  await capture(F, '5-ferme-stock');

  // 12. Déconnexion
  await M2.click('#deconnecter');
  await M2.waitForSelector('#authDlg[open]');
  verifie((await M2.evaluate(() => localStorage.getItem('magasin.compte'))) === 'null' && (await M2.isVisible('#authDlg')), 'se déconnecter du téléphone du magasin redemande la connexion');

  verifie(erreurs.length === 0, 'aucune erreur JavaScript' + (erreurs.length ? ' : ' + erreurs.join(' | ') : ''));
  await nav.close(); site.close(); base.close();
  console.log(echecs ? `\n${echecs} échec(s)` : '\nTout est bon.');
  process.exit(echecs ? 1 : 0);
})().catch((x) => { console.error(x); process.exit(1); });
