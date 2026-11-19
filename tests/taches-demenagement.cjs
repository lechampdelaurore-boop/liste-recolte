// /taches depuis le 19/11/2026 : Aurore Task a son propre dépôt et sa propre adresse. La page « Aurore Task a déménagé »
// (taches.html) envoie d'abord à la base les modifications restées sur l'appareil sans réseau (taches.pending), puis
// ouvre la nouvelle adresse. Faux Firebase local ; la nouvelle adresse est interceptée (aucun accès au vrai site).
// Lancement depuis la racine du dépôt : node tests/taches-demenagement.cjs
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');
const fauxFirebase = require('./faux-firebase.cjs');

const RACINE = path.join(__dirname, '..');
const PORT_SITE = 8982, PORT_BASE = 8983;
const BASE = `http://localhost:${PORT_BASE}`, SITE = `http://localhost:${PORT_SITE}`, CLE = 'cle-de-test';
let echecs = 0;
function verifie(cond, msg) { console.log((cond ? 'OK    ' : 'ÉCHEC ') + msg); if (!cond) echecs++; }
const attendreQue = async (fn, ms = 8000) => { const fin = Date.now() + ms; while (Date.now() < fin) { try { if (await fn()) return true; } catch (e) { /* page en cours */ } await new Promise((x) => setTimeout(x, 120)); } return false; };

function serveurSite() {
  return new Promise((ok) => {
    const s = http.createServer((q, r) => {
      let f = decodeURIComponent(new URL(q.url, 'http://x').pathname);
      if (f === '/taches') f = '/taches.html';
      if (f === '/config.js') { r.writeHead(200, { 'Content-Type': 'text/javascript' }); return r.end(`window.RECOLTE_DB_URL='${BASE}';window.RECOLTE_AUTH_URL='${BASE}/v1';window.RECOLTE_JETON_URL='${BASE}/v1';`); }
      if (f === '/cle-web.js') { r.writeHead(200, { 'Content-Type': 'text/javascript' }); return r.end(`window.RECOLTE_CLE_WEB='${CLE}';`); }
      const chemin = path.join(RACINE, f);
      if (!chemin.startsWith(RACINE) || !fs.existsSync(chemin) || fs.statSync(chemin).isDirectory()) { r.writeHead(404); return r.end(); }
      r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); fs.createReadStream(chemin).pipe(r);
    });
    s.listen(PORT_SITE, () => ok(s));
  });
}

(async () => {
  const site = await serveurSite();
  const base = await fauxFirebase(PORT_BASE, { comptes: { cle: CLE } });
  const uid = base.creerCompte('francois@ferme.invalid', 'mdp-francois-1'); base.profil(uid, 'ferme');
  const html = fs.readFileSync(path.join(RACINE, 'taches.html'), 'utf8');
  const nouvelle = /var NOUVELLE = '([^']+)'/.exec(html)[1];
  verifie(/^https:\/\/[a-z0-9-]+\.pages\.dev\/$/.test(nouvelle) && !/liste-recolte/.test(nouvelle), 'la nouvelle adresse est un autre site que celui du Cumul (' + nouvelle + ')');
  verifie(!fs.existsSync(path.join(RACINE, 'taches.webmanifest')) && !/rel="manifest"/.test(html), 'plus de manifeste « Aurore Task » ici : rien ne s\'installe à /taches');
  const man = JSON.parse(fs.readFileSync(path.join(RACINE, 'manifest.webmanifest'), 'utf8'));
  verifie(man.start_url === './' && man.scope === './', 'le Cumul garde son adresse et sa portée d\'origine');

  const nav = await chromium.launch();
  const ctx = await nav.newContext({ ...devices['Pixel 7'] });
  let arrivee = null;
  await ctx.route(nouvelle + '**', (route) => { arrivee = route.request().url(); route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Nouvelle adresse</title>' }); });
  // Sans modification en attente : départ tout de suite.
  const p = await ctx.newPage();
  await p.goto(SITE + '/taches');
  verifie(await attendreQue(() => arrivee === nouvelle), 'sans modification en attente : ouverture directe de la nouvelle adresse');

  // Avec deux modifications restées sur l'appareil (connecté au Cumul) : envoyées dans l'ordre, puis départ.
  arrivee = null;
  const jeton = await (await fetch(`${BASE}/v1/accounts:signInWithPassword?key=${CLE}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'francois@ferme.invalid', password: 'mdp-francois-1', returnSecureToken: true }) })).json();
  const q = await ctx.newPage();
  await q.goto(SITE + '/index.html').catch(() => {});
  await q.evaluate(([j, u]) => {
    localStorage.setItem('recolte.compte', JSON.stringify({ id: 'francois', uid: u, jeton: j.idToken, renouv: j.refreshToken, fin: Date.now() + 3600e3 }));
    localStorage.setItem('taches.pending', JSON.stringify([{ c: { 't/x1': { liste: 'jeudi', texte: 'Faite hors ligne' } }, at: 1 }, { c: { 't/x1/texte': 'Corrigée hors ligne' }, at: 2 }]));
  }, [jeton, uid]);
  await q.goto(SITE + '/taches');
  verifie(await attendreQue(() => arrivee === nouvelle), 'avec des modifications en attente : la nouvelle adresse s\'ouvre après l\'envoi');
  const t = base.lire('taches/t/x1');
  verifie(t && t.texte === 'Corrigée hors ligne' && t.liste === 'jeudi', 'les deux modifications sont dans la base, dans l\'ordre (« Corrigée hors ligne »)');
  const q2 = await ctx.newPage(); await q2.goto(SITE + '/index.html').catch(() => {});
  verifie(await q2.evaluate(() => JSON.parse(localStorage.getItem('taches.pending')).length === 0), 'plus rien en attente sur l\'appareil');

  // Sans compte : rien n'est perdu, la page le dit et laisse le lien.
  arrivee = null;
  const ctx2 = await nav.newContext({ ...devices['Pixel 7'] });
  await ctx2.route(nouvelle + '**', (route) => { arrivee = route.request().url(); route.fulfill({ status: 200, body: 'x' }); });
  const r = await ctx2.newPage();
  await r.goto(SITE + '/index.html').catch(() => {});
  await r.evaluate(() => localStorage.setItem('taches.pending', JSON.stringify([{ c: { 't/x2': { texte: 'perdue ?' } }, at: 1 }])));
  await r.goto(SITE + '/taches');
  await r.waitForTimeout(1500);
  verifie(arrivee === null && /pas encore parties/.test(await r.textContent('#msg')) && await r.getAttribute('#lien', 'href') === nouvelle, 'sans compte sur l\'appareil : la page garde les modifications, l\'explique, et propose le lien');
  verifie(JSON.parse(await r.evaluate(() => localStorage.getItem('taches.pending'))).length === 1, 'les modifications restent sur l\'appareil');

  await nav.close(); site.close(); base.close();
  console.log(echecs ? `\n${echecs} échec(s)` : '\nTout est bon');
  process.exit(echecs ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
