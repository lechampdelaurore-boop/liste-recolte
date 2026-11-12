// Essai de la porte de l'agent (étape 32, functions/agent/[[chemin]].js) sur les émulateurs officiels de Firebase,
// avec les vraies règles (docs/regles-base/fermees.json), puis l'appli de la ferme qui reçoit et valide la commande.
// Ce test ne touche jamais la vraie base ni Cloudflare : la porte est appelée comme Cloudflare l'appellerait
// (onRequest avec la requête et les réglages), les fichiers du site sont servis depuis le dépôt.
// Préparation et émulateurs : comme tests/regles.cjs (voir son en-tête). Puis : node tests/porte.cjs
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

const RACINE = path.join(__dirname, '..');
const NS = 'demo-porte-default-rtdb';
const DB = 'http://127.0.0.1:9000', AUTH = 'http://127.0.0.1:9099';
const PORT_SITE = 8822;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const CLE_PORTE = 'cle-de-porte-essai-0123456789';

let echecs = 0;
function verifie(cond, msg) { console.log((cond ? 'OK    ' : 'ÉCHEC ') + msg); if (!cond) echecs++; }
const admin = { Authorization: 'Bearer owner' };
const lit = async (chemin) => (await fetch(`${DB}/${chemin}.json?ns=${NS}`, { headers: admin })).json();
const pose = (chemin, v) => fetch(`${DB}/${chemin}.json?ns=${NS}`, { method: 'PUT', headers: admin, body: typeof v === 'string' ? v : JSON.stringify(v) });
const compte = async (email, mdp) => (await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=cle-demo`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: mdp, returnSecureToken: true }) })).json();

// Fichiers du site comme Cloudflare les donne à la porte (env.ASSETS) ; cle-web.js est celui des essais, jamais le vrai.
const ASSETS = { fetch: async (u) => {
  const p = new URL(u).pathname;
  if (p === '/cle-web.js') return new Response("// Exemple : window.RECOLTE_CLE_WEB = '';\nwindow.RECOLTE_CLE_WEB = 'cle-demo';\n");
  if (p === '/config.js') return new Response(`window.RECOLTE_DB_URL = '${DB}?ns=${NS}';`);
  const c = path.join(RACINE, p);
  if (!c.startsWith(RACINE) || !fs.existsSync(c)) return new Response('', { status: 404 });
  return new Response(fs.readFileSync(c));
} };
const ENV = { PORTE_CLE: CLE_PORTE, AGENT_MDP: 'essai-agent', AUTH_URL: AUTH + '/identitytoolkit.googleapis.com', ASSETS };

const copie = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'porte-')), 'porte.mjs');
fs.copyFileSync(path.join(RACINE, 'functions/agent/[[chemin]].js'), copie);
let n = 0;
const charger = () => import(pathToFileURL(copie).href + '?v=' + (++n)); // nouvelle instance : mémoire vide
const appeler = async (mod, env, methode, chemin, corps, cle) => {
  const h = {}; if (cle !== null) h.Authorization = 'Bearer ' + (cle || CLE_PORTE);
  if (corps !== undefined) h['Content-Type'] = 'application/json';
  const r = await mod.onRequest({ request: new Request('https://essai.pages.dev' + chemin, { method: methode, headers: h, body: corps === undefined ? undefined : (typeof corps === 'string' ? corps : JSON.stringify(corps)) }), env, params: {} });
  return { s: r.status, t: await r.text() };
};

(async () => {
  // ---------- Sans base : ce que la porte comprend ----------
  const P = await charger();
  verifie(P.lundiDe('2026-11-12') === '2026-11-09' && P.lundiDe('2026-11-09') === '2026-11-09' && P.lundiDe('2026-11-15') === '2026-11-09' && P.lundiDe('2027-01-01') === '2026-12-28' && P.lundiDe('2026-02-30') === null,
    'lundi de la semaine d\'une date (dimanche, changement d\'année, date impossible)');
  const ref = JSON.parse(fs.readFileSync(path.join(RACINE, 'referentiel/conditionnements.json'), 'utf8'));
  const cat = P.catalogue(ref);
  verifie(cat.length === ref.produits.filter((p) => !p.masque).length && !cat.some((p) => p.nom === 'Persil frisé (bouquet)'), 'catalogue : les produits du référentiel, sans ceux qui ne sont plus proposés (« masque »)');
  const tp = (nom) => { const x = P.trouverProduit(cat, nom); return x.p ? x.p.id : 'ERR ' + x.err; };
  verifie(tp('Poireaux') === 'poireau' && tp('ENDIVES') === 'endive' && tp('mache') === 'mache' && tp('Céleri branche') === 'celeri-branche' && tp('celeri-branche en bouquets') === 'celeri-branche-en-bouquet',
    'produit retrouvé par son nom : pluriel, majuscules, accents, tirets');
  verifie(tp('Carotte').startsWith('ERR « Carotte » inconnu (proches : Carotte (botte), Carotte lavée)') && tp('Topinambour') === 'ERR « Topinambour » inconnu',
    'nom incomplet ou inconnu : refusé, jamais deviné, avec les noms proches (' + tp('Carotte') + ')');
  const li = (l) => { const y = P.lireLigne(l); return JSON.stringify([y.nom, y.n, y.u]); };
  verifie(li(['Poireau', 3, 'colis']) === li('Poireau : 3 colis') && li('Poireau 3 colis') === li({ nom: 'Poireau', n: 3, u: 'colis' }) && P.lireLigne('Mâche 2,5 kg').n === 2.5,
    'une ligne s\'écrit en tableau, en objet ou en texte (« Poireau : 3 colis », virgule décimale)');
  const a = P.analyserLignes(cat, [['Poireaux', 3, 'colis'], 'Endive 9 colis', ['Aillet', 20, 'bottes'], ['Aillet', 2, 'kg'], ['Bette', 'beaucoup', 'colis'], ['Fenouil', 2, 'cagettes'], ['Mâche lavée', 1, 'kg']]);
  verifie(JSON.stringify(a.l) === JSON.stringify([{ p: 'poireau', n: 3, u: 'colis', nom: 'Poireaux' }, { p: 'endive', n: 9, u: 'colis' }, { p: 'aillet', n: 20, u: 'u' }]) && a.refus.length === 4 &&
    a.refus[0] === 'Aillet : unité « kg » impossible pour ce produit (colis ou u)' && a.refus[1] === 'Bette : quantité illisible' && a.refus[2].startsWith('Fenouil : unité « cagettes »') && a.refus[3].startsWith('« Mâche lavée » inconnu'),
    'lignes : unités traduites (bottes → u), unité impossible, quantité illisible, unité inconnue, produit inconnu : chaque refus dit pourquoi (' + a.refus.join(' / ') + ')');
  const deb = JSON.parse(fs.readFileSync(path.join(RACINE, 'referentiel/debouches.json'), 'utf8'));
  const livs = P.livraisonsDe(deb);
  verifie(P.trouverLivraison(livs, 'av03').id === 'av03' && P.trouverLivraison(livs, 'Auvabio 63').id === 'av63' && P.trouverLivraison(livs, 'Auvabio') === null && P.trouverLivraison(livs, 'Très Allier') === null && P.trouverLivraison(livs, 'TA jeu').id === 'ta-jeu',
    'livraison retrouvée par son identifiant, son nom ou son nom court ; « Auvabio » ou « Très Allier » (deux livraisons) : pas deviné');
  verifie(P.valeurDe("// Exemple : window.X = '';\nwindow.X = 'abc';", 'X') === 'abc' && P.valeurDe("window.X='';", 'X') === '', 'lecture d\'une valeur de cle-web.js ou config.js (la dernière non vide)');
  const tous = { src: 'm1', cle: 'k', date: Date.now(), livraisons: [{ c: 'lv', jour: '2026-11-11', lignes: [['Poireau', 1, 'colis']] }] };
  const err = async (o) => { try { await P.preparer(Object.assign({}, tous, o), livs, cat, 'Agent', Date.now()); return 'accepté'; } catch (e) { return e.message; } };
  const errs = [await err({ src: '' }), await err({ cle: '' }), await err({ type: 'autre' }), await err({ date: 'hier' }), await err({ date: Date.now() + 9 * 864e5 }), await err({ lien: 'http://x' }),
    await err({ livraisons: [] }), await err({ livraisons: [{ c: 'Auvabio', jour: '2026-11-12', lignes: ['Endive 1 colis'] }] }), await err({ livraisons: [{ c: 'lv', lignes: ['Endive 1 colis'] }] }),
    await err({ livraisons: [{ c: 'lv', jour: '2026-11-11', lignes: [] }] }), await err({ livraisons: [{ c: 'lv', jour: '2026-11-11', lignes: ['Endive 1 colis'] }, { c: 'lv', jour: '2026-11-12', lignes: ['Endive 1 colis'] }] })];
  verifie(errs.every((x) => x.startsWith('ERREUR rien n\'est déposé')), 'commande refusée en entier (rien n\'est déposé) : sans src, sans cle, type inconnu, date illisible ou future, lien pas en https, sans livraison, livraison ambiguë, sans jour, sans ligne, même livraison deux fois dans la semaine');
  verifie(await err({}) === 'accepté' && await err({ type: 'annulation', livraisons: [{ c: 'lv', jour: '2026-11-11' }] }) === 'accepté' && await err({ c: 'lv', jour: '2026-11-11', lignes: ['Endive 1 colis'], livraisons: undefined }) === 'accepté',
    'commande acceptée ; annulation sans lignes ; forme courte (une seule livraison sans « livraisons »)');
  const pr = await P.preparer({ src: 'gmail:abc', cle: 'COMMANDE ALLIER 12/11', date: '2026-11-10T08:00:00+01:00', lien: 'https://mail.google.com/x', verif: 'le PDF dit 8',
    livraisons: [{ c: 'Auvabio 03', jour: '2026-11-12', lignes: [['Endive', 9, 'colis']] }, { c: 'av63', jour: '2026-11-12', lignes: [['Topinambour', 2, 'colis']] }] }, livs, cat, 'Agent', Date.parse('2026-11-12T12:00:00Z'));
  const pr2 = await P.preparer({ src: 'gmail:abc', cle: 'autre', date: 1, livraisons: [{ c: 'av03', jour: '2026-11-13', lignes: ['Endive 1 colis'] }] }, livs, cat, 'Agent', 2e12).catch(() => null);
  verifie(pr.length === 2 && pr[0].p.w === '2026-11-09' && pr[0].p.c === 'av03' && pr[0].p.cle === 'COMMANDE ALLIER 12/11 · av03' && pr[1].p.cle === 'COMMANDE ALLIER 12/11 · av63' && pr[0].p.date === Date.parse('2026-11-10T07:00:00Z') &&
    pr[0].p.lien && pr[0].p.verif === 'le PDF dit 8' && !pr[1].p.l && pr[1].p.refus.length === 1 && /^av03-[0-9a-f]{24}$/.test(pr[0].id) && pr[0].id !== pr[1].id && pr2 === null,
    'un mail qui couvre deux livraisons donne deux propositions, chacune avec sa clé de commande (pour que les versions ne se mélangent pas) et son identifiant fixe tiré du mail');
  const pr3 = await P.preparer({ src: 'gmail:abc', cle: 'x', date: 1.75e12, livraisons: [{ c: 'av03', jour: '2026-11-10', lignes: ['Endive 1 colis'] }] }, livs, cat, 'Agent', 2e12);
  verifie(pr3[0].id === pr[0].id, 'le même mail redonne le même identifiant (c\'est ce qui fait « déjà vu »)');
  const beaucoup = await P.preparer({ src: 's', cle: 'k', date: 1.75e12, livraisons: [{ c: 'lv', jour: '2026-11-11', lignes: Array.from({ length: 230 }, (_, i) => ['Inconnu ' + i, 1, 'colis']) }] }, livs, cat, 'Agent', 2e12);
  verifie(beaucoup[0].p.refus.length === 20 && beaucoup[0].p.refus[19].startsWith('… et ') && !beaucoup[0].p.l, 'au plus 200 lignes lues et 20 refus gardés (le dernier dit combien d\'autres)');

  // ---------- Avec les émulateurs et les vraies règles ----------
  try { await fetch(`${DB}/.json?ns=${NS}&shallow=true`, { headers: admin }); await fetch(AUTH); }
  catch (e) { console.log('NON LANCÉ : les émulateurs Firebase ne répondent pas (voir l\'en-tête de tests/regles.cjs).'); process.exit(echecs ? 1 : 2); }
  await fetch(`${AUTH}/emulator/v1/projects/demo-recolte/accounts`, { method: 'DELETE' });
  const regles = fs.readFileSync(path.join(RACINE, 'docs/regles-base/fermees.json'), 'utf8');
  verifie((await fetch(`${DB}/.settings/rules.json?ns=${NS}`, { method: 'PUT', headers: admin, body: regles })).ok, 'règles fermées acceptées par l\'émulateur');
  const debBase = JSON.parse(JSON.stringify(deb));
  debBase.debouches.push({ id: 'es', nom: 'Épicerie d\'essai', colis: '', livraisons: [{ id: 'es-sam', jours: ['samedi'], court: 'Épicerie' }] });
  debBase.debouches.find((d) => d.id === 'el').archive = true;
  await pose('', { listes: { reglages: { debouches: debBase } } });
  const g = await compte('agent@ferme.invalid', 'essai-agent');
  const f = await compte('francois@ferme.invalid', 'essai-francois');
  const x = await compte('autre@ferme.invalid', 'essai-autre');
  await pose('profils/' + g.localId, '"agent"'); await pose('profils/' + f.localId, '"ferme"');

  let M = await charger(), r;
  r = await appeler(M, { ASSETS }, 'GET', '/agent');
  verifie(r.s === 503 && r.t.includes('porte fermée'), 'réglages pas encore saisis dans Cloudflare : la porte est fermée (' + r.s + ')');
  const e0 = await appeler(M, { ASSETS }, 'GET', '/agent/etat', undefined, null);
  verifie(e0.s === 200 && e0.t.startsWith('PORTE PAS PRÊTE\nréglages Cloudflare : manquants (PORTE_CLE, AGENT_MDP)'), 'GET /agent/etat sans clé, réglages pas saisis : « PORTE PAS PRÊTE » et ce qui manque');
  M = await charger();
  const e1 = await appeler(M, ENV, 'GET', '/agent/etat', undefined, null);
  verifie(e1.s === 200 && e1.t === 'PORTE PRÊTE\nréglages Cloudflare : saisis\ncompte agent : connecté\nboîte des commandes : ouverte au compte\nlivraisons : lues dans les réglages de la ferme\n', 'GET /agent/etat sans clé, tout installé : « PORTE PRÊTE », sans aucune donnée de la ferme');
  r = await appeler(M, ENV, 'GET', '/agent', undefined, null);
  const r2 = await appeler(M, ENV, 'GET', '/agent', undefined, 'mauvaise');
  verifie(r.s === 401 && r2.s === 401 && !r2.t.includes(CLE_PORTE), 'sans clé de porte ou avec une fausse : refusé (401), la clé n\'est jamais répétée');
  r = await appeler(M, ENV, 'GET', '/agent');
  verifie(r.s === 200 && r.t.includes('POST /agent/commande') && r.t.length < 2500, 'GET /agent : l\'aide, courte (' + r.t.length + ' signes)');
  r = await appeler(M, ENV, 'GET', '/agent/livraisons');
  verifie(r.s === 200 && r.t.startsWith('# source : réglages de la ferme (base)') && r.t.includes('\nes-sam | Épicerie d\'essai | samedi') && r.t.includes('\nav63 | Auvabio 63 (Auvabio) | jeudi') && r.t.includes('lv | Locavore | mercredi soir') && !r.t.includes('Élie'),
    'GET /agent/livraisons : celles des réglages de la ferme dans la base (une ajoutée, une retirée), une ligne chacune');
  const livTxt = r.t;
  r = await appeler(M, ENV, 'GET', '/agent/produits');
  verifie(r.s === 200 && r.t.includes('Poireau | colis kg') && r.t.includes('Aillet | colis u') && !r.t.includes('Persil frisé (bouquet)') && r.t.split('\n').length >= 70 && r.t.length < 3000,
    'GET /agent/produits : un produit par ligne avec ses unités (' + r.t.length + ' signes)');
  const W = '2026-11-09';
  const cmd1 = { src: 'gmail:18c-auvabio-1', cle: '[Commande]COMMANDE ALLIER 12/11/2026', date: '2026-11-10T08:00:00+01:00', lien: 'https://mail.google.com/mail/u/0/#inbox/18c',
    livraisons: [{ c: 'av03', jour: '2026-11-12', lignes: [['Endives', 9, 'colis'], 'Poireau : 2 colis', ['Mâche', 1.5, 'kg'], ['Carotte', 3, 'colis']] }, { c: 'Auvabio 63', jour: '2026-11-12', lignes: [['Endive', 4, 'colis']] }] };
  r = await appeler(M, ENV, 'POST', '/agent/commande', cmd1);
  let props = await lit('agent/propositions');
  let ids = Object.keys(props || {});
  const p03 = Object.values(props || {}).find((p) => p.c === 'av03'), p63 = Object.values(props || {}).find((p) => p.c === 'av63');
  verifie(r.s === 200 && /^OK av03 semaine du 2026-11-09 : 3 lignes déposées/m.test(r.t) && /^OK av63 semaine du 2026-11-09 : 1 ligne déposée/m.test(r.t) && r.t.includes('non compris : « Carotte » inconnu (proches : Carotte (botte), Carotte lavée)'),
    'POST /agent/commande : deux propositions déposées, réponse courte avec ce qui n\'est pas compris (« ' + r.t.split('\n').join(' / ') + ' »)');
  verifie(ids.length === 2 && p03 && p03.w === W && p03.by === 'Agent' && p03.l.length === 3 && p03.l[0].p === 'endive' && p03.l[0].nom === 'Endives' && p03.l[2].u === 'kg' && p03.refus.length === 1 && p03.lien.startsWith('https://') && p03.type === 'commande' && p63.l[0].n === 4,
    'dans la base, sous agent/propositions : la forme attendue par l\'appli (semaine, livraison, lignes, refus, lien, « Agent »), acceptée par les vraies règles');
  r = await appeler(M, ENV, 'POST', '/agent/commande', cmd1);
  const apres = await lit('agent/propositions');
  verifie(r.s === 200 && (r.t.match(/^DÉJÀ VU/gm) || []).length === 2 && JSON.stringify(apres) === JSON.stringify(props), 'le même mail une deuxième fois : « DÉJÀ VU », rien d\'écrit');
  r = await appeler(M, ENV, 'POST', '/agent/commande', Object.assign({}, cmd1, { src: 'gmail:18c-auvabio-2', date: '2026-11-11T07:30:00+01:00', livraisons: [{ c: 'av03', jour: '2026-11-12', lignes: [['Endive', 7, 'colis']] }] }));
  const r3 = await appeler(M, ENV, 'POST', '/agent/commande', { src: 'gmail:18c-auvabio-3', cle: cmd1.cle, date: '2026-11-11T09:00:00+01:00', type: 'annulation', livraisons: [{ c: 'av63', jour: '2026-11-12' }] });
  props = await lit('agent/propositions');
  const v03 = Object.values(props).filter((p) => p.cle === cmd1.cle + ' · av03'), an = Object.values(props).find((p) => p.type === 'annulation');
  verifie(r.s === 200 && r3.s === 200 && v03.length === 2 && an && an.c === 'av63' && an.cle === cmd1.cle + ' · av63' && !an.l, '« annule et remplace » : nouvelle version de même clé déposée à côté ; annulation d\'une livraison déposée sans lignes');
  r = await appeler(M, ENV, 'POST', '/agent/commande', { src: 'gmail:x', cle: 'x', date: Date.now(), livraisons: [{ c: 'lv', jour: '2026-11-11', lignes: ['Poireau 1 colis'] }, { c: 'el', jour: '2026-11-11', lignes: ['Poireau 1 colis'] }] });
  const r4 = await appeler(M, ENV, 'POST', '/agent/commande', '{pas du json');
  verifie(r.s === 400 && r.t.includes('« el » inconnue') && r4.s === 400 && Object.keys(await lit('agent/propositions')).length === 4, 'une livraison retirée des réglages ou un JSON illisible : erreur, et rien n\'est déposé (pas même la livraison correcte)');
  r = await appeler(M, ENV, 'POST', '/agent/commande', { src: 'gmail:es', cle: 'épicerie 14/11', date: Date.now() - 1000, c: 'Épicerie', jour: '2026-11-14', lignes: ['Poireau 2 colis'] });
  verifie(r.s === 200 && r.t.startsWith('OK es-sam semaine du 2026-11-09'), 'une livraison ajoutée par la ferme dans ses réglages est reconnue (par son nom court)');
  r = await appeler(M, ENV, 'GET', '/agent/propositions?w=2026-11-12');
  verifie(r.s === 200 && r.t.startsWith('# semaine du 2026-11-09 : 5 propositions') && r.t.includes('| av63 | annulation |') && r.t.includes('| gmail:18c-auvabio-1'), 'GET /agent/propositions?w= : ce qui est déjà déposé cette semaine, une ligne chacune');
  r = await appeler(M, ENV, 'GET', '/agent/semaine');
  const r5 = await appeler(M, ENV, 'DELETE', '/agent/commande');
  verifie(r.s === 404 && r5.s === 404, 'tout autre appel : « appel inconnu » (la porte ne sait rien faire d\'autre)');

  // Le compte de la porte n'a que les droits de l'agent : même avec un bug, la porte ne pourrait écrire nulle part ailleurs.
  const tok = (await (await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=cle-demo`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'agent@ferme.invalid', password: 'essai-agent', returnSecureToken: true }) })).json()).idToken;
  const ecr = await Promise.all(['listes/semaines/' + W + '/q/endive/av03', 'listes/reglages/debouches/at'].map((c) => fetch(`${DB}/${c}.json?ns=${NS}&auth=${tok}`, { method: 'PUT', body: '{"n":1,"u":"colis","by":"Agent","at":1}' }).then((y) => y.status)));
  verifie(ecr.every((s) => s === 401), 'le compte de la porte ne peut écrire ni dans la semaine ni dans les débouchés (vraies règles)');

  // Mauvais mot de passe, compte sans profil, règles d'avant (sans la lecture des débouchés)
  M = await charger();
  r = await appeler(M, Object.assign({}, ENV, { AGENT_MDP: 'faux' }), 'GET', '/agent/livraisons');
  const e2 = await appeler(M, Object.assign({}, ENV, { AGENT_MDP: 'faux' }), 'GET', '/agent/etat', undefined, null);
  verifie(e2.t.startsWith('PORTE PAS PRÊTE') && e2.t.includes('compte agent refusé') && !e2.t.includes('faux'), 'GET /agent/etat : mauvais mot de passe signalé, sans le répéter');
  verifie(r.s === 503 && r.t.includes('compte agent refusé') && !r.t.includes('faux'), 'mauvais mot de passe du compte agent : la porte le dit (503), sans le répéter');
  M = await charger();
  r = await appeler(M, Object.assign({}, ENV, { AGENT_COMPTE: 'autre', AGENT_MDP: 'essai-autre' }), 'POST', '/agent/commande', Object.assign({}, cmd1, { src: 'gmail:sans-profil' }));
  const e3 = await appeler(await charger(), Object.assign({}, ENV, { AGENT_COMPTE: 'autre', AGENT_MDP: 'essai-autre' }), 'GET', '/agent/etat', undefined, null);
  verifie(e3.t.startsWith('PORTE PAS PRÊTE') && e3.t.includes('boîte des commandes : refusée (401) : profil « agent » manquant'), 'GET /agent/etat : compte sans profil « agent » signalé');
  verifie(r.s === 502 && r.t.includes('la base refuse'), 'compte sans profil « agent » : la base refuse, la porte le dit (502), rien n\'est déposé');
  await fetch(`${DB}/.settings/rules.json?ns=${NS}`, { method: 'PUT', headers: admin, body: fs.readFileSync(path.join(RACINE, 'docs/regles-base/fermees-sans-porte.json'), 'utf8') });
  M = await charger();
  r = await appeler(M, ENV, 'GET', '/agent/livraisons');
  const r6 = await appeler(M, ENV, 'POST', '/agent/commande', { src: 'gmail:avant', cle: 'lv 11/11', date: Date.now() - 1000, c: 'lv', jour: '2026-11-11', lignes: ['Poireau 1 colis'] });
  const r7 = await appeler(M, ENV, 'POST', '/agent/commande', { src: 'gmail:avant-es', cle: 'es', date: Date.now() - 1000, c: 'es-sam', jour: '2026-11-14', lignes: ['Poireau 1 colis'] });
  const e4 = await appeler(await charger(), ENV, 'GET', '/agent/etat', undefined, null);
  verifie(e4.t.startsWith('PORTE PRÊTE') && e4.t.includes('livraisons : fichier de départ du site (règles de l\'étape 32 pas encore publiées)'), 'GET /agent/etat avec les règles d\'avant : prête, livraisons du fichier de départ');
  verifie(r.s === 200 && r.t.startsWith('# source : fichier de départ du site (réglages de la base pas encore lisibles') && !r.t.includes('es-sam') && r6.s === 200 && r6.t.startsWith('OK lv') && r7.s === 400,
    'règles d\'avant l\'étape 32 (débouchés pas lisibles par l\'agent) : la porte marche avec les livraisons du fichier de départ et le dit');
  await fetch(`${DB}/.settings/rules.json?ns=${NS}`, { method: 'PUT', headers: admin, body: regles });
  M = await charger();
  const codes = [];
  for (let i = 0; i < 61; i++) codes.push((await appeler(M, ENV, 'GET', '/agent')).s);
  verifie(codes.slice(0, 60).every((s) => s === 200) && codes[60] === 429, 'au plus 60 appels par minute (le 61e : « trop d\'appels », 429)');

  // ---------- L'appli de la ferme reçoit la commande déposée par la porte et la valide ----------
  let chromium;
  try { ({ chromium } = require('playwright')); } catch (e) { chromium = null; }
  if (chromium) {
    const lundi = (() => { const d = new Date(); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })();
    const jeudi = (() => { const d = new Date(lundi + 'T12:00:00'); d.setDate(d.getDate() + 3); return d.toISOString().slice(0, 10); })();
    M = await charger();
    r = await appeler(M, ENV, 'POST', '/agent/commande', { src: 'gmail:appli', cle: 'COMMANDE ALLIER appli', date: Date.now() - 60000, lien: 'https://mail.google.com/mail/u/0/#inbox/appli',
      livraisons: [{ c: 'av03', jour: jeudi, lignes: [['Poireaux', 2, 'colis'], ['Topinambour', 1, 'colis']] }] });
    const idA = (/\((av03-[0-9a-f]{24})\)/.exec(r.t) || [])[1];
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
    const ctx = await nav.newContext({ viewport: { width: 412, height: 900 }, serviceWorkers: 'block' });
    await ctx.addInitScript(() => localStorage.setItem('recolte.qui', JSON.stringify('François')));
    const A = await ctx.newPage(); A.on('pageerror', (e) => erreurs.push(e.message));
    await A.goto(`http://localhost:${PORT_SITE}/`);
    await A.fill('#authId', 'francois'); await A.fill('#authMdp', 'essai-francois'); await A.click('#authOk');
    await A.waitForFunction(() => document.querySelector('#sync').textContent.includes('Partagé'), null, { timeout: 20000 }).catch(() => {});
    await A.click('#tabs [data-view="semaine"]');
    const sel = `#semCmd article[data-cmd="${idA}"]`;
    await A.waitForSelector(sel, { timeout: 25000 }).catch(() => {});
    const carte = (await A.isVisible(sel)) ? await A.textContent(sel) : '';
    verifie(!!idA && carte.includes('Auvabio 03') && carte.includes('Poireau') && carte.includes('Topinambour') && carte.includes('déposée par Agent') && carte.includes('Voir le message'),
      'appli + émulateurs : la commande déposée par la porte arrive dans « Commandes à valider » (livraison, produit, ligne non comprise, « déposée par Agent », lien du mail)');
    await A.click(`#semCmd [data-a="cmd-valider"][data-id="${idA}"]`);
    let dv = null;
    for (let i = 0; i < 40 && !dv; i++) { await A.waitForTimeout(250); dv = await lit(`listes/semaines/${lundi}/commandes/${idA}`); }
    const qv = await lit(`listes/semaines/${lundi}/q/poireau/av03`);
    verifie(dv && dv.e === 'valide' && dv.by === 'François' && qv && qv.n === 2 && qv.u === 'colis' && qv.by === 'François', 'appli + émulateurs : « Valider » inscrit 2 colis de poireau pour Auvabio 03 dans la semaine, au nom de François');
    verifie(erreurs.length === 0, 'appli + émulateurs : aucune erreur JavaScript' + (erreurs.length ? ' : ' + erreurs.join(' | ') : ''));
    await nav.close(); site.close();
  } else console.log('NON LANCÉ : partie appli (Playwright absent)');

  console.log(echecs ? `\n${echecs} échec(s)` : '\nTout est bon.');
  process.exit(echecs ? 1 : 0);
})().catch((e) => { console.log('ÉCHEC imprévu : ' + (e && e.stack || e)); process.exit(1); });
