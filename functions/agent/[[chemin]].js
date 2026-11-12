// La porte de l'agent (étape 32, docs/PLAN_AGENT_IA.md) : un petit programme Cloudflare Pages (« Pages Function »),
// servi avec l'appli, sous https://<site>/agent/… seulement. Le reste du site ne passe jamais par ici.
//
// Un agent IA (étape 33 : lecture des mails de commande) lui parle en appels courts, avec sa clé de porte.
// La porte se connecte à la base avec le compte au profil « agent » et ne fait qu'une chose dans la base :
// déposer des propositions sous agent/propositions/<id> (une fois par identifiant). Une personne les valide
// ou les refuse dans l'onglet Semaine de l'appli (étape 31). La porte ne lit ni n'écrit rien d'autre de la base
// que ses propositions et, si les règles l'ouvrent, les débouchés (listes/reglages/debouches).
//
// Réglages, saisis par la ferme dans Cloudflare (Paramètres du projet, Variables et secrets) ; jamais dans le dépôt :
//   PORTE_CLE     (secret, obligatoire) clé que l'agent envoie (« Authorization: Bearer <clé> »). La changer = révoquer.
//   AGENT_MDP     (secret, obligatoire) mot de passe du compte « agent » de Firebase.
//   AGENT_COMPTE  (facultatif) identifiant du compte, « agent » par défaut (complété par « @ferme.invalid »).
//   AGENT_NOM     (facultatif) nom écrit comme « déposée par », « Agent » par défaut.
//   CLE_WEB, DB_URL (facultatifs) : sinon lus dans cle-web.js et config.js du site, comme l'appli.
//   AUTH_URL      (essais seulement) adresse de Firebase Authentication (émulateur).
// Rien de propre à une ferme ici : livraisons et produits viennent des réglages de la base et du référentiel du site.

const DOMAINE_COMPTES = 'ferme.invalid';
const MAX_CORPS = 64 * 1024;
const MAX_LIGNES = 200;
const MAX_REFUS = 20;
const APPELS_MINUTE = 60;
const UNITES = { colis: 'colis', caisse: 'colis', caisses: 'colis', c: 'colis',
  kg: 'kg', kgs: 'kg', kilo: 'kg', kilos: 'kg', kilogramme: 'kg', kilogrammes: 'kg',
  u: 'u', unite: 'u', unites: 'u', piece: 'u', pieces: 'u', pc: 'u', pcs: 'u', botte: 'u', bottes: 'u',
  bouquet: 'u', bouquets: 'u', pied: 'u', pieds: 'u', tete: 'u', tetes: 'u', barquette: 'u', barquettes: 'u' };

// Mémoire de l'instance (Cloudflare la garde quelques minutes) : jeton du compte, fichiers du site, compteur d'appels.
const memo = { jeton: null, fin: 0, fichiers: {}, appels: [], etat: null };

const AIDE = `Porte de l'agent : commandes à valider (une personne valide dans l'appli, onglet Semaine).
Chaque appel porte l'en-tête « Authorization: Bearer <clé de porte> ». Réponses en texte court.
GET  /agent/etat (sans clé)       la porte est-elle prête ?
GET  /agent/livraisons            une ligne par livraison : id | nom | jours
GET  /agent/produits              une ligne par produit : nom | unités possibles
GET  /agent/propositions?w=DATE   ce qui est déjà déposé pour la semaine de DATE (AAAA-MM-JJ)
POST /agent/commande              dépose une commande (JSON) :
  {"src":"identifiant unique du mail","lien":"https://… (facultatif)","date":"heure du mail (ISO ou ms)",
   "cle":"même texte pour toutes les versions d'un même bon (ex. objet du mail sans « annule et remplace »)",
   "type":"commande" ou "annulation","verif":"doute à signaler (facultatif)",
   "livraisons":[{"c":"id ou nom de la livraison","jour":"AAAA-MM-JJ de la livraison",
                  "lignes":[["Poireau",3,"colis"],"Endive 9 colis",{"nom":"Mâche","n":2.5,"u":"kg"}]}]}
  unités : colis, kg ou u (botte, bouquet, pièce). Le produit est cherché par son nom, sans deviner :
  un nom inconnu ou ambigu est refusé (la ligne est montrée à la ferme comme « non comprise »).
  Un même src déjà déposé répond « DÉJÀ VU » sans rien écrire. Un nouveau bon de même cle est une nouvelle version.
  Une livraison qui disparaît d'un nouveau bon : déposer une "annulation" pour elle.`;

function texte(corps, statut) {
  return new Response(corps + '\n', { status: statut || 200, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
}
class Refus extends Error { constructor(statut, msg) { super(msg); this.statut = statut; } }

export function sansAccents(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
// Même identifiant de produit que l'appli (pidDe dans index.html).
export function pidDe(nom) { return sansAccents(nom).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
function mots(s) { return sansAccents(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean); }
// Pluriel courant retiré (poireaux → poireau, endives → endive) pour comparer les noms, rien de plus.
function singulier(m) { return m.length > 3 && /[sx]$/.test(m) ? m.slice(0, -1) : m; }
function forme(s) { return mots(s).map(singulier).join(' '); }
function tableau(x) { if (!x) return []; return Array.isArray(x) ? x.filter(Boolean) : Object.keys(x).sort((a, b) => a - b).map((k) => x[k]).filter(Boolean); }
function court(s, n) { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

// Lundi (AAAA-MM-JJ) de la semaine d'une date AAAA-MM-JJ.
export function lundiDe(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return null;
  d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7);
  return d.toISOString().slice(0, 10);
}

// ---------- Produits : retrouver un nom écrit dans un mail, sans deviner ----------
export function catalogue(ref) {
  return tableau(ref && ref.produits).filter((p) => p && p.produit && !p.masque).map((p) => {
    const unites = ['colis'];
    if (p.kg) unites.push('kg');
    if (p.par_colis) unites.push('u');
    return { id: pidDe(p.produit), nom: p.produit, forme: forme(p.produit), unites };
  });
}
export function trouverProduit(cat, nom, pid) {
  if (pid) { const x = cat.find((p) => p.id === pid); if (x) return { p: x }; }
  const f = forme(nom);
  if (!f) return { err: 'nom de produit vide' };
  const memes = cat.filter((p) => p.forme === f);
  if (memes.length === 1) return { p: memes[0] };
  if (memes.length > 1) return { err: `« ${court(nom, 40)} » ambigu (${memes.map((p) => p.nom).join(', ')})` };
  const m = f.split(' ');
  const proches = cat.filter((p) => { const q = p.forme.split(' '); return m.some((x) => x.length > 2 && q.some((y) => y.startsWith(x) || x.startsWith(y))); }).slice(0, 3);
  return { err: `« ${court(nom, 40)} » inconnu` + (proches.length ? ` (proches : ${proches.map((p) => p.nom).join(', ')})` : '') };
}
export function unite(u) { const k = sansAccents(u).toLowerCase().replace(/[^a-z]/g, ''); return UNITES[k] || null; }
function nombre(n) {
  if (typeof n === 'number') return n;
  if (typeof n === 'string' && /^\s*\d+(?:[.,]\d+)?\s*$/.test(n)) return parseFloat(n.replace(',', '.'));
  return NaN;
}
// Une ligne : ["Poireau", 3, "colis"], {"nom":"Poireau","n":3,"u":"colis"} (ou "p" : identifiant) ou "Poireau : 3 colis".
export function lireLigne(l) {
  if (Array.isArray(l)) return { nom: l[0], n: nombre(l[1]), u: l[2] };
  if (l && typeof l === 'object') return { nom: l.nom, pid: typeof l.p === 'string' ? l.p : '', n: nombre(l.n), u: l.u };
  if (typeof l === 'string') {
    const m = /^(.*?)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*([^\d\s]*)\s*$/.exec(l.trim());
    if (m && m[1]) return { nom: m[1], n: nombre(m[2]), u: m[3] };
    return { nom: l, n: NaN, u: '' };
  }
  return { nom: '', n: NaN, u: '' };
}
export function analyserLignes(cat, lignes) {
  const l = [], refus = [];
  tableau(lignes).slice(0, MAX_LIGNES).forEach((brut) => {
    const x = lireLigne(brut), nom = court(typeof x.nom === 'string' ? x.nom : '', 80);
    const t = trouverProduit(cat, nom, x.pid);
    if (t.err) { refus.push(t.err); return; }
    const p = t.p;
    if (!(x.n >= 0 && x.n < 100000)) { refus.push(`${p.nom} : quantité illisible`); return; }
    const u = unite(x.u);
    if (!u) { refus.push(`${p.nom} : unité « ${court(x.u || '', 15)} » manquante ou inconnue (colis, kg ou u)`); return; }
    if (p.unites.indexOf(u) < 0) { refus.push(`${p.nom} : unité « ${u} » impossible pour ce produit (${p.unites.join(' ou ')})`); return; }
    const o = { p: p.id, n: Math.round(x.n * 1000) / 1000, u };
    if (nom && nom !== p.nom) o.nom = nom;
    l.push(o);
  });
  const trop = tableau(lignes).length - MAX_LIGNES;
  if (trop > 0) refus.push(`${trop} ligne${trop > 1 ? 's' : ''} de trop (au plus ${MAX_LIGNES})`);
  return { l, refus };
}

// ---------- Livraisons : celles des réglages de la ferme ----------
export function livraisonsDe(reglages) {
  const out = [];
  tableau(reglages && reglages.debouches).forEach((d) => {
    if (!d || d.archive) return;
    tableau(d.livraisons).forEach((l) => {
      if (!l || !l.id || l.archive) return;
      const jours = tableau(l.jours).join(' ou ') + (l.moment ? ' ' + l.moment : '');
      out.push({ id: String(l.id), nom: l.nom || d.nom || l.id, court: l.court || '', debouche: d.nom || '', jours });
    });
  });
  return out;
}
export function trouverLivraison(livs, c) {
  if (typeof c !== 'string' || !c.trim()) return null;
  const exact = livs.find((x) => x.id === c.trim());
  if (exact) return exact;
  const f = forme(c), memes = livs.filter((x) => forme(x.nom) === f || (x.court && forme(x.court) === f));
  return memes.length === 1 ? memes[0] : null;
}

// ---------- Ce que la porte dépose : une proposition par livraison ----------
async function empreinte(s) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
export function heure(d) {
  if (typeof d === 'number' && isFinite(d)) return d < 1e11 ? d * 1000 : d;
  if (typeof d === 'string' && d.trim()) { const t = Date.parse(d); return isNaN(t) ? NaN : t; }
  return NaN;
}
// Lit la commande envoyée par l'agent ; renvoie les propositions à déposer, ou une erreur (rien n'est déposé).
export async function preparer(corps, livs, cat, nomAgent, maintenant) {
  if (!corps || typeof corps !== 'object' || Array.isArray(corps)) throw new Refus(400, 'ERREUR corps JSON attendu (voir GET /agent)');
  const src = court(corps.src, 120), cle = court(corps.cle, 100), verif = court(corps.verif, 200);
  const type = corps.type == null || corps.type === '' ? 'commande' : corps.type;
  const date = heure(corps.date);
  const err = [];
  if (!src) err.push('src manquant (identifiant unique du mail)');
  if (!cle) err.push('cle manquante (même texte pour toutes les versions d\'un bon)');
  if (type !== 'commande' && type !== 'annulation') err.push('type : « commande » ou « annulation »');
  if (!(date > Date.UTC(2020, 0, 1) && date < maintenant + 2 * 864e5)) err.push('date du mail manquante ou impossible');
  const lien = typeof corps.lien === 'string' && corps.lien ? corps.lien.trim() : '';
  if (lien && (!/^https:\/\/\S+$/.test(lien) || lien.length > 500)) err.push('lien : adresse https:// de 500 signes au plus');
  let blocs = Array.isArray(corps.livraisons) ? corps.livraisons : (corps.c != null ? [{ c: corps.c, jour: corps.jour, w: corps.w, lignes: corps.lignes }] : []);
  if (!blocs.length) err.push('livraisons manquantes');
  if (blocs.length > 10) err.push('au plus 10 livraisons par commande');
  blocs = blocs.slice(0, 10);
  const vus = {};
  const props = blocs.map((b, i) => {
    b = b && typeof b === 'object' ? b : {};
    const liv = trouverLivraison(livs, b.c), w = lundiDe(b.jour || b.w);
    if (!liv) err.push(`livraison ${i + 1} : « ${court(b.c, 40)} » inconnue (voir GET /agent/livraisons)`);
    if (!w) err.push(`livraison ${i + 1} : jour AAAA-MM-JJ manquant`);
    if (liv && w) { if (vus[liv.id + w]) err.push(`livraison ${i + 1} : « ${liv.id} » en double pour la même semaine`); vus[liv.id + w] = 1; }
    if (type === 'commande' && !tableau(b.lignes).length) err.push(`livraison ${i + 1} : aucune ligne`);
    return { liv, w, b };
  });
  if (err.length) throw new Refus(400, 'ERREUR rien n\'est déposé :\n- ' + err.join('\n- '));
  const sortie = [];
  for (const { liv, w, b } of props) {
    const a = type === 'commande' ? analyserLignes(cat, b.lignes) : { l: [], refus: [] };
    const id = liv.id.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 30) + '-' + (await empreinte(src + '|' + liv.id + '|' + w)).slice(0, 24);
    const p = { w, c: liv.id, cle: court(cle + ' · ' + liv.id, 120), src, date, type, by: court(nomAgent || 'Agent', 40), at: maintenant };
    if (lien) p.lien = lien;
    if (a.l.length) p.l = a.l;
    if (a.refus.length) {
      const r = a.refus.slice(0, MAX_REFUS).map((x) => court(x, 120));
      if (a.refus.length > MAX_REFUS) r[MAX_REFUS - 1] = court(`… et ${a.refus.length - MAX_REFUS + 1} autres lignes non comprises`, 120);
      p.refus = r;
    }
    if (verif) p.verif = verif;
    sortie.push({ id, p, refus: a.refus });
  }
  return sortie;
}

// ---------- Accès : clé de porte, fichiers du site, base ----------
async function memeCle(a, b) {
  const x = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(a))));
  const y = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(b))));
  let d = 0; for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i];
  return d === 0;
}
async function fichier(env, url, chemin, json) {
  const k = chemin, m = memo.fichiers[k];
  if (m && Date.now() - m.t < 5 * 60e3) return m.v;
  if (!env.ASSETS) throw new Refus(503, 'ERREUR porte mal installée (fichiers du site illisibles)');
  const r = await env.ASSETS.fetch(new URL(chemin, url));
  if (!r.ok) throw new Refus(503, `ERREUR fichier du site ${chemin} illisible (${r.status})`);
  const v = json ? await r.json() : await r.text();
  memo.fichiers[k] = { t: Date.now(), v };
  return v;
}
// Dernière valeur non vide de « window.NOM = '…' » dans un fichier du site (cle-web.js, config.js).
export function valeurDe(js, nom) {
  const re = new RegExp(nom + '\\s*=\\s*([\'"])([^\'"]*)\\1', 'g');
  let m, v = '';
  while ((m = re.exec(js))) if (m[2].trim()) v = m[2].trim();
  return v;
}
async function config(env, url) {
  const cleWeb = env.CLE_WEB || valeurDe(await fichier(env, url, '/cle-web.js'), 'RECOLTE_CLE_WEB');
  const db = env.DB_URL || valeurDe(await fichier(env, url, '/config.js'), 'RECOLTE_DB_URL');
  if (!cleWeb) throw new Refus(503, 'ERREUR clé web de la base absente du site');
  if (!db) throw new Refus(503, 'ERREUR adresse de la base absente du site');
  return { cleWeb, db };
}
async function jeton(env, cfg) {
  if (memo.jeton && Date.now() < memo.fin) return memo.jeton;
  const id = String(env.AGENT_COMPTE || 'agent').trim();
  const email = id.indexOf('@') < 0 ? id.toLowerCase() + '@' + DOMAINE_COMPTES : id;
  const base = (env.AUTH_URL || 'https://identitytoolkit.googleapis.com').replace(/\/+$/, '');
  const r = await fetch(base + '/v1/accounts:signInWithPassword?key=' + encodeURIComponent(cfg.cleWeb), {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: env.AGENT_MDP, returnSecureToken: true }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.idToken) {
    const m = (j.error && j.error.message) || String(r.status);
    throw new Refus(503, /INVALID_LOGIN_CREDENTIALS|INVALID_PASSWORD|EMAIL_NOT_FOUND|USER_DISABLED/.test(m)
      ? 'ERREUR compte agent refusé par la base (identifiant ou mot de passe, ou compte désactivé)' : 'ERREUR connexion à la base impossible (' + court(m, 60) + ')');
  }
  memo.jeton = j.idToken;
  memo.fin = Date.now() + Math.max(60, (+j.expiresIn || 3600) - 300) * 1000;
  return memo.jeton;
}
function urlBase(cfg, chemin, tok, q) {
  const [base, q0] = cfg.db.replace(/\/+$/, '').split('?');
  return base + '/' + chemin + '.json?' + [q0, 'auth=' + encodeURIComponent(tok), q].filter(Boolean).join('&');
}
async function base(env, cfg, chemin, opts, q) {
  const tok = await jeton(env, cfg);
  const r = await fetch(urlBase(cfg, chemin, tok, q), Object.assign({ cache: 'no-store' }, opts || {}));
  return r;
}
// Livraisons : réglages de la base si les règles laissent l'agent les lire, sinon le fichier de départ du site.
async function livraisons(env, url, cfg) {
  const r = await base(env, cfg, 'listes/reglages/debouches');
  if (r.ok) {
    const v = await r.json().catch(() => null);
    if (v && v.debouches) return { livs: livraisonsDe(v), source: 'réglages de la ferme (base)' };
    return { livs: livraisonsDe(await fichier(env, url, '/referentiel/debouches.json', true)), source: 'fichier de départ du site (la ferme n\'a pas encore modifié ses débouchés)' };
  }
  return { livs: livraisonsDe(await fichier(env, url, '/referentiel/debouches.json', true)), source: 'fichier de départ du site (réglages de la base pas encore lisibles par l\'agent)' };
}

// État de la porte, sans clé (pour vérifier l'installation dans un navigateur) : ne montre aucune donnée, seulement
// si les réglages sont saisis et si la base accepte le compte. Gardé une minute, pour ne pas solliciter la base.
async function etat(env, url) {
  if (memo.etat && Date.now() - memo.etat.t < 60e3) return memo.etat.v;
  const l = [];
  let pret = !!(env.PORTE_CLE && env.AGENT_MDP);
  l.push('réglages Cloudflare : ' + (pret ? 'saisis' : 'manquants (' + ['PORTE_CLE', 'AGENT_MDP'].filter((k) => !env[k]).join(', ') + ')'));
  if (env.AGENT_MDP) {
    try {
      const cfg = await config(env, url);
      await jeton(env, cfg);
      l.push('compte agent : connecté');
      const r = await base(env, cfg, 'agent/propositions', null, 'shallow=true');
      if (!r.ok) pret = false;
      l.push('boîte des commandes : ' + (r.ok ? 'ouverte au compte' : 'refusée (' + r.status + ') : profil « agent » manquant ou règles de l\'étape 31 pas publiées'));
      const d = await base(env, cfg, 'listes/reglages/debouches', null, 'shallow=true');
      l.push('livraisons : ' + (d.ok ? 'lues dans les réglages de la ferme' : 'fichier de départ du site (règles de l\'étape 32 pas encore publiées)'));
    } catch (e) { pret = false; l.push(e instanceof Refus ? e.message.replace(/^ERREUR /, '') : 'erreur imprévue'); }
  }
  const v = (pret ? 'PORTE PRÊTE' : 'PORTE PAS PRÊTE') + '\n' + l.join('\n');
  memo.etat = { t: Date.now(), v };
  return v;
}

// ---------- Les appels ----------
async function repondre(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const chemin = url.pathname.replace(/\/+$/, '').replace(/^\/agent/, '') || '/';
  if (request.method === 'GET' && chemin === '/etat') return texte(await etat(env, url));
  if (!env.PORTE_CLE || !env.AGENT_MDP) return texte('ERREUR porte fermée : la ferme n\'a pas encore saisi ses réglages dans Cloudflare', 503);
  const auth = request.headers.get('Authorization') || '';
  const donnee = /^Bearer\s+(.+)$/i.exec(auth);
  if (!donnee || !(await memeCle(donnee[1].trim(), env.PORTE_CLE))) return texte('ERREUR clé de porte absente ou fausse', 401);
  const t = Date.now();
  memo.appels = memo.appels.filter((x) => t - x < 60e3);
  if (memo.appels.length >= APPELS_MINUTE) return texte(`ERREUR trop d'appels (au plus ${APPELS_MINUTE} par minute)`, 429);
  memo.appels.push(t);

  if (request.method === 'GET' && chemin === '/') return texte(AIDE);
  const cfg = await config(env, url);

  if (request.method === 'GET' && chemin === '/livraisons') {
    const { livs, source } = await livraisons(env, url, cfg);
    return texte(`# source : ${source}\n` + livs.map((x) => `${x.id} | ${x.nom}${x.debouche && x.debouche !== x.nom ? ' (' + x.debouche + ')' : ''} | ${x.jours}`).join('\n'));
  }
  if (request.method === 'GET' && chemin === '/produits') {
    const cat = catalogue(await fichier(env, url, '/referentiel/conditionnements.json', true));
    return texte(cat.map((p) => `${p.nom} | ${p.unites.join(' ')}`).join('\n'));
  }
  if (request.method === 'GET' && chemin === '/propositions') {
    const w = lundiDe(url.searchParams.get('w'));
    if (!w) return texte('ERREUR w=AAAA-MM-JJ attendu', 400);
    const r = await base(env, cfg, 'agent/propositions', null, 'orderBy=' + encodeURIComponent('"w"') + '&equalTo=' + encodeURIComponent('"' + w + '"'));
    if (!r.ok) return texte(r.status === 401 ? 'ERREUR la base refuse la lecture (profil « agent » ou règles pas encore publiés)' : 'ERREUR base ' + r.status, 502);
    const v = (await r.json().catch(() => null)) || {};
    const ids = Object.keys(v).sort((a, b) => (v[a].date - v[b].date) || (a < b ? -1 : 1));
    return texte(`# semaine du ${w} : ${ids.length} proposition${ids.length > 1 ? 's' : ''}` + ids.map((id) => {
      const p = v[id] || {};
      return `\n${id} | ${p.c} | ${p.type} | ${new Date(p.date).toISOString().slice(0, 16)} | ${tableau(p.l).length} lignes${tableau(p.refus).length ? ', ' + tableau(p.refus).length + ' non comprises' : ''} | ${p.src}`;
    }).join(''));
  }
  if (request.method === 'POST' && chemin === '/commande') {
    const brut = await request.text();
    if (brut.length > MAX_CORPS) return texte('ERREUR commande trop longue', 413);
    let corps;
    try { corps = JSON.parse(brut); } catch (e) { return texte('ERREUR JSON illisible', 400); }
    const [{ livs }, ref] = await Promise.all([livraisons(env, url, cfg), fichier(env, url, '/referentiel/conditionnements.json', true)]);
    const props = await preparer(corps, livs, catalogue(ref), env.AGENT_NOM, Date.now());
    const lignes = [];
    for (const x of props) {
      const qui = `${x.p.c} semaine du ${x.p.w}`;
      const avant = await base(env, cfg, 'agent/propositions/' + x.id);
      if (!avant.ok) { lignes.push(`ERREUR ${qui} : la base refuse la lecture (${avant.status}) : profil « agent » ou règles pas encore publiés`); continue; }
      if ((await avant.json().catch(() => null)) !== null) { lignes.push(`DÉJÀ VU ${qui} (${x.id}) : rien d'écrit`); continue; }
      const r = await base(env, cfg, 'agent/propositions/' + x.id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(x.p) });
      if (!r.ok) { lignes.push(`ERREUR ${qui} : la base refuse l'écriture (${r.status})`); continue; }
      lignes.push(`OK ${qui} : ${x.p.type === 'annulation' ? 'annulation déposée' : tableau(x.p.l).length + ' ligne' + (tableau(x.p.l).length > 1 ? 's' : '') + ' déposée' + (tableau(x.p.l).length > 1 ? 's' : '')} (${x.id})` +
        x.refus.map((m) => `\n  non compris : ${m}`).join(''));
    }
    const ok = lignes.some((l) => /^(OK|DÉJÀ VU)/.test(l));
    return texte(lignes.join('\n'), ok ? 200 : 502);
  }
  return texte('ERREUR appel inconnu (voir GET /agent)', 404);
}

export async function onRequest(context) {
  try { return await repondre(context); }
  catch (e) {
    if (e instanceof Refus) return texte(e.message, e.statut);
    return texte('ERREUR imprévue de la porte', 500);
  }
}
