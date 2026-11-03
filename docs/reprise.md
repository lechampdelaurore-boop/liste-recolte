# Prompt de reprise : appli « Liste de récolte » du Champ de l'Aurore

Tu reprends le développement d'une petite appli web mobile. Lis tout ce texte, puis le dépôt, avant de toucher à quoi que ce soit.

## Pour qui, pour quoi

Le Champ de l'Aurore est un GAEC en maraîchage bio diversifié à Tronget (Allier). François et son épouse Aurore récoltent le mercredi pour les livraisons du jeudi et le marché du vendredi. L'appli leur sert de liste de récolte partagée sur leurs téléphones : ce que l'un coche disparaît aussi chez l'autre. Elle est utilisée dehors, au soleil, le téléphone souvent tenu d'une main. Réponds à François en français, en phrases courtes et directes, sans flatterie.

## Où sont les choses

- Dépôt GitHub : `lechampdelaurore-boop/liste-recolte` (public, branche `main`).
- Site en ligne : **https://liste-recolte.pages.dev**. C'est Cloudflare Pages, relié au dépôt : chaque envoi sur `main` est en ligne une minute après.
- **Ne jamais donner l'adresse `lechampdelaurore-boop.github.io/liste-recolte/`.** L'accueil des applis éducatives de Marc, le fils de François, est installé sur les téléphones avec la portée `/` de ce domaine. Tout lien en github.io s'ouvre donc dans l'appli de Marc, qui propose en plus de se renommer. Ne rien mettre de la ferme dans le dépôt `lechampdelaurore-boop.github.io`.
- Base partagée : Firebase Realtime Database `https://liste-recolte-default-rtdb.europe-west1.firebasedatabase.app`, appelée par l'API REST sans SDK (adresse dans `config.js`). Règles : `{ "rules": { "listes": { ".read": true, ".write": true } } }`.
- Documentation, à lire en premier : `README.md`, `CLAUDE.md` (consignes pour agents), `docs/format-liste.md`, `docs/base-partagee.md`.
- Référentiel des conditionnements, qui donne le type de caisse et le contenu d'un colis pour 73 produits : `referentiel/conditionnements.json`. Une copie est dans les fichiers du projet, `Recoltes/conditionnements.json`.

## Architecture (ne pas la changer sans raison)

- Tout tient dans `index.html` (HTML, CSS et JS), sans bibliothèque ni étape de construction.
- `listes/AAAA-MM-JJ.json` contient une liste par jour de récolte, et `listes/actuelle.json` désigne celle qui s'ouvre. `?liste=AAAA-MM-JJ` ouvre une ancienne liste.
- Dans Firebase, sous `listes/<id>` : `order` (ordre des lignes) et `done/<produit>` (`{by, at}`). Les produits et les quantités restent dans le JSON du dépôt.
- La lecture se fait en temps réel avec `EventSource` (flux REST de Firebase). L'écriture se fait par `PUT`/`DELETE`, avec une file d'attente hors ligne dans `localStorage`.
- `sw.js` gère le hors ligne. **Il faut changer `CACHE` (actuellement `recolte-v6`) à chaque modification de l'appli.**
- `tests/deux-telephones.cjs` simule deux téléphones avec Playwright, reliés à un faux Firebase local (`tests/faux-firebase.cjs`). Il fait 11 vérifications. Lance-le avant chaque envoi : `npm install --no-save playwright && node tests/deux-telephones.cjs`.

## Ce que François a demandé et validé (à respecter)

1. Vue **Récolte** (produit, emplacement, quantité totale) et vue **Détail** (caisse, conditionnement, part de chaque circuit).
2. Filtres par **zone** et par **circuit**. Les zones sont les lieux réels et seulement eux : **Tunnel, Plein champ, Stock**. François a refusé les catégories inventées, comme « Choux et poireau » ou « Racines ».
3. **Glisser-déposer par appui long** (0,45 s sans bouger) sur la ligne, sans poignée. Un geste rapide du pouce doit seulement faire défiler la page. L'ordre est partagé entre les deux téléphones.
4. **Calcul des caisses** PB (petite basse), PH (petite haute), GB (grande basse), GH (grande haute) : une caisse par colis, avec le code du cumul. Par défaut, on compte une caisse par circuit ; une option regroupe les demi-colis. Les sachets Locavore, les bottes, les pièces et les tomates « tout » ne sont pas comptés. Le chiffre affiché est ce qui reste à remplir.
5. **Cases à cocher partagées** : une ligne cochée passe dans la section repliable « Récoltes déjà effectuées », avec le prénom et l'heure.
6. **Un seul affichage**, fond blanc pur et texte noir, lisible en plein soleil, même si le téléphone est en mode sombre (`color-scheme: only light`). Traits épais, textes gros et gras, pas de gris clair. Ne pas réintroduire de mode sombre.
7. La documentation doit être tenue à jour à chaque changement (README, docs, CLAUDE.md).

## Vocabulaire et règles de la ferme

- Garder les mots maison : cumul, colis, PB/PH/GB/GH, Très Allier, Marché (vendredi), Paniers solidaires, Ellie (un particulier, commandes à la pièce), Locavore (quantité = Qté × Format), Auvabio 03.
- Ne jamais inventer une quantité, un conditionnement, un emplacement ou un regroupement. S'il manque une information, poser **une seule** question à François.
- Martin est salarié à temps partiel : ne jamais parler de prestation de service.
- Citer la source des chiffres (cumul, date). Les emplacements viennent de l'assolement Ouvre ta ferme et peuvent avoir changé sur le terrain.

## État au 3 novembre 2026, 22 h

- En ligne : la liste du mercredi 4 novembre 2026 (`listes/2026-11-04.json`, 21 produits).
- **Non vérifié en réel** : le partage par Firebase entre les deux vrais téléphones. Les tests sont passés sur le faux Firebase, mais l'agent précédent n'avait pas d'accès réseau à Firebase ni au site. Demande à François si la pastille affiche « Partagé » (vert) et si une coche passe bien d'un téléphone à l'autre.
- Le glisser-déposer à la souris sur ordinateur n'a pas été testé en réel.
- Limite connue : le dépôt et la base sont publics, sans mot de passe. Pour renforcer, il faudrait Firebase Authentication avec la connexion Google, ce qui demande d'ajouter le SDK.

## Chaque semaine : mettre la nouvelle liste

1. François envoie le cumul (capture : total JEUDI, Très Allier Jeudi, Marché Vendredi, AUVABIO 03) et les commandes des autres circuits.
2. Crée `listes/AAAA-MM-JJ.json` en suivant `docs/format-liste.md`. Les caisses et les conditionnements viennent de `referentiel/conditionnements.json`, et la zone est Tunnel, Plein champ ou Stock.
3. Mets à jour `listes/actuelle.json`, lance le test et envoie sur `main`.

## Limites d'environnement rencontrées

L'agent précédent ne pouvait ni créer de dépôt, ni activer GitHub Pages par l'API, ni piloter le navigateur de François. Si c'est aussi ton cas, donne à François des étapes courtes, ou un texte à coller dans Claude in Chrome.
