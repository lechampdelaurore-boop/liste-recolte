# Plan : une porte d'entrée pour un agent IA (étapes 29 à 35)

*Rédigé le 12/11/2026, à la demande de François. **Étude seulement : aucun code, rien de changé dans la base, aucun service ouvert.** Tout ce qui suit est une proposition ; les choix sont à valider par François, une question à la fois (liste en fin de document).*

## La demande de François (12/11, abrégée)

Un agent IA qui va chercher les commandes dans les mails et sur Locavore et les inscrit dans l'appli, pour qu'il ne reste à la main que le marché, les commandes reçues par SMS et ce qui part chez Très Allier (dicté « 13 alliés »). **Plus tard** : une sorte de « Google Tasks en mieux », bien reliée au Cumul et à Google Agenda (simple piste, voir la dernière section).

## En deux phrases

L'agent ne touche jamais à la vraie liste : il dépose chaque commande dans une **boîte d'arrivée** (« Commandes à valider »), et François ou Aurore la valident d'un appui, ce qui l'inscrit dans la semaine comme s'ils l'avaient saisie. Entre l'agent et la base, une **petite porte** (un programme sur Cloudflare, hébergeur déjà utilisé) parle un langage très court, pour que l'agent dépense peu de « tokens » (le compteur d'usage de l'IA) et ne voie que ce dont il a besoin.

## Ce que l'agent fait, et ne fait pas

| L'agent fait | Reste à la main (François, Aurore) |
|---|---|
| Lire les mails de commande (boîte en lecture seule) | Le marché |
| Lire les commandes Locavore (selon ce que Locavore envoie : question 1) | Les commandes reçues par SMS |
| Déposer chaque commande en proposition, avec sa source | Ce qui part chez Très Allier (décidé à la main, comme aujourd'hui) |
| Dire ce qu'il n'a pas compris (produit inconnu, quantité floue) | Valider (un appui) ou corriger chaque proposition |

L'agent ne supprime rien, ne modifie rien d'existant, n'écrit ni dans les coches, ni dans la préparation, ni dans le stock du magasin.

## Ce que l'appli a déjà (lu dans le dépôt le 12/11)

- La base est **fermée par comptes** (étape 5) : chaque compte a un profil (`ferme`, `magasin:ta`) et les règles (`docs/regles-base/`) disent ce que chaque profil lit et écrit. Un profil de plus, `agent`, suit le même modèle que le compte du magasin (étape 13C), déjà éprouvé.
- Une commande, dans la base, c'est une **quantité d'un produit dans un créneau de livraison d'une semaine** : `listes/semaines/<lundi>/q/<produit>/<créneau>` = `{n, u, by, at}` (`u` = colis, kg ou unité). Le créneau (« Locavore, mercredi soir ») vient des réglages `listes/reglages/debouches`, modifiables par la ferme : rien n'est écrit en dur pour Locavore ou une autre ferme.
- Le catalogue compte **78 produits** (`referentiel/conditionnements.json`, environ 11 Ko mesurés), mais l'agent n'a pas besoin de le recevoir : la porte retrouve le produit d'après son nom (« poireaux » → Poireau) et répond clairement s'il y a doute.
- Les listes de récolte et la préparation sont **calculées** depuis la semaine (étape 13D) : une commande validée dans la semaine se retrouve toute seule dans les listes du jour.
- La **cloche** (étape 25) existe : elle prévient déjà ferme et magasin ; elle pourra afficher « 3 commandes à valider ».

Ce qui n'existe pas : aucune lecture de mails ni de Locavore, aucune boîte d'arrivée, aucun profil `agent`.

## Ce qu'on a vu dans la boîte mail (12/11, lecture seule, à la demande de François)

Recherche en lecture seule sur les 30 à 90 derniers jours, trois mails lus en entier. Aucun message modifié.

| Débouché | Ce qui arrive par mail | Utilisable par l'agent ? |
|---|---|---|
| **Auvabio** | « [Commande] COMMANDE ALLIER / MAGASINS <date> » avec le bon de commande en PDF et, **dans le corps du mail, une synthèse** (ex. « Endive : 9 (9 colis, 45 kg) ») | **Oui, directement** : produits et quantités dans le texte ; le PDF sert de contrôle |
| **Locavor** (écrit ainsi, sans « e ») | « Vous avez des commandes à préparer pour le mercredi <date> » : **ni produits ni quantités**, seulement le total en euros ; le détail est sur le site (« Accès aux ventes ») | **Seulement comme signal** : le détail demande le site avec identifiant |
| **Panier adéquat** | Mail libre d'une personne : nombre de paniers et valeur (« 7 paniers à 5,80 € et 31 paniers à 12,67 € ») ; le tableau de répartition entre plusieurs maraîchers est à part | **Hors périmètre** (décision de François, 12/11 : une fois par mois, il continue à la main) |
| Marché de Tronget (Ouvre ta ferme) | « Pas de commande pour le <date> » (ou commandes) | Hors périmètre : le marché reste à la main |

Conséquence : Auvabio peut être branché le premier (étape 33). Pour Locavor, **François demande (12/11) que l'agent aille voir le détail sur le site dès que le mail « commandes à préparer » arrive** : le mail sert de déclencheur, la lecture du site se fait en lecture seule avec une session ouverte par François (l'agent ne voit jamais le mot de passe). Le site étant décrit par François comme « particulièrement mal fichu », c'est le point le plus fragile : étape 34, avec essai à blanc et un repli (saisie à la main) si la lecture du site se révèle instable.

## Annulations et remplacements (Auvabio), cas relevé par François le 12/11

François craint les erreurs quand Auvabio renvoie un bon. Vérifié dans la boîte : les mails de remplacement existent (5/11 : « Ce bon de commande annule et remplace le bon de commande précédent pour le 04/11/2026, 05/11/2026 »), avec **le même objet** que l'original (« [Commande]COMMANDE ALLIER <dates> ») et une phrase fixe. Règles proposées :

1. **Une commande = une clé** : type de livraison + date(s) (« auvabio · ALLIER · 04/11 et 05/11 »). Un nouveau mail de même clé est une **nouvelle version**, jamais un doublon.
2. **Version la plus récente par date du mail**, pas par ordre d'arrivée de lecture.
3. Proposition **pas encore validée** : elle est remplacée, la carte est marquée « remplacée par un bon plus récent ».
4. Proposition **déjà validée** : l'agent dépose une **correction**, montrée ligne par ligne (« Endive : 9 colis avant, 7 après »). Un produit disparu du nouveau bon apparaît « retiré (0) ». Rien ne s'applique seul ; « Valider » n'écrit que ces lignes, et l'ancienne valeur reste dans le journal.
5. **Annulation sans remplacement** : proposition « annulation », à valider.
6. Si une quantité a été **modifiée à la main** depuis la validation, la correction le signale avant de l'écraser.
7. Le **PDF du bon** est lu en plus du texte du mail : si les deux ne concordent pas, la carte est marquée « à vérifier » et ne peut pas se valider d'un appui.
8. L'agent ne dit jamais « traité » sur la foi d'un seul mail : la carte garde le lien du mail source.

## Options d'architecture

| | A. L'agent parle directement à Firebase | **B. Une porte sur Cloudflare (recommandé)** | C. B + serveur MCP (plus tard) | D. Script sur un ordinateur de la ferme |
|---|---|---|---|---|
| Principe | Compte `agent` aux droits limités, l'agent envoie des appels REST à la base | Petit programme (Pages Function, dans le même projet Cloudflare que l'appli) : l'agent lui parle en phrases courtes, la porte parle à Firebase | La porte exposée comme « outils » que l'agent appelle nativement | Un script qui tourne sur un PC allumé |
| Consommation de tokens | Forte : l'agent doit connaître les chemins, les identifiants de produits et de créneaux, et relire du JSON bavard | **Faible** : réponses d'une ligne par produit, recherche du produit par nom, « déjà vu » pour les doublons | La plus faible : l'agent n'a plus à construire d'appels | Faible, mais dépend d'un PC allumé |
| Sécurité | Le mot de passe du compte agent est chez l'agent ; règles Firebase seules pour limiter | **Le mot de passe de Firebase reste chez Cloudflare** ; l'agent n'a qu'une clé de porte, révocable en un clic, avec limite de débit | Comme B | Mot de passe sur un PC |
| Contrôle des données | Les règles Firebase ne peuvent pas tout vérifier (ex. produit connu) | La porte contrôle tout avant d'écrire (produit connu, quantité plausible, doublon) | Comme B | Au choix du script |
| Coût | 0 | 0 à cette échelle (Cloudflare gratuit : 100 000 appels par jour ; Firebase Spark déjà utilisé) | 0 | 0 |
| Plusieurs fermes | Une configuration par ferme dans chaque agent | **Une clé de porte par ferme, réglages lus dans la base de chaque ferme** | Comme B | Une copie par ferme |
| Effort de code | Faible | Moyen | Moyen, en plus de B | Moyen |

**Recommandation : B**, puis C seulement si l'usage le justifie. A est la plus simple mais la moins économe et la moins sûre ; D dépend d'une machine allumée.

## La porte (option B), en clair

*Codée le 12/11/2026 (« vas-y » de François) : `functions/agent/[[chemin]].js`, installation `docs/PAS_A_PAS_PORTE.md`, choix de détail `docs/DECISIONS.md` (12/11, étape 32). Écarts avec ce qui suit : pas de lecture de la semaine (`/agent/semaine`) ; en plus, `/agent/produits`, `/agent/propositions?w=` et `/agent/etat` (sans clé) ; pas de journal `agent/journal` (la proposition, jamais modifiée, sert de trace) ; un mail sur plusieurs livraisons donne une proposition par livraison.*

Quatre appels, tous courts :

1. **Lire la semaine** (`GET /agent/semaine?w=<lundi>`) : une ligne par produit, par exemple `poireau | dispo 10 colis | ta-mar 2 | lv 3 | reste 5`. Ordre de grandeur : quelques centaines de tokens pour une petite semaine, 2 000 à 3 000 pour une grande (**estimation, non mesurée**).
2. **Lire les débouchés et créneaux** (`GET /agent/debouches`) : une ligne par créneau, avec son identifiant. Appelé rarement.
3. **Déposer une commande** (`POST /agent/commande`) : débouché, semaine, source (identifiant du mail, numéro de commande Locavore), lignes `produit en toutes lettres + quantité + unité`. La porte répond en une ligne : `OK 4 lignes · 1 refusée : « mâche » inconnue (proches : Mâche, Mâche lavée)`.
4. **Doublons** : la source sert de clé. Si le même mail revient, `déjà vu`, sans rien écrire. C'est aussi ce qui évite de relire et de re-payer le même mail.

Ce que la porte écrit : uniquement dans `agent/propositions/<source>` (la boîte d'arrivée). Elle ne sait pas écrire ailleurs. Elle tient un journal (`agent/journal`, ajouts seulement) : qui a déposé quoi, quand.

## La boîte d'arrivée dans l'appli (étape 31)

*Codée le 12/11/2026 (« vas-y » de François). Ce qui a été fait et les choix de détail : `docs/DECISIONS.md` (12/11, étape 31) ; pas-à-pas des règles : `docs/PAS_A_PAS_COMMANDES.md`. Écarts avec ce qui suit : la décision est rangée dans la semaine (pas de journal `agent/journal` à part : la proposition, jamais modifiée, sert de trace) ; la cloche n'annonce pas encore les commandes (chiffre rouge sur l'onglet Semaine à la place), à décider à l'étape 32 ; la table « expéditeur → débouché » (`agent/reglages`) est pour l'étape 32 ou 33.*

- Une carte « Commandes à valider » dans l'onglet Semaine : pour chaque proposition, le débouché, la source (mail ou Locavore, avec la date), les lignes, les refus de la porte et la quantité déjà répartie.
- **« Valider »** écrit les quantités dans la semaine **par le même code que la saisie à la main** (même format, même règle « la dernière action gagne », prénom de la personne qui valide). **« Refuser »** écarte la proposition. Aucune proposition ne se valide seule.
- La cloche annonce « 3 commandes à valider » (nouveau type de notification, sans service de plus).
- Une proposition déjà validée n'est jamais réécrite si le mail revient.
- Par ferme, une table « expéditeur du mail → débouché » dans les réglages (`agent/reglages`), pas dans le code.

## Sécurité

- **Les mails sont du texte étranger** : un mail piégé peut contenir des consignes cachées pour l'agent. C'est pour cela que l'agent ne peut rien écrire de vrai : au pire, une mauvaise proposition, que François ou Aurore voient et refusent. La validation humaine est le garde-fou principal.
- **Aucun secret n'est vu ni saisi par Claude** (règle 13). François saisit lui-même, dans Cloudflare : le mot de passe du compte `agent` (compte Firebase comme `tresallier`) et la clé de la porte. Il saisit dans l'agent planifié seulement la clé de la porte. Si l'une fuit : on change le mot de passe ou on révoque la clé de la porte, sans toucher à l'appli.
- **Droits minimaux** : le profil `agent` n'écrit que sous `agent/propositions` (forme vérifiée comme pour le magasin : quantité de 0 à 99 999, unité colis/kg/u, source de 120 signes au plus) et ne lit rien d'autre. Règles à publier par François (seul à les coller en console), à essayer d'abord sur l'émulateur officiel (`tests/regles.cjs`).
- **Limites** : au plus 60 appels par minute et 200 lignes par commande ; une quantité très au-dessus de la disponibilité est marquée « à vérifier ».
- **Mails** : l'agent lit en **lecture seule**, sans envoyer, répondre, supprimer ni déplacer. Un libellé « commandes » (ou un filtre sur les expéditeurs) limite ce qu'il voit : il ne lit pas le reste de la boîte. Accès à la boîte = « vas-y » exprès de François.
- **Locavore** : si c'est un site à connexion, François saisit lui-même l'identifiant ; sinon on préfère un mail de notification, plus stable qu'un robot qui clique sur un site.

## Garde-fous sur les vraies données (règle 14)

- Aucune écriture dans la semaine sans validation d'une personne ; aucune suppression ni modification en masse.
- **Sauvegarde de la base avant l'ouverture** de l'étape 31 et avant la première validation réelle.
- **Mode « à blanc » d'abord** : pendant une ou deux semaines, l'agent dépose ses propositions, mais on compare à ce que la ferme saisit à la main avant de valider vraiment ; les écarts servent à corriger la lecture des mails.
- Une validation automatique (sans appui) n'est envisagée que plus tard, par débouché, après des semaines sans erreur, avec un « vas-y » exprès (étape 35).

## Plusieurs fermes (règle 15)

Rien de propre à cette ferme dans le code : débouchés, créneaux, produits et expéditeurs sont lus dans la base de chaque ferme. Une autre ferme a sa propre clé de porte, son propre compte `agent`, sa propre table d'expéditeurs. La ferme du Champ de l'Aurore sert d'essai, pas de limite.

## Coût

- Cloudflare (porte) et Firebase : **0** à cette échelle, sous les offres gratuites actuelles (à revérifier avant de lancer l'étape 32).
- Agent IA : ce sont les tokens de l'agent planifié. Le poste principal est la lecture des mails, pas la porte. Pour la limiter : libellé/filtre sur les seuls mails de commande, un mail lu une seule fois (clé de source), extraction courte. **Ordre de grandeur à mesurer** pendant le mode à blanc ; aucun chiffre n'est annoncé avant.

## Étapes proposées (ajoutées à `docs/ROADMAP.md`)

| N° | Étape | Modèle · effort | « Vas-y » de François |
|---|---|---|---|
| 29 | Ce plan | Sonnet 5.5 · Moyen | Non (fait) |
| 30 | Valider les choix (questions ci-dessous) | Sans code | Oui, ses réponses |
| 31 | Boîte d'arrivée « Commandes à valider » + règles du profil `agent` | Opus 5.5 · Élevé | Oui : sauvegarde, publication des règles |
| 32 | La porte (Pages Function) | Opus 5.5 · Élevé | Oui : service sur l'hébergeur, secrets saisis par lui |
| 33 | Agent planifié pour les mails (lecture seule, mode à blanc) | Sonnet 5.5 · Moyen | Oui : accès à la boîte mail |
| 34 | Locavore | Sonnet 5.5 · Moyen | Oui : selon la réponse à la question 1 |
| 35 | Validation automatique par débouché (option) | Opus 5.5 · Moyen | Oui : vraies données |

## Réponses de François (12/11/2026, les six questions)

1. **Locavor** : le mail annonce les commandes, le détail est sur le site.
2. **Détail Locavor** : l'agent va le lire sur le site dès que le mail arrive (lecture seule, session ouverte par François). **Panier adéquat** reste à la main. Pour **Auvabio**, les annulations et remplacements sont gérés par les règles de la section dédiée.
3. **Destination** : oui, les commandes validées vont dans la répartition de la semaine ; le stock du magasin reste saisi par le magasin.
4. **Validation** : oui, un appui par commande, mode à blanc d'abord ; validation automatique éventuelle plus tard, par débouché.
5. **Hébergeur** : oui, la porte sur le Cloudflare déjà utilisé, secrets saisis par François seul. Le « vas-y » exprès reste requis au moment de l'étape 32.
6. **Mails** : oui, libellé Gmail « commandes » avec filtre sur les seuls expéditeurs de commandes (Auvabio, Locavor) ; l'agent ne lit que ce libellé, en lecture seule. Le « vas-y » exprès pour l'accès à la boîte reste requis à l'étape 33.

Le plan est donc **validé dans ses grandes lignes** ; chaque ouverture (règles de la base, service Cloudflare, accès à la boîte, site Locavor) demande encore son « vas-y » au moment voulu.

## Piste future, non décidée : « Google Tasks en mieux »

Une liste de tâches de la ferme, reliée au Cumul (une tâche peut renvoyer à une semaine ou à un produit) et à Google Agenda (une tâche datée apparaît dans l'agenda). **À noter seulement** : rien n'est décidé, rien n'est dessiné. La porte (option B) et la boîte d'arrivée seraient réutilisables, car elles posent déjà le principe « un agent propose, une personne valide ». À reprendre par une étude à part, après l'étape 33.

## Non vérifié

Le détail des commandes Locavor sur leur site (non vu) ; le contenu du PDF d'Auvabio (non lu) ; la consommation réelle de tokens ; les limites gratuites actuelles de Cloudflare ; la lecture du libellé de mails par l'agent planifié.
