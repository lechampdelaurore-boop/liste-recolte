// Test de bout en bout des notifications (étape 25, docs/PLAN_NOTIFICATIONS.md) : la même cloche côté ferme et côté
// magasin, « Envoyer une notification » sur la page du magasin (bloqué tant qu'un produit n'a pas de quantité, zéro
// accepté), l'envoi automatique 15 minutes après la dernière saisie (page du magasin ouverte, ou appli de la ferme si la
// page est fermée, jamais deux), « Prévenir le magasin » dans l'onglet Semaine, lu et non lu sur chaque téléphone, envoi
// sans réseau, et les règles d'avant l'étape 25 (rien ne casse tant que François ne les a pas publiées).
// Le temps est avancé avec l'horloge de Playwright (pas d'attente de 15 vraies minutes).
// Lancement depuis la racine du dépôt : npm install --no-save playwright && node tests/notifications.cjs
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');
const fauxFirebase = require('./faux-firebase.cjs');

const RACINE = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const PORT_SITE = 8810, PORT_BASE = 8811;
const BASE = `http://localhost:${PORT_BASE}`;
const CLE = 'cle-de-test';
const MDP_F = 'mot-de-passe-francois', MDP_A = 'mot-de-passe-aurore', MDP_M = 'mot-de-passe-magasin';
const CAPTURES = process.env.CAPTURES || '';
const MIN = 60 * 1000;

function serveurSite() {
  return new Promise((ok) => {
    const s = http.createServer((q, r) => {
      let f = decodeURIComponent(new URL(q.url, 'http://x').pathname);
      if (f.endsWith('/')) f += 'index.html';
      if (f === '/magasin') f = '/magasin.html';
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
const numSemaine = (d) => { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7)); return Math.ceil(((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7); };
const attendreQue = async (fn, ms = 8000) => { const fin = Date.now() + ms; while (Date.now() < fin) { if (await fn()) return true; await new Promise((x) => setTimeout(x, 150)); } return false; };
const heure = (t) => { const d = new Date(t); return d.getHours() + ' h ' + String(d.getMinutes()).padStart(2, '0'); };

(async () => {
  const site = await serveurSite();
  const base = await fauxFirebase(PORT_BASE, { comptes: { cle: CLE } });
  const uidF = base.creerCompte('francois@ferme.invalid', MDP_F), uidA = base.creerCompte('aurore@ferme.invalid', MDP_A);
  const uidM = base.creerCompte('tresallier@ferme.invalid', MDP_M);
  base.profil(uidF, 'ferme'); base.profil(uidA, 'ferme'); base.profil(uidM, 'magasin:ta');
  const SEM = iso(lundi(0)), NUM = numSemaine(lundi(0));
  const jeton = async (email, mdp) => (await fetch(`${BASE}/v1/accounts:signInWithPassword?key=${CLE}`, { method: 'POST', body: JSON.stringify({ email, password: mdp }) }).then((x) => x.json())).idToken;
  const jetonF = await jeton('francois@ferme.invalid', MDP_F);
  const fiches = { 'carotte-lavee': { nom: 'Carotte lavée', caisse: 'PH', unite: '8 kg', kg: 8, by: 'François', at: Date.now() - 3 * 3600 * 1000 }, 'ail-sec': { nom: 'Ail sec', caisse: 'PH', unite: '5 kg', kg: 5 }, poireau: { nom: 'Poireau', caisse: 'GH', unite: '10 kg', kg: 10 } };
  await fetch(`${BASE}/listes/semaines/${SEM}.json?auth=${jetonF}`, { method: 'PUT', body: JSON.stringify({ produits: fiches }) });
  const notifsFerme = () => base.lire('notifs/ferme') || {};
  const nbFerme = () => Object.keys(notifsFerme()).length;
  const autos = () => Object.entries(notifsFerme()).filter(([, n]) => n.auto);

  const nav = await chromium.launch();
  const erreurs = [], dialogues = [];
  const ouvrir = async (nom, url, opts = devices['Pixel 7'], horloge = false) => {
    const ctx = await nav.newContext({ ...opts, serviceWorkers: 'block' });
    // Horloge : installée « horloge » millisecondes dans le passé (ou l'avenir si négatif), puis avancée par le test
    // (fastForward), pour que les heures écrites dans la base restent dans l'ordre d'une étape à l'autre.
    if (horloge !== false) await ctx.clock.install({ time: new Date(Date.now() - horloge) });
    await ctx.addInitScript((n) => { if (!localStorage.getItem('recolte.qui')) localStorage.setItem('recolte.qui', JSON.stringify(n)); }, nom);
    const p = await ctx.newPage();
    p.on('pageerror', (e) => erreurs.push(nom + ' : ' + e.message));
    p.on('dialog', (d) => { dialogues.push(d.message()); d.accept(); });
    await p.goto(`http://localhost:${PORT_SITE}/${url}`);
    return { p, ctx };
  };
  const connecter = async (p, id, mdp) => { await p.fill('#authId', id); await p.fill('#authMdp', mdp); await p.click('#authOk'); };
  const ferme = async (nom, id, mdp, opts, horloge = false) => {
    const o = await ouvrir(nom, '', opts, horloge);
    await connecter(o.p, id, mdp);
    await o.p.waitForFunction(() => document.querySelector('#sync').textContent.includes('Partagé'), null, { timeout: 10000 }).catch(() => {});
    return o;
  };
  const magasin = async (horloge = false, prenom = 'Igor') => {
    const o = await ouvrir('x', 'magasin', devices['Pixel 7'], horloge);
    await connecter(o.p, 'tresallier', MDP_M);
    await o.p.waitForSelector('#quiDlg[open]');
    await o.p.fill('#quiAutre', prenom); await o.p.click('#quiForm button[type="submit"]');
    await o.p.waitForSelector('#actions:not([hidden])');
    return o;
  };
  const ajouter = async (p, pid) => { await p.click('#ajouter'); await p.waitForSelector('#addDlg[open]'); await p.fill('#addQ', ''); await p.click(`#addList button[data-pid="${pid}"]`); await p.waitForSelector(`#liste .p[data-pid="${pid}"]`); };
  const saisir = async (p, pid, v) => { const s = `#liste .p[data-pid="${pid}"] input`; await p.fill(s, v); await p.press(s, 'Enter'); await p.waitForTimeout(80); };
  const enregistre = (p) => p.waitForFunction(() => document.querySelector('#sync').textContent.includes('Enregistré'), null, { timeout: 10000 }).then(() => true, () => false);
  const badge = (p) => p.$eval('#clocheN', (b) => (b.hidden ? '' : b.textContent));
  const capture = async (p, nom) => { if (CAPTURES) await p.screenshot({ path: path.join(CAPTURES, nom + '.png'), fullPage: false }); };

  // 0. Blocs identiques dans les deux pages (CSS, bouton, feuille, code), comme demandé par François.
  const blocs = (f) => fs.readFileSync(path.join(RACINE, f), 'utf8').split(/CLOCHE-DEBUT/).slice(1).map((x) => x.split(/CLOCHE-FIN/)[0]);
  const bi = blocs('index.html'), bm = blocs('magasin.html');
  verifie(bi.length === 4 && bm.length === 4 && bi.every((x, i) => x === bm[i]), 'la cloche est écrite une fois et recopiée à l\'identique : 4 blocs (style, bouton, feuille, code) identiques dans index.html et magasin.html');
  const cles = (f) => (fs.readFileSync(path.join(RACINE, f), 'utf8').match(/NOTIF_DELAI = ([^;]+);/) || [])[1];
  verifie(cles('index.html') === '15 * 60 * 1000', 'le délai de l\'envoi automatique est un seul réglage : 15 minutes');

  // 1. Avant la publication des nouvelles règles : rien ne casse, la cloche le dit.
  base.reglesAvantNotifs = true;
  const { p: M0, ctx: ctxM0 } = await magasin();
  await ajouter(M0, 'poireau'); await saisir(M0, 'poireau', '5');
  verifie(await enregistre(M0), 'règles d\'avant : la saisie du magasin part quand même (« Enregistré »)');
  verifie((base.lire(`magasins/ta/semaines/${SEM}/poireau`) || {}).n === 5 && !(await M0.textContent('#msg')).includes('refusée'), 'règles d\'avant : la saisie est dans la base, aucune saisie mise de côté');
  verifie(base.lire('magasins/ta/suivi') === null, 'règles d\'avant : l\'état de la semaine pour la ferme est refusé sans bruit');
  verifie(await M0.isVisible('#cloche'), 'règles d\'avant : la cloche est là');
  await M0.waitForTimeout(500);
  await M0.click('#cloche');
  await M0.waitForFunction(() => !document.querySelector('#notifEtat').hidden, null, { timeout: 5000 }).catch(() => {});
  verifie((await M0.textContent('#notifEtat')).includes('pas encore ouvertes'), 'règles d\'avant : la feuille de la cloche dit que les notifications ne sont pas encore ouvertes (« ' + (await M0.textContent('#notifEtat')) + ' »)');
  await M0.click('#notifFermer');
  await M0.click('#envoyer');
  await M0.waitForSelector('#envoi .err', { timeout: 8000 }).catch(() => {});
  verifie((await M0.textContent('#envoi')).includes('publier les nouvelles règles') && (await M0.isVisible('#envoyer')), 'règles d\'avant : « Envoyer une notification » dit que la ferme doit publier les règles, et le bouton revient');
  verifie(nbFerme() === 0, 'règles d\'avant : aucune notification écrite');
  await ctxM0.close();
  const { p: F0, ctx: ctxF0 } = await ferme('François', 'francois', MDP_F);
  await F0.waitForTimeout(1200);
  verifie((await F0.textContent('#sync')).trim() === 'Partagé' && await F0.isVisible('#cloche'), 'règles d\'avant : l\'appli de la ferme reste « Partagé », avec sa cloche');
  await ctxF0.close();
  base.reglesAvantNotifs = false;
  // On repart d'une semaine du magasin vide.
  await fetch(`${BASE}/magasins/ta/semaines/${SEM}/poireau.json?auth=${await jeton('tresallier@ferme.invalid', MDP_M)}`, { method: 'DELETE' });

  // 2. Deux téléphones de la ferme ouverts avant toute notification, un ordinateur
  const { p: F, ctx: ctxF } = await ferme('François', 'francois', MDP_F);
  const { p: A } = await ferme('Aurore', 'aurore', MDP_A);
  const { p: PC } = await ferme('François', 'francois', MDP_F, { viewport: { width: 1280, height: 860 } });
  for (const [p, nom] of [[F, 'téléphone de François'], [PC, 'ordinateur']]) {
    const b = await p.$eval('#cloche', (x) => { const r = x.getBoundingClientRect(), s = document.querySelector('#sync').getBoundingClientRect(); return { vu: r.width > 0, dedans: r.right <= innerWidth && r.left >= 0, avant: r.right <= s.left + 1, l: r.width, h: r.height }; });
    verifie(b.vu && b.dedans && b.avant && b.l >= 44 && b.h >= 44, `${nom} : la cloche est dans l'en-tête, juste avant la pastille, entière et assez grande pour un doigt (${Math.round(b.l)} × ${Math.round(b.h)} px)`);
  }
  verifie((await badge(F)) === '', 'aucune notification : pas de chiffre rouge');
  await F.click('#cloche');
  verifie((await F.textContent('#notifRien')) === 'Rien de nouveau' && await F.isVisible('#notifRien') && (await F.$$('#notifListe li')).length === 0, 'feuille vide : « Rien de nouveau »');
  await F.click('#notifFermer');

  // 3. La page du magasin : 10 saisies, aucune notification
  const { p: M, ctx: ctxM } = await magasin();
  await ajouter(M, 'carotte-lavee'); await ajouter(M, 'ail-sec'); await ajouter(M, 'poireau');
  for (const [pid, v] of [['carotte-lavee', '1'], ['carotte-lavee', '2'], ['ail-sec', '1'], ['carotte-lavee', '3'], ['ail-sec', '2'], ['carotte-lavee', '4'], ['ail-sec', '3'], ['carotte-lavee', '5'], ['ail-sec', '4'], ['carotte-lavee', '6']]) await saisir(M, pid, v);
  await enregistre(M);
  await M.waitForTimeout(500);
  verifie(nbFerme() === 0, '10 saisies sans toucher le bouton : aucune notification');
  const suivi = base.lire('magasins/ta/suivi') || {};
  verifie(suivi.w === SEM && suivi.by === 'Igor' && suivi.n === 2 && JSON.stringify(suivi.manque) === '["Poireau"]', 'chaque saisie envoie l\'état de la semaine pour la ferme : 2 produits comptés, Poireau sans quantité (' + JSON.stringify(suivi) + ')');
  const bouton = await M.$eval('#envoyer', (b) => ({ t: b.textContent, h: b.getBoundingClientRect().height, bas: b.getBoundingClientRect().top > document.querySelector('#liste').getBoundingClientRect().bottom - 1 }));
  verifie(bouton.t === 'Envoyer une notificationà la ferme : stock fini, 2 produits comptés sur 3' && bouton.h >= 60 && bouton.bas, 'en bas de la liste, gros bouton « Envoyer une notification » avec le nombre de produits comptés (« ' + bouton.t + ' », ' + Math.round(bouton.h) + ' px)');
  await capture(M, '1-magasin-bouton');

  // 4. Un produit sans quantité : fenêtre bloquante, rien n'est écrit
  const nDlg = dialogues.length;
  await M.click('#envoyer');
  await M.waitForSelector('#manqueDlg[open]');
  verifie((await M.textContent('#manqueTxt')) === 'Il manque la quantité d\'un produit : Poireau. Complétez-la avant d\'envoyer.', 'Poireau sans quantité : fenêtre « ' + (await M.textContent('#manqueTxt')) + ' »');
  verifie((await M.$$eval('#manqueDlg button', (b) => b.map((x) => x.textContent))).join() === 'Compléter', 'la fenêtre n\'a qu\'un bouton, « Compléter » (pas de « Envoyer quand même »)');
  await capture(M, '2-magasin-fenetre-bloquante');
  await M.click('#manqueOk');
  verifie(await M.$eval('#liste .p[data-pid="poireau"] input', (i) => document.activeElement === i), '« Compléter » ramène à la case du poireau, prête à remplir');
  verifie(nbFerme() === 0 && dialogues.length === nDlg, 'fenêtre bloquante : aucune notification écrite, aucune confirmation demandée');
  // Deux produits sans quantité : la liste complète
  await saisir(M, 'carotte-lavee', ''); await M.waitForTimeout(300);
  await M.click('#envoyer'); await M.waitForSelector('#manqueDlg[open]');
  verifie((await M.textContent('#manqueTxt')) === 'Il manque la quantité de 2 produits : Carotte lavée, Poireau. Complétez-les avant d\'envoyer.', 'deux produits sans quantité : « ' + (await M.textContent('#manqueTxt')) + ' »');
  await M.keyboard.press('Escape');
  verifie(!(await M.isVisible('#manqueDlg')) && nbFerme() === 0, 'Échap ferme la fenêtre comme « Compléter », toujours rien d\'écrit');

  // 5. Zéro est une quantité : l'envoi part, une seule notification
  await saisir(M, 'carotte-lavee', '6'); await saisir(M, 'poireau', '0');
  await enregistre(M);
  await M.click('#envoyer');
  verifie(dialogues[dialogues.length - 1] === `Prévenir la ferme que le stock de la semaine ${NUM} est fini ?`, 'confirmation d\'une ligne : « ' + dialogues[dialogues.length - 1] + ' »');
  await attendreQue(() => nbFerme() === 1);
  const [idMain, nMain] = Object.entries(notifsFerme())[0] || [];
  verifie(nbFerme() === 1 && nMain.type === 'stock-fini' && nMain.did === 'ta' && nMain.w === SEM && nMain.by === 'Igor' && nMain.n === 3 && !nMain.auto, 'avec un zéro, c\'est accepté : une seule notification à la ferme (' + JSON.stringify(nMain) + ')');
  await M.waitForSelector('#envoi .envoi-ok');
  verifie((await M.textContent('#envoi .envoi-ok')) === 'Ferme prévenue à ' + heure(nMain.at) && !(await M.isVisible('#envoyer')), 'après l\'envoi : « ' + (await M.textContent('#envoi .envoi-ok')) + ' », le bouton se range');
  await capture(M, '3-magasin-ferme-prevenue');

  // 6. La cloche de la ferme : chiffre en direct, chacun le sien
  const t0 = Date.now();
  await attendreQue(async () => (await badge(F)) === '1' && (await badge(A)) === '1' && (await badge(PC)) === '1', 25000);
  verifie((await badge(F)) === '1' && (await badge(A)) === '1' && (await badge(PC)) === '1', 'la notification arrive sans recharger : chiffre rouge 1 chez François, Aurore et sur l\'ordinateur (en ' + Math.round((Date.now() - t0) / 1000) + ' s, relue toutes les 15 s)');
  const pastille = await F.$eval('#clocheN', (b) => getComputedStyle(b).backgroundColor + '|' + getComputedStyle(b).color);
  verifie(pastille === 'rgb(224, 0, 0)|rgb(255, 255, 255)', 'chiffre blanc sur pastille rouge vif (' + pastille + ')');
  const { p: N, ctx: ctxN } = await ferme('François', 'francois', MDP_F);
  await N.waitForTimeout(1000);
  verifie((await badge(N)) === '', 'un nouveau téléphone part de « tout lu » : pas de chiffre pour les anciennes notifications');
  await ctxN.close();
  await capture(F, '4-ferme-chiffre');
  await F.click('#cloche');
  const item = await F.$eval('#notifListe .notif-i', (b) => ({ t: b.querySelector('.notif-t').textContent, s: b.querySelector('small').textContent, nouv: b.classList.contains('notif-nouv'), bord: getComputedStyle(b).borderTopWidth }));
  verifie((await badge(F)) === '' && (await badge(A)) === '1', 'à l\'ouverture de la feuille, le chiffre de François retombe à zéro ; celui d\'Aurore reste à 1');
  verifie(item.t === `Igor a fini le stock de Très Allier · semaine ${NUM} · 3 produits` && item.s === 'Igor, aujourd\'hui à ' + heure(nMain.at), 'texte : « ' + item.t + ' », puis « ' + item.s + ' »');
  verifie(item.nouv && item.bord === '4px' && !(await F.isVisible('#notifRien')), 'la nouveauté est encadrée en gras (trait de 4 px) (' + JSON.stringify(item) + ', « Rien de nouveau » ' + (await F.isVisible('#notifRien') ? 'affiché' : 'caché') + ')');
  await capture(F, '5-ferme-feuille');
  await F.click('#notifLu');
  verifie(!(await F.$eval('#notifListe .notif-i', (b) => b.classList.contains('notif-nouv'))) && await F.isVisible('#notifRien'), '« Tout marquer comme lu » : plus de gras, « Rien de nouveau »');
  await F.click('#notifListe .notif-i');
  await F.waitForSelector('#semStkList .stk-bloc');
  verifie(!(await F.isVisible('#notifDlg')) && (await F.getAttribute('[data-view="semaine"]', 'aria-pressed')) === 'true' && (await F.getAttribute('[data-sem="stock"]', 'aria-pressed')) === 'true' && (await F.textContent('#semTitre')).startsWith('Semaine ' + NUM), 'toucher la notification ouvre l\'onglet Semaine, page Stock, à la bonne semaine');
  await F.reload(); await F.waitForTimeout(1200);
  verifie((await badge(F)) === '', 'après rechargement, la notification reste lue sur ce téléphone');

  // 7. Le magasin saisit encore : le bouton revient, mais jamais deux envois en moins de deux minutes
  await saisir(M, 'ail-sec', '5'); await enregistre(M);
  verifie(await M.isVisible('#envoyer'), 'une saisie après l\'envoi : le bouton revient');
  await M.click('#envoyer');
  await M.waitForTimeout(500);
  verifie((await M.textContent('#envoi .err')) === 'Une notification vient de partir. Réessayez dans deux minutes.' && nbFerme() === 1, 'nouvel appui moins de deux minutes après : « Une notification vient de partir… », toujours une seule notification');

  // 8. La ferme prévient le magasin
  await F.waitForSelector('[data-a="prevenir"]');
  verifie(await F.isVisible('[data-a="prevenir"]'), 'page Stock de la ferme : bouton « Prévenir le magasin »');
  await F.click('[data-a="prevenir"]');
  verifie(dialogues[dialogues.length - 1] === `Prévenir Très Allier que la liste de la semaine ${NUM} est à jour ?`, 'confirmation d\'une ligne : « ' + dialogues[dialogues.length - 1] + ' »');
  await attendreQue(() => base.lire('notifs/magasin/ta'));
  const nm = Object.values(base.lire('notifs/magasin/ta') || {});
  verifie(nm.length === 1 && nm[0].type === 'liste-misealajour' && nm[0].w === SEM && nm[0].by === 'François' && nm[0].n === 3 && Object.keys(nm[0]).sort().join() === 'at,by,n,type,w', 'une notification pour le magasin, rien d\'autre que la semaine et le nombre de produits (' + JSON.stringify(nm[0]) + ')');
  await F.waitForSelector('.mag-prev .mag-ok');
  const dd = new Date(nm[0].at);
  verifie((await F.textContent('.mag-prev .mag-ok')) === `Magasin prévenu le ${String(dd.getDate()).padStart(2, '0')}/${String(dd.getMonth() + 1).padStart(2, '0')} à ${heure(nm[0].at)}` && !(await F.$('[data-a="prevenir"]')), 'après l\'appui : « ' + (await F.textContent('.mag-prev .mag-ok')) + ' », le bouton se range');
  await capture(F, '6-ferme-magasin-prevenu');
  await M.waitForFunction(() => !document.querySelector('#clocheN').hidden, null, { timeout: 25000 }).catch(() => {});
  verifie((await badge(M)) === '1', 'la cloche du magasin passe à 1, sans recharger');
  await capture(M, '7-magasin-chiffre');
  await M.click('#cloche');
  verifie((await M.textContent('#notifListe .notif-t')) === `La ferme a mis à jour la liste de la semaine ${NUM} · 3 produits` && (await badge(M)) === '', 'feuille du magasin : « ' + (await M.textContent('#notifListe .notif-t')) + ' », chiffre retombé');
  verifie(await M.$eval('#notifListe .notif-i', (b) => b.classList.contains('notif-nouv')) && await M.isVisible('#notifLu'), 'même feuille que la ferme : nouveauté en gras, « Tout marquer comme lu »');
  await capture(M, '8-magasin-feuille');
  await M.click('#notifFermer');
  // La liste de la ferme change : le bouton revient
  await fetch(`${BASE}/listes/semaines/${SEM}/produits/radis-long-rose.json?auth=${jetonF}`, { method: 'PUT', body: JSON.stringify({ nom: 'Radis long rose', caisse: 'PB', unite: '10 bottes', par_colis: 10, type: 'botte', by: 'Aurore', at: Date.now() + 1000 }) });
  await F.waitForSelector('[data-a="prevenir"]', { timeout: 8000 }).catch(() => {});
  verifie(!!(await F.$('[data-a="prevenir"]')) && (await F.textContent('.mag-prev .mag-ok')).endsWith('la liste a changé depuis'), 'la liste de la semaine change ensuite : « … la liste a changé depuis » et le bouton revient');

  // 9. Ce que les comptes peuvent faire (règles imitées ; les vraies sont essayées par tests/regles.cjs)
  const jM = await jeton('tresallier@ferme.invalid', MDP_M);
  const lireM = await fetch(`${BASE}/notifs/ferme.json?auth=${jM}`);
  const ecrireM = await fetch(`${BASE}/notifs/magasin/ta/x.json?auth=${jM}`, { method: 'PUT', body: JSON.stringify({ type: 'liste-misealajour', w: SEM, by: 'Igor', n: 1, at: 1 }) });
  verifie(lireM.status === 401 && ecrireM.status === 401, 'le compte du magasin ne lit pas notifs/ferme et n\'écrit pas dans notifs/magasin');

  // 10. Envoi automatique, page du magasin ouverte : 15 minutes après la dernière saisie, avec la liste complète des manques
  await ctxM.close();
  const { p: MC, ctx: ctxMC } = await magasin(70 * MIN);
  await MC.waitForSelector('#liste .p[data-pid="carotte-lavee"]');
  await ajouter(MC, 'celeri-rave'); await ajouter(MC, 'radis-long-rose');
  await saisir(MC, 'carotte-lavee', '7'); await enregistre(MC);
  const derniere = await MC.evaluate(() => JSON.parse(localStorage.getItem('magasin.derniere')).at);
  await ctxMC.clock.fastForward(14 * MIN);
  await MC.waitForTimeout(800);
  verifie(autos().length === 0, '14 minutes après la dernière saisie : pas encore de notification automatique');
  await ctxMC.clock.fastForward(2 * MIN);
  await attendreQue(() => autos().length === 1);
  const [idAuto, nAuto] = autos()[0] || [];
  verifie(autos().length === 1 && idAuto === `${derniere + 15 * MIN}-auto-ta-${SEM}` && nAuto.at === derniere + 15 * MIN && nAuto.by === 'Igor' && nAuto.n === 3 && JSON.stringify(nAuto.manque) === '["Céleri-rave","Radis long rose"]', 'au bout de 15 minutes, une notification automatique, marquée « incomplet » avec la liste complète des produits sans quantité (' + JSON.stringify(nAuto) + ')');
  await ctxMC.clock.fastForward(20 * MIN);
  await MC.waitForTimeout(800);
  verifie(autos().length === 1, 'pas deux fois pour la même dernière saisie');
  await F.waitForFunction(() => document.querySelector('#clocheN').textContent === '1' && !document.querySelector('#clocheN').hidden, null, { timeout: 25000 }).catch(() => {});
  await F.click('#cloche');
  // (L'horloge de cette page du magasin a été mise dans le passé : la notification se range plus bas que la précédente.)
  const ta = await F.$eval('#notifListe .notif-i:has(.notif-auto)', (b) => b.querySelector('.notif-t').textContent + (b.classList.contains('notif-nouv') ? ' [nouvelle]' : ''));
  verifie(ta === `Igor n'a rien saisi depuis 15 minutes · stock de Très Allier incomplet : 2 produits sans quantité (Céleri-rave, Radis long rose) · semaine ${NUM} automatique [nouvelle]`, 'la feuille de la ferme affiche la liste en entier, marquée « automatique » (« ' + ta + ' »)');
  await capture(F, '9-ferme-automatique');
  await F.click('#notifListe .notif-i:has(.notif-auto)');
  await F.waitForSelector('.mag-manque');
  verifie((await F.textContent('.mag-manque')).endsWith(': Céleri-rave, Radis long rose.'), 'toucher la notification : la page Stock rappelle les produits sans quantité (« ' + (await F.textContent('.mag-manque')) + ' »)');

  // 11. Pas d'automatique si « Envoyer une notification » est venu après la dernière saisie
  await saisir(MC, 'celeri-rave', '2'); await saisir(MC, 'radis-long-rose', '1'); await enregistre(MC);
  await MC.click('#envoyer');
  await attendreQue(() => nbFerme() === 3);
  await ctxMC.clock.fastForward(16 * MIN);
  await MC.waitForTimeout(1000);
  verifie(nbFerme() === 3 && autos().length === 1, '« Envoyer une notification » après la dernière saisie, puis 16 minutes : aucune notification automatique');
  await ctxMC.clock.fastForward(16 * MIN);
  await ctxMC.close();

  // 12. Page du magasin fermée : l'appli de la ferme envoie l'automatique, une seule fois
  const { p: MX, ctx: ctxMX } = await magasin();
  await MX.waitForSelector('#liste .p[data-pid="ail-sec"]');
  await saisir(MX, 'ail-sec', '9'); await enregistre(MX);
  const t3 = await MX.evaluate(() => JSON.parse(localStorage.getItem('magasin.derniere')).at);
  await attendreQue(() => (base.lire('magasins/ta/suivi') || {}).at === t3);
  await ctxMX.close();
  const { p: FC, ctx: ctxFC } = await ferme('Aurore', 'aurore', MDP_A, devices['Pixel 7'], 0);
  await FC.waitForTimeout(1500);
  verifie(autos().length === 1, 'appli de la ferme ouverte juste après la dernière saisie : rien (moins de 15 minutes)');
  await ctxFC.clock.fastForward(16 * MIN);
  await attendreQue(() => autos().length === 2);
  const a2 = notifsFerme()[`${t3 + 15 * MIN}-auto-ta-${SEM}`];
  verifie(autos().length === 2 && a2 && a2.by === 'Igor' && a2.n === 5 && !a2.manque, 'page du magasin fermée : l\'appli de la ferme envoie elle-même l\'automatique, au nom d\'Igor, stock complet (' + JSON.stringify(a2) + ')');
  await ctxFC.clock.fastForward(16 * MIN);
  await FC.waitForTimeout(800);
  verifie(autos().length === 2, 'l\'appli de la ferme ne la renvoie pas');

  // 13. Les deux comptes à rebours en même temps : une seule notification
  // (Cette page du magasin est réglée 16 minutes en avance, pour que sa saisie soit la plus récente.)
  const { p: MD, ctx: ctxMD } = await magasin(-16 * MIN);
  await MD.waitForSelector('#liste .p[data-pid="poireau"]');
  await saisir(MD, 'poireau', '4'); await enregistre(MD);
  const t4 = await MD.evaluate(() => JSON.parse(localStorage.getItem('magasin.derniere')).at);
  await attendreQue(() => (base.lire('magasins/ta/suivi') || {}).at === t4);
  await ctxFC.clock.fastForward(16 * MIN);
  await ctxMD.clock.fastForward(16 * MIN);
  await attendreQue(() => autos().length === 3);
  await MD.waitForTimeout(1500); await FC.waitForTimeout(500);
  const qui4 = base.journal.filter((j) => j.m === 'PUT' && j.p === `notifs/ferme/${t4 + 15 * MIN}-auto-ta-${SEM}`).length;
  verifie(autos().length === 3 && qui4 === 2, 'page du magasin ouverte et appli de la ferme : les deux envoient (' + qui4 + ' envois), une seule notification existe');
  await ctxMD.close(); await ctxFC.close();

  // 14. Sans réseau : le bouton part au retour du réseau
  const { p: MO, ctx: ctxMO } = await magasin(false, 'Léa');
  await MO.waitForSelector('#liste .p[data-pid="poireau"]');
  await saisir(MO, 'poireau', '3'); await enregistre(MO);
  const avantHL = nbFerme();
  await ctxMO.setOffline(true);
  await MO.click('#envoyer');
  await MO.waitForSelector('#envoi .envoi-ok');
  verifie((await MO.textContent('#envoi')).includes('partira toute seule au retour du réseau') && nbFerme() === avantHL, 'sans réseau : « Ferme prévenue… », la notification attend sur le téléphone (rien dans la base)');
  await capture(MO, '10-magasin-hors-ligne');
  await ctxMO.setOffline(false);
  await MO.evaluate(() => dispatchEvent(new Event('online')));
  await attendreQue(() => nbFerme() === avantHL + 1, 20000);
  verifie(nbFerme() === avantHL + 1 && Object.values(notifsFerme()).some((n) => n.by === 'Léa' && !n.auto), 'au retour du réseau, la notification part toute seule');
  await ctxMO.close();

  verifie(erreurs.length === 0, 'aucune erreur JavaScript' + (erreurs.length ? ' : ' + erreurs.join(' | ') : ''));
  await nav.close(); site.close(); base.close();
  console.log(echecs ? `\n${echecs} échec(s)` : '\nTout est bon.');
  process.exit(echecs ? 1 : 0);
})().catch((x) => { console.error(x); process.exit(1); });
