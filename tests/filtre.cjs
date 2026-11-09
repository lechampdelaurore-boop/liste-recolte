// Test du bouton « Filtre » et de l'impression du tableau de la semaine (demandes de François du 8/11 et du 9/11) :
// en haut des pages « Répartir » et « Cumul », un bouton « Filtre » ouvre un cadre avec une case par jour de récolte
// et une case par débouché, toutes cochées au départ ; décocher un jour ou un débouché masque ses colonnes (et le
// stock d'un débouché masqué, ou dont toutes les livraisons sont masquées), sans changer le reste ni la base ;
// un débouché masqué qui a des quantités est signalé ; bouton « Imprimer » qui imprime le tableau tel que filtré.
// Un téléphone (François) et un ordinateur (Martin) via un faux Firebase.
// Lancement depuis la racine du dépôt : node tests/filtre.cjs
// Captures d'écran et PDF (facultatif) : CAPTURES=dossier node tests/filtre.cjs
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');
const fauxFirebase = require('./faux-firebase.cjs');

const RACINE = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const PORT_SITE = 8816, PORT_BASE = 8817;
const CAPTURES = process.env.CAPTURES || '';
const BASE = `http://localhost:${PORT_BASE}`;

function serveurSite() {
  return new Promise((ok) => {
    const s = http.createServer((q, r) => {
      let f = decodeURIComponent(new URL(q.url, 'http://x').pathname);
      if (f.endsWith('/')) f += 'index.html';
      // Sans clé web : pas de compte (le fichier du dépôt, une fois rempli par François, n'est pas lu par les tests).
      if (f === '/cle-web.js') { r.writeHead(200, { 'Content-Type': 'text/javascript' }); return r.end("window.RECOLTE_CLE_WEB='';"); }
      if (f === '/config.js') { r.writeHead(200, { 'Content-Type': 'text/javascript' }); return r.end(`window.RECOLTE_DB_URL='${BASE}';`); }
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



(async () => {
  const site = await serveurSite();
  const base = await fauxFirebase(PORT_BASE);
  const SEM = iso(lundi(0));
  const A0 = 1793730000000, q = (n, u) => ({ n, u: u || 'colis', by: 'Aurore', at: A0 });
  const bette = { nom: 'Bette', caisse: 'GH', unite: '5 kg', kg: 5 };
  const put = (p, v) => fetch(`${BASE}/${p}.json`, { method: 'PUT', body: JSON.stringify(v) });
  await put('listes/semaines/' + SEM, {
    produits: { bette }, dispo: { bette: q(10) },
    q: { bette: { 'ta-mar': q(2), lm: q(1), lv: q(3), 'ta-jeu': q(1), el: q(1) } },
    stock: { bette: { ta: q(1) } },
  });
  const ecrit = JSON.stringify(base.lire('listes/semaines/' + SEM));

  const nav = await chromium.launch();
  const erreurs = [];
  const ouvrir = async (nom, opts) => {
    const ctx = await nav.newContext({ ...opts, serviceWorkers: 'block' });
    await ctx.addInitScript((n) => { localStorage.setItem('recolte.qui', JSON.stringify(n)); window.__imprime = 0; window.print = () => { window.__imprime++; }; }, nom);
    const p = await ctx.newPage();
    p.on('pageerror', (e) => erreurs.push(nom + ' : ' + e.message));
    p.on('dialog', (d) => d.accept());
    await p.goto(`http://localhost:${PORT_SITE}/`);
    return p;
  };
  const A = await ouvrir('François', devices['Pixel 7']);
  const C = await ouvrir('Martin', { viewport: { width: 1366, height: 768 }, deviceScaleFactor: CAPTURES ? 2 : 1 });
  const capture = async (p, nom) => { if (CAPTURES) await p.screenshot({ path: path.join(CAPTURES, nom + '.png'), fullPage: true }); };
  const attendre = (p, ms) => p.waitForTimeout(ms || 500);
  const cases = (p) => p.$$eval('#semFiltre input[data-a="filtre"]', (e) => e.map((x) => x.dataset.j + (x.checked ? '+' : '-')));
  const casesD = (p) => p.$$eval('#semFiltre input[data-a="filtre-d"]', (e) => e.map((x) => x.dataset.d + (x.checked ? '+' : '-')));
  const ouvrirFiltre = async (p) => { if ((await p.getAttribute('#semFiltre .sf-btn', 'aria-expanded')) !== 'true') await p.click('#semFiltre .sf-btn'); };
  const bouton = (p) => p.textContent('#semFiltre .sf-btn');
  const titres = (p, t) => p.$$eval(t + ' thead th', (e) => e.map((x) => x.firstChild ? x.firstChild.textContent.trim() : ''));
  const lignes = (p) => p.$$eval('#semView section.sp[data-pid="bette"] .sr[data-k]', (e) => e.map((x) => x.dataset.k));
  const reste = (p) => p.$eval('#semView section.sp[data-pid="bette"] .sp-head .reste', (e) => e.textContent);

  // 1. Téléphone : le bouton « Filtre », fermé, puis ouvert avec tout coché
  await A.click('[data-view="semaine"]');
  await A.waitForSelector('#semView section.sp');
  verifie(await A.isVisible('#semFiltre .sf-btn') && await A.isVisible('#semFiltre [data-a="imprimer"]'), 'page Répartir : un bouton « Filtre » et un bouton « Imprimer » en haut');
  verifie((await bouton(A)).includes('tout affiché') && (await cases(A)).length === 0, 'au départ le cadre est fermé et le bouton dit « tout affiché » (' + (await bouton(A)).trim() + ')');
  const hb = await A.$eval('#semFiltre .sf-btn', (e) => e.getBoundingClientRect().height);
  verifie(hb >= 48, 'bouton assez grand pour le doigt (' + Math.round(hb) + ' px)');
  await ouvrirFiltre(A);
  verifie((await A.getAttribute('#semFiltre .sf-btn', 'aria-expanded')) === 'true' && await A.isVisible('#sfPanneau'), 'un appui ouvre le cadre du filtre');
  verifie((await cases(A)).join() === 'lundi+,mercredi+,sans+', 'groupe « Jours de récolte » : lundi, mercredi et « Sans jour de récolte » (Élie), tous cochés (obtenu ' + (await cases(A)).join() + ')');
  const txtLun = await A.textContent('#semFiltre label:has(input[data-j="lundi"])');
  verifie(txtLun.includes('Lundi') && txtLun.includes('TA mar') && txtLun.includes('La Magic'), 'la case du lundi dit ce qu\'on y récolte (' + txtLun.trim() + ')');
  verifie((await casesD(A)).join() === 'ta+,lm+,ps+,lv+,av+,mk+,el+', 'groupe « Débouchés » : les 7 débouchés des réglages, dans leur ordre, tous cochés (obtenu ' + (await casesD(A)).join() + ')');
  const txtTa = await A.textContent('#semFiltre label:has(input[data-d="ta"])');
  verifie(txtTa.includes('Très Allier') && txtTa.includes('TA mar') && txtTa.includes('TA jeu') && txtTa.includes('stock'), 'la case Très Allier dit ses deux livraisons et son stock (' + txtTa.trim() + ')');
  const coulLm = await A.$eval('#semFiltre label:has(input[data-d="lm"])', (e) => getComputedStyle(e).color);
  verifie(coulLm === 'rgb(160, 16, 92)', 'la case La Magic est dans la couleur du débouché (' + coulLm + ')');
  const h0 = await A.$eval('#semFiltre label:has(input[data-d="el"])', (e) => e.getBoundingClientRect().height);
  verifie(h0 >= 48, 'case assez grande pour le doigt (' + Math.round(h0) + ' px)');
  await A.click('#semView section.sp[data-pid="bette"] .sp-head');
  const l0 = await lignes(A), r0 = await reste(A);
  verifie(l0.includes('q/ta-mar') && l0.includes('q/lm') && l0.includes('q/lv') && l0.includes('q/ps') && l0.includes('stock/ta'), 'tout coché : toutes les livraisons dans la fiche');

  // 2. Décocher le lundi
  await A.click('#semFiltre input[data-j="lundi"]');
  await attendre(A);
  const l1 = await lignes(A);
  verifie(!l1.includes('q/ta-mar') && !l1.includes('q/lm') && l1.includes('q/lv') && l1.includes('q/ta-jeu') && l1.includes('stock/ta'), 'lundi décoché : Très Allier mardi et La Magic disparaissent, Locavore et Très Allier jeudi (avec son stock) restent');
  verifie((await reste(A)) === r0, 'le reste ne change pas (' + r0 + ')');
  verifie((await A.textContent('#semFiltre .sf-note')).includes('TA mar, La Magic'), 'une note dit quelles colonnes sont masquées');
  verifie((await bouton(A)).includes('2 colonnes masquées') && await A.isVisible('#sfPanneau'), 'le bouton compte les colonnes masquées, le cadre reste ouvert (' + (await bouton(A)).trim() + ')');
  verifie(JSON.stringify(base.lire('listes/semaines/' + SEM)) === ecrit && !base.lire('listes/reglages'), 'rien n\'est écrit dans la base');
  await A.click('#semFiltre input[data-j="lundi"]');
  await attendre(A);

  // 3. Décocher des débouchés : Panier La Magic (a des quantités) et Panier adéquat (vide cette semaine)
  await A.click('#semFiltre input[data-d="lm"]');
  await attendre(A);
  await A.click('#semFiltre input[data-d="ps"]');
  await attendre(A);
  const l2 = await lignes(A);
  verifie(!l2.includes('q/lm') && !l2.includes('q/ps') && l2.includes('q/ta-mar') && l2.includes('q/lv') && l2.includes('q/el'), 'La Magic et Panier adéquat décochés : leurs lignes disparaissent, les autres restent');
  verifie((await reste(A)) === r0, 'le reste ne change pas (' + r0 + ')');
  const oubli = await A.textContent('#semFiltre .sf-oubli').catch(() => '');
  verifie(oubli.includes('Panier La Magic') && !oubli.includes('Panier adéquat'), 'avertissement : La Magic est masqué mais a des quantités ; rien pour Panier adéquat, vide (' + oubli.trim() + ')');
  await capture(A, '1-telephone-filtre-debouches');
  await A.click('#semFiltre input[data-d="ta"]');
  await attendre(A);
  const l3 = await lignes(A);
  verifie(!l3.includes('q/ta-mar') && !l3.includes('q/ta-jeu') && !l3.includes('stock/ta'), 'Très Allier décoché : ses deux livraisons et son stock disparaissent');
  verifie(JSON.stringify(base.lire('listes/semaines/' + SEM)) === ecrit && !base.lire('listes/reglages'), 'rien n\'est écrit dans la base');
  await A.click('#semFiltre input[data-d="ta"]');
  await attendre(A);
  await A.click('[data-sem="cumul"]');
  await attendre(A);
  const t1 = await titres(A, '#semTable');
  verifie(await A.isVisible('#semFiltre .sf-btn') && !t1.includes('La Magic') && !t1.includes('Panier adéq.') && t1.includes('Locavore') && t1.includes('TA mar'), 'page Cumul : même filtre, mêmes colonnes masquées (obtenu ' + t1.join('|') + ')');
  await A.click('[data-sem="recolter"]');
  verifie(!(await A.isVisible('#semFiltre')), 'page À récolter : pas de filtre');
  await A.click('[data-sem="repartir"]');

  // 4. L'ordinateur a son propre choix ; jours et débouchés se combinent
  await C.click('[data-view="semaine"]');
  await C.waitForSelector('#semGrid tbody tr');
  const g0 = await titres(C, '#semGrid');
  verifie(g0.includes('Très Allier') && g0.includes('Panier La Magic') && g0.includes('Élie') && (await bouton(C)).includes('tout affiché'), 'sur l\'ordinateur, le choix du téléphone ne s\'applique pas : tout est affiché');
  await ouvrirFiltre(C);
  await C.click('#semFiltre input[data-j="lundi"]');
  await attendre(C);
  const g1 = await C.$$eval('#semGrid thead th', (e) => e.map((x) => x.textContent));
  verifie(!g1.some((x) => x.includes('Panier La Magic')) && g1.filter((x) => x.startsWith('Très Allier')).length === 1 && g1.some((x) => x.startsWith('Stock Très Allier')), 'grille, lundi décoché : La Magic et Très Allier mardi masqués, Très Allier jeudi et son stock restent');
  await C.click('#semFiltre input[data-j="mercredi"]');
  await attendre(C);
  const g2 = await C.$$eval('#semGrid thead th', (e) => e.map((x) => x.textContent));
  verifie(!g2.some((x) => x.startsWith('Stock Très Allier')) && !g2.some((x) => x.startsWith('Locavore')) && g2.some((x) => x.startsWith('Élie')), 'lundi et mercredi décochés : le stock Très Allier part aussi, Élie (sans jour) reste');
  verifie((await C.inputValue('#semGrid input[data-k="q/el"]')) === '1' && (await C.inputValue('#semGrid input[data-k="dispo"]')) === '10', 'les cases restantes gardent leurs chiffres');
  await C.click('#semFiltre input[data-j="mercredi"]');
  await attendre(C);
  await C.click('#semFiltre input[data-d="el"]');
  await attendre(C);
  const g3 = await C.$$eval('#semGrid thead th', (e) => e.map((x) => x.textContent));
  verifie(!g3.some((x) => x.startsWith('Élie')) && g3.some((x) => x.startsWith('Locavore')) && (await C.inputValue('#semGrid input[data-k="dispo"]')) === '10', 'lundi et Élie décochés : Élie masqué aussi, Locavore et le disponible restent');
  await capture(C, '2-grille-lundi-elie-decoches');

  // 5. Impression (ordinateur, lundi et Élie décochés)
  await C.click('#semFiltre [data-a="imprimer"]');
  await attendre(C, 300);
  verifie((await C.evaluate(() => window.__imprime)) === 1, 'le bouton « Imprimer » ouvre l\'impression');
  const p1 = await titres(C, '#semPrint table');
  verifie(!p1.includes('TA mar') && !p1.includes('La Magic') && !p1.includes('Élie') && p1.includes('Locavore') && p1.includes('Stock Très Allier') && p1[0] === 'Produit', 'la feuille imprimée suit le filtre (obtenu ' + p1.join('|') + ')');
  const ent = await C.textContent('#semPrint');
  verifie(ent.includes('Répartition · semaine du') && ent.includes('Récoltes : mercredi') && !ent.includes('Récoltes : lundi') && ent.includes('Débouchés masqués : Élie'), 'la feuille dit la semaine, les récoltes imprimées et les débouchés masqués');
  await C.emulateMedia({ media: 'print' });
  verifie(!(await C.isVisible('main.wrap')) && !(await C.isVisible('#tabs')) && (await C.isVisible('#semPrint table')), 'à l\'impression, seul le tableau sort (ni onglets ni boutons)');
  const coulLv = await C.$$eval('#semPrint thead th', (e) => { const x = e.filter((y) => y.textContent === 'Locavore')[0]; return x && getComputedStyle(x).color; });
  verifie(coulLv === 'rgb(10, 90, 28)', 'à l\'impression, la colonne Locavore garde sa couleur (' + coulLv + ')');
  if (CAPTURES) await C.pdf({ path: path.join(CAPTURES, '3-impression.pdf'), preferCSSPageSize: true, printBackground: true });
  const pdf = await C.pdf({ preferCSSPageSize: true, printBackground: true });
  verifie(pdf.length > 1000, 'la feuille se transforme en PDF (paysage A4)');
  await C.emulateMedia({ media: 'screen' });

  // 6. « Tout afficher » remet tout
  await C.click('#semFiltre [data-a="filtre-tout"]');
  await attendre(C);
  verifie((await cases(C)).join() === 'lundi+,mercredi+,sans+' && (await casesD(C)).every((x) => x.endsWith('+')) && (await bouton(C)).includes('tout affiché') && !(await C.$('#semFiltre .sf-note')), '« Tout afficher » recoche tous les jours et tous les débouchés');
  await C.click('#semFiltre [data-a="filtre-ouvrir"]:not(.sf-btn)');
  await attendre(C);
  verifie(!(await C.isVisible('#sfPanneau')) && (await C.getAttribute('#semFiltre .sf-btn', 'aria-expanded')) === 'false', '« Fermer » referme le cadre');

  // 7. Rechargement : le choix reste sur l'appareil ; cadre refermé mais la note reste
  await A.reload();
  await A.click('[data-view="semaine"]').catch(() => {});
  await A.waitForSelector('#semFiltre .sf-btn');
  verifie(!(await A.isVisible('#sfPanneau')) && (await bouton(A)).includes('2 colonnes masquées') && (await A.textContent('#semFiltre .sf-note')).includes('La Magic, Panier adéq.'), 'après rechargement : cadre fermé, mais le bouton et la note disent ce qui est masqué');
  await ouvrirFiltre(A);
  verifie((await casesD(A)).join() === 'ta+,lm-,ps-,lv+,av+,mk+,el+', 'après rechargement, La Magic et Panier adéquat restent décochés sur le téléphone');
  await A.click('#semFiltre [data-a="filtre-tout"]');
  await attendre(A);
  verifie((await casesD(A)).every((x) => x.endsWith('+')) && !(await A.$('#semFiltre .sf-note')), 'tout recoché : tout revient, la note part');
  verifie(JSON.stringify(base.lire('listes/semaines/' + SEM)) === ecrit && !base.lire('listes/reglages'), 'la semaine dans la base est inchangée du début à la fin');

  // 8. Une autre ferme : ses propres débouchés, sans jours de récolte réglés
  await put('listes/reglages/debouches', { debouches: [
    { id: 'amap', nom: 'AMAP du village', colis: '', livraisons: [{ id: 'amap', jours: ['jeudi'], court: 'AMAP' }] },
    { id: 'vd', nom: 'Vente à la ferme', colis: '', livraisons: [{ id: 'vd-mer', jours: ['mercredi'], court: 'Ferme mer' }, { id: 'vd-sam', jours: ['samedi'], court: 'Ferme sam' }] },
  ], recoltes: [] });
  const D = await ouvrir('Camille', devices['Pixel 7']);
  await D.click('[data-view="semaine"]');
  await D.waitForSelector('#semFiltre .sf-btn');
  await ouvrirFiltre(D);
  verifie((await cases(D)).length === 0 && !(await D.isVisible('#semFiltre [aria-label="Jours de récolte affichés"]')), 'autre ferme sans jours de récolte : pas de groupe « Jours de récolte » inutile');
  verifie((await casesD(D)).join() === 'amap+,vd+,ta+', 'autre ferme : ses deux débouchés, puis le stock Très Allier resté dans la semaine (il a encore sa colonne) (obtenu ' + (await casesD(D)).join() + ')');
  await D.click('#semView section.sp[data-pid="bette"] .sp-head');
  await D.click('#semFiltre input[data-d="vd"]');
  await attendre(D);
  const l4 = await lignes(D);
  verifie(l4.includes('q/amap') && !l4.includes('q/vd-mer') && !l4.includes('q/vd-sam'), 'autre ferme : décocher « Vente à la ferme » masque ses deux livraisons (obtenu ' + l4.join('|') + ')');
  await capture(D, '4-autre-ferme');

  verifie(erreurs.length === 0, 'aucune erreur JavaScript' + (erreurs.length ? ' : ' + erreurs.join(' | ') : ''));
  await nav.close(); site.close(); base.close();
  process.exit(echecs ? 1 : 0);
})();
