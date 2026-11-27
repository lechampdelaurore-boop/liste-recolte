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
  // Semaine en cours (lundi) : la boîte des commandes de l'appli ne montre que la semaine ouverte et les suivantes
  // (avant le 18/11/2026, une date fixe faisait échouer l'essai de l'appli dès la semaine suivante).
  const W = (() => { const d = new Date(); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })(), ecrit = (chemin, corps, jeton = m.idToken, methode = 'PATCH') => appel(chemin, jeton, { method: methode, body: JSON.stringify(corps) });
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
  // Étape 31 : commandes à valider. Le profil « agent » dépose des propositions sous agent/propositions, rien d'autre.
  const g = await compte('agent@ferme.invalid', 'essai-agent');
  await fetch(`${DB}/profils/${g.localId}.json?ns=${NS}`, { method: 'PUT', headers: admin, body: '"agent"' });
  const pr = (o) => Object.assign({ w: W, c: 'av03', cle: 'auvabio-allier-' + W, src: '[Commande] COMMANDE ALLIER', date: 1000, type: 'commande', by: 'Agent', at: 1001,
    l: [{ p: 'endive', nom: 'Endive', n: 9, u: 'colis' }, { p: 'poireau', n: 2.5, u: 'kg' }], refus: ['« blettes » : inconnu'], lien: 'https://mail.google.com/mail/u/0/#inbox/abc', verif: 'PDF et mail différents' }, o);
  r = await ecrit('agent/propositions/mail-1', pr(), g.idToken, 'PUT');
  verifie(r.s === 200, 'agent : il dépose une proposition complète (lignes, refus, lien, à vérifier) (' + r.s + ')');
  r = await ecrit('agent/propositions/mail-annule', pr({ type: 'annulation', l: null, refus: null, lien: null, verif: null, date: 2000 }), g.idToken, 'PUT');
  verifie(r.s === 200, 'agent : une annulation, sans lignes, est acceptée');
  r = await ecrit('agent/propositions/mail-1', pr({ at: 1002 }), g.idToken, 'PUT');
  const rmeme1 = await ecrit('agent/propositions/mail-1', pr(), g.idToken, 'PUT');
  verifie(r.s === 401 && rmeme1.s === 401, 'agent : une proposition ne se réécrit pas, même à l\'identique (le même mail revient : refusé)');
  r = await appel('agent/propositions/mail-1', g.idToken, { method: 'DELETE' });
  verifie(r.s === 401, 'agent : une proposition ne s\'efface pas');
  r = await ecrit('agent/propositions/mail-1/l/0/n', 99, g.idToken, 'PUT');
  verifie(r.s === 401, 'agent : une ligne d\'une proposition déposée ne se change pas');
  r = await appel('agent/propositions', g.idToken);
  verifie(r.s === 200 && r.j['mail-1'].l[0].n === 9, 'agent : il relit ses propositions (pour ne pas déposer deux fois le même mail)');
  // Étape 32 : la porte lit les débouchés de la ferme (pour reconnaître la livraison d'une commande), et rien d'autre de « listes ».
  r = await appel('listes/reglages/debouches', g.idToken);
  verifie(r.s === 200 && r.j && r.j.at === 3, 'agent : il lit les débouchés de la ferme (étape 32, la porte) (' + r.s + ')');
  r = await ecrit('listes/reglages/debouches', { at: 9 }, g.idToken, 'PUT');
  const rDebP = await ecrit('listes/reglages/debouches/at', 9, g.idToken, 'PUT');
  verifie(r.s === 401 && rDebP.s === 401, 'agent : il ne modifie pas les débouchés');
  const interdits = [['listes', 'GET'], ['listes/semaines/' + W, 'GET'], ['listes/reglages', 'GET'], ['listes/reglages/ordre', 'GET'], ['magasins', 'GET'], ['notifs/ferme', 'GET'], ['profils/' + f.localId, 'GET'], ['agent', 'GET']];
  const res = []; for (const [ch] of interdits) res.push((await appel(ch, g.idToken)).s);
  verifie(res.every((x) => x === 401), 'agent : il ne lit rien d\'autre (listes, semaines, autres réglages, magasins, notifications, profil d\'un autre, racine de « agent ») (' + res.join(',') + ')');
  const rDebM = await appel('listes/reglages/debouches', m.idToken), rDebE = await appel('listes/reglages/debouches', e.idToken), rDebN = await appel('listes/reglages/debouches', null);
  verifie(rDebM.s === 401 && rDebE.s === 401 && rDebN.s === 401, 'magasin, compte sans profil, sans compte : toujours pas de lecture des débouchés');
  const ecr = [await ecrit('listes/semaines/' + W + '/q/endive/av03', { n: 9, u: 'colis', by: 'Agent', at: 1 }, g.idToken, 'PUT'), await ecrit('listes/2026-11-04', { 'done/radis': { by: 'Agent', at: 1 } }, g.idToken),
    await ecrit('magasins/ta/semaines/' + W + '/ail-sec', { n: 1, u: 'kg', by: 'Agent', at: 1 }, g.idToken, 'PUT'), await ecrit('notifs/ferme/1-x', nf({ at: 1 }), g.idToken, 'PUT'), await ecrit('profils/' + g.localId, '"ferme"', g.idToken, 'PUT'), await ecrit('agent/reglages', { x: 1 }, g.idToken, 'PUT')];
  verifie(ecr.every((x) => x.s === 401), 'agent : il n\'écrit nulle part ailleurs (semaine, liste, stock du magasin, notifications, son profil, autre chemin de « agent ») (' + ecr.map((x) => x.s).join(',') + ')');
  // Aurore Task (taches/, profils « ferme » et « equipe ») et rappel du matin (19/11, étape 45B du dépôt aurore-task) :
  // le profil « rappel » lit taches/, écrit seulement taches/lu et taches/abonnements, lit et écrit rappel/.
  const rp = await compte('rappel@ferme.invalid', 'essai-rappel'), eq = await compte('martin@ferme.invalid', 'essai-martin');
  await fetch(`${DB}/profils/${rp.localId}.json?ns=${NS}`, { method: 'PUT', headers: admin, body: '"rappel"' });
  await fetch(`${DB}/profils/${eq.localId}.json?ns=${NS}`, { method: 'PUT', headers: admin, body: '"equipe"' });
  r = await ecrit('taches/t/t1', { liste: 'jeudi', texte: 'Banque', at: 1 }, f.idToken, 'PUT');
  const rTEq = await ecrit('taches/rappels/martin', { actif: true, heure: '07:30' }, eq.idToken, 'PUT');
  verifie(r.s === 200 && rTEq.s === 200, 'tâches : la ferme et l\'équipe écrivent sous taches/ (tâche, réglage du rappel)');
  const rTr = await appel('taches', rp.idToken);
  verifie(rTr.s === 200 && rTr.j.t.t1.texte === 'Banque', 'rappel : il lit les tâches (pour la notification)');
  const rLu = await ecrit('taches/lu/francois/2026-11-19', { at: 1, par: 'notification' }, rp.idToken, 'PUT');
  const rAbo = await appel('taches/abonnements/francois/a1', rp.idToken, { method: 'DELETE' });
  const rRv = await ecrit('rappel/vapid', { publique: 'x', at: 1 }, rp.idToken, 'PUT'), rRe = await ecrit('rappel/envois/francois', { date: '2026-11-19', at: 1, n: 1 }, rp.idToken, 'PUT');
  verifie(rLu.s === 200 && rAbo.s === 200 && rRv.s === 200 && rRe.s === 200, 'rappel : il note « lu », retire un téléphone disparu, garde ses clés et ses envois sous rappel/');
  const rInt = [await ecrit('taches/t/t1', { texte: 'pirate' }, rp.idToken, 'PUT'), await ecrit('taches/rappels/francois', { actif: false }, rp.idToken, 'PUT'), await ecrit('taches/listes/x', { nom: 'x' }, rp.idToken, 'PUT'),
    await ecrit('listes/2026-11-04', { 'done/radis': { by: 'Rappel', at: 1 } }, rp.idToken), await ecrit('profils/' + rp.localId, '"ferme"', rp.idToken, 'PUT')];
  const rLec = [(await appel('listes', rp.idToken)).s, (await appel('magasins', rp.idToken)).s, (await appel('agent/propositions', rp.idToken)).s, (await appel('profils/' + f.localId, rp.idToken)).s];
  verifie(rInt.every((x) => x.s === 401) && rLec.every((x) => x === 401), 'rappel : il n\'écrit ni tâche, ni réglage, ni liste, ni son profil, et ne lit ni listes, ni magasins, ni commandes, ni profils (' + rInt.map((x) => x.s).concat(rLec).join(',') + ')');
  const rVf = await appel('rappel/vapid', f.idToken), rVe = await appel('rappel/vapid', eq.idToken), rVm = await appel('rappel', m.idToken), rVn = await appel('rappel', null);
  verifie([rVf.s, rVe.s, rVm.s, rVn.s].every((x) => x === 401), 'ferme, équipe, magasin, sans compte : personne d\'autre ne lit les clés d\'envoi (rappel/)');
  const rTm = await appel('taches', m.idToken), rTg = await appel('taches', g.idToken), rTe = await appel('taches', e.idToken);
  verifie([rTm.s, rTg.s, rTe.s].every((x) => x === 401), 'magasin, agent, compte sans profil : pas d\'accès aux tâches');
  // Historique des tâches réalisées de Farm tasks (27/11, étape 55 du dépôt aurore-task) : nœud à part, taches-historique/,
  // hors du flux en direct de taches/. La ferme et l'équipe y écrivent, dans la même écriture que la tâche cochée (mise à
  // jour à plusieurs chemins depuis la racine), et le lisent par période (requête sur la clé) ; la sauvegarde le lit.
  const ligneH = (by, fin) => ({ liste: 'jeudi', listeNom: 'Jeudi', tache: 't1', texte: 'Banque', by, fin, chrono: false, pause: 0 });
  r = await ecrit('', { 'taches/t/t5': null, 'taches/faites/f1': { at: 5, mot: 'Faite' }, 'taches-historique/00mhx7s00aaaaa': ligneH('francois', 5) }, f.idToken);
  const rHEq = await ecrit('', { 'taches/chrono/martin/t2': null, 'taches-historique/00mhx7s01bbbbb': ligneH('martin', 6) }, eq.idToken);
  const rHCorr = await ecrit('taches-historique/00mhx7s01bbbbb', { debut: 2, duree: 4, corr: { by: 'martin', at: 7 } }, eq.idToken);
  verifie(r.s === 200 && rHEq.s === 200 && rHCorr.s === 200, 'historique : la ferme et l\'équipe écrivent la ligne avec la tâche cochée, d\'un seul envoi depuis la racine, et la corrigent (' + [r.s, rHEq.s, rHCorr.s].join(',') + ')');
  const rqH = await fetch(url('taches-historique', eq.idToken, 'orderBy=' + encodeURIComponent('"$key"') + '&startAt=' + encodeURIComponent('"00mhx7s01"') + '&endAt=' + encodeURIComponent('"00mhx7s01~"')));
  const jqH = await rqH.json(), rHf = await appel('taches-historique', f.idToken);
  verifie(rqH.status === 200 && Object.keys(jqH).join() === '00mhx7s01bbbbb' && jqH['00mhx7s01bbbbb'].duree === 4 && rHf.s === 200 && Object.keys(rHf.j).length === 2, 'historique : lu par période (« orderBy $key », startAt, endAt), seulement les lignes demandées ; la ferme lit tout');
  const rHSup = await appel('taches-historique/00mhx7s00aaaaa', f.idToken, { method: 'DELETE' });
  await ecrit('taches-historique/00mhx7s00aaaaa', ligneH('francois', 5), f.idToken, 'PUT');
  verifie(rHSup.s === 200, 'historique : la ferme retire une ligne (« Remettre », ou « Supprimer la ligne » après confirmation)');
  const rHRef = [await appel('taches-historique', rp.idToken), await appel('taches-historique', m.idToken), await appel('taches-historique', g.idToken), await appel('taches-historique', e.idToken), await appel('taches-historique', null)].map((x) => x.s);
  const rHRefE = [await ecrit('taches-historique/zz', ligneH('x', 1), rp.idToken, 'PUT'), await ecrit('taches-historique/zz', ligneH('x', 1), m.idToken, 'PUT'), await ecrit('taches-historique/zz', ligneH('x', 1), g.idToken, 'PUT'),
    await ecrit('taches-historique/zz', ligneH('x', 1), e.idToken, 'PUT'), await ecrit('taches-historique/zz', ligneH('x', 1), null, 'PUT'), await ecrit('', { 'taches-historique/zz': ligneH('x', 1), 'taches/lu/francois/2026-11-27': { at: 1 } }, rp.idToken)].map((x) => x.s);
  verifie(rHRef.concat(rHRefE).every((x) => x === 401), 'historique : rappel, magasin, agent, compte sans profil, sans compte ne le lisent ni ne l\'écrivent (' + rHRef.concat(rHRefE).join(',') + ')');
  const formes = [
    ['champ en plus', pr({ prix: 3 })], ['type inconnu', pr({ type: 'suppression' })], ['semaine qui n\'est pas une date', pr({ w: 'demain' })],
    ['livraison vide', pr({ c: '' })], ['source de plus de 120 signes', pr({ src: 'x'.repeat(121) })], ['heure du mail manquante', pr({ date: null })],
    ['lien qui n\'est pas en https', pr({ lien: 'http://exemple.invalid' })], ['quantité négative', pr({ l: [{ p: 'endive', n: -1, u: 'colis' }] })],
    ['unité inconnue', pr({ l: [{ p: 'endive', n: 1, u: 'tonne' }] })], ['ligne avec un champ en plus', pr({ l: [{ p: 'endive', n: 1, u: 'colis', prix: 2 }] })],
    ['ligne sans produit', pr({ l: [{ n: 1, u: 'colis' }] })], ['plus de 200 lignes', pr({ l: Object.fromEntries([[200, { p: 'endive', n: 1, u: 'colis' }]]) })],
    ['prénom vide', pr({ by: '' })], ['identifiant avec un espace', pr(), 'mail 2'],
  ];
  const resF = [];
  for (const [nom, v, id] of formes) { const x = await ecrit('agent/propositions/' + encodeURIComponent(id || 'forme-' + resF.length), v, g.idToken, 'PUT'); resF.push(x.s); verifie(x.s !== 200, 'agent : proposition refusée, ' + nom + ' (' + x.s + ')'); }
  r = await ecrit('agent/propositions/mail-199', pr({ l: Object.fromEntries([[199, { p: 'endive', n: 1, u: 'colis' }]]) }), g.idToken, 'PUT');
  verifie(r.s === 200, 'agent : 200 lignes au plus (la ligne n° 199 passe)');
  r = await ecrit('agent/propositions/par-la-ferme', pr(), f.idToken, 'PUT');
  const rmP = await ecrit('agent/propositions/par-le-magasin', pr(), m.idToken, 'PUT'), rmL = await appel('agent/propositions', m.idToken), reL = await appel('agent/propositions', e.idToken), rnL = await appel('agent/propositions', null);
  verifie(r.s === 401 && rmP.s === 401 && rmL.s === 401 && reL.s === 401 && rnL.s === 401, 'ferme, magasin, compte sans profil, sans compte : aucun ne dépose de proposition ; seuls la ferme et l\'agent les lisent');
  const rq2 = await fetch(url('agent/propositions', f.idToken, 'orderBy=' + encodeURIComponent('"w"') + '&startAt=' + encodeURIComponent('"' + W + '"')));
  const jq2 = await rq2.json();
  const rq3 = await fetch(url('agent/propositions', f.idToken, 'orderBy=' + encodeURIComponent('"w"') + '&startAt=' + encodeURIComponent('"2099-01-05"')));
  const jq3 = await rq3.json();
  verifie(rq2.status === 200 && Object.keys(jq2).sort().join() === 'mail-1,mail-199,mail-annule' && rq3.status === 200 && Object.keys(jq3 || {}).length === 0, 'ferme : elle lit les propositions par la requête de l\'appli (« orderBy w, startAt » : index accepté), seulement à partir de la semaine demandée');
  r = await ecrit('listes/semaines/' + W, { 'commandes/mail-1': { e: 'valide', by: 'François', at: 3000, l: [{ p: 'endive', c: 'av03', n: 9, u: 'colis' }] }, 'q/endive/av03': { n: 9, u: 'colis', by: 'François', at: 3000 } }, f.idToken);
  verifie(r.s === 200, 'ferme : la validation (décision et quantités, dans la semaine) est acceptée par les règles d\'avant, sans rien changer à « listes »');
  // Sauvegarde de chaque nuit (21/11, programme dans le dépôt privé outils-de-la-ferme) : le profil « sauvegarde » lit
  // chaque nœud de la base, sauf rappel/ (clés d'envoi des notifications), et n'écrit nulle part.
  const sv = await compte('sauvegarde@ferme.invalid', 'essai-sauvegarde');
  await fetch(`${DB}/profils/${sv.localId}.json?ns=${NS}`, { method: 'PUT', headers: admin, body: '"sauvegarde"' });
  const NOEUDS_SAUVEGARDE = ['listes', 'taches', 'profils', 'magasins', 'notifs', 'agent', 'taches-historique'];
  const rSv = [];
  for (const n of NOEUDS_SAUVEGARDE) rSv.push(await appel(n, sv.idToken));
  verifie(rSv.every((x) => x.s === 200) && rSv[0].j.semaines && rSv[1].j.t && rSv[2].j[f.localId] === 'ferme' && rSv[2].j[sv.localId] === 'sauvegarde' && Object.keys(rSv[6].j).length === 2,
    'sauvegarde : elle lit chaque nœud d\'un coup (listes, tâches, profils de tous les comptes, magasins, notifications, agent, historique des tâches) (' + rSv.map((x) => x.s).join(',') + ')');
  const rSvR = await appel('rappel', sv.idToken), rSvV = await appel('rappel/vapid', sv.idToken), rSvT = await appel('', sv.idToken);
  verifie([rSvR.s, rSvV.s, rSvT.s].every((x) => x === 401), 'sauvegarde : ni rappel/ (clés d\'envoi des notifications), ni la racine (' + [rSvR.s, rSvV.s, rSvT.s].join(',') + ')');
  const rSvE = [await ecrit('listes/2026-11-04/done/radis', { by: 'x', at: 1 }, sv.idToken, 'PUT'), await ecrit('taches/t/t9', { texte: 'x' }, sv.idToken, 'PUT'),
    await ecrit('profils/' + sv.localId, 'ferme', sv.idToken, 'PUT'), await ecrit('magasins/ta/personnes/p9', { nom: 'x', at: 1 }, sv.idToken, 'PUT'),
    await ecrit('notifs/ferme/n9', { at: 1 }, sv.idToken, 'PUT'), await ecrit('agent/propositions/sv', pr(), sv.idToken, 'PUT'), await ecrit('taches-historique/sv', { fin: 1 }, sv.idToken, 'PUT'), await ecrit('rappel/vapid', { publique: 'x' }, sv.idToken, 'PUT'),
    await appel('listes/2026-11-04', sv.idToken, { method: 'DELETE' }), await ecrit('', { listes: null }, sv.idToken)];
  verifie(rSvE.every((x) => x.s === 401), 'sauvegarde : aucune écriture ni effacement, nulle part, pas même son propre profil (' + rSvE.map((x) => x.s).join(',') + ')');
  const premiers = Object.keys(JSON.parse(regles).rules).filter((k) => k !== 'rappel').sort().join();
  verifie(premiers === NOEUDS_SAUVEGARDE.slice().sort().join(), 'chaque nœud des règles, sauf rappel/, est dans la liste de la sauvegarde (nœud ajouté aux règles : l\'ajouter aussi à sauvegarde/reglages.json d\'outils-de-la-ferme)');
  const rSvF = await appel('profils', f.idToken), rSvA = await appel('notifs', f.idToken), rSvG = await appel('agent', g.idToken);
  verifie([rSvF.s, rSvA.s, rSvG.s].every((x) => x === 401), 'les autres profils ne gagnent rien : la ferme ne lit ni tous les profils ni tout notifs/, l\'agent ne lit pas tout agent/');
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
    // Étape 31 : l'appli de la ferme lit les propositions de l'agent avec les vraies règles et valide.
    // Les débouchés de départ (le test les avait remplacés par un essai d'écriture) : la livraison « ta-mar » existe.
    await fetch(`${DB}/listes/reglages/debouches.json?ns=${NS}`, { method: 'PUT', headers: admin, body: fs.readFileSync(path.join(RACINE, 'referentiel/debouches.json'), 'utf8') });
    r = await ecrit('agent/propositions/mail-appli', pr({ w: lundiCourant, c: 'ta-mar', cle: 'essai-appli', l: [{ p: 'poireau', n: 2, u: 'colis' }], refus: null, verif: null, date: Date.now(), at: Date.now() }), g.idToken, 'PUT');
    await A.click('#tabs [data-view="semaine"]');
    await A.waitForSelector('#semCmd article[data-cmd="mail-appli"]', { timeout: 25000 }).catch(() => {});
    verifie(r.s === 200 && (await A.$eval('#cmdN', (b) => (b.hidden ? '' : b.textContent))) === '2' && await A.isVisible('#semCmd article[data-cmd="mail-appli"]'), 'appli + émulateurs : la proposition de l\'agent arrive dans la boîte de l\'onglet Semaine ; chiffre 2 sur l\'onglet (elle et l\'annulation déposée plus haut, même semaine)');
    await A.click('#semCmd [data-a="cmd-valider"][data-id="mail-appli"]');
    let dv = null;
    for (let i = 0; i < 40 && !dv; i++) { await A.waitForTimeout(250); dv = (await appel('listes/semaines/' + lundiCourant + '/commandes/mail-appli', f.idToken)).j; }
    const qv = (await appel('listes/semaines/' + lundiCourant + '/q/poireau/ta-mar', f.idToken)).j;
    verifie(dv && dv.e === 'valide' && dv.by === 'François' && qv && qv.n === 2 && qv.by === 'François' && (await A.textContent('#sync')).includes('Partagé'), 'appli + émulateurs : « Valider » écrit la décision et la quantité dans la semaine, acceptées par les vraies règles');
    verifie(erreurs.length === 0, 'appli + émulateurs : aucune erreur JavaScript' + (erreurs.length ? ' : ' + erreurs.join(' | ') : ''));
    await nav.close(); site.close();
  } else console.log('NON LANCÉ : partie appli (Playwright absent)');

  console.log(echecs ? `\n${echecs} échec(s)` : '\nTout est bon.');
  process.exit(echecs ? 1 : 0);
})().catch((x) => { console.error(x); process.exit(1); });
