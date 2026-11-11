# Colisage relevé dans les fiches d'agréage Auvabio (magasins)

Source : « Fiches d'agréage MAGASINS », version du 18 mai 2026 (PDF de 69 pages, groupe de travail Agréage d'Auvabio, financé dans le cadre du Plan Alimentaire Territorial du Grand-Clermont), envoyé par François le 6/11/2026. Chaque fiche a sa propre date de version (de février 2023 à mai 2026) ; elle est indiquée ci-dessous quand elle compte. **Ce document relève ce que dit le PDF ; il ne tranche rien.** Aucun code, aucun prix. Il prépare l'étape 19 de `docs/ROADMAP.md` (base de données des produits) et nourrit l'outil de répartition hebdomadaire.

## À lire avant le tableau

- **Ces fiches décrivent le colisage demandé par Auvabio**, pas celui de tous les débouchés. Le PDF le dit lui-même : « le colisage indiqué sur le bon de commande prévaut toujours ». Très Allier, le marché, Panier La Magic, ou une autre ferme cliente peuvent avoir un autre colisage pour le même produit. C'est donc une **base de départ**, à confirmer par débouché, jamais une vérité unique.
- Le PDF connaît **cinq types de caisse** : petite haute (PH), petite basse (PB), grande haute (GH), grande basse (GB) et **caisse bois**. Les quatre premiers sont ceux de l'appli. La caisse bois est citée mais **aucune fiche ne donne de contenu en caisse bois** (le colis bois de Locavore, Panier adéquat et Ferme Deschamps reste défini par `referentiel/conditionnements.json`).
- Un produit peut avoir **plusieurs colisages selon le calibre, la variété ou la présentation** (courgette, patate douce, poires, pommes, pommes de terre, fraises, poireau, courges). Le modèle de la base de produits devra le permettre (voir « Ce que cela implique »).
- Deux sortes de contenu : **au poids** (« 5 kg ») ou **à l'unité** (« 10 bottes », « 8 pièces », « 5 sachets », « 9 barquettes »). Pour les bottes, le PDF donne parfois un **poids indicatif par botte** ; c'est utile pour passer des bottes aux kilos, et l'inverse.

## Ce que dit le PDF, produit par produit

Notation : « kg » ou unités = contenu d'**un colis** ; caisse = PB, PH, GB, GH. « Écart » renvoie à la section suivante.

### Produits au poids

| Produit (fiche) | Contenu / colis | Caisse | Remarque du PDF |
|---|---|---|---|
| Ail (sec) | 5 kg | PH | fond de caisse |
| Ail frais | 5 kg | PH | tige coupée à 10 cm |
| Artichaut | 3 kg | PB | environ 300 g par pièce |
| Asperge | 4 kg | PH | verte ou blanche |
| Aubergine violette | 7 kg | GH | 1 variété par caisse |
| Bette (vrac) et bette pied | 5 kg | GH | |
| Betterave rouge | 7 kg | PH | |
| Carotte lavée | 8 kg | PH | fiche de décembre 2025 |
| Céleri-branche | 5 kg | GH | |
| Céleri-rave | 5 kg | PH | |
| Cerises | 3 kg | PB | |
| Châtaignes | 5 kg | PH | |
| Chou brocoli, chou-fleur, chou romanesco | 7 kg | GH | |
| Chou chinois (Pak Choï seulement) | 7 kg | GH | |
| Chou de Bruxelles | 5 kg | PH | |
| Chou kale | 3 kg | GH | fiche de février 2023 |
| Chou frisé Milan | 6 kg | GH | « si colis de 6 kg non adaptés, appeler l'équipe salariée » |
| Chou rouge, chou vert lisse | 10 kg | GH | |
| Chou-rave | 5 kg | PH | |
| Coing | 5 kg | PB | |
| Concombre court épineux | 5 kg | PH | |
| Courges (butternut, potimarron, etc.) | 10 kg | GH | |
| Pâtisson (courge) | 5 kg | PH | « colisage différent » |
| Courgette longue, calibre 14-25 | 7 kg | PH | 1 calibre par caisse |
| Courgette longue, calibre 30-40 | 7 kg | GB | 1 calibre par caisse |
| Courgette ronde | 5 kg | PH | |
| Échalote | 5 kg | PH | fiche d'octobre 2025 |
| Endive | 5 kg | PH | |
| Épinard | 4 kg | GH | |
| Fenouil | 5 kg | PH | |
| Fève | 4 kg | PH | |
| Haricot vert | 3 kg | PH | |
| Mâche | 1 kg | PH | |
| Melon | 12 kg | GH | |
| Navet (en vrac) | 5 kg | PH | |
| Noix sèche | 5 kg | PH | |
| Oignon jaune et rouge | 7 kg | PH | |
| Panais | 5 kg | PH | |
| Pastèque | 12 kg | GH | |
| Petit pois (avec gousse) | 4 kg | PH | |
| Pois mange-tout | 2 kg | PB | |
| Piment | 1 kg | PB | 1 variété, 1 couleur par caisse |
| Poireau | 10 kg | GH | |
| Poireau de printemps | 5 kg | GH | diamètre 10 à 25 mm |
| Poivron | 5 kg | GB | |
| Radis noir rond, radis noir long, radis d'hiver mélange | 5 kg | PH | mélange : au moins 3 couleurs |
| Rhubarbe | 7 kg | GB | |
| Rutabaga | 5 kg | PH | |
| Topinambour | 3 kg | PB | |
| Tomate ronde rouge (monovariété) | 5 kg | PH | |
| Tomate ancienne mélange | 6 kg | GB | |
| Tomate cerise | 3 kg | PB | |
| Tomate cocktail | 3 kg | PB | |

### Produits avec plusieurs colisages (selon calibre ou type)

| Produit | Colisage | Caisse |
|---|---|---|
| Patate douce | calibre maximum 1 kg : 6 kg ; calibre au-dessus de 1 kg : 10 kg | PB (6 kg) ; GH (10 kg) |
| Poires | 80 à 100 g : 5 kg ; 100 à 200 g, 200 à 300 g, 300 g et plus : 10 kg | PH (5 kg) ; GB (10 kg) |
| Pommes | 90 à 135 g et 135 à 200 g : 10 kg ; 200 g et plus : 10 kg | GB (les deux premiers) ; GH (200 g et plus) |
| Pommes de terre (vrac, consommation classique) | 8 kg en caisse, ou 20 kg en filet ou GH | PH (8 kg) ; GH (20 kg) |
| Pommes de terre (sachets) | 5 sachets | GH |
| Pommes de terre grenaille (restauration hors domicile seulement) | 8 kg | PH |
| Pommes de terre nouvelles | 8 kg | PH |
| Fraises, barquettes de 250 g | 9 barquettes (barquettes ouvertes, cas général) ou 6 (fermées) | PB |
| Fraises, barquettes de 500 g | 12 barquettes (ouvertes) ou 10 (fermées) | GB |

### Produits à l'unité (bottes, pièces)

| Produit | Contenu / colis | Caisse | Poids indicatif |
|---|---|---|---|
| Ail frais, en botte | 10 bottes | GB | poids de botte « à déterminer » (3 à 5 têtes) |
| Aillet, échalote en botte, oignon cébette | 10 bottes | GB | 140 à 160 g la botte |
| Oignon (botte) | 10 bottes | GH | |
| Aromatiques (persil, ciboulette, basilic, menthe, etc.) | 6 bottes | PB | persil frisé 60 g ; persil plat 80 g ; ciboulette 60 g ; basilic 80 g ; menthe 60 à 70 g ; romarin et thym 60 g la botte ; autres plantes : poids « à remplir » |
| Betterave en botte | 8 bottes | GH | 600 g la botte, 4 à 5 betteraves |
| Carotte en botte | 10 bottes | GH | 700 g la botte, 12 à 17 carottes |
| Navet en botte | 10 bottes | GH | |
| Radis en botte | 12 bottes | GB | 350 à 400 g la botte, 20 à 30 radis |
| Poireau en botte (avec code EAN) | 10 bottes | GH | 750 g minimum la botte ; 3 à 4 poireaux |
| Poireau de printemps en botte | 10 bottes | GH | 750 g minimum ; 6 à 7 poireaux |
| Concombre long lisse | 10 pièces | PH | 300 à 600 g la pièce |
| Salades (batavia, feuille de chêne, laitue) | 8 pièces | GH | format classique 250 à 600 g ; mini 170 à 250 g |

## Écarts avec la base de produits existante (`referentiel/conditionnements.json`)

À décider par François, ligne par ligne. Je n'ai rien modifié dans le référentiel.

**Même produit, caisse ou contenu différent**

| Produit | Référentiel de l'appli | Fiche Auvabio |
|---|---|---|
| Aubergine violette | GB, 7 kg | **GH**, 7 kg |
| Céleri-branche | GB, 5 kg | **GH**, 5 kg |
| Mâche | **PB**, 1 kg | **PH**, 1 kg |
| Oignon blanc (botte) | GB, 10 bottes | **GH**, 10 bottes (fiche « oignon botte ») ; GB pour l'oignon cébette |
| Patate douce | PH, 6 kg | PB pour 6 kg (calibre maximum 1 kg) ; GH pour 10 kg au-dessus de 1 kg |
| Persil frisé | PB, **10 bouquets** (donné par François pour la Ferme Deschamps) | PB, **6 bottes** (aromatiques) |
| Salade laitue romaine | GB, 8 pièces | La fiche ne cite que batavia, feuille de chêne et laitue : GH, 8 pièces. La romaine n'est pas nommée. |

**Dans le référentiel, absent des fiches** (ces produits ne sont pas dans le PDF, ce n'est pas une erreur du référentiel) : bette multicolore en bouquet, betterave cuite sous vide, chou pointu, rabiole, roquette, mesclun, oignon blanc demi-sec, persil en bouquet.

**Dans les fiches, absent du référentiel** : ail frais et ail frais en botte, artichaut, asperge, cerises, châtaignes, chou de Bruxelles, coing, courgette ronde, échalote, fraises, noix sèche, pâtisson, piment, poireau de printemps et poireau en botte, poires, poivron, pommes, pommes de terre, radis noir long, tomate cocktail, topinambour.

**Précision sur les fiches elles-mêmes** : la page 46 du PDF est un doublon exact de la fiche « Mâche » (page 43). Elle devait peut-être porter une autre salade (le mesclun, la roquette ?). Je ne devine pas : à vérifier avec l'auteur du PDF si le mesclun ou la roquette est attendu.

## Réponses de François (6/11/2026, dictées à la voix)

Message dicté ; les trois mots douteux (« le rebranch », « la tête douce », « les bouquets ») ont été confirmés par François. Le référentiel `conditionnements.json` n'était pas modifié par cette PR ; les deux changements ont été faits ensuite le 6/11, après le « oui » de François.

| Produit | Réponse | Effet sur le référentiel |
|---|---|---|
| Aubergine | Grande basse (GB) | Rien à changer |
| Céleri-branche | Plutôt grande haute (GH), comme Auvabio | Fait le 6/11 (GB → GH) |
| Mâche | Petite basse (PB) | Rien à changer |
| Oignon en botte | Grande basse (GB) | Rien à changer |
| Patate douce | Petite haute (PH), 6 kg | Rien à changer |
| Bouquets de persil frisé | Par 6 | Fait le 6/11 (10 bouquets → 6) |
| Céleri-branche en bouquet (11/11, nouveau produit, absent des fiches Auvabio) | Par 10 en grande basse (GB) pour les caisses plastiques ; grand colis bois pour les débouchés en colis bois | Ajouté le 11/11, à côté du céleri-branche au kilo (inchangé) |

## Écarts avec la fiche des prix (PR #15, `docs/tableau-cumul.md`)

Le dépôt **ne contient pas** la fiche des prix elle-même, seulement sa description : elle dit que la liste des produits, avec « Colis » (PB, PH, GB, GH) et « Unité / Colis », vient du même onglet que le référentiel (« Liste produits » du cumul, capture du 3/11). Je n'ai donc pas pu comparer ligne à ligne avec le tableur ; **la comparaison ci-dessus avec `conditionnements.json` en tient lieu**, en supposant que le référentiel reprend bien le tableur. Constats qui rejoignent `docs/tableau-cumul.md` :

- Le tableur écrit les unités de plusieurs façons (« 5 kg », « 5kg », « Colis 5 kg ») ; les fiches Auvabio sont plus régulières (« 5kg », « 10 bottes », « 8 pièces »).
- Le tableur contient des doublons (Poireau trois fois, etc.) ; les fiches Auvabio n'en ont pas, mais **ont des produits sous des noms différents** (« Aillet / Échalote botte / Oignon cébette » regroupés sur une seule fiche, « Racines » sur trois pages, « Choux à inflorescences »).
- À valider avec François : la ligne du cumul « Chou Frisé » (6 kg) est bien le chou frisé Milan des fiches ; « Chou Pointu » n'a pas de fiche.

## Ce que cela implique (à discuter, rien de décidé)

- **Une fiche produit ne suffit pas pour un colisage** : il faut au moins produit × débouché × (calibre ou variante). Exemples : la courgette longue change de caisse selon le calibre, la patate douce selon le poids, les fraises selon la barquette. Cela va dans le sens de l'étape 19 (conditionnements « selon les débouchés ») et de l'étape 22 (débouchés paramétrables).
- **Deux modes de contenu** : au poids ou à l'unité, avec un **poids indicatif par unité** facultatif (botte de radis 350 à 400 g, carotte 700 g, etc.). Il servirait à comparer des quantités exprimées en bottes et en kilos dans la répartition hebdomadaire. Les poids de botte varient d'une ferme à l'autre : à saisir par la ferme, pas figés.
- **Ce colisage est celui d'Auvabio, donc d'un débouché parmi d'autres.** Les autres fermes qui utiliseront l'outil auront d'autres débouchés et d'autres fiches ; ce relevé sert d'exemple de contenu, pas de règle (règle 15 des instructions du projet).
- Le PDF indique aussi, pour chaque produit, la **durée de stock autorisée** (15 jours, 1 semaine, pas de stock, stock longue durée possible). Ce n'est pas du colisage ; je ne l'ai pas relevé. Elle pourrait servir à l'étape 12 (stock du magasin).

## Ce qui n'a pas été fait ni vérifié

- Le relevé vient de l'extraction du texte du PDF. Des mots d'une fiche coupée en deux colonnes (pommes de terre, fraises, tomates page 68) ont été relus à la main, mais **je n'ai pas regardé les images des pages** : un chiffre qui serait seulement dans une photo ne serait pas relevé.
- Rien n'a été comparé au vrai tableur de François (non reçu en fichier).
- Aucune modification de `referentiel/conditionnements.json` ni de l'appli.
