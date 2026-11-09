// Faux serveur Firebase Realtime Database (API REST + flux temps réel), pour les tests.
// Gère GET en text/event-stream (événement « put ») ou en JSON (avec « shallow=true »), PUT, DELETE et PATCH (écriture de plusieurs
// chemins d'un coup, événement « patch »). Données en mémoire. couperFlux() ferme les flux ouverts (coupure réseau).
// Option { comptes: { cle } } (étape 5) : imite aussi Firebase Authentication (connexion par identifiant et mot de
// passe, renouvellement du jeton) et les règles de docs/regles-base/fermees.json : sans jeton valable, ou sans
// profil « ferme » sous profils/<uid>, la base répond 401 ; un jeton expiré ferme les flux par « auth_revoked ».
// Étape 13C : chacun lit son propre profil ; la ferme lit magasins ; le profil « magasin:<débouché> » lit et écrit
// magasins/<débouché>/semaines et personnes, et ajoute au journal sans rien y réécrire (une écriture PATCH est
// vérifiée chemin par chemin, comme la vraie base). Les validations de forme ne sont essayées que par tests/regles.cjs.
const http = require('http');
const crypto = require('crypto');

module.exports = function fauxFirebase(port, options = {}) {
  let root = {};
  const abonnes = [];
  const opt = options.comptes || null;
  const utilisateurs = {}; // email -> { mdp, uid }
  const jetons = {}; // jeton -> { uid, fin }
  const renouv = {}; // jeton de renouvellement -> uid
  const journal = []; // chaque appel à la base : { m, p, auth } (auth : 'ok', 'aucun', 'expire', 'faux')
  const hasard = () => crypto.randomBytes(12).toString('hex');
  const nouveauJeton = (uid) => { const j = 'j-' + hasard(); jetons[j] = { uid, fin: Date.now() + (opt.duree || 3600) * 1000 }; return j; };
  const json = (r, code, v) => { r.writeHead(code, { 'Content-Type': 'application/json' }); r.end(JSON.stringify(v)); };
  const lireCorps = (q) => new Promise((ok) => { let c = ''; q.on('data', (d) => (c += d)); q.on('end', () => ok(c)); });
  // Authentification : renvoie null si l'accès est permis, sinon le message d'erreur de la base.
  const permis = (uid, m, p) => {
    const profil = root.profils && root.profils[uid];
    if (p[0] === 'listes') return profil === 'ferme';
    if (serveur.reglesAvant13C) return false; // règles de l'étape 5 seules (avant la publication des nouvelles)
    if (p[0] === 'profils') return m === 'GET' && p.length === 2 && p[1] === uid;
    if (p[0] !== 'magasins') return false;
    if (m === 'GET' && profil === 'ferme') return true;
    if (!p[1] || profil !== 'magasin:' + p[1]) return false;
    if (p[2] === 'semaines') return m === 'GET' ? p.length >= 3 : p.length === 5;
    if (p[2] === 'personnes') return m === 'GET' ? p.length >= 3 : p.length === 4 && m !== 'DELETE';
    if (p[2] === 'journal') return m !== 'GET' && p.length === 5 && lire(p) === null;
    return false;
  };
  const refus = (url, p, m, corps) => {
    if (!opt) return null;
    const j = url.searchParams.get('auth'), t = j && jetons[j];
    const etat = !j ? 'aucun' : !t ? 'faux' : t.fin <= Date.now() ? 'expire' : 'ok';
    journal.push({ m, p: p.join('/'), auth: etat });
    if (etat === 'expire') return 'Auth token is expired';
    if (etat === 'faux') return 'Could not parse auth token.';
    if (etat === 'aucun') return 'Permission denied';
    if (m === 'PATCH') {
      const v = JSON.parse(corps || '{}');
      return Object.keys(v).every((k) => permis(t.uid, v[k] === null ? 'DELETE' : 'PUT', p.concat(k.split('/').filter(Boolean)))) ? null : 'Permission denied';
    }
    return permis(t.uid, m, p) ? null : 'Permission denied';
  };
  const lire = (p) => { let o = root; for (const k of p) { if (o == null) return null; o = o[k]; } return o === undefined ? null : o; };
  const ecrire = (p, v) => {
    if (!p.length) { root = v || {}; return; }
    let o = root;
    for (const k of p.slice(0, -1)) { if (typeof o[k] !== 'object' || !o[k]) o[k] = {}; o = o[k]; }
    if (v === null) delete o[p.at(-1)]; else o[p.at(-1)] = v;
  };
  const serveur = http.createServer(async (q, r) => {
    r.setHeader('Access-Control-Allow-Origin', '*');
    r.setHeader('Access-Control-Allow-Methods', 'GET,PUT,DELETE,PATCH,POST');
    r.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (q.method === 'OPTIONS') return r.end();
    const url = new URL(q.url, 'http://x');
    if (opt && q.method === 'POST' && url.pathname.startsWith('/v1/')) {
      const corps = await lireCorps(q);
      if (url.searchParams.get('key') !== opt.cle) return json(r, 400, { error: { code: 400, message: 'API key not valid. Please pass a valid API key.' } });
      if (url.pathname === '/v1/accounts:signInWithPassword') {
        const d = JSON.parse(corps), u = utilisateurs[String(d.email).toLowerCase()];
        if (!u || u.mdp !== d.password) return json(r, 400, { error: { code: 400, message: 'INVALID_LOGIN_CREDENTIALS' } });
        const rt = 'r-' + hasard(); renouv[rt] = u.uid;
        return json(r, 200, { localId: u.uid, email: d.email, idToken: nouveauJeton(u.uid), refreshToken: rt, expiresIn: String(opt.duree || 3600) });
      }
      if (url.pathname === '/v1/token') {
        serveur.renouvellements++;
        const d = new URLSearchParams(corps), uid = renouv[d.get('refresh_token')];
        if (!uid) return json(r, 400, { error: { code: 400, message: 'INVALID_REFRESH_TOKEN' } });
        return json(r, 200, { id_token: nouveauJeton(uid), refresh_token: d.get('refresh_token'), expires_in: String(opt.duree || 3600), user_id: uid });
      }
      return json(r, 404, { error: { message: 'NOT_FOUND' } });
    }
    const p = q.url.replace(/\.json.*$/, '').split('/').filter(Boolean);
    const corpsLu = q.method === 'GET' ? '' : await lireCorps(q);
    const non = refus(url, p, q.method, corpsLu);
    if (non) return json(r, 401, { error: non });
    if (q.method === 'GET' && !String(q.headers.accept || '').includes('text/event-stream')) {
      serveur.lectures.push(p.join('/') + (url.searchParams.get('shallow') === 'true' ? '?shallow' : ''));
      r.writeHead(200, { 'Content-Type': 'application/json' });
      // « shallow=true » (comme la vraie base) : les noms des enfants seulement, chacun à true ; une valeur simple telle quelle.
      const v = lire(p);
      if (url.searchParams.get('shallow') === 'true' && v && typeof v === 'object') return r.end(JSON.stringify(Object.fromEntries(Object.keys(v).map((k) => [k, true]))));
      return r.end(JSON.stringify(v));
    }
    if (q.method === 'GET') {
      r.writeHead(200, { 'Content-Type': 'text/event-stream' });
      r.write('event: put\ndata: ' + JSON.stringify({ path: '/', data: lire(p) }) + '\n\n');
      const a = { p, r, jeton: url.searchParams.get('auth') }; abonnes.push(a);
      q.on('close', () => abonnes.splice(abonnes.indexOf(a), 1));
      return;
    }
    {
      const v = q.method === 'DELETE' ? null : JSON.parse(corpsLu);
      if (q.method === 'PATCH') {
        for (const [k, x] of Object.entries(v)) ecrire(p.concat(k.split('/').filter(Boolean)), x);
        for (const s of abonnes) {
          if (p.join('/').startsWith(s.p.join('/'))) {
            s.r.write('event: patch\ndata: ' + JSON.stringify({ path: '/' + p.slice(s.p.length).join('/'), data: v }) + '\n\n');
          } else {
            // Écriture plus haut que le flux (PATCH sur magasins/<débouché> qui touche semaines/<lundi>/…) : la vraie
            // base prévient aussi le flux, pour chaque chemin qui tombe dedans.
            for (const [k, x] of Object.entries(v)) {
              const plein = p.concat(k.split('/').filter(Boolean));
              if (plein.slice(0, s.p.length).join('/') === s.p.join('/')) s.r.write('event: put\ndata: ' + JSON.stringify({ path: '/' + plein.slice(s.p.length).join('/'), data: x }) + '\n\n');
            }
          }
        }
        return r.end(JSON.stringify(v));
      }
      ecrire(p, v);
      for (const s of abonnes) {
        if (p.join('/').startsWith(s.p.join('/'))) {
          s.r.write('event: put\ndata: ' + JSON.stringify({ path: '/' + p.slice(s.p.length).join('/'), data: v }) + '\n\n');
        }
      }
      r.end(JSON.stringify(v));
    }
  });
  serveur.couperFlux = () => { for (const a of abonnes.splice(0)) a.r.destroy(); };
  // Comptes (option comptes) : créer, donner un profil, faire expirer tous les jetons, supprimer.
  serveur.renouvellements = 0;
  serveur.lectures = []; // chaque lecture simple (hors flux) : « chemin » ou « chemin?shallow »
  serveur.journal = journal;
  serveur.creerCompte = (email, mdp) => { const uid = 'u' + hasard().slice(0, 10); utilisateurs[email.toLowerCase()] = { mdp, uid }; return uid; };
  serveur.profil = (uid, v) => ecrire(['profils', uid], v);
  serveur.expirerJetons = () => {
    for (const t of Object.values(jetons)) t.fin = Date.now() - 1;
    for (const a of abonnes.splice(0)) { a.r.write('event: auth_revoked\ndata: "credential is no longer valid"\n\n'); a.r.end(); }
  };
  serveur.supprimerCompte = (email) => {
    const u = utilisateurs[email.toLowerCase()]; if (!u) return;
    delete utilisateurs[email.toLowerCase()];
    for (const k of Object.keys(renouv)) if (renouv[k] === u.uid) delete renouv[k];
    for (const t of Object.values(jetons)) if (t.uid === u.uid) t.fin = 0;
  };
  serveur.lire = (chemin) => lire(chemin.split('/').filter(Boolean));
  return new Promise((ok) => serveur.listen(port, () => ok(serveur)));
};
