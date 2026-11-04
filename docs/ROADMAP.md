# Feuille de route : Liste de récolte

Réglage « Modèle · effort » : le code se fait en Opus 5.5, au niveau d'effort indiqué ; le travail sans code (registres, listes, recherche) se fait en Sonnet 5.5 · Moyen. Le modèle Fable est interdit. Les niveaux d'effort marqués « proposé » sont à confirmer par François avant le lancement.

| N° | Étape | Type | Modèle · effort | Qui décide | État |
|---|---|---|---|---|---|
| 1 | Ajouter `AGENTS.md` et les registres | Documentation | Sonnet 5.5 · Moyen | Coordinateur | Fait (PR #1) |
| 2 | Vérifier le partage Firebase entre les deux vrais téléphones (pastille « Partagé », coche qui passe de l'un à l'autre) | Vérification | Sans code | **François** (ses téléphones) | À faire, non vérifié |
| 3 | Vérifier le glisser-déposer à la souris sur ordinateur | Vérification, puis correctif si besoin | Opus 5.5 · Moyen (proposé) | **François** (vas-y avant correctif) | À faire, non vérifié |
| 4 | Liste de récolte de chaque semaine, par PR | Données | Sonnet 5.5 · Moyen | **François** envoie le cumul et les commandes | Chaque semaine |
| 5 | Renforcer l'accès à la base (connexion Google, Firebase Authentication, SDK à ajouter) | Code | Opus 5.5 · Élevé (proposé) | **François** : ouvre ou ferme un accès, vas-y exprès | Pas décidé |
| 6 | Colisage par débouché (colis bois) et commande Ferme Deschamps du 4/11 | Code et données | Opus 5.5 · Élevé (choisi par le coordinateur, étape absente de la roadmap au lancement) | **François** (demande du 4/11/2026) | Fait (PR #2), correctif contenu (PR #4) |
| 7 | Barre de progression en haut de la liste (globale kilos + unités ; détail unités et kilos sous une flèche) | Code | Opus 5.5 · Élevé (choisi par Claude, délégation de François du 4/11) | **François** (demande du 4/11/2026 ; kilos et unités additionnés, choisi le 4/11) | Fait (PR #3) |
| 8 | Masquer le lieu des récoltes (emplacement et zones), réversible | Code | Opus 5.5 · Moyen (choisi par Claude, délégation de François du 4/11) | **François** (demande du 4/11/2026 ; zones cachées aussi, choisi le 4/11) | Fait (PR #5) |
| 9 | Relier le lieu des récoltes à Ouvre ta ferme (lecture de l'assolement, au plus 4 requêtes par seconde), pour réafficher emplacement et zones | Code | À fixer | **François** (vas-y exprès ; accès à Ouvre ta ferme) | Idée, pas décidé |

## Vision du 4/11/2026 : de l'essai au logiciel durable

François précise que l'appli est une **preuve de concept** testée en conditions réelles. Elle doit devenir un logiciel durable, pour plusieurs fermes (la sienne reste l'exemple et l'essai, jamais la limite). Les chantiers ci-dessous viennent de sa demande du 4/11 ; **ordre, découpage et modèle · effort sont des propositions à confirmer**. Rien n'est lancé. Le code se fait dans un seul fil à la fois.

| N° | Étape | Type | Modèle · effort | Qui décide | État |
|---|---|---|---|---|---|
| 10 | Préparation de commandes : onglet ou bouton, mêmes informations que la liste de récolte, classées par produit ou par client ; cocher chaque colis, chaque produit chez chaque client, et chaque client terminé | Code | Opus 5.5 · Élevé (proposé) | **François** (annoncée pour l'après-midi du 4/11) | **Premier chantier** (choisi le 4/11), découpage à préciser |
| 11 | Agréger les commandes des différents canaux dans le logiciel (aujourd'hui saisies à la main dans la liste de la semaine) | Code | Opus 5.5 · Élevé (proposé) | **François** (canaux à lister ; entrée des commandes à choisir) | Idée, à préciser |
| 12 | Page stock du magasin : les personnes du magasin saisissent le stock à l'instant T | Code | Opus 5.5 · Élevé (proposé) | **François** (qui y accède : ouverture d'accès, vas-y exprès) | Idée, à préciser |
| 13 | Outil d'arbitrage hebdomadaire entre débouchés : à vendre au champ + stock de la ferme + stock du magasin, pour décider quoi mettre dans chaque canal (comme l'ancien tableau de cumul) | Code | Opus 5.5 · Élevé (proposé) | **François** (tableau de cumul complet à fournir) | Idée, dépend de 11 et 12 |
| 14 | Historique : garder les listes passées et ce qui a été récolté, préparé, vendu | Code | Opus 5.5 · Moyen (proposé) | **François** (vas-y avant toute migration ; sauvegarde d'abord, règle 14) | Idée, à préciser |
| 15 | Prise de temps : durée entre deux récoltes, mesurée à partir des coches, et consultable dans l'historique | Code | Opus 5.5 · Moyen (proposé) | **François** | Idée, dépend de 14 |
| 16 | Lien avec Ouvre ta ferme, en lecture (par exemple l'emplacement des cultures ; c'est l'étape 9 précisée), au plus 4 requêtes par seconde | Code | Opus 5.5 · Élevé (proposé) | **François** (vas-y exprès ; accès à Ouvre ta ferme, clé saisie par lui seul) | Idée, à préciser |
| 17 | Lien avec Ouvre ta ferme, en écriture (renseigner des informations dans leur logiciel) | Code | Opus 5.5 · Élevé (proposé) | **François** (vas-y exprès ; touche aux vraies données) | Idée lointaine, après 16 |
| 18 | Préparer l'usage par plusieurs fermes : sortir de l'appli ce qui est propre à cette ferme (circuits, caisses, noms), accès par ferme | Code | Opus 5.5 · Élevé (proposé) | **François** (ouverture d'accès à d'autres personnes : vas-y exprès) | Idée lointaine, à cadrer avec l'étape 5 |

Décidé le 4/11 : la préparation de commandes passe en premier ; les chantiers restent dans ce dépôt pour l'instant ; déménagement à re-décider avant l'étape 12.

Questions encore ouvertes (à régler avec François) : dans quel ordre, et comment les commandes arrivent dans le logiciel.

Hors de cette feuille : les chantiers restent ici pour l'instant (décision du 4/11) ; la note du 3/11 prévoyait le dépôt `outils-de-la-ferme`, à re-décider avant l'étape 12.
