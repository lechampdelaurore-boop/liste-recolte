// Test de bout en bout du rappel de la semaine d'avant (demande de François du 22/11/2026) : dans la page « Répartir »,
// chaque case d'une livraison de Très Allier (mardi et jeudi) montre en petit, en haut à gauche, ce qu'on lui a mis la
// semaine d'avant, avec l'unité (caisse, kg, bottes, « tout »). Les autres débouchés n'en ont pas, sauf si on coche le
// réglage dans leur fiche (autres fermes). Lecture seule : la semaine d'avant n'est jamais modifiée.
// Ordinateur (grille) et téléphone (fiches). Lancement depuis la racine du dépôt : node tests/rappel-semaine.cjs
// (CAPTURES=dossier pour garder les captures ; APPARENCE=pixel pour l'apparence pixel art)
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');
const { PIXEL } = require('./apparence-env.cjs'); // APPARENCE=pixel : le même test dans l'apparence pixel art (étape 48)
const fauxFirebase = require('./faux-firebase.cjs');

const RACINE = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' };
const PORT_SITE = 8996, PORT_BASE = 8997;
const BASE = `http://localhost:${PORT_BASE}`;
const CLE = 'cle-de-test';
const MDP = 'mot-de-passe-francois';
const CAPTURES = process.env.CAPTURES || '';

function serveurSite() {
  return new Promise((ok) => {
    const s = http.createServer((q, r) => {
      let f = decodeURIComponent(new URL(q.url, 'http://x').pathname);
      if (f.endsWith('/')) f += 'index.html';
      if (f === '/config.js') { r.writeHead(200, { 'Content-Type': 'text/javascript' }); return r.end(`window.RECOLTE_DB_URL='${BASE}';window.RECOLTE_AUTH_URL='${BASE}/v1';window.RECOLTE_JETON_URL='${BASE}/v1';`); }
      if (f === '/cle-web.js') { r.writeHead(200, { 'Content-Type': 'text/javascript' }); return r.end(`window.RECOLTE_CLE_WEB='${CLE}';`); }
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
// Numéro de semaine ISO, calculé autrement que dans l'appli (jeudi de la semaine, en UTC), pour vérifier l'affichage.
const numSemaine = (d) => { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7)); return Math.ceil(((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7); };
const attendreQue = async (fn, ms = 8000) => { const fin = Date.now() + ms; while (Date.now() < fin) { if (await fn()) return true; await new Promise((x) => setTimeout(x, 150)); } return false; };

(async () => {
  const site = await serveurSite();
  const base = await fauxFirebase(PORT_BASE, { comptes: { cle: CLE } });
  const uidF = base.creerCompte('francois@ferme.invalid', MDP);
  base.profil(uidF, 'ferme');
  const jeton = (await fetch(`${BASE}/v1/accounts:signInWithPassword?key=${CLE}`, { method: 'POST', body: JSON.stringify({ email: 'francois@ferme.invalid', password: MDP }) }).then((x) => x.json())).idToken;
  const mettre = (chemin, v) => fetch(`${BASE}/${chemin}.json?auth=${jeton}`, { method: 'PUT', body: JSON.stringify(v) });

  // La base a déjà sa propre copie des débouchés, écrite avant ce réglage : pas de champ « rappel ». Très Allier prend
  // alors la valeur du fichier de départ (coché), les autres débouchés non.
  const depart = JSON.parse(fs.readFileSync(path.join(RACINE, 'referentiel/debouches.json'), 'utf8'));
  verifie(depart.debouches.filter((d) => d.rappel).map((d) => d.id).join() === 'ta', 'fichier de départ : le rappel est coché pour Très Allier seulement');
  const copie = JSON.parse(JSON.stringify(depart)); copie.debouches.forEach((d) => { delete d.rappel; });
  await mettre('listes/reglages/debouches', { source: copie.source, debouches: copie.debouches, recoltes: copie.recoltes, rec: true, by: 'François', at: Date.now() - 86400000 });

  const PREV = iso(lundi(-1)), SEM = iso(lundi(0)), NP = numSemaine(lundi(-1)), t0 = lundi(-1).getTime() + 9 * 3600000;
  const fiches = {
    'carotte-lavee': { nom: 'Carotte lavée', caisse: 'PH', unite: '8 kg', kg: 8 },
    'radis-long-rose': { nom: 'Radis long rose', caisse: 'GB', unite: 'Botte (x12)', par_colis: 12, type: 'botte' },
    poireau: { nom: 'Poireau', caisse: 'GH', unite: '10 kg', kg: 10 },
    'celeri-rave': { nom: 'Céleri-rave', caisse: 'PH', unite: '5 kg', kg: 5 },
  };
  // Semaine d'avant : carotte 3 PH mardi et 12 kg jeudi (et 5 PH chez Locavore) ; radis 20 bottes mardi ;
  // poireau : 10 GH disponibles, 4 GH mardi, 2 GH Locavore, « tout ce qui reste » jeudi (donc 4 GH).
  const avant = {
    produits: { 'carotte-lavee': fiches['carotte-lavee'], 'radis-long-rose': fiches['radis-long-rose'], poireau: fiches.poireau },
    dispo: { poireau: { n: 10, u: 'colis', by: 'François', at: t0 } },
    q: {
      'carotte-lavee': { 'ta-mar': { n: 3, u: 'colis', by: 'François', at: t0 }, 'ta-jeu': { n: 12, u: 'kg', by: 'Aurore', at: t0 }, lv: { n: 5, u: 'colis', by: 'François', at: t0 } },
      'radis-long-rose': { 'ta-mar': { n: 20, u: 'u', by: 'François', at: t0 } },
      poireau: { 'ta-mar': { n: 4, u: 'colis', by: 'François', at: t0 }, lv: { n: 2, u: 'colis', by: 'François', at: t0 } },
    },
    tout: { poireau: { c: 'ta-jeu', by: 'François', at: t0 } },
  };
  await mettre(`listes/semaines/${PREV}`, avant);
  // Cette semaine : les quatre produits ; la carotte a déjà 2 PH le mardi ; le céleri-rave n'était pas là la semaine d'avant.
  const t1 = lundi(0).getTime() + 9 * 3600000;
  const produits = {}; Object.keys(fiches).forEach((k) => { produits[k] = { ...fiches[k], by: 'François', at: t1 }; });
  await mettre(`listes/semaines/${SEM}`, { produits, q: { 'carotte-lavee': { 'ta-mar': { n: 2, u: 'colis', by: 'François', at: t1 } } } });
  const avantJson = JSON.stringify(base.lire(`listes/semaines/${PREV}`));

  const nav = await chromium.launch();
  const erreurs = [];
  const ouvrir = async (nom, opts) => {
    const ctx = await nav.newContext({ ...opts, serviceWorkers: 'block' });
    await ctx.addInitScript((n) => localStorage.setItem('recolte.qui', JSON.stringify(n)), nom);
    const p = await ctx.newPage();
    p.on('pageerror', (e) => erreurs.push(nom + ' : ' + e.message));
    p.on('dialog', (d) => d.accept());
    await p.goto(`http://localhost:${PORT_SITE}/?liste=2026-11-04`);
    await p.fill('#authId', 'francois'); await p.fill('#authMdp', MDP); await p.click('#authOk');
    await p.click('[data-view="semaine"]');
    return p;
  };
  const capture = async (p, nom) => { if (CAPTURES) await p.screenshot({ path: path.join(CAPTURES, nom + '.png'), fullPage: false }); };

  // 1. Ordinateur : la grille
  const PC = await ouvrir('François', { viewport: { width: 1600, height: 900 } });
  await PC.waitForSelector('#semGrid tr[data-pid="poireau"]');
  const td = (pid, c) => `#semGrid tr[data-pid="${pid}"] td:has(input[data-k="q/${c}"])`;
  const rap = (p, pid, c) => p.$eval(td(pid, c), (e) => { const s = e.querySelector('.g-rap'); return s ? s.textContent : ''; }).catch(() => 'absent');
  await attendreQue(async () => (await rap(PC, 'poireau', 'ta-jeu')) !== '');
  await capture(PC, 'ordinateur-repartir');
  verifie((await rap(PC, 'carotte-lavee', 'ta-mar')) === '3 PH', `carotte lavée, Très Allier mardi : « 3 PH » (obtenu « ${await rap(PC, 'carotte-lavee', 'ta-mar')} »)`);
  verifie((await rap(PC, 'carotte-lavee', 'ta-jeu')) === '12 kg', `carotte lavée, Très Allier jeudi : « 12 kg », dans l'unité saisie (obtenu « ${await rap(PC, 'carotte-lavee', 'ta-jeu')} »)`);
  verifie((await rap(PC, 'radis-long-rose', 'ta-mar')) === '20 bottes', `radis, Très Allier mardi : « 20 bottes » (obtenu « ${await rap(PC, 'radis-long-rose', 'ta-mar')} »)`);
  verifie((await rap(PC, 'poireau', 'ta-jeu')) === 'tout (4 GH)', `poireau, Très Allier jeudi en « tout » la semaine d'avant : « tout (4 GH) » (10 − 4 − 2) (obtenu « ${await rap(PC, 'poireau', 'ta-jeu')} »)`);
  verifie((await rap(PC, 'radis-long-rose', 'ta-jeu')) === '' && (await rap(PC, 'celeri-rave', 'ta-mar')) === '', 'rien la semaine d\'avant (radis jeudi, céleri-rave absent) : pas de rappel');
  verifie((await rap(PC, 'carotte-lavee', 'lv')) === '' && (await rap(PC, 'poireau', 'lv')) === '', 'Locavore (réglage non coché) : pas de rappel, même avec des quantités la semaine d\'avant');
  const titres = await PC.$$eval('#semGrid thead th', (l) => l.map((t) => t.textContent));
  verifie(titres.filter((t) => t.includes(`en petit : semaine ${NP}`)).length === 2 && titres.some((t) => t.startsWith('Très Allier') && t.includes('mardi') && t.includes(`en petit : semaine ${NP}`)) && !titres.some((t) => t.startsWith('Locavore') && t.includes('en petit')), `titres des colonnes Très Allier mardi et jeudi : « en petit : semaine ${NP} » ; pas chez Locavore`);
  const largeur = await PC.$eval(td('poireau', 'ta-jeu'), (e) => ({ td: e.getBoundingClientRect().width, s: e.querySelector('.g-rap').scrollWidth }));
  verifie(largeur.s <= largeur.td + 1, `le rappel le plus long (« tout (4 GH) ») tient en entier dans sa case (${Math.round(largeur.s)} px dans ${Math.round(largeur.td)} px)`);
  verifie((await PC.inputValue(`${td('carotte-lavee', 'ta-mar')} input`)) === '2' && (await PC.inputValue(`${td('carotte-lavee', 'ta-jeu')} input`)) === '', 'les cases gardent leur valeur de cette semaine (2 mardi, vide jeudi) : le rappel n\'est pas une valeur');
  const aria = await PC.getAttribute(`${td('carotte-lavee', 'ta-mar')} input`, 'aria-label'), titre = await PC.getAttribute(`${td('carotte-lavee', 'ta-mar')} input`, 'title');
  verifie(aria.includes(`Semaine ${NP} : 3 PH`) && titre.includes(`Semaine ${NP} : 3 PH`), 'le rappel est aussi lu par un lecteur d\'écran et dans la bulle de la case');
  // En haut à gauche de la case, sans recouvrir le chiffre ; même hauteur de ligne qu'avant.
  // Position du texte du rappel (le cadre du rappel n'a pas de hauteur : il ne fait qu'élargir la colonne au besoin).
  const texte = (sel) => PC.$eval(sel, (e) => { const r = document.createRange(); r.selectNodeContents(e.querySelector('.g-rap')); const t = r.getBoundingClientRect();
    const c = e.getBoundingClientRect(), i = e.querySelector('input'), ir = i.getBoundingClientRect(), st = getComputedStyle(i);
    return { gauche: t.left - c.left, haut: t.top - ir.top, bas: t.bottom, texteHaut: ir.top + parseFloat(st.paddingTop), x: t.left + t.width / 2, y: t.top + t.height / 2, pointe: getComputedStyle(e.querySelector('.g-rap')).pointerEvents }; });
  const pos = await texte(td('carotte-lavee', 'ta-mar'));
  verifie(pos.gauche < 10 && pos.haut >= 0 && pos.haut < 8, `en haut à gauche de la case (${Math.round(pos.gauche)} px du bord gauche, ${Math.round(pos.haut)} px sous le haut de la case à taper)`);
  verifie(pos.bas <= pos.texteHaut + 1, 'le rappel est au-dessus du chiffre tapé, sans le recouvrir');
  verifie(pos.pointe === 'none', 'le rappel laisse passer les clics');
  const hauteursDe = (p) => p.$$eval('#semGrid tbody tr', (l) => l.map((r) => Math.round(r.getBoundingClientRect().height)).join());
  const hauteurs = await hauteursDe(PC);
  const p2 = await texte(td('carotte-lavee', 'ta-jeu'));
  await PC.mouse.click(p2.x, p2.y);
  verifie(await PC.evaluate(() => document.activeElement && document.activeElement.dataset.k === 'q/ta-jeu'), 'cliquer sur le rappel met le curseur dans la case');
  await PC.keyboard.press('Escape');

  // 2. Téléphone : les fiches de la page « Répartir »
  const T = await ouvrir('François', devices['Pixel 7']);
  await T.waitForSelector('#semList section.sp[data-pid="carotte-lavee"]');
  await T.click('#semList section.sp[data-pid="carotte-lavee"] .sp-head');
  const ligne = (pid, c) => `#semList section.sp[data-pid="${pid}"] .sr[data-k="q/${c}"]`;
  const rapT = (pid, c) => T.$eval(ligne(pid, c), (e) => { const s = e.querySelector('.sr-rap'); return s ? s.textContent : ''; }).catch(() => 'absent');
  await attendreQue(async () => (await rapT('carotte-lavee', 'ta-mar')) !== '');
  await T.$eval(ligne('carotte-lavee', 'ta-mar'), (e) => e.scrollIntoView({ block: 'center' }));
  await capture(T, 'telephone-repartir');
  verifie((await rapT('carotte-lavee', 'ta-mar')) === `Semaine ${NP} : 3 PH` && (await rapT('carotte-lavee', 'ta-jeu')) === `Semaine ${NP} : 12 kg`, `téléphone, carotte lavée : « Semaine ${NP} : 3 PH » mardi, « Semaine ${NP} : 12 kg » jeudi`);
  verifie((await rapT('carotte-lavee', 'lv')) === '', 'téléphone : pas de rappel chez Locavore');
  const posT = await T.$eval(ligne('carotte-lavee', 'ta-mar'), (e) => { const n = e.querySelector('.sr-nom').getBoundingClientRect(), s = e.querySelector('.sr-rap').getBoundingClientRect(), c = e.querySelector('.sr-ctl').getBoundingClientRect(); return { aGauche: Math.abs(s.left - n.left) < 2, dessous: s.top >= n.bottom - 1 && s.bottom <= c.top + 1 }; });
  verifie(posT.aGauche && posT.dessous, 'téléphone : le rappel est à gauche, sous le nom de la livraison et au-dessus de la case à taper');
  await T.click('#semList section.sp[data-pid="poireau"] .sp-head');
  await attendreQue(async () => (await rapT('poireau', 'ta-jeu')) !== '');
  verifie((await rapT('poireau', 'ta-jeu')) === `Semaine ${NP} : tout (4 GH)`, `téléphone, poireau jeudi : « Semaine ${NP} : tout (4 GH) »`);

  // 3. Autres fermes : on coche le réglage dans la fiche de Locavore, ses cases ont leur rappel ; on décoche Très Allier.
  await PC.click('[data-view="reglages"]');
  await PC.waitForSelector('#debView section.db[data-d="lv"]');
  await PC.click('#debView section.db[data-d="lv"] [data-a="db-plier"]');
  await PC.click('#debView section.db[data-d="ta"] [data-a="db-plier"]');
  verifie(await PC.isChecked('#debView section.db[data-d="ta"] input[data-f="rappel"]') && !(await PC.isChecked('#debView section.db[data-d="lv"] input[data-f="rappel"]')), 'Réglages : « Rappeler la semaine d\'avant » coché pour Très Allier, pas pour Locavore');
  await PC.check('#debView section.db[data-d="lv"] input[data-f="rappel"]');
  await PC.uncheck('#debView section.db[data-d="ta"] input[data-f="rappel"]');
  const debs = () => (base.lire('listes/reglages/debouches/debouches') || []);
  await attendreQue(() => { const l = debs(); return l.some((d) => d.id === 'lv' && d.rappel === true) && l.some((d) => d.id === 'ta' && d.rappel === false); });
  verifie(debs().some((d) => d.id === 'lv' && d.rappel === true) && debs().some((d) => d.id === 'ta' && d.rappel === false), 'base : le réglage est gardé dans la fiche du débouché (Locavore oui, Très Allier non)');
  await PC.click('[data-view="semaine"]');
  await PC.waitForSelector('#semGrid tr[data-pid="poireau"]');
  verifie((await rap(PC, 'carotte-lavee', 'lv')) === '5 PH' && (await rap(PC, 'poireau', 'lv')) === '2 GH', 'Locavore coché : « 5 PH » et « 2 GH » dans ses cases');
  verifie((await rap(PC, 'carotte-lavee', 'ta-mar')) === '' && (await PC.$$('#semGrid td.g-rapc:has(input[data-k^="q/ta-"])')).length === 0, 'Très Allier décoché : plus de rappel dans ses colonnes');
  // Même hauteur de lignes qu'avec le rappel chez Très Allier (on compare avec Locavore coché à sa place, qui a aussi
  // des cases à rappel : en pixel art, une case à rappel est un peu plus haute qu'une case sans).
  const sans = await hauteursDe(PC);
  verifie(sans === hauteurs, `les lignes gardent la même hauteur, que le rappel soit chez Très Allier ou chez Locavore (${hauteurs} / ${sans} px)`);
  // On remet comme au départ.
  await PC.click('[data-view="reglages"]');
  await PC.check('#debView section.db[data-d="ta"] input[data-f="rappel"]');
  await PC.uncheck('#debView section.db[data-d="lv"] input[data-f="rappel"]');
  await attendreQue(() => debs().some((d) => d.id === 'ta' && d.rappel === true));
  await PC.click('[data-view="semaine"]');
  await PC.waitForSelector('#semGrid tr[data-pid="poireau"]');
  verifie((await rap(PC, 'carotte-lavee', 'ta-mar')) === '3 PH', 'Très Allier recoché : le rappel revient');

  // 4. La semaine d'avant n'a pas bougé (lecture seule), et rien n'a été écrit dans cette semaine par le rappel.
  verifie(JSON.stringify(base.lire(`listes/semaines/${PREV}`)) === avantJson, 'la semaine d\'avant est inchangée dans la base');
  const q = base.lire(`listes/semaines/${SEM}/q`) || {};
  verifie(JSON.stringify(Object.keys(q)) === '["carotte-lavee"]' && JSON.stringify(Object.keys(q['carotte-lavee'])) === '["ta-mar"]', 'cette semaine : aucune quantité ajoutée par le rappel');

  // 5. La semaine d'avant sans données : aucun rappel, aucune erreur (on recule d'une semaine : sa semaine d'avant est vide).
  await PC.click('#semNav [data-a="semPrec"]');
  await PC.waitForSelector('#semGrid tr[data-pid="poireau"]');
  await PC.waitForTimeout(800);
  verifie((await PC.$$('#semGrid .g-rap')).length === 0, `semaine ${NP} (sa semaine d'avant est vide) : aucun rappel`);

  verifie(erreurs.length === 0, 'aucune erreur JavaScript' + (erreurs.length ? ' : ' + erreurs.join(' | ') : ''));
  if (PIXEL) console.log('(apparence pixel art)');
  await nav.close(); site.close(); base.close();
  console.log(echecs ? echecs + ' échec(s)' : 'Tout est bon.');
  process.exit(echecs ? 1 : 0);
})().catch((x) => { console.error(x); process.exit(1); });
