// Faux serveur Firebase Realtime Database (API REST + flux temps réel), pour les tests.
// Gère GET en text/event-stream (événement « put »), PUT et DELETE. Données en mémoire.
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
    r.setHeader('Access-Control-Allow-Methods', 'GET,PUT,DELETE');
    if (q.method === 'OPTIONS') return r.end();
    const p = q.url.replace(/\.json.*$/, '').split('/').filter(Boolean);
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
      ecrire(p, v);
      for (const s of abonnes) {
        if (p.join('/').startsWith(s.p.join('/'))) {
          s.r.write('event: put\ndata: ' + JSON.stringify({ path: '/' + p.slice(s.p.length).join('/'), data: v }) + '\n\n');
        }
      }
      r.end(JSON.stringify(v));
    });
  });
  return new Promise((ok) => serveur.listen(port, () => ok(serveur)));
};
