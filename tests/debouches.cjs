// Test de bout en bout de l'écran « Débouchés et livraisons » de l'onglet Semaine (étape 13B) : deux téléphones
// (François et Aurore) et un ordinateur (Martin) via un faux Firebase. Vérifie la reprise des débouchés de départ,
// les jours de livraison (obligatoires), le colis, l'ajout, le retrait (gardé et remis), l'ordre, le partage,
// le hors ligne, que les semaines passées gardent leurs colonnes et que les quantités et la liste de récolte restent.
// Lancement depuis la racine du dépôt : node tests/debouches.cjs
// Captures d'écran (facultatif) : CAPTURES=dossier node tests/debouches.cjs
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');
const fauxFirebase = require('./faux-firebase.cjs');

const RACINE = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const PORT_SITE = 8796, PORT_BASE = 8797;
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
  const SEM = iso(lundi(0)), PASSEE = iso(lundi(-1));
  // Une liste de récolte avec une coche, la semaine en cours avec une quantité pour Locavore, et la semaine
  // dernière avec sa copie des créneaux d'alors (Locavore le mercredi soir) : rien de tout cela ne doit changer.
  const listeAvant = { done: { mesclun: { by: 'Aurore', at: 1793730000000 } }, order: ['bette', 'mesclun'] };
  const bette = { nom: 'Bette', caisse: 'GH', unite: '5 kg', kg: 5 };
  const qLv = { n: 2, u: 'colis', by: 'Aurore', at: 1793730000000 };
  const copieAvant = [
    { id: 'ta-mar', nom: 'Très Allier', jour: 'mardi', court: 'TA mar', circuit: 'ta' },
    { id: 'lv', nom: 'Locavore', jour: 'mercredi soir', court: 'Locavore', circuit: 'lv' },
  ];
  const put = (p, v) => fetch(`${BASE}/${p}.json`, { method: 'PUT', body: JSON.stringify(v) });
  await put('listes/2026-11-04', listeAvant);
  await put('listes/semaines/' + SEM, { produits: { bette }, dispo: { bette: { n: 10, u: 'colis', by: 'Aurore', at: 1793730000000 } }, q: { bette: { lv: qLv } } });
  await put('listes/semaines/' + PASSEE, { produits: { bette }, q: { bette: { lv: qLv } }, creneaux: copieAvant });

  const nav = await chromium.launch();
  const erreurs = [];
  const ouvrirPage = async (nom, opts) => {
    const ctx = await nav.newContext({ ...opts, serviceWorkers: 'block' });
    await ctx.addInitScript((n) => localStorage.setItem('recolte.qui', JSON.stringify(n)), nom);
    const p = await ctx.newPage();
    p.on('pageerror', (e) => erreurs.push(nom + ' : ' + e.message));
    p.on('dialog', (d) => d.accept());
    await p.goto(`http://localhost:${PORT_SITE}/`);
    await p.waitForSelector('li.item');
    return { p, ctx };
  };
  const { p: A, ctx: ctxA } = await ouvrirPage('François', devices['Pixel 7']);
  const { p: B } = await ouvrirPage('Aurore', devices['Pixel 7']);
  const capture = async (p, nom) => { if (CAPTURES) await p.screenshot({ path: path.join(CAPTURES, nom + '.png'), fullPage: true }); };
  const attendre = (p, ms) => p.waitForTimeout(ms || 500);
  const fiche = (d) => `#debView section.db[data-d="${d}"]`;
  const livr = (d, l) => `${fiche(d)} .dl[data-l="${l}"]`;
  const jour = (d, l, j) => `${livr(d, l)} input[data-j="${j}"]`;
  const jours = (p, d, l) => p.$$eval(`${livr(d, l)} input[data-j]:checked`, (e) => e.map((x) => x.dataset.j));
  const noms = (p) => p.$$eval('#debView .db-list section.db[data-d]', (e) => e.map((x) => x.querySelector('[data-f="nom"]').value));
  const enTete = (p) => p.$$eval('#semTable thead th', (e) => e.map((x) => x.textContent.trim()));
  const reglages = () => base.lire('listes/reglages/debouches');
  const debDe = (id) => (reglages().debouches || []).filter((d) => d.id === id)[0];

  // 1. L'écran
  await A.click('[data-view="semaine"]');
  await B.click('[data-view="semaine"]');
  await A.waitForSelector('#semView section.sp');
  verifie(await A.isVisible('[data-view="reglages"]'), 'un onglet « Réglages » (refonte du 8/11 : les débouchés sortent de la Semaine)');
  await A.click('[data-view="reglages"]');
  await A.waitForSelector('#debView section.db');
  verifie(await A.isVisible('#debView') && !(await A.isVisible('#semView')) && (await A.getAttribute('[data-reg="debouches"]', 'aria-pressed')) === 'true', 'l\'onglet Réglages s\'ouvre sur « Débouchés et livraisons »');

  // 2. Les débouchés de départ, repris de referentiel/debouches.json
  const n0 = await noms(A);
  verifie(n0.join(',') === 'Très Allier,Panier La Magic,Panier adéquat,Locavore,Auvabio,Marché de Tronget,Élie', 'les 7 débouchés actuels sont repris, dans l\'ordre (obtenu ' + n0.join(',') + ')');
  verifie((await jours(A, 'ta', 'ta-mar')).join() === 'mardi' && (await jours(A, 'ta', 'ta-jeu')).join() === 'jeudi', 'Très Allier : deux livraisons, mardi et jeudi');
  verifie((await jours(A, 'lm', 'lm')).join() === 'mardi,jeudi', 'Panier La Magic : mardi ou jeudi (une livraison, jour selon la semaine)');
  verifie((await A.inputValue(`${fiche('ps')} [data-f="colis"]`)) === 'bois' && (await A.inputValue(`${livr('ps', 'ps')} [data-f="moment"]`)) === 'début d\'après-midi', 'Panier adéquat : colis bois, mercredi début d\'après-midi');
  verifie((await A.inputValue(`${fiche('ta')} [data-f="colis"]`)) === 'plastique' && (await A.inputValue(`${fiche('av')} [data-f="colis"]`)) === '', 'Très Allier en caisses plastique ; Auvabio : colis non précisé');
  verifie((await A.inputValue(`${livr('av', 'av63')} [data-f="reprend"]`)) === 'av03', 'Auvabio : deux livraisons, la 63 reprend le reste de la 03');
  verifie((await jours(A, 'el', 'el')).join() === 'au choix', 'Élie : n\'importe quel jour');
  verifie(reglages() === null, 'rien n\'est écrit dans la base tant qu\'on ne modifie rien');
  await capture(A, '5-debouches');

  // 3. Jours de livraison : au moins un, obligatoire
  await A.click(jour('lv', 'lv', 'mercredi'));
  await attendre(A, 300);
  verifie((await A.textContent(livr('lv', 'lv'))).includes('Chaque livraison a au moins un jour') && (await A.isChecked(jour('lv', 'lv', 'mercredi'))) && reglages() === null, 'décocher le seul jour de Locavore est refusé, avec une explication');
  await A.click(jour('lv', 'lv', 'jeudi'));
  await attendre(A, 300);
  verifie((await jours(A, 'lv', 'lv')).join() === 'mercredi,jeudi', 'Locavore : mercredi ou jeudi');
  await A.click(jour('lv', 'lv', 'mercredi'));
  await attendre(A);
  const lv = debDe('lv');
  verifie(lv && lv.livraisons[0].jours.join() === 'jeudi' && reglages().by === 'François' && reglages().at > 0, 'Locavore passé au jeudi : la base garde toute la fiche, avec le prénom et l\'heure');
  verifie((await A.textContent(`${livr('lv', 'lv')} .dl-titre`)).includes('jeudi soir') && (await A.textContent('#debView .sp-by')).startsWith('Dernière modification : François'), 'la fiche affiche « jeudi soir » et qui a modifié');
  verifie(reglages().debouches.length === 7 && debDe('ta').livraisons.length === 2 && debDe('av').livraisons[1].reprend === 'av03', 'les autres débouchés sont repris tels quels dans la base');

  // 4. La semaine suit : chez Aurore, Locavore passe après Très Allier jeudi
  await attendre(B);
  await B.click('[data-sem="tableau"]');
  const t1 = await enTete(B);
  verifie(t1.slice(0, 12).join('|') === 'Produit|Dispo|Stock Très Allier|TA mar|La Magic|Panier adéq.|TA jeu|Locavore|Auvabio 03|Auvabio 63|Marché ven|Élie', 'chez Aurore, la colonne Locavore passe au jeudi, après Très Allier jeudi (obtenu ' + t1.join('|') + ')');
  const ligneB = await B.$$eval('#semTable tr[data-pid="bette"] td', (e) => e.map((x) => x.textContent));
  verifie(ligneB[7] === '2' && JSON.stringify(base.lire('listes/semaines/' + SEM + '/q/bette/lv')) === JSON.stringify(qLv), 'les 2 GH de bette déjà réparties pour Locavore restent, dans sa colonne');

  // 5. Nouveau débouché
  await A.click('[data-a="nouveau"]');
  await attendre(A, 300);
  verifie((await A.textContent('#debView .db-new')).includes('Donner un nom au débouché.'), 'nouveau débouché sans nom : refusé, avec une explication');
  await A.fill('#debNom', 'Ferme Deschamps');
  await A.selectOption('#debColis', 'bois');
  await A.click('[data-a="nouveau"]');
  await attendre(A, 300);
  verifie((await A.textContent('#debView .db-new')).includes('Cocher au moins un jour de livraison') && (await A.inputValue('#debNom')) === 'Ferme Deschamps', 'nouveau débouché sans jour : refusé, le nom tapé reste');
  await A.click('#debView .db-new input[data-j="mercredi"]');
  await A.click('[data-a="nouveau"]');
  await attendre(A);
  const fd = debDe('ferme-deschamps');
  verifie(fd && fd.colis === 'bois' && fd.livraisons[0].id === 'ferme-deschamps' && fd.livraisons[0].jours.join() === 'mercredi', 'Ferme Deschamps ajoutée : colis bois, mercredi');
  verifie((await noms(A)).slice(-1)[0] === 'Ferme Deschamps' && (await A.inputValue('#debNom')) === '', 'elle arrive en bas de la liste ; la fiche « Nouveau débouché » est vidée');
  await attendre(B);
  const t2 = await enTete(B);
  verifie(t2.indexOf('Ferme Deschamps') === t2.indexOf('Panier adéq.') + 1, 'chez Aurore, une colonne Ferme Deschamps le mercredi, après Panier adéquat (obtenu ' + t2.slice(0, 13).join('|') + ')');

  // 6. Seconde livraison, qui reprend le reste de la première
  await A.click(`${fiche('ferme-deschamps')} [data-a="ajouterL"]`);
  await attendre(A);
  verifie((await A.$$(`${fiche('ferme-deschamps')} .dl`)).length === 2 && debDe('ferme-deschamps').livraisons[1].id === 'ferme-deschamps-mer', 'une seconde livraison s\'ajoute (même jour au départ)');
  await A.click(jour('ferme-deschamps', 'ferme-deschamps-mer', 'vendredi'));
  await attendre(A, 300);
  await A.click(jour('ferme-deschamps', 'ferme-deschamps-mer', 'mercredi'));
  await attendre(A, 300);
  await A.fill(`${livr('ferme-deschamps', 'ferme-deschamps-mer')} [data-f="court"]`, 'Deschamps ven');
  await A.press(`${livr('ferme-deschamps', 'ferme-deschamps-mer')} [data-f="court"]`, 'Enter');
  await attendre(A, 300);
  await A.selectOption(`${livr('ferme-deschamps', 'ferme-deschamps-mer')} [data-f="reprend"]`, 'ferme-deschamps');
  await attendre(A);
  const l2 = debDe('ferme-deschamps').livraisons[1];
  verifie(l2.jours.join() === 'vendredi' && l2.court === 'Deschamps ven' && l2.reprend === 'ferme-deschamps', 'seconde livraison : vendredi, nom court « Deschamps ven », reprend le reste du mercredi');
  await attendre(B);
  const t3 = await enTete(B);
  verifie(t3.includes('Deschamps ven') && t3.includes('Reste Ferme Deschamps → Deschamps ven'), 'chez Aurore : colonne du vendredi et reste reporté, comme pour Auvabio');

  // 7. Retirer une livraison, puis la remettre
  await A.click(`${livr('ferme-deschamps', 'ferme-deschamps-mer')} [data-a="retirerL"]`);
  await attendre(A);
  const l3 = debDe('ferme-deschamps').livraisons[1];
  verifie(l3.archive === true && (await A.$$(`${fiche('ferme-deschamps')} .dl`)).length === 1 && (await A.textContent('#debView .db-ret summary')) === 'Retirés (1)', 'livraison retirée : gardée dans la base, rangée dans « Retirés (1) »');
  verifie(!(await A.isVisible(`${livr('ferme-deschamps', 'ferme-deschamps')} [data-a="retirerL"]`)), 'la dernière livraison d\'un débouché ne peut pas être retirée seule');
  await A.click('#debView .db-ret summary');
  await A.click('#debView .db-ret li[data-l="ferme-deschamps-mer"] [data-a="remettre"]');
  await attendre(A);
  verifie(!debDe('ferme-deschamps').livraisons[1].archive && (await A.$$(`${fiche('ferme-deschamps')} .dl`)).length === 2, '« Remettre » la fait revenir');

  // 8. Ordre des débouchés (départage des colonnes d'un même jour)
  await A.click(`${fiche('ferme-deschamps')} [data-a="monter"]`);
  await attendre(A);
  verifie((await noms(A)).slice(-2).join() === 'Ferme Deschamps,Élie' && reglages().debouches.map((d) => d.id).slice(-2).join() === 'ferme-deschamps,el', '▲ fait monter Ferme Deschamps au-dessus d\'Élie');

  // 9. Retirer un débouché qui a des quantités cette semaine : sa colonne reste, marquée « retiré »
  await fetch(`${BASE}/listes/semaines/${SEM}.json`, { method: 'PATCH', body: JSON.stringify({ 'q/bette/ferme-deschamps': { n: 1, u: 'colis', by: 'Aurore', at: Date.now() } }) });
  await A.click(`${fiche('ferme-deschamps')} [data-a="retirerD"]`);
  await attendre(A);
  await attendre(B);
  const t4 = await enTete(B);
  verifie(debDe('ferme-deschamps').archive === true && !(await noms(A)).includes('Ferme Deschamps'), 'débouché retiré : gardé dans la base, il quitte la liste');
  verifie(t4.includes('Ferme Deschamps') && !t4.includes('Deschamps ven'), 'chez Aurore, sa colonne du mercredi reste (1 GH de bette y est réparti), celle du vendredi, vide, disparaît');
  await A.click('#debView .db-ret summary').catch(() => {});
  if (!(await A.isVisible('#debView .db-ret li[data-d="ferme-deschamps"]:not([data-l]) [data-a="remettre"]'))) await A.click('#debView .db-ret summary');
  await A.click('#debView .db-ret li[data-d="ferme-deschamps"]:not([data-l]) [data-a="remettre"]');
  await attendre(A);
  verifie(!debDe('ferme-deschamps').archive && (await noms(A)).includes('Ferme Deschamps'), '« Remettre » fait revenir le débouché avec ses deux livraisons');

  // 10. Sur ordinateur : la grille de la semaine suit ; la semaine passée garde ses colonnes
  const ctxC = await nav.newContext({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: CAPTURES ? 2 : 1, serviceWorkers: 'block' });
  await ctxC.addInitScript(() => localStorage.setItem('recolte.qui', JSON.stringify('Martin')));
  const C = await ctxC.newPage();
  C.on('pageerror', (e) => erreurs.push('Martin (PC) : ' + e.message));
  await C.goto(`http://localhost:${PORT_SITE}/`);
  await C.waitForSelector('li.item');
  await C.click('[data-view="semaine"]');
  await C.waitForSelector('#semGrid tbody tr');
  const thC = await C.$$eval('#semGrid thead th', (e) => e.map((x) => x.textContent.trim()));
  verifie(thC.includes('Locavorejeudi soir') && thC.includes('Ferme Deschampsmercredi'), 'sur ordinateur, la grille montre Locavore jeudi soir et Ferme Deschamps mercredi');
  verifie(thC[2] === 'Stock Très Allierau magasin, hors du reste' && (await C.$$('#semGrid input[data-cell="bette|stock/ta"]')).length === 1, 'sur ordinateur, une colonne « Stock Très Allier » (au magasin, hors du reste) suit le disponible');
  const larg = await C.evaluate(() => ({ deborde: document.querySelector('#semGridWrap').scrollWidth > document.querySelector('#semGridWrap').clientWidth, page: document.documentElement.scrollWidth > innerWidth }));
  verifie(!larg.page, 'avec deux colonnes de plus, la page ne défile pas de côté (la grille ' + (larg.deborde ? 'défile dans son cadre' : 'tient en entier') + ')');
  await C.click('[data-a="semPrec"]');
  await C.waitForSelector('#semGrid tbody tr');
  const thP = await C.$$eval('#semGrid thead th', (e) => e.map((x) => x.textContent.trim()));
  verifie(thP.includes('Locavoremercredi soir') && !thP.some((t) => t.startsWith('Ferme Deschamps')), 'la semaine dernière garde ses colonnes d\'alors (Locavore mercredi soir, pas de Ferme Deschamps)');
  verifie(JSON.stringify(base.lire('listes/semaines/' + PASSEE + '/creneaux')) === JSON.stringify(copieAvant), 'la copie des créneaux de la semaine dernière n\'est pas touchée dans la base');
  await C.click('[data-a="semSuiv"]');
  await C.click('[data-view="reglages"]');
  await C.waitForSelector('#debView section.db');
  const largD = await C.evaluate(() => ({ cols: getComputedStyle(document.querySelector('#debView .db-list')).gridTemplateColumns.split(' ').length, page: document.documentElement.scrollWidth > innerWidth }));
  verifie(largD.cols === 2 && !largD.page, 'sur ordinateur, les fiches des débouchés sont sur deux colonnes, sans défilement de côté');
  await capture(C, '6-debouches-ordinateur');
  await ctxC.close();

  // 11. Hors ligne : la modification attend, puis part
  await ctxA.setOffline(true); base.couperFlux();
  await attendre(A, 300);
  await A.fill(`${fiche('el')} [data-f="note"]`, 'Client individuel, commande par téléphone.');
  await A.press(`${fiche('el')} [data-f="note"]`, 'Enter');
  await attendre(A, 300);
  verifie((await A.textContent('#sync')).trim() === 'Hors ligne · 1 changement en attente' && (await A.inputValue(`${fiche('el')} [data-f="note"]`)) === 'Client individuel, commande par téléphone.', 'sans réseau : la remarque d\'Élie s\'affiche, « Hors ligne · 1 changement en attente »');
  await ctxA.setOffline(false);
  await A.waitForFunction(() => document.querySelector('#sync').textContent.includes('Partagé'), null, { timeout: 20000 });
  verifie(debDe('el').note === 'Client individuel, commande par téléphone.', 'au retour du réseau, la remarque arrive dans la base');

  // 12. Jours de récolte (demande de François du 8/11) : quelles livraisons on récolte chaque jour
  const rj = (r) => `#debView section.rj[data-r="${r}"]`;
  const coches = (p, r) => p.$$eval(`${rj(r)} input[data-rf="liv"]:checked`, (e) => e.map((x) => x.dataset.c));
  const rec = () => (reglages().recoltes || []).map((r) => r.jour + ':' + (r.livraisons || []).join(','));
  await A.click('[data-reg="recoltes"]');
  await A.waitForSelector(rj('lun'));
  verifie(!(await A.isVisible('#debView .db-list section.db[data-d]')), 'page « Jours de récolte » des Réglages : les fiches des débouchés n\'y sont pas');
  verifie((await A.inputValue(`${rj('lun')} select[data-rf="jour"]`)) === 'lundi' && (await coches(A, 'lun')).join() === 'ta-mar,lm', 'jour de récolte du lundi repris de l\'exemple de François : Très Allier mardi et Panier La Magic');
  verifie((await coches(A, 'mer')).sort().join() === 'av03,av63,lv,mk,ps,ta-jeu', 'mercredi : Panier adéquat, Locavore, Très Allier jeudi, Auvabio 03 et 63, marché de Tronget');
  verifie((await A.textContent('#debView .rj-sans')).includes('Élie au choix') && (await A.textContent('#debView .rj-sans')).includes('Ferme Deschamps mercredi'), 'les livraisons sans jour de récolte sont signalées (Élie, Ferme Deschamps)');
  await A.click(`${rj('lun')} input[data-c="ferme-deschamps"]`);
  await attendre(A);
  verifie(rec().join(' ; ') === 'lundi:ta-mar,lm,ferme-deschamps ; mercredi:ps,lv,ta-jeu,av03,av63,mk', 'Ferme Deschamps mercredi cochée au lundi : enregistré dans la base (obtenu ' + rec().join(' ; ') + ')');
  verifie((await A.textContent(`${rj('mer')} input[data-c="ferme-deschamps"] + span`)).includes('(récoltée le lundi)'), 'au mercredi, elle est marquée « récoltée le lundi »');
  await A.click(`${rj('mer')} input[data-c="ferme-deschamps"]`);
  await attendre(A);
  verifie(rec().join(' ; ') === 'lundi:ta-mar,lm ; mercredi:ps,lv,ta-jeu,av03,av63,mk,ferme-deschamps', 'la cocher au mercredi la retire du lundi : une livraison n\'est récoltée qu\'un jour');
  await A.click('#debView [data-a="ajouterR"]');
  await attendre(A);
  verifie(rec().length === 3 && (await A.inputValue(`${rj('mar')} select[data-rf="jour"]`)) === 'mardi', '« Ajouter un jour de récolte » : un mardi, vide');
  await A.selectOption(`${rj('mar')} select[data-rf="jour"]`, 'vendredi');
  await attendre(A, 300);
  await A.click(`${rj('mar')} input[data-c="ta-mar"]`);
  await attendre(A);
  verifie((await A.textContent(rj('mar'))).includes('Récoltée après sa livraison : Très Allier mardi'), 'Très Allier mardi récolté le vendredi : signalé « récoltée après sa livraison »');
  await A.click(`${rj('mar')} [data-a="retirerR"]`);
  await attendre(A);
  verifie(rec().join(' ; ') === 'lundi:lm ; mercredi:ps,lv,ta-jeu,av03,av63,mk,ferme-deschamps' && (await A.textContent('#debView .rj-sans')).includes('Très Allier mardi'), 'jour de récolte retiré : Très Allier mardi n\'a plus de jour de récolte, c\'est signalé');
  await A.click(`${rj('lun')} input[data-c="ta-mar"]`);
  await attendre(A);
  // Dans la semaine : ce qu'il y a à récolter chaque jour
  await attendre(B);
  await B.click('[data-sem="recolter"]');
  const jourRec = (r) => `#semRecList .rc-jour[data-r="${r}"]`;
  verifie(await B.isVisible('#semRec') && (await B.textContent(jourRec('mer') + ' h3')).startsWith('Mercredi'), 'l\'onglet Semaine montre « À récolter, jour par jour »');
  const betteMer = await B.textContent(jourRec('mer') + ' li[data-pid="bette"]');
  verifie(betteMer.includes('Bette') && betteMer.includes('3 GH (15 kg)') && betteMer.includes('Locavore 2') && betteMer.includes('Ferme Deschamps 1'), 'mercredi : bette 3 GH (15 kg), soit Locavore 2 et Ferme Deschamps 1 (obtenu « ' + betteMer + ' »)');
  verifie((await B.textContent(jourRec('lun'))).includes('Rien à récolter.'), 'lundi : rien à récolter (aucune quantité pour Très Allier mardi ni La Magic)');

  // 13. Stock chez Très Allier (fin de 13B) : saisi par la ferme, information hors du reste
  await A.click('[data-reg="debouches"]');
  await A.waitForSelector(fiche('ta'));
  await B.click('[data-sem="repartir"]');
  verifie(await A.isChecked(`${fiche('ta')} input[data-f="stock"]`) && !(await A.isChecked(`${fiche('lv')} input[data-f="stock"]`)), 'la fiche Très Allier suit son stock au magasin (pas celle de Locavore)');
  const sp = (pid) => `section.sp[data-pid="${pid}"]`;
  const caseStock = sp('bette') + ' .sr[data-k="stock/ta"]';
  if ((await B.getAttribute(sp('bette') + ' .sp-head', 'aria-expanded')) !== 'true') await B.click(sp('bette') + ' .sp-head');
  const resteAvant = await B.textContent(sp('bette') + ' .sp-head .reste');
  verifie(await B.isVisible(caseStock) && (await B.textContent(caseStock + ' .sr-nom')).startsWith('Stock chez Très Allier'), 'chez Aurore, la bette a une case « Stock chez Très Allier »');
  await B.fill(caseStock + ' input', '3'); await B.press(caseStock + ' input', 'Enter');
  await attendre(B);
  const s1 = base.lire('listes/semaines/' + SEM + '/stock/bette/ta');
  verifie(s1 && s1.n === 3 && s1.u === 'colis' && s1.by === 'Aurore' && s1.at > 0, 'Aurore saisit 3 GH de bette en stock : enregistré avec son prénom et l\'heure');
  verifie((await B.textContent(sp('bette') + ' .sp-head .reste')) === resteAvant, 'le stock n\'entre pas dans le reste (toujours « ' + resteAvant + ' »)');
  await B.click('[data-sem="tableau"]');
  verifie((await enTete(B)).includes('Stock Très Allier'), 'le tableau de la semaine a une colonne « Stock Très Allier »');
  await B.click('[data-sem="repartir"]');
  await A.click('[data-view="semaine"]');
  await A.waitForSelector(sp('bette'));
  if ((await A.getAttribute(sp('bette') + ' .sp-head', 'aria-expanded')) !== 'true') await A.click(sp('bette') + ' .sp-head');
  verifie((await A.inputValue(caseStock + ' input')) === '3', 'François voit le stock saisi par Aurore');
  await A.fill(caseStock + ' input', '2'); await A.press(caseStock + ' input', 'Enter');
  await attendre(B);
  verifie((await B.inputValue(caseStock + ' input')) === '2' && (await B.textContent(caseStock + ' .sr-eq')).includes('François'), 'François le corrige à 2 : Aurore voit 2, modifié par François (la dernière modification l\'emporte)');
  await A.fill(caseStock + ' input', 'tout'); await A.press(caseStock + ' input', 'Enter');
  await attendre(A, 300);
  verifie((await A.textContent(caseStock)).includes('« tout » se met seulement dans un créneau de vente') && base.lire('listes/semaines/' + SEM + '/stock/bette/ta').n === 2, '« tout » est refusé pour le stock');
  await A.fill(caseStock + ' input', '2'); await A.press(caseStock + ' input', 'Enter');
  await A.click('[data-view="reglages"]');
  await A.waitForSelector('#debView section.db');
  await A.click(`${fiche('ta')} input[data-f="stock"]`);
  await attendre(B);
  verifie(!debDe('ta').stock && (await B.isVisible(caseStock)), 'stock décoché pour Très Allier : la case reste dans cette semaine tant qu\'elle a un chiffre');
  await A.click(`${fiche('ta')} input[data-f="stock"]`);
  await attendre(A);
  verifie(debDe('ta').stock === true, 'stock recoché');

  // 13 bis. Page « Stock » de la Semaine (demande de François du 8/11 : le stock qu'on remplit nous-mêmes, à un endroit intelligent)
  await fetch(`${BASE}/listes/semaines/${SEM}.json`, { method: 'PATCH', body: JSON.stringify({ 'q/bette/ta-mar': { n: 3, u: 'colis', by: 'François', at: Date.now() } }) });
  await attendre(B);
  await B.click('[data-sem="stock"]');
  const stk = (pid) => `#semStkList .stk-l[data-pid="${pid}"]`;
  await B.waitForSelector(stk('bette'));
  verifie(!(await B.isVisible('#semList')) && (await B.inputValue(stk('bette') + ' input')) === '2' && (await B.textContent('#semStkList h2')) === 'Stock chez Très Allier', 'page « Stock » de la Semaine : un champ par produit, avec le stock déjà saisi (bette : 2)');
  const prevuBette = await B.textContent(stk('bette') + ' .sr-eq');
  verifie(prevuBette.includes('Prévu cette semaine : TA mar 3'), 'à côté du stock, ce qui est prévu pour Très Allier cette semaine (obtenu « ' + prevuBette + ' »)');
  await B.fill(stk('bette') + ' input', '1'); await B.press(stk('bette') + ' input', 'Enter');
  await attendre(B);
  const sm = base.lire('listes/semaines/' + SEM + '/stock/bette/ta');
  verifie(sm && sm.n === 1 && sm.by === 'Aurore' && (await B.textContent('#semStkList .sp-by')).startsWith('1 produit sur 1 renseigné · dernière saisie : Aurore'), 'stock de la bette changé dans la page Stock : enregistré (Aurore), « 1 produit sur 1 renseigné · dernière saisie : Aurore »');
  await B.click(stk('bette') + ' [data-a="plus"]');
  await attendre(B);
  verifie(base.lire('listes/semaines/' + SEM + '/stock/bette/ta').n === 1.5, 'le bouton + ajoute un demi-colis au stock');
  await B.fill(stk('bette') + ' input', '2'); await B.press(stk('bette') + ' input', 'Enter');
  await attendre(B);
  // Le stock se place juste avant les livraisons de son débouché : on suit aussi celui de Locavore (jeudi soir)
  await A.click(`${fiche('lv')} input[data-f="stock"]`);
  await attendre(B);
  await B.click('[data-sem="tableau"]');
  const t5 = await enTete(B);
  verifie(t5.indexOf('Stock Locavore') === t5.indexOf('Locavore') - 1 && t5.indexOf('Stock Très Allier') === t5.indexOf('TA mar') - 1, 'chaque stock est juste avant la première livraison de son débouché (obtenu ' + t5.join('|') + ')');
  await B.click('[data-sem="stock"]');
  verifie((await B.$$('#semStkList .stk-bloc')).length === 2, 'page Stock : un bloc par débouché suivi');
  await A.click(`${fiche('lv')} input[data-f="stock"]`);
  await attendre(B);
  verifie((await B.$$('#semStkList .stk-bloc')).length === 1 && !debDe('lv').stock, 'stock de Locavore décoché : son bloc disparaît');
  await B.click('[data-sem="repartir"]');

  // 14. Rechargement, retour à la semaine, rien d'autre de touché
  await A.reload(); await A.waitForSelector('#debView section.db');
  verifie((await A.inputValue(`${fiche('el')} [data-f="note"]`)) === 'Client individuel, commande par téléphone.' && (await jours(A, 'lv', 'lv')).join() === 'jeudi', 'après rechargement : écran des débouchés et modifications gardés');
  await A.click('[data-view="semaine"]');
  await A.waitForSelector('#semView section.sp', { timeout: 3000 }).catch(() => {});
  verifie(await A.isVisible('#semView section.sp') && !(await A.isVisible('#debView')), 'l\'onglet Semaine ramène la répartition');
  verifie(JSON.stringify(base.lire('listes/2026-11-04')) === JSON.stringify(listeAvant), 'la liste de récolte du 04/11 dans la base est inchangée');
  verifie(JSON.stringify(base.lire('listes/semaines/' + SEM + '/q/bette/lv')) === JSON.stringify(qLv) && base.lire('listes/semaines/' + SEM + '/dispo/bette').n === 10, 'les quantités de la semaine en cours sont inchangées');

  verifie(erreurs.length === 0, 'aucune erreur JavaScript' + (erreurs.length ? ' : ' + erreurs.join(' | ') : ''));
  await nav.close(); site.close(); base.close();
  process.exit(echecs ? 1 : 0);
})();
