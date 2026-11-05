// Faux serveur Firebase Realtime Database (API REST + flux temps réel), pour les tests.
// Gère GET en text/event-stream (événement « put ») ou en JSON, PUT, DELETE et PATCH (écriture de plusieurs
// chemins d'un coup, événement « patch »). Données en mémoire. couperFlux() ferme les flux ouverts (coupure réseau).
const http = require('http');

module.exports = function fauxFirebase(port) {
  let root = {};
  const abonnes = [];
  const lire = (p) => { let o = root; for (const k of p) { if (o == null) return null; o = o[k]; } return o === undefined ? null : o; };
  const ecrire = (p, v) => {
    if (!p.length) { root = v || {}; return; }
    let o = root;
    for (const k of p.slice(0, -1)) { if (typeof o[k] !== 'object' || !o[k]) o[k] = {}; o = o[k]; }
    if (v === null) delete o[p.at(-1)]; else o[p.at(-1)] = v;
  };
  const serveur = http.createServer((q, r) => {
    r.setHeader('Access-Control-Allow-Origin', '*');
    r.setHeader('Access-Control-Allow-Methods', 'GET,PUT,DELETE,PATCH');
    if (q.method === 'OPTIONS') return r.end();
    const p = q.url.replace(/\.json.*$/, '').split('/').filter(Boolean);
    if (q.method === 'GET' && !String(q.headers.accept || '').includes('text/event-stream')) {
      r.writeHead(200, { 'Content-Type': 'application/json' });
      return r.end(JSON.stringify(lire(p)));
    }
    if (q.method === 'GET') {
      r.writeHead(200, { 'Content-Type': 'text/event-stream' });
      r.write('event: put\ndata: ' + JSON.stringify({ path: '/', data: lire(p) }) + '\n\n');
      const a = { p, r }; abonnes.push(a);
      q.on('close', () => abonnes.splice(abonnes.indexOf(a), 1));
      return;
    }
    let corps = '';
    q.on('data', (d) => (corps += d));
    q.on('end', () => {
      const v = q.method === 'DELETE' ? null : JSON.parse(corps);
      if (q.method === 'PATCH') {
        for (const [k, x] of Object.entries(v)) ecrire(p.concat(k.split('/').filter(Boolean)), x);
        for (const s of abonnes) {
          if (p.join('/').startsWith(s.p.join('/'))) {
            s.r.write('event: patch\ndata: ' + JSON.stringify({ path: '/' + p.slice(s.p.length).join('/'), data: v }) + '\n\n');
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
    });
  });
  serveur.couperFlux = () => { for (const a of abonnes.splice(0)) a.r.destroy(); };
  serveur.lire = (chemin) => lire(chemin.split('/').filter(Boolean));
  return new Promise((ok) => serveur.listen(port, () => ok(serveur)));
};
