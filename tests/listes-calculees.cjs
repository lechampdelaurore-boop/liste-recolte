// Test de bout en bout de l'étape 13D : les listes de récolte se remplissent toutes seules depuis l'onglet Semaine.
// Deux téléphones (François et Aurore) via un faux Firebase. Vérifie : le message « le cumul est vide », la liste
// du 4/11 refaite par l'outil et comparée ligne à ligne au fichier, le menu des jours de récolte, la liste figée à
// la première coche et ses écarts signalés, la Préparation qui suit, les jours de récolte de la semaine (ajout,
// livraison déplacée, « Chaque semaine », retrait), les messages des semaines sans jour ou sans rien à récolter,
// la liste en fichier qui l'emporte pour sa date, le hors ligne en changeant de jour, et que rien d'autre ne bouge.
// Lancement depuis la racine du dépôt : node tests/listes-calculees.cjs
// Captures d'écran (facultatif) : CAPTURES=dossier node tests/listes-calculees.cjs
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');
const fauxFirebase = require('./faux-firebase.cjs');

const RACINE = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const PORT_SITE = 8798, PORT_BASE = 8799;
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

// La liste du 4/11 (fichier fait à la main) refaite dans une semaine : mêmes fiches de produit qu'alors
// (céleri-branche en GB, persil à 10 bouquets) et mêmes quantités, livraison par livraison.
const FICHES = {
  mesclun: { nom: 'Mesclun', caisse: 'PH', unite: '1 kg', kg: 1 },
  epinard: { nom: 'Épinard (feuille)', caisse: 'GH', unite: '4 kg', kg: 4 },
  bette: { nom: 'Bette', caisse: 'GH', unite: '5 kg', kg: 5 },
  tomates: { nom: 'Tomates (ronde rouge, cerise, ancienne pop.)', unite: 'PH 5 kg / PB 3 kg / GB 6 kg' },
  aromatiques: { nom: 'Aromatiques', caisse: 'PB', unite: 'Botte (x6)', par_colis: 6, type: 'botte' },
  rhubarbe: { nom: 'Rhubarbe', caisse: 'GB', unite: '7 kg', kg: 7 },
  'chou-frise': { nom: 'Chou frisé', caisse: 'GH', unite: '6 kg', kg: 6 },
  'chou-vert': { nom: 'Chou vert', caisse: 'GH', unite: '10 kg', kg: 10 },
  'chou-rouge': { nom: 'Chou rouge', caisse: 'GH', unite: '10 kg', kg: 10 },
  radis: { nom: "Radis d'hiver en mélange", caisse: 'PH', unite: '5 kg', kg: 5 },
  'radis-noir': { nom: 'Radis noir rond', caisse: 'PH', unite: '5 kg', kg: 5 },
  'celeri-rave': { nom: 'Céleri-rave', caisse: 'PH', unite: '5 kg', kg: 5 },
  panais: { nom: 'Panais', caisse: 'PH', unite: '5 kg', kg: 5 },
  carotte: { nom: 'Carotte lavée', caisse: 'PH', unite: '8 kg', kg: 8 },
  betterave: { nom: 'Betterave rouge', caisse: 'PH', unite: '7 kg', kg: 7 },
  endive: { nom: 'Endive', caisse: 'PH', unite: '5 kg', kg: 5 },
  butternut: { nom: 'Courge butternut', unite: 'pièce', par_colis: 1, type: 'pièce' },
  potimarron: { nom: 'Courge potimarron', unite: 'pièce', par_colis: 1, type: 'pièce' },
  'patate-douce': { nom: 'Patate douce', caisse: 'PH', unite: '6 kg', kg: 6 },
};
const c = (n) => ({ n, u: 'colis', by: 'François', at: 1793730000000 });
const kg = (n) => ({ n, u: 'kg', by: 'François', at: 1793730000000 });
const un = (n) => ({ n, u: 'u', by: 'François', at: 1793730000000 });
// Circuits du fichier → livraisons de la semaine : ta → Très Allier jeudi, av → Auvabio 03, les autres à l'identique.
const Q = {
  mesclun: { 'ta-jeu': c(1), mk: c(1) },
  epinard: { 'ta-jeu': c(2), mk: c(1), lv: kg(2.5) },
  bette: { 'ta-jeu': c(1), mk: c(1.5), ps: c(3.5), lv: kg(3) },
  aromatiques: { 'ta-jeu': c(0.5), mk: c(0.5) },
  rhubarbe: { lv: kg(1.5) },
  'chou-frise': { mk: c(0.5) }, 'chou-vert': { mk: c(0.5) }, 'chou-rouge': { mk: c(0.5) },
  radis: { mk: c(1) }, 'radis-noir': { lm: c(1) }, 'celeri-rave': { mk: c(0.5) }, panais: { mk: c(0.5) },
  carotte: { mk: c(2), fd: c(1) }, betterave: { mk: c(0.5) },
  endive: { 'ta-jeu': c(2), mk: c(1), av03: c(7) },
  butternut: { lv: un(2) }, potimarron: { lv: un(3) },
  'patate-douce': { mk: c(1), lm: kg(5) },
};
// Trois lignes du fichier mêlent, pour un même produit, deux unités que la semaine ne sait pas porter
// (céleri-branche en kilos et en bottes, persil en bouquets et en botte, poireau en kilos et en pièces) : non comparées.
const NON_COMPAREES = ['celeri-branche', 'persil', 'poireau'];

(async () => {
  const site = await serveurSite();
  const base = await fauxFirebase(PORT_BASE);
  const put = (p, v) => fetch(`${BASE}/${p}.json`, { method: 'PUT', body: JSON.stringify(v) });
  const patch = (p, v) => fetch(`${BASE}/${p}.json`, { method: 'PATCH', body: JSON.stringify(v) });
  // La semaine prochaine : jamais la semaine du 4/11, dont le fichier l'emporte.
  const W = iso(lundi(1)), LUN = W, MAR = plus(W, 1), MER = plus(W, 2);
  const listeAvant = { done: { mesclun: { by: 'Aurore', at: 1793730000000 } }, order: ['bette', 'mesclun'] };
  await put('listes/2026-11-04', listeAvant);
  const fichier = JSON.parse(fs.readFileSync(path.join(RACINE, 'listes/2026-11-04.json'), 'utf8'));
  const deb0 = JSON.parse(fs.readFileSync(path.join(RACINE, 'referentiel/debouches.json'), 'utf8'));

  const nav = await chromium.launch();
  const erreurs = [];
  const telephone = async (nom) => {
    const ctx = await nav.newContext({ ...devices['Pixel 7'], serviceWorkers: 'block' });
    await ctx.addInitScript(([n, w]) => {
      localStorage.setItem('recolte.qui', JSON.stringify(n));
      if (!localStorage.getItem('recolte.ui')) localStorage.setItem('recolte.ui', JSON.stringify({ semaine: w }));
    }, [nom, W]);
    const p = await ctx.newPage();
    p.on('pageerror', (e) => erreurs.push(nom + ' : ' + e.message));
    p.on('dialog', (d) => d.accept());
    await p.goto(`http://localhost:${PORT_SITE}/`);
    return { p, ctx };
  };
  const capture = async (p, nom) => { if (CAPTURES) await p.screenshot({ path: path.join(CAPTURES, nom + '.png'), fullPage: true }); };
  const attendre = (p, ms) => p.waitForTimeout(ms || 500);
  const texte = async (p, sel) => ((await p.$(sel)) ? (await p.textContent(sel)).trim() : '');
  const visible = (p, sel) => p.isVisible(sel);
  const qte = (p, id) => p.$eval(`li.item[data-id="${id}"] .qty`, (e) => ({ total: e.childNodes[0] ? e.childNodes[0].textContent : '', kg: e.querySelector('small') ? e.querySelector('small').textContent : '' }));

  // 1. Semaine vide : « Le cumul de cette semaine est vide », sur Récolte et Préparation
  const { p: A, ctx: ctxA } = await telephone('François');
  await A.waitForSelector('#videBox:not([hidden])');
  verifie((await texte(A, '#videBox')).startsWith('Le cumul de cette semaine est vide.') && !(await A.$('li.item')) && !(await visible(A, '#recJours')), 'semaine sans rien : Récolte dit « Le cumul de cette semaine est vide. », sans liste ni menu');
  verifie((await texte(A, '#recSem')).startsWith('Semaine du ') && (await visible(A, '#recSem')), 'Récolte rappelle la semaine choisie (elle se choisit dans l\'onglet Semaine)');
  await capture(A, '1-cumul-vide');
  await A.click('[data-view="prep"]');
  verifie((await texte(A, '#videBox')).startsWith('Le cumul de cette semaine est vide.') && !(await visible(A, '#prepList')), 'Préparation : même message');
  await A.click('#videBox [data-a="aller-semaine"]');
  await attendre(A, 300);
  verifie(await visible(A, '#semView') && (await A.getAttribute('[data-sem="repartir"]', 'aria-pressed')) === 'true', '« Remplir la semaine » ouvre l\'onglet Semaine, page Répartir');
  verifie((await A.textContent('[data-sem="cumul"]')) === 'Cumul' && !(await A.$('[data-sem="tableau"]')) && (await A.textContent('.brand span')) === 'Cumul', 'la page « Tableau » s\'appelle « Cumul » ; l\'appli s\'appelle « Cumul » (en-tête ; demande de François du 8/11)');

  // 2. La liste du 4/11 refaite par l'outil, comparée ligne à ligne au fichier
  const reglages = JSON.parse(JSON.stringify({ source: deb0.source, debouches: deb0.debouches, recoltes: deb0.recoltes, rec: true, by: 'François', at: 1793730000000 }));
  reglages.debouches.push({ id: 'fd', nom: 'Ferme Deschamps', colis: 'bois', livraisons: [{ id: 'fd', jours: ['jeudi'] }] });
  await put('listes/reglages/debouches', reglages);
  const tout = { tomates: { c: 'ta-jeu', by: 'François', at: 1793730000000 } };
  // Pour refaire le 4/11 : le mercredi récolte aussi Élie, Ferme Deschamps et Panier La Magic (pour cette semaine seulement).
  await put('listes/semaines/' + W, {
    produits: FICHES, q: Q, tout,
    recoltes: { [LUN]: { livraisons: ['ta-mar'], by: 'François', at: 1793730000000 }, [MER]: { livraisons: ['lm', 'ps', 'lv', 'ta-jeu', 'av03', 'fd', 'mk', 'el'], by: 'François', at: 1793730000000 } },
  });
  const { p: B, ctx: ctxB } = await telephone('Aurore');
  await B.waitForSelector('#recJours button');
  const menu = await B.$$eval('#recJours button', (e) => e.map((x) => x.dataset.jour));
  verifie(menu.join() === [LUN, MER].join() && (await B.getAttribute(`#recJours [data-jour="${LUN}"]`, 'aria-pressed')) === 'true', 'menu des récoltes de la semaine : lundi et mercredi ; le prochain jour de récolte (lundi) s\'ouvre');
  verifie((await texte(B, '#titre')).startsWith('Récolte du lundi'), 'le titre dit le jour : « ' + (await texte(B, '#titre')) + ' »');
  verifie((await texte(B, '#videBox')).startsWith('Rien à récolter ce jour-là.'), 'lundi : « Rien à récolter ce jour-là » (aucune quantité pour Très Allier mardi)');
  await B.click(`#recJours [data-jour="${MER}"]`);
  await B.waitForSelector('li.item');
  verifie((await texte(B, '#titre')).startsWith('Récolte du mercredi') && (await texte(B, '#pour')).startsWith('Livraisons : '), 'mercredi choisi dans le menu : sa liste s\'ouvre (« ' + (await texte(B, '#pour')) + ' »)');
  const ids = await B.$$eval('#todo li.item', (e) => e.map((x) => x.dataset.id).sort());
  const attendus = fichier.items.map((i) => i.id).filter((id) => !NON_COMPAREES.includes(id)).sort();
  verifie(ids.join() === attendus.join(), 'les ' + attendus.length + ' produits comparables du 4/11 sont dans la liste, et rien d\'autre (obtenu ' + ids.length + ')');
  const ecartsFichier = [];
  for (const it of fichier.items) {
    if (NON_COMPAREES.includes(it.id)) continue;
    const q = await qte(B, it.id);
    const total = it.total.replace(/ \(.*\)$/, ''); // « 1 colis (6 bottes) » : le contenu est dans la petite ligne
    const kgF = it.kg === it.total ? '' : it.kg;
    if (q.total !== total || q.kg !== kgF) ecartsFichier.push(it.id + ' : fichier « ' + total + ' / ' + kgF + ' », outil « ' + q.total + ' / ' + q.kg + ' »');
  }
  verifie(ecartsFichier.length === 0, 'total et kilos calculés identiques au fichier du 4/11, ligne à ligne' + (ecartsFichier.length ? ' : ' + ecartsFichier.join(' ; ') : ''));
  const circuits = await B.$$eval('#circs .chip', (e) => e.map((x) => x.textContent).slice(1).sort());
  // Élie n'avait que le poireau (« 10 poireaux », non comparé) : sans quantité, pas de puce, comme dans le fichier.
  verifie(circuits.join('|') === ['Auvabio', 'Ferme Deschamps', 'Locavore', 'Marché de Tronget', 'Panier adéquat', 'Panier La Magic', 'Très Allier'].sort().join('|'), 'un circuit par débouché qui a une quantité, comme le 4/11 (obtenu ' + circuits.join('|') + ')');
  await B.click('li[data-id="bette"] .more');
  const repBette = await B.$$eval('li[data-id="bette"] .repart li', (e) => e.map((x) => x.innerText.replace(/\s+/g, ' ').trim()));
  verifie(repBette.includes('Panier adéquat 3,5 grands colis bois de 5 kg · 17,5 kg') && repBette.includes('Locavore 3 kg'), 'bette : Panier adéquat en grands colis bois (débouché en colis bois), Locavore en kilos (obtenu ' + repBette.join(' | ') + ')');
  await B.click('li[data-id="bette"] .more');
  const tom = await qte(B, 'tomates');
  verifie(tom.total === 'tout ce qu\'il y a' && (await B.textContent('#crateSum')).includes('à remplir'), 'tomates « tout » pour Très Allier ; les caisses sont comptées');
  verifie(base.lire('listes/' + MER) === null, 'tant que personne n\'a coché, rien n\'est écrit pour cette liste');
  await capture(B, '2-liste-mercredi');

  // 3. Première coche : la liste est figée ; le changement de la semaine est signalé, pas appliqué en silence
  await A.click('[data-view="recolte"]');
  await A.waitForSelector('#recJours button');
  await A.click(`#recJours [data-jour="${MER}"]`);
  await A.waitForSelector('li[data-id="bette"]');
  await A.click('li[data-id="bette"] .box');
  await attendre(A, 800);
  const fige = base.lire('listes/' + MER + '/fige');
  verifie(fige && fige.by === 'François' && fige.at > 0 && Object.keys(fige.items).length === attendus.length && base.lire('listes/' + MER + '/done/bette').by === 'François', 'première coche (bette) : la liste est figée dans la base, avec le prénom et l\'heure');
  verifie(await B.$('#done li[data-id="bette"]'), 'chez Aurore, la bette passe dans « déjà effectuées »');
  await patch('listes/semaines/' + W, { 'q/bette/ps': c(4.5), 'q/carotte/mk': c(3), 'q/rhubarbe/lv': null });
  await attendre(B, 800);
  const betteB = await qte(B, 'bette');
  verifie(betteB.total === '6 colis + 3 kg' && (await texte(B, 'li[data-id="bette"] .ecart')) === 'Changé dans la semaine : maintenant 7 colis + 3 kg (38 kg).', 'Panier adéquat passe à 4,5 GH dans la semaine : la liste garde 6 colis + 3 kg, et la ligne dit « maintenant 7 colis + 3 kg (38 kg) »');
  verifie((await texte(B, 'li[data-id="rhubarbe"] .ecart')) === 'Retiré de la semaine depuis la première coche.' && (await texte(B, '#ecartsBox')).includes('changé : Bette, Carotte lavée') && (await texte(B, '#ecartsBox')).includes('retiré : Rhubarbe'), 'rhubarbe retirée et carotte changée : signalées sur la ligne et dans l\'encadré');
  await capture(B, '3-liste-figee-ecarts');
  await B.click('#ecartsBox [data-a="maj-liste"]');
  await attendre(B, 800);
  verifie((await qte(B, 'bette')).total === '7 colis + 3 kg' && !(await B.$('.ecart')) && !(await visible(B, '#ecartsBox')) && !(await B.$('li[data-id="rhubarbe"]')), '« Mettre la liste à jour » : la liste prend la semaine, l\'encadré disparaît');
  verifie(await B.$('#done li[data-id="bette"]') && base.lire('listes/' + MER + '/fige/by') === 'Aurore', 'la coche de la bette est gardée ; la nouvelle liste figée porte le prénom d\'Aurore');
  await attendre(A);
  verifie((await qte(A, 'bette')).total === '7 colis + 3 kg' && !(await A.$('.ecart')), 'chez François aussi');

  // 4. La Préparation suit le même jour
  await B.click('[data-view="prep"]');
  verifie((await B.getAttribute(`#recJours [data-jour="${MER}"]`, 'aria-pressed')) === 'true' && (await texte(B, '#pour')).startsWith('Récolte du mercredi'), 'Préparation : même menu, même jour (mercredi)');
  const clients = await B.$$eval('#prepList section.grp', (e) => e.map((x) => x.dataset.circ));
  verifie(clients.includes('ps') && clients.includes('av') && clients.includes('fd') && clients.length === 7, 'une commande par débouché du mercredi (obtenu ' + clients.join(',') + ')');
  await B.click('section.grp[data-circ="ps"] li.pitem');
  await attendre(B);
  verifie(base.lire('listes/' + MER + '/prep/ps/bette') && base.lire('listes/' + MER + '/prep/ps/bette').by === 'Aurore', 'cocher la bette de Panier adéquat : coche de préparation rangée avec la liste du mercredi');
  await capture(B, '4-preparation');

  // 5. Jours de récolte de la semaine (onglet Semaine, page « À récolter »)
  await A.click('[data-view="semaine"]');
  await A.click('[data-sem="recolter"]');
  const carte = (d) => `#semRecList .rc-jour[data-date="${d}"]`;
  await A.waitForSelector(carte(MER));
  verifie(await A.isChecked(carte(LUN) + ' input[data-a="chaque"]') && await A.isChecked(carte(MER) + ' input[data-a="chaque"]') && (await A.textContent(carte(MER) + ' h3')).startsWith('Mercredi'), 'lundi et mercredi sont là, cochés « Chaque semaine » (jours habituels)');
  await A.selectOption('#ajJour', MAR);
  await A.click('[data-a="ajouter-jour"]');
  await attendre(A);
  const mar = base.lire('listes/semaines/' + W + '/recoltes/' + MAR);
  verifie(mar && mar.livraisons.join() === 'av63' && mar.by === 'François', 'mardi ajouté : les livraisons qui suivent et ne sont récoltées nulle part sont proposées, déjà cochées (Auvabio 63)');
  verifie(!(await A.isChecked(carte(MAR) + ' input[data-a="chaque"]')), 'le mardi ajouté vaut pour cette semaine seulement');
  await A.click(carte(MAR) + ' input[data-c="mk"]');
  await attendre(A);
  verifie(base.lire('listes/semaines/' + W + '/recoltes/' + MAR).livraisons.join() === 'av63,mk' && !base.lire('listes/semaines/' + W + '/recoltes/' + MER).livraisons.includes('mk'), 'cocher le marché au mardi le retire du mercredi (une livraison n\'est récoltée qu\'un jour)');
  verifie((await A.textContent(carte(MER) + ' input[data-c="mk"] + span')).includes('(récoltée le mardi)'), 'au mercredi, le marché est marqué « récoltée le mardi »');
  await capture(A, '5-jours-de-recolte');
  await A.click(carte(MAR) + ' input[data-a="chaque"]');
  await attendre(A);
  const rec = () => (base.lire('listes/reglages/debouches').recoltes || []).map((r) => r.jour + ':' + (r.livraisons || []).join(',') + ':' + (r.chaque === false ? 'non' : 'oui'));
  verifie(rec().includes('mardi:av63,mk:oui') && rec().some((r) => r.startsWith('mercredi:') && !r.includes('mk') && !r.includes('av63')), '« Chaque semaine » coché au mardi : jour habituel ajouté aux réglages (obtenu ' + rec().join(' ; ') + ')');
  await A.click('[data-a="semSuiv"]');
  await A.waitForSelector(carte(plus(MAR, 7)));
  verifie(await A.isChecked(carte(plus(MAR, 7)) + ' input[data-a="chaque"]') && (await A.$$('#semRecList .rc-jour[data-date]')).length >= 3, 'la semaine suivante a son mardi, créé tout seul');
  verifie(base.lire('listes/semaines/' + plus(W, 7)) === null, 'rien n\'est copié à l\'avance dans la semaine suivante');
  await A.click('[data-a="semPrec"]');
  await A.waitForSelector(carte(MAR));
  await A.click(carte(MAR) + ' input[data-a="chaque"]');
  await attendre(A);
  verifie(rec().includes('mardi:av63,mk:non') && await A.$(carte(MAR)), '« Chaque semaine » décoché : le mardi reste dans cette semaine, le réglage n\'est pas effacé');
  await A.click('[data-a="semSuiv"]');
  await A.waitForSelector(carte(plus(MER, 7)));
  verifie(!(await A.$(carte(plus(MAR, 7)))), 'la semaine suivante n\'a plus de mardi');
  await A.click('[data-a="semPrec"]');
  await A.waitForSelector(carte(LUN));
  await A.click(carte(LUN) + ' [data-a="retirer-jour"]');
  await attendre(A);
  verifie(base.lire('listes/semaines/' + W + '/recoltes/' + LUN).retire === true && !(await A.$(carte(LUN))), 'lundi retiré pour cette semaine seulement');
  await A.click(carte(MAR) + ' [data-a="voir-jour"]');
  await A.waitForSelector('li.item');
  verifie((await texte(A, '#titre')).startsWith('Récolte du mardi') && (await A.$$eval('#recJours button', (e) => e.map((x) => x.dataset.jour))).join() === [MAR, MER].join(), '« Voir la liste de récolte » ouvre la liste du mardi ; le menu n\'a plus le lundi');

  // 6. Hors ligne : une coche du mercredi, puis on passe au mardi ; elle part au retour du réseau
  await B.click('[data-view="recolte"]');
  await ctxB.setOffline(true);
  await B.waitForSelector('li[data-id="carotte"]');
  await B.click('li[data-id="carotte"] .box');
  await attendre(B, 300);
  verifie((await texte(B, '#sync')) === 'Hors ligne · 1 coche en attente', 'sans réseau, la coche de la carotte attend (« ' + (await texte(B, '#sync')) + ' »)');
  await B.click(`#recJours [data-jour="${MAR}"]`);
  await attendre(B, 300);
  verifie((await texte(B, '#titre')).startsWith('Récolte du mardi') && (await texte(B, '#sync')) === 'Hors ligne · 1 coche en attente', 'passée au mardi, la coche du mercredi attend toujours');
  await ctxB.setOffline(false);
  await B.waitForFunction(() => document.querySelector('#sync').textContent.includes('Partagé'), null, { timeout: 25000 }).catch(() => {});
  verifie(base.lire('listes/' + MER + '/done/carotte') && base.lire('listes/' + MER + '/done/carotte').by === 'Aurore' && !base.lire('listes/' + MAR + '/done/carotte'), 'au retour du réseau, la coche part dans la liste du mercredi, pas dans celle du mardi');

  // 7. Semaine avec des quantités mais sans jour de récolte ; jour sans rien à récolter
  const W2 = plus(W, 14);
  await put('listes/semaines/' + W2, { produits: { bette: FICHES.bette }, q: { bette: { 'ta-mar': c(1) } }, recoltes: { [W2]: { retire: true }, [plus(W2, 2)]: { retire: true } } });
  await A.click('[data-view="semaine"]');
  await A.click('[data-a="semSuiv"]'); await A.click('[data-a="semSuiv"]');
  await A.click('[data-view="recolte"]');
  await A.waitForSelector('#videBox:not([hidden])');
  verifie((await texte(A, '#videBox')).startsWith('Aucun jour de récolte cette semaine.'), 'quantités mais aucun jour de récolte : le message le dit');
  await A.click('#videBox [data-a="aller-semaine"]');
  await attendre(A, 300);
  verifie(await visible(A, '#semRecList') && (await A.getAttribute('[data-sem="recolter"]', 'aria-pressed')) === 'true', 'son bouton ouvre la page « À récolter », où l\'on ajoute un jour');

  // 8. La liste en fichier (4/11) l'emporte pour sa date
  await A.click('[data-sem="repartir"]');
  for (let i = 0; i < 60 && (await texte(A, '#semTitre')) !== 'Semaine du 2 novembre' && (await texte(A, '#semTitre')) !== 'Semaine du 2 novembre 2026'; i++) await A.click('[data-a="semPrec"]');
  await A.click('[data-view="recolte"]');
  await A.waitForSelector('#recJours [data-jour="2026-11-04"]');
  await A.click('#recJours [data-jour="2026-11-04"]');
  await A.waitForFunction(() => document.querySelector('#titre').textContent === 'Récolte du mercredi 4 novembre', null, { timeout: 5000 }).catch(() => {});
  verifie((await texte(A, '#titre')) === 'Récolte du mercredi 4 novembre' && (await A.$$('li.item')).length === fichier.items.length && await A.$('#done li[data-id="mesclun"]'), 'semaine du 2 novembre, mercredi 4 : la liste en fichier s\'ouvre, avec ses ' + fichier.items.length + ' produits et la coche du mesclun');

  // 9. Rien d'autre n'a bougé
  verifie(JSON.stringify(base.lire('listes/2026-11-04')) === JSON.stringify(listeAvant), 'la liste du 4/11 dans la base est inchangée');
  verifie(JSON.stringify(base.lire('listes/semaines/' + W + '/q/endive')) === JSON.stringify(Q.endive) && base.lire('listes/semaines/' + W + '/tout/tomates').c === 'ta-jeu', 'les quantités de la semaine sont inchangées (rien n\'est écrit par la liste)');
  verifie(erreurs.length === 0, 'aucune erreur JavaScript' + (erreurs.length ? ' : ' + erreurs.join(' | ') : ''));
  await nav.close(); site.close(); base.close();
  console.log(echecs ? '\n' + echecs + ' échec(s).' : '\nTout est bon.');
  process.exit(echecs ? 1 : 0);
})();
