// Test de l'annulation d'un produit pour un client dans Préparation (demande de François du 18/11/2026, « sur le même
// principe que les récoltes ») : bouton « ⋯ » sur chaque ligne produit × client, confirmation, pas de motif ; la ligne reste
// visible, barrée, « Annulé pour ce client », « Annulé par … à … », sans case, en bas du client et hors du « Préparé » ;
// « Rétablir » défait. Seul ce client est touché : la récolte et les autres clients ne changent pas.
// Donnée à part : listes/<jour>/prepAnnule/<circuit>/<produit> {by, at}. Quantités de la semaine et coches jamais
// effacées. Un deuxième téléphone voit l'annulation. Données factices (faux Firebase).
// Lancement depuis la racine du dépôt : node tests/annuler-preparation.cjs   (CAPTURES=<dossier> pour les captures)
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');
const { PIXEL, sautePixel } = require('./apparence-env.cjs'); // APPARENCE=pixel : le même test dans l'apparence pixel art (étape 48)
const ROUGE_PALE = PIXEL ? 'rgb(248, 216, 208)' : 'rgb(251, 229, 232)'; // fond de l'étiquette rouge dans chaque apparence
const fauxFirebase = require('./faux-firebase.cjs');

const RACINE = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const PORT_SITE = 8890, PORT_BASE = 8891;
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
  const paBase = (k) => base.lire(`listes/${MER}/prepAnnule/${k}`);

  // ---------- Téléphone ----------
  const T = await appareil(devices['Pixel 7'], 'Martin');
  const T2 = await appareil(devices['Pixel 7'], 'Aurore');
  const prep = async (p, tri) => { await p.click('[data-view="prep"]'); await p.click(`#prepSort [data-sort="${tri}"]`); await p.waitForSelector('#prepList li.pitem'); };
  await prep(T, 'client'); await prep(T2, 'client');
  // 1. Chaque ligne de Préparation a son « ⋯ »
  const nl = await T.$$eval('li.pitem', (e) => [e.length, e.filter((x) => x.querySelector('button.menu')).length]);
  verifie(nl[0] === 4 && nl[1] === 4, 'téléphone : un « ⋯ » sur chacune des 4 lignes de Préparation (obtenu ' + nl + ')');
  const pos = await T.$eval('li.pitem[data-k="mk/bette"]', (x) => { const r = x.getBoundingClientRect(), m = x.querySelector('.menu').getBoundingClientRect(), q = x.querySelector('.qty').getBoundingClientRect(); return { dedans: m.right <= r.right + 1, apres: m.left >= q.right - 1, haut: m.height >= 40 }; });
  verifie(pos.dedans && pos.apres && pos.haut, 'téléphone : « ⋯ » à droite de la quantité, dans la ligne, 40 px (' + JSON.stringify(pos) + ')');
  // 2. « ⋯ » ne coche pas la ligne ; « Non, garder » ne change rien
  await T.click('li.pitem[data-k="mk/bette"] .menu');
  await T.waitForSelector('#annDlg[open]');
  verifie(net(await T.textContent('#annTitre')) === 'Bette · Marché de Tronget' && net(await T.textContent('#annOui')) === 'Annuler pour ce client', 'téléphone : la fenêtre nomme produit et client (« ' + net(await T.textContent('#annTitre')) + ' ») et propose « Annuler pour ce client »');
  verifie(!(await T.$('#annDlg input, #annDlg textarea')), 'téléphone : aucun champ de motif');
  await T.click('#annOui');
  verifie(net(await T.textContent('#annOui')) === 'Oui, annuler' && net(await T.textContent('#annNon')) === 'Non, garder', 'téléphone : confirmation demandée (« Oui, annuler » / « Non, garder »)');
  await cap(T, '2-telephone-confirmation');
  await T.click('#annNon');
  await T.waitForTimeout(400);
  verifie(paBase('mk/bette') === null && base.lire(`listes/${MER}/prep/mk/bette`) === null, 'téléphone : « Non, garder » ne change rien, et le « ⋯ » n\'a pas coché la ligne');
  // 3. Annulation confirmée
  await T.click('li.pitem[data-k="mk/bette"] .menu');
  await T.click('#annOui'); await T.click('#annOui');
  verifie(await attendreQue(() => paBase('mk/bette') !== null), 'base : listes/' + MER + '/prepAnnule/mk/bette écrit');
  const a = paBase('mk/bette') || {};
  verifie(a.by === 'Martin' && typeof a.at === 'number' && Object.keys(a).sort().join() === 'at,by', 'base : {by: « Martin », at} seulement (obtenu ' + JSON.stringify(a) + ')');
  verifie(base.lire(`listes/${MER}/annule`) === null && base.lire(`listes/${MER}/done`) === null, 'base : ni récolte annulée ni coche de récolte écrite');
  const L = 'li.pitem.annule[data-k="mk/bette"]';
  const st = await T.$eval(L, (x) => ({ badge: (x.querySelector('.rec') || {}).textContent, rouge: getComputedStyle(x.querySelector('.rec')).backgroundColor, barre: getComputedStyle(x.querySelector('.prod')).textDecorationLine, box: !!x.querySelector('button.box'), menu: !!x.querySelector('button.menu'), by: x.querySelector('.by').textContent, qte: x.querySelector('.qty').textContent }));
  verifie(st.badge === 'Annulé pour ce client' && st.rouge === ROUGE_PALE && st.barre.includes('line-through') && !st.box && st.menu, 'téléphone : ligne barrée, étiquette rouge « Annulé pour ce client », sans case, « ⋯ » gardé (' + JSON.stringify(st) + ')');
  verifie(/^Annulé par Martin à \d\d:\d\d$/.test(net(st.by)), 'téléphone : « ' + net(st.by) + ' »');
  verifie(net(st.qte).startsWith('1 colis'), 'téléphone : la quantité reste affichée (« ' + net(st.qte) + ' »)');
  const mk = net(await T.textContent('.grp[data-circ="mk"] .grp-sum'));
  verifie(mk === 'Préparé : 0 sur 2 · 1 annulé', 'Préparation : marché « ' + mk + ' »');
  verifie(await T.$eval('.grp[data-circ="mk"] li.pitem:last-child', (x) => x.dataset.k) === 'mk/bette', 'Préparation : la ligne annulée est en bas du client');
  const ta = net(await T.textContent('.grp[data-circ="ta"] .grp-sum'));
  verifie(ta === 'Préparé : 0 sur 1' && !(await T.$('.grp[data-circ="ta"] li.pitem.annule')), 'Préparation : Très Allier garde sa bette (« ' + ta + ' »)');
  const ps = net(await T.textContent('#prepSum'));
  verifie(ps.startsWith('0 ligne préparée sur 3 (1 annulée, pas comptée)'), 'Préparation : « ' + ps + ' »');
  await T.click(L + ' .prod');
  await T.waitForTimeout(300);
  verifie(base.lire(`listes/${MER}/prep/mk/bette`) === null, 'toucher une ligne annulée ne coche rien');
  await cap(T, '1-telephone-preparation-client');
  // Récolte : la bette reste à récolter, avec ses 2 colis
  await T.click('[data-view="recolte"]');
  verifie((await ids(T, '#todo li.item')).includes('bette') && net(await T.textContent('li.item[data-id="bette"] .qty')).startsWith('2 colis'), 'Récolte : la bette reste à récolter, 2 colis (seul le client est touché)');
  // 4. Deuxième téléphone
  verifie(await attendreQue(async () => !!(await T2.$(L))), 'deuxième téléphone : la ligne apparaît annulée');
  // 5. Par produit
  await prep(T, 'produit');
  const tete = net(await T.textContent('.grp[data-item="bette"] .grp-head'));
  verifie(tete.includes('Préparé : 0 sur 1 · 1 annulé'), 'Préparation par produit : « ' + tete + ' »');
  const lpp = await T.$$eval('.grp[data-item="bette"] li.pitem', (e) => e.map((x) => x.dataset.k + (x.classList.contains('annule') ? ':annulé' : '')));
  verifie(lpp.join() === 'ta/bette,mk/bette:annulé', 'Préparation par produit : Très Allier puis le marché annulé en bas (' + lpp + ')');
  await cap(T, '3-telephone-preparation-produit');
  // 6. Rétablir
  await T.click(L + ' .menu');
  verifie(net(await T.textContent('#annOui')) === 'Rétablir pour ce client' && /^Annulé pour ce client par Martin à \d\d:\d\d\./.test(net(await T.textContent('#annTexte'))), 'téléphone : sur une ligne annulée, « ⋯ » propose « Rétablir pour ce client »');
  await cap(T, '4-telephone-retablir');
  await T.click('#annOui');
  verifie(await attendreQue(() => paBase('mk/bette') === null), 'base : rétablir efface prepAnnule/mk/bette');
  verifie(!(await T.$('li.pitem.annule')), 'téléphone : la ligne n\'est plus barrée');
  verifie(await attendreQue(async () => !(await T2.$('li.pitem.annule'))), 'deuxième téléphone : la ligne revient aussi');
  // 7. Ligne déjà préparée : annulée puis rétablie, elle retrouve sa coche
  await prep(T, 'client');
  await T.click('li.pitem[data-k="mk/poireau"] .prod');
  verifie(await attendreQue(() => base.lire(`listes/${MER}/prep/mk/poireau`) !== null), 'poireau préparé pour le marché');
  await T.click('li.pitem[data-k="mk/poireau"] .menu'); await T.click('#annOui'); await T.click('#annOui');
  verifie(await attendreQue(() => paBase('mk/poireau') !== null), 'poireau annulé pour le marché');
  const mk2 = net(await T.textContent('.grp[data-circ="mk"] .grp-sum'));
  verifie(mk2 === 'Préparé : 0 sur 2 · 1 annulé' && base.lire(`listes/${MER}/prep/mk/poireau`) !== null, 'poireau annulé : hors du compte (« ' + mk2 + ' »), sa coche gardée dans la base');
  await T.click('li.pitem.annule[data-k="mk/poireau"] .menu'); await T.click('#annOui');
  verifie(await attendreQue(async () => !!(await T.$('li.pitem.done[data-k="mk/poireau"]'))), 'poireau rétabli : il retrouve sa coche « Préparé »');
  // 8. Récolte annulée : pas de « ⋯ » de client (on rétablit dans Récolte)
  await T.click('[data-view="recolte"]');
  await T.click('li.item[data-id="ail-sec"] .menu'); await T.click('#annOui'); await T.click('#annOui');
  verifie(await attendreQue(() => base.lire(`listes/${MER}/annule/ail-sec`) !== null), 'ail sec : récolte annulée');
  await prep(T, 'client');
  const ail = await T.$eval('li.pitem[data-k="mk/ail-sec"]', (x) => ({ badge: x.querySelector('.rec').textContent, menu: !!x.querySelector('.menu') }));
  verifie(ail.badge === 'Récolte annulée' && !ail.menu, 'récolte annulée : la ligne dit « Récolte annulée », sans « ⋯ » de client (' + JSON.stringify(ail) + ')');
  await T.click('[data-view="recolte"]');
  await T.click('li.item.annule[data-id="ail-sec"] .menu'); await T.click('#annOui');
  verifie(await attendreQue(() => base.lire(`listes/${MER}/annule/ail-sec`) === null), 'ail sec rétabli');
  await T.context().close(); await T2.context().close();

  // ---------- Ordinateur ----------
  const O = await appareil({ viewport: { width: 1280, height: 900 } }, 'François');
  await prep(O, 'client');
  await O.click('li.pitem[data-k="ta/bette"] .menu'); await O.click('#annOui'); await O.click('#annOui');
  verifie(await attendreQue(() => paBase('ta/bette') !== null), 'ordinateur : bette annulée pour Très Allier');
  const by2 = net(await O.textContent('li.pitem.annule[data-k="ta/bette"] .by'));
  verifie(/^Annulé par François à \d\d:\d\d$/.test(by2), 'ordinateur : « ' + by2 + ' »');
  await cap(O, '5-ordinateur-preparation');
  await O.click('li.pitem.annule[data-k="ta/bette"] .menu'); await O.click('#annOui');
  verifie(await attendreQue(() => paBase('ta/bette') === null), 'ordinateur : rétabli');
  await O.context().close();

  await new Promise((x) => setTimeout(x, 300));
  verifie(pq() === avant, 'produits et quantités de la semaine jamais réécrits');
  verifie(erreurs.length === 0, 'aucune erreur JavaScript' + (erreurs.length ? ' : ' + erreurs.join(' | ') : ''));
  await nav.close(); site.close(); base.close();
  console.log(echecs ? `\n${echecs} échec(s)` : '\nTout est bon.');
  process.exit(echecs ? 1 : 0);
})().catch((x) => { console.error(x); process.exit(1); });
