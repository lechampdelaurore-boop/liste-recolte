# Pas-à-pas : ouvrir les notifications dans la base (étape 25)

*Écrit le 12/11/2026 avec le code de la cloche. Trois actions, une à la fois, toutes dans la console Firebase, faites par François lui-même (règle 13 : Claude ne colle jamais de règles et ne voit aucun mot de passe). Claude peut ouvrir les pages de la console dans son navigateur intégré et vérifier ensuite.*

## Avant de commencer

- **Depuis l'étape 31 (12/11/2026, fin d'après-midi)**, `docs/regles-base/fermees.json` contient aussi la boîte « Commandes à valider ». Si ces règles ne sont pas encore publiées, suivre plutôt `docs/PAS_A_PAS_COMMANDES.md` (sauvegarde, puis une seule publication pour les deux), puis l'action 3 ci-dessous pour essayer la cloche.
- La cloche est déjà en ligne, mais **tant que ces règles ne sont pas publiées, elle ne reçoit rien** : sa feuille dit « Les notifications ne sont pas encore ouvertes : la ferme doit d'abord publier les nouvelles règles de la base ». **Rien d'autre ne change** : la liste de récolte, l'onglet Semaine et la saisie du stock au magasin marchent exactement comme avant (essayé : `tests/notifications.cjs`, partie « règles d'avant »).
- Les nouvelles règles **ajoutent** deux choses et ne changent rien d'existant :
  1. `notifs` : le fil des notifications. `notifs/ferme` est lu par la ferme seule et écrit par le magasin (pour lui seul) ; `notifs/magasin/<débouché>` est écrit par la ferme et lu par la ferme et ce magasin. Une notification ne s'efface pas et ne se réécrit pas.
  2. `magasins/<débouché>/suivi` : l'état de la semaine du magasin (heure de la dernière saisie, produits sans quantité), écrit par la page du magasin et lu par la ferme. C'est ce qui permet à l'appli de la ferme d'envoyer la notification automatique quand la page du magasin a été fermée.
- Aucune donnée existante n'est modifiée ni effacée : pas besoin de sauvegarde des données. La copie des règles actuelles (action 1) suffit pour revenir en arrière.

## Action 1 : copier les règles actuelles (retour arrière)

1. Console Firebase, **Realtime Database**, onglet **Règles**.
2. Sélectionner tout le texte et le copier dans un fichier sur l'ordinateur. Il doit être identique à `docs/regles-base/fermees-sans-notifications.json` (les règles publiées le 8/11 entre 21 h 38 et 21 h 42). S'il ne l'est pas, s'arrêter et le dire à Claude.

## Action 2 : publier les nouvelles règles

1. Onglet **Règles**. Effacer **tout** le texte, coller exactement le contenu de `docs/regles-base/fermees.json` (Claude peut vous le donner à copier), puis **Publier**.
2. Si la console affiche « Parse error » en ligne 1, l'ancien texte est resté au-dessus : l'effacer.

## Action 3 : essayer

1. Sur le téléphone du magasin (ou le vôtre, connecté avec le compte du magasin) : ouvrir https://liste-recolte.pages.dev/magasin, compter un produit, puis toucher **« Envoyer une notification »** en bas de la liste.
2. Dans la liste de récolte, la cloche (en haut à droite) affiche un **1 rouge** dans les 15 secondes. La toucher : « Igor a fini le stock de Très Allier · semaine 46 · 1 produit ».
3. Dans l'onglet **Semaine**, page **Stock** : toucher **« Prévenir le magasin »**. Sur la page du magasin, la cloche passe à 1.

## Revenir en arrière

Recoller les règles copiées à l'action 1 (ou `docs/regles-base/fermees-sans-notifications.json`) et **Publier**. La cloche redit alors « pas encore ouvertes » ; le reste continue de marcher.

## Ce qui a été vérifié

- Règles essayées sur l'**émulateur officiel de Firebase** (`tests/regles.cjs`, 78 vérifications, dont 23 nouvelles) : syntaxe acceptée ; tout l'existant inchangé ; le magasin écrit sa notification et son état de semaine, jamais au nom d'un autre magasin, sans lire le fil de la ferme ni écrire dans le sien ; la ferme lit son fil (y compris avec la requête de la cloche), n'y écrit que l'envoi automatique, écrit dans le fil du magasin ; une notification ne s'efface pas et ne se réécrit pas avec une autre heure ; champ en plus, autre type, semaine qui n'est pas une date, prénom vide, nombre négatif : refusés ; la vraie page du magasin et la vraie appli de la ferme y envoient et reçoivent.
- **Non vérifié** : la vraie console et les vrais téléphones.
