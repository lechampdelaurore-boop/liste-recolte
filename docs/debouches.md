# Débouchés de la ferme (description de François, 6/11/2026)

Source : message de François du 6/11/2026 (dicté à la voix ; les noms ci-dessous sont corrigés d'après les registres : « Ovabio » = Auvabio, « Trongé » = Tronget, « colibois » = colis bois, « Très Allié » = Très Allier). Aucun code. Jours de livraison complétés le 6/11 (Locavore, Panier adéquat, Panier La Magic, Élie). Prépare les étapes 11, 13 et 22 de `docs/ROADMAP.md`.

| Débouché | Priorité | Colisage | Livraison |
|---|---|---|---|
| **Très Allier** (magasin) | **Prioritaire** | Caisses plastique (PB, PH, GB, GH) | Mardi et jeudi |
| **Locavore** | Ensuite | Colis bois | Mercredi soir |
| **Clients individuels** (par exemple **Élie**, avec un seul L) | | Non précisé | N'importe quel jour |
| **Auvabio 03** | | Non précisé | Jeudi (le 63 reprend le reste) |
| **Auvabio 63** | | Non précisé | Jeudi aussi (seconde livraison) |
| **Marché de Tronget** | | Colis plastique | Tous les vendredis |
| **Panier La Magic** | | Colis plastique | Avec **l'une** des livraisons Très Allier : mardi ou jeudi, selon la semaine |
| **Panier adéquat** | | Colis bois | Toujours le mercredi, début d'après-midi |

« Colis plastique » = les caisses PB, PH, GB, GH.

## Ce que François demande à l'outil

**Les débouchés ne doivent pas être figés dans le code.** Une option pour **ajouter et supprimer des débouchés**. Dans la **fiche de création d'un débouché** : le **colisage** (type : **plastique** ou **bois**) et les **jours de livraison**. **Chaque débouché doit avoir un jour de livraison** (champ obligatoire de la fiche, demande de François du 6/11). Cela concorde avec la règle « ne jamais réduire un outil à une seule ferme » et avec l'étape 19 (base de données des produits modifiable).

## À préciser plus tard (pas encore demandé à François)

- Priorité : seulement Très Allier est dit prioritaire ; faut-il un ordre pour les autres ?
- Nom du client individuel : **Élie** (confirmé par François le 6/11). Renommé dans l'appli, la liste du 04/11, le `README.md` et le test le 6/11 (oui de François) ; identifiant interne `el` gardé, donc commandes et coches conservées.
- Un jour « variable » (Élie : n'importe quand ; Panier La Magic : mardi ou jeudi selon la semaine) : la fiche de débouché doit permettre un jour au choix à chaque semaine, en plus des jours fixes, alors que « chaque débouché a un jour de livraison » reste la règle.
- Heure ou moment de la journée (mercredi soir, mercredi début d'après-midi) : champ facultatif de la fiche ?
- Suppression d'un débouché qui a déjà des commandes ou des coches : le garder en archive plutôt que l'effacer (données réelles, règle 14).
