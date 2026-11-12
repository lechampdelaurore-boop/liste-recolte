// Test de bout en bout de la boîte « Commandes à valider » (étape 31, docs/PLAN_AGENT_IA.md) : un compte au profil
// « agent » dépose des propositions sous agent/propositions (sans rien pouvoir écrire d'autre), l'appli de la ferme les
// montre dans l'onglet Semaine (chiffre rouge sur l'onglet), « Valider » les inscrit dans la répartition de la semaine
// comme une saisie à la main, « Refuser » les écarte. Versions d'une même commande (Auvabio « annule et remplace ») :
// la plus récente gagne, correction ligne par ligne si l'ancienne était validée, modification à la main signalée,
// annulation, bon « à vérifier », livraison inconnue, hors ligne, deux téléphones, ordinateur, règles d'avant.
// Lancement depuis la racine du dépôt : npm install --no-save playwright && node tests/commandes.cjs
// CAPTURES=<dossier> pour enregistrer les captures d'écran.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');
const fauxFirebase = require('./faux-firebase.cjs');

const RACINE = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const PORT_SITE = 8820, PORT_BASE = 8821;
const BASE = `http://localhost:${PORT_BASE}`;
const CLE = 'cle-de-test';
const MDP_F = 'mot-de-passe-francois', MDP_A = 'mot-de-passe-aurore', MDP_AG = 'mot-de-passe-agent';
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
const numSemaine = (d) => { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7)); return Math.ceil(((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7); };
const attendreQue = async (fn, ms = 8000) => { const fin = Date.now() + ms; while (Date.now() < fin) { if (await fn()) return true; await new Promise((x) => setTimeout(x, 150)); } return false; };

(async () => {
  const site = await serveurSite();
  const base = await fauxFirebase(PORT_BASE, { comptes: { cle: CLE } });
  const uidF = base.creerCompte('francois@ferme.invalid', MDP_F), uidA = base.creerCompte('aurore@ferme.invalid', MDP_A);
  const uidG = base.creerCompte('agent@ferme.invalid', MDP_AG);
  base.profil(uidF, 'ferme'); base.profil(uidA, 'ferme'); base.profil(uidG, 'agent');
  const SEM = iso(lundi(0)), SUIV = iso(lundi(1)), NUM_SUIV = numSemaine(lundi(1));
  const jeton = async (email, mdp) => (await fetch(`${BASE}/v1/accounts:signInWithPassword?key=${CLE}`, { method: 'POST', body: JSON.stringify({ email, password: mdp }) }).then((x) => x.json())).idToken;
  const jetonF = await jeton('francois@ferme.invalid', MDP_F), jetonG = await jeton('agent@ferme.invalid', MDP_AG);
  const appel = async (chemin, jt, methode = 'GET', corps) => { const r = await fetch(`${BASE}/${chemin}.json?auth=${jt}`, { method: methode, body: corps === undefined ? undefined : JSON.stringify(corps) }); return r.status; };
  // La semaine en cours : poireau et céleri-rave ajoutés, 2 GH de poireau déjà saisis à la main pour Auvabio 03.
  const t0 = Date.now() - 3 * 3600 * 1000;
  await appel(`listes/semaines/${SEM}`, jetonF, 'PUT', {
    produits: { poireau: { nom: 'Poireau', caisse: 'GH', unite: '10 kg', kg: 10, by: 'François', at: t0 }, 'celeri-rave': { nom: 'Céleri-rave', caisse: 'PH', unite: '5 kg', kg: 5, by: 'François', at: t0 } },
    dispo: { poireau: { n: 20, u: 'colis', by: 'François', at: t0 } },
    q: { poireau: { av03: { n: 2, u: 'colis', by: 'François', at: t0 } } },
  });
  const sem = (chemin) => base.lire(`listes/semaines/${SEM}/${chemin}`);
  const H = 3600 * 1000, jour = Date.now() - 26 * H;
  const prop = (o) => Object.assign({ w: SEM, c: 'av03', cle: 'auvabio-allier-' + SEM, src: '[Commande] COMMANDE ALLIER / MAGASINS', type: 'commande', by: 'Agent', at: Date.now() }, o);
  const deposer = (id, o, jt = jetonG) => appel('agent/propositions/' + id, jt, 'PUT', prop(o));

  const nav = await chromium.launch();
  const erreurs = [], dialogues = [];
  let repondre = true;
  const ouvrir = async (nom, opts = devices['Pixel 7'], semaine) => {
    const ctx = await nav.newContext({ ...opts, serviceWorkers: 'block' });
    const ui = Object.assign({ view: 'semaine', semPage: 'repartir' }, semaine ? { semaine, semaineLe: iso(new Date()) } : {});
    await ctx.addInitScript(([n, u]) => { if (!localStorage.getItem('recolte.qui')) localStorage.setItem('recolte.qui', JSON.stringify(n)); if (!localStorage.getItem('recolte.ui')) localStorage.setItem('recolte.ui', JSON.stringify(u)); }, [nom, ui]);
    const p = await ctx.newPage();
    p.on('pageerror', (e) => erreurs.push(nom + ' : ' + e.message));
    p.on('dialog', (d) => { dialogues.push(d.message()); if (repondre) d.accept(); else d.dismiss(); });
    await p.goto(`http://localhost:${PORT_SITE}/`);
    return { p, ctx };
  };
  const ferme = async (nom, id, mdp, opts, semaine) => {
    const o = await ouvrir(nom, opts, semaine);
    await o.p.fill('#authId', id); await o.p.fill('#authMdp', mdp); await o.p.click('#authOk');
    await o.p.waitForFunction(() => document.querySelector('#sync').textContent.includes('Partagé'), null, { timeout: 10000 }).catch(() => {});
    return o;
  };
  const badge = (p) => p.$eval('#cmdN', (b) => (b.hidden ? '' : b.textContent));
  // Relecture tout de suite (au lieu d'attendre les 15 s) : comme au retour du réseau.
  const relire = (p) => p.evaluate(() => dispatchEvent(new Event('online')));
  const cartes = (p) => p.$$eval('#semCmd article.cmd', (x) => x.map((a) => a.dataset.cmd));
  const carte = (p, id) => p.$eval(`#semCmd article[data-cmd="${id}"]`, (a) => ({
    t: a.textContent, type: a.querySelector('.cmd-type').textContent, liv: a.querySelector('.cmd-liv').textContent,
    lignes: [...a.querySelectorAll('tbody tr:not(.cmd-main)')].map((tr) => [...tr.children].map((td) => td.textContent.trim()).join(' | ')),
    main: [...a.querySelectorAll('tr.cmd-main')].map((tr) => tr.textContent), alertes: [...a.querySelectorAll('.cmd-alerte')].map((x) => x.textContent),
    ok: a.querySelector('[data-a="cmd-valider"]').textContent, okOff: a.querySelector('[data-a="cmd-valider"]').disabled,
  })).catch(() => null);
  const capture = async (p, nom, el) => { if (!CAPTURES) return; if (el) await (await p.$(el)).screenshot({ path: path.join(CAPTURES, nom + '.png') }); else await p.screenshot({ path: path.join(CAPTURES, nom + '.png') }); };

  // 0. Règles d'avant l'étape 31 : rien ne casse, rien ne s'affiche, l'agent ne peut rien écrire.
  base.reglesAvantAgent = true;
  verifie(await deposer('essai-0', { date: jour }) === 401 && base.lire('agent') === null, 'règles d\'avant : la base refuse la proposition de l\'agent, rien d\'écrit');
  const { p: F0, ctx: ctxF0 } = await ferme('François', 'francois', MDP_F);
  await F0.waitForSelector('#semView:not([hidden])');
  await F0.waitForTimeout(1500);
  verifie((await F0.textContent('#sync')).trim() === 'Partagé' && !(await F0.isVisible('#semCmd')) && (await badge(F0)) === '', 'règles d\'avant : l\'appli de la ferme reste « Partagé » (jamais « Compte sans accès »), sans boîte ni chiffre');
  verifie(base.journal.some((j) => j.p === 'agent/propositions'), 'règles d\'avant : l\'appli a bien demandé les propositions (refus attendu, sans bruit)');
  await ctxF0.close();
  base.reglesAvantAgent = false;

  // 1. Ce que l'agent peut et ne peut pas faire (mêmes droits que docs/regles-base/fermees.json, essayés sur l'émulateur par tests/regles.cjs)
  const P1 = 'mail-auvabio-1';
  const lignes1 = [{ p: 'endive', nom: 'Endive', n: 9, u: 'colis' }, { p: 'poireau', nom: 'Poireaux', n: 3, u: 'colis' }, { p: 'chou-inconnu', nom: 'Chou fleur violet', n: 2, u: 'colis' }, { p: 'celeri-rave', nom: 'Céleri', n: 1, u: 'u' }];
  verifie(await deposer(P1, { date: jour, l: lignes1, refus: ['« blettes rouges » : produit inconnu (proches : Bette)'], lien: 'https://mail.google.com/mail/u/0/#inbox/abc' }) === 200, 'agent : il dépose une proposition (Auvabio 03, 4 lignes, un refus de la porte)');
  verifie(await deposer(P1, { date: jour, l: [{ p: 'endive', n: 99, u: 'colis' }] }) === 401 && base.lire(`agent/propositions/${P1}/l/0/n`) === 9, 'agent : il ne peut pas réécrire une proposition déjà déposée');
  verifie(await appel(`agent/propositions/${P1}`, jetonG, 'DELETE') === 401, 'agent : il ne peut pas effacer une proposition');
  verifie(await appel(`listes/semaines/${SEM}`, jetonG) === 401 && await appel(`listes/semaines/${SEM}/q/endive/av03`, jetonG, 'PUT', { n: 9, u: 'colis', by: 'Agent', at: 1 }) === 401, 'agent : il ne lit ni n\'écrit la semaine (ni rien de la vraie liste)');
  verifie(await appel('agent/propositions/par-la-ferme', jetonF, 'PUT', prop({ date: jour })) === 401, 'ferme : elle lit les propositions mais n\'en écrit pas');
  await deposer('mail-locavore-suiv', { w: SUIV, c: 'lv', cle: 'locavore-' + SUIV, src: 'Locavor : commandes à préparer', date: jour + H, l: [{ p: 'poireau', n: 1, u: 'colis' }] });

  // 2. Téléphone de François : le chiffre arrive sans recharger (relu toutes les 15 s), la carte dans l'onglet Semaine
  const { p: F, ctx: ctxF } = await ferme('François', 'francois', MDP_F);
  const { p: A } = await ferme('Aurore', 'aurore', MDP_A);
  await F.waitForSelector('#semCmd:not([hidden])', { timeout: 20000 }).catch(() => {});
  verifie((await badge(F)) === '2' && (await badge(A)) === '2', 'chiffre rouge 2 sur l\'onglet Semaine (une commande cette semaine, une la semaine prochaine), chez François et chez Aurore');
  const c1 = await carte(F, P1);
  verifie(c1 && c1.liv === 'Auvabio 03 · jeudi' && c1.type === 'Commande' && c1.t.includes('[Commande] COMMANDE ALLIER / MAGASINS · reçue le ') && c1.t.includes('déposée par Agent') && c1.t.includes('Voir le message'),
    'la carte : livraison (« ' + (c1 && c1.liv) + ' »), « Commande », la source, l\'heure du mail, qui l\'a déposée, le lien du message');
  verifie(c1 && JSON.stringify(c1.lignes) === JSON.stringify(['Endive | — | 9 PH', 'Poireau | 2 GH | 3 GH']), 'lignes : produit, ce qui est déjà dans la semaine, la commande (' + JSON.stringify(c1 && c1.lignes) + ')');
  verifie(c1 && c1.alertes.length === 1 && c1.alertes[0].includes('« Chou fleur violet » : produit inconnu de la ferme') && c1.alertes[0].includes('Céleri-rave : unité « u » impossible') && c1.alertes[0].includes('« blettes rouges »'),
    'ce qui ne peut pas s\'inscrire est dit, à saisir à la main : produit inconnu, unité impossible, refus de la porte');
  verifie((await F.textContent('#semCmd')).includes(`1 commande à valider pour la semaine ${NUM_SUIV}.`), 'la commande de la semaine prochaine est annoncée, avec un bouton pour y aller');
  const box = await F.$eval('#semCmd', (b) => ({ l: b.getBoundingClientRect().width, w: innerWidth, d: document.documentElement.scrollWidth, haut: b.getBoundingClientRect().top < document.querySelector('#semRep').getBoundingClientRect().top }));
  verifie(box.l <= box.w && box.d <= box.w && box.haut, 'téléphone : la boîte tient dans l\'écran, sans défilement de côté, au-dessus des fiches');
  await capture(F, '1-telephone-commande', '#semCmd');
  // Mode à blanc : rien n'est écrit tant que personne ne valide.
  verifie(sem('q/endive') === null && sem('q/poireau/av03').n === 2 && sem('commandes') === null, 'rien n\'est écrit dans la semaine tant que personne ne valide');

  // 3. Valider : une quantité déjà là est signalée avant d'être remplacée ; « Annuler » ne fait rien
  repondre = false;
  await F.click(`#semCmd [data-a="cmd-valider"][data-id="${P1}"]`);
  verifie(dialogues.at(-1) === 'Déjà une autre quantité dans la semaine : Poireau (2 GH). Cette quantité sera remplacée.\n\nValider quand même ?', 'une autre quantité déjà saisie : la question avant de la remplacer (« ' + dialogues.at(-1) + ' »)');
  await F.waitForTimeout(400);
  verifie(sem('q/poireau/av03').n === 2 && sem('commandes') === null && (await cartes(F)).includes(P1), '« Annuler » : rien n\'est écrit, la carte reste');
  repondre = true;
  await F.click(`#semCmd [data-a="cmd-valider"][data-id="${P1}"]`);
  await attendreQue(() => sem(`commandes/${P1}`));
  const d1 = sem(`commandes/${P1}`) || {}, qe = sem('q/endive/av03') || {}, qp = sem('q/poireau/av03') || {};
  verifie(qe.n === 9 && qe.u === 'colis' && qe.by === 'François' && qp.n === 3 && qp.by === 'François', 'valider inscrit les quantités dans la répartition de la semaine, comme une saisie à la main (9 PH d\'endive, 3 GH de poireau, prénom de François)');
  verifie(sem('produits/endive') && sem('produits/endive').nom === 'Endive', 'un produit pas encore dans la semaine y est ajouté (Endive)');
  verifie(d1.e === 'valide' && d1.by === 'François' && JSON.stringify(d1.l) === JSON.stringify([{ p: 'endive', c: 'av03', n: 9, u: 'colis' }, { p: 'poireau', c: 'av03', n: 3, u: 'colis' }]), 'la décision est gardée dans la semaine, avec ce qui a été inscrit');
  verifie(sem('q/chou-inconnu') === null && sem('q/celeri-rave') === null, 'les lignes impossibles ne sont pas inscrites');
  verifie(base.lire(`agent/propositions/${P1}`).l.length === 4, 'la proposition de l\'agent reste telle quelle (trace)');
  await attendreQue(async () => !(await cartes(A)).includes(P1) && (await badge(A)) === '1');
  verifie(!(await cartes(F)).includes(P1) && (await badge(F)) === '1' && !(await cartes(A)).includes(P1) && (await badge(A)) === '1', 'la carte disparaît et le chiffre passe à 1, aussi chez Aurore sans recharger');
  verifie((await F.textContent('#semCmd')).includes('Aucune commande à valider pour cette semaine.'), '« Aucune commande à valider pour cette semaine. »');
  // Le reste de l'appli voit la commande : la fiche du poireau la montre.
  await F.click('#semList section[data-pid="endive"] .sp-head');
  verifie((await F.textContent('#semList section[data-pid="endive"]')).includes('Auvabio 03'), 'la fiche de l\'endive montre la commande dans sa ligne Auvabio 03');

  // 4. Le même mail revient (même identifiant) : refusé par la base, rien ne change
  verifie(await deposer(P1, { date: jour, l: lignes1 }) === 401 && sem('q/endive/av03').n === 9, 'le même mail revient : la base le refuse, la proposition déjà validée n\'est jamais réécrite');

  // 5. « Annule et remplace » : nouveau bon, modification à la main entre-temps
  await appel(`listes/semaines/${SEM}`, jetonF, 'PATCH', { 'q/endive/av03': { n: 8, u: 'colis', by: 'Aurore', at: Date.now() }, 'maj/q/endive/av03': Date.now() });
  const P2 = 'mail-auvabio-2';
  await deposer(P2, { date: jour + 2 * H, src: '[Commande] COMMANDE ALLIER / MAGASINS (annule et remplace)', l: [{ p: 'endive', n: 7, u: 'colis' }, { p: 'celeri-rave', n: 2, u: 'colis' }] });
  // Un bon plus ancien qui arrive en retard (lu après les autres) : il ne passe pas devant.
  await deposer('mail-auvabio-0', { date: jour - 5 * H, l: [{ p: 'endive', n: 1, u: 'colis' }] });
  await relire(F);
  await F.waitForSelector(`#semCmd article[data-cmd="${P2}"]`, { timeout: 8000 }).catch(() => {});
  const c2 = await carte(F, P2);
  verifie(c2 && c2.type === 'Correction' && c2.t.includes('Remplace le bon reçu le ') && c2.t.includes('déjà validé par François le ') && c2.t.includes('Seules les lignes qui changent seront écrites.'), 'nouveau bon de la même commande : « Correction », il remplace le bon déjà validé (par qui, quand)');
  verifie(c2 && JSON.stringify(c2.lignes) === JSON.stringify(['Endive | 9 PH | 7 PH', 'Céleri-rave | — | 2 PH', 'Poireau | 3 GH | retiré (0)']), 'correction ligne par ligne, dans l\'ordre du nouveau bon : avant, après, et à la fin le produit disparu, « retiré (0) » (' + JSON.stringify(c2 && c2.lignes) + ')');
  verifie(c2 && c2.main.length === 1 && c2.main[0] === 'Modifié à la main depuis : 8 PH dans la semaine.', 'une quantité modifiée à la main depuis la validation est signalée (« ' + (c2 && c2.main[0]) + ' »)');
  verifie((await cartes(F)).length === 1 && !(await cartes(F)).includes('mail-auvabio-0'), 'le bon plus ancien arrivé en retard n\'est pas à valider (la version la plus récente, par l\'heure du mail, gagne)');
  await capture(F, '2-telephone-correction', '#semCmd');
  await F.click(`#semCmd [data-a="cmd-valider"][data-id="${P2}"]`);
  verifie(dialogues.at(-1) === 'Modifié à la main depuis la validation : Endive (8 PH). Cette quantité sera remplacée.\n\nValider quand même ?', 'avant d\'écraser une modification à la main, la question (« ' + dialogues.at(-1) + ' »)');
  await attendreQue(() => sem(`commandes/${P2}`));
  verifie(sem('q/endive/av03').n === 7 && sem('q/poireau/av03') === null && sem('q/celeri-rave/av03').n === 2 && sem('dispo/poireau').n === 20, 'la correction écrit seulement les lignes qui changent : endive 7, poireau retiré, céleri-rave 2 ; le reste de la semaine intact');

  // 6. Historique : déjà traitées, remplacée
  await F.click('#semCmd [data-a="cmd-histo"]');
  const faits = await F.$$eval('#semCmd .cmd-fait > p:first-child', (x) => x.map((p) => p.textContent));
  verifie(faits.length === 3 && faits[0].startsWith('Auvabio 03 · jeudi · Validée par François le ') && faits[1].startsWith('Auvabio 03 · jeudi · Validée par François') && faits[2] === 'Auvabio 03 · jeudi · Remplacée par un bon plus récent', '« Déjà traitées (3) » : les deux bons validés, le plus récent en haut, et l\'ancien « remplacé » (' + JSON.stringify(faits) + ')');
  await capture(F, '3-telephone-deja-traitees', '#semCmd');

  // 7. Refuser, puis remettre à valider
  const P3 = 'locavor-cette-semaine';
  await deposer(P3, { c: 'lv', cle: 'locavore-' + SEM, src: 'Locavor : commandes à préparer', date: jour + 3 * H, l: [{ p: 'poireau', n: 2, u: 'colis' }] });
  await relire(F);
  await F.waitForSelector(`#semCmd article[data-cmd="${P3}"]`, { timeout: 8000 }).catch(() => {});
  await F.click(`#semCmd [data-a="cmd-refuser"][data-id="${P3}"]`);
  await attendreQue(() => sem(`commandes/${P3}`));
  verifie((sem(`commandes/${P3}`) || {}).e === 'refuse' && sem('q/poireau/lv') === null && !(await cartes(F)).includes(P3), '« Refuser » : la proposition est écartée, rien d\'inscrit');
  verifie((await F.textContent('#semCmd')).includes('Refusée par François le '), 'elle est rangée dans « Déjà traitées », « Refusée par François »');
  await F.click(`#semCmd [data-a="cmd-remettre"][data-id="${P3}"]`);
  await attendreQue(() => !sem(`commandes/${P3}`));
  verifie(sem(`commandes/${P3}`) === null && (await cartes(F)).includes(P3), '« Remettre à valider » : la carte revient');
  // Hors ligne : la validation s'affiche tout de suite et part au retour du réseau
  await ctxF.setOffline(true);
  await F.click(`#semCmd [data-a="cmd-valider"][data-id="${P3}"]`);
  await F.waitForTimeout(600);
  verifie(!(await cartes(F)).includes(P3) && sem(`commandes/${P3}`) === null, 'sans réseau : la carte part tout de suite, rien n\'est encore dans la base');
  await ctxF.setOffline(false);
  await attendreQue(() => sem(`commandes/${P3}`) && sem('q/poireau/lv'), 25000);
  verifie((sem(`commandes/${P3}`) || {}).e === 'valide' && (sem('q/poireau/lv') || {}).n === 2, 'au retour du réseau, la validation et la quantité partent ensemble');

  // 8. Bon « à vérifier » (le PDF et le mail ne concordent pas) et livraison inconnue
  const P4 = 'mail-marche', P5 = 'mail-elie';
  await deposer(P4, { c: 'mk', cle: 'marche-' + SEM, src: 'Mail', date: jour + 4 * H, verif: 'le PDF dit 4 colis de poireau, le mail 3', l: [{ p: 'poireau', n: 3, u: 'colis' }] });
  await deposer(P5, { c: 'inconnue', cle: 'x-' + SEM, src: 'Mail', date: jour + 5 * H, l: [{ p: 'poireau', n: 1, u: 'colis' }] });
  await relire(F);
  await F.waitForSelector(`#semCmd article[data-cmd="${P5}"]`, { timeout: 8000 }).catch(() => {});
  const c4 = await carte(F, P4), c5 = await carte(F, P5);
  verifie(c4 && c4.alertes.some((x) => x === 'À vérifier : le PDF dit 4 colis de poireau, le mail 3'), 'bon « à vérifier » : la raison est en jaune sur la carte');
  repondre = false;
  await F.click(`#semCmd [data-a="cmd-valider"][data-id="${P4}"]`);
  verifie(dialogues.at(-1).startsWith('À vérifier : le PDF dit 4 colis de poireau, le mail 3') && sem('q/poireau/mk') === null, 'il ne se valide pas d\'un seul appui : la question d\'abord, « Annuler » n\'écrit rien');
  repondre = true;
  verifie(c5 && c5.okOff && c5.alertes[0].startsWith('Livraison inconnue (« inconnue »)'), 'livraison inconnue des débouchés : « Valider » est grisé, la carte le dit');
  await F.click(`#semCmd [data-a="cmd-refuser"][data-id="${P5}"]`);
  await F.click(`#semCmd [data-a="cmd-refuser"][data-id="${P4}"]`);
  await attendreQue(() => sem(`commandes/${P4}`) && sem(`commandes/${P5}`));

  // 9. Annulation sans remplacement : ce qui avait été validé est retiré
  const P6 = 'mail-auvabio-annule';
  await deposer(P6, { type: 'annulation', date: jour + 6 * H, src: '[Commande] Annulation' });
  await relire(F);
  await F.waitForSelector(`#semCmd article[data-cmd="${P6}"]`, { timeout: 8000 }).catch(() => {});
  const c6 = await carte(F, P6);
  verifie(c6 && c6.type === 'Annulation' && c6.ok === 'Valider l\'annulation' && JSON.stringify(c6.lignes) === JSON.stringify(['Endive | 7 PH | retiré (0)', 'Céleri-rave | 2 PH | retiré (0)']), 'annulation : « Valider l\'annulation », chaque ligne validée avant passe à « retiré (0) »');
  await F.click(`#semCmd [data-a="cmd-valider"][data-id="${P6}"]`);
  await attendreQue(() => sem(`commandes/${P6}`));
  verifie(sem('q/endive/av03') === null && sem('q/celeri-rave/av03') === null && (sem('produits/endive') || {}).nom === 'Endive', 'annulation validée : les quantités d\'Auvabio 03 sont retirées (les produits restent dans la semaine)');

  // 10. La semaine prochaine, et l'ordinateur
  await F.click('#semCmd [data-a="cmd-semaine"]');
  await F.waitForSelector('#semCmd article[data-cmd="mail-locavore-suiv"]', { timeout: 8000 }).catch(() => {});
  verifie((await F.textContent('#semTitre')).startsWith(`Semaine ${NUM_SUIV}`) && (await cartes(F)).join() === 'mail-locavore-suiv', `« Voir la semaine ${NUM_SUIV} » ouvre la semaine prochaine, avec sa commande`);
  const { p: PC } = await ferme('François', 'francois', MDP_F, { viewport: { width: 1280, height: 860 } }, SUIV);
  await PC.waitForSelector('#semCmd article[data-cmd="mail-locavore-suiv"]', { timeout: 20000 }).catch(() => {});
  const pc = await PC.$eval('#semCmd', (b) => ({ vu: b.getBoundingClientRect().height > 0, haut: b.getBoundingClientRect().bottom <= document.querySelector('#semRep').getBoundingClientRect().top + 1 }));
  verifie(pc.vu && pc.haut && (await badge(PC)) === '1', 'ordinateur : la boîte est au-dessus de la grille, le chiffre sur l\'onglet');
  await capture(PC, '4-ordinateur');
  await PC.click('#semCmd [data-a="cmd-valider"]');
  await attendreQue(() => base.lire(`listes/semaines/${SUIV}/commandes/mail-locavore-suiv`));
  verifie((base.lire(`listes/semaines/${SUIV}/q/poireau/lv`) || {}).n === 1, 'ordinateur : valider inscrit la commande dans sa semaine (la semaine prochaine)');
  await attendreQue(async () => (await badge(F)) === '' && (await badge(A)) === '', 20000);
  verifie((await badge(F)) === '' && (await badge(PC)) === '' && (await badge(A)) === '', 'plus rien à valider : plus de chiffre sur l\'onglet, sur aucun appareil');

  // 11. Autre ferme : rien d'écrit en dur, la livraison vient des réglages de la ferme
  const src = fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8').split('/* ---------- Commandes à valider')[1].split('/* ---------- Débouchés et livraisons')[0];
  const code = src.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
  verifie(!/auvabio|locavor|av03|très allier|tresallier/i.test(code), 'le code de la boîte ne nomme aucun débouché de cette ferme (les commentaires mis à part)');

  verifie(erreurs.length === 0, 'aucune erreur JavaScript' + (erreurs.length ? ' : ' + erreurs.join(' | ') : ''));
  await nav.close(); site.close(); base.close();
  console.log(echecs ? `\n${echecs} échec(s)` : '\nTout est bon.');
  process.exit(echecs ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
