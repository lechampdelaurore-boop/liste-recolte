# Ancien tableau de cumul et fiche des prix (description)

Source : deux feuilles du même classeur tableur de François, recopiées par lui le 6/11/2026 (texte et capture). **Ce document décrit ce qu'on voit ; les calculs marqués « deviné » sont des déductions à confirmer par François.** Il prépare l'étape 13 (outil d'arbitrage hebdomadaire) et l'étape 19 (base de données des produits) de `docs/ROADMAP.md`. Aucun code.

## Feuille 1 : le tableau de cumul (une ligne par produit)

18 lignes dans la copie reçue (Aromatiques, Mesclun, Epinard, Céleri-branche, Bette, trois choux, Carotte lavée, trois tomates, Endive, Panais, Radis d'hiver, Patate douce, Céleri-rave, Betterave rouge, Poireau). Quantités en **colis** (0,5 = un demi-colis).

| Colonne | Sens | Remarque |
|---|---|---|
| Produit | Nom | |
| Colis | Type de caisse : PB, PH, GB, GH | Comme dans le référentiel de l'appli |
| Conditionnement / Unité | Contenu d'un colis (1 kg, 5 kg, Botte x6…) | Texte libre, pas toujours le même format (« 5kg », « Colis 5 kg ») |
| Prix TTC / kg-Unité | Prix client TTC | **Hors de l'outil** (décision du 6/11) : colonne non reprise |
| Groupe | Numéro de 1 à 5 | **Priorité de récolte** (les légumes fragiles se récoltent tôt le matin, surtout en été). **Pas repris** dans l'outil : le glisser-déposer de la liste donne l'ordre voulu (décision du 6/11) |
| dispo de semaine | Quantité disponible dans la semaine | Remplie seulement pour les tomates (12 et 4) |

**Bloc MARDI** : total MARDI, Très Allier Mardi, DISPO AUVABIO 63, AUVABIO 63 (vendu).
**Bloc JEUDI** : total JEUDI, Très Allier Jeudi, Marché Vendredi, dispo AUVABIO 03, Vendu AUVABIO 03, dispo AUVABIO 63, Vendu AUVABIO 63.

Les colonnes Très Allier, Marché et « Vendu » sont les **quantités réparties par François et Aurore** entre les débouchés ; les colonnes « total » et « dispo » sont calculées.

### Calculs devinés (à confirmer)

- *total MARDI* = Très Allier Mardi (+ vendu AUVABIO 63 du mardi, vide dans la copie).
- *DISPO AUVABIO 63 (mardi)* = dispo de semaine − total MARDI. Vide = 0, donc un **nombre négatif = ce qui manque** (aromatiques : −0,5).
- *total JEUDI* = Très Allier Jeudi + Marché Vendredi + vendu AUVABIO 03. Vérifié sur l'endive : 2 + 1 + 7 = 10.
- *dispo AUVABIO 03* = dispo de semaine − total MARDI − (Très Allier Jeudi + Marché). Vérifié sur aromatiques (−1,5), mesclun (−3), endive (−5).
- *dispo AUVABIO 63 (jeudi)* : **ne suit pas une règle unique**. Égale à dispo 03 pour aromatiques, mesclun, céleri-rave ; plus haute de 1 pour l'épinard (−4 au lieu de −5), de 1,5 pour la bette (−2 au lieu de −3,5) ; endive −11 au lieu de −12. Formules probablement modifiées à la main selon les lignes.

### Les erreurs #VALEUR! (tomates)

Les trois tomates (ronde rouge, cerise, ancienne) ont le mot **« tout »** écrit dans la colonne Très Allier (mardi et jeudi). Les totaux additionnent cette colonne : un mot dans une addition donne l'erreur #VALEUR!, et elle se propage aux colonnes calculées (total, dispo). Sens devinée de « tout » : toute la quantité disponible part chez Très Allier. Le logiciel devra gérer ce cas explicitement (case « tout »), pas par un mot dans un nombre.

Autres constats : « Marché Vendredi » est dans le bloc JEUDI (le marché a lieu le vendredi, la préparation le jeudi) ; la dispo de semaine est vide pour 16 des 18 produits (donc chaque dispo est négative : le tableau sert surtout à voir ce qui est engagé).

## Feuille 2 : la fiche des prix (hors de cet outil)

Cette feuille calcule les prix (prix HT AUVABIO, prix client TTC et HT). **Décision de François du 6/11/2026 : le calcul des prix n'entre pas dans cet outil**, il existe déjà dans un autre outil. Les formules, marges et prix ne sont donc ni décrits ni repris ici.

Seule partie utile à l'outil : la liste des produits, avec **Colis** (PB, PH, GB, GH) et **Unité / Colis** (le groupe n'est pas repris). À reprendre dans la base des produits (étape 19), après nettoyage : la liste contient des doublons (Poireau trois fois ; Chou frisé, Chou rouge, Radis d'hiver, Panais, Rutabaga, Betterave, Navet, Céleri, Ail en double), des unités écrites de plusieurs façons (« 5 kg », « 5kg », « Colis 5 kg ») et des lignes sans unité ni groupe.

## Ce que cela implique pour la roadmap

- Étape 13 : le tableau de cumul est un arbitrage **par débouché et par jour** (Très Allier mardi et jeudi, Marché vendredi, AUVABIO 03 et 63). Les débouchés de l'appli (`ta`, `ma`, etc.) et ceux du tableur ne sont pas les mêmes ; à rapprocher.
- Étape 19 : la base des produits porte produit, colis, unité par colis et colisage selon les débouchés. **Pas de prix.**
- Cas « tout » : à prévoir dans l'outil.
