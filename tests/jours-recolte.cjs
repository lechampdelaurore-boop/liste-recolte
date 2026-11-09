// Test de la page « À récolter » de l'onglet Semaine (demande de François du 9/11/2026) : les jours de récolte sont
// repliés en une liste, une flèche déplie le détail de chacun ; les boutons « Nouveau jour de récolte » et « Régler
// les jours habituels » sont tout en haut ; « Nouveau jour de récolte » ouvre un petit menu qui demande quel jour
// créer, sans les jours qui existent déjà, et ne crée rien tant qu'on n'a pas choisi. Téléphone et ordinateur, avec
// un faux Firebase (jamais la vraie base). Vérifie aussi que déplier, replier, ouvrir ou fermer le menu n'écrit rien.
// Lancement depuis la racine du dépôt : node tests/jours-recolte.cjs
// Captures d'écran (facultatif) : CAPTURES=dossier node tests/jours-recolte.cjs
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');
const fauxFirebase = require('./faux-firebase.cjs');

const RACINE = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const PORT_SITE = 8840, PORT_BASE = 8841;
const CAPTURES = process.env.CAPTURES || '';
const BASE = `http://localhost:${PORT_BASE}`;

function serveurSite() {
  return new Promise((ok) => {
    const s = http.createServer((q, r) => {
      let f = decodeURIComponent(new URL(q.url, 'http://x').pathname);
      if (f.endsWith('/')) f += 'index.html';
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
const net = (t) => String(t || '').replace(/\s+/g, ' ').trim();

(async () => {
  const site = await serveurSite();
  const base = await fauxFirebase(PORT_BASE);
  const put = (p, v) => fetch(`${BASE}/${p}.json`, { method: 'PUT', body: JSON.stringify(v) });
  // La semaine prochaine : lundi et mercredi sont les jours habituels du référentiel (créés tout seuls).
  const W = iso(lundi(1)), LUN = W, MAR = plus(W, 1), MER = plus(W, 2), JEU = plus(W, 3);
  const A0 = 1793730000000, q = (n) => ({ n, u: 'colis', by: 'Aurore', at: A0 });
  await put('listes/semaines/' + W, {
    produits: { bette: { nom: 'Bette', caisse: 'GH', unite: '5 kg', kg: 5, by: 'Aurore', at: A0 }, mesclun: { nom: 'Mesclun', caisse: 'PH', unite: '1 kg', kg: 1, by: 'Aurore', at: A0 } },
    q: { bette: { mk: q(2), lv: q(1) }, mesclun: { mk: q(1) } },
  });
  // Deux semaines plus loin : les sept jours ont déjà leur jour de récolte.
  const W7 = plus(W, 14), tous = {};
  for (let i = 0; i < 7; i++) tous[plus(W7, i)] = { livraisons: [], by: 'Aurore', at: A0 };
  await put('listes/semaines/' + W7, { produits: { bette: { nom: 'Bette', caisse: 'GH', unite: '5 kg', kg: 5, by: 'Aurore', at: A0 } }, q: { bette: { mk: q(1) } }, recoltes: tous });

  const nav = await chromium.launch();
  const erreurs = [];
  const appareil = async (opts) => {
    const ctx = await nav.newContext({ ...opts, serviceWorkers: 'block' });
    await ctx.addInitScript((w) => {
      localStorage.setItem('recolte.qui', JSON.stringify('Martin'));
      if (!localStorage.getItem('recolte.ui')) localStorage.setItem('recolte.ui', JSON.stringify({ semaine: w, view: 'semaine', semPage: 'recolter' }));
    }, W);
    const p = await ctx.newPage();
    p.on('pageerror', (e) => erreurs.push(e.message));
    p.on('dialog', (d) => d.accept());
    await p.goto(`http://localhost:${PORT_SITE}/`);
    return p;
  };
  const capture = async (p, nom) => { if (CAPTURES) await p.screenshot({ path: path.join(CAPTURES, nom + '.png'), fullPage: false }); };
  const carte = (d) => `#semRecList .rc-jour[data-date="${d}"]`;
  const fleche = (d) => carte(d) + ' [data-a="rc-plier"]';
  const instantane = () => JSON.stringify(base.lire('listes'));

  // 1. Téléphone : la page « À récolter » s'ouvre avec les boutons en haut et les jours repliés
  const T = await appareil(devices['Pixel 7']);
  await T.waitForSelector(fleche(MER));
  await T.waitForTimeout(500);
  const avant = instantane();
  const haut = await T.$$eval('#semRecList .rc-haut button', (e) => e.map((x) => x.textContent.trim()));
  verifie(haut.join(' | ') === '＋ Nouveau jour de récolte | Régler les jours habituels', 'en haut de la page : « Nouveau jour de récolte » et « Régler les jours habituels » (obtenu ' + haut.join(' | ') + ')');
  const ordre = await T.$eval('#semRecList', (e) => { const h = e.querySelector('.rc-haut'), j = e.querySelector('.rc-jours'); return !!(h && j && (h.compareDocumentPosition(j) & Node.DOCUMENT_POSITION_FOLLOWING)); });
  const posH = await T.$eval('#semRecList [data-a="ajout-menu"]', (e) => { const r = e.getBoundingClientRect(); return { y: r.top, bas: r.bottom, vh: innerHeight }; });
  verifie(ordre && posH.y > 0 && posH.bas < posH.vh, 'les boutons viennent avant la liste des jours, visibles à l\'ouverture sans faire défiler (bouton à ' + Math.round(posH.y) + ' px du haut, écran de ' + posH.vh + ' px)');
  verifie(!(await T.$('#ajJour')) && !(await T.$('#semRecList .rc-pied button')), 'plus de menu déroulant ni de bouton en bas de page');
  const titres = await T.$$eval('#semRecList .rc-jour h3', (e) => e.map((x) => x.querySelector('.rc-titre').childNodes[0].textContent));
  const plies = await T.$$eval('#semRecList .rc-tete', (e) => e.map((x) => x.getAttribute('aria-expanded')));
  verifie(titres.length === 2 && titres[0].startsWith('Lundi') && titres[1].startsWith('Mercredi') && plies.every((x) => x === 'false'), 'les jours déjà là (lundi, mercredi) sont repliés : une ligne chacun, avec sa flèche');
  verifie(!(await T.$('#semRecList input[data-a="chaque"]')) && !(await T.$('#semRecList li[data-pid]')) && !(await T.$('#semRecList [data-a="voir-jour"]')), 'repliés, ils ne montrent ni cases, ni produits, ni boutons');
  const resMer = net(await T.textContent(carte(MER) + ' h3')), resLun = net(await T.textContent(carte(LUN) + ' h3'));
  verifie(resMer.includes('Chaque semaine') && resMer.includes('Marché') && resMer.includes('2 produits à récolter'), 'ligne du mercredi : « Chaque semaine », ses livraisons, « 2 produits à récolter » (obtenu « ' + resMer + ' »)');
  verifie(resLun.includes('Rien à récolter'), 'ligne du lundi : « Rien à récolter » (obtenu « ' + resLun + ' »)');
  const tailleFl = await T.$eval(fleche(MER), (e) => e.getBoundingClientRect().height);
  verifie(tailleFl >= 48, 'toute la ligne du jour se touche pour déplier (hauteur ' + Math.round(tailleFl) + ' px)');
  await capture(T, '1-telephone-replie');

  // 2. La flèche déplie le détail d'un jour, et seulement de lui ; un second toucher le replie
  await T.click(fleche(MER));
  await T.waitForSelector(carte(MER) + ' li[data-pid="bette"]');
  verifie((await T.getAttribute(fleche(MER), 'aria-expanded')) === 'true' && await T.isVisible(carte(MER) + ' input[data-a="chaque"]') && await T.isVisible(carte(MER) + ' [data-a="voir-jour"]') && await T.isVisible(carte(MER) + ' [data-a="retirer-jour"]'), 'mercredi déplié : « Chaque semaine », livraisons, produits, « Voir la liste de récolte », « Retirer ce jour »');
  verifie((await T.getAttribute(fleche(LUN), 'aria-expanded')) === 'false' && !(await T.$(carte(LUN) + ' input')), 'le lundi reste replié');
  await capture(T, '2-telephone-mercredi-deplie');
  await T.click(fleche(MER));
  await T.waitForTimeout(200);
  verifie((await T.getAttribute(fleche(MER), 'aria-expanded')) === 'false' && !(await T.$(carte(MER) + ' li[data-pid]')), 'second toucher : le mercredi se replie');
  await T.waitForTimeout(300);
  verifie(instantane() === avant, 'déplier et replier n\'écrit rien dans la base');

  // 3. « Nouveau jour de récolte » : un petit menu demande lequel, sans lundi ni mercredi ; « Annuler » ne crée rien
  await T.click('[data-a="ajout-menu"]');
  await T.waitForSelector('#rcMenu');
  const q1 = net(await T.textContent('#rcMenu .rc-q'));
  const choix = await T.$$eval('#rcMenu [data-a="ajouter-jour"]', (e) => e.map((x) => x.dataset.date + '=' + x.textContent.split(' ')[0]));
  verifie(q1 === 'Quel jour de récolte créer ?', 'le menu demande « Quel jour de récolte créer ? »');
  verifie(choix.join(',') === [MAR + '=Mardi', JEU + '=Jeudi', plus(W, 4) + '=Vendredi', plus(W, 5) + '=Samedi', plus(W, 6) + '=Dimanche'].join(','), 'il propose mardi, jeudi, vendredi, samedi, dimanche, sans les jours déjà là (obtenu ' + choix.join(', ') + ')');
  verifie((await T.getAttribute('[data-a="ajout-menu"]', 'aria-expanded')) === 'true', 'le bouton dit que le menu est ouvert');
  const posM = await T.$eval('#rcMenu', (e) => { const r = e.getBoundingClientRect(); return { y: r.top, vh: innerHeight }; });
  verifie(posM.y < posM.vh, 'le menu s\'ouvre juste sous le bouton, à l\'écran');
  await capture(T, '3-telephone-menu');
  verifie(instantane() === avant, 'ouvrir le menu ne crée aucun jour');
  await T.click('#rcMenu >> text=Annuler');
  await T.waitForTimeout(300);
  verifie(!(await T.$('#rcMenu')) && instantane() === avant && (await T.$$('#semRecList .rc-jour[data-date]')).length === 2, '« Annuler » ferme le menu sans rien créer');

  // 4. Choisir « Jeudi » crée le jeudi, pas le mardi, déplié pour voir ses livraisons proposées
  await T.click('[data-a="ajout-menu"]');
  await T.click(`#rcMenu [data-a="ajouter-jour"][data-date="${JEU}"]`);
  await T.waitForSelector(carte(JEU) + ' input[data-a="chaque"]');
  await T.waitForTimeout(500);
  const jeu = base.lire('listes/semaines/' + W + '/recoltes/' + JEU);
  verifie(jeu && Array.isArray(jeu.livraisons) && jeu.by === 'Martin', 'jeudi créé dans la semaine, signé Martin (livraisons proposées : ' + (jeu && jeu.livraisons ? jeu.livraisons.join(',') || 'aucune' : '?') + ')');
  verifie(base.lire('listes/semaines/' + W + '/recoltes/' + MAR) === null, 'aucun mardi créé');
  const apres = JSON.parse(instantane()), av = JSON.parse(avant);
  delete apres.semaines[W].recoltes;
  // À la première écriture d'une semaine, l'appli y range aussi l'heure (maj) et sa copie des livraisons et des jours
  // habituels (creneaux, habitudes), comme avant ce changement (étape 13D) : seules ces clés s'ajoutent.
  const ajout = Object.keys(apres.semaines[W]).filter((k) => !(k in av.semaines[W]));
  ['maj', 'creneaux', 'habitudes'].forEach((k) => delete apres.semaines[W][k]);
  verifie(JSON.stringify(apres) === JSON.stringify(av), 'rien d\'autre n\'a changé dans la base (clés ajoutées à la semaine : ' + ajout.join(', ') + ')');
  verifie(!(await T.$('#rcMenu')) && (await T.getAttribute(fleche(JEU), 'aria-expanded')) === 'true' && (await T.getAttribute(fleche(MER), 'aria-expanded')) === 'false', 'le menu se ferme ; le jeudi créé est déplié, les autres restent repliés');
  await capture(T, '4-telephone-jeudi-cree');
  await T.click('[data-a="ajout-menu"]');
  const choix2 = await T.$$eval('#rcMenu [data-a="ajouter-jour"]', (e) => e.map((x) => x.dataset.date));
  verifie(choix2.length === 4 && !choix2.includes(JEU), 'le menu ne propose plus le jeudi');
  await T.click('#rcMenu >> text=Annuler');

  // 5. « Régler les jours habituels » ouvre les réglages des jours de récolte
  await T.click('#semRecList .rc-haut [data-a="debouches"]');
  await T.waitForTimeout(300);
  verifie(await T.isVisible('#debView') && (await T.getAttribute('#regSub [data-reg="recoltes"]', 'aria-pressed')) === 'true', '« Régler les jours habituels » ouvre Réglages, jours de récolte');

  // 6. Semaine dont les sept jours existent : pas de bouton « Nouveau jour », une phrase le dit
  await T.click('[data-view="semaine"]');
  await T.click('[data-sem="recolter"]');
  await T.click('[data-a="semSuiv"]'); await T.click('[data-a="semSuiv"]');
  await T.waitForSelector(fleche(plus(W7, 6)));
  verifie(!(await T.$('[data-a="ajout-menu"]')) && net(await T.textContent('#semRecList .rc-haut')).includes('Chaque jour de la semaine a déjà son jour de récolte.') && await T.isVisible('#semRecList .rc-haut [data-a="debouches"]'), 'semaine aux sept jours : pas de « Nouveau jour », la phrase le dit, « Régler » reste en haut');

  // 7. Ordinateur : mêmes boutons en haut, jours repliés, même menu
  const P = await appareil({ viewport: { width: 1280, height: 800 } });
  await P.waitForSelector(fleche(MER));
  const hautP = await P.$$eval('#semRecList .rc-haut button', (e) => e.map((x) => x.textContent.trim()));
  const posP = await P.$eval('#semRecList [data-a="ajout-menu"]', (e) => e.getBoundingClientRect().bottom);
  verifie(hautP.length === 2 && posP < 800, 'ordinateur : les deux boutons en haut, visibles sans défiler');
  const pliesP = await P.$$eval('#semRecList .rc-tete', (e) => e.map((x) => x.getAttribute('aria-expanded')));
  verifie(pliesP.length === 3 && pliesP.every((x) => x === 'false'), 'ordinateur : les trois jours (lundi, mercredi, jeudi) repliés');
  await capture(P, '5-ordinateur-replie');
  await P.click(fleche(MER));
  await P.waitForSelector(carte(MER) + ' li[data-pid="bette"]');
  await P.click('[data-a="ajout-menu"]');
  await P.waitForSelector('#rcMenu');
  const choixP = await P.$$eval('#rcMenu [data-a="ajouter-jour"]', (e) => e.length);
  verifie(choixP === 4, 'ordinateur : le menu propose les 4 jours libres');
  await capture(P, '6-ordinateur-menu-et-mercredi');
  await P.keyboard.press('Tab');
  await P.click('#rcMenu >> text=Annuler');
  await P.waitForTimeout(300);
  verifie(!(await P.$('#rcMenu')), 'ordinateur : « Annuler » ferme le menu');

  verifie(erreurs.length === 0, 'aucune erreur JavaScript' + (erreurs.length ? ' : ' + erreurs.join(' | ') : ''));
  await nav.close(); site.close(); base.close();
  console.log(echecs ? '\n' + echecs + ' échec(s).' : '\nTout est bon.');
  process.exit(echecs ? 1 : 0);
})();
