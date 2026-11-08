# Plan de l'étape 13D : les listes de récolte se remplissent toutes seules

*Préparation sur le papier, 8 novembre 2026. Aucun code. Source : lecture du dépôt (état du 8/11, après les PR #31 à #34). Demande de François : « Oui, vas-y. La préparation de 13D. »*

## Le but en une phrase

Aujourd'hui, une liste de récolte est un fichier écrit à la main et envoyé par une PR (seule celle du 4/11 existe). Demain, François choisit un **jour de récolte** dans l'onglet Semaine, et la liste de ce jour apparaît dans l'onglet Récolte, sans fichier ni PR.

## Ce qui existe déjà (vérifié dans le dépôt)

- L'onglet Semaine garde, par semaine (`listes/semaines/<lundi>`) : le disponible, les quantités par livraison (en colis, kilos ou unités), les cases « tout », le reste Auvabio 63, le stock Très Allier (information seulement).
- Les **jours de récolte** (`listes/reglages/debouches`, champ `recoltes`) disent quelles livraisons on récolte quel jour. Départ : lundi = Très Allier mardi + Panier La Magic ; mercredi = Panier adéquat, Locavore, Très Allier jeudi, Auvabio 03 et 63, Marché de Tronget. Élie n'a pas de jour.
- Le cadre « À récolter, jour par jour » additionne déjà, par produit, ce qu'il faut récolter ce jour-là.
- La liste de récolte, elle, est un fichier `listes/AAAA-MM-JJ.json` (format dans `docs/format-liste.md`) ; la base ne garde que l'ordre et les coches, sous `listes/<date>`.

## Comment une liste naît d'un jour de récolte

0. **Comment François s'en sert (précision du 8/11)** : dans l'onglet Semaine, il **ajoute un jour de récolte** (par exemple le lundi 9 novembre). L'appli lui montre alors **toutes les livraisons de la semaine** et il coche celles qu'il récolte ce jour-là. La liste de récolte se remplit toute seule. Logique habituelle : le lundi, les livraisons du mardi ; le mercredi, celles du mercredi, du jeudi et du vendredi. Les jours de récolte « habituels » déjà réglés (lundi, mercredi) servent seulement de **proposition de départ** déjà cochée, que François change à volonté pour cette semaine (question 6).
1. Une liste = **un jour de récolte d'une semaine**. Son identifiant est la date réelle de ce jour (lundi 9 novembre = `2026-11-09`), comme aujourd'hui : les coches et l'ordre restent donc dans `listes/2026-11-09`, au même endroit et de la même façon qu'aujourd'hui. Les jours de récolte de la semaine sont gardés avec elle, dans `listes/semaines/<lundi>` (nouveau nœud, aucune donnée existante touchée).
2. L'appli **calcule la liste en direct** à partir de la semaine et des livraisons cochées : pour chaque produit où au moins une de ces livraisons a une quantité, une ligne. Une livraison cochée un jour ne l'est pas un autre jour de la même semaine (elle se déplace).
3. Chaque livraison cochée pour ce jour devient un « circuit » de la liste (c'est ce que font déjà les débouchés : leur identifiant sert de circuit). Une livraison d'un autre jour n'y figure pas.
4. Le produit, la caisse (PB, PH, GB, GH) et le contenu d'un colis viennent de la fiche du produit copiée dans la semaine. Rien n'est inventé : un produit sans fiche n'entre pas dans la liste et l'appli le signale.
5. Le **total** et les **kilos** de chaque ligne, écrits à la main aujourd'hui, sont **calculés par l'appli**. Test de confiance : refaire avec l'outil la liste du 4/11 et comparer ligne à ligne avec le fichier existant.
6. Pas de lieu (zone, emplacement) : masqué depuis le 4/11, rien à calculer. Les zones reviendront avec l'étape 9 (Ouvre ta ferme).

## Unités et colis

- **Colis** (nombre de PB, PH, GB, GH) : devient un nombre dans `circ`, compté dans les caisses.
- **Kilos** : devient un texte (« 5 kg »), compté comme aujourd'hui (une caisse de plus pour les kilos hors colis).
- **Bottes, bouquets, pièces** : texte (« 6 bottes »), compté à part des kilos dans la barre de progression.
- **Colis bois** : le colisage vient du réglage du débouché (« bois » ou « plastique ») ; la liste affiche petit, moyen, grand colis bois pour Panier adéquat, Locavore, Ferme Deschamps, comme le 4/11.
- **Case « tout »** (Très Allier) : la ligne affiche « tout », sans quantité, comme aujourd'hui.
- **Stock chez Très Allier** : jamais dans la liste (c'est de la marchandise déjà au magasin).
- **Reste proposé à Auvabio 63** : dans la liste seulement s'il a été saisi comme quantité, comme dans « À récolter, jour par jour ».

## Que deviennent les modifications à la main

- **Quantités** : on les change dans l'onglet Semaine, une seule source. Pas de quantité modifiable directement sur la liste (sinon deux vérités). Voir la question 3.
- **Ordre des lignes** (glisser par appui long) : reste dans la base, `listes/<date>/order`, inchangé.
- **Coches** (récolte, préparation, client prêt) : inchangées, `done`, `prep`, `prepClient`, `maj`, avec « la dernière action gagne ».
- **Changement de la semaine après des coches** : voir la question 2. Recommandation : la liste est figée au premier clic ; un changement ultérieur est signalé sur la ligne (« était 3, maintenant 4 »), jamais appliqué sans qu'on le voie.
- **Liste du 4/11 et listes déjà en fichier** : rien n'y change. Si un fichier existe pour une date, il l'emporte sur le calcul.

## Découpage en trois PR (une à la fois, code dans un seul fil)

| PR | Contenu | Touche les vraies données ? |
|---|---|---|
| 13D-1 | **Aperçu seul** : dans l'onglet Semaine, « Ajouter un jour de récolte » (date + livraisons à cocher) et bouton « Voir la liste de ce jour », la liste calculée s'affiche en lecture seule. Test qui refait la liste du 4/11 et la compare au fichier. | Non (lecture seule) |
| 13D-2 | La liste calculée s'ouvre dans l'onglet Récolte, avec coches et ordre (même base qu'aujourd'hui). Réglage pour l'activer ; sans lui, tout se passe comme avant. | **Oui : « vas-y » exprès** avant d'activer sur les vrais téléphones |
| 13D-3 | Choix du jour dans l'appli (fin de `listes/actuelle.json` fait à la main), registres, mode d'emploi. | **Oui : « vas-y » exprès** (change ce que les téléphones ouvrent) |

## Ce qui touche les vraies données et demandera votre « vas-y »

- Lire `listes/semaines` et `listes/reglages` : aucune écriture, pas besoin de « vas-y » (13D-1).
- Écrire des coches dans `listes/<nouvelle date>` : ce sont de nouvelles clés, aucune donnée existante n'est modifiée ni supprimée. Le « vas-y » est demandé avant le premier essai réel (13D-2).
- Changer ce que les téléphones ouvrent par défaut (`actuelle.json` ou son remplaçant) : « vas-y » (13D-3).
- Toute migration, suppression ou modification en masse (par exemple convertir l'ancienne liste du 4/11) : **hors plan, jamais sans « vas-y »**. Le plan n'en prévoit aucune.

## Sauvegarde

Avant le premier essai réel (13D-2) : copie de `listes/` (GET `…/listes.json` de la base, ou export JSON de la console Firebase, que François fait lui-même), rangée **hors du dépôt public** et datée. Le dépôt ne reçoit aucune donnée de la base. Non vérifié : le bac à sable peut-il lire la base Firebase ; à essayer au moment voulu.

## Ordre et dépendances

- **Après la refonte de l'interface** (onglets Semaine, Récolte, Préparation, Réglages), qui est codée dans un autre fil : un seul fil de code à la fois (règle 17), et 13D change l'écran Récolte et l'ouverture de la liste, au même endroit que la refonte. 13D-1 peut démarrer dès que la refonte est fusionnée.
- Indépendante de l'étape 5 (connexion) et de 13C (page du magasin).
- Prépare l'étape 14 (historique) : la liste calculée ne change rien aux données gardées, et la liste figée donnera ce qui a vraiment été récolté.

## Modèle · effort

Lecture de la roadmap : 13D = **Opus 5.5 · Élevé (proposé)**, « à reparler avant de commencer ». Le plan lui-même (ce document) est fait en Sonnet 5.5 · Moyen. Le niveau Élevé pour le code est à confirmer par François avant le lancement de 13D-1.

## Les questions à trancher (une par une, avec recommandation)

1. **(Tranché par François le 8/11 : en direct.)** **Liste calculée en direct, ou fichier créé ?** Recommandation : en direct (pas de fichier, pas de PR, rien de la base réécrit), le fichier restant possible pour les anciennes listes.
2. **(Tranché le 8/11 : recommandation retenue, François ayant demandé de suivre les recommandations.)** **Si la semaine change après les premières coches ?** Recommandation : figer la liste au premier clic, signaler tout changement ultérieur sur la ligne.
3. **(Tranché le 8/11 : recommandation retenue, François ayant demandé de suivre les recommandations.)** **Peut-on corriger une quantité sur la liste elle-même ?** Recommandation : non au début (on corrige dans Semaine) ; une note libre par ligne pourra venir après.
4. **(Tranché le 8/11 : recommandation retenue, François ayant demandé de suivre les recommandations.)** **Auvabio 03 et 63, Panier La Magic, Ferme Deschamps dans la liste.** Recommandation : Auvabio 03 et 63 réunis en un seul circuit « Auvabio » (une même récolte, le mercredi) ; Panier La Magic rattaché au lundi comme aujourd'hui ; Ferme Deschamps seulement si François l'ajoute dans « Débouchés et livraisons ».
5. **(Tranché le 8/11 : recommandation retenue, François ayant demandé de suivre les recommandations.)** **Quelle liste s'ouvre sur le téléphone ?** Recommandation : celle du prochain jour de récolte, avec un sélecteur de jour ; `actuelle.json` ne servirait plus qu'aux anciennes listes.

6. **(Tranché le 8/11 : recommandation retenue, François ayant demandé de suivre les recommandations.)** **Jours de récolte : créés chaque semaine, ou réglés une fois pour toutes ?** Recommandation (d'après votre message du 8/11) : on ajoute le jour semaine par semaine et l'on coche les livraisons ; les jours habituels (lundi = mardi ; mercredi = mercredi, jeudi, vendredi) sont proposés déjà cochés, modifiables. Aujourd'hui l'appli ne connaît que des jours réglés une fois pour toutes (PR #33) : 13D-1 ajoute la version « par semaine ».

*Le total des questions passe de 5 à 6 (ajout du 8/11).*

*Les six questions sont tranchées (la 1 par François, les autres par sa consigne du 8/11 de suivre les recommandations). Restent à lui demander : tout « vas-y » sur les vraies données, l'hébergeur, l'ouverture d'accès, le réglage modèle si plus haut que la roadmap.*
