# État du projet : Liste de récolte

## Où on en est

*Au 4 novembre 2026, après-midi. Source : lecture du dépôt et demandes de François du 4/11.*

- **En ligne** : la liste du mercredi 4 novembre 2026 (`listes/2026-11-04.json`, 21 produits), sur https://liste-recolte.pages.dev.
- **Ajouté le 4/11** : colisage par débouché (colis bois pour Panier adéquat, Locavore, Ferme Deschamps) et la commande Ferme Deschamps (persil). Voir `CHANGELOG.md`.
- **Ajouté le 4/11** : barre de progression en haut de la liste (globale, kilos et unités additionnés, choix de François du 4/11 ; puis unités et kilos sous une flèche).
- **Ajouté le 4/11** : le lieu des récoltes (emplacement et zones) est masqué, car il n'est pas relié à Ouvre ta ferme. Données gardées, réglage `MONTRER_LIEU` dans `index.html`. Le bouton « Remettre l'ordre par zone » est retiré.
- **Ajouté le 4/11 après-midi** : onglet « Préparation » (étape 10) : une ligne par produit et par client, tri par client ou par produit, indicateur « Récolté / Pas encore récolté », coche de chaque ligne et de chaque client (commande prête, rangée en bas). Coches partagées, rangées à part des coches de récolte.
- **Vérifié** : le test `tests/deux-telephones.cjs` passe (53 vérifications sur 53, lancé le 4/11/2026, préparation de commandes comprise). Il utilise un faux Firebase local.
- **Non vérifié en réel** : l'onglet Préparation sur les vrais téléphones (essai à faire par François).
- **Non vérifié en réel** :
  - le partage par Firebase entre les deux vrais téléphones (la pastille affiche-t-elle « Partagé » en vert, et une coche passe-t-elle bien de l'un à l'autre ?) ;
  - le glisser-déposer à la souris sur ordinateur ;
  - le déploiement actuel sur Cloudflare Pages (non relu à la source).
- **Limite connue** : le dépôt et la base sont publics, sans mot de passe.
- **Vision du 4/11** : l'appli est une preuve de concept, appelée à devenir un logiciel durable pour plusieurs fermes. Dix chantiers sont inscrits dans la feuille de route (étapes 10 à 19) ; le premier (étape 10, préparation de commandes) est fait ; ordre et découpage sont à confirmer avec François.
- **Prochaine étape** : voir `docs/ROADMAP.md`.

## Ce qui existe

- Appli en un seul fichier `index.html`, sans bibliothèque ni étape de construction.
- Listes dans `listes/AAAA-MM-JJ.json` ; `listes/actuelle.json` désigne celle qui s'ouvre.
- Référentiel `referentiel/conditionnements.json` : 74 produits, type de caisse et contenu d'un colis ; colisages par circuit (colis bois).
- Base partagée Firebase Realtime Database (europe-west1), appelée par l'API REST sans SDK ; adresse dans `config.js`. Règles : lecture et écriture ouvertes sous `listes`. Détails : `docs/base-partagee.md`.
- Barre de progression : lit le champ `kg` des lignes (kilos d'un côté, bottes, bouquets, pièces de l'autre).
- Hors ligne : `sw.js`, `CACHE` à `recolte-v13`.
- Préparation de commandes : onglet « Préparation » ; coches dans la base sous `prep/<circuit>/<produit>` et `prepClient/<circuit>`.
- Hébergement : Cloudflare Pages, relié à `main`.

## Écarts relevés entre le prompt de reprise et le dépôt

- La liste du 4 novembre compte 21 produits, comme annoncé : conforme.
- Le README écrivait « appui long 0,5 s » alors que le code (`LONG = 450`) et la demande de François disent 0,45 s : le README est corrigé dans cette PR.
- L'ancien `CLAUDE.md` disait « GitHub Pages » alors que l'hébergement est Cloudflare Pages : remplacé par `AGENTS.md`.
