// Test de l'annulation d'une récolte (étape 38, demande de François du 18/11/2026) : bouton « ⋯ » sur chaque ligne de
// l'onglet Récolte, confirmation, pas de motif ; la ligne annulée reste visible, grise et barrée, « Annulée par … à … » ;
// dans Préparation, ses lignes sont barrées « Récolte annulée », sans case, hors du compte « Préparé » ; « Rétablir » défait.
// Donnée à part : listes/<jour>/annule/<produit> {by, at}. Les quantités de la semaine et la coche de récolte ne sont
// jamais effacées. Un deuxième téléphone voit l'annulation. Données factices (faux Firebase).
// Lancement depuis la racine du dépôt : node tests/annuler.cjs   (CAPTURES=<dossier> pour les captures d'écran)
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');
const fauxFirebase = require('./faux-firebase.cjs');

const RACINE = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const PORT_SITE = 8880, PORT_BASE = 8881;
const BASE = `http://localhost:${PORT_BASE}`;
const CAPTURES = process.env.CAPTURES || '';

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
const plus = (id, n) => { const p = id.split('-'); const d = new Date(+p[0], p[1] - 1, +p[2]); d.setDate(d.getDate() + n); return iso(d); };
const attendreQue = async (fn, ms = 8000) => { const fin = Date.now() + ms; while (Date.now() < fin) { if (await fn()) return true; await new Promise((x) => setTimeout(x, 150)); } return false; };
const net = (t) => String(t || '').replace(/\s+/g, ' ').trim();

(async () => {
  const site = await serveurSite();
  const base = await fauxFirebase(PORT_BASE);
  const W = iso(lundi(1)), MER = plus(W, 2);
  const A0 = 1793730000000, q = (n, u) => ({ n, u: u || 'colis', by: 'Aurore', at: A0 });
  const put = (p, v) => fetch(`${BASE}/${p}.json`, { method: 'PUT', body: JSON.stringify(v) });
  // Mercredi : bette 1 GH marché + 1 GH Très Allier jeudi ; ail sec 1 PH marché ; poireau 2 GH marché.
  await put('listes/semaines/' + W, {
    produits: {
      bette: { nom: 'Bette', caisse: 'GH', unite: '5 kg', kg: 5, by: 'Aurore', at: A0 },
      'ail-sec': { nom: 'Ail sec', caisse: 'PH', unite: '5 kg', kg: 5, by: 'Aurore', at: A0 },
      poireau: { nom: 'Poireau', caisse: 'GH', unite: '10 kg', kg: 10, by: 'Aurore', at: A0 },
    },
    q: { bette: { mk: q(1), 'ta-jeu': q(1) }, 'ail-sec': { mk: q(1) }, poireau: { mk: q(2) } },
  });
  const pq = () => { const w = base.lire('listes/semaines/' + W) || {}; return JSON.stringify({ produits: w.produits, q: w.q }); };
  const avant = pq();

  const nav = await chromium.launch();
  const erreurs = [];
  const appareil = async (opts, qui) => {
    const ctx = await nav.newContext({ ...opts, serviceWorkers: 'block' });
    await ctx.addInitScript((a) => {
      localStorage.setItem('recolte.qui', JSON.stringify(a.qui));
      if (!localStorage.getItem('recolte.ui')) localStorage.setItem('recolte.ui', JSON.stringify({ semaineLe: ((d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'))(new Date()), semaine: a.w }));
    }, { w: W, qui });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => erreurs.push(e.message));
    await p.goto(`http://localhost:${PORT_SITE}/`);
    await p.waitForSelector('#recJours button');
    await p.click(`#recJours [data-jour="${MER}"]`);
    await p.waitForSelector('li.item[data-id="bette"]');
    return p;
  };
  const cap = async (p, nom, sel) => { if (CAPTURES) await (sel ? (await p.$(sel)).screenshot({ path: path.join(CAPTURES, nom + '.png') }) : p.screenshot({ path: path.join(CAPTURES, nom + '.png'), fullPage: true })); };
  const ids = (p, sel) => p.$$eval(sel, (e) => e.map((x) => x.dataset.id));
  const annBase = (id) => base.lire(`listes/${MER}/annule/${id}`);

  // ---------- Téléphone ----------
  const T = await appareil(devices['Pixel 7'], 'Martin');
  const T2 = await appareil(devices['Pixel 7'], 'Aurore');   // deuxième téléphone, ouvert sur le même jour
  // 1. Chaque ligne à récolter a son bouton « ⋯ »
  const nMenus = await T.$$eval('#todo li.item', (e) => e.filter((x) => x.querySelector('button.menu')).length);
  verifie(nMenus === 3, 'téléphone : un bouton « ⋯ » sur chacune des 3 lignes (obtenu ' + nMenus + ')');
  verifie(await T.$eval('#annSec', (x) => x.hidden), 'téléphone : pas de cadre « Récoltes annulées » tant qu\'il n\'y en a pas');
  // 2. « ⋯ » → « Annuler cette récolte » → confirmation → « Non, garder » : rien n'est écrit
  await T.click('li.item[data-id="bette"] .menu');
  await T.waitForSelector('#annDlg[open]');
  verifie(net(await T.textContent('#annTitre')) === 'Bette' && net(await T.textContent('#annOui')) === 'Annuler cette récolte', 'téléphone : la fenêtre nomme le produit et propose « Annuler cette récolte »');
  verifie(!(await T.$('#annDlg input, #annDlg textarea')), 'téléphone : aucun champ de motif');
  await T.click('#annOui');
  verifie(net(await T.textContent('#annOui')) === 'Oui, annuler la récolte' && net(await T.textContent('#annNon')) === 'Non, garder', 'téléphone : une confirmation est demandée (« Oui, annuler la récolte » / « Non, garder »)');
  await cap(T, '2-telephone-confirmation');
  await T.click('#annNon');
  await T.waitForTimeout(300);
  verifie(!(await T.$('#annDlg[open]')) && annBase('bette') === null && (await ids(T, '#todo li.item')).includes('bette'), 'téléphone : « Non, garder » ne change rien');
  // 3. Annulation confirmée
  await T.click('li.item[data-id="bette"] .menu');
  await T.click('#annOui'); await T.click('#annOui');
  verifie(await attendreQue(() => annBase('bette') !== null), 'base : listes/' + MER + '/annule/bette écrit');
  const a = annBase('bette') || {};
  verifie(a.by === 'Martin' && typeof a.at === 'number' && Object.keys(a).sort().join() === 'at,by', 'base : annule/bette = {by: « Martin », at} seulement (obtenu ' + JSON.stringify(a) + ')');
  verifie(base.lire(`listes/${MER}/done/bette`) === null, 'base : aucune coche de récolte écrite pour la bette');
  verifie(!(await ids(T, '#todo li.item')).includes('bette') && (await ids(T, '#annList li.item')).join() === 'bette', 'téléphone : la bette quitte « à récolter » et passe dans « Récoltes annulées »');
  const ligne = 'li.item.annule[data-id="bette"]';
  const by = net(await T.textContent(ligne + ' .by'));
  verifie(/^Annulée par Martin à \d\d:\d\d$/.test(by), 'téléphone : « ' + by + ' » sur la ligne');
  const st = await T.$eval(ligne, (x) => ({ fond: getComputedStyle(x).backgroundColor, barre: getComputedStyle(x.querySelector('.prod')).textDecorationLine, box: !!x.querySelector('button.box'), qte: x.querySelector('.qty').textContent }));
  verifie(st.fond === 'rgb(230, 230, 230)' && st.barre.includes('line-through') && !st.box, 'téléphone : ligne grise, nom barré, sans case à cocher (' + JSON.stringify(st) + ')');
  verifie(net(st.qte).startsWith('2 colis'), 'téléphone : la quantité reste affichée (« ' + net(st.qte) + ' »)');
  verifie(net(await T.textContent('#annSec h3')) === 'Récoltes annulées (1)', 'téléphone : titre « Récoltes annulées (1) »');
  // Caisses et barre : la bette n'est plus à emporter
  if (!(await T.$eval('#crates', (d) => d.open))) await T.click('#crates summary');
  await T.waitForTimeout(200);
  const sum = net(await T.textContent('#crateSum'));
  verifie(sum === '· 3 à remplir', 'téléphone : caisses à remplir 3 (ail 1 PH + poireau 2 GH, sans les 2 GH de bette) (obtenu « ' + sum + ' »)');
  const note = net(await T.textContent('#progNote'));
  verifie(note.includes('Non compté (récolte annulée) : Bette.'), 'téléphone : barre de progression sans la bette, dite dans la note');
  await T.click('#crates summary');
  await cap(T, '1-telephone-recolte');
  // 4. Le deuxième téléphone voit l'annulation
  verifie(await attendreQue(async () => (await ids(T2, '#annList li.item')).join() === 'bette'), 'deuxième téléphone : la bette apparaît annulée');
  // 5. Préparation, par client
  await T.click('[data-view="prep"]');
  await T.click('#prepSort [data-sort="client"]');
  await T.waitForSelector('#prepList li.pitem');
  const lp = await T.$$eval('li.pitem.annule', (e) => e.map((x) => ({ k: x.dataset.k, badge: (x.querySelector('.rec') || {}).textContent, box: !!x.querySelector('button.box'), barre: getComputedStyle(x.querySelector('.prod')).textDecorationLine })));
  verifie(lp.length === 2 && lp.every((x) => x.k.endsWith('/bette') && x.badge === 'Récolte annulée' && !x.box && x.barre.includes('line-through')), 'Préparation par client : 2 lignes de bette barrées, « Récolte annulée », sans case (' + JSON.stringify(lp) + ')');
  const rouge = await T.$eval('li.pitem.annule .rec', (x) => getComputedStyle(x).backgroundColor);
  verifie(rouge === 'rgb(176, 0, 0)', 'Préparation : l\'étiquette « Récolte annulée » est rouge (' + rouge + ')');
  const mk = net(await T.textContent('.grp[data-circ="mk"] .grp-sum'));
  verifie(mk === 'Préparé : 0 sur 2 · 1 récolte annulée', 'Préparation : marché « ' + mk + ' » (la bette hors du compte)');
  const dernier = await T.$eval('.grp[data-circ="mk"] li.pitem:last-child', (x) => x.dataset.k);
  verifie(dernier === 'mk/bette', 'Préparation : la ligne annulée est en bas de son client');
  const ps = net(await T.textContent('#prepSum'));
  verifie(ps.startsWith('0 ligne préparée sur 2 (2 annulées, pas comptées)'), 'Préparation : « ' + ps + ' »');
  await T.click('.grp[data-circ="mk"] li.pitem.annule');
  await T.waitForTimeout(300);
  verifie(base.lire(`listes/${MER}/prep/mk/bette`) === null, 'Préparation : toucher une ligne annulée ne coche rien');
  // Très Allier n'a que la bette : la commande peut être déclarée prête
  const ta = net(await T.textContent('.grp[data-circ="ta"] .grp-sum'));
  verifie(ta === 'Préparé : 0 sur 0 · 1 récolte annulée', 'Préparation : Très Allier « ' + ta + ' »');
  await cap(T, '3-telephone-preparation-client');
  // Par produit
  await T.click('#prepSort [data-sort="produit"]');
  const tete = net(await T.textContent('.grp[data-item="bette"] .grp-head'));
  verifie(tete.includes('Récolte annulée') && !tete.includes('Préparé'), 'Préparation par produit : la bette marquée « Récolte annulée » (« ' + tete + ' »)');
  await cap(T, '4-telephone-preparation-produit');
  // 6. Rétablir
  await T.click('[data-view="recolte"]');
  await T.click(ligne + ' .menu');
  verifie(net(await T.textContent('#annOui')) === 'Rétablir cette récolte' && /^Récolte annulée par Martin à \d\d:\d\d\./.test(net(await T.textContent('#annTexte'))), 'téléphone : sur une ligne annulée, « ⋯ » propose « Rétablir cette récolte »');
  await cap(T, '5-telephone-retablir');
  await T.click('#annOui');
  verifie(await attendreQue(() => annBase('bette') === null), 'base : rétablir efface annule/bette');
  verifie((await ids(T, '#todo li.item')).includes('bette') && (await T.$eval('#annSec', (x) => x.hidden)), 'téléphone : la bette revient dans « à récolter », le cadre des annulées disparaît');
  verifie(await attendreQue(async () => (await ids(T2, '#todo li.item')).includes('bette')), 'deuxième téléphone : la bette revient aussi');
  // 7. Une ligne déjà cochée : annulée puis rétablie, elle retrouve sa coche
  await T.click('li.item[data-id="poireau"] .box');
  await T.waitForTimeout(3300);
  verifie(base.lire(`listes/${MER}/done/poireau`) !== null, 'poireau coché');
  await T.$eval('#doneSec', (d) => { d.open = true; });
  await T.click('#done li.item[data-id="poireau"] .menu');
  await T.click('#annOui'); await T.click('#annOui');
  verifie(await attendreQue(() => annBase('poireau') !== null), 'poireau coché puis annulé : annule/poireau écrit');
  verifie((await ids(T, '#annList li.item')).join() === 'poireau' && !(await ids(T, '#done li.item')).includes('poireau'), 'poireau annulé : il quitte les récoltes effectuées');
  verifie(base.lire(`listes/${MER}/done/poireau`) !== null, 'la coche de récolte du poireau est gardée dans la base');
  await T.click('li.item.annule[data-id="poireau"] .menu');
  await T.click('#annOui');
  verifie(await attendreQue(async () => (await ids(T, '#done li.item')).includes('poireau')), 'poireau rétabli : il retrouve « Récoltes déjà effectuées »');
  verifie(await attendreQue(() => annBase('poireau') === null) && base.lire(`listes/${MER}/done/poireau`) !== null, 'base : poireau rétabli, sa coche toujours là');
  await T.context().close(); await T2.context().close();

  // ---------- Ordinateur ----------
  const O = await appareil({ viewport: { width: 1280, height: 900 } }, 'François');
  await O.click('li.item[data-id="ail-sec"] .menu');
  await O.click('#annOui'); await O.click('#annOui');
  verifie(await attendreQue(() => annBase('ail-sec') !== null), 'ordinateur : ail sec annulé');
  const r = await O.$eval('li.item.annule[data-id="ail-sec"]', (x) => ({ h: x.getBoundingClientRect().height, menu: x.querySelector('.menu').getBoundingClientRect(), more: x.querySelector('.more').getBoundingClientRect() }));
  verifie(Math.abs(r.menu.top - r.more.top) < 2 && r.menu.right <= r.more.left, 'ordinateur : « ⋯ » sur la même ligne, juste à gauche de la flèche (' + JSON.stringify(r) + ')');
  const by2 = net(await O.textContent('li.item.annule[data-id="ail-sec"] .by'));
  verifie(/^Annulée par François à \d\d:\d\d$/.test(by2), 'ordinateur : « ' + by2 + ' »');
  await cap(O, '6-ordinateur-recolte');
  await O.click('li.item.annule[data-id="ail-sec"] .menu'); await O.click('#annOui');
  verifie(await attendreQue(() => annBase('ail-sec') === null), 'ordinateur : ail sec rétabli');
  await O.context().close();

  await new Promise((x) => setTimeout(x, 300));
  verifie(pq() === avant, 'produits et quantités de la semaine jamais réécrits');
  verifie(erreurs.length === 0, 'aucune erreur JavaScript' + (erreurs.length ? ' : ' + erreurs.join(' | ') : ''));
  await nav.close(); site.close(); base.close();
  console.log(echecs ? `\n${echecs} échec(s)` : '\nTout est bon.');
  process.exit(echecs ? 1 : 0);
})().catch((x) => { console.error(x); process.exit(1); });
