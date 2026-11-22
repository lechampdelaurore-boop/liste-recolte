// Données inventées pour les captures et les tests de l'apparence (étape 48, tests/apparence.cjs) : une semaine remplie,
// la récolte du mercredi à mi-parcours, une partie de la préparation, le stock d'un magasin. Rien de la vraie base :
// les quantités sont tirées au hasard d'une liste ordinaire de légumes d'hiver ; les débouchés sont ceux du
// référentiel du dépôt (referentiel/debouches.json), comme sur un appareil neuf.
// T0 : l'heure figée des pages (mercredi 25/11/2026, 10 h, heure de Paris). W : le lundi de cette semaine.
const T0 = new Date('2026-11-25T10:00:00+01:00').getTime();
const W = '2026-11-23', LUN = '2026-11-23', MER = '2026-11-25';
const A = T0 - 3 * 3600 * 1000; // les saisies : trois heures plus tôt
const FICHES = {
  aromatiques: { nom: 'Aromatiques', caisse: 'PB', unite: 'Botte (x6)', par_colis: 6, type: 'botte' },
  bette: { nom: 'Bette', caisse: 'GH', unite: '5 kg', kg: 5 },
  betterave: { nom: 'Betterave rouge', caisse: 'PH', unite: '7 kg', kg: 7 },
  carotte: { nom: 'Carotte lavée', caisse: 'PH', unite: '8 kg', kg: 8 },
  'celeri-branche': { nom: 'Céleri-branche', caisse: 'GH', unite: '5 kg', kg: 5 },
  'celeri-rave': { nom: 'Céleri-rave', caisse: 'PH', unite: '5 kg', kg: 5 },
  'chou-rouge': { nom: 'Chou rouge', caisse: 'GH', unite: '10 kg', kg: 10 },
  endive: { nom: 'Endive', caisse: 'PH', unite: '5 kg', kg: 5 },
  epinard: { nom: 'Épinard (feuille)', caisse: 'GH', unite: '4 kg', kg: 4 },
  mesclun: { nom: 'Mesclun', caisse: 'PH', unite: '1 kg', kg: 1 },
  panais: { nom: 'Panais', caisse: 'PH', unite: '5 kg', kg: 5 },
  'patate-douce': { nom: 'Patate douce', caisse: 'PH', unite: '6 kg', kg: 6 },
  poireau: { nom: 'Poireau', caisse: 'GH', unite: '7 kg', kg: 7 },
  butternut: { nom: 'Courge butternut', caisse: 'GH', unite: '10 kg', kg: 10 },
  radis: { nom: "Radis d'hiver en mélange", caisse: 'PH', unite: '5 kg', kg: 5 },
};
const fiche = (f) => ({ ...f, by: 'François', at: A });
const c = (n) => ({ n, u: 'colis', by: 'François', at: A });
const kg = (n) => ({ n, u: 'kg', by: 'Aurore', at: A });
// Livraisons du référentiel : lundi (ta-mar, lm) ; mercredi (ps, lv, ta-jeu, av03, av63, mk).
const Q = {
  aromatiques: { 'ta-mar': c(0.5), 'ta-jeu': c(0.5), mk: c(0.5) },
  bette: { 'ta-mar': c(1), ps: c(2), lv: kg(3), mk: c(1.5) },
  betterave: { mk: c(0.5), lm: c(1) },
  carotte: { 'ta-mar': c(2), 'ta-jeu': c(2), mk: c(2), av03: c(4) },
  'celeri-branche': { lv: kg(2.5), av03: c(1), av63: c(1) },
  'celeri-rave': { mk: c(0.5), lm: c(0.5) },
  'chou-rouge': { mk: c(0.5), ps: c(1) },
  endive: { 'ta-jeu': c(2), mk: c(1), av03: c(7), lv: kg(2) },
  epinard: { 'ta-jeu': c(2), mk: c(1), lv: kg(2.5) },
  mesclun: { 'ta-jeu': c(1), mk: c(1) },
  panais: { mk: c(0.5), 'ta-mar': c(1) },
  'patate-douce': { mk: c(1), lv: kg(5) },
  poireau: { 'ta-jeu': c(1.5), mk: c(1), ps: c(1) },
  butternut: { lv: c(1), mk: c(1) },
  radis: { mk: c(1) },
};
const DISPO = { carotte: c(12), endive: c(10), bette: c(5), poireau: c(3), epinard: c(6) };
const SEMAINE = {
  produits: Object.fromEntries(Object.entries(FICHES).map(([k, f]) => [k, fiche(f)])),
  q: Q,
  dispo: DISPO,
  stock: { carotte: { ta: { n: 1.5, u: 'colis', by: 'François', at: A } }, poireau: { ta: { n: 0.5, u: 'colis', by: 'François', at: A } }, endive: { ta: { n: 2, u: 'colis', by: 'François', at: A } } },
  stockListe: { ta: { carotte: { o: A, by: 'François', at: A }, poireau: { o: A + 1, by: 'François', at: A }, endive: { o: A + 2, by: 'François', at: A }, bette: { o: A + 3, by: 'François', at: A } } },
};
// La récolte du mercredi à mi-parcours : 4 produits cochés, un annulé ; une commande préparée en partie.
const LISTE_MER = {
  done: { mesclun: { by: 'Aurore', at: A + 600000 }, epinard: { by: 'François', at: A + 900000 }, bette: { by: 'Aurore', at: A + 1200000 }, aromatiques: { by: 'Martin', at: A + 1500000 } },
  annule: { radis: { by: 'François', at: A + 1800000 } },
  prep: { lv: { bette: { by: 'François', at: A + 2400000 } }, mk: { mesclun: { by: 'Aurore', at: A + 2500000 } } },
};

async function remplir(base) {
  const put = (p, v) => fetch(`${base}/${p}.json`, { method: 'PUT', body: JSON.stringify(v) });
  await put('listes/semaines/' + W, SEMAINE);
  await put('listes/' + MER, LISTE_MER);
}

module.exports = { T0, W, LUN, MER, FICHES, remplir };
