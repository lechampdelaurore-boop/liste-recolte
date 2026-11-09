// Test des miniatures d'espèces (9/11, demande de François) : le dessin de l'espèce (fichier especes/plants.svg,
// dessins d'Ouvre ta ferme) devant le nom de chaque produit, partout où un produit apparaît : Récolte, Préparation,
// Semaine (Répartir sur téléphone et grille d'ordinateur, Cumul, À récolter, Stock), « Ajouter un produit », et la
// page du magasin. Correspondance produit → espèce vérifiée pour tout le référentiel. Données factices (faux Firebase).
// Lancement depuis la racine du dépôt : node tests/miniatures.cjs   (CAPTURES=dossier pour garder les captures)
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');
const fauxFirebase = require('./faux-firebase.cjs');

const RACINE = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const PORT_SITE = 8830, PORT_BASE = 8831;
const BASE = `http://localhost:${PORT_BASE}`;
const CLE = 'cle-de-test';
const MDP_F = 'mot-de-passe-francois', MDP_M = 'mot-de-passe-magasin';
const CAPTURES = process.env.CAPTURES || '';

function serveurSite() {
  return new Promise((ok) => {
    const s = http.createServer((q, r) => {
      let f = decodeURIComponent(new URL(q.url, 'http://x').pathname);
      if (f.endsWith('/')) f += 'index.html';
      if (f === '/magasin') f = '/magasin.html'; // comme Cloudflare Pages
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
const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const lundi = (decal) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7 + 7 * decal); return d; };
const plus = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); };

// Correspondance attendue pour chaque produit du référentiel (vide : pas de dessin).
const ATTENDU = {
  'Ail sec': 'ail', 'Aillet': 'ail', 'Aromatiques': 'persil', 'Aubergine Violette': 'aubergine',
  'Bette': 'blette', 'Bette mini (pied)': 'blette', 'Bette multicolore (bouquet)': 'blette',
  'Betterave Rouge': 'betterave', 'Betterave Rouge (botte)': 'betterave', 'Betterave Rouge cuite sous vide': 'betterave',
  'Carotte (botte)': 'carotte', 'Carotte lavée': 'carotte', 'Céleri-branche': 'celeri-branche', 'Céleri-rave': 'celeri-rave',
  'Chou brocoli': 'chou-brocoli', 'Chou chinois': 'chou-pe-tsai', 'Chou fleur': 'chou-fleur', 'Chou Frisé': 'chou-de-milan',
  'Chou Kale': 'chou-kale', 'Chou Pointu': 'chou-pointu', 'Chou romanesco': 'chou-romanesco', 'Chou Rouge': 'chou-rouge',
  'Chou Vert': 'chou-blanc', 'Chou-rave vert (Colrave)': 'chou-rave', 'Chou-rave violet (Colrave)': 'chou-rave',
  'Concombre Court Epineux': 'concombre', 'Concombre Long Lisse': 'concombre', 'Courge Butternut': 'courge-butternut',
  'Courge Potimarron': 'courge-potimarron', 'Courgette Verte cal 14/25': 'courgette', 'Courgette Verte cal 30/40': 'courgette',
  'Endive': 'endive', 'Epinard (feuille)': 'epinard', 'Fenouil': 'fenouil', 'Fève': 'feve', 'Haricot Vert': 'haricot',
  'Mâche': 'mache', 'Melon Charentais': 'melon', 'Mesclun': 'mesclun', 'Navet violet': 'navet', 'Navet (botte)': 'navet',
  'Oignon Blanc (botte)': 'oignon', 'Oignon Blanc Cebette (botte)': 'oignon', 'Oignon blanc demi-sec': 'oignon',
  'Panais': 'panais', 'Pastèque': 'pasteque', 'Patate douce': 'patate-douce', 'Persil frisé': 'persil',
  'Persil frisé (bouquet)': 'persil', 'Persil plat': 'persil', 'Petit-Pois': 'pois', 'Pois Mange-Tout': 'pois',
  'Poireau': 'poireau', 'Rabiole': 'navet', 'Radis long rose': 'radis-rave', "Radis d'hiver en mélange": 'radis-rave-rouge',
  'Radis noir rond': 'radis-rave', 'Rhubarbe': 'rhubarbe', 'Roquette': 'roquette-cultivee', 'Rutabaga': 'rutabaga',
  'Salade Batavia Carmen (170g+)': 'laitue', 'Salade Batavia Carmen (marbrée verte et rouge)': 'laitue',
  'Salade Batavia Verte': 'laitue', 'Salade Batavia Verte (170g+)': 'laitue', 'Salade Feuille de Chêne Rouge': 'laitue',
  'Salade Feuille de Chêne Rouge (170+)': 'laitue', 'Salade Feuille de Chêne Verte': 'laitue',
  'Salade Feuille de Chêne Verte (170g+)': 'laitue', 'Salade Laitue': 'laitue', 'Salade Laitue (170g+)': 'laitue',
  'Salade Laitue Romaine': 'laitue', 'Salade Laitue Rouge': 'laitue', 'Salade Laitue Rouge (170g+)': 'laitue',
  'Thym': 'thym', 'Tomate Ancienne Population Mélange': 'tomate', 'Tomate Cerise': 'tomate-cerise', 'Tomate Ronde Rouge': 'tomate',
};

// Les miniatures d'une zone : [{nom (texte de l'élément), espece (dessin demandé), dessine (le dessin a une taille)}].
const lireMinis = (p, sel) => p.$$eval(sel, (els) => els.map((e) => {
  const u = e.querySelector('svg.mini use'), b = u ? u.getBBox() : null;
  return { nom: e.textContent.trim(), espece: u ? u.getAttribute('href').replace(/^especes\/(plants|modifies)\.svg#/, '') : '', dessine: !!(b && b.width > 20 && b.height > 20) };
}));
// Le fichier des dessins se charge à part : on attend (5 s au plus) que chaque dessin demandé soit tracé avant de mesurer.
const minis = async (p, sel) => {
  const fin = Date.now() + 5000;
  for (;;) {
    const l = await lireMinis(p, sel);
    if (l.every((x) => !x.espece || x.dessine) || Date.now() > fin) return l;
    await p.waitForTimeout(150);
  }
};
const resume = (l) => l.map((x) => x.nom.split('\n')[0].slice(0, 30) + '→' + (x.espece || '∅')).join(', ');

(async () => {
  // 0. Le code, le fichier des dessins et la correspondance
  const html = fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8'), mag = fs.readFileSync(path.join(RACINE, 'magasin.html'), 'utf8');
  const bloc = (t) => { const a = t.indexOf('// Miniatures des espèces'); return t.slice(a, t.indexOf('\n}\n', t.indexOf('function miniHtml', a)) + 3); };
  verifie(bloc(html).length > 500 && bloc(html) === bloc(mag), 'le code des miniatures est le même dans index.html et magasin.html');
  const pidDe = html.match(/function pidDe\(nom\)\{.*\}/)[0];
  const { especeDe } = new Function(pidDe + bloc(html) + ';return { especeDe };')();
  const svg = fs.readFileSync(path.join(RACINE, 'especes/plants.svg'), 'utf8');
  const symboles = [...svg.matchAll(/<symbol\b[^>]*\bid="([^"]+)"/g)].map((m) => m[1]);
  verifie(symboles.length === 183 && /<symbol id="carotte" viewBox="0 0 100 100">/.test(svg), 'especes/plants.svg : les 183 dessins d\'Ouvre ta ferme (obtenu ' + symboles.length + ')');
  const ESPECES = bloc(html).match(/var ESPECES = '([^']+)'/)[1].split(' ');
  verifie(ESPECES.join() === symboles.join(), 'la liste des espèces du code est exactement celle du fichier des dessins');
  const REF = JSON.parse(fs.readFileSync(path.join(RACINE, 'referentiel/conditionnements.json'), 'utf8'));
  const ecarts = REF.produits.filter((p) => especeDe(p.produit) !== ATTENDU[p.produit]).map((p) => p.produit + ' : ' + (especeDe(p.produit) || '∅') + ' au lieu de ' + (ATTENDU[p.produit] || '∅'));
  verifie(ecarts.length === 0 && Object.keys(ATTENDU).length === REF.produits.length, 'les ' + REF.produits.length + ' produits du référentiel ont l\'espèce attendue' + (ecarts.length ? ' : ' + ecarts.join(' ; ') : ''));
  const sans = REF.produits.filter((p) => !especeDe(p.produit)).map((p) => p.produit);
  verifie(sans.length === 0 && especeDe('Aromatiques') === especeDe('Persil plat'), 'tous les produits du référentiel ont un dessin ; « Aromatiques » a celui du persil plat (demande de François)' + (sans.length ? ' (sans dessin : ' + sans.join(', ') + ')' : ''));
  verifie(especeDe('Radis botte') === 'radis-botte' && especeDe('Pomme de terre Charlotte') === 'pomme-de-terre' && especeDe('Tomate cœur de bœuf') === 'tomate' && especeDe('Courge') === 'courge' && especeDe('Chou') === '' && especeDe('Poivron rouge') === 'poivron' && especeDe('') === '', 'autres fermes : « Radis botte », « Pomme de terre Charlotte », « Poivron rouge » trouvent leur espèce ; « Chou » seul n\'en a pas');
  const sw = fs.readFileSync(path.join(RACINE, 'sw.js'), 'utf8');
  verifie(sw.includes("'./especes/plants.svg'") && sw.includes("'./especes/modifies.svg'"), 'les fichiers des dessins sont gardés pour le mode hors ligne (sw.js)');
  const modif = fs.readFileSync(path.join(RACINE, 'especes/modifies.svg'), 'utf8');
  const rouge = (modif.match(/<symbol id="radis-rave-rouge"[\s\S]*?<\/symbol>/) || [''])[0], noir = (svg.match(/<symbol id="radis-rave"[\s\S]*?<\/symbol>/) || [''])[0];
  const formes = (s) => s.replace(/<symbol[^>]*>/, '').replace(/#[0-9A-Fa-f]{6}/g, '');
  verifie(rouge && formes(rouge) === formes(noir) && !rouge.includes('#221F38') && rouge.includes('#C8304F'), 'radis rouge-rose (especes/modifies.svg) : exactement la forme du radis-rave d\'Ouvre ta ferme, seules les couleurs changent (noir → rouge-rose)');
  verifie(especeDe("Radis d'hiver en mélange") === 'radis-rave-rouge' && especeDe('Radis noir rond') === 'radis-rave', '« Radis d\'hiver en mélange » prend le radis rouge-rose, « Radis noir rond » garde le radis noir');

  // Données : une semaine avec six produits, dont un sans dessin, et le mercredi en jour de récolte.
  const site = await serveurSite();
  const base = await fauxFirebase(PORT_BASE, { comptes: { cle: CLE } });
  const uidF = base.creerCompte('francois@ferme.invalid', MDP_F), uidM = base.creerCompte('tresallier@ferme.invalid', MDP_M);
  base.profil(uidF, 'ferme'); base.profil(uidM, 'magasin:ta');
  const W = iso(lundi(1)), MER = plus(W, 2), A0 = 1793730000000;
  const fiche = (nom) => { const r = REF.produits.find((p) => p.produit === nom); const f = { nom }; ['caisse', 'unite', 'kg', 'par_colis', 'type'].forEach((k) => { if (r[k] !== undefined) f[k] = r[k]; }); return f; };
  const NOMS = { bette: 'Bette', 'carotte-lavee': 'Carotte lavée', aromatiques: 'Aromatiques', 'salade-batavia-verte': 'Salade Batavia Verte', 'chou-vert': 'Chou Vert', 'tomate-cerise': 'Tomate Cerise' };
  const produits = {}; Object.entries(NOMS).forEach(([k, n]) => (produits[k] = fiche(n)));
  const c = (n) => ({ n, u: 'colis', by: 'François', at: A0 });
  const q = {}; Object.keys(NOMS).forEach((k, i) => (q[k] = { mk: c(1 + i), 'ta-jeu': c(1) }));
  const jeton = async (email, mdp) => (await fetch(`${BASE}/v1/accounts:signInWithPassword?key=${CLE}`, { method: 'POST', body: JSON.stringify({ email, password: mdp }) }).then((x) => x.json())).idToken;
  const jF = await jeton('francois@ferme.invalid', MDP_F);
  const deb0 = JSON.parse(fs.readFileSync(path.join(RACINE, 'referentiel/debouches.json'), 'utf8'));
  await fetch(`${BASE}/listes/reglages/debouches.json?auth=${jF}`, { method: 'PUT', body: JSON.stringify({ source: deb0.source, debouches: deb0.debouches, recoltes: deb0.recoltes, rec: true, by: 'François', at: A0 }) });
  await fetch(`${BASE}/listes/semaines/${W}.json?auth=${jF}`, { method: 'PUT', body: JSON.stringify({ produits, q, stock: { 'carotte-lavee': { ta: { n: 4, u: 'kg', by: 'François', at: A0 } } }, recoltes: { [MER]: { livraisons: ['mk', 'ta-jeu'], by: 'François', at: A0 } } }) });
  const jM = await jeton('tresallier@ferme.invalid', MDP_M);
  await fetch(`${BASE}/magasins/ta/semaines/${iso(lundi(0))}/poireau.json?auth=${jM}`, { method: 'PUT', body: JSON.stringify({ n: 8, u: 'kg', by: 'Igor', at: A0 }) });
  const avant = JSON.stringify(base.lire('listes'));

  const nav = await chromium.launch();
  const erreurs = [];
  const ouvrir = async (url, opts) => {
    const ctx = await nav.newContext({ ...opts, serviceWorkers: 'block' });
    await ctx.addInitScript((w) => { localStorage.setItem('recolte.qui', JSON.stringify('François')); if (!localStorage.getItem('recolte.ui')) localStorage.setItem('recolte.ui', JSON.stringify({ semaine: w })); }, W);
    const p = await ctx.newPage();
    p.on('pageerror', (e) => erreurs.push(url + ' : ' + e.message));
    p.on('dialog', (d) => d.accept());
    await p.goto(`http://localhost:${PORT_SITE}/${url}`);
    return p;
  };
  const connecter = async (p, id, mdp) => { await p.fill('#authId', id); await p.fill('#authMdp', mdp); await p.click('#authOk'); };
  const capture = async (p, nom) => { if (CAPTURES) await p.screenshot({ path: path.join(CAPTURES, nom + '.png'), fullPage: true }); };
  // Chaque produit de la zone a le dessin de son espèce, bien dessiné (« Aromatiques » : celui du persil).
  const controle = (l, quoi, n) => {
    const faux = l.filter((x) => { const nom = Object.values(NOMS).concat(['Poireau']).find((k) => x.nom.startsWith(k) && !Object.values(NOMS).some((k2) => k2 !== k && k2.startsWith(k) && x.nom.startsWith(k2))); return !nom || x.espece !== (ATTENDU[nom] || '') || (x.espece && !x.dessine); });
    verifie(l.length === n && faux.length === 0, quoi + ' : ' + n + ' produits, chacun avec le dessin de son espèce, « Aromatiques » avec le persil (obtenu ' + resume(l) + (faux.length ? ' ; en défaut : ' + resume(faux) : '') + ')');
  };

  // 1. Téléphone de la ferme
  const T = await ouvrir('', devices['Pixel 7']);
  await connecter(T, 'francois', MDP_F);
  await T.click('[data-view="semaine"]');
  await T.waitForSelector('#semList section.sp[data-pid="bette"]');
  await T.waitForTimeout(600);
  controle(await minis(T, '#semList .sp-nom'), 'Semaine → Répartir (fiches du téléphone)', 6);
  const nomBette = await T.$eval('#semList section.sp[data-pid="bette"] .sp-nom', (e) => e.textContent);
  verifie(nomBette === 'Bette', 'le texte du nom ne change pas (« ' + nomBette + ' »)');
  const taille = await T.$eval('#semList section.sp[data-pid="bette"] .sp-nom svg.mini', (e) => { const r = e.getBoundingClientRect(), t = e.parentNode.getBoundingClientRect(); return { l: r.width, h: r.height, ligne: t.height }; });
  verifie(taille.l >= 20 && taille.l <= 32 && taille.h === taille.l && taille.ligne < 40, 'miniature de ' + Math.round(taille.l) + ' px, carrée, sans agrandir la ligne du nom (' + Math.round(taille.ligne) + ' px)');
  await capture(T, '1-telephone-repartir');
  await T.click('[data-sem="cumul"]');
  await T.waitForSelector('#semTable tbody tr');
  controle(await minis(T, '#semTable tbody tr[data-pid] td:first-child'), 'Semaine → Cumul', 6);
  await T.click('[data-sem="recolter"]');
  // Jours repliés (9/11) : déplier chacun par sa flèche.
  await T.waitForSelector('#semRecList .rc-tete');
  for (let i = 0; i < 9 && (await T.$('#semRecList .rc-tete[aria-expanded="false"]')); i++) await T.click('#semRecList .rc-tete[aria-expanded="false"]');
  await T.waitForSelector('#semRecList li[data-pid]');
  const arec = await minis(T, '#semRecList li[data-pid] > span');
  controle(arec, 'Semaine → À récolter (' + arec.length + ' lignes, une par jour de récolte)', arec.length);
  verifie(arec.length >= 6, 'À récolter : au moins les six produits');
  await T.click('[data-sem="stock"]');
  await T.waitForSelector('#semStkList .stk-bloc');
  const stk = await T.$$eval('#semStkList .stk-bloc', (b) => b.length);
  verifie(stk >= 1, 'page Stock ouverte (' + stk + ' bloc)');
  controle(await minis(T, '#semStkList .stk-bloc:first-of-type .stk-l .sr-nom'), 'Semaine → Stock', 6);
  await capture(T, '2-telephone-stock');
  await T.click('[data-sem="repartir"]');
  await T.click('[data-a="ajouter"]');
  await T.waitForSelector('#addDlg[open]');
  await T.fill('#addQ', '');
  await T.waitForTimeout(200);
  const ajout = await minis(T, '#addList button');
  const proposes = REF.produits.filter((p) => !p.masque && !NOMS[Object.keys(NOMS).find((k) => NOMS[k] === p.produit)]);
  const mauvaisAjout = ajout.filter((x) => { const n = x.nom.split('\n')[0]; const r = REF.produits.find((p) => x.nom.startsWith(p.produit) && !REF.produits.some((p2) => p2 !== p && p2.produit.startsWith(p.produit) && x.nom.startsWith(p2.produit))); return !r || x.espece !== ATTENDU[r.produit] || (x.espece && !x.dessine) || !n; });
  verifie(ajout.length === proposes.length && mauvaisAjout.length === 0, '« Ajouter un produit » : les ' + proposes.length + ' produits proposés ont chacun le dessin de leur espèce (obtenu ' + ajout.length + (mauvaisAjout.length ? ', en défaut : ' + resume(mauvaisAjout) : '') + ')');
  await T.fill('#addQ', 'chou');
  await T.waitForTimeout(200);
  await capture(T, '3-telephone-ajouter');
  await T.click('#addClose');
  await T.click('[data-view="recolte"]');
  await T.waitForSelector('#recJours button');
  await T.click(`#recJours [data-jour="${MER}"]`);
  await T.waitForSelector('#todo li.item');
  controle(await minis(T, '#todo li.item .prod'), 'Récolte du mercredi', 6);
  const barre = await T.$eval('#todo li.item[data-id="bette"] .prod', (e) => e.textContent);
  verifie(barre === 'Bette', 'Récolte : le texte du nom reste « Bette » (glisser-déposer et coches inchangés)');
  await capture(T, '4-telephone-recolte');
  await T.click('[data-view="prep"]');
  await T.waitForSelector('#prepList section.grp');
  await T.click('#prepSort [data-sort="produit"]');
  await T.waitForSelector('#prepList section.grp[data-item]');
  controle(await minis(T, '#prepList section.grp[data-item] .grp-name'), 'Préparation par produit (titre de chaque produit)', 6);
  const lignesProduit = await T.$$eval('#prepList section.grp[data-item] li.pitem .prod svg.mini', (e) => e.length);
  verifie(lignesProduit === 0, 'Préparation par produit : pas de dessin devant le nom des clients');
  await capture(T, '5-telephone-preparation-produit');
  await T.click('#prepSort [data-sort="client"]');
  await T.waitForSelector('#prepList section.grp[data-circ]');
  const parClient = await minis(T, '#prepList section.grp[data-circ="mk"] li.pitem .prod');
  controle(parClient, 'Préparation par client (Marché de Tronget)', 6);
  await capture(T, '6-telephone-preparation-client');

  // 2. Ordinateur : la grille Répartir
  const P = await ouvrir('', { viewport: { width: 1280, height: 900 } });
  await connecter(P, 'francois', MDP_F);
  await P.click('[data-view="semaine"]');
  await P.waitForSelector('#semGrid tbody tr[data-pid="bette"]');
  await P.waitForTimeout(600);
  controle(await minis(P, '#semGrid tbody tr[data-pid] td.g-prod'), 'Ordinateur, grille Répartir', 6);
  const hLigne = await P.$eval('#semGrid tbody tr[data-pid="bette"]', (e) => e.getBoundingClientRect().height);
  verifie(hLigne < 70, 'grille : la ligne garde une hauteur raisonnable (' + Math.round(hLigne) + ' px)');
  await capture(P, '7-ordinateur-grille');

  // 3. La page du magasin
  const M = await ouvrir('magasin', devices['Pixel 7']);
  await connecter(M, 'tresallier', MDP_M);
  await M.waitForSelector('#quiDlg[open]');
  await M.fill('#quiAutre', 'Igor');
  await M.click('#quiForm button[type="submit"]');
  await M.waitForSelector('#actions:not([hidden])');
  await M.waitForSelector('#liste .p[data-pid="poireau"]');
  await M.waitForTimeout(400);
  const magListe = await minis(M, '#liste .p .p-nom');
  verifie(magListe.length === 1 && magListe[0].espece === 'poireau' && magListe[0].dessine, 'magasin : le poireau de la liste a son dessin (obtenu ' + resume(magListe) + ')');
  await M.click('#ajouter');
  await M.waitForSelector('#addDlg[open]');
  const magAjout = await minis(M, '#addList button');
  const magSans = magAjout.filter((x) => !x.espece).map((x) => x.nom.split('\n')[0]);
  verifie(magAjout.length === 75 && magAjout.every((x) => x.espece && x.dessine), 'magasin, « Ajouter un produit » : les 75 produits ont leur dessin (obtenu ' + magAjout.length + (magSans.length ? ', sans dessin : ' + magSans.join(', ') : '') + ')');
  await M.fill('#addQ', 'salade');
  await M.waitForTimeout(200);
  await capture(M, '8-magasin-ajouter');
  await M.click('#addList button[data-pid="salade-batavia-verte"]');
  await M.waitForSelector('#liste .p[data-pid="salade-batavia-verte"]');
  const magBatavia = await minis(M, '#liste .p[data-pid="salade-batavia-verte"] .p-nom');
  verifie(magBatavia[0] && magBatavia[0].espece === 'laitue' && magBatavia[0].dessine, 'magasin : la Batavia ajoutée arrive avec le dessin de la laitue');
  await capture(M, '9-magasin-liste');

  verifie(JSON.stringify(base.lire('listes')) === avant, 'afficher les dessins n\'écrit rien dans les listes de la ferme');
  verifie(erreurs.length === 0, 'aucune erreur JavaScript' + (erreurs.length ? ' : ' + erreurs.join(' | ') : ''));
  await nav.close(); site.close(); base.close();
  console.log(echecs ? `\n${echecs} échec(s)` : '\nTout est bon.');
  process.exit(echecs ? 1 : 0);
})().catch((x) => { console.error(x); process.exit(1); });
