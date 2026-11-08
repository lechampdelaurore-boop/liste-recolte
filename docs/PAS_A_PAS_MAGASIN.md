# Pas-à-pas : ouvrir la saisie du stock au magasin (étape 13C)

*Écrit le 8/11/2026 au soir, avec le code de l'étape 13C. Une action à la fois ; Claude peut ouvrir les pages de la console dans son navigateur intégré, mais ne voit, ne tape ni n'écrit jamais un mot de passe.*

## En deux phrases

Le magasin (Très Allier) reçoit **un seul compte** et une page à lui, https://liste-recolte.pages.dev/magasin, où chaque personne donne d'abord son prénom puis saisit le stock, produit par produit. La ferme voit ces saisies dans l'onglet Semaine, page « Stock », avec le prénom et l'heure, et l'écran « Qui a saisi au magasin cette semaine ? ».

## Ce qu'il faut savoir avant de commencer

- Les nouvelles règles **ne changent rien pour la ferme** : `listes` reste ouvert aux seuls comptes « ferme », exactement comme aujourd'hui. Elles ajoutent seulement `magasins` (le stock du magasin, lu par la ferme) et la lecture de son propre profil.
- Le compte du magasin ne lit **jamais** les listes, les semaines, les débouchés ni les coches : la base le refuse (vérifié sur l'émulateur officiel de Firebase, `tests/regles.cjs`).
- Le magasin ne peut ni effacer ni réécrire le journal des saisies.
- Le prénom est **déclaré** par la personne, pas prouvé (un seul mot de passe pour tout le magasin). Le journal rend visible qui a saisi quoi, il ne l'empêche pas.
- Retour arrière en une minute : recoller les règles copiées à l'action 1.

## Action 1 : copier les règles actuelles (retour arrière)

1. Console Firebase, **Realtime Database**, onglet **Règles**.
2. Sélectionner tout le texte et le copier dans un fichier sur l'ordinateur. Il doit être identique à `docs/regles-base/fermees-sans-magasin.json` (les règles publiées le 8/11 à 20 h 55). Claude peut aussi lire la page et en garder une copie dans le dossier du projet (`sauvegardes/`).
3. Ne rien publier pour l'instant.

## Action 2 : créer le compte du magasin

1. **Authentication**, onglet **Users**, **Ajouter un utilisateur**.
2. Adresse : `tresallier@ferme.invalid`. Mot de passe : à choisir par vous (au moins 6 caractères), **différent** de ceux de la ferme. **Ajouter un utilisateur**.
3. Le noter à l'abri. Ne jamais l'écrire à Claude.

Sur le téléphone du magasin, l'identifiant à taper sera simplement `tresallier`.

## Action 3 : donner au compte le profil du magasin

1. Dans **Users**, copier l'**UID utilisateur** du compte `tresallier@ferme.invalid`.
2. **Realtime Database**, onglet **Données** : survoler la ligne `profils`, cliquer sur son **+**.
3. Clé = l'UID collé, Valeur = `magasin:ta` (sans guillemets ; `ta` est l'identifiant du débouché Très Allier). **Ajouter**.
4. Vérifier : sous `profils`, trois lignes : deux « ferme » et une « magasin:ta ».

Ne rien toucher d'autre dans les données.

## Action 4 : publier les nouvelles règles

1. Onglet **Règles**. Effacer **tout** le texte, coller exactement le contenu de `docs/regles-base/fermees.json` (Claude peut vous le donner à copier), puis **Publier**. Si la console affiche « Parse error » en ligne 1, l'ancien texte est resté au-dessus : l'effacer.
2. Sur un téléphone de la ferme : la pastille dit toujours **Partagé**.

## Action 5 : essayer la page du magasin

1. Sur un téléphone (le vôtre suffit), ouvrir https://liste-recolte.pages.dev/magasin.
2. Identifiant `tresallier`, puis le mot de passe de l'action 2. La page demande ensuite **Qui saisit ?** : taper votre prénom.
3. Saisir le stock d'un produit pour de vrai (par exemple ce qui reste de poireau), ou un essai que vous viderez ensuite (la case vidée reste notée dans le journal, à votre prénom).
4. Sur le téléphone de la ferme : onglet **Semaine**, page **Stock** : la case montre la saisie avec « (magasin) », votre prénom et l'heure. En bas, **Qui a saisi au magasin cette semaine ?** liste la saisie.
5. Pour se déconnecter de la page du magasin sur votre téléphone : bouton **Se déconnecter de ce téléphone** en bas de la page.

## Action 6 : donner le compte au magasin

Vous donnez vous-même au magasin : l'adresse https://liste-recolte.pages.dev/magasin, l'identifiant `tresallier` et le mot de passe. Sur chaque téléphone ou ordinateur du magasin, on se connecte une seule fois ; ensuite, la page demande juste le prénom (souvent Igor), modifiable d'un appui en haut de l'écran.

Si une personne quitte le magasin : changer le mot de passe du compte dans **Authentication** et le redonner aux autres. Les téléphones déjà connectés redemandent la connexion.

## Ce qui a été vérifié avant de vous le donner

- Règles essayées sur l'**émulateur officiel de Firebase** (`tests/regles.cjs`, 53 vérifications) : syntaxe acceptée ; la ferme garde exactement ses accès et lit le stock, le journal et les prénoms du magasin sans pouvoir y écrire ; le magasin lit son profil, écrit une saisie et sa ligne de journal d'un seul envoi, relit son stock et ses prénoms ; il est refusé pour les listes, les semaines, les débouchés, le journal (lecture, réécriture, effacement), un autre magasin, le profil d'un autre compte ; une saisie mal formée (nombre négatif, unité inconnue, prénom vide ou trop long, champ en plus, semaine qui n'est pas une date) est refusée ; la vraie page du magasin y écrit.
- Page du magasin et onglet Semaine essayés avec deux téléphones du magasin, un téléphone et un ordinateur de la ferme (`tests/magasin.cjs`, 54 vérifications), y compris avant la publication des règles (la ferme reste « Partagé ») et sans réseau au magasin.
- **Non vérifié** : la vraie console et un vrai téléphone du magasin.
