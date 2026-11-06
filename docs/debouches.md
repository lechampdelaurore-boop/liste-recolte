# Débouchés de la ferme (description de François, 6/11/2026)

Source : message de François du 6/11/2026 (dicté à la voix ; les noms ci-dessous sont corrigés d'après les registres : « Ovabio » = Auvabio, « Trongé » = Tronget, « colibois » = colis bois, « Très Allié » = Très Allier). Aucun code. Prépare les étapes 11, 13 et 22 de `docs/ROADMAP.md`.

| Débouché | Priorité | Colisage | Livraison |
|---|---|---|---|
| **Très Allier** (magasin) | **Prioritaire** | Caisses plastique (PB, PH, GB, GH) | Mardi et jeudi |
| **Locavore** | Ensuite | Colis bois | Non précisé |
| **Clients individuels** (par exemple Ellie) | | Non précisé | Non précisé |
| **Auvabio 03** | | Non précisé | Jeudi (le 63 reprend le reste) |
| **Auvabio 63** | | Non précisé | Jeudi aussi (seconde livraison) |
| **Marché de Tronget** | | Colis plastique | Tous les vendredis |
| **Panier La Magic** | | Colis plastique | En même temps que Très Allier (mardi et jeudi) |
| **Panier adéquat** | | Colis bois | Non précisé |

« Colis plastique » = les caisses PB, PH, GB, GH.

## Ce que François demande à l'outil

**Les débouchés ne doivent pas être figés dans le code.** Une option pour **ajouter et supprimer des débouchés**. Dans la **fiche de création d'un débouché** : le **colisage** (type : **plastique** ou **bois**) et les **jours de livraison**. **Chaque débouché doit avoir un jour de livraison** (champ obligatoire de la fiche, demande de François du 6/11). Cela concorde avec la règle « ne jamais réduire un outil à une seule ferme » et avec l'étape 19 (base de données des produits modifiable).

## À préciser plus tard (pas encore demandé à François)

- Priorité : seulement Très Allier est dit prioritaire ; faut-il un ordre pour les autres ?
- Jours de livraison de Locavore, d'Ellie et de Panier adéquat (l'appli n'en a aucun aujourd'hui ; Auvabio 03 et 63 : jeudi, connu).
- Suppression d'un débouché qui a déjà des commandes ou des coches : le garder en archive plutôt que l'effacer (données réelles, règle 14).
