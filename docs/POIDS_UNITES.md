# Poids moyen d'une unité (légumes au kilo)

*Au 25 novembre 2026. Choix de François du 25/11 : compter en unités les légumes au kilo qui se comptent, avec le poids moyen d'une unité, « tu vas chercher les infos toi-même […] sur Internet. Je ne m'amuse pas à tout peser ». Tableau validé par François (« Vas-y », 25/11).*

Ces poids sont des **valeurs de départ**, rangées dans `referentiel/conditionnements.json`, champ `poids_unite` (en kg), produit par produit. Décision de François du 25/11 : ils seront réglables dans la future section « Produits » des Réglages, enregistrés dans la base dans la fiche de chaque produit, qui l'emportera alors sur ce fichier. L'appli lit le poids à un seul endroit (`complet()` dans `index.html`, depuis la fiche du référentiel chargée) : c'est là que la base prendra le relais. Une correction vaut pour toutes les semaines, même celles déjà saisies (le poids n'est pas recopié dans les semaines). Quand deux sources diffèrent, Claude a pris un chiffre rond entre les deux.

| Produit | Poids d'une unité | Ce que dit la source | Source |
| --- | --- | --- | --- |
| Ail sec | 80 g (une tête) | « Ail tête 0,080 kg » | [Bloc-notes culinaire](https://www.bloc-notes-culinaire.com/2019/09/poids-moyen-des-fruits-et-legumes.html) |
| Aubergine Violette | 400 g | moyenne 400 g ; moyenne 300 à 500 g | [Bloc-notes culinaire](https://www.bloc-notes-culinaire.com/2019/09/poids-moyen-des-fruits-et-legumes.html), [Eh toque](https://ehtoque.ca/2021/05/11/calibre-des-legumes-et-leur-poid/) |
| Bette | 1,3 kg (pied entier) | « Pied d'environ 1.3 kg » | [Greenweez](https://www.greenweez.com/produit/pied-de-blette-france-1-3kg/1VRAC0064) |
| Betterave Rouge | 200 g | « calibre unitaire recherché est de 100 à 300 g » | [Pleinchamp](https://www.pleinchamp.com/actualite/betterave-des-varietes-observees-en-normandie-pour-le-creneau-precoce) |
| Carotte lavée | 125 g | 0,125 kg | [Bloc-notes culinaire](https://www.bloc-notes-culinaire.com/2019/09/poids-moyen-des-fruits-et-legumes.html) |
| Céleri-branche | 650 g (un pied) | pied moyen 500 à 800 g | [Eh toque](https://ehtoque.ca/2021/05/11/calibre-des-legumes-et-leur-poid/) |
| Céleri-rave | 1 kg | 1 kg ; 800 à 1 500 g | [Bloc-notes culinaire](https://www.bloc-notes-culinaire.com/2019/09/poids-moyen-des-fruits-et-legumes.html), [Eh toque](https://ehtoque.ca/2021/05/11/calibre-des-legumes-et-leur-poid/) |
| Chou brocoli | 650 g | moyen 500 à 800 g | [Eh toque](https://ehtoque.ca/2021/05/11/calibre-des-legumes-et-leur-poid/) |
| Chou chinois | 1,3 kg | « Pièce de 1.3kg env. » | [Greenweez](https://www.greenweez.com/produit/chou-chinois-pe-tsai-france-1-3kg/1VRAC0555) |
| Chou fleur | 1,5 kg | 1,5 kg | [Bloc-notes culinaire](https://www.bloc-notes-culinaire.com/2019/09/poids-moyen-des-fruits-et-legumes.html) |
| Chou Frisé | 1,3 kg | chou de Milan « 1.2 - 1.5 kg » | [Prince de Bretagne](https://www.princedebretagne.com/en/our-vegetables/savoy-cabbage) |
| Chou Pointu | 900 g | « de 800 g à 1 kg » | [Greenweez](https://www.greenweez.com/produit/chou-cabus-blanc-pointu-de-chateaurenard-graines-bio/1LASE0211) |
| Chou romanesco | 550 g | « 400-700 g » | [Prince de Bretagne](https://princedebretagne.com/en/our-vegetables/romanesco) |
| Chou Rouge | 1,4 kg | 1 250 à 1 600 g | [Eh toque](https://ehtoque.ca/2021/05/11/calibre-des-legumes-et-leur-poid/) |
| Chou Vert | 1,5 kg | 2 kg ; chou de Savoie 1 200 g | [Bloc-notes culinaire](https://www.bloc-notes-culinaire.com/2019/09/poids-moyen-des-fruits-et-legumes.html), [Eh toque](https://ehtoque.ca/2021/05/11/calibre-des-legumes-et-leur-poid/) |
| Chou-rave vert (Colrave) | 385 g | « poids moyen de l'essai […] 385 g » | [GRAB](https://www.grab.fr/wp-content/uploads/2022/07/Compte-rendu-essais-chou-rave-abris-automne-hiver-GRAB-21-22.pdf) |
| Chou-rave violet (Colrave) | 385 g | même essai | [GRAB](https://www.grab.fr/wp-content/uploads/2022/07/Compte-rendu-essais-chou-rave-abris-automne-hiver-GRAB-21-22.pdf) |
| Concombre Court Epineux | 200 g | concombre 0,200 kg (sans préciser court) | [Bloc-notes culinaire](https://www.bloc-notes-culinaire.com/2019/09/poids-moyen-des-fruits-et-legumes.html) |
| Courge Butternut | 1 kg | « une moyenne de 1081 g » | [GRAB](https://www.grab.fr/wp-content/uploads/2021/03/CR-vari%C3%A9t%C3%A9s-petite-courge-plein-champ-GRAB-2013.pdf) |
| Courge Potimarron | 1 kg | « moyenne de 981 g » | [GRAB](https://www.grab.fr/wp-content/uploads/2021/03/CR-vari%C3%A9t%C3%A9s-petite-courge-plein-champ-GRAB-2013.pdf) |
| Courgette Verte cal 14/25 | 200 g | moyenne 200 g | [Bloc-notes culinaire](https://www.bloc-notes-culinaire.com/2019/09/poids-moyen-des-fruits-et-legumes.html) |
| Courgette Verte cal 30/40 | 400 g | grosse (21 à 35 cm) 225 à 500 g | [Eh toque](https://ehtoque.ca/2021/05/11/calibre-des-legumes-et-leur-poid/) |
| Endive | 150 g | 150 g | [Eh toque](https://ehtoque.ca/2021/05/11/calibre-des-legumes-et-leur-poid/) |
| Fenouil | 400 g | « le poids moyen de l'essai est de 433 g » ; 300 g | [GRAB](https://www.grab.fr/wp-content/uploads/2021/05/2-CR-essais-GRAB-varietes-FENOUIL-PLEIN-CHAMP-AB-ete-aut-2020.pdf), [Prince de Bretagne](https://www.princedebretagne.com/en/our-vegetables/fennel) |
| Melon Charentais | 700 g | « 1 fruit / 650 à 800 g » | [Open Food Facts](https://world.openfoodfacts.org/product/3700370900203/melon-charentais-le-gout-du-bio) |
| Navet violet | 200 g | navet rond moyen 0,200 kg | [Bloc-notes culinaire](https://www.bloc-notes-culinaire.com/2019/09/poids-moyen-des-fruits-et-legumes.html) |
| Oignon blanc demi-sec | 100 g | oignon moyen 0,100 kg | [Bloc-notes culinaire](https://www.bloc-notes-culinaire.com/2019/09/poids-moyen-des-fruits-et-legumes.html) |
| Panais | 200 g | « 150 g environ » ; 200 à 300 g | [Réussir](https://www.reussir.fr/fruits-legumes/le-panais-plus-blanc-que-blanc), [Prince de Bretagne](https://www.princedebretagne.com/en/our-vegetables/parsnips) |
| Pastèque | 2,5 kg | « Calibre : 2 à 3 kg » | [GRAB](https://www.grab.fr/wp-content/uploads/2025/04/conseil-varietal-pasteque-2025-SUDEXPE.pdf) |
| Patate douce | 450 g | 473 et 526 g dans un essai ; 300 à 600 g | [GRAB](https://grab.fr/1155), [Prince de Bretagne](https://www.princedebretagne.com/en/our-vegetables/sweet-potatoes) |
| Poireau | 200 g | 150 g ; essai 110 à 253 g | [Prince de Bretagne](https://www.princedebretagne.com/en/our-vegetables/leeks), [GRAB](https://www.grab.fr/wp-content/uploads/2026/07/01128_M25_PACA_variete_adaptees_essai_var_poireau_CG-VLP.pdf) |
| Rhubarbe | 80 g (une tige) | « 1 stem = 80 g » | [Prince de Bretagne](https://www.princedebretagne.com/en/our-vegetables/rhubarb) |
| Rutabaga | 400 g | « 400 g » | [Prince de Bretagne](https://www.princedebretagne.com/en/our-vegetables/swede) |
| Tomate Ancienne Population Mélange | 250 g | cœur de bœuf « 200 à 300 g » | [Greenweez](https://www.greenweez.com/produit/graines-bio-a-semer-tomate-coeur-de-boeuf-de-nice/1ASSO0027) |
| Tomate Ronde Rouge | 150 g | 135 à 230 g (calibre 67 à 82 mm) ; petite 75 g, grande 200 g | [Eh toque](https://ehtoque.ca/2021/05/11/calibre-des-legumes-et-leur-poid/), [Bloc-notes culinaire](https://www.bloc-notes-culinaire.com/2019/09/poids-moyen-des-fruits-et-legumes.html) |

**Sans unité.** Pas de poids fiable trouvé : bette mini (pied), radis noir rond, radis d'hiver en mélange (à ajouter si François donne un chiffre). Laissés en colis et kilos, choix du 25/11 : épinard, fève, haricot vert, mâche, mesclun, petit pois, pois mange-tout, roquette, tomate cerise, chou kale. Les produits en bottes, bouquets ou pièces ont déjà leur unité.

**Pour une autre ferme.** Le champ est facultatif, produit par produit : sans `poids_unite`, le produit se compte en colis et en kilos comme avant.
