# Pas-à-pas : ouvrir la porte de l'agent (étape 32)

*Écrit le 12/11/2026 avec le code de la porte (`functions/agent/[[chemin]].js`). Cinq actions, plus une sixième facultative. Le mot de passe du compte `agent` et la clé de la porte sont des secrets : **François les choisit et les saisit lui-même**, dans Firebase et dans Cloudflare (règle 13) ; Claude ne les voit jamais. Claude peut ouvrir les bonnes pages dans le navigateur de l'appli Claude, faire ce qui n'est pas un secret (le profil de l'action 2), et vérifier à la fin.*

## Ce que fait la porte, en bref

- C'est un petit programme servi **avec l'appli, sur le même site Cloudflare**, seulement aux adresses `https://liste-recolte.pages.dev/agent/…`. Le reste du site ne passe pas par elle et ne change pas.
- Un agent (étape 33, pas encore faite) lui envoie les commandes lues dans les mails ; la porte reconnaît la livraison et les produits (sans deviner : un nom inconnu est montré « non compris ») et dépose une **proposition** dans la boîte « Commandes à valider ». **Rien ne s'inscrit dans la semaine sans un appui de François ou d'Aurore.**
- La porte se connecte à la base avec un compte au profil `agent`, qui ne peut que déposer des propositions (règles de l'étape 31, déjà publiées). Même si la clé de la porte fuyait, personne ne pourrait toucher à la semaine, aux listes ou au magasin par elle.
- **Tant que les actions 1 à 4 ne sont pas faites, la porte reste fermée** : elle répond « porte fermée » et rien ne change dans l'appli.
- Coût : 0 € (offre gratuite de Cloudflare : 100 000 appels par jour ; l'agent en fera quelques dizaines).

## Action 1 : créer le compte `agent` (console Firebase)

1. Console Firebase, **Authentication**, onglet **Utilisateurs**, **Ajouter un utilisateur**.
2. Adresse : `agent@ferme.invalid` (comme `tresallier@ferme.invalid` pour le magasin : ce n'est pas une vraie adresse).
3. Mot de passe : **un mot de passe long, choisi par vous**, que vous gardez dans votre gestionnaire de mots de passe (il ne sert qu'à l'action 3). Ne l'envoyez pas à Claude.
4. Le compte apparaît avec un **UID** (suite de lettres et de chiffres). L'UID n'est pas un secret : vous pouvez le donner à Claude pour l'action 2.

## Action 2 : donner au compte le profil `agent` (console Firebase)

1. **Realtime Database**, onglet **Données**, sous `profils`, ajouter une entrée : clé = l'UID de l'action 1, valeur = `agent` (avec les guillemets que la console met d'elle-même pour un texte).
2. Claude peut le faire dans le navigateur (comme le profil du magasin le 8/11), si vous lui donnez l'UID.

## Action 3 : saisir les deux secrets (tableau de bord Cloudflare)

1. Tableau de bord Cloudflare, **Workers & Pages**, projet **liste-recolte**, **Paramètres** (*Settings*), **Variables et secrets** (*Variables and Secrets*), environnement **Production**.
2. **Ajouter** (*Add*), type **Secret** :
   - nom `AGENT_MDP`, valeur : le mot de passe choisi à l'action 1 ;
   - nom `PORTE_CLE`, valeur : **une nouvelle clé longue** (au moins 32 lettres et chiffres, par exemple proposée par votre gestionnaire de mots de passe). **Gardez-la dans votre gestionnaire** : c'est elle que vous donnerez à l'agent à l'étape 33.
3. **Enregistrer** (*Save*). Les noms doivent être écrits exactement ainsi (majuscules, tiret bas).

## Action 4 : redéployer (tableau de bord Cloudflare)

Les secrets ne servent qu'aux déploiements faits **après** leur saisie.

1. Projet **liste-recolte**, onglet **Déploiements** (*Deployments*), le dernier déploiement de **Production** (branche `main`).
2. Menu **⋯**, **Réessayer le déploiement** (*Retry deployment*). Attendre qu'il soit vert (une minute environ).

## Action 5 : vérifier

1. Ouvrir **https://liste-recolte.pages.dev/agent/etat** (dans n'importe quel navigateur ; Claude peut le faire). Cette page ne montre aucune donnée de la ferme, seulement l'état de la porte.
2. Attendu :
   ```
   PORTE PRÊTE
   réglages Cloudflare : saisis
   compte agent : connecté
   boîte des commandes : ouverte au compte
   livraisons : …
   ```
3. Sinon, la page dit ce qui manque : « réglages Cloudflare : manquants (…) » (action 3 ou 4), « compte agent refusé » (mot de passe différent entre les actions 1 et 3), « boîte des commandes : refusée » (action 2). La page garde sa réponse une minute : attendre avant de recharger.
4. L'appli ne change pas : pas de nouvelle carte tant que l'agent (étape 33) n'existe pas.

## Action 6 (facultative, recommandée) : laisser la porte lire les débouchés

Sans cette action, la porte reconnaît les livraisons d'après le **fichier de départ** du site (`referentiel/debouches.json`) : une livraison ajoutée ou renommée dans l'appli (Réglages) lui resterait inconnue, et la commande serait refusée avec un message clair (rien de faux ne s'inscrit). Avec elle, la porte lit les débouchés **tels que la ferme les a réglés**.

1. Console Firebase, **Realtime Database**, onglet **Règles** : copier le texte actuel dans un fichier (retour arrière). Il doit être identique à `docs/regles-base/fermees-sans-porte.json` ; sinon, s'arrêter et le dire à Claude.
2. Effacer **tout** le texte, coller exactement `docs/regles-base/fermees.json` (Claude peut vous le donner), **Publier**. Si « Parse error » en ligne 1 : l'ancien texte est resté au-dessus, l'effacer.
3. Ce que ces règles ajoutent, et seulement cela : le compte au profil `agent` peut **lire** `listes/reglages/debouches` (noms, jours et identifiants des livraisons). Il ne peut toujours rien écrire hors de la boîte des commandes, ni lire la semaine, les listes, les autres réglages, le magasin ou les notifications. Aucune donnée n'est modifiée.
4. Vérifier : `/agent/etat` dit « livraisons : lues dans les réglages de la ferme » (une minute après).

La publication des règles reste à François (règle 13) ; l'autorisation donnée à Claude le 12/11 ne valait que pour la publication de 19 h 31.

## Revenir en arrière

- **Fermer la porte** : supprimer le secret `PORTE_CLE` (ou le changer : l'ancienne clé ne marche plus) dans Cloudflare, puis redéployer (action 4). La porte répond « porte fermée ».
- **Couper le compte** : dans Firebase, **désactiver** le compte `agent@ferme.invalid` (Authentication) ; la porte répond « compte agent refusé ».
- **Règles** : recoller `docs/regles-base/fermees-sans-porte.json` et **Publier** ; la porte revient au fichier de départ pour les livraisons.
- Les propositions déjà déposées restent dans la boîte ; on les refuse dans l'appli.

## Ce qui a été vérifié

- `tests/porte.cjs` (40 vérifications) sur les **émulateurs officiels de Firebase** avec les vraies règles : porte fermée sans réglages ; clé absente ou fausse refusée ; aide courte ; livraisons lues dans les réglages de la base (une ajoutée, une retirée) ou, avec les règles d'avant, dans le fichier de départ ; produits avec leurs unités ; une commande Auvabio sur deux livraisons donne deux propositions, de la forme attendue par l'appli ; le même mail renvoyé : « DÉJÀ VU », rien d'écrit ; nouvelle version et annulation ; erreurs (livraison inconnue, JSON illisible) sans rien déposer ; noms jamais devinés (« Carotte » : refusé, avec les noms proches) ; mauvais mot de passe et compte sans profil signalés sans répéter de secret ; 60 appels par minute au plus ; `/agent/etat` dans chaque cas ; puis **la vraie appli** de la ferme reçoit la proposition déposée par la porte et « Valider » l'inscrit dans la semaine.
- `tests/regles.cjs` sur l'émulateur : la lecture des débouchés par l'agent (action 6), et rien de plus.
- La porte compilée par **l'outil officiel de Cloudflare** (`wrangler pages functions build`) et essayée dans son moteur local (`wrangler pages dev`) branché sur l'émulateur : dépôt, « DÉJÀ VU », clé fausse refusée, pages du site inchangées.
- **Non vérifié** : le vrai Cloudflare (la première mise en ligne se voit au contrôle de la PR), les vrais secrets, le vrai compte.
