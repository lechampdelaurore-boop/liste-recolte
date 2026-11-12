# Plan : une cloche de notifications, côté ferme et côté magasin (étapes 25 et 26)

*Rédigé le 12/11/2026, à la demande de François. Documentation seulement : aucun code n'est écrit par cette PR. L'étape 25 (code) se lance quand le fil de code en cours (fin de semaine et pré-remplissage du magasin) est fini.*

## La demande de François (12/11, mot pour mot, abrégé)

Une petite cloche à un endroit intelligent, pour le magasin et pour la ferme. Quand le magasin renseigne des stocks, laisser le temps de tout remplir : pas une notification à chaque produit, une seule quand le magasin a **fini**. Dans l'autre sens, quand la ferme met à jour la liste des produits de la semaine suivante, le magasin reçoit une notification.

## En deux phrases

Une cloche dans l'en-tête des deux pages (la liste de récolte de la ferme et la page du magasin), avec un petit chiffre rouge pour les nouveautés non lues, et une liste courte qui s'ouvre au toucher. Les deux notifications partent d'un **geste voulu** (un bouton), jamais d'une saisie isolée, ce qui répond au « pas une notification à chaque produit ».

## Où met-on la cloche

- **Dans l'en-tête, à droite**, juste avant la pastille « Partagé » (ferme : à côté de la pastille et du prénom ; magasin : à côté de la pastille et du prénom aussi). C'est le seul endroit visible sur tous les écrans, téléphone comme ordinateur, sans prendre de place dans les onglets.
- Grande zone tactile (gants, soleil), charte « plein soleil » : trait épais, noir sur blanc, pastille du chiffre **rouge vif avec chiffre blanc** (pas de gris clair, pas de mode sombre).
- Un appui ouvre une feuille (fenêtre) avec les 30 dernières notifications, la plus récente en haut ; les non lues sont encadrées en gras. Un bouton « Tout marquer comme lu ». Sans nouveauté : « Rien de nouveau ».
- Côté ferme, un appui sur une notification ouvre l'onglet Semaine à la bonne semaine.

## Pareil des deux côtés (demande de François, 12/11)

Ferme et magasin ont **exactement la même cloche** : même place dans l'en-tête, même forme, même chiffre rouge, même feuille qui s'ouvre, mêmes mots (« Tout marquer comme lu », « Rien de nouveau »), même présentation d'une notification (texte, prénom, date et heure), même façon de marquer comme lu. Seuls changent les textes des notifications elles-mêmes. Les deux boutons d'envoi (« J'ai fini » côté magasin, « Prévenir le magasin » côté ferme) s'ouvrent aussi de la même façon : une confirmation d'une ligne, puis « Envoyé à 14 h 32 ». Comme `magasin.html` est une copie autonome, le code de la cloche est écrit une fois et recopié à l'identique dans `index.html` et `magasin.html` ; le test de l'étape 25 vérifie que les deux blocs sont identiques (comme pour `ESPECE_AUSSI`).

## Les deux notifications

### 1. Magasin → ferme : « le magasin a fini son stock »

**Recommandation : un bouton « J'ai fini » sur la page du magasin** (et non un délai sans nouvelle saisie).

| | Bouton « J'ai fini » (recommandé) | Délai sans nouvelle saisie |
|---|---|---|
| Fiabilité | La personne dit elle-même qu'elle a fini : aucune erreur d'interprétation | Une pause de 20 minutes au milieu d'un comptage déclenche une fausse alerte ; un délai long retarde la bonne |
| Sans serveur | Oui : le bouton écrit une ligne dans la base | Non : personne ne « compte » le temps quand l'appli est fermée. Il faudrait que l'appli de la ferme calcule le délai en l'ouvrant, donc la notification n'arrive qu'à l'ouverture |
| Effort pour le magasin | Un appui de plus en fin de saisie | Aucun |

Comportement proposé :

- Le bouton « J'ai fini le stock » est en bas de la liste du magasin, gros, avec le nombre de produits saisis. Un appui demande une confirmation d'une ligne (« Prévenir la ferme que le stock de la semaine 47 est fini ? »).
- **Fenêtre bloquante s'il manque des quantités (demande de François, 12/11, côté magasin seulement).** Si, à l'appui sur « J'ai fini », un ou plusieurs produits de la semaine n'ont **pas de quantité**, une fenêtre s'ouvre avec la **liste de ces produits** (« Il manque la quantité de 3 produits : Carottes, Poireaux, Radis. Complétez-les avant d'envoyer »). Elle n'a **qu'un bouton, « Compléter »** : pas de « Envoyer quand même », donc rien ne part tant que tout n'est pas renseigné. En le touchant, la page revient au premier produit sans quantité. Le contrôle se fait sur le téléphone, avant la file d'attente : il marche aussi hors ligne. **Zéro est une quantité** (rupture de stock) : seule une case vide compte comme « non renseignée ». Rien de tel côté ferme : « Prévenir le magasin » n'est pas bloqué.
- Après l'envoi, il affiche « Ferme prévenue à 14 h 32 » et se range. Si le magasin saisit encore un produit après, le bouton revient (un nouveau « J'ai fini » enverra une nouvelle notification, jamais deux en moins de deux minutes).
- Aucune notification à chaque saisie : seulement le bouton, ou le filet de sécurité ci-dessous.
- **Filet de sécurité (demande de François, 12/11) : si la personne oublie d'appuyer, la ferme est prévenue 15 minutes après la dernière saisie.** François a hésité entre 30 et 15 minutes et a retenu **15 minutes** (réglage unique dans le code, facile à changer). Texte : « Igor n'a rien saisi depuis 15 minutes : le stock de Très Allier semble fini · semaine 47 · 12 produits » (marqué « automatique »). Pas d'envoi automatique si « J'ai fini » a été appuyé après la dernière saisie, ni deux fois pour la même dernière saisie.
- **Envoi automatique et quantités manquantes (choix de Claude, recommandation, à confirmer à l'essai).** La fenêtre bloquante ne concerne que le bouton. Le filet de 15 minutes part quand même (c'est justement le cas d'un oubli : la ferme doit savoir que le magasin s'est arrêté), mais **sans dire que le stock est fini** : « Igor n'a rien saisi depuis 15 minutes · stock de Très Allier **incomplet** : 2 produits sans quantité (Carottes, Poireaux) · semaine 47 ». S'il ne manque rien, le texte est celui du paragraphe précédent. **Confirmé par François (12/11) : la ferme doit pouvoir savoir quelles quantités n'ont pas été renseignées.** La notification garde donc **la liste complète** des produits sans quantité (jamais coupée en « et 4 autres ») : elle est écrite dans la notification elle-même (`manque`, liste de noms) et s'affiche en entier dans la feuille de la cloche. Un appui sur la notification ouvre l'onglet Semaine, où les cases Stock Très Allier vides de ces produits sont repérées. Raison : bloquer aussi l'automatique ne servirait à rien (personne n'est là pour répondre à une fenêtre) et la ferme resterait sans nouvelle, ce qui est pire qu'un stock incomplet signalé comme tel.
- **Limite à connaître : sans serveur, personne ne compte les 15 minutes quand toutes les pages sont fermées.** Deux comptes à rebours se relaient, et le premier qui voit les 15 minutes écoulées envoie la notification : (1) la page du magasin, tant qu'elle reste ouverte (téléphone allumé, onglet ouvert) ; (2) l'appli de la ferme, dès qu'elle est ouverte ou au premier rafraîchissement du fil. Si le magasin ferme la page et que personne ne rouvre l'appli de la ferme, **la notification n'arrive qu'à l'ouverture suivante de l'appli de la ferme**, pas à la minute exacte. L'heure exacte, appli fermée, demande l'étape 26.
- **Pas de doublon** : l'identifiant de la notification automatique est calculé (`auto-<semaine>-<heure de la dernière saisie>`) et la règle de la base refuse une deuxième écriture du même identifiant : si les deux comptes à rebours se déclenchent, une seule notification existe.
- Texte reçu par la ferme : « **Igor a fini le stock de Très Allier** · semaine 47 · 12 produits » (prénom déjà demandé par la page du magasin).
- Le bouton marche hors ligne (il passe par la file d'attente déjà en place dans `magasin.html` : envoyé au retour du réseau).

### 2. Ferme → magasin : « la liste de la semaine a été mise à jour »

**Recommandation : un bouton « Prévenir le magasin » dans l'onglet Semaine de la ferme**, au même endroit que « Qui a saisi au magasin cette semaine ? », pour les débouchés qui ont une page magasin (aujourd'hui Très Allier).

Même raison que ci-dessus : la ferme compose la liste en plusieurs fois (ajouter, retirer, corriger). Si chaque ajout prévenait le magasin, il serait submergé. Le bouton dit « la liste est prête ».

- Texte reçu par le magasin : « **La ferme a mis à jour la liste de la semaine 48** · 14 produits ».
- Après l'appui : « Magasin prévenu le 12/11 à 10 h 12 », et le bouton revient si la liste change ensuite.
- Il ne part rien d'autre au magasin que ce texte : le magasin ne lit toujours **pas** les listes de la ferme (les règles de la base le refusent). Les produits apparaissent sur sa page par le pré-remplissage en cours de développement, pas par cette notification.

## Comment c'est rangé dans la base (pour l'étape de code)

Un fil de notifications par côté, ajout seulement (jamais modifié ni effacé, comme le journal du magasin) :

- `notifs/ferme/<id>` : `{type: "stock-fini", auto?, did, w, by, n, manque?, at}` (`manque` : noms des produits sans quantité, seulement pour l'envoi automatique) (`auto` vrai pour le filet des 15 minutes). Écrit par le profil `magasin:<did>` (seulement avec son propre `did`), lu par le profil `ferme`.
- `notifs/magasin/<did>/<id>` : `{type: "liste-misealajour", w, by, n, at}`. Écrit par le profil `ferme`, lu par `magasin:<did>` (et par `ferme`).
- Les `<id>` sont les identifiants chronologiques de la base : la page lit seulement les 30 derniers, en direct (même mécanisme `EventSource` que le reste).
- **Lu / non lu** : l'heure de la dernière notification vue est gardée **sur chaque téléphone** (comme le prénom). Chaque personne a donc son propre chiffre : si Aurore lit une notification, le chiffre de François ne tombe pas à zéro. Compromis : un nouveau téléphone repart de « tout lu » (pas de pluie de vieilles notifications).
- **Règles de la base** : on **ajoute** des chemins, on ne change rien d'existant, donc ni la liste ni le magasin ne sont bloqués pendant l'opération. Nouveau fichier `docs/regles-base/fermees.json` (retour arrière : la version actuelle, copiée dans `fermees-sans-notifications.json`). **François les colle lui-même dans la console** (règle 13 : aucun secret ni écriture de règles par un agent). À publier **avant** de mettre le code en ligne, sinon les deux boutons répondraient « Permission denied ».
- Aucune donnée existante n'est modifiée ni effacée (règle 14), donc pas de sauvegarde de données nécessaire ; une copie des règles actuelles suffit.

## Une vraie notification sur le téléphone, appli fermée ? (étape 26, à décider)

**Réponse courte : oui c'est possible, mais pas sans un petit serveur, et pas gratuitement sans conséquence. Je recommande de ne pas le faire maintenant.**

Ce qu'il faut savoir (d'après mes connaissances, **à revérifier à la source avant de lancer l'étape 26**, c'est pourquoi je la marque « non vérifié ») :

- Le standard s'appelle « Web Push ». Il est gratuit et marche sur Android (Chrome) et sur iPhone depuis iOS 16.4, **mais sur iPhone seulement si l'appli est ajoutée à l'écran d'accueil** ; chaque personne doit accepter l'autorisation « recevoir des notifications ».
- L'envoi doit venir d'un **programme qui tourne ailleurs que dans la page** et qui signe l'envoi avec une clé privée. Notre appli est statique (Cloudflare Pages) et parle à Firebase par REST sans bibliothèque : **rien ne tourne quand l'appli est fermée**.
- Trois façons d'avoir ce programme :
  1. **Firebase Cloud Functions** : demande le forfait payant « Blaze » (carte bancaire). **Non recommandé** (service payant).
  2. **Un petit programme sur Cloudflare** (Pages Functions ou Workers), déjà notre hébergeur : le forfait gratuit suffit largement pour cette ferme, d'après ma connaissance. Mais c'est un **nouveau service sur l'hébergeur**, avec une **clé privée** que François saisirait lui-même (règle 13), et la liste des téléphones abonnés à stocker. **Demande un « vas-y » exprès de François** (règle 4).
  3. **Un service tiers de notifications** : nouveau compte, nouvelle dépendance, parfois payant. Non recommandé.
- Coût de développement et d'entretien : plus élevé que la cloche (clé, abonnements, téléphones qui changent, iPhone à l'écran d'accueil).

**Recommandation** : faire d'abord l'étape 25 (la cloche, sans serveur, sans coût, dans l'appli). Quand elle est ouverte, la cloche suffit tant que les gens ouvrent l'appli en cours de journée (le chiffre est mis à jour en direct). Si, à l'usage, François constate qu'une notification a été ratée parce que l'appli était fermée, on lance l'étape 26 avec l'option 2. Question posée à François dans le fil.

## Découpage, modèle et effort (d'après `docs/ROADMAP.md`)

| N° | Étape | Modèle · effort | Qui décide |
|---|---|---|---|
| 25 | Cloche dans la liste de récolte et dans la page du magasin ; bouton « J'ai fini » (magasin) ; bouton « Prévenir le magasin » (ferme) ; fil de notifications dans la base ; règles ajoutées ; `tests/notifications.cjs` ; `CACHE` de `sw.js` | Opus 5.5 · Élevé (proposé) | **François** : colle les règles lui-même avant la mise en ligne |
| 26 | Notification sur le téléphone appli fermée (Web Push, petit programme sur Cloudflare) | Opus 5.5 · Élevé (proposé) | **François** : « vas-y » exprès (service sur l'hébergeur, clé privée saisie par lui) |

Une seule PR de code pour l'étape 25 : les deux notifications partagent la même cloche. Les deux pages (`index.html` et `magasin.html`) doivent recevoir la même correction (le code de la page du magasin est une copie, voir `AGENTS.md`).

## Points d'attention pour le fil de code

- Le fil « fin de semaine et pré-remplissage du magasin » touche aussi `magasin.html` et les règles : **lancer l'étape 25 seulement quand il est fusionné**, et repartir de `main`.
- Rien de la ferme dans la notification côté magasin au-delà de la semaine et du nombre de produits.
- Vérifier avant la PR : le chiffre baisse à zéro à l'ouverture de la feuille ; une seule notification pour 10 saisies suivies d'un seul « J'ai fini » ; « J'ai fini » avec un produit sans quantité : fenêtre bloquante avec la liste, rien écrit dans la base, aucune notification ; l'automatique « incomplet » contient la liste complète des produits sans quantité et la feuille de la cloche l'affiche en entier ; avec un zéro : accepté ; sans bouton, une seule notification automatique 15 minutes après la dernière saisie (page du magasin ouverte, puis page fermée et appli de la ferme ouverte plus tard, jamais les deux) ; aucune automatique si « J'ai fini » est venu après la dernière saisie ; aucune notification sans bouton ; un compte magasin ne peut pas lire `notifs/ferme` ni écrire dans `notifs/magasin` (avec `tests/regles.cjs` et l'émulateur) ; hors ligne, le bouton part au retour du réseau.
- **Non vérifié en réel** (à l'essai de François, deux vrais téléphones) : le chiffre en direct entre deux appareils.
