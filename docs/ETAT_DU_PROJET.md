# État du projet : Liste de récolte

## Où on en est

*Au 8 novembre 2026, soir. Source : lecture du dépôt et demandes de François du 4/11 au 8/11.*

- **Refonte de l'interface (8/11 au soir)**, demande de François : quatre onglets fixes de même taille (en bas sur téléphone, en haut sur ordinateur) dans l'ordre Semaine, Récolte, Préparation, Réglages ; onglet Semaine en trois pages (Répartir, Tableau, À récolter) ; débouchés et jours de récolte dans l'onglet Réglages ; bandeau vert, couleurs selon le reste. Aucune donnée ni aucun calcul changé. L'ordre des onglets est la recommandation de Claude, adoptée sur délégation de François. Puis, même soir : page « Stock » de la Semaine pour remplir le stock chez Très Allier d'un coup, et case de stock placée juste avant les livraisons de son débouché. **Non vérifié en réel** : l'essai sur les vrais téléphones et l'ordinateur.

- **Ajouté le 6/11 au soir** : onglet « Semaine » (étape 13A), la grille de répartition de la semaine entre les créneaux de vente : disponible, part de chaque créneau en colis, kilos ou unités, reste (placé, à placer, manque), case « tout », reste Auvabio 03 → 63 calculé et modifiable, tableau. Partagé et hors ligne. Sur ordinateur (au moins 1000 px de large), l'onglet est une grille façon tableur où l'on tape directement (demande de François du 6/11 au soir). Le 8/11, l'unité se choisit dans chaque case (menu sur la grille d'ordinateur, demande de François) et le colis porte le nom de sa caisse (PB, PH, GB, GH). Test `tests/semaine.cjs` : 77 sur 77 (deux téléphones et un ordinateur simulés). Le 8/11 au soir, écran « Débouchés et livraisons » (début de 13B, demande de François : débouchés, colis et jours de livraison réglables, débouchés actuels repris) ; puis les jours de récolte (quelles livraisons on récolte chaque jour, cadre « À récolter, jour par jour ») ; puis la case « Stock chez Très Allier » (fin de 13B) ; test `tests/debouches.cjs` : 67 sur 67. **Non vérifié en réel** : l'onglet sur les vrais téléphones et sur un vrai ordinateur (essai à faire par François). 13B est fini ; 13C attend l'étape 5 et le « vas-y » de François, 13D est à reparler avec lui avant de commencer.

- **Licence (8/11)** : PolyForm Noncommercial 1.0.0 (fichier `LICENSE`), usage commercial interdit ; avant, aucune licence. Prend effet à la fusion de la PR. `outils-de-la-ferme` : pas encore de licence, à décider par François.

- **En ligne** : la liste du mercredi 4 novembre 2026 (`listes/2026-11-04.json`, 21 produits), sur https://liste-recolte.pages.dev.
- **Ajouté le 4/11** : colisage par débouché (colis bois pour Panier adéquat, Locavore, Ferme Deschamps) et la commande Ferme Deschamps (persil). Voir `CHANGELOG.md`.
- **Ajouté le 4/11** : barre de progression en haut de la liste (globale, kilos et unités additionnés, choix de François du 4/11 ; puis unités et kilos sous une flèche).
- **Ajouté le 4/11** : le lieu des récoltes (emplacement et zones) est masqué, car il n'est pas relié à Ouvre ta ferme. Données gardées, réglage `MONTRER_LIEU` dans `index.html`. Le bouton « Remettre l'ordre par zone » est retiré.
- **Ajouté le 4/11 après-midi** : onglet « Préparation » (étape 10) : une ligne par produit et par client, tri par client ou par produit, indicateur « Récolté / Pas encore récolté », coche de chaque ligne et de chaque client (commande prête, rangée en bas). Coches partagées, rangées à part des coches de récolte.
- **Ajouté le 4/11 au soir** : l'onglet Détail est caché (réglage `MONTRER_DETAIL` dans `index.html`, code gardé) ; à sa place, une petite flèche en bas à droite de chaque produit de l'onglet Récolte déplie la répartition par client, avec colisage et poids.
- **Non vérifié en réel** : l'onglet Préparation et la flèche de répartition sur les vrais téléphones (essai à faire par François).
- **Non vérifié en réel** :
  - le partage par Firebase entre les deux vrais téléphones (la pastille affiche-t-elle « Partagé » en vert, et une coche passe-t-elle bien de l'un à l'autre ?) ;
  - le glisser-déposer à la souris sur ordinateur ;
  - le déploiement actuel sur Cloudflare Pages (non relu à la source).
- **Limite connue** : le dépôt et la base sont publics, sans mot de passe.
- **Vision du 4/11** : l'appli est une preuve de concept, appelée à devenir un logiciel durable pour plusieurs fermes. Onze chantiers sont inscrits dans la feuille de route (étapes 10 à 20) ; le premier (étape 10, préparation de commandes) est fait ; ordre et découpage sont à confirmer avec François.
- **Onglet Détail** : caché « pour l'instant » le 4/11 au soir (étape 20), remplacé par la flèche de répartition. Le retirer pour de bon ou le remettre reste à décider plus tard.
- **Prévu** : base de données des produits et de leurs colisages, modifiable par l'utilisateur sans code (étape 19).
- **Ajouté le 5/11** : mode hors ligne (étape 21). La dernière liste et ses coches sont gardées sur le téléphone ; les coches faites sans réseau attendent et partent seules au retour du réseau ; « la dernière action gagne » (heure du téléphone) ; pastille « Hors ligne · N coches en attente ». Nouveau nœud `maj` dans la base (heure de chaque action), voir `docs/base-partagee.md`.
- **Vérifié** : le test `tests/deux-telephones.cjs` passe (85 vérifications sur 85) et `tests/semaine.cjs` aussi (84 sur 84), et `tests/debouches.cjs` (75 sur 75), lancés le 8/11/2026 au soir après la refonte et la page Stock, coupures du réseau simulées comprises.
- **Retiré le 6/11** : les messages de félicitations (« Tout est récolté. Bravo. », « Toutes les commandes sont prêtes. Bravo. », « Tout est récolté. » dans la barre, « Tout est préparé · » en Préparation), à la demande de François.
- **Premier retour réel** : le 6/11/2026 au soir, François écrit que le mode hors ligne « semble bien fonctionner ». Le détail de l'essai n'est pas connu (nombre de téléphones, conflit entre deux téléphones essayé ou non) : la règle « la dernière action gagne » reste non vérifiée en réel.
- **Reçu le 6/11** : l'ancien tableau de cumul et la fiche des prix de François, décrits dans `docs/tableau-cumul.md` (calculs devinés, doublons, erreurs sur les tomates). Pas encore de code. Le calcul des prix est exclu de l'outil (décision du 6/11).
- **Reçu le 6/11 au soir** : les fiches d'agréage Auvabio (magasins), dont le colisage est relevé dans `docs/colisage-fiches-agreage.md` avec les écarts à trancher par François (aubergine, céleri-branche, mâche, oignon botte, patate douce, persil). C'est le colisage d'un débouché (Auvabio), pas de tous. Référentiel inchangé.
- **Validé le 6/11** : l'onglet « Semaine » (étape 13, morceaux 13A à 13D). 13A fait le 6/11 au soir (voir plus haut) ; 13B fait le 8/11 (débouchés réglables, jours de récolte, stock chez Très Allier) ; 13C et 13D restent à faire.
- **Changé le 6/11 au soir** : référentiel, céleri-branche en GH et persil frisé en colis de 6 bouquets (pris en compte à partir de la prochaine liste) ; client « Ellie » renommé « Élie » dans l'appli (identifiant `el` gardé, coches conservées).
- **Prochaine étape** : voir `docs/ROADMAP.md`.

## Ce qui existe

- Appli en un seul fichier `index.html`, sans bibliothèque ni étape de construction.
- Listes dans `listes/AAAA-MM-JJ.json` ; `listes/actuelle.json` désigne celle qui s'ouvre.
- Référentiel `referentiel/conditionnements.json` : 74 produits, type de caisse et contenu d'un colis ; colisages par circuit (colis bois).
- Base partagée Firebase Realtime Database (europe-west1), appelée par l'API REST sans SDK ; adresse dans `config.js`. Règles : lecture et écriture ouvertes sous `listes`. Détails : `docs/base-partagee.md`.
- Barre de progression : lit le champ `kg` des lignes (kilos d'un côté, bottes, bouquets, pièces de l'autre).
- Hors ligne : `sw.js` (page, référentiel et débouchés en cache), `CACHE` à `recolte-v25` ; liste, coches et actions en attente gardées dans le téléphone (`localStorage`).
- Préparation de commandes : onglet « Préparation » ; coches dans la base sous `prep/<circuit>/<produit>` et `prepClient/<circuit>`.
- Répartition de la semaine : onglet « Semaine » ; débouchés de départ dans `referentiel/debouches.json`, puis réglés dans l'appli, onglet « Réglages » (base : `listes/reglages/debouches`) ; données dans la base sous `listes/semaines/<lundi>` (voir `docs/base-partagee.md`).
- Hébergement : Cloudflare Pages, relié à `main`.

## Écarts relevés entre le prompt de reprise et le dépôt

- La liste du 4 novembre compte 21 produits, comme annoncé : conforme.
- Le README écrivait « appui long 0,5 s » alors que le code (`LONG = 450`) et la demande de François disent 0,45 s : le README est corrigé dans cette PR.
- L'ancien `CLAUDE.md` disait « GitHub Pages » alors que l'hébergement est Cloudflare Pages : remplacé par `AGENTS.md`.
