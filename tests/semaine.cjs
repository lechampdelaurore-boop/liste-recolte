// Test de bout en bout de l'onglet « Semaine » (étape 13A) : deux téléphones (François et Aurore) répartissent
// la semaine via un faux Firebase. Vérifie le reste, les unités (colis, kilos, bottes), la case « tout »,
// le reste Auvabio 03 → 63, le hors ligne, la grille sur ordinateur, et que la liste de récolte n'est pas touchée.
// Lancement depuis la racine du dépôt : node tests/semaine.cjs
// Captures d'écran (facultatif) : CAPTURES=dossier node tests/semaine.cjs
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');
const fauxFirebase = require('./faux-firebase.cjs');

const RACINE = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const PORT_SITE = 8794, PORT_BASE = 8795;
const CAPTURES = process.env.CAPTURES || '';

function serveurSite() {
  return new Promise((ok) => {
    const s = http.createServer((q, r) => {
      let f = decodeURIComponent(new URL(q.url, 'http://x').pathname);
      if (f.endsWith('/')) f += 'index.html';
      if (f === '/config.js') { r.writeHead(200, { 'Content-Type': 'text/javascript' }); return r.end(`window.RECOLTE_DB_URL='http://localhost:${PORT_BASE}';`); }
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
  // Une coche existe déjà dans la liste de récolte : l'onglet Semaine ne doit jamais y toucher.
  const listeAvant = { done: { mesclun: { by: 'Aurore', at: 1793730000000 } }, order: ['bette', 'mesclun'] };
  await fetch(`http://localhost:${PORT_BASE}/listes/2026-11-04.json`, { method: 'PUT', body: JSON.stringify(listeAvant) });
  const nav = await chromium.launch();
  const erreurs = [];
  const telephone = async (nom) => {
    const ctx = await nav.newContext({ ...devices['Pixel 7'], serviceWorkers: 'block' });
    await ctx.addInitScript((n) => localStorage.setItem('recolte.qui', JSON.stringify(n)), nom);
    const p = await ctx.newPage();
    p.on('pageerror', (e) => erreurs.push(nom + ' : ' + e.message));
    p.on('dialog', (d) => d.accept());
    await p.goto(`http://localhost:${PORT_SITE}/`);
    await p.waitForSelector('li.item');
    return { p, ctx };
  };
  const { p: A, ctx: ctxA } = await telephone('François');
  const { p: B } = await telephone('Aurore');
  const SEM = iso(lundi(0)), CHEMIN = 'listes/semaines/' + SEM;
  const capture = async (p, nom) => { if (CAPTURES) await p.screenshot({ path: path.join(CAPTURES, nom + '.png'), fullPage: true }); };
  const attendre = (p) => p.waitForTimeout(500);
  const carte = (pid) => `section.sp[data-pid="${pid}"]`;
  const ligne = (pid, k) => `${carte(pid)} .sr[data-k="${k}"]`;
  const saisir = async (p, pid, k, txt) => { await p.fill(ligne(pid, k) + ' input', txt); await p.press(ligne(pid, k) + ' input', 'Enter'); };
  const reste = (p, pid) => p.textContent(carte(pid) + ' .sp-head .reste');
  const ouvrir = async (p, pid) => { if ((await p.getAttribute(carte(pid) + ' .sp-head', 'aria-expanded')) !== 'true') await p.click(carte(pid) + ' .sp-head'); };

  // 1. L'onglet
  verifie(await A.isVisible('[data-view="semaine"]'), 'un onglet « Semaine » à côté de Récolte et Préparation');
  await A.click('[data-view="semaine"]');
  await B.click('[data-view="semaine"]');
  await attendre(A);
  verifie(await A.isVisible('#semView') && !(await A.isVisible('#todo')) && !(await A.isVisible('#crates')) && !(await A.isVisible('#circs')), 'l\'onglet Semaine remplace la liste, les caisses et les filtres de circuit');
  const titre = await A.textContent('#semTitre');
  verifie(titre.includes(lundi(0).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })) && (await A.textContent('#semQuand')) === 'Cette semaine', 's\'ouvre sur la semaine en cours (obtenu « ' + titre + ' »)');
  verifie((await A.isVisible('#semVide')) && (await A.$$('section.sp')).length === 0, 'semaine vide au départ');
  await capture(A, '1-semaine-vide');

  // 2. Ajouter des produits depuis la base des produits (référentiel)
  await A.click('[data-a="ajouter"]');
  await A.fill('#addQ', 'bett');
  const trouves = await A.$$eval('#addList [data-nom]', (e) => e.map((x) => x.dataset.nom));
  verifie(trouves.includes('Bette') && trouves.includes('Betterave Rouge') && !trouves.includes('Mesclun'), 'la recherche « bett » propose bette et betteraves (obtenu ' + trouves.length + ' produits)');
  await A.click('#addList [data-nom="Bette"]');
  verifie(!(await A.$$eval('#addList [data-nom]', (e) => e.map((x) => x.dataset.nom))).includes('Bette'), 'un produit ajouté sort de la liste à ajouter');
  for (const n of ['Radis long rose', 'Tomate Ronde Rouge', 'Mesclun']) { await A.fill('#addQ', n); await A.click(`#addList [data-nom="${n}"]`); }
  await A.click('#addClose');
  await attendre(B);
  const prodsB = await B.$$eval('section.sp', (e) => e.map((x) => x.dataset.pid));
  verifie(prodsB.join() === 'bette,mesclun,radis-long-rose,tomate-ronde-rouge', 'les 4 produits ajoutés par François arrivent chez Aurore, par ordre alphabétique (obtenu ' + prodsB.join() + ')');
  verifie((await B.textContent(carte('bette') + ' .sp-colis')) === 'GH de 5 kg' && (await B.textContent(carte('radis-long-rose') + ' .sp-colis')) === 'GB de 12 bottes', 'chaque produit rappelle le contenu d\'un colis (GH de 5 kg ; GB de 12 bottes)');
  verifie((await reste(B, 'bette')) === 'À remplir', 'un produit sans chiffre est « À remplir »');

  // 3. Répartition de la bette en colis et en kilos ; Reste = disponible − réparti
  await ouvrir(A, 'bette');
  await saisir(A, 'bette', 'dispo', '10');
  verifie((await A.textContent(ligne('bette', 'dispo') + ' .sr-eq')).startsWith('= 50 kg'), 'disponible 10 colis de bette : l\'équivalent 50 kg s\'affiche');
  for (let i = 0; i < 4; i++) await A.click(ligne('bette', 'q/ta-mar') + ' [data-a="plus"]');
  verifie((await A.inputValue(ligne('bette', 'q/ta-mar') + ' input')) === '2', 'quatre appuis sur + : Très Allier mardi à 2 colis (par demi-colis)');
  await A.click(ligne('bette', 'q/ta-mar') + ' [data-a="moins"]');
  await A.click(ligne('bette', 'q/ta-mar') + ' [data-a="plus"]');
  await saisir(A, 'bette', 'q/ps', '10 kg');
  verifie((await A.textContent(ligne('bette', 'q/ps') + ' [data-a="unite"]')) === 'kg' && (await A.textContent(ligne('bette', 'q/ps') + ' .sr-eq')).startsWith('= 2 GH'), '« 10 kg » tapé pour Panier adéquat reste en kilos, = 2 colis');
  await attendre(B);
  verifie((await reste(B, 'bette')) === 'À placer : 6 GH (30 kg)', 'chez Aurore : reste bette = 10 − 2 − 2 = 6 GH (30 kg), à placer (obtenu « ' + (await reste(B, 'bette')) + ' »)');
  verifie(await B.$eval(carte('bette') + ' .sp-head .reste', (x) => x.classList.contains('aplacer')), 'le reste à placer est en orange');
  verifie((await B.textContent(carte('bette') + ' .sp-resume')) === 'Dispo 10 · TA mar 2 · Panier adéq. 10 kg', 'la ligne repliée résume la répartition (obtenu « ' + (await B.textContent(carte('bette') + ' .sp-resume')) + ' »)');
  const q = base.lire(CHEMIN + '/q/bette/ps');
  verifie(q && q.n === 10 && q.u === 'kg' && q.by === 'François' && typeof q.at === 'number', 'la base garde la case telle que saisie (10 kg), avec le prénom et l\'heure');

  // 4. Changer d'unité d'une case : 10 kg → 2 colis
  await A.click(ligne('bette', 'q/ps') + ' [data-a="unite"]');
  verifie((await A.inputValue(ligne('bette', 'q/ps') + ' input')) === '2' && (await A.textContent(ligne('bette', 'q/ps') + ' [data-a="unite"]')) === 'GH', 'le bouton d\'unité convertit 10 kg en 2 colis');

  // 5. Auvabio : un débouché en deux livraisons, reste 03 → 63 calculé, à part, modifiable
  await saisir(A, 'bette', 'q/av03', '5');
  verifie(await A.isChecked(carte('bette') + ' input[data-a="propose"]'), 'une quantité pour Auvabio 03 coche « Proposé à Auvabio »');
  verifie((await A.inputValue(ligne('bette', 'report/av63') + ' input')) === '1' && (await A.textContent(ligne('bette', 'report/av63') + ' .sr-nom')).includes('calculé'), 'reste proposé à Auvabio 63 calculé : 10 − 2 − 2 − 5 = 1 colis');
  await A.click(ligne('bette', 'report/av63') + ' [data-a="moins"]');
  await attendre(B);
  await ouvrir(B, 'bette');
  verifie((await B.inputValue(ligne('bette', 'report/av63') + ' input')) === '0,5' && (await B.textContent(ligne('bette', 'report/av63') + ' .sr-nom')).includes('modifié'), 'François baisse le reste proposé à la 63 à 0,5 : Aurore le voit, marqué « modifié »');
  verifie((await B.textContent(ligne('bette', 'report/av63') + ' .sr-eq')).includes('Calcul : 1 GH (5 kg)'), 'le calcul reste affiché à côté de la valeur modifiée');
  verifie((await reste(B, 'bette')) === 'À placer : 1 GH (5 kg)', 'le reste proposé à la 63 n\'entre pas dans le reste de la ligne (toujours 1 colis)');
  await B.click(ligne('bette', 'report/av63') + ' [data-a="auto"]');
  verifie((await B.inputValue(ligne('bette', 'report/av63') + ' input')) === '1', '« Revenir au calcul » remet 1 colis');
  await B.click(carte('bette') + ' input[data-a="propose"]');
  verifie((await B.$$(ligne('bette', 'report/av63'))).length === 0, 'décocher « Proposé à Auvabio » cache le reste reporté');
  await B.click(carte('bette') + ' input[data-a="propose"]');
  await attendre(A);

  // 6. Manque (rouge)
  await saisir(A, 'bette', 'q/ta-jeu', '3');
  await attendre(B);
  verifie((await reste(B, 'bette')) === 'Manque : 2 GH (10 kg)' && await B.$eval(carte('bette') + ' .sp-head .reste', (x) => x.classList.contains('manque')), 'trop réparti : « Manque : 2 GH (10 kg) » en rouge (obtenu « ' + (await reste(B, 'bette')) + ' »)');
  verifie((await B.inputValue(ligne('bette', 'report/av63') + ' input')) === '0', 'plus rien à proposer à la 63 quand il manque');

  // 7. Produit à l'unité (bottes), unité tapée invalide
  await ouvrir(A, 'radis-long-rose');
  await saisir(A, 'radis-long-rose', 'dispo', '36 bottes');
  verifie((await A.textContent(ligne('radis-long-rose', 'dispo') + ' [data-a="unite"]')) === 'bottes' && (await A.textContent(ligne('radis-long-rose', 'dispo') + ' .sr-eq')).startsWith('= 3 GB'), '« 36 bottes » de radis = 3 colis');
  await saisir(A, 'radis-long-rose', 'q/ta-mar', '2');
  verifie((await reste(A, 'radis-long-rose')) === 'À placer : 1 GB (12 bottes)', 'radis : 3 colis − 2 colis = « 1 GB (12 bottes) » (obtenu « ' + (await reste(A, 'radis-long-rose')) + ' »)');
  await saisir(A, 'radis-long-rose', 'q/mk', '5 kg');
  await A.waitForTimeout(100);
  verifie((await A.textContent(ligne('radis-long-rose', 'q/mk') + ' .sr-err')).includes('Ce produit se compte en GB (grande basse) ou en bottes'), '« 5 kg » pour un produit en bottes est refusé avec une explication');
  verifie(base.lire(CHEMIN + '/q/radis-long-rose/mk') === null, 'rien n\'est enregistré pour une saisie refusée');

  // 8. Case « tout » : un seul créneau par produit, sans chiffre, prend ce qui reste
  await A.click(ligne('radis-long-rose', 'q/mk') + ' [data-a="tout"]');
  verifie((await A.textContent(ligne('radis-long-rose', 'q/mk') + ' .sr-toutv')) === 'Tout ce qui reste : 1 GB (12 bottes)', '« tout » au marché : tout ce qui reste, 1 GB (12 bottes)');
  verifie((await reste(A, 'radis-long-rose')) === 'Placé · tout → Marché ven', 'avec « tout », le radis est placé');
  await ouvrir(A, 'tomate-ronde-rouge');
  await A.click(ligne('tomate-ronde-rouge', 'q/ta-mar') + ' [data-a="tout"]');
  verifie((await reste(A, 'tomate-ronde-rouge')) === 'Placé · tout → TA mar', 'tomate sans disponible connu, « tout » chez Très Allier mardi : placée');
  await A.click(ligne('tomate-ronde-rouge', 'q/ta-jeu') + ' [data-a="tout"]');
  const touts = await A.$$eval(carte('tomate-ronde-rouge') + ' .tout[aria-pressed="true"]', (e) => e.map((x) => x.closest('.sr').dataset.k));
  verifie(touts.join() === 'q/ta-jeu', 'cocher « tout » jeudi décoche mardi : un seul « tout » par produit (obtenu ' + touts.join() + ')');
  await attendre(B);
  verifie((await B.textContent(carte('tomate-ronde-rouge') + ' .sp-resume')).includes('TA jeu tout'), 'Aurore voit « TA jeu tout »');
  const sommaire = await B.textContent('#semSum');
  verifie(sommaire === '4 produits : 2 placés, 0 à placer, 1 en manque, 1 à remplir.', 'le haut de l\'onglet compte les produits placés, à placer, en manque (obtenu « ' + sommaire + ' »)');
  await capture(B, '2-semaine-repartie');

  // 9. Tableau de la semaine
  await B.click('#semTab summary');
  const enTetes = await B.$$eval('#semTable th', (e) => e.map((x) => x.textContent));
  verifie(enTetes.join('|') === 'Produit|Dispo|TA mar|La Magic|Panier adéq.|Locavore|TA jeu|Auvabio 03|Auvabio 63|Marché ven|Élie|Reste|Reste Auvabio 03 → Auvabio 63', 'le tableau a une colonne par créneau, le reste, puis le reste 03 → 63 à part (obtenu ' + enTetes.join('|') + ')');
  const rangBette = await B.$$eval('#semTable tr[data-pid="bette"] td', (e) => e.map((x) => x.textContent));
  verifie(rangBette.join('|') === 'Bette|10|2||2||3|5||||−2 GH (−10 kg)|0', 'ligne bette du tableau (obtenu ' + rangBette.join('|') + ')');
  verifie(await B.evaluate(() => innerWidth === 412 && document.documentElement.scrollWidth <= innerWidth), 'tableau ouvert : la page garde la largeur du téléphone, le tableau défile dans son cadre');
  await capture(B, '3-tableau');

  // 10. Hors ligne : le changement attend, puis part ; la dernière action gagne
  await ctxA.setOffline(true); base.couperFlux();
  await A.waitForTimeout(300);
  await ouvrir(A, 'mesclun');
  await saisir(A, 'mesclun', 'dispo', '4');
  verifie((await A.textContent('#sync')).trim() === 'Hors ligne · 1 changement en attente', 'sans réseau : « Hors ligne · 1 changement en attente » (obtenu « ' + (await A.textContent('#sync')).trim() + ' »)');
  await B.waitForTimeout(800);
  await ouvrir(B, 'radis-long-rose');
  await saisir(B, 'radis-long-rose', 'dispo', '4'); // Aurore change le radis après François
  await A.waitForTimeout(50);
  await ctxA.setOffline(false);
  await A.waitForFunction(() => document.querySelector('#sync').textContent.includes('Partagé'), null, { timeout: 20000 });
  await attendre(B);
  verifie((await B.textContent(carte('mesclun') + ' .sp-resume')).startsWith('Dispo 4'), 'au retour du réseau, le disponible du mesclun saisi hors ligne arrive chez Aurore');
  verifie((await A.textContent(carte('radis-long-rose') + ' .sp-resume')).startsWith('Dispo 4'), 'le changement d\'Aurore pendant ce temps arrive chez François');

  // 11. Semaines : chacune ses données ; reprendre les produits de la semaine précédente
  await A.click('[data-a="semSuiv"]');
  verifie((await A.textContent('#semQuand')) === 'Semaine prochaine' && (await A.$$('section.sp')).length === 0, 'semaine suivante : vide, marquée « Semaine prochaine »');
  await A.click('[data-a="reprendre"]');
  await attendre(A);
  const repris = await A.$$eval('section.sp', (e) => e.map((x) => x.dataset.pid));
  verifie(repris.join() === 'bette,mesclun,radis-long-rose,tomate-ronde-rouge' && (await A.textContent(carte('bette') + ' .reste')) === 'À remplir', 'reprendre les produits de la semaine précédente : mêmes produits, sans les quantités');
  verifie(base.lire('listes/semaines/' + iso(lundi(1)) + '/q') === null, 'la semaine suivante n\'a aucune quantité copiée');
  await A.click('[data-a="semPrec"]');
  verifie((await reste(A, 'bette')) === 'Manque : 2 GH (10 kg)', 'retour à cette semaine : la répartition est toujours là');

  // 12. Retirer un produit
  await ouvrir(A, 'mesclun');
  await A.click(carte('mesclun') + ' [data-a="retirer"]');
  await attendre(B);
  verifie((await B.$$(carte('mesclun'))).length === 0 && base.lire(CHEMIN + '/dispo/mesclun') === null, 'retirer le mesclun l\'enlève chez Aurore, avec ses quantités');

  // 13. Rechargement, base, liste de récolte intacte
  await B.reload(); await B.waitForSelector('#semView:not([hidden]) section.sp');
  verifie((await B.getAttribute('[data-view="semaine"]', 'aria-pressed')) === 'true' && (await reste(B, 'bette')) === 'Manque : 2 GH (10 kg)', 'après rechargement : onglet Semaine et répartition gardés');
  const cr = base.lire(CHEMIN + '/creneaux');
  verifie(Array.isArray(cr) && cr.length === 9 && cr[6].reprend === 'av03', 'la semaine garde sa copie des créneaux dans la base (9 créneaux, Auvabio 63 reprend Auvabio 03)');
  verifie(JSON.stringify(base.lire('listes/2026-11-04')) === JSON.stringify(listeAvant), 'la liste de récolte du 04/11 dans la base est inchangée');
  await B.click('[data-view="recolte"]');
  verifie(await B.isVisible('#todo') && !(await B.isVisible('#semView')) && (await B.textContent('#doneCount')) === '1', 'retour à l\'onglet Récolte : liste et coches inchangées');


  // 14. Sur ordinateur : grille façon tableur (demande de François du 6/11 au soir)
  const ctxC = await nav.newContext({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: CAPTURES ? 2 : 1, serviceWorkers: 'block' });
  await ctxC.addInitScript(() => localStorage.setItem('recolte.qui', JSON.stringify('Martin')));
  const C = await ctxC.newPage();
  C.on('pageerror', (e) => erreurs.push('Martin (PC) : ' + e.message));
  await C.goto(`http://localhost:${PORT_SITE}/`);
  await C.waitForSelector('li.item');
  await C.click('[data-view="semaine"]');
  await C.waitForSelector('#semGrid tbody tr');
  const cellule = (pid, k) => `#semGrid input[data-cell="${pid}|${k}"]`;
  const valeur = (p, pid, k) => p.inputValue(cellule(pid, k));
  const resteG = (p, pid) => p.textContent(`#semGrid tr[data-pid="${pid}"] .g-reste`);
  const focusG = (p) => p.evaluate(() => { const a = document.activeElement; return a && a.dataset.cell ? a.dataset.cell : ''; });
  verifie(await C.isVisible('#semGrid') && !(await C.isVisible('#semList')) && !(await C.isVisible('#semTab')), 'sur ordinateur, l\'onglet Semaine montre la grille à la place des fiches et du tableau du téléphone');
  const larg = await C.evaluate(() => ({ wrap: document.querySelector('.wrap').getBoundingClientRect().width, deborde: document.querySelector('#semGridWrap').scrollWidth > document.querySelector('#semGridWrap').clientWidth, page: document.documentElement.scrollWidth > innerWidth }));
  verifie(larg.wrap > 1200 && !larg.deborde && !larg.page, 'écran de 1366 px : la grille prend la largeur et tient en entier, sans défilement de côté (largeur ' + Math.round(larg.wrap) + ' px)');
  const rangG = await C.$$eval('#semGrid tr[data-pid="bette"] input[data-cell]', (e) => e.map((x) => x.value));
  verifie(rangG.join('|') === '10|2||2||3|5||||' + '0', 'ligne bette de la grille : 10 | 2 | | 2 | | 3 | 5 | | | | puis le reste 03 → 63 (obtenu ' + rangG.join('|') + ')');
  verifie((await resteG(C, 'bette')) === 'Manque : 2 GH (10 kg)', 'reste bette dans la grille : Manque : 2 GH (10 kg)');
  // Taper dans une case, Tab : le reste se met à jour, le curseur est dans la case de droite
  await C.click(cellule('bette', 'q/ta-jeu'));
  await C.keyboard.type('1');
  await C.keyboard.press('Tab');
  await C.waitForTimeout(200);
  verifie((await resteG(C, 'bette')) === 'Placé' && (await focusG(C)) === 'bette|q/av03', 'Très Allier jeudi tapé « 1 » puis Tab : la bette passe à « Placé », le curseur est sur Auvabio 03 (obtenu « ' + (await resteG(C, 'bette')) + ' », ' + (await focusG(C)) + ')');
  await A.waitForTimeout(500);
  verifie((await reste(A, 'bette')) === 'Placé', 'le téléphone de François voit la bette placée');
  // Entrée : case du dessous
  await C.click(cellule('bette', 'dispo'));
  await C.keyboard.press('Enter');
  verifie((await focusG(C)) === 'radis-long-rose|dispo', 'Entrée descend dans la même colonne (disponible du radis)');
  // « tout » tapé au clavier
  await C.click(cellule('tomate-ronde-rouge', 'q/mk'));
  await C.keyboard.type('tout');
  await C.keyboard.press('Enter');
  await C.waitForTimeout(200);
  verifie((await valeur(C, 'tomate-ronde-rouge', 'q/mk')) === 'tout' && (await valeur(C, 'tomate-ronde-rouge', 'q/ta-jeu')) === '', '« tout » tapé au marché pour la tomate : il quitte Très Allier jeudi (un seul « tout »)');
  await C.click(cellule('tomate-ronde-rouge', 'q/mk'));
  await C.keyboard.press('Delete');
  await C.keyboard.press('Enter');
  await C.waitForTimeout(200);
  verifie((await valeur(C, 'tomate-ronde-rouge', 'q/mk')) === '' && base.lire(CHEMIN + '/tout/tomate-ronde-rouge') === null, 'vider la case « tout » retire le « tout »');
  // Unité refusée
  await C.click(cellule('radis-long-rose', 'q/lm'));
  await C.keyboard.type('5 kg');
  await C.keyboard.press('Enter');
  await C.waitForTimeout(200);
  verifie((await C.textContent('#semErrs')).includes('Radis long rose, Panier La Magic · mardi ou jeudi : Ce produit se compte en GB (grande basse) ou en bottes.') && await C.$eval(cellule('radis-long-rose', 'q/lm'), (x) => x.classList.contains('err')), '« 5 kg » pour le radis : message au-dessus de la grille et case en rouge');
  // Reste 03 → 63 : calculé, modifiable, vidé = retour au calcul
  verifie(await C.$eval(cellule('bette', 'report/av63'), (x) => x.classList.contains('auto') && x.value === '0'), 'reste bette proposé à la 63 : 0, calculé (en italique)');
  await C.click(cellule('bette', 'report/av63'));
  await C.keyboard.type('1');
  await C.keyboard.press('Enter');
  await C.waitForTimeout(200);
  verifie((await valeur(C, 'bette', 'report/av63')) === '1' && !(await C.$eval(cellule('bette', 'report/av63'), (x) => x.classList.contains('auto'))) && (await resteG(C, 'bette')) === 'Placé', 'reste proposé à la 63 modifié à 1 : gardé, sans changer le reste de la ligne');
  await C.click(cellule('bette', 'report/av63'));
  await C.keyboard.press('Delete');
  await C.keyboard.press('Enter');
  await C.waitForTimeout(200);
  verifie(await C.$eval(cellule('bette', 'report/av63'), (x) => x.classList.contains('auto') && x.value === '0'), 'case vidée : retour au calcul');
  // Un changement d'un autre téléphone pendant une saisie ne l'efface pas
  await C.click(cellule('radis-long-rose', 'q/ta-jeu'));
  await C.keyboard.type('0,5');
  await ouvrir(A, 'bette');
  await saisir(A, 'bette', 'dispo', '12');
  await C.waitForTimeout(600);
  verifie((await resteG(C, 'bette')) === 'À placer : 2 GH (10 kg)' && (await focusG(C)) === 'radis-long-rose|q/ta-jeu' && (await valeur(C, 'radis-long-rose', 'q/ta-jeu')) === '0,5', 'pendant une saisie, le changement de François arrive (bette à placer : 2 colis) sans effacer « 0,5 » en cours de frappe');
  await C.keyboard.press('Enter');
  await C.waitForTimeout(300);
  const qr = base.lire(CHEMIN + '/q/radis-long-rose/ta-jeu');
  verifie(qr && qr.n === 0.5 && qr.u === 'colis' && qr.by === 'Martin', 'la saisie est ensuite enregistrée : 0,5 colis par Martin');
  // 15. Unité choisie case par case (demande de François du 8/11) : caisse du produit (PB, PH, GB, GH), kg ou bottes
  const menu = (pid, k) => `#semGrid select[data-cell="${pid}|${k}"]`;
  verifie((await C.$$eval(menu('bette', 'q/ta-mar') + ' option', (o) => o.map((x) => x.textContent))).join() === 'GH,kg' && (await C.$$eval(menu('radis-long-rose', 'dispo') + ' option', (o) => o.map((x) => x.textContent))).join() === 'GB,bottes', 'chaque case a son menu d\'unité : GH ou kg pour la bette, GB ou bottes pour le radis');
  verifie((await valeur(C, 'radis-long-rose', 'dispo')) === '4' && (await C.$eval(menu('radis-long-rose', 'dispo'), (x) => x.value)) === 'u', 'le disponible du radis saisi en bottes s\'affiche « 4 » avec « bottes » dans le menu');
  await C.selectOption(menu('radis-long-rose', 'q/ps'), 'u');
  await C.click(cellule('radis-long-rose', 'q/ps'));
  await C.keyboard.type('24');
  await C.keyboard.press('Enter');
  await C.waitForTimeout(300);
  const qps = base.lire(CHEMIN + '/q/radis-long-rose/ps');
  verifie(qps && qps.n === 24 && qps.u === 'u' && (await C.$eval(menu('radis-long-rose', 'q/ps'), (x) => x.value)) === 'u', 'case vide mise en bottes puis « 24 » tapé : enregistré 24 bottes (Panier adéquat commande en bottes)');
  verifie((await C.getAttribute(cellule('radis-long-rose', 'q/ps'), 'title')).startsWith('24 bottes · = 2 GB'), 'au survol : 24 bottes = 2 GB');
  await A.waitForTimeout(300);
  await ouvrir(A, 'radis-long-rose');
  verifie((await A.inputValue(ligne('radis-long-rose', 'q/ps') + ' input')) === '24' && (await A.textContent(ligne('radis-long-rose', 'q/ps') + ' [data-a="unite"]')) === 'bottes', 'le téléphone de François voit 24 bottes pour Panier adéquat');
  await C.selectOption(menu('bette', 'q/ta-mar'), 'kg');
  await C.waitForTimeout(300);
  const qtm = base.lire(CHEMIN + '/q/bette/ta-mar');
  verifie((await valeur(C, 'bette', 'q/ta-mar')) === '10' && qtm.n === 10 && qtm.u === 'kg', 'menu d\'une case remplie passé de GH à kg : 2 GH deviennent 10 kg (même quantité)');
  await C.click(cellule('bette', 'dispo'));
  await C.keyboard.type('10 GH');
  await C.keyboard.press('Enter');
  await C.waitForTimeout(300);
  const qd = base.lire(CHEMIN + '/dispo/bette');
  verifie(qd.n === 10 && qd.u === 'colis' && (await resteG(C, 'bette')) === 'Placé', '« 10 GH » tapé pour la bette : 10 caisses GH, la bette est placée');
  await C.click(cellule('bette', 'q/lv'));
  await C.keyboard.type('3 petites basses');
  await C.keyboard.press('Enter');
  await C.waitForTimeout(300);
  verifie((await C.textContent('#semErrs')).includes('Bette part en GH (grande haute), pas en PB.') && base.lire(CHEMIN + '/q/bette/lv') === null, '« 3 petites basses » pour la bette (en GH) est refusé avec une explication');
  await C.click(cellule('bette', 'q/lv'));
  await C.keyboard.type('1 grande haute');
  await C.keyboard.press('Enter');
  await C.waitForTimeout(300);
  verifie(base.lire(CHEMIN + '/q/bette/lv').n === 1 && base.lire(CHEMIN + '/q/bette/lv').u === 'colis', '« 1 grande haute » est accepté pour la bette');
  await C.click(cellule('bette', 'q/lv'));
  await C.keyboard.press('Delete');
  await C.keyboard.press('Enter');
  await C.waitForTimeout(300);
  await C.evaluate(() => document.activeElement && document.activeElement.blur());
  await capture(C, '4-semaine-ordinateur');
  // Fenêtre étroite : retour aux fiches du téléphone
  await C.setViewportSize({ width: 800, height: 900 });
  await C.waitForTimeout(200);
  verifie(await C.isVisible('#semList section.sp') && !(await C.isVisible('#semGrid')), 'fenêtre rétrécie sous 1000 px : retour aux fiches du téléphone');
  await ctxC.close();

  verifie(erreurs.length === 0, 'aucune erreur JavaScript' + (erreurs.length ? ' : ' + erreurs.join(' | ') : ''));
  await nav.close(); site.close(); base.close();
  process.exit(echecs ? 1 : 0);
})();
