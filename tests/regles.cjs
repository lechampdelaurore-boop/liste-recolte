// Essai des règles de la base (docs/regles-base/fermees.json) sur les émulateurs officiels de Firebase
// (Authentication et Realtime Database), puis l'appli elle-même branchée sur ces émulateurs.
// Ce test ne touche jamais la vraie base : tout se passe sur l'ordinateur, projet « demo-recolte ».
// Préparation (une fois, demande Java) : npm install --no-save firebase-tools playwright
// Lancement : npx firebase emulators:start --project demo-recolte --only auth,database   (dans un autre terminal,
// depuis un dossier avec un firebase.json qui ouvre auth sur 9099 et database sur 9000), puis node tests/regles.cjs
// Sans émulateur lancé, le test le dit et s'arrête (« non lancé »).
const http = require('http');
const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const NS = 'demo-recolte-default-rtdb';
const DB = 'http://127.0.0.1:9000', AUTH = 'http://127.0.0.1:9099';
const PORT_SITE = 8798;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

let echecs = 0;
function verifie(cond, msg) { console.log((cond ? 'OK    ' : 'ÉCHEC ') + msg); if (!cond) echecs++; }
const url = (chemin, jeton, q) => `${DB}/${chemin}.json?ns=${NS}` + (jeton ? '&auth=' + jeton : '') + (q ? '&' + q : '');
const admin = { Authorization: 'Bearer owner' };
const appel = async (chemin, jeton, opts = {}) => { const r = await fetch(url(chemin, jeton), opts); let j = null; try { j = await r.json(); } catch (e) { /* vide */ } return { s: r.status, j }; };
const compte = async (email, mdp) => {
  const r = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=cle-demo`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: mdp, returnSecureToken: true }) });
  return r.json();
};

(async () => {
  try { await fetch(`${DB}/.json?ns=${NS}&shallow=true`, { headers: admin }); await fetch(AUTH); }
  catch (e) { console.log('NON LANCÉ : les émulateurs Firebase ne répondent pas (voir l\'en-tête du fichier).'); process.exit(2); }

  // Base d'essai : on vide, on pose les règles fermées et des données comme celles de la ferme.
  await fetch(`${AUTH}/emulator/v1/projects/demo-recolte/accounts`, { method: 'DELETE' });
  const regles = fs.readFileSync(path.join(RACINE, 'docs/regles-base/fermees.json'), 'utf8');
  const pose = await fetch(`${DB}/.settings/rules.json?ns=${NS}`, { method: 'PUT', headers: admin, body: regles });
  verifie(pose.ok, 'les règles fermées sont acceptées par Firebase (syntaxe bonne)');
  await fetch(`${DB}/.json?ns=${NS}`, { method: 'PUT', headers: admin, body: JSON.stringify({
    listes: { '2026-11-04': { done: { mesclun: { by: 'Aurore', at: 1 } } }, semaines: { '2026-11-02': { dispo: { bette: { n: 3, u: 'colis' } } } }, reglages: { debouches: { at: 1 } } },
  }) });

  const f = await compte('francois@ferme.invalid', 'essai-francois');
  verifie(!!f.localId, 'un identifiant en « @ferme.invalid » est accepté comme compte (émulateur)');
  const e = await compte('inconnu@ferme.invalid', 'essai-inconnu');
  await fetch(`${DB}/profils/${f.localId}.json?ns=${NS}`, { method: 'PUT', headers: admin, body: '"ferme"' });

  // Sans compte
  let r = await appel('listes/2026-11-04', null);
  verifie(r.s === 401 && r.j && r.j.error === 'Permission denied', 'sans compte : lecture d\'une liste refusée (' + r.s + ' ' + JSON.stringify(r.j) + ')');
  r = await appel('listes/2026-11-04/done/radis', null, { method: 'PUT', body: '{"by":"x","at":1}' });
  verifie(r.s === 401, 'sans compte : écriture refusée');
  r = await appel('listes/semaines', null);
  verifie(r.s === 401, 'sans compte : semaines refusées');
  r = await appel('', null);
  verifie(r.s === 401, 'sans compte : racine de la base refusée');

  // Compte créé par n'importe qui (avec la clé web publique) mais sans profil : refusé
  r = await appel('listes/2026-11-04', e.idToken);
  verifie(r.s === 401, 'compte sans profil « ferme » : lecture refusée');
  r = await appel('listes/2026-11-04', e.idToken, { method: 'PATCH', body: '{"done/radis":null}' });
  verifie(r.s === 401, 'compte sans profil : écriture refusée');
  r = await appel('profils/' + e.localId, e.idToken, { method: 'PUT', body: '"ferme"' });
  verifie(r.s === 401, 'compte sans profil : il ne peut pas se donner le profil lui-même');

  // Compte de la ferme
  r = await appel('listes/2026-11-04', f.idToken);
  verifie(r.s === 200 && r.j.done.mesclun.by === 'Aurore', 'compte de la ferme : lecture de la liste');
  r = await appel('listes/2026-11-04', f.idToken, { method: 'PATCH', body: '{"done/radis":{"by":"François","at":2},"maj/done/radis":2}' });
  verifie(r.s === 200, 'compte de la ferme : écriture de plusieurs chemins d\'un coup (PATCH)');
  r = await appel('listes/semaines/2026-11-02', f.idToken);
  verifie(r.s === 200 && r.j.dispo.bette.n === 3, 'compte de la ferme : lecture d\'une semaine');
  r = await appel('listes/reglages/debouches', f.idToken, { method: 'PUT', body: '{"at":3}' });
  verifie(r.s === 200, 'compte de la ferme : réglages des débouchés réécrits (PUT)');
  r = await appel('profils/' + e.localId, f.idToken, { method: 'PUT', body: '"ferme"' });
  verifie(r.s === 401, 'compte de la ferme : ne peut pas donner de profil (seule la console le peut)');
  r = await appel('magasin', f.idToken);
  verifie(r.s === 401, 'rien d\'autre que « listes » n\'est ouvert, même à la ferme');
  r = await appel('listes/2026-11-04', 'jeton-abime');
  // L'émulateur traite un jeton abîmé comme une absence de compte ; la vraie base dit « Could not parse auth token ».
  verifie(r.s === 401, 'jeton abîmé : refusé (message de l\'émulateur : « ' + r.j.error + ' »)');

  // Renouvellement du jeton (même appel que l'appli)
  const t = await fetch(`${AUTH}/securetoken.googleapis.com/v1/token?key=cle-demo`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(f.refreshToken) }).then((x) => x.json());
  r = await appel('listes/2026-11-04', t.id_token);
  verifie(!!t.id_token && t.expires_in && r.s === 200, 'jeton renouvelé : la lecture marche avec le nouveau (valable ' + t.expires_in + ' s)');

  // Flux temps réel : refusé sans compte, ouvert avec le compte de la ferme
  const flux = (jeton) => new Promise((ok) => {
    const q = http.get(url('listes/2026-11-04', jeton), { headers: { Accept: 'text/event-stream' } }, (rep) => {
      let d = ''; rep.on('data', (x) => { d += x; if (d.includes('\n\n')) { q.destroy(); ok({ s: rep.statusCode, d }); } });
      rep.on('end', () => ok({ s: rep.statusCode, d }));
    });
  });
  let fl = await flux(null);
  verifie(fl.s === 401, 'flux temps réel sans compte : refusé d\'emblée (code ' + fl.s + ')');
  fl = await flux(f.idToken);
  verifie(fl.s === 200 && fl.d.startsWith('event: put'), 'flux temps réel du compte de la ferme : ouvert (« ' + fl.d.split('\n')[0] + ' »)');

  // L'appli elle-même, branchée sur les émulateurs
  let chromium;
  try { ({ chromium } = require('playwright')); } catch (x) { chromium = null; }
  if (chromium) {
    const site = await new Promise((ok) => {
      const s = http.createServer((q, rep) => {
        let fi = decodeURIComponent(new URL(q.url, 'http://x').pathname);
        if (fi.endsWith('/')) fi += 'index.html';
        if (fi === '/config.js') { rep.writeHead(200, { 'Content-Type': 'text/javascript' }); return rep.end(`window.RECOLTE_DB_URL='http://${NS}.localhost:9000';window.RECOLTE_AUTH_URL='${AUTH}/identitytoolkit.googleapis.com/v1';window.RECOLTE_JETON_URL='${AUTH}/securetoken.googleapis.com/v1';`); }
        if (fi === '/cle-web.js') { rep.writeHead(200, { 'Content-Type': 'text/javascript' }); return rep.end("window.RECOLTE_CLE_WEB='cle-demo';"); }
        const c = path.join(RACINE, fi);
        if (!c.startsWith(RACINE) || !fs.existsSync(c)) { rep.writeHead(404); return rep.end(); }
        rep.writeHead(200, { 'Content-Type': TYPES[path.extname(c)] || 'application/octet-stream' });
        fs.createReadStream(c).pipe(rep);
      });
      s.listen(PORT_SITE, () => ok(s));
    });
    const nav = await chromium.launch();
    const erreurs = [];
    const tel = async (nom) => {
      const ctx = await nav.newContext({ viewport: { width: 412, height: 900 }, serviceWorkers: 'block' });
      await ctx.addInitScript((n) => localStorage.setItem('recolte.qui', JSON.stringify(n)), nom);
      const p = await ctx.newPage(); p.on('pageerror', (x) => erreurs.push(x.message));
      await p.goto(`http://localhost:${PORT_SITE}/`); await p.waitForSelector('li.item');
      return p;
    };
    const partage = (p) => p.waitForFunction(() => document.querySelector('#sync').textContent.includes('Partagé'), null, { timeout: 20000 }).then(() => true, () => false);
    const A = await tel('François');
    await A.fill('#authId', 'francois'); await A.fill('#authMdp', 'essai-francois'); await A.click('#authOk');
    verifie(await partage(A), 'appli + émulateurs : connexion avec l\'identifiant court, pastille « Partagé »');
    verifie((await A.$$eval('#done li.item', (x) => x.map((i) => i.dataset.id).sort().join())) === 'mesclun,radis', 'appli + émulateurs : les coches de la base fermée s\'affichent');
    await A.click('li[data-id="bette"] .box');
    await A.waitForTimeout(800);
    r = await appel('listes/2026-11-04/done/bette', f.idToken);
    verifie(r.s === 200 && r.j && r.j.by === 'François', 'appli + émulateurs : une coche part dans la base fermée');
    const C = await tel('Essai');
    await C.fill('#authId', 'inconnu'); await C.fill('#authMdp', 'essai-inconnu'); await C.click('#authOk');
    await C.waitForFunction(() => document.querySelector('#sync').textContent.includes('Compte sans accès'), null, { timeout: 15000 }).catch(() => {});
    verifie((await C.textContent('#sync')).includes('Compte sans accès'), 'appli + émulateurs : compte sans profil, « Compte sans accès » (obtenu « ' + (await C.textContent('#sync')).trim() + ' »)');
    verifie(erreurs.length === 0, 'appli + émulateurs : aucune erreur JavaScript' + (erreurs.length ? ' : ' + erreurs.join(' | ') : ''));
    await nav.close(); site.close();
  } else console.log('NON LANCÉ : partie appli (Playwright absent)');

  console.log(echecs ? `\n${echecs} échec(s)` : '\nTout est bon.');
  process.exit(echecs ? 1 : 0);
})().catch((x) => { console.error(x); process.exit(1); });
