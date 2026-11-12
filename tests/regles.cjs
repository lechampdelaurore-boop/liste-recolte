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
  r = await appel('listes/reglages/ordre', f.idToken, { method: 'PUT', body: '{"ids":["carotte","poireau"],"by":"Aurore","at":4}' });
  verifie(r.s === 200, 'compte de la ferme : ordre de récolte habituel enregistré (PUT, 9/11), sans changer les règles');
  r = await appel('profils/' + e.localId, f.idToken, { method: 'PUT', body: '"ferme"' });
  verifie(r.s === 401, 'compte de la ferme : ne peut pas donner de profil (seule la console le peut)');
  r = await appel('magasin', f.idToken);
  verifie(r.s === 401, 'rien d\'autre que « listes », « profils » et « magasins » n\'est ouvert, même à la ferme');

  // Étape 13C : le compte du magasin (profil « magasin:ta »)
  const m = await compte('tresallier@ferme.invalid', 'essai-magasin');
  await fetch(`${DB}/profils/${m.localId}.json?ns=${NS}`, { method: 'PUT', headers: admin, body: '"magasin:ta"' });
  const W = '2026-11-09', ecrit = (chemin, corps, jeton = m.idToken, methode = 'PATCH') => appel(chemin, jeton, { method: methode, body: JSON.stringify(corps) });
  r = await appel('profils/' + m.localId, m.idToken);
  verifie(r.s === 200 && r.j === 'magasin:ta', 'magasin : il lit son propre profil (« magasin:ta »)');
  r = await appel('profils/' + f.localId, m.idToken);
  verifie(r.s === 401, 'magasin : il ne lit pas le profil d\'un autre compte');
  r = await appel('listes', m.idToken); const r2 = await appel('listes/semaines/2026-11-02', m.idToken); const r3 = await appel('listes/reglages/debouches', m.idToken);
  verifie(r.s === 401 && r2.s === 401 && r3.s === 401, 'magasin : listes, semaines et débouchés refusés');
  const ro1 = await appel('listes/reglages/ordre', m.idToken), ro2 = await ecrit('listes/reglages/ordre', { ids: ['x'], by: 'Igor', at: 9 }, m.idToken, 'PUT');
  verifie(ro1.s === 401 && ro2.s === 401, 'magasin : l\'ordre de récolte habituel lui est fermé (lecture et écriture)');
  r = await ecrit('listes/2026-11-04', { 'done/radis': { by: 'Igor', at: 5 } });
  verifie(r.s === 401, 'magasin : écriture dans les listes refusée');
  r = await ecrit('magasins/ta', { ['semaines/' + W + '/carotte-lavee']: { n: 12, u: 'kg', by: 'Igor', at: 10 }, ['journal/' + W + '/10-abcde']: { pid: 'carotte-lavee', n: 12, u: 'kg', by: 'Igor', at: 10 } });
  verifie(r.s === 200, 'magasin : une saisie et sa ligne du journal, d\'un seul envoi (PATCH), comme la page du magasin (' + r.s + ')');
  r = await ecrit('magasins/ta', { ['semaines/' + W + '/carotte-lavee']: { n: 13, u: 'kg', by: 'Igor', at: 11 }, ['journal/' + W + '/11-fghij']: { pid: 'carotte-lavee', n: 13, u: 'kg', an: 12, au: 'kg', by: 'Igor', at: 11 } });
  verifie(r.s === 200, 'magasin : il corrige sa saisie (13 kg, journal avec la valeur d\'avant)');
  r = await appel('magasins/ta/semaines/' + W, m.idToken);
  verifie(r.s === 200 && r.j['carotte-lavee'].n === 13, 'magasin : il relit le stock de sa semaine');
  const refuses = [
    ['nombre négatif', { n: -1, u: 'kg', by: 'Igor', at: 12 }],
    ['unité inconnue', { n: 1, u: 'tonne', by: 'Igor', at: 12 }],
    ['prénom vide', { n: 1, u: 'kg', by: '', at: 12 }],
    ['prénom de plus de 40 lettres', { n: 1, u: 'kg', by: 'x'.repeat(41), at: 12 }],
    ['champ en plus', { n: 1, u: 'kg', by: 'Igor', at: 12, prix: 3 }],
    ['heure manquante', { n: 1, u: 'kg', by: 'Igor' }],
  ];
  for (const [nom, v] of refuses) { r = await ecrit('magasins/ta/semaines/' + W + '/ail-sec', v, m.idToken, 'PUT'); verifie(r.s !== 200, 'magasin : saisie refusée, ' + nom + ' (' + r.s + ')'); }
  r = await ecrit('magasins/ta/semaines/pas-une-date/ail-sec', { n: 1, u: 'kg', by: 'Igor', at: 12 }, m.idToken, 'PUT');
  verifie(r.s !== 200, 'magasin : une semaine qui n\'est pas une date est refusée');
  r = await ecrit('magasins/ta/semaines/' + W, { 'ail-sec': { n: 1, u: 'kg', by: 'Igor', at: 12 }, 'poireau': { n: 2, u: 'kg', by: 'Igor', at: 12 } }, m.idToken, 'PUT');
  verifie(r.s !== 200, 'magasin : il ne peut pas réécrire toute la semaine d\'un coup (seulement produit par produit)');
  r = await ecrit('magasins/ta/journal/' + W + '/10-abcde', { pid: 'x', by: 'Igor', at: 1 }, m.idToken, 'PUT');
  verifie(r.s === 401, 'magasin : une ligne du journal ne peut pas être réécrite');
  r = await appel('magasins/ta/journal/' + W + '/10-abcde', m.idToken, { method: 'DELETE' });
  verifie(r.s === 401, 'magasin : une ligne du journal ne peut pas être effacée');
  r = await appel('magasins/ta/journal/' + W, m.idToken);
  verifie(r.s === 401, 'magasin : il ne lit pas le journal');
  r = await ecrit('magasins/ta/journal/' + W + '/12-x', { pid: 'ail-sec', by: 'Igor', at: 12, commentaire: 'x' }, m.idToken, 'PUT');
  verifie(r.s !== 200, 'magasin : une ligne du journal avec un champ en plus est refusée');
  r = await ecrit('magasins/ta/personnes/igor', { nom: 'Igor', at: 10 }, m.idToken, 'PUT');
  verifie(r.s === 200, 'magasin : il ajoute un prénom à la liste des prénoms');
  r = await appel('magasins/ta/personnes', m.idToken);
  verifie(r.s === 200 && r.j.igor.nom === 'Igor', 'magasin : il relit les prénoms');
  r = await appel('magasins/ta/personnes/igor', m.idToken, { method: 'DELETE' });
  verifie(r.s === 401, 'magasin : il ne peut pas effacer un prénom');
  r = await appel('magasins/lv/semaines/' + W, m.idToken); const r4 = await ecrit('magasins/lv/semaines/' + W + '/ail-sec', { n: 1, u: 'kg', by: 'Igor', at: 12 }, m.idToken, 'PUT');
  verifie(r.s === 401 && r4.s === 401, 'magasin : il ne lit ni n\'écrit le stock d\'un autre magasin');
  r = await appel('magasins/ta/semaines/' + W + '/carotte-lavee', m.idToken, { method: 'DELETE' });
  verifie(r.s === 200, 'magasin : il peut vider une case de son stock (le journal en garde la trace)');
  r = await appel('profils/' + m.localId, m.idToken, { method: 'PUT', body: '"ferme"' });
  verifie(r.s === 401, 'magasin : il ne peut pas se donner le profil de la ferme');
  r = await appel('magasins/ta', f.idToken);
  verifie(r.s === 200 && r.j.journal[W]['11-fghij'].an === 12, 'ferme : elle lit le stock, le journal et les prénoms du magasin');
  r = await ecrit('magasins/ta/semaines/' + W + '/ail-sec', { n: 1, u: 'kg', by: 'François', at: 12 }, f.idToken, 'PUT');
  verifie(r.s === 401, 'ferme : elle ne peut pas écrire à la place du magasin (elle écrit dans sa propre semaine)');
  r = await appel('magasins/ta', null); const r5 = await appel('magasins/ta/semaines/' + W, e.idToken);
  verifie(r.s === 401 && r5.s === 401, 'sans compte ou sans profil : le stock du magasin est refusé');
  // Étape 25 : notifications (notifs/ferme, notifs/magasin/<débouché>) et état de la semaine du magasin (suivi)
  const nf = (o) => Object.assign({ type: 'stock-fini', did: 'ta', w: W, by: 'Igor', n: 3, at: 100 }, o);
  r = await ecrit('notifs/ferme/100-abcde', nf(), m.idToken, 'PUT');
  verifie(r.s === 200, 'notifications : le magasin prévient la ferme (« Envoyer une notification ») (' + r.s + ')');
  r = await ecrit('notifs/ferme/100-abcde', nf({ n: 9, at: 101 }), m.idToken, 'PUT');
  const rmeme = await ecrit('notifs/ferme/100-abcde', nf(), m.idToken, 'PUT');
  verifie(r.s === 401 && rmeme.s === 200, 'notifications : une notification ne se réécrit pas avec une autre heure (renvoi identique accepté, pour un envoi dont la réponse s\'est perdue)');
  r = await appel('notifs/ferme/100-abcde', m.idToken, { method: 'DELETE' });
  verifie(r.s === 401, 'notifications : une notification ne s\'efface pas');
  r = await ecrit('notifs/ferme/101-x', nf({ did: 'lv', at: 101 }), m.idToken, 'PUT');
  verifie(r.s === 401, 'notifications : le magasin ne peut pas écrire au nom d\'un autre magasin');
  r = await appel('notifs/ferme', m.idToken);
  verifie(r.s === 401, 'notifications : le magasin ne lit pas les notifications de la ferme');
  const nfAuto = nf({ auto: true, at: 102, manque: ['Céleri-rave', 'Radis long rose'] });
  r = await ecrit('notifs/ferme/102-auto-ta-' + W, nfAuto, m.idToken, 'PUT');
  const rAutoF = await ecrit('notifs/ferme/102-auto-ta-' + W, nfAuto, f.idToken, 'PUT');
  verifie(r.s === 200 && rAutoF.s === 200, 'notifications : l\'envoi automatique, avec la liste des produits sans quantité, par le magasin puis par la ferme (même identifiant, même heure : une seule notification)');
  r = await ecrit('notifs/ferme/103-x', nf({ at: 103 }), f.idToken, 'PUT');
  verifie(r.s === 401, 'notifications : la ferme n\'écrit dans son propre fil que l\'envoi automatique');
  for (const [nom, v] of [['champ en plus', nf({ at: 104, prix: 1 })], ['autre type', nf({ at: 104, type: 'x' })], ['semaine qui n\'est pas une date', nf({ at: 104, w: 'demain' })], ['prénom vide', nf({ at: 104, by: '' })], ['nombre négatif', nf({ at: 104, n: -1 })]]) {
    r = await ecrit('notifs/ferme/104-x', v, m.idToken, 'PUT'); verifie(r.s !== 200, 'notifications : refusée, ' + nom + ' (' + r.s + ')');
  }
  r = await appel('notifs/ferme', f.idToken);
  const rq = await fetch(url('notifs/ferme', f.idToken, 'orderBy=' + encodeURIComponent('"$key"') + '&limitToLast=1'));
  const jq = await rq.json();
  verifie(r.s === 200 && Object.keys(r.j).length === 2 && rq.status === 200 && Object.keys(jq).join() === '102-auto-ta-' + W, 'notifications : la ferme lit son fil, aussi par la requête de la cloche (« orderBy $key, limitToLast »)');
  const nm = { type: 'liste-misealajour', w: W, by: 'François', n: 14, at: 200 };
  r = await ecrit('notifs/magasin/ta/200-abcde', nm, f.idToken, 'PUT');
  verifie(r.s === 200, 'notifications : la ferme prévient le magasin (« Prévenir le magasin »)');
  r = await ecrit('notifs/magasin/ta/201-x', Object.assign({}, nm, { at: 201 }), m.idToken, 'PUT');
  verifie(r.s === 401, 'notifications : le magasin ne peut pas écrire dans son propre fil');
  r = await ecrit('notifs/magasin/ta/202-x', Object.assign({}, nm, { at: 202, liste: ['carotte'] }), f.idToken, 'PUT');
  verifie(r.s !== 200, 'notifications : rien d\'autre que la semaine et le nombre de produits ne part au magasin (champ en plus refusé)');
  r = await appel('notifs/magasin/ta', m.idToken); const rlv = await appel('notifs/magasin/lv', m.idToken);
  verifie(r.s === 200 && r.j['200-abcde'].n === 14 && rlv.s === 401, 'notifications : le magasin lit son fil, pas celui d\'un autre magasin');
  r = await appel('notifs/ferme', null); const rmn = await appel('notifs/magasin/ta', e.idToken);
  verifie(r.s === 401 && rmn.s === 401, 'notifications : sans compte ou sans profil, rien n\'est lisible');
  const su = { w: W, at: 300, by: 'Igor', n: 2, manque: ['Poireau'] };
  r = await ecrit('magasins/ta/suivi', su, m.idToken, 'PUT');
  const rsuF = await ecrit('magasins/ta/suivi', su, f.idToken, 'PUT'), rsuLv = await ecrit('magasins/lv/suivi', su, m.idToken, 'PUT'), rsuX = await ecrit('magasins/ta/suivi', Object.assign({ prix: 1 }, su), m.idToken, 'PUT');
  verifie(r.s === 200 && rsuF.s === 401 && rsuLv.s === 401 && rsuX.s !== 200, 'état de la semaine du magasin (suivi) : écrit par le magasin seul, pour lui seul, sans champ en plus');
  r = await appel('magasins/ta/suivi', f.idToken);
  verifie(r.s === 200 && r.j.manque[0] === 'Poireau', 'état de la semaine du magasin : lu par la ferme');
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
      await p.goto(`http://localhost:${PORT_SITE}/?liste=2026-11-04`); await p.waitForSelector('li.item');
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
    const ctxM = await nav.newContext({ viewport: { width: 412, height: 900 }, serviceWorkers: 'block' });
    const M = await ctxM.newPage(); M.on('pageerror', (x) => erreurs.push(x.message));
    await M.goto(`http://localhost:${PORT_SITE}/magasin.html`);
    await M.fill('#authId', 'tresallier'); await M.fill('#authMdp', 'essai-magasin'); await M.click('#authOk');
    await M.waitForSelector('#quiDlg[open]');
    await M.fill('#quiAutre', 'Igor'); await M.click('#quiForm button[type="submit"]');
    await M.waitForSelector('#actions:not([hidden])');
    await M.click('#ajouter'); await M.fill('#addQ', 'poireau'); await M.click('#addList button[data-pid="poireau"]');
    await M.waitForSelector('#liste .p[data-pid="poireau"]');
    await M.fill('#liste .p[data-pid="poireau"] input', '7'); await M.press('#liste .p[data-pid="poireau"] input', 'Enter');
    await M.waitForFunction(() => document.querySelector('#sync').textContent.includes('Enregistré'), null, { timeout: 15000 }).catch(() => {});
    const lundiCourant = (() => { const d = new Date(); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })();
    r = await appel('magasins/ta', f.idToken);
    const jl = Object.values((r.j && r.j.journal && r.j.journal[lundiCourant]) || {});
    M.on('dialog', (d) => d.accept());
    verifie(r.j && r.j.semaines[lundiCourant].poireau.n === 7 && r.j.semaines[lundiCourant].poireau.by === 'Igor' && jl.some((x) => x.pid === 'poireau' && x.n === 7) && r.j.personnes.igor.nom === 'Igor',
      'appli + émulateurs : la page du magasin écrit sa saisie, sa ligne de journal et le prénom, acceptés par les vraies règles');
    // Étape 25 : « Envoyer une notification », la cloche de la ferme (requête des 30 dernières), « Prévenir le magasin »
    const debut = Date.now();
    await M.click('#envoyer');
    let n1 = null;
    for (let i = 0; i < 40 && !n1; i++) { await M.waitForTimeout(250); const x = await appel('notifs/ferme', f.idToken); n1 = Object.values(x.j || {}).find((v) => v.at >= debut && !v.auto); }
    const su2 = await appel('magasins/ta/suivi', f.idToken);
    verifie(n1 && n1.by === 'Igor' && n1.n === 1 && su2.j && su2.j.w === lundiCourant && su2.j.n === 1, 'appli + émulateurs : « Envoyer une notification » et l\'état de la semaine sont acceptés par les vraies règles');
    await A.waitForFunction(() => !document.querySelector('#clocheN').hidden, null, { timeout: 25000 }).catch(() => {});
    await A.click('#cloche');
    const txt = await A.$$eval('#notifListe .notif-t', (x) => x.map((i) => i.textContent));
    verifie(txt.length === 3 && txt[0].startsWith('Igor a fini le stock de'), 'appli + émulateurs : la cloche de la ferme reçoit la notification, la plus récente en haut (' + txt.length + ' dans la feuille : « ' + txt[0] + ' »)');
    await A.click('#notifFermer');
    // La ferme prévient le magasin (même écriture que « Prévenir le magasin ») : la cloche du magasin la reçoit.
    r = await ecrit('notifs/magasin/ta/' + Date.now() + '-essai', { type: 'liste-misealajour', w: lundiCourant, by: 'François', n: 3, at: Date.now() }, f.idToken, 'PUT');
    await M.waitForFunction(() => !document.querySelector('#clocheN').hidden, null, { timeout: 25000 }).catch(() => {});
    verifie(r.s === 200 && !(await M.$eval('#clocheN', (b) => b.hidden)), 'appli + émulateurs : une notification de la ferme arrive dans la cloche du magasin');
    verifie(erreurs.length === 0, 'appli + émulateurs : aucune erreur JavaScript' + (erreurs.length ? ' : ' + erreurs.join(' | ') : ''));
    await nav.close(); site.close();
  } else console.log('NON LANCÉ : partie appli (Playwright absent)');

  console.log(echecs ? `\n${echecs} échec(s)` : '\nTout est bon.');
  process.exit(echecs ? 1 : 0);
})().catch((x) => { console.error(x); process.exit(1); });
