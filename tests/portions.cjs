// Portions dans une case (étape 40, demande de François du 18/11 pour Locavore : « 3,5 kg de patates douces, c'était
// 3 commandes de 1 kg et une de 500 g »). Dans la case d'une livraison, on tape « 3 × 1 kg + 500 g » : le total (3,5 kg)
// est le vrai nombre utilisé partout, le détail est gardé et affiché (case, Cumul, grille de l'ordinateur, Préparation).
// Téléphone et ordinateur, via un faux Firebase.
// Lancement depuis la racine du dépôt : node tests/portions.cjs
// Captures d'écran (facultatif) : CAPTURES=dossier node tests/portions.cjs
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');
const { PIXEL, sautePixel } = require('./apparence-env.cjs'); // APPARENCE=pixel : le même test dans l'apparence pixel art (étape 48)
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
const sansSigne = (q) => q && JSON.stringify({ n: q.n, u: q.u, p: q.p });

(async () => {
  const site = await serveurSite();
  const base = await fauxFirebase(PORT_BASE);
  const W = iso(lundi(1)), MER = plus(W, 2);
  const A0 = 1793730000000;
  const put = (p, v) => fetch(`${BASE}/${p}.json`, { method: 'PUT', body: JSON.stringify(v) });
  // Patate douce (PH de 6 kg) et rhubarbe (au kilo) dans la semaine prochaine ; une bette pour le marché.
  await put('listes/semaines/' + W, {
    produits: {
      'patate-douce': { nom: 'Patate douce', caisse: 'PH', unite: '6 kg', kg: 6, by: 'Aurore', at: A0 },
      rhubarbe: { nom: 'Rhubarbe', caisse: 'PH', unite: '5 kg', kg: 5, by: 'Aurore', at: A0 },
      bette: { nom: 'Bette', caisse: 'GH', unite: '5 kg', kg: 5, by: 'Aurore', at: A0 },
    },
    dispo: { 'patate-douce': { n: 1, u: 'colis', by: 'Aurore', at: A0 } },
    q: { bette: { mk: { n: 1, u: 'colis', by: 'Aurore', at: A0 } } },
  });
  const qB = (pid, c) => base.lire(`listes/semaines/${W}/q/${pid}/${c}`);

  const nav = await chromium.launch();
  const erreurs = [];
  const appareil = async (opts, qui) => {
    const ctx = await nav.newContext({ ...opts, serviceWorkers: 'block' });
    await ctx.addInitScript((a) => {
      localStorage.setItem('recolte.qui', JSON.stringify(a.qui));
      if (!localStorage.getItem('recolte.ui')) localStorage.setItem('recolte.ui', JSON.stringify({ semaineLe: ((d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'))(new Date()), semaine: a.w }));
    }, { w: W, qui });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => erreurs.push(qui + ' : ' + e.message));
    p.on('dialog', (d) => d.accept());
    await p.goto(`http://localhost:${PORT_SITE}/`);
    await p.click('[data-view="semaine"]');
    await p.waitForSelector('#semView:not([hidden])');
    return p;
  };
  const cap = async (p, nom, sel) => { if (CAPTURES) await (sel ? (await p.$(sel)).screenshot({ path: path.join(CAPTURES, nom + '.png') }) : p.screenshot({ path: path.join(CAPTURES, nom + '.png') })); };

  // ---------- Téléphone ----------
  const T = await appareil(devices['Pixel 7'], 'François');
  const carte = 'section.sp[data-pid="patate-douce"]', lv = carte + ' .sr[data-k="q/lv"]', inp = lv + ' .sr-ctl input';
  await T.click(carte + ' .sp-head');
  await T.waitForSelector(lv);
  // 1. Une livraison a un bouton « Portions » ; le disponible et le stock n'en ont pas.
  verifie(!!(await T.$(lv + ' [data-a="portions"]')) && !(await T.$(carte + ' .sr[data-k="dispo"] [data-a="portions"]')), 'téléphone : bouton « Portions » sur la case Locavore, pas sur le disponible');
  verifie(!(await T.$(carte + ' .sr[data-k="q/ta-mar"] [data-a="portions"]')) && !(await T.$(carte + ' .sr[data-k="q/el"] [data-a="portions"]')), 'pas de bouton « Portions » sur Très Allier ni Élie (débouchés pas réglés « Vendu en portions »)');
  verifie((await T.getAttribute(inp, 'inputmode')) === 'decimal', 'avant : clavier à chiffres');
  await T.click(lv + ' [data-a="portions"]');
  verifie((await T.getAttribute(inp, 'inputmode')) === 'text' && (await T.getAttribute(inp, 'placeholder')) === '3 × 1 kg + 500 g' && (await T.evaluate(() => document.activeElement && document.activeElement.closest('.sr') && document.activeElement.closest('.sr').dataset.k)) === 'q/lv',
    '« Portions » : clavier complet (pour + et ×), exemple dans la case, curseur dans la case');
  verifie(net(await T.textContent(lv)).includes('Taper les portions, par exemple 3 × 1 kg + 500 g. Le total se calcule seul.'), '« Portions » : phrase d\'aide sous la case');
  await cap(T, '1-telephone-saisie', lv);
  // 2. « 3 × 1 kg + 500 g » → 3,5 kg et le détail, dans la base.
  await T.fill(inp, '3 × 1 kg + 500 g'); await T.press(inp, 'Enter');
  verifie(await attendreQue(() => sansSigne(qB('patate-douce', 'lv')) === JSON.stringify({ n: 3.5, u: 'kg', p: [{ x: 3, n: 1, u: 'kg' }, { x: 1, n: 0.5, u: 'kg' }] })),
    'base : {n: 3,5, u: kg, p: 3 × 1 kg et 1 × 0,5 kg} (obtenu ' + sansSigne(qB('patate-douce', 'lv')) + ')');
  verifie(qB('patate-douce', 'lv').by === 'François' && qB('patate-douce', 'lv').at > A0, 'base : signé (qui, quand)');
  await T.waitForTimeout(400);
  verifie((await T.inputValue(inp)) === '3 × 1 kg + 500 g', 'la case garde le détail : « ' + (await T.inputValue(inp)) + ' »');
  const eq = net(await T.textContent(lv + ' .sr-eq'));
  verifie(eq.startsWith('Total 3,5 kg (0,58 PH)'), 'sous la case : « ' + eq + ' »');
  verifie(await T.isDisabled(lv + ' [data-a="moins"]') && await T.isDisabled(lv + ' [data-a="plus"]'), '− et + grisés (quelle portion changer ?)');
  verifie((await T.getAttribute(lv + ' [data-a="portions"]', 'aria-pressed')) === 'true', 'bouton « Portions » enfoncé');
  const reste = net(await T.textContent(carte + ' .sp-head .reste'));
  verifie(reste === 'À placer : 0,42 PH (2,5 kg)', 'le total compte dans le reste : 6 kg − 3,5 kg → « ' + reste + ' »');
  verifie(net(await T.textContent(carte + ' .sp-resume')).includes('Locavore 3,5 kg'), 'résumé de la fiche : « Locavore 3,5 kg »');
  await cap(T, '2-telephone-portions', carte);
  // 3. − et + ne changent rien.
  await T.click(lv + ' [data-a="plus"]', { force: true }); await T.waitForTimeout(300);
  verifie(qB('patate-douce', 'lv').n === 3.5, '+ grisé : rien d\'écrit');
  // 4. Autres façons de l'écrire : à la voix, collé, répété.
  const essai = async (txt) => { await T.fill(inp, txt); await T.press(inp, 'Enter'); await T.waitForTimeout(400); return sansSigne(qB('patate-douce', 'lv')); };
  verifie(await essai('2 fois 1 kg plus 250 g') === JSON.stringify({ n: 2.25, u: 'kg', p: [{ x: 2, n: 1, u: 'kg' }, { x: 1, n: 0.25, u: 'kg' }] }), 'dicté : « 2 fois 1 kg plus 250 g » → 2,25 kg');
  verifie(await essai('1kg+1kg+1kg+500g') === JSON.stringify({ n: 3.5, u: 'kg', p: [{ x: 3, n: 1, u: 'kg' }, { x: 1, n: 0.5, u: 'kg' }] }), '« 1kg+1kg+1kg+500g » : mêmes tailles regroupées → 3 × 1 kg + 500 g');
  verifie(await essai('3x1,5 kg et 2 x 0,5 kg') === JSON.stringify({ n: 5.5, u: 'kg', p: [{ x: 3, n: 1.5, u: 'kg' }, { x: 2, n: 0.5, u: 'kg' }] }), '« 3x1,5 kg et 2 x 0,5 kg » (virgules, « x », « et ») → 5,5 kg');
  // 5. Erreurs : rien d'écrit, un message.
  const avantErr = sansSigne(qB('patate-douce', 'lv'));
  const erreur = async (txt) => { await T.fill(inp, txt); await T.press(inp, 'Enter'); await T.waitForTimeout(300); await T.click(carte + ' .sr[data-k="dispo"] .sr-nom'); await T.waitForTimeout(300); return net(await T.textContent(lv + ' .sr-err').catch(() => '')); };
  const e1 = await erreur('3 × 1 kg + 1 PH');
  verifie(e1 === 'Toutes les portions dans la même unité, par exemple 3 × 1 kg + 500 g.' && sansSigne(qB('patate-douce', 'lv')) === avantErr, 'kilos et caisses mêlés : « ' + e1 + ' », rien d\'écrit');
  const e2 = await erreur('3 × + 500 g');
  verifie(e2 !== '' && sansSigne(qB('patate-douce', 'lv')) === avantErr, 'portion sans taille : « ' + e2 + ' », rien d\'écrit');
  const dispo = carte + ' .sr[data-k="dispo"] .sr-ctl input';
  await T.fill(dispo, '2 × 3 kg'); await T.press(dispo, 'Enter'); await T.waitForTimeout(300); await T.click(lv + ' .sr-nom'); await T.waitForTimeout(300);
  const e3 = net(await T.textContent(carte + ' .sr[data-k="dispo"] .sr-err').catch(() => ''));
  verifie(e3 === 'Les portions se notent seulement dans une livraison.' && base.lire(`listes/semaines/${W}/dispo/patate-douce`).n === 1, 'portions dans le disponible : « ' + e3 + ' », rien d\'écrit');
  await T.fill(dispo, '1'); await T.press(dispo, 'Enter'); await T.waitForTimeout(300);
  // 6. Un nombre seul remplace le détail ; le détail revient en le retapant.
  await T.fill(inp, '4'); await T.press(inp, 'Enter');
  verifie(await attendreQue(() => sansSigne(qB('patate-douce', 'lv')) === JSON.stringify({ n: 4, u: 'kg' })), 'un nombre seul (4) : 4 kg, sans détail');
  await T.waitForTimeout(300);
  verifie((await T.getAttribute(inp, 'inputmode')) === 'decimal' && (await T.inputValue(inp)) === '4' && !(await T.isDisabled(lv + ' [data-a="plus"]')), 'case revenue au clavier à chiffres, + de nouveau actif');
  await T.click(lv + ' [data-a="portions"]');
  verifie((await T.inputValue(inp)) === '', '« Portions » sur une case remplie : case vide à taper, rien d\'effacé');
  await T.click(carte + ' .sr[data-k="dispo"] .sr-nom'); await T.waitForTimeout(300);
  verifie(sansSigne(qB('patate-douce', 'lv')) === JSON.stringify({ n: 4, u: 'kg' }), 'quitter la case sans taper : les 4 kg restent');
  await T.fill(inp, '3 × 1 kg + 500 g'); await T.press(inp, 'Enter');
  verifie(await attendreQue(() => qB('patate-douce', 'lv').n === 3.5 && (qB('patate-douce', 'lv').p || []).length === 2), 'retapé : 3,5 kg et son détail');
  // 7. Changer d'unité garde le détail (même quantité).
  await T.waitForTimeout(300);
  await T.click(lv + ' [data-a="unite"]');
  verifie(await attendreQue(() => qB('patate-douce', 'lv').u !== 'kg'), 'bouton d\'unité : la case passe dans une autre unité');
  const qu = qB('patate-douce', 'lv');
  verifie(qu.u === 'colis' && Math.abs(qu.n - 0.58) < 0.01 && JSON.stringify(qu.p) === JSON.stringify([{ x: 3, n: 1, u: 'kg' }, { x: 1, n: 0.5, u: 'kg' }]), 'en caisses : 0,58 PH, détail gardé (obtenu ' + sansSigne(qu) + ')');
  await T.click(lv + ' [data-a="unite"]');
  verifie(await attendreQue(() => qB('patate-douce', 'lv').u === 'kg' && qB('patate-douce', 'lv').n === 3.5), 'retour en kilos : 3,5 kg');
  // 8. « tout » cache le bouton « Portions ».
  await T.click(lv + ' [data-a="tout"]');
  verifie(await attendreQue(async () => !(await T.$(lv + ' [data-a="portions"]'))), '« tout » : plus de bouton « Portions »');
  await T.click(lv + ' [data-a="tout"]'); await T.waitForTimeout(400);
  await T.click(lv + ' [data-a="portions"]');
  await T.fill(inp, '3 × 1 kg + 500 g'); await T.press(inp, 'Enter');
  verifie(await attendreQue(() => qB('patate-douce', 'lv') && qB('patate-douce', 'lv').n === 3.5), 'portions remises après « tout »');

  // 9. Le Cumul : le total, le détail dessous ; la petite fenêtre garde la saisie en portions.
  await T.click('[data-sem="cumul"]');
  await T.waitForSelector('#semTable tr[data-pid="patate-douce"]');
  const cel = '#semTable tr[data-pid="patate-douce"] td[data-k="q/lv"]';
  verifie(net(await T.textContent(cel)) === '3,5 kg3 × 1 kg + 500 g' && net(await T.textContent(cel + ' .g-por')) === '3 × 1 kg + 500 g', 'Cumul : « 3,5 kg » et dessous « 3 × 1 kg + 500 g » (obtenu « ' + net(await T.textContent(cel)) + ' »)');
  await cap(T, '3-telephone-cumul', '#semTable');
  await T.click(cel);
  await T.waitForSelector('#semEd[open] .sr-ctl input');
  verifie((await T.inputValue('#semEd .sr-ctl input')) === '3 × 1 kg + 500 g' && (await T.getAttribute('#semEd .sr-ctl input', 'inputmode')) === 'text', 'fenêtre du Cumul : la case montre le détail, clavier complet');
  await T.fill('#semEd .sr-ctl input', '4 × 1 kg + 500 g'); await T.press('#semEd .sr-ctl input', 'Enter');
  verifie(await attendreQue(() => qB('patate-douce', 'lv').n === 4.5), 'fenêtre du Cumul : « 4 × 1 kg + 500 g » → 4,5 kg');
  await cap(T, '4-telephone-fenetre-cumul', '#semEd');
  await T.click('#semEd [data-a="ed-fermer"]');
  await T.fill('#semEd .sr-ctl input', '').catch(() => {});

  // 10. Préparation : la ligne du client dit les sachets à faire.
  await T.click('[data-view="prep"]');
  await T.waitForSelector('#recJours button');
  await T.click(`#recJours [data-jour="${MER}"]`);
  await T.click('#prepSort [data-sort="client"]');
  const lp = 'li.pitem[data-k="lv/patate-douce"]';
  await T.waitForSelector(lp);
  verifie(net(await T.textContent(lp + ' .portions')) === '4 portions de 1 kg et 1 portion de 500 g', 'Préparation, par client : « ' + net(await T.textContent(lp + ' .portions')) + ' »');
  verifie(net(await T.textContent(lp + ' .qty')).startsWith('4,5 kg'), 'Préparation : quantité 4,5 kg (« ' + net(await T.textContent(lp + ' .qty')) + ' »)');
  verifie(!(await T.$('li.pitem[data-k="mk/bette"] .portions')), 'une ligne sans portions n\'a rien de plus');
  await cap(T, '5-telephone-preparation', '.grp[data-circ="lv"]');
  await T.click('#prepSort [data-sort="produit"]');
  await T.waitForSelector(lp);
  verifie(net(await T.textContent(lp + ' .portions')) === '4 portions de 1 kg et 1 portion de 500 g', 'Préparation, par produit : même détail');
  // 11. Liste figée (première coche) : un détail corrigé à même total suit, sans écart signalé.
  await T.click('[data-view="recolte"]');
  await T.waitForSelector('li.item[data-id="bette"]');
  await T.click('li.item[data-id="bette"] .box');
  verifie(await attendreQue(() => !!base.lire(`listes/${MER}/fige`)), 'première coche : la liste du mercredi est figée');
  const fg = base.lire(`listes/${MER}/fige`);
  const fgPd = (fg.items || []).filter((x) => x && x.id === 'patate-douce')[0];
  verifie(fgPd && fgPd.portions && fgPd.portions.lv === '4 portions de 1 kg et 1 portion de 500 g', 'la liste figée garde le détail');
  await T.click('[data-view="semaine"]'); await T.click('[data-sem="repartir"]');
  await T.waitForSelector(lv);
  await T.fill(inp, '9 × 500 g'); await T.press(inp, 'Enter');
  verifie(await attendreQue(() => (qB('patate-douce', 'lv').p || [])[0] && qB('patate-douce', 'lv').p[0].x === 9), 'détail corrigé, même total : 9 × 500 g');
  await T.click('[data-view="prep"]');
  await T.waitForSelector(lp);
  verifie(net(await T.textContent(lp + ' .portions')) === '9 portions de 500 g' && !(await T.isVisible('#ecartsBox')), 'Préparation : « 9 portions de 500 g », aucun écart signalé');
  await T.click('[data-view="semaine"]');
  await T.fill(inp, '3 × 1 kg + 500 g'); await T.press(inp, 'Enter');
  verifie(await attendreQue(() => qB('patate-douce', 'lv').n === 3.5), 'total changé (3,5 kg)');
  await T.click('[data-view="prep"]');
  await T.waitForSelector(lp);
  verifie(await T.isVisible('#ecartsBox') && net(await T.textContent(lp + ' .portions')) === '4 portions de 1 kg et 1 portion de 500 g', 'total changé : écart signalé comme d\'habitude, la liste figée garde le détail de sa première coche (écart visible : ' + (await T.isVisible('#ecartsBox')) + ', détail : ' + net(await T.textContent(lp + ' .portions')) + ')');
  await T.context().close();

  // ---------- Ordinateur ----------
  const O = await appareil({ viewport: { width: 1280, height: 800 } }, 'Aurore');
  await O.waitForSelector('#semGrid tr[data-pid="patate-douce"]');
  const g = (pid) => `#semGrid tr[data-pid="${pid}"] input[data-k="q/lv"]`;
  verifie((await O.inputValue(g('patate-douce'))) === '3,5' && (await O.$eval(`#semGrid tr[data-pid="patate-douce"] select[data-k="q/lv"]`, (s) => s.value)) === 'kg', 'grille : la case montre 3,5 et l\'unité kg');
  const gp = `#semGrid tr[data-pid="patate-douce"] td:has(input[data-k="q/lv"]) .g-por`;
  verifie(net(await O.textContent(gp)) === '3 × 1 kg + 500 g', 'grille : le détail sous la case');
  verifie((await O.getAttribute(g('patate-douce'), 'title')).includes('portions : 3 × 1 kg + 500 g'), 'grille : le détail dans la bulle de la case');
  await O.fill(g('rhubarbe'), '2 x 250 g'); await O.press(g('rhubarbe'), 'Tab');
  verifie(await attendreQue(() => sansSigne(qB('rhubarbe', 'lv')) === JSON.stringify({ n: 0.5, u: 'kg', p: [{ x: 2, n: 0.25, u: 'kg' }] })), 'grille : « 2 x 250 g » → 0,5 kg et son détail (obtenu ' + sansSigne(qB('rhubarbe', 'lv')) + ')');
  await O.waitForTimeout(400);
  verifie(net(await O.textContent(`#semGrid tr[data-pid="rhubarbe"] td:has(input[data-k="q/lv"]) .g-por`)) === '2 × 250 g', 'grille : « 2 × 250 g » sous la case');
  await cap(O, '6-ordinateur-grille', '#semGrid');
  // Réglages : « Vendu en portions », coché pour Locavore (fichier de départ), à cocher pour un autre débouché.
  await O.click('[data-view="reglages"]');
  const fiche = (d) => `#debView section.db[data-d="${d}"]`;
  await O.click(`${fiche('lv')} .db-tete`);
  verifie(await O.isChecked(`${fiche('lv')} [data-f="portions"]`), 'Réglages : Locavore « Vendu en portions » coché');
  await cap(O, '7-ordinateur-reglages', fiche('lv'));
  await O.click(`${fiche('lv')} .db-tete`);
  await O.click(`${fiche('el')} .db-tete`);
  verifie(!(await O.isChecked(`${fiche('el')} [data-f="portions"]`)), 'Réglages : Élie pas coché');
  await O.check(`${fiche('el')} [data-f="portions"]`);
  verifie(await attendreQue(() => { const r = base.lire('listes/reglages/debouches'); return r && (r.debouches || []).some((d) => d && d.id === 'el' && d.portions === true); }), 'cocher Élie : « portions » enregistré dans les réglages');
  await O.context().close();
  const T3 = await appareil(devices['Pixel 7'], 'Martin');
  await T3.click(carte + ' .sp-head');
  verifie(await attendreQue(async () => !!(await T3.$(carte + ' .sr[data-k="q/el"] [data-a="portions"]'))), 'téléphone : Élie a maintenant son bouton « Portions »');
  await T3.context().close();

  verifie(erreurs.length === 0, 'aucune erreur JavaScript' + (erreurs.length ? ' : ' + erreurs.join(' | ') : ''));
  await nav.close(); site.close(); base.close();
  console.log(echecs ? `\n${echecs} échec(s)` : '\nTout est bon.');
  process.exit(echecs ? 1 : 0);
})().catch((x) => { console.error(x); process.exit(1); });
