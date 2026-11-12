# Pas-à-pas : ouvrir la boîte « Commandes à valider » dans la base (étape 31)

*Écrit le 12/11/2026 avec le code de la boîte. Quatre actions, une à la fois, toutes dans la console Firebase, faites par François lui-même (règle 13 : Claude ne colle jamais de règles, ne crée aucun compte et ne voit aucun mot de passe). Claude peut ouvrir les pages de la console dans son navigateur et vérifier ensuite.*

## Avant de commencer

- La boîte est déjà dans l'appli, mais **tant que ces règles ne sont pas publiées, elle ne montre rien** : l'onglet Semaine n'a ni chiffre rouge ni boîte, et **rien d'autre ne change** (essayé : `tests/commandes.cjs`, partie « règles d'avant » : la pastille reste « Partagé »).
- Les nouvelles règles **ajoutent** une seule chose et ne changent rien d'existant : `agent/propositions`, la boîte d'arrivée. Le compte au profil `agent` (qui sera celui de la porte, étape 32) peut y **déposer** une proposition, une seule fois par identifiant, sans pouvoir la réécrire ni l'effacer, et **ne peut rien lire ni écrire d'autre** (ni la semaine, ni les listes, ni le magasin, ni les notifications). La ferme les lit ; personne d'autre.
- La validation écrit dans la semaine (`listes/semaines/<lundi>`), déjà ouverte à la ferme : rien à changer pour elle.
- Si les règles de l'étape 25 (notifications) ne sont **pas encore publiées**, ce texte les contient aussi : une seule publication ouvre les deux (voir `docs/PAS_A_PAS_NOTIFICATIONS.md`, action 3, pour essayer la cloche ensuite).
- **Aucun compte `agent` n'est à créer maintenant** : il le sera à l'étape 32 (la porte), avec son propre « vas-y ». Sans ce compte, la boîte reste vide.

## Action 1 : sauvegarder la base (avant tout)

1. Console Firebase, **Realtime Database**, onglet **Données**.
2. Menu **⋮** (trois points, en haut à droite de l'arbre des données), **Exporter le fichier JSON**.
3. Garder le fichier sur l'ordinateur, avec la date dans son nom (par exemple `sauvegarde-base-2026-11-12.json`). Ne pas l'envoyer à Claude ni le mettre dans le dépôt (il contient les vraies données de la ferme).

Cette sauvegarde est demandée par le plan avant l'ouverture de l'étape 31 et avant la première validation réelle (règle 14). Les nouvelles règles ne modifient et n'effacent aucune donnée.

## Action 2 : copier les règles actuelles (retour arrière)

1. Onglet **Règles**. Sélectionner tout le texte et le copier dans un fichier sur l'ordinateur.
2. Il doit être identique à l'un de ces deux fichiers du dépôt :
   - `docs/regles-base/fermees-sans-commandes.json` (si les règles des notifications ont été publiées) ;
   - `docs/regles-base/fermees-sans-notifications.json` (si elles ne l'ont pas encore été, les règles publiées le 8/11).
   S'il n'est identique à aucun des deux, s'arrêter et le dire à Claude.

## Action 3 : publier les nouvelles règles

1. Onglet **Règles**. Effacer **tout** le texte, coller exactement le contenu de `docs/regles-base/fermees.json` (Claude peut vous le donner à copier), puis **Publier**.
2. Si la console affiche « Parse error » en ligne 1, l'ancien texte est resté au-dessus : l'effacer.

## Action 4 : vérifier

1. Ouvrir la liste de récolte (https://liste-recolte.pages.dev), onglet **Semaine** : la pastille reste « Partagé », rien de nouveau ne s'affiche (normal : aucune proposition tant que la porte de l'étape 32 n'existe pas).
2. Si la cloche des notifications n'était pas encore ouverte, la toucher : elle ne dit plus « pas encore ouvertes ».

## Revenir en arrière

Recoller les règles copiées à l'action 2 et **Publier**. La boîte redevient invisible ; le reste continue de marcher. Les décisions déjà prises (dans la semaine) restent.

## Ce qui a été vérifié

- Règles essayées sur l'**émulateur officiel de Firebase** (`tests/regles.cjs`, 106 vérifications, dont 28 nouvelles) : syntaxe et index acceptés ; tout l'existant inchangé ; l'agent dépose une proposition complète ou une annulation ; il ne peut ni la réécrire (même à l'identique), ni l'effacer, ni en changer une ligne ; il relit ses propositions ; il ne lit et n'écrit rien d'autre (listes, semaines, débouchés, magasin, notifications, profils, autre chemin) ; quatorze formes refusées (champ en plus, type inconnu, semaine qui n'est pas une date, livraison vide, source trop longue, heure du mail manquante, lien qui n'est pas en https, quantité négative, unité inconnue, ligne avec un champ en plus ou sans produit, plus de 200 lignes, prénom vide, identifiant avec un espace) ; ferme, magasin, compte sans profil et sans compte ne déposent rien, seuls la ferme et l'agent lisent ; la requête de l'appli (« orderBy w, startAt ») est acceptée ; la vraie appli, branchée sur l'émulateur, reçoit la proposition et la valide.
- **Non vérifié** : la vraie console et les vrais téléphones.
