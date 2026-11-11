// Test de la page « Historique » (étape 14, demande de François du 9/11/2026 : « Il y a déjà un historique avec toutes
// les récoltes passées ? »). Ouverte depuis l'onglet Semaine, elle liste les semaines enregistrées (la plus récente en
// haut, repliées) ; la flèche d'une semaine montre ses jours de récolte : ce qui a été coché (quantité de la liste, qui,
// à quelle heure), ce qui ne l'a pas été, la préparation ; deux boutons rouvrent la liste du jour et la répartition.
// Lecture seule : vérifie que rien n'est écrit dans la base, que le détail d'une semaine n'est lu qu'en la dépliant,
// que la liste en fichier du 4/11 est reprise, et que l'historique déjà lu s'ouvre sans réseau. Téléphone et ordinateur,
// avec un faux Firebase (jamais la vraie base).
// Lancement depuis la racine du dépôt : node tests/historique.cjs
// Captures d'écran (facultatif) : CAPTURES=dossier node tests/historique.cjs
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');
const fauxFirebase = require('./faux-firebase.cjs');

const RACINE = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const PORT_SITE = 8860, PORT_BASE = 8861;
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
const lundi = (decal) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7 + 7 * decal); return iso(d); };
// Numéro de semaine ISO, calculé autrement que dans l'appli (jeudi de la semaine, en UTC), pour vérifier l'affichage.
const numSemaine = (d) => { if (typeof d === 'string') { const p = d.split('-'); d = new Date(+p[0], p[1] - 1, +p[2]); } const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7)); return Math.ceil(((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7); };
const plus = (id, n) => { const p = id.split('-'); const d = new Date(+p[0], p[1] - 1, +p[2]); d.setDate(d.getDate() + n); return iso(d); };
const heure = (id, h, m) => { const p = id.split('-'); return new Date(+p[0], p[1] - 1, +p[2], h, m).getTime(); };
const net = (t) => String(t || '').replace(/\s+/g, ' ').trim();

(async () => {
  const site = await serveurSite();
  const base = await fauxFirebase(PORT_BASE);
  const put = (p, v) => fetch(`${BASE}/${p}.json`, { method: 'PUT', body: JSON.stringify(v) });
  // Deux semaines passées, jamais celle de la liste en fichier du 4/11/2026 (essayée à part).
  const FICHIER = '2026-11-04', W_FICHIER = '2026-11-02';
  const [W1, W2] = [-1, -2, -3, -4].map(lundi).filter((w) => w !== W_FICHIER);
  const J1 = plus(W1, 1); // le mardi de la semaine W1
  const A0 = 1793730000000, q = (n) => ({ n, u: 'colis', by: 'Aurore', at: A0 });
  const fiche = { bette: { nom: 'Bette', caisse: 'GH', unite: '5 kg', kg: 5, by: 'Aurore', at: A0 }, mesclun: { nom: 'Mesclun', caisse: 'PH', unite: '1 kg', kg: 1, by: 'Aurore', at: A0 }, poireau: { nom: 'Poireau', caisse: 'GH', unite: '10 kg', kg: 10, by: 'Aurore', at: A0 } };
  await put('listes/semaines/' + W1, { produits: fiche, q: { bette: { mk: q(3) }, mesclun: { lv: q(1) }, poireau: { mk: q(2) } }, recoltes: { [J1]: { livraisons: ['mk', 'lv'], by: 'Aurore', at: A0 } } });
  // Le jour de récolte de W1 : liste figée à la première coche, deux produits cochés sur trois, une ligne préparée.
  const B8 = heure(J1, 8, 5), M9 = heure(J1, 9, 30);
  await put('listes/' + J1, {
    fige: { id: J1, titre: 'Récolte du mardi', pour: 'Livraisons : Marché, Locavore', source: 'x', semaine: W1, by: 'Aurore', at: B8 - 60000,
      circuits: [{ id: 'mk', nom: 'Marché ven.', court: 'Marché' }, { id: 'lv', nom: 'Locavore', court: 'Locavore', colisage: 'bois' }],
      items: [
        { id: 'bette', produit: 'Bette', caisse: 'GH', condit: '5 kg', circ: { mk: 3 }, total: '3 colis', kg: '15 kg' },
        { id: 'mesclun', produit: 'Mesclun', caisse: 'PH', condit: '1 kg', circ: { lv: 1 }, total: '1 colis', kg: '1 kg' },
        { id: 'poireau', produit: 'Poireau', caisse: 'GH', condit: '10 kg', circ: { mk: 2 }, total: '2 colis', kg: '20 kg' },
      ] },
    // Mesclun coché en premier par François à 8 h 05, bette par Aurore à 9 h 30 : l'ordre de la page suit l'heure.
    done: { bette: { by: 'Aurore', at: M9 }, mesclun: { by: 'François', at: B8 } },
    prep: { lv: { mesclun: { by: 'Aurore', at: M9 + 600000 } } },
    prepClient: { lv: { by: 'Aurore', at: M9 + 600000 } },
    maj: { 'done/bette': M9 },
  });
  // W2 : une répartition, mais aucune coche de récolte.
  await put('listes/semaines/' + W2, { produits: { bette: fiche.bette }, q: { bette: { mk: q(1) } } });
  // La semaine prochaine (pas encore passée) : pas dans l'historique.
  const WF = lundi(1);
  await put('listes/semaines/' + WF, { produits: { bette: fiche.bette }, q: { bette: { mk: q(1) } } });
  // La liste en fichier du mercredi 4/11/2026 (faite avant 13D) : ses coches sont dans la base, sans liste figée.
  await put('listes/' + FICHIER, { done: { mesclun: { by: 'François', at: heure(FICHIER, 7, 40) } } });
  const fichierListe = JSON.parse(fs.readFileSync(path.join(RACINE, 'listes', FICHIER + '.json'), 'utf8'));
  const instantane = () => JSON.stringify(base.lire(''));
  const avant = instantane();

  const nav = await chromium.launch();
  const erreurs = [];
  const appareil = async (opts) => {
    const ctx = await nav.newContext({ ...opts, serviceWorkers: 'block' });
    await ctx.addInitScript(() => {
      localStorage.setItem('recolte.qui', JSON.stringify('Martin'));
      if (!localStorage.getItem('recolte.ui')) localStorage.setItem('recolte.ui', JSON.stringify({ view: 'semaine', semPage: 'repartir' }));
    });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => erreurs.push(e.message));
    p.on('dialog', (d) => d.accept());
    await p.goto(`http://localhost:${PORT_SITE}/`);
    return { p, ctx };
  };
  const capture = async (p, nom) => { if (CAPTURES) await p.screenshot({ path: path.join(CAPTURES, nom + '.png'), fullPage: false }); };
  const carte = (w) => `#histView .rc-jour[data-w="${w}"]`;
  const fleche = (w) => carte(w) + ' [data-a="hi-plier"]';

  // 1. Téléphone : le bouton « Historique des semaines » est dans l'onglet Semaine et ouvre la page
  const { p: T, ctx: TC } = await appareil(devices['Pixel 7']);
  await T.waitForSelector('#hiEntree [data-a="historique"]');
  const posB = await T.$eval('#hiEntree [data-a="historique"]', (e) => { const r = e.getBoundingClientRect(); return { y: r.top, bas: r.bottom, h: r.height, vh: innerHeight }; });
  verifie(await T.isVisible('#hiEntree') && posB.bas < posB.vh && posB.h >= 40, 'onglet Semaine : bouton « Historique des semaines » visible sans défiler (hauteur ' + Math.round(posB.h) + ' px)');
  base.lectures.length = 0;
  await T.click('#hiEntree [data-a="historique"]');
  await T.waitForSelector(fleche(W1));
  await T.waitForTimeout(300);
  verifie(net(await T.textContent('#titre')) === 'Historique' && await T.isVisible('#histView') && !(await T.isVisible('#semView')) && !(await T.isVisible('#semNav')), 'la page « Historique » s\'ouvre à la place de la semaine');
  verifie((await T.getAttribute('[data-view="semaine"]', 'aria-pressed')) === 'true', 'l\'onglet Semaine reste allumé (l\'historique en fait partie)');
  const semaines = await T.$$eval('#histView .rc-jour[data-w]', (e) => e.map((x) => x.dataset.w));
  const attendu = [W1, W2, W_FICHIER].sort().reverse();
  verifie(JSON.stringify(semaines) === JSON.stringify(attendu), 'les semaines enregistrées, la plus récente en haut (obtenu ' + semaines.join(', ') + ', attendu ' + attendu.join(', ') + ')');
  verifie(!semaines.includes(WF), 'la semaine prochaine (pas encore passée) n\'y est pas');
  const plies = await T.$$eval('#histView .rc-tete', (e) => e.map((x) => x.getAttribute('aria-expanded')));
  verifie(plies.every((x) => x === 'false') && !(await T.$('#histView .hi-jour')), 'toutes les semaines sont repliées à l\'ouverture');
  const l1 = net(await T.textContent(carte(W1) + ' h3')), l2 = net(await T.textContent(carte(W2) + ' h3'));
  const nomJ1 = new Date(heure(J1, 12, 0)).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric' });
  verifie(l1.includes('Récolte cochée : ' + nomJ1), 'ligne de la semaine du ' + W1 + ' : « Récolte cochée : ' + nomJ1 + ' » (obtenu « ' + l1 + ' »)');
  verifie(l1.includes('Semaine ' + numSemaine(W1) + ' · du ') && l2.includes('Semaine ' + numSemaine(W2) + ' · du '), 'chaque semaine de l\'historique donne son numéro, « Semaine ' + numSemaine(W1) + ' » et « Semaine ' + numSemaine(W2) + ' » (obtenu « ' + l1 + ' »)');
  verifie(l2.includes('Aucune récolte cochée'), 'ligne de la semaine du ' + W2 + ' : « Aucune récolte cochée » (obtenu « ' + l2 + ' »)');
  const lus = base.lectures.slice();
  verifie(lus.includes('listes?shallow') && lus.includes('listes/semaines?shallow') && !lus.some((x) => /^listes\/\d{4}-/.test(x)), 'à l\'ouverture, seuls les noms des jours et des semaines sont lus (lectures : ' + lus.join(', ') + ')');
  await capture(T, '1-telephone-semaines');

  // 2. La flèche déplie une semaine : ses jours, ce qui a été coché, par qui, à quelle heure, et le reste
  await T.click(fleche(W1));
  await T.waitForSelector(carte(W1) + ` .hi-jour[data-date="${J1}"] li[data-pid="bette"]`);
  verifie(base.lectures.includes('listes/' + J1), 'déplier la semaine lit son jour de récolte (listes/' + J1 + ')');
  const jour = carte(W1) + ` .hi-jour[data-date="${J1}"]`;
  const res = net(await T.textContent(jour + ' .hi-res'));
  verifie(res === '2 produits récoltés sur 3 · 16 kg', 'résumé du jour : « 2 produits récoltés sur 3 · 16 kg » (obtenu « ' + res + ' »)');
  const lignes = await T.$$eval(jour + ' li[data-pid]', (e) => e.map((x) => x.dataset.pid + '|' + x.querySelector('b').textContent + '|' + x.querySelector('small').textContent));
  const hm = (t) => new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  verifie(lignes.length === 2 && lignes[0] === 'mesclun|1 colis|1 kg · François, à ' + hm(B8) && lignes[1] === 'bette|3 colis|15 kg · Aurore, à ' + hm(M9), 'produits cochés dans l\'ordre de la coche, avec quantité, qui et heure (obtenu ' + lignes.join(' ; ') + ')');
  const texte = net(await T.textContent(jour));
  verifie(texte.includes('Coché par François et Aurore, de ' + hm(B8) + ' à ' + hm(M9) + '.'), 'qui a coché et de quelle heure à quelle heure');
  verifie(texte.includes('Pas coché : Poireau.'), 'ce qui n\'a pas été coché : « Pas coché : Poireau. »');
  verifie(texte.includes('Préparation : 1 ligne sur 3 · commande prête : Locavore.'), 'la préparation : « 1 ligne sur 3 · commande prête : Locavore » (obtenu « ' + texte.slice(texte.indexOf('Préparation')) + ' »)');
  verifie(await T.isVisible(jour + ' [data-a="hi-jour"]') && await T.isVisible(carte(W1) + ' [data-a="hi-semaine"]'), 'boutons « Ouvrir la liste de ce jour » et « Voir la répartition de cette semaine »');
  const ligneW1 = net(await T.textContent(carte(W1) + ' h3 .rc-combien'));
  verifie(ligneW1 === '2 produits récoltés · 16 kg', 'la ligne de la semaine donne son total une fois lue (obtenu « ' + ligneW1 + ' »)');
  verifie((await T.getAttribute(fleche(W2), 'aria-expanded')) === 'false' && !(await T.$(carte(W2) + ' .hi-jour')), 'les autres semaines restent repliées');
  const miniature = await T.$(jour + ' li[data-pid="bette"] svg.mini');
  verifie(!!miniature, 'la miniature du légume est devant son nom');
  await capture(T, '2-telephone-semaine-depliee');

  // 3. Semaine sans coche ; semaine de la liste en fichier du 4/11 (reprise du fichier, comme l'onglet Récolte)
  await T.click(fleche(W2));
  await T.waitForSelector(carte(W2) + ' .hi-vide');
  verifie(net(await T.textContent(carte(W2) + ' .hi-vide')) === 'Aucune coche de récolte cette semaine.' && await T.isVisible(carte(W2) + ' [data-a="hi-semaine"]'), 'semaine sans coche : « Aucune coche de récolte cette semaine. » et le bouton de la répartition');
  await T.click(fleche(W_FICHIER));
  await T.waitForSelector(carte(W_FICHIER) + ` .hi-jour[data-date="${FICHIER}"] li[data-pid="mesclun"]`);
  const rf = net(await T.textContent(carte(W_FICHIER) + ` .hi-jour[data-date="${FICHIER}"] .hi-res`));
  const mesclunF = fichierListe.items.find((x) => x.id === 'mesclun');
  verifie(rf.startsWith('1 produit récolté sur ' + fichierListe.items.length), 'liste en fichier du 4/11 : « 1 produit récolté sur ' + fichierListe.items.length + ' » (obtenu « ' + rf + ' »)');
  const bf = net(await T.textContent(carte(W_FICHIER) + ` .hi-jour[data-date="${FICHIER}"] li[data-pid="mesclun"] b`));
  verifie(bf === mesclunF.total, 'quantité reprise du fichier (' + mesclunF.total + ', obtenu ' + bf + ')');
  await T.waitForTimeout(300);
  verifie(instantane() === avant, 'ouvrir l\'historique et déplier des semaines n\'écrit rien dans la base');

  // 4. « Ouvrir la liste de ce jour » : l'onglet Récolte, sur ce jour, avec ses coches
  await T.click(jour + ' [data-a="hi-jour"]');
  await T.waitForSelector('#recJours button[aria-pressed="true"]');
  await T.waitForTimeout(500);
  const jp = await T.getAttribute('#recJours button[aria-pressed="true"]', 'data-jour');
  verifie((await T.getAttribute('[data-view="recolte"]', 'aria-pressed')) === 'true' && jp === J1, 'onglet Récolte ouvert sur le jour ' + J1 + ' (obtenu ' + jp + ')');
  verifie(net(await T.textContent('#doneCount')) === '2' && net(await T.textContent('#todo')).includes('Poireau'), 'ses deux coches sont dans « Récoltes déjà effectuées », le poireau reste à récolter');

  // 5. « Voir la répartition de cette semaine » : l'onglet Semaine, page Cumul, sur cette semaine
  await T.click('[data-view="semaine"]');
  await T.click('#hiEntree [data-a="historique"]');
  await T.waitForSelector(carte(W1) + ' [data-a="hi-semaine"]');
  verifie((await T.getAttribute(fleche(W1), 'aria-expanded')) === 'true', 'en revenant, la semaine dépliée l\'est toujours (le temps de la visite)');
  await T.click(carte(W1) + ' [data-a="hi-semaine"]');
  await T.waitForSelector('#semTab table');
  await T.waitForTimeout(300);
  const titreS = net(await T.textContent('#semTitre'));
  const attenduS = 'Semaine ' + numSemaine(W1) + ' · du ' + new Date(heure(W1, 12, 0)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  verifie(titreS === attenduS && (await T.getAttribute('[data-sem="cumul"]', 'aria-pressed')) === 'true', 'onglet Semaine, page Cumul, ' + attenduS + ' (obtenu « ' + titreS + ' »)');
  verifie(net(await T.textContent('#semTable')).includes('Poireau'), 'le cumul de cette semaine-là s\'affiche');
  await T.click('#hiEntree [data-a="historique"]');
  await T.waitForSelector('#histView [data-a="hi-retour"]');
  await T.click('#histView [data-a="hi-retour"]');
  await T.waitForTimeout(200);
  verifie(await T.isVisible('#semView') && !(await T.isVisible('#histView')), '« Retour à la semaine » rouvre l\'onglet Semaine');
  await T.waitForTimeout(300);
  // Rouvrir une semaine passée ne la réécrit pas (sa copie des livraisons est gardée telle quelle) : la base n'a pas bougé.
  verifie(instantane() === avant, 'après « Ouvrir la liste » et « Voir la répartition », la base n\'a toujours pas bougé');

  // 6. Sans réseau : l'historique déjà lu s'affiche quand même, avec un avertissement
  await TC.route(BASE + '/**', (r) => r.abort());
  await T.click('#hiEntree [data-a="historique"]');
  await T.waitForSelector('#histView .boite.jaune');
  const avert = net(await T.textContent('#histView .boite.jaune'));
  verifie(avert.startsWith('Pas de réseau : voici l\'historique gardé sur ce téléphone'), 'sans réseau : avertissement « Pas de réseau : voici l\'historique gardé sur ce téléphone… »');
  const semainesHL = await T.$$eval('#histView .rc-jour[data-w]', (e) => e.map((x) => x.dataset.w));
  verifie(JSON.stringify(semainesHL) === JSON.stringify(attendu), 'sans réseau : les mêmes semaines');
  await T.waitForSelector(jour + ' li[data-pid="bette"]');
  verifie(net(await T.textContent(jour + ' .hi-res')) === '2 produits récoltés sur 3 · 16 kg', 'sans réseau : la semaine déjà lue garde son détail');
  await capture(T, '3-telephone-hors-ligne');
  await TC.unroute(BASE + '/**');
  await T.click('#histView [data-a="hi-relire"]');
  await T.waitForTimeout(800);
  verifie(!(await T.$('#histView .boite.jaune')), 'réseau revenu, « Réessayer » : l\'avertissement disparaît');

  // 7. Ordinateur : même page, plus large
  const { p: P } = await appareil({ viewport: { width: 1280, height: 800 } });
  await P.waitForSelector('#hiEntree [data-a="historique"]');
  verifie(await P.isVisible('#hiEntree [data-a="historique"]'), 'ordinateur : bouton « Historique des semaines » dans l\'onglet Semaine');
  await P.click('#hiEntree [data-a="historique"]');
  await P.waitForSelector(fleche(W1));
  await P.click(fleche(W1));
  await P.waitForSelector(jour + ' li[data-pid="bette"]');
  const larg = await P.$eval('#histView', (e) => e.getBoundingClientRect().width);
  verifie(larg > 600 && larg <= 900, 'ordinateur : la page tient en largeur (' + Math.round(larg) + ' px)');
  const debord = await P.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  verifie(!debord, 'ordinateur : pas de défilement de côté');
  await capture(P, '4-ordinateur');
  const debordT = await T.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  verifie(!debordT, 'téléphone : pas de défilement de côté');

  await P.waitForTimeout(300);
  verifie(instantane() === avant, 'à la fin, la base est exactement comme au début (rien n\'a été écrit)');
  verifie(erreurs.length === 0, 'aucune erreur JavaScript' + (erreurs.length ? ' : ' + erreurs.join(' | ') : ''));
  await nav.close(); site.close(); base.close();
  console.log(echecs ? '\n' + echecs + ' échec(s).' : '\nTout est bon.');
  process.exit(echecs ? 1 : 0);
})();
