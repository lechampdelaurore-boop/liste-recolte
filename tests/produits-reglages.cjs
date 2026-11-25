// Test de la section « Produits » des Réglages (étape 50, plan validé par François le 25/11/2026, docs/DECISIONS.md) :
// la fiche de chaque produit (caisse habituelle, caisse par débouché, poids moyen d'une unité, « Archivé ») et le bouton
// « Nouveau produit ». Enregistré dans la base (listes/reglages/produits/<pid>), fichier du référentiel comme départ.
// Un changement de caisse ne touche la semaine en cours qu'après « Oui », et jamais ses quantités ; sans réponse ou
// avec « Non », seules les prochaines semaines le prennent. Jamais de renommage. Aucun flux en direct de plus.
// Données factices (faux Firebase).
// Lancement depuis la racine du dépôt : node tests/produits-reglages.cjs (APPARENCE=pixel pour le pixel art)
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');
const { PIXEL, sautePixel } = require('./apparence-env.cjs');
const fauxFirebase = require('./faux-firebase.cjs');

const RACINE = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' };
const PORT_SITE = 9010, PORT_BASE = 9011;
const BASE = `http://localhost:${PORT_BASE}`;
const CAPTURES = process.env.CAPTURES || '';

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
const numSem = (id) => { const p = id.split('-'); const d = new Date(+p[0], p[1] - 1, +p[2] + 3); const j1 = new Date(d.getFullYear(), 0, 4); return 1 + Math.round(((d - j1) / 864e5 - 3 + (j1.getDay() + 6) % 7) / 7); };
const attendreQue = async (fn, ms = 8000) => { const fin = Date.now() + ms; while (Date.now() < fin) { if (await fn()) return true; await new Promise((x) => setTimeout(x, 150)); } return false; };
const net = (t) => String(t || '').replace(/\s+/g, ' ').trim();
const sansMeta = (o) => { if (!o) return o; const x = { ...o }; delete x.by; delete x.at; return x; };

(async () => {
  const REF = JSON.parse(fs.readFileSync(path.join(RACINE, 'referentiel/conditionnements.json'), 'utf8'));
  const visibles = REF.produits.filter((p) => !p.masque).length;
  const site = await serveurSite();
  const base = await fauxFirebase(PORT_BASE);
  const SEM = iso(lundi(0)), SUIV = iso(lundi(1)), MER = plus(SEM, 2), N = numSem(SEM);
  const A0 = 1793730000000, q = (n, u) => ({ n, u: u || 'colis', by: 'Aurore', at: A0 });
  const put = (p, v) => fetch(`${BASE}/${p}.json`, { method: 'PUT', body: JSON.stringify(v) });
  // Semaine en cours déjà saisie : céleri-branche en GB (2 colis pour Très Allier jeudi, 1 au marché), bette en GH, aillet.
  const CB = { nom: 'Céleri-branche', caisse: 'GB', unite: '5 kg', kg: 5, by: 'Aurore', at: A0 };
  const BETTE = { nom: 'Bette', caisse: 'GH', unite: '5 kg', kg: 5, by: 'Aurore', at: A0 };
  const AILLET = { nom: 'Aillet', caisse: 'GB', unite: 'Botte (x10)', par_colis: 10, type: 'botte', by: 'Aurore', at: A0 };
  const QS = { 'celeri-branche': { 'ta-jeu': q(2), mk: q(1) }, bette: { mk: q(1) }, aillet: { mk: q(1) } };
  await put('listes/semaines/' + SEM, { produits: { 'celeri-branche': CB, bette: BETTE, aillet: AILLET }, q: QS });

  const nav = await chromium.launch();
  const erreurs = [];
  // Chaque flux en direct ouvert par l'appli est noté (au plus quatre : liste, semaine, débouchés, ordre).
  const espion = () => { const E = window.EventSource; window.__flux = []; window.EventSource = function (u, o) { window.__flux.push(String(u).replace(/\?.*$/, '')); return new E(u, o); }; window.EventSource.prototype = E.prototype; };
  const ctx = await nav.newContext({ ...devices['Pixel 7'], serviceWorkers: 'block' });
  await ctx.addInitScript(() => localStorage.setItem('recolte.qui', JSON.stringify('Martin')));
  await ctx.addInitScript(espion);
  const T = await ctx.newPage();
  T.on('pageerror', (e) => erreurs.push(e.message));
  T.on('dialog', (d) => d.accept());
  const capture = async (P, nom) => { if (CAPTURES) await P.screenshot({ path: path.join(CAPTURES, (PIXEL ? 'pixel-' : 'classique-') + nom + '.png') }); };
  await T.goto(`http://localhost:${PORT_SITE}/`);
  await T.click('[data-view="semaine"]');
  await T.waitForSelector('#semList section.sp[data-pid="celeri-branche"]');

  // 1. Une 5e page « Produits » dans les Réglages, avec la recherche et le bouton « Nouveau produit »
  await T.click('[data-view="reglages"]');
  const pages = await T.$$eval('#regSub button', (b) => b.filter((x) => !x.hidden).map((x) => x.textContent.trim()));
  verifie(pages.join() === 'Débouchés,Jours de récolte,Produits,Apparence', 'Réglages : pages ' + pages.join(', '));
  await T.click('#regSub [data-reg="produits"]');
  await T.waitForSelector('.pr-page .pr');
  const n0 = await T.$$eval('.pr-list > .pr', (e) => e.length);
  verifie(n0 === visibles, `tous les produits du référentiel sont listés (${n0} sur ${visibles} ; « Persil frisé (bouquet) », remplacé, n'y est pas)`);
  verifie(await T.$('.pr-page [data-pa="nouveau"]') !== null && await T.$('#prQ') !== null, 'en haut : la recherche et le bouton « Nouveau produit »');
  await capture(T, 'tel-1-liste');
  await T.fill('#prQ', 'celeri');
  const trouves = await T.$$eval('.pr-list > .pr:not([hidden]) .pr-nom', (e) => e.map((x) => x.firstChild.textContent));
  verifie(trouves.join(' / ') === 'Céleri-branche / Céleri-branche en bouquet / Céleri-rave', 'recherche « celeri » (sans accent) : ' + trouves.join(' / '));
  const resume = net(await T.textContent('.pr[data-p="celeri-branche"] .pr-nom small'));
  verifie(resume === 'GB de 5 kg · 650 g l\'unité', 'résumé du céleri-branche replié : « ' + resume + ' »');

  // 2. La fiche dépliée : caisse, contenu (non modifiable), poids moyen, une ligne par débouché, interrupteur « Archivé »
  await T.click('.pr[data-p="celeri-branche"] [data-pa="plier"]');
  await T.waitForSelector('.pr[data-p="celeri-branche"] [data-pf="caisse"]');
  const C = '.pr[data-p="celeri-branche"] ';
  verifie(await T.inputValue(C + '[data-pf="caisse"]') === 'GB', 'caisse habituelle : GB');
  verifie(net(await T.textContent(C + '.pr-info b')) === '5 kg' && await T.$(C + '.pr-info input') === null, 'contenu « 5 kg », affiché, pas modifiable');
  verifie(await T.inputValue(C + '[data-pf="poids"]') === '650', 'poids moyen d\'une unité : 650 g (valeur de départ du référentiel)');
  const debs = await T.$$eval(C + '[data-pf="deb"]', (s) => s.map((x) => x.dataset.deb + '=' + x.options[x.selectedIndex].text));
  verifie(debs.length === 7 && debs.includes('ta=Comme d\'habitude (GB)') && debs.includes('ps=Comme d\'habitude (Grand colis bois)'),
    'une ligne par débouché, « comme d\'habitude » nommé (Panier adéquat en colis bois) : ' + debs.join(', '));
  const choix = await T.$$eval(C + '[data-pf="deb"][data-deb="ta"] option', (o) => o.map((x) => x.value || '—'));
  verifie(choix.join() === '—,PB,PH,GB,GH,CB,bois:PB,bois:PH,bois:GB', 'choix pour un débouché : comme d\'habitude, PB, PH, GB, GH, caisse bleue, petit/moyen/grand colis bois (' + choix.join() + ')');
  verifie(await T.$eval(C + '[data-pf="archive"]', (x) => x.getAttribute('role') === 'switch' && !x.checked), 'interrupteur « Archivé » : en service');
  verifie(await T.$(C + '[data-pf="nom"]') === null && await T.$$eval(C + 'input[type="text"]', (e) => e.length) === 0, 'aucune case pour renommer le produit');
  verifie(await T.$eval(C + '[data-pa="enregistrer"]', (b) => b.disabled), '« Enregistrer » grisé tant que rien ne change');

  // 3. Caisse GB → GH, et grand colis bois pour Très Allier ; « Enregistrer » : la base garde la fiche, la semaine ne bouge pas
  const semAvant = JSON.stringify(base.lire('listes/semaines/' + SEM));
  await T.selectOption(C + '[data-pf="caisse"]', 'GH');
  verifie(net(await T.$eval(C + '[data-pf="deb"][data-deb="ta"]', (s) => s.options[0].text)) === 'Comme d\'habitude (GH)', '« comme d\'habitude » suit la nouvelle caisse (GH)');
  await T.selectOption(C + '[data-pf="deb"][data-deb="ta"]', 'bois:GB');
  await capture(T, 'tel-2-fiche');
  await T.click(C + '[data-pa="enregistrer"]');
  await attendreQue(() => base.lire('listes/reglages/produits/celeri-branche'));
  const fcb = base.lire('listes/reglages/produits/celeri-branche') || {};
  verifie(JSON.stringify(sansMeta(fcb)) === JSON.stringify({ produit: 'Céleri-branche', caisse: 'GH', unite: '5 kg', kg: 5, poids_unite: 0.65, par_debouche: { ta: 'bois:GB' } }) && fcb.by === 'Martin' && fcb.at > A0,
    'base : listes/reglages/produits/celeri-branche, fiche entière, avec qui et quand (' + JSON.stringify(fcb) + ')');
  verifie(JSON.stringify(base.lire('listes/semaines/' + SEM)) === semAvant, 'la semaine en cours n\'a pas changé (pas encore de réponse)');
  await T.waitForSelector(C + '.pr-question');
  const qtxt = net(await T.textContent(C + '.pr-question'));
  verifie(qtxt.includes('Semaine ' + N + ' :') && qtxt.includes('en GB') && qtxt.includes('Oui, aussi la semaine ' + N) && qtxt.includes('Non, seulement les prochaines semaines') && qtxt.includes('pas les quantités'),
    'question : « ' + qtxt + ' »');
  await capture(T, 'tel-3-question');

  // 4. « Oui » : la fiche de la semaine prend GH et le grand colis bois pour Très Allier ; quantités intactes
  await T.click(C + '[data-pa="oui"]');
  await attendreQue(() => (base.lire(`listes/semaines/${SEM}/produits/celeri-branche`) || {}).caisse === 'GH');
  const sf = base.lire(`listes/semaines/${SEM}/produits/celeri-branche`) || {};
  verifie(sf.caisse === 'GH' && JSON.stringify(sf.par_debouche) === '{"ta":"bois:GB"}' && sf.kg === 5 && sf.unite === '5 kg' && sf.nom === 'Céleri-branche', 'semaine ' + N + ' : céleri-branche en GH, grand colis bois pour Très Allier, même contenu (' + JSON.stringify(sf) + ')');
  verifie(JSON.stringify(base.lire(`listes/semaines/${SEM}/q`)) === JSON.stringify(QS), 'quantités de la semaine inchangées');
  verifie(JSON.stringify(base.lire(`listes/semaines/${SEM}/produits/bette`)) === JSON.stringify(BETTE), 'les autres produits de la semaine inchangés');
  await T.waitForSelector(C + '.pr-fait');
  await capture(T, 'tel-4-fait');

  // 5. Récolte de mercredi : 1 GH (marché) et 2 grands colis bois (Très Allier), rappelés sous les caisses
  await T.click('[data-view="recolte"]');
  await T.waitForSelector('#recJours button');
  await T.click(`#recJours [data-jour="${MER}"]`);
  await T.waitForSelector('li.item[data-id="celeri-branche"]');
  await T.click('#crates summary');
  await T.waitForTimeout(200);
  const tuiles = await T.$$eval('.crate', (e) => e.map((x) => x.dataset.c + '=' + x.querySelector('b').textContent).filter((x) => !/=0$/.test(x)));
  verifie(tuiles.join(', ') === 'GB=1, GH=2, Grand colis bois=2', 'caisses à remplir : céleri GH au marché, bette GH, aillet GB, céleri en grand colis bois pour Très Allier (obtenu ' + tuiles.join(', ') + ')');
  const rappel = net(await T.textContent('#crateAlt'));
  verifie(rappel.includes('Céleri-branche pour Très Allier : grand colis bois.'), 'rappel sous les caisses : « ' + rappel + ' »');
  await T.evaluate(() => document.querySelector('#crateAlt').scrollIntoView({ block: 'end' }));
  await capture(T, 'tel-5-recolte');

  // 6. Bette GH → PH, « Non » : la semaine en cours garde GH ; la semaine suivante propose PH
  await T.click('[data-view="reglages"]');
  await T.waitForSelector('.pr-page');
  await T.fill('#prQ', 'bette');
  await T.click('.pr[data-p="bette"] [data-pa="plier"]');
  await T.selectOption('.pr[data-p="bette"] [data-pf="caisse"]', 'PH');
  await T.click('.pr[data-p="bette"] [data-pa="enregistrer"]');
  await T.waitForSelector('.pr[data-p="bette"] [data-pa="non"]');
  await T.click('.pr[data-p="bette"] [data-pa="non"]');
  await attendreQue(() => (base.lire('listes/reglages/produits/bette') || {}).caisse === 'PH');
  await T.waitForTimeout(400);
  verifie(JSON.stringify(base.lire(`listes/semaines/${SEM}/produits/bette`)) === JSON.stringify(BETTE), '« Non » : la semaine en cours garde la bette en GH');
  verifie(net(await T.textContent('.pr[data-p="bette"] .pr-fait')).includes('garde ses caisses'), '« Non » : c\'est dit dans la fiche');

  // 7. Poids moyen changé (700 g) : écrit dans la base en kilos, repris par les unités, rien dans la semaine
  await T.fill('#prQ', 'celeri-branche');
  await T.fill(C + '[data-pf="poids"]', '700');
  verifie(await T.$eval(C + '[data-pa="enregistrer"]', (b) => !b.disabled), 'une saisie active « Enregistrer » sans redessiner la fiche');
  await T.click(C + '[data-pa="enregistrer"]');
  await attendreQue(() => (base.lire('listes/reglages/produits/celeri-branche') || {}).poids_unite === 0.7);
  verifie((base.lire('listes/reglages/produits/celeri-branche') || {}).poids_unite === 0.7, 'poids moyen écrit dans la base : 0,7 kg');
  verifie(net(await T.textContent(C + '.pr-nom small')) === 'GH de 5 kg · 700 g l\'unité · Très Allier : Grand colis bois', 'résumé : « ' + net(await T.textContent(C + '.pr-nom small')) + ' »');
  // 10 unités pour Locavore (mercredi) : 7 kg de plus dans la récolte du jour (2 GH pour Très Allier, 1 au marché : 15 kg).
  await put(`listes/semaines/${SEM}/q/celeri-branche/lv`, { n: 10, u: 'u', by: 'Aurore', at: A0 + 1 });
  await T.click('[data-view="recolte"]');
  await T.waitForSelector('li.item[data-id="celeri-branche"]');
  const kgU = await attendreQue(async () => /22 kg/.test(net(await T.textContent('li.item[data-id="celeri-branche"] .qty'))));
  verifie(kgU, 'les unités de la semaine comptent 700 g : 10 unités + 15 kg = 22 kg (obtenu « ' + net(await T.textContent('li.item[data-id="celeri-branche"] .qty')) + ' »)');
  await T.click('[data-view="reglages"]');
  await T.waitForSelector('.pr-page');
  verifie(!('poids_unite' in (base.lire(`listes/semaines/${SEM}/produits/celeri-branche`) || {})), 'le poids moyen n\'est pas recopié dans la semaine');

  // 8. Archiver l'aillet : plus proposé à l'ajout, toujours dans la semaine où il est déjà, rangé dans « Produits archivés »
  await T.fill('#prQ', 'aillet');
  await T.click('.pr[data-p="aillet"] [data-pa="plier"]');
  await T.click('.pr[data-p="aillet"] .pr-arch');
  verifie(await T.$eval('.pr[data-p="aillet"] [data-pf="archive"]', (x) => x.checked), 'l\'interrupteur glisse sur « Archivé »');
  await capture(T, 'tel-6-archive');
  await T.click('.pr[data-p="aillet"] [data-pa="enregistrer"]');
  await attendreQue(() => (base.lire('listes/reglages/produits/aillet') || {}).archive === true);
  verifie((base.lire('listes/reglages/produits/aillet') || {}).archive === true, 'base : aillet archivé');
  await T.waitForSelector('.pr-ret .pr[data-p="aillet"]');
  verifie(net(await T.textContent('.pr-ret summary')) === 'Produits archivés (1)', 'l\'aillet passe dans « Produits archivés (1) »');
  verifie(JSON.stringify(base.lire(`listes/semaines/${SEM}/produits/aillet`)) === JSON.stringify(AILLET), 'la semaine où il est déjà le garde');

  // 9. Nouveau produit : nom déjà pris refusé ; « Topinambour violet » PH de 6 kg, 80 g l'unité
  await T.fill('#prQ', '');
  await T.click('.pr-page [data-pa="nouveau"]');
  await T.fill('#prNom', 'bette');
  await T.fill('#prN', '5');
  await T.click('[data-pa="ajouter"]');
  verifie(net(await T.textContent('.pr-new .sr-err')) === '« Bette » existe déjà.', 'nom déjà pris : refusé (« Bette » existe déjà)');
  await T.fill('#prNom', 'Topinambour violet');
  await T.selectOption('#prCaisse', 'PH');
  await T.fill('#prN', '6');
  await T.fill('#prPoids', '80');
  await capture(T, 'tel-7-nouveau');
  await T.click('[data-pa="ajouter"]');
  await attendreQue(() => base.lire('listes/reglages/produits/topinambour-violet'));
  const tp = base.lire('listes/reglages/produits/topinambour-violet') || {};
  verifie(JSON.stringify(sansMeta(tp)) === JSON.stringify({ produit: 'Topinambour violet', caisse: 'PH', unite: '6 kg', kg: 6, poids_unite: 0.08 }), 'base : nouveau produit (' + JSON.stringify(tp) + ')');
  verifie(!base.lire('listes/reglages/produits/bette') || base.lire('listes/reglages/produits/bette').caisse === 'PH', 'le refus n\'a rien écrit sur la bette');
  verifie(await T.$('.pr[data-p="topinambour-violet"].db-ouvert') !== null, 'la fiche du nouveau produit est ouverte');

  // 10. Semaine suivante, « Ajouter un produit » : bette en PH, céleri-branche en GH, topinambour proposé, aillet non
  await T.click('[data-view="semaine"]');
  await T.click('[data-sem="repartir"]');
  await T.click('[data-a="semSuiv"]');
  await T.waitForSelector('#semVide [data-a="reprendre"]');
  await T.click('[data-a="ajouter"]');
  await T.waitForSelector('#addDlg[open]');
  const cherche = async (t) => { await T.fill('#addQ', t); await T.waitForTimeout(150); return T.$$eval('#addList button', (e) => e.map((x) => x.querySelector('span').textContent + ' | ' + x.querySelector('small').textContent)); };
  verifie((await cherche('bette')).includes('Bette | PH de 5 kg'), 'ajout : Bette en PH de 5 kg');
  verifie((await cherche('topinambour')).join() === 'Topinambour violet | PH de 6 kg', 'ajout : le nouveau produit est proposé');
  const ail = await cherche('ail');
  verifie(ail.includes('Ail sec | PH de 5 kg') && !ail.some((x) => /^Aillet/.test(x)), 'ajout : l\'aillet archivé n\'est plus proposé, l\'ail sec oui (' + ail.join(' / ') + ')');
  await T.fill('#addQ', 'celeri-branche');
  await T.waitForTimeout(150);
  await T.click('#addList button[data-pid="celeri-branche"]');
  await attendreQue(() => base.lire(`listes/semaines/${SUIV}/produits/celeri-branche`));
  const s2 = base.lire(`listes/semaines/${SUIV}/produits/celeri-branche`) || {};
  verifie(s2.caisse === 'GH' && JSON.stringify(s2.par_debouche) === '{"ta":"bois:GB"}', 'semaine suivante : le céleri-branche prend ses réglages (' + JSON.stringify(s2) + ')');
  await T.click('#addClose');

  // 11. Aucun flux en direct de plus ; un autre téléphone lit les réglages dans la base
  const flux = await T.evaluate(() => window.__flux);
  verifie(!flux.some((u) => /reglages\/produits/.test(u)) && new Set(flux.map((u) => u.replace(/semaines\/.*$/, 'semaines').replace(/listes\/\d{4}-.*$/, 'liste'))).size <= 4, 'aucun flux en direct sur les produits (flux ouverts : ' + [...new Set(flux)].map((u) => u.replace(BASE, '')).join(', ') + ')');
  const ctx2 = await nav.newContext({ ...devices['Pixel 7'], serviceWorkers: 'block' });
  await ctx2.addInitScript(() => { localStorage.setItem('recolte.qui', JSON.stringify('Aurore')); localStorage.setItem('recolte.ui', JSON.stringify({ view: 'reglages', regPage: 'produits' })); });
  const T2 = await ctx2.newPage();
  T2.on('pageerror', (e) => erreurs.push('2e téléphone : ' + e.message));
  await T2.goto(`http://localhost:${PORT_SITE}/`);
  verifie(await attendreQue(() => T2.$('.pr[data-p="topinambour-violet"]')), 'autre téléphone : le nouveau produit est là');
  const b2 = net(await T2.textContent('.pr[data-p="bette"] .pr-nom small'));
  verifie(b2.startsWith('PH de 5 kg'), 'autre téléphone : la bette en PH (« ' + b2 + ' »)');
  await ctx2.close();

  // 12. Rien ne déborde : téléphone étroit et ordinateur
  for (const [l, h] of [[360, 760], [1366, 768]]) {
    const c3 = await nav.newContext({ viewport: { width: l, height: h }, hasTouch: l < 1000, isMobile: l < 1000, serviceWorkers: 'block', locale: 'fr-FR' });
    await c3.addInitScript(() => { localStorage.setItem('recolte.qui', JSON.stringify('Aurore')); localStorage.setItem('recolte.ui', JSON.stringify({ view: 'reglages', regPage: 'produits' })); });
    const P = await c3.newPage();
    P.on('pageerror', (e) => erreurs.push(l + ' px : ' + e.message));
    await P.goto(`http://localhost:${PORT_SITE}/`);
    await P.waitForSelector('.pr[data-p="celeri-branche"]');
    await P.click('.pr[data-p="celeri-branche"] [data-pa="plier"]');
    await P.click('.pr-page [data-pa="nouveau"]');
    await P.evaluate(() => document.fonts.ready); await P.waitForTimeout(300);
    const m = await P.evaluate(() => ({ large: document.scrollingElement.scrollWidth, vue: innerWidth, sort: Array.from(document.querySelectorAll('.pr-page *')).filter((e) => e.offsetWidth && e.getBoundingClientRect().right > innerWidth + 0.5).length }));
    verifie(m.large <= m.vue && m.sort === 0, `${l} px : rien ne sort de l'écran (${JSON.stringify(m)})`);
    if (l === 1366) {
      const t = await P.$$eval('#regSub button', (b) => b.filter((x) => x.offsetWidth).map((x) => Math.round(x.getBoundingClientRect().top)));
      verifie(new Set(t).size === 1, 'ordinateur : les pages des Réglages sur une ligne');
      await P.screenshot({ path: CAPTURES ? path.join(CAPTURES, (PIXEL ? 'pixel-' : 'classique-') + 'pc-produits.png') : '/dev/null' }).catch(() => {});
    } else if (CAPTURES) await P.screenshot({ path: path.join(CAPTURES, (PIXEL ? 'pixel-' : 'classique-') + 'tel360-nouveau.png') });
    await c3.close();
  }

  verifie(erreurs.length === 0, 'aucune erreur JavaScript' + (erreurs.length ? ' : ' + erreurs.join(' | ') : ''));
  await nav.close(); site.close(); base.close();
  console.log(echecs ? `\n${echecs} échec(s)` : '\nTout est bon.');
  process.exit(echecs ? 1 : 0);
})().catch((x) => { console.error(x); process.exit(1); });
