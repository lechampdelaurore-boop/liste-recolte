// Test de bout en bout de la saisie du stock par la ferme dans la page Stock (demande de François du 21/11/2026) :
// semaine vide → « Reprendre la liste de la semaine dernière » ou « Ajouter les produits un par un » ; produits ajoutés
// en bas, dans l'ordre du tour du magasin ; un produit compté entre dans la semaine ; deux téléphones et un ordinateur.
// Lancement depuis la racine du dépôt : node tests/stock-tour.cjs (CAPTURES=dossier pour garder les captures)
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');
const fauxFirebase = require('./faux-firebase.cjs');

const RACINE = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const PORT_SITE = 8990, PORT_BASE = 8991;
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
// « du lundi 9 au dimanche 15 novembre » (écrit autrement que dans l'appli, pour la vérifier)
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const duAuAttendu = (d) => { if (typeof d === 'string') { const p = d.split('-'); d = new Date(+p[0], p[1] - 1, +p[2]); } const f = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 6); const an = d.getFullYear() !== new Date().getFullYear() || f.getFullYear() !== d.getFullYear(); if (f.getFullYear() !== d.getFullYear()) return `du lundi ${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()} au dimanche ${f.getDate()} ${MOIS[f.getMonth()]} ${f.getFullYear()}`; return `du lundi ${d.getDate()}${f.getMonth() === d.getMonth() ? '' : ' ' + MOIS[d.getMonth()]} au dimanche ${f.getDate()} ${MOIS[f.getMonth()]}` + (an ? ' ' + f.getFullYear() : ''); };
const attendreQue = async (fn, ms = 8000) => { const fin = Date.now() + ms; while (Date.now() < fin) { if (await fn()) return true; await new Promise((x) => setTimeout(x, 150)); } return false; };


(async () => {
  const site = await serveurSite();
  const base = await fauxFirebase(PORT_BASE, { comptes: { cle: CLE } });
  const uidF = base.creerCompte('francois@ferme.invalid', MDP_F);
  const uidA = base.creerCompte('aurore@ferme.invalid', MDP_F);
  const uidM = base.creerCompte('tresallier@ferme.invalid', MDP_M);
  base.profil(uidF, 'ferme'); base.profil(uidA, 'ferme'); base.profil(uidM, 'magasin:ta');
  // Cette semaine (SEM) : la ferme a compté la carotte lavée puis le poireau au magasin ; le magasin a compté l'ail sec
  // après eux. Le samedi, François prépare la semaine prochaine (SUIV), encore vide.
  const SEM = iso(lundi(0)), SUIV = iso(lundi(1)), t0 = lundi(0).getTime() + 5 * 86400000 + 9 * 3600000;
  const jeton = async (id, mdp) => (await fetch(`${BASE}/v1/accounts:signInWithPassword?key=${CLE}`, { method: 'POST', body: JSON.stringify({ email: id + '@ferme.invalid', password: mdp }) }).then((x) => x.json())).idToken;
  const jetonF = await jeton('francois', MDP_F), jetonM = await jeton('tresallier', MDP_M);
  await fetch(`${BASE}/listes/semaines/${SEM}.json?auth=${jetonF}`, { method: 'PUT', body: JSON.stringify({
    produits: { 'carotte-lavee': { nom: 'Carotte lavée', caisse: 'PH', unite: '8 kg', kg: 8 }, poireau: { nom: 'Poireau', caisse: 'GH', unite: '10 kg', kg: 10 } },
    stock: { 'carotte-lavee': { ta: { n: 12, u: 'colis', by: 'François', at: t0 } }, poireau: { ta: { n: 6, u: 'colis', by: 'François', at: t0 + 60000 } } },
    stockListe: { ta: { 'carotte-lavee': { o: t0, by: 'François', at: t0 }, poireau: { o: t0 + 60000, by: 'François', at: t0 } } } }) });
  await fetch(`${BASE}/magasins/ta/semaines/${SEM}/ail-sec.json?auth=${jetonM}`, { method: 'PUT', body: JSON.stringify({ n: 2, u: 'colis', by: 'Igor', at: t0 + 120000 }) });

  const nav = await chromium.launch();
  const erreurs = [], dialogues = [];
  let refuser = false;
  const ouvrir = async (nom, opts = devices['Pixel 7']) => {
    const ctx = await nav.newContext({ ...opts, serviceWorkers: 'block' });
    await ctx.addInitScript((n) => localStorage.setItem('recolte.qui', JSON.stringify(n)), nom);
    const p = await ctx.newPage();
    p.on('pageerror', (e) => erreurs.push(nom + ' : ' + e.message));
    p.on('dialog', (d) => { dialogues.push(d.message()); if (refuser) d.dismiss(); else d.accept(); });
    await p.goto(`http://localhost:${PORT_SITE}/?liste=2026-11-04`);
    return p;
  };
  const connecter = async (p, id, mdp) => { await p.fill('#authId', id); await p.fill('#authMdp', mdp); await p.click('#authOk'); };
  const capture = async (p, nom) => { if (CAPTURES) await p.screenshot({ path: path.join(CAPTURES, nom + '.png'), fullPage: !nom.includes('ajouter-un-produit') }); };
  const ordre = (p) => p.$$eval('#semStkList .stk-l', (e) => e.map((x) => x.dataset.pid).join());
  const carte = (pid) => `#semStkList .stk-l[data-pid="${pid}"]`;
  const tour = () => base.lire(`listes/semaines/${SUIV}/stockListe/ta`) || {};
  const allerStock = async (p) => {
    await p.click('[data-view="semaine"]');
    await p.waitForSelector('#semSub [data-sem="stock"]:not([hidden])');
    await p.click('[data-sem="stock"]');
    await p.waitForSelector('#semStkList .stk-bloc');
    await p.click('#semNav [data-a="semSuiv"]');
    await p.waitForFunction((n) => document.querySelector('#semTitre').textContent.startsWith('Semaine ' + n), numSemaine(lundi(1)));
  };

  // 1. Semaine prochaine, vide : deux gros boutons
  const F = await ouvrir('François');
  await connecter(F, 'francois', MDP_F);
  await allerStock(F);
  await F.waitForFunction(() => { const b = document.querySelector('#semStkList [data-a="stk-reprendre"]'); return b && b.textContent.includes('3 produits'); }, null, { timeout: 8000 }).catch(() => {});
  verifie((await F.textContent('#semStkList h2')) === 'Stock chez Très Allier' && (await F.textContent('#semStkList .stk-q')).includes('Comment voulez-vous faire votre tour du magasin'), 'semaine prochaine sans stock : « Stock chez Très Allier » (nom tiré des réglages), « Comment voulez-vous faire votre tour du magasin ? »');
  verifie((await F.textContent('#semStkList .stk-gros[data-a="stk-reprendre"]')) === 'Reprendre la liste de la semaine dernière3 produits comptés chez Très Allier, sans les quantités', 'gros bouton « Reprendre la liste de la semaine dernière » : 3 produits comptés (2 par la ferme, 1 par le magasin)');
  verifie((await F.textContent('#semStkList .stk-gros[data-a="stk-ajouter"]')).startsWith('＋ Ajouter les produits un par un') && (await F.$$('#semStkList .stk-l')).length === 0 && !(await F.isVisible('#semStkList .stk-plus')), 'gros bouton « Ajouter les produits un par un » ; aucune carte de produit');
  await capture(F, '1-telephone-semaine-vide');

  // 2. Reprendre : les produits reviennent sans quantité, « À compter », dans l'ordre du tour d'avant
  await F.click('#semStkList [data-a="stk-reprendre"]');
  await F.waitForSelector(carte('ail-sec'));
  verifie((await ordre(F)) === 'carotte-lavee,poireau,ail-sec', 'après « Reprendre » : carotte lavée, poireau, ail sec, dans l\'ordre du tour de la semaine dernière (obtenu ' + (await ordre(F)) + ')');
  const etats = await F.$$eval('#semStkList .stk-etat', (e) => e.map((x) => x.textContent));
  verifie(etats.join() === 'À compter,À compter,À compter' && (await F.inputValue(carte('poireau') + ' input')) === '', 'les trois sont « À compter », cases vides');
  verifie((await F.textContent(carte('poireau') + ' .sr-eq')).includes('Semaine d\'avant : 6 GH (François, ') && (await F.textContent(carte('ail-sec') + ' .sr-eq')).includes('Semaine d\'avant : 2 PH (Igor (magasin), '), 'rappel sous chaque case : « Semaine d\'avant : 6 GH (François, …) », « Semaine d\'avant : 2 PH (Igor (magasin), …) »');
  await attendreQue(() => Object.keys(tour()).length === 3);
  const t1 = tour();
  verifie(Object.keys(t1).length === 3 && t1['carotte-lavee'].o < t1.poireau.o && t1.poireau.o < t1['ail-sec'].o && t1.poireau.by === 'François', 'base : la liste du tour est gardée dans la semaine (stockListe/ta), avec son ordre et « François »');
  verifie(!base.lire(`listes/semaines/${SUIV}/stock`) && !base.lire(`listes/semaines/${SUIV}/produits`), 'reprendre n\'écrit aucune quantité et ne touche pas encore la semaine de répartition');
  verifie((await F.textContent('#semStkList .sp-by')).startsWith('0 compté sur 3 · dans l\'ordre de votre tour du magasin'), 'en-tête : « 0 compté sur 3 · dans l\'ordre de votre tour du magasin »');

  // 3. Compter le poireau : enregistré, « Compté », et le poireau entre dans la semaine
  await F.fill(carte('poireau') + ' input', '5');
  await F.press(carte('poireau') + ' input', 'Enter');
  await attendreQue(() => base.lire(`listes/semaines/${SUIV}/stock/poireau/ta`));
  const sp = base.lire(`listes/semaines/${SUIV}/stock/poireau/ta`) || {}, pp = base.lire(`listes/semaines/${SUIV}/produits/poireau`) || {};
  verifie(sp.n === 5 && sp.u === 'colis' && sp.by === 'François', 'poireau compté : 5 GH, à son nom');
  verifie(pp.nom === 'Poireau' && pp.by === 'François', 'le poireau compté entre dans la semaine de répartition (fiche du référentiel)');
  await F.waitForTimeout(300);
  verifie((await ordre(F)) === 'carotte-lavee,poireau,ail-sec' && (await F.textContent(carte('poireau') + ' .stk-etat')) === 'Compté' && (await F.textContent('#semStkList .sp-by')).startsWith('1 compté sur 3'), 'le poireau reste à sa place, « Compté », en-tête « 1 compté sur 3 »');
  await capture(F, '2-telephone-liste-reprise');

  // 4. Ajouter un produit un par un : en bas, la case du chiffre prête
  verifie(await F.isVisible('#semStkList .stk-plus'), 'un bouton « Ajouter un produit » reste en bas de la liste');
  await F.click('#semStkList .stk-plus');
  await F.waitForSelector('#addDlg[open]');
  verifie((await F.textContent('#addSub')).startsWith('Un produit à la fois'), 'la fenêtre dit « Un produit à la fois… »');
  await F.fill('#addQ', 'carotte');
  verifie((await F.$$eval('#addList button', (e) => e.map((x) => x.dataset.nom))).join() === 'Carotte (botte)', 'la recherche ne propose pas un produit déjà dans le tour (carotte lavée)');
  await F.fill('#addQ', 'cél');
  await capture(F, '3-telephone-ajouter-un-produit');
  await F.click('#addList button[data-nom="Céleri-rave"]');
  await F.waitForSelector(carte('celeri-rave'));
  verifie(!(await F.isVisible('#addDlg')) && (await ordre(F)) === 'carotte-lavee,poireau,ail-sec,celeri-rave', 'un appui sur « Céleri-rave » : la fenêtre se ferme, le céleri-rave arrive en bas (obtenu ' + (await ordre(F)) + ')');
  verifie((await F.evaluate(() => { const a = document.activeElement; return a && a.closest('.stk-l') && a.closest('.stk-l').dataset.pid; })) === 'celeri-rave', 'le curseur est dans la case du céleri-rave');
  verifie((await F.textContent(carte('celeri-rave') + ' .sr-eq')).includes('Ajouté à votre semaine') && (base.lire(`listes/semaines/${SUIV}/produits/celeri-rave`) || {}).nom === 'Céleri-rave', '« Ajouté à votre semaine » : le céleri-rave entre dans la semaine');
  await capture(F, '4-telephone-produit-ajoute');
  await F.fill(carte('celeri-rave') + ' input', '3');
  await F.press(carte('celeri-rave') + ' input', 'Enter');
  await attendreQue(() => base.lire(`listes/semaines/${SUIV}/stock/celeri-rave/ta`));

  // 5. Un deuxième téléphone voit la même liste, dans le même ordre
  const A = await ouvrir('Aurore');
  await connecter(A, 'aurore', MDP_F);
  await allerStock(A);
  await A.waitForFunction(() => document.querySelectorAll('#semStkList .stk-l').length === 4, null, { timeout: 8000 }).catch(() => {});
  verifie((await ordre(A)) === 'carotte-lavee,poireau,ail-sec,celeri-rave' && (await A.inputValue(carte('celeri-rave') + ' input')) === '3', 'chez Aurore : la même liste, dans le même ordre, céleri-rave 3');

  // 6. Retirer (×) : sans chiffre, tout de suite ; avec un chiffre, après confirmation ; le produit reste dans la semaine
  await F.click(carte('carotte-lavee') + ' [data-a="stk-retirer"]');
  await attendreQue(() => !tour()['carotte-lavee']);
  verifie(!tour()['carotte-lavee'] && (await ordre(F)) === 'poireau,ail-sec,celeri-rave', '× sur la carotte lavée (pas comptée) : elle quitte la liste');
  const nd = dialogues.length;
  refuser = true;
  await F.click(carte('poireau') + ' [data-a="stk-retirer"]');
  await F.waitForTimeout(200);
  refuser = false;
  verifie(dialogues.length === nd + 1 && dialogues[nd].startsWith('Retirer « Poireau » du stock chez Très Allier ? Le chiffre noté (5 GH) sera effacé.') && !!tour().poireau, '× sur le poireau compté : confirmation demandée ; en refusant, rien ne change');
  await F.click(carte('poireau') + ' [data-a="stk-retirer"]');
  await attendreQue(() => !tour().poireau);
  verifie(!tour().poireau && !base.lire(`listes/semaines/${SUIV}/stock/poireau/ta`) && !!base.lire(`listes/semaines/${SUIV}/produits/poireau`), 'en acceptant : le poireau quitte la liste, son chiffre est effacé, il reste dans la semaine de répartition');

  // 7. Ordinateur : boutons en haut du cadre, produits en colonnes ; « Reprendre » ne rajoute que ce qui manque, en bas
  const PC = await ouvrir('François', { viewport: { width: 1280, height: 800 } });
  await connecter(PC, 'francois', MDP_F);
  await allerStock(PC);
  await PC.waitForSelector('#semStkList .stk-tete [data-a="stk-reprendre"]', { timeout: 8000 }).catch(() => {});
  const haut = await PC.$eval('#semStkList .stk-tete', (e) => [...e.querySelectorAll('button')].filter((b) => b.offsetParent).map((b) => b.textContent).join('|'));
  verifie(haut === 'Reprendre la liste de la semaine dernière|＋ Ajouter un produit', 'ordinateur : « Reprendre la liste de la semaine dernière » et « Ajouter un produit » en haut du cadre (obtenu ' + haut + ')');
  const cols = await PC.$eval('#semStkList .stk-list', (e) => getComputedStyle(e).gridTemplateColumns.split(' ').length);
  verifie(cols >= 2, 'ordinateur : les produits sont en ' + cols + ' colonnes');
  await PC.click('#semStkList .stk-tete [data-a="stk-reprendre"]');
  await PC.waitForFunction(() => document.querySelectorAll('#semStkList .stk-l').length === 4, null, { timeout: 8000 }).catch(() => {});
  verifie((await ordre(PC)) === 'ail-sec,celeri-rave,carotte-lavee,poireau', '« Reprendre » remet seulement la carotte et le poireau, en bas, sans toucher aux autres (obtenu ' + (await ordre(PC)) + ')');
  verifie(!(await PC.$('#semStkList .stk-tete [data-a="stk-reprendre"]')), 'une fois tout repris, le bouton « Reprendre » disparaît');
  await PC.fill(carte('ail-sec') + ' input', '4');
  await PC.press(carte('ail-sec') + ' input', 'Enter');
  await attendreQue(() => base.lire(`listes/semaines/${SUIV}/stock/ail-sec/ta`));
  await PC.click(carte('ail-sec'));
  await PC.waitForTimeout(300);
  await capture(PC, '5-ordinateur-stock');

  // 8. Le reste de l'onglet n'a pas bougé : Répartir montre les produits comptés ou ajoutés
  await F.click('[data-sem="repartir"]');
  await F.waitForSelector('#semView section.sp');
  const rep = await F.$$eval('#semList section.sp', (e) => e.map((x) => x.dataset.pid).join());
  verifie(rep === 'ail-sec,celeri-rave,poireau', 'page Répartir : ail sec, céleri-rave et poireau (comptés ou ajoutés à la main) ; carotte lavée, reprise mais pas encore comptée, n\'y est pas (obtenu ' + rep + ')');
  // Retirer un produit de la semaine le retire aussi du tour.
  await F.click('#semList section.sp[data-pid="celeri-rave"] .sp-head');
  await F.click('#semList section.sp[data-pid="celeri-rave"] [data-a="retirer"]');
  await attendreQue(() => !tour()['celeri-rave']);
  verifie(!tour()['celeri-rave'] && !base.lire(`listes/semaines/${SUIV}/produits/celeri-rave`), 'retirer le céleri-rave de la semaine le retire aussi de la liste du stock');

  verifie(erreurs.length === 0, 'aucune erreur JavaScript' + (erreurs.length ? ' : ' + erreurs.join(' | ') : ''));
  await nav.close(); site.close(); base.close();
  console.log(echecs ? echecs + ' échec(s)' : 'Tout est bon.');
  process.exit(echecs ? 1 : 0);
})().catch((x) => { console.error(x); process.exit(1); });
