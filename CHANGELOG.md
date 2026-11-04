# Historique des changements

## 2026-11-04

- **Colisage par débouché** : un circuit peut avoir son propre colisage (`colisages` et `circuits[].colisage` dans la liste). Paniers solidaires, Locavore et Ferme Deschamps sont en colis bois : PB → petit colis bois, PH → moyen colis bois, GB et GH → grand colis bois. Les colis bois sont comptés à part dans « Caisses » et nommés dans la vue Détail et le filtre du circuit.
- Liste du 4 novembre : nouveau circuit Ferme Deschamps, 1 colis de 10 bouquets de persil (petit colis bois). Caisses à remplir : 2 PB, 19 PH, 2 GB, 10 GH (au lieu de 14 GH : la bette des paniers passe en colis bois), plus 1 petit et 4 grands colis bois.
- Référentiel : colisage bois, circuits concernés, persil frisé en bouquet (10 par colis, PB), 74 produits.
- `sw.js` : `CACHE` passe à `recolte-v7`. Test deux-téléphones : 15 vérifications (4 nouvelles).

## 2026-11-03

- Ajout de `AGENTS.md` et des registres (`docs/ETAT_DU_PROJET.md`, `docs/ROADMAP.md`, `docs/DECISIONS.md`, `CHANGELOG.md`). `CLAUDE.md` renvoie vers `AGENTS.md`.
- La liste de la semaine passe désormais par une PR (README, `docs/format-liste.md`).
- README : appui long corrigé à 0,45 s (comme dans le code).
- Aucun changement du code de l'appli, `CACHE` reste `recolte-v6`.

## Avant (d'après `git log`)

- Un seul affichage : fond blanc, texte noir, même en mode sombre.
- Appui long pour déplacer une ligne, charte lisible en plein soleil.
- Zones réelles : Tunnel, Plein champ, Stock.
- Référentiel des conditionnements (73 produits), base Firebase partagée, documentation et test de bout en bout, première version de l'appli.
