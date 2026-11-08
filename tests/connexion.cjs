// Test de bout en bout de la connexion par compte (étape 5) : la base est fermée (règles de
// docs/regles-base/fermees.json imitées par le faux Firebase), deux téléphones se connectent une fois,
// partagent leurs coches, survivent à l'expiration du jeton et au mode hors ligne ; un compte sans profil
// est refusé ; la déconnexion et un compte supprimé redemandent la connexion.
// Lancement depuis la racine du dépôt : npm install --no-save playwright && node tests/connexion.cjs
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');
const fauxFirebase = require('./faux-firebase.cjs');

const RACINE = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const PORT_SITE = 8796, PORT_BASE = 8797;
const BASE = `http://localhost:${PORT_BASE}`;
const CLE = 'cle-de-test';
const MDP_F = 'mot-de-passe-francois', MDP_A = 'mot-de-passe-aurore', MDP_E = 'mot-de-passe-essai';
const CAPTURES = process.env.CAPTURES || '';

function serveurSite() {
  return new Promise((ok) => {
    const s = http.createServer((q, r) => {
      let f = decodeURIComponent(new URL(q.url, 'http://x').pathname);
      if (f.endsWith('/')) f += 'index.html';
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

(async () => {
  const site = await serveurSite();
  const base = await fauxFirebase(PORT_BASE, { comptes: { cle: CLE } });
  const uidF = base.creerCompte('francois@ferme.invalid', MDP_F);
  const uidA = base.creerCompte('aurore@ferme.invalid', MDP_A);
  base.creerCompte('essai@ferme.invalid', MDP_E);
  base.profil(uidF, 'ferme'); base.profil(uidA, 'ferme');
  const nav = await chromium.launch();
  const erreurs = [];
  const telephone = async (nom) => {
    const ctx = await nav.newContext({ ...devices['Pixel 7'], serviceWorkers: 'block' });
    await ctx.addInitScript((n) => localStorage.setItem('recolte.qui', JSON.stringify(n)), nom);
    const p = await ctx.newPage();
    p.on('pageerror', (e) => erreurs.push(nom + ' : ' + e.message));
    p.on('dialog', (d) => d.accept());
    await p.goto(`http://localhost:${PORT_SITE}/`);
    await p.waitForSelector('li.item');
    return { p, ctx };
  };
  const statut = async (p) => (await p.textContent('#sync')).trim();
  const partage = (p) => p.waitForFunction(() => document.querySelector('#sync').textContent.includes('Partagé'), null, { timeout: 20000 });
  const connecter = async (p, id, mdp) => { await p.fill('#authId', id); await p.fill('#authMdp', mdp); await p.click('#authOk'); };
  const coches = (p) => p.$$eval('#done li.item', (e) => e.map((x) => x.dataset.id).sort().join(','));
  const capture = async (p, nom) => { if (CAPTURES) await p.screenshot({ path: path.join(CAPTURES, nom + '.png') }); };

  // 1. Premier lancement : la fenêtre de connexion, et aucune lecture de la base sans compte
  const { p: A, ctx: ctxA } = await telephone('François');
  await A.waitForTimeout(400);
  verifie(await A.isVisible('#authDlg'), 'au premier lancement, la fenêtre « Se connecter » s\'ouvre');
  verifie((await statut(A)) === 'Pas connecté', 'la pastille dit « Pas connecté » (obtenu « ' + (await statut(A)) + ' »)');
  verifie(await A.isVisible('li.item'), 'la liste du jour (publique, sur le site) reste lisible derrière la fenêtre');
  await A.keyboard.press('Escape');
  await A.waitForTimeout(200);
  verifie(await A.isVisible('#authDlg'), 'la touche Échap ne ferme pas la fenêtre de connexion');
  verifie(base.journal.length === 0, 'aucun appel à la base avant la connexion (obtenu ' + base.journal.length + ')');
  await capture(A, '1-connexion');

  // 2. Mauvais mot de passe
  await connecter(A, 'francois', 'faux');
  await A.waitForSelector('#authErr:not([hidden])');
  verifie((await A.textContent('#authErr')) === 'Identifiant ou mot de passe faux.', 'mauvais mot de passe : « Identifiant ou mot de passe faux. » (obtenu « ' + (await A.textContent('#authErr')) + ' »)');
  verifie(await A.isVisible('#authDlg'), 'la fenêtre reste ouverte après un échec');
  await capture(A, '2-mauvais-mot-de-passe');

  // 3. Bonne connexion, avec l'identifiant court (sans « @ ») et des majuscules
  await connecter(A, 'Francois', MDP_F);
  await partage(A);
  verifie(!(await A.isVisible('#authDlg')), 'connexion réussie : la fenêtre se ferme');
  verifie((await statut(A)) === 'Partagé', 'la pastille passe à « Partagé »');
  const garde = await A.evaluate(() => localStorage.getItem('recolte.compte'));
  verifie(!garde.includes(MDP_F) && garde.includes('"jeton"') && garde.includes(uidF), 'le téléphone garde le compte et son jeton, jamais le mot de passe');
  verifie(base.journal.length > 0 && base.journal.every((j) => j.auth === 'ok'), 'chaque appel à la base porte un jeton valable (' + base.journal.length + ' appels)');

  // 4. Deux téléphones connectés partagent les coches
  const { p: B, ctx: ctxB } = await telephone('Aurore');
  await connecter(B, 'aurore', MDP_A);
  await partage(B);
  await A.click('li[data-id="mesclun"] .box');
  await B.waitForTimeout(600);
  verifie((await coches(B)) === 'mesclun', 'la coche de François arrive chez Aurore, base fermée');
  verifie((base.lire('listes/2026-11-04/done/mesclun') || {}).by === 'François', 'la coche est bien dans la base');

  // 5. Rechargement : pas de nouvelle connexion
  await A.reload(); await A.waitForSelector('li.item');
  await partage(A);
  verifie(!(await A.isVisible('#authDlg')), 'page rechargée : le téléphone reste connecté, sans redemander le mot de passe');
  verifie((await coches(A)) === 'mesclun', 'après rechargement, la coche est lue dans la base');

  // 5 bis. Téléphone resté éteint plus d'une heure : jeton périmé à l'ouverture, renouvelé d'abord
  await A.evaluate(() => { const c = JSON.parse(localStorage.getItem('recolte.compte')); c.fin = Date.now() - 1000; localStorage.setItem('recolte.compte', JSON.stringify(c)); });
  const r0 = base.renouvellements, n0 = base.journal.length;
  await A.reload(); await A.waitForSelector('li.item');
  await partage(A);
  verifie(base.renouvellements > r0 && base.journal.slice(n0).every((j) => j.auth === 'ok'), 'ouverture avec un jeton périmé : il est renouvelé avant d\'appeler la base (' + (base.renouvellements - r0) + ' renouvellement)');

  // 6. Les autres flux (Semaine, débouchés) passent aussi avec le jeton ; écriture d'une semaine
  await A.click('[data-view="semaine"]');
  await A.waitForTimeout(400);
  await A.click('[data-a="ajouter"]');
  await A.fill('#addQ', 'Bette');
  await A.click('#addList [data-nom="Bette"]');
  await A.click('#addClose');
  await A.waitForTimeout(600);
  const semaines = base.lire('listes/semaines') || {};
  const sem = Object.keys(semaines)[0];
  verifie(sem && semaines[sem].produits && semaines[sem].produits.bette, 'onglet Semaine : le produit ajouté est écrit dans la base (semaine ' + sem + ')');
  verifie(base.journal.some((j) => j.p.startsWith('listes/semaines/')) && base.journal.some((j) => j.p === 'listes/reglages/debouches'), 'les flux de la semaine et des débouchés sont ouverts');
  verifie(base.journal.every((j) => j.auth === 'ok'), 'toujours aucun appel sans jeton valable');
  await A.click('[data-view="recolte"]');

  // 7. Le jeton expire (au bout d'une heure en vrai) : la base ferme les flux, le téléphone en prend un neuf
  const avant = base.renouvellements;
  base.expirerJetons();
  await A.waitForTimeout(1500);
  verifie(base.renouvellements > avant, 'jeton expiré : le téléphone en demande un neuf tout seul (' + (base.renouvellements - avant) + ' renouvellements)');
  await partage(A); await partage(B);
  await B.click('li[data-id="bette"] .box');
  await A.waitForTimeout(800);
  verifie((await coches(A)) === 'bette,mesclun', 'après le renouvellement, la coche d\'Aurore arrive chez François');

  // 8. Hors ligne, jeton expiré pendant la coupure : la coche attend, puis part au retour du réseau
  await ctxA.setOffline(true); base.couperFlux();
  await A.waitForTimeout(300);
  await A.click('li[data-id="radis"] .box');
  verifie((await statut(A)) === 'Hors ligne · 1 coche en attente', 'sans réseau : « Hors ligne · 1 coche en attente » (obtenu « ' + (await statut(A)) + ' »)');
  base.expirerJetons();
  await ctxA.setOffline(false);
  await partage(A);
  verifie((base.lire('listes/2026-11-04/done/radis') || {}).by === 'François', 'au retour du réseau, la coche faite hors ligne part dans la base malgré le jeton expiré');
  // La coupure a aussi fermé le flux d'Aurore : il se rouvre avec un jeton neuf.
  await B.waitForTimeout(4000); await partage(B);
  verifie((await coches(B)).split(',').includes('radis'), 'au retour du réseau, la coche faite hors ligne arrive chez Aurore malgré le jeton expiré');

  // 9. Un compte sans profil « ferme » est refusé par la base ; il passe dès que le profil est donné
  const { p: C } = await telephone('Essai');
  await connecter(C, 'essai', MDP_E);
  await C.waitForFunction(() => document.querySelector('#sync').textContent.includes('Compte sans accès'), null, { timeout: 15000 }).catch(() => {});
  verifie((await statut(C)) === 'Compte sans accès', 'compte sans profil : « Compte sans accès » (obtenu « ' + (await statut(C)) + ' »)');
  verifie((await coches(C)) === '', 'compte sans profil : il ne lit aucune coche de la base');
  await C.click('[data-view="reglages"]');
  await C.click('#regSub [data-reg="compte"]');
  const pageCompte = await C.textContent('#debView');
  verifie(pageCompte.includes('essai') && pageCompte.includes('pas encore accès') && pageCompte.includes('Numéro du compte'), 'Réglages, Compte : l\'identifiant, le refus et le numéro du compte à recopier');
  await capture(C, '3-compte-sans-acces');
  const uidE = await C.evaluate(() => JSON.parse(localStorage.getItem('recolte.compte')).uid);
  base.profil(uidE, 'ferme');
  await partage(C);
  verifie(!(await C.textContent('#debView')).includes('pas encore accès'), 'profil donné dans la base : le téléphone passe à « Partagé » sans rien refaire');

  // 10. Se déconnecter (Réglages, Compte)
  await capture(C, '4-compte');
  await C.click('[data-a="deconnecter"]');
  await C.waitForTimeout(300);
  verifie(await C.isVisible('#authDlg'), 'Se déconnecter : la fenêtre de connexion revient');
  verifie((await statut(C)) === 'Pas connecté' && (await C.evaluate(() => localStorage.getItem('recolte.compte'))) === 'null', 'le compte est oublié par le téléphone');

  // 11. Compte supprimé dans la console : le téléphone redemande la connexion, avec un message
  base.supprimerCompte('aurore@ferme.invalid');
  base.expirerJetons();
  await B.waitForSelector('#authDlg[open]', { timeout: 10000 }).catch(() => {});
  verifie(await B.isVisible('#authDlg'), 'compte supprimé : la fenêtre de connexion revient chez Aurore');
  verifie((await B.textContent('#authErr')).includes('Se connecter à nouveau'), 'avec une phrase qui dit pourquoi (obtenu « ' + (await B.textContent('#authErr')) + ' »)');

  // 12. Mauvaise clé web : message clair
  const { p: D } = await telephone('Essai');
  await D.route('**/v1/accounts:signInWithPassword*', (r) => r.continue({ url: r.request().url().replace(CLE, 'mauvaise') }));
  await connecter(D, 'francois', MDP_F);
  await D.waitForSelector('#authErr:not([hidden])');
  verifie((await D.textContent('#authErr')).includes('clé web'), 'clé web fausse : le message le dit (obtenu « ' + (await D.textContent('#authErr')) + ' »)');

  verifie(erreurs.length === 0, 'aucune erreur JavaScript' + (erreurs.length ? ' : ' + erreurs.join(' | ') : ''));
  await nav.close(); site.close(); base.close();
  console.log(echecs ? `\n${echecs} échec(s)` : '\nTout est bon.');
  process.exit(echecs ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
