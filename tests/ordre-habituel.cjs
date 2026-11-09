// Test de l'ordre de récolte habituel (demande de François du 9/11/2026, proposition 3 du fil sur le tri) :
// un bouton « Enregistrer cet ordre » dans l'onglet Récolte (ordinateur et téléphone) garde l'ordre de la liste dans
// les réglages de la ferme (listes/reglages/ordre) ; un jour de récolte pas encore trié s'ouvre dans cet ordre, les
// nouveaux produits à la fin ; un jour déjà trié garde son ordre ; la seule écriture est le clic ; hors ligne, l'ordre
// attend puis part. Données factices et faux Firebase : rien n'est écrit dans la vraie base.
// Lancement depuis la racine du dépôt : node tests/ordre-habituel.cjs
// Captures d'écran (facultatif) : CAPTURES=dossier node tests/ordre-habituel.cjs
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');
const fauxFirebase = require('./faux-firebase.cjs');

const RACINE = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const PORT_SITE = 8850, PORT_BASE = 8851;
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

const AT = 1793730000000;
const FICHES = {
  bette: { nom: 'Bette', caisse: 'GH', unite: '5 kg', kg: 5 },
  carotte: { nom: 'Carotte lavée', caisse: 'PH', unite: '8 kg', kg: 8 },
  mesclun: { nom: 'Mesclun', caisse: 'PH', unite: '1 kg', kg: 1 },
  poireau: { nom: 'Poireau', caisse: 'GH', unite: '10 kg', kg: 10 },
  'chou-vert': { nom: 'Chou vert', caisse: 'GH', unite: '10 kg', kg: 10 },
  epinard: { nom: 'Épinard (feuille)', caisse: 'GH', unite: '4 kg', kg: 4 },
  'celeri-rave': { nom: 'Céleri-rave', caisse: 'PH', unite: '5 kg', kg: 5 },
};
const c = (n) => ({ n, u: 'colis', by: 'François', at: AT });
const kg = (n) => ({ n, u: 'kg', by: 'François', at: AT });

(async () => {
  const site = await serveurSite();
  const base = await fauxFirebase(PORT_BASE);
  const put = (p, v) => fetch(`${BASE}/${p}.json`, { method: 'PUT', body: JSON.stringify(v) });
  // Deux semaines à venir : la prochaine (W) et la suivante (W2). Lundi : Très Allier mardi ; mercredi : marché et Locavore.
  const W = iso(lundi(1)), LUN = W, MER = plus(W, 2);
  const W2 = iso(lundi(2)), LUN2 = W2, MER2 = plus(W2, 2);
  const deb0 = JSON.parse(fs.readFileSync(path.join(RACINE, 'referentiel/debouches.json'), 'utf8'));
  await put('listes/reglages/debouches', { source: deb0.source, debouches: deb0.debouches, recoltes: deb0.recoltes, rec: true, by: 'François', at: AT });
  const jours = (l, m) => ({ [l]: { livraisons: ['ta-mar'], by: 'François', at: AT }, [m]: { livraisons: ['mk', 'lv'], by: 'François', at: AT } });
  await put('listes/semaines/' + W, {
    produits: { bette: FICHES.bette, carotte: FICHES.carotte, mesclun: FICHES.mesclun, poireau: FICHES.poireau, 'chou-vert': FICHES['chou-vert'], epinard: FICHES.epinard },
    q: {
      bette: { 'ta-mar': c(1), mk: c(1) }, carotte: { 'ta-mar': c(1), mk: c(1) }, mesclun: { 'ta-mar': c(1), mk: c(1) },
      poireau: { 'ta-mar': c(1), mk: c(0.5) }, 'chou-vert': { mk: c(0.5) }, epinard: { lv: kg(2) },
    },
    recoltes: jours(LUN, MER),
  });
  await put('listes/semaines/' + W2, {
    produits: { bette: FICHES.bette, carotte: FICHES.carotte, mesclun: FICHES.mesclun, poireau: FICHES.poireau, 'celeri-rave': FICHES['celeri-rave'] },
    q: {
      bette: { 'ta-mar': c(1), mk: c(1) }, carotte: { 'ta-mar': c(1), mk: c(1) }, mesclun: { 'ta-mar': c(1), mk: c(1) },
      poireau: { 'ta-mar': c(1), mk: c(1) }, 'celeri-rave': { 'ta-mar': c(1) },
    },
    recoltes: jours(LUN2, MER2),
  });
  // Le mercredi de W2 a déjà été trié à la main (avant l'ordre habituel) : il doit garder son ordre.
  const MER2_AVANT = { order: ['mesclun', 'bette', 'carotte'], maj: { order: AT } };
  await put('listes/' + MER2, MER2_AVANT);
  const semW = JSON.stringify(base.lire('listes/semaines/' + W)), semW2 = JSON.stringify(base.lire('listes/semaines/' + W2));

  const nav = await chromium.launch();
  const erreurs = [];
  const ouvrir = async (nom, opts, semaine) => {
    const ctx = await nav.newContext({ ...opts, serviceWorkers: 'block' });
    await ctx.addInitScript(([n, w]) => {
      localStorage.setItem('recolte.qui', JSON.stringify(n));
      if (!localStorage.getItem('recolte.ui')) localStorage.setItem('recolte.ui', JSON.stringify({ semaine: w, view: 'recolte' }));
    }, [nom, semaine]);
    const p = await ctx.newPage();
    p.on('pageerror', (e) => erreurs.push(nom + ' : ' + e.message));
    await p.goto(`http://localhost:${PORT_SITE}/`);
    await p.waitForSelector('#todo li.item');
    await p.waitForTimeout(400);
    return { p, ctx };
  };
  const ORDI = { viewport: { width: 1366, height: 768 }, deviceScaleFactor: CAPTURES ? 2 : 1 };
  const capture = async (p, nom) => { if (!CAPTURES) return; await p.evaluate(() => document.querySelector('#ordreBox').scrollIntoView({ block: 'center' })); await p.screenshot({ path: path.join(CAPTURES, nom + '.png'), fullPage: false }); await p.evaluate(() => scrollTo(0, 0)); };
  const attendre = (p, ms) => p.waitForTimeout(ms || 500);
  const ordre = (p) => p.$$eval('#todo li.item', (e) => e.map((x) => x.dataset.id));
  const info = async (p) => (await p.textContent('#ordreInfo')).trim();
  const bouton = (p) => p.$eval('#ordreBtn', (b) => ({ texte: b.textContent.trim(), actif: !b.disabled, vu: !b.closest('[hidden]') && b.getBoundingClientRect().height > 0, h: Math.round(b.getBoundingClientRect().height) }));
  const habitude = () => base.lire('listes/reglages/ordre');
  const ids = () => { const h = habitude(); return h ? (Array.isArray(h.ids) ? h.ids : Object.values(h.ids)) : []; };
  const enHaut = async (p, id) => { await p.hover(`#todo li.item[data-id="${id}"] .prod`); await p.click(`#todo li.item[data-id="${id}"] .bouger [data-a="haut"]`); await attendre(p, 400); };

  // 1. Au départ : pas d'ordre habituel, ordre alphabétique comme avant, rien d'écrit
  const { p: A } = await ouvrir('Aurore', ORDI, W);
  verifie((await A.getAttribute(`#recJours [data-jour="${LUN}"]`, 'aria-pressed')) === 'true', 'ordinateur d\'Aurore : le lundi de la semaine prochaine s\'ouvre');
  verifie((await ordre(A)).join() === 'bette,carotte,mesclun,poireau', 'sans ordre habituel : l\'ordre alphabétique d\'avant (' + (await ordre(A)).join() + ')');
  let b = await bouton(A);
  verifie(b.vu && b.actif && b.texte === 'Enregistrer cet ordre', 'ordinateur : le bouton « Enregistrer cet ordre » est là, en bas de la liste à récolter');
  verifie((await info(A)).startsWith('Pas encore d\'ordre habituel.'), 'la phrase dit qu\'il n\'y a pas encore d\'ordre habituel');
  verifie(await A.$eval('#ordreBox', (e) => e.previousElementSibling.id === 'todo' && e.nextElementSibling.id === 'doneSec'), 'le bouton est en bas de la liste à récolter, avant « Récoltes déjà effectuées » (le haut de la liste ne bouge pas)');
  verifie(habitude() === null && base.lire('listes/' + LUN) === null, 'ouvrir la liste n\'écrit rien dans la base');
  await capture(A, '1-ordinateur-sans-ordre');

  const { p: F, ctx: ctxF } = await ouvrir('François', devices['Pixel 7'], W);
  await F.click(`#recJours [data-jour="${MER}"]`);
  await attendre(F, 400);
  verifie((await ordre(F)).join() === 'bette,carotte,chou-vert,epinard,mesclun,poireau', 'téléphone de François, mercredi : ordre alphabétique (' + (await ordre(F)).join() + ')');
  b = await bouton(F);
  verifie(b.vu && b.actif && b.h >= 44, 'téléphone : le bouton est là, assez grand pour le doigt (' + b.h + ' px de haut)');

  // 2. Aurore range le lundi (boutons de l'ordinateur), puis enregistre cet ordre
  await enHaut(A, 'poireau');
  await enHaut(A, 'carotte');
  verifie((await ordre(A)).join() === 'carotte,poireau,bette,mesclun', 'lundi rangé : carotte, poireau, bette, mesclun');
  verifie(habitude() === null, 'ranger la liste ne touche pas à l\'ordre habituel (seul le bouton l\'écrit)');
  verifie((await bouton(A)).actif, 'le bouton reste à cliquer');
  await A.click('#ordreBtn');
  await attendre(A, 600);
  let h = habitude();
  verifie(h && ids().join() === 'carotte,poireau,bette,mesclun' && h.by === 'Aurore' && typeof h.at === 'number', 'clic : l\'ordre habituel est dans les réglages de la ferme (listes/reglages/ordre), avec le prénom et l\'heure');
  b = await bouton(A);
  verifie(!b.actif && b.texte === '✓ Ordre habituel' && (await info(A)).startsWith('Cette liste suit l\'ordre habituel (enregistré par Aurore'), 'après le clic : « ✓ Ordre habituel », et la phrase dit qui l\'a enregistré');
  await capture(A, '2-ordinateur-ordre-enregistre');

  // 3. Le mercredi, pas encore trié, prend l'ordre habituel tout seul ; les nouveaux produits à la fin
  await attendre(F, 600);
  verifie((await ordre(F)).join() === 'carotte,poireau,bette,mesclun,chou-vert,epinard', 'téléphone de François : le mercredi suit l\'ordre habituel, chou vert et épinard (pas dans l\'ordre habituel) à la fin (' + (await ordre(F)).join() + ')');
  verifie((await info(F)).includes('placés à la fin : Chou vert, Épinard (feuille)'), 'la phrase nomme les produits placés à la fin');
  verifie(base.lire('listes/' + MER) === null, 'rien n\'est écrit pour le mercredi (ni ordre, ni liste figée)');
  await capture(F, '3-telephone-mercredi');
  await F.click('#ordreBtn');
  await attendre(F, 600);
  verifie(ids().join() === 'carotte,poireau,bette,mesclun,chou-vert,epinard' && habitude().by === 'François', 'téléphone : « Enregistrer cet ordre » ajoute chou vert et épinard à l\'ordre habituel');
  verifie(!(await bouton(F)).actif && base.lire('listes/' + MER) === null, 'le bouton passe à « ✓ Ordre habituel » ; toujours rien d\'écrit pour le mercredi');
  verifie(!(await bouton(A)).actif, 'sur l\'ordinateur d\'Aurore, le lundi suit toujours l\'ordre habituel');

  // 4. La semaine suivante : le lundi s'ouvre dans l'ordre habituel ; le mercredi déjà trié garde son ordre
  const { p: G, ctx: ctxG } = await ouvrir('Aurore', ORDI, W2);
  verifie((await G.getAttribute(`#recJours [data-jour="${LUN2}"]`, 'aria-pressed')) === 'true', 'semaine suivante : le lundi s\'ouvre');
  verifie((await ordre(G)).join() === 'carotte,poireau,bette,mesclun,celeri-rave', 'le lundi suivant s\'ouvre directement dans l\'ordre habituel, le céleri-rave (nouveau) à la fin (' + (await ordre(G)).join() + ')');
  verifie(base.lire('listes/' + LUN2) === null, 'rien n\'est écrit pour ce lundi');
  await G.click(`#recJours [data-jour="${MER2}"]`);
  await attendre(G, 400);
  verifie((await ordre(G)).join() === 'mesclun,bette,carotte,poireau', 'le mercredi déjà trié garde son ordre (mesclun, bette, carotte), le poireau à la fin comme avant');
  verifie((await bouton(G)).actif && (await info(G)).startsWith('Cette liste n\'est pas dans l\'ordre habituel'), 'la phrase dit que cette liste n\'est pas dans l\'ordre habituel');
  verifie(JSON.stringify(base.lire('listes/' + MER2)) === JSON.stringify(MER2_AVANT), 'l\'ordre déjà enregistré du mercredi n\'est pas modifié dans la base');

  // 5. Enregistrer depuis une liste plus courte : les produits absents gardent leur place
  await G.click(`#recJours [data-jour="${LUN2}"]`);
  await attendre(G, 400);
  await enHaut(G, 'mesclun');
  await G.click('#ordreBtn');
  await attendre(G, 600);
  verifie(ids().join() === 'mesclun,carotte,poireau,bette,chou-vert,epinard,celeri-rave', 'mesclun monté en tête puis enregistré : chou vert et épinard restent après la bette (' + ids().join() + ')');
  await attendre(F, 600);
  verifie((await ordre(F)).join() === 'mesclun,carotte,poireau,bette,chou-vert,epinard', 'le mercredi de la semaine prochaine (pas trié) suit le nouvel ordre habituel sur le téléphone de François');

  // 6. Hors ligne : l'ordre attend sur l'ordinateur, puis part au retour du réseau
  await G.click(`#recJours [data-jour="${MER2}"]`);
  await attendre(G, 400);
  await ctxG.setOffline(true); base.couperFlux();
  await attendre(G, 400);
  const avant = JSON.stringify(habitude());
  await G.click('#ordreBtn');
  await attendre(G, 400);
  verifie((await G.textContent('#sync')).trim() === 'Hors ligne · 1 changement en attente' && JSON.stringify(habitude()) === avant, 'sans réseau : « Hors ligne · 1 changement en attente », la base n\'a pas changé');
  verifie(!(await bouton(G)).actif && (await info(G)).includes('pas encore envoyé'), 'sans réseau : le bouton passe à « ✓ Ordre habituel », la phrase dit « pas encore envoyé »');
  await ctxG.setOffline(false);
  await G.waitForFunction(() => document.querySelector('#sync').textContent.includes('Partagé'), null, { timeout: 20000 });
  verifie(ids().join() === 'mesclun,bette,carotte,poireau,chou-vert,epinard,celeri-rave', 'au retour du réseau, l\'ordre du mercredi arrive dans la base (' + ids().join() + ')');
  verifie(JSON.stringify(base.lire('listes/' + MER2)) === JSON.stringify(MER2_AVANT), 'l\'ordre propre du mercredi n\'est toujours pas modifié');

  // 7. La fusion des ordres, cas par cas (la fonction est lue telle quelle dans index.html)
  const src = /function fusionOrdre\(h, l\)\{[\s\S]*?\n\}\n/.exec(fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8'))[0];
  const fusionOrdre = new Function(src + 'return fusionOrdre;')();
  const f = (hh, l) => fusionOrdre(hh, l).join();
  verifie(f([], ['b', 'a']) === 'b,a', 'fusion : sans ordre habituel, l\'ordre de la liste');
  verifie(f(['x', 'a', 'b'], ['a', 'b', 'c']) === 'x,a,b,c', 'fusion : un produit absent en tête reste en tête ; un nouveau va où la liste le met');
  verifie(f(['a', 'b'], ['b', 'a']) === 'b,a' && f(['a', 'x', 'b'], ['a', 'b']) === 'a,x,b', 'fusion : l\'ordre de la liste l\'emporte ; un absent entre deux produits qui n\'ont pas bougé reste entre eux');
  const ech = f(['a', 'x', 'b', 'y'], ['b', 'a']);
  verifie(ech.replace(/[xy],?/g, '').replace(/,$/, '') === 'b,a' && ech.indexOf('x') < ech.indexOf('y'), 'fusion : deux produits échangés, ils restent dans l\'ordre de la liste et les absents gardent leur ordre entre eux (' + ech + ')');

  // 8. Rien d'autre ne bouge
  verifie(JSON.stringify(base.lire('listes/semaines/' + W)) === semW && JSON.stringify(base.lire('listes/semaines/' + W2)) === semW2, 'les semaines (cumul, jours de récolte) ne sont pas touchées');
  verifie(erreurs.length === 0, 'aucune erreur JavaScript' + (erreurs.length ? ' : ' + erreurs.join(' | ') : ''));

  await nav.close(); site.close(); base.close();
  console.log(echecs ? `\n${echecs} échec(s)` : '\nTout est bon.');
  process.exit(echecs ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
