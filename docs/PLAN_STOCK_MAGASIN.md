# Plan : le magasin saisit le stock lui-même (étapes 5 et 13C)

*Rédigé le 8/11/2026, précisé le même jour après la réponse de François (un seul compte, prénom demandé d'abord, suivi de qui a saisi). Document de proposition, sans code. Rien n'est décidé tant que François n'a pas répondu et donné son « vas-y » exprès (ouverture d'un accès à d'autres personnes).*

## En deux phrases

Aujourd'hui, la base Firebase est ouverte à toute personne qui connaît son adresse (elle est dans un dépôt public). On ne peut pas donner un accès au magasin sans d'abord la fermer. On la ferme avec des comptes, puis on donne au magasin un compte qui ne voit que sa propre page de stock.

## Décidé par François le 8/11 : un seul compte, mais on sait qui saisit

- **Un seul compte pour le magasin.** Choix de François (8/11), à la place d'un compte par personne.
- **Le prénom d'abord.** Quand une personne ouvre la page, la première chose demandée est son prénom (souvent Igor, mais d'autres personnes peuvent saisir). Elle peut le changer à tout moment, d'un appui sur son nom en haut de l'écran, par exemple quand un collègue prend le téléphone.
- **Les prénoms s'enregistrent au fur et à mesure.** Un prénom tapé une fois est proposé ensuite en un appui (liste de prénoms du magasin dans la base, `magasin/personnes`). Pour éviter « igor », « Igor » et « Igor. », la page rapproche les prénoms qui ne diffèrent que par la casse ou les espaces.
- **François voit qui a rempli quoi.** Chaque case porte le prénom et l'heure de la dernière saisie, affichés dans l'onglet Semaine. En plus, un **journal** garde chaque saisie (prénom, produit, ancienne et nouvelle valeur, heure) sans jamais l'effacer : même si quelqu'un d'autre corrige ensuite la case, la saisie d'origine reste. Un écran « Qui a saisi » regroupe par personne, pour vérifier d'un coup d'œil le travail de chacune.
- **Limite à connaître.** Le prénom est déclaré par la personne, il n'est pas prouvé : avec un seul mot de passe, quelqu'un peut saisir sous le prénom d'un autre. Le journal et l'heure rendent cela visible, mais ne l'empêchent pas. Si cela devient un problème, on passera à un compte par personne.
- **Règles de la base** : le profil magasin peut ajouter une ligne au journal mais jamais en modifier ni en effacer une.

## Ce que le magasin verra, et ne verra pas

- Une page à part, `magasin.html`, sur la même adresse (liste-recolte.pages.dev), pour téléphone et ordinateur.
- Elle montre la liste des produits (déjà publique dans le dépôt) et une case « stock » par produit, avec le prénom de la personne et l'heure de la saisie.
- Elle ne lit **jamais** les listes de récolte, les répartitions, les débouchés ni les coches. Ce n'est pas seulement caché à l'écran : les règles de la base le refusent.
- Le stock saisi par le magasin va dans un endroit à lui (`magasin/stock/<produit>`). La ferme le lit et l'affiche dans l'onglet Semaine, dans la colonne « Stock Très Allier » qui existe déjà (étape 13B).

## Comment le magasin se connecte : trois façons comparées

| | Compte du magasin (un identifiant, un mot de passe) | Compte par personne | Lien secret ou code seul |
|---|---|---|---|
| Simplicité pour le personnel | Très simple : on saisit une fois, le téléphone s'en souvient. La personne indique son prénom, comme dans l'appli actuelle | Chacun a son mot de passe | La plus simple |
| Sécurité réelle | Bonne : la base vérifie le compte | Meilleure : on retire une personne sans gêner les autres | **Faible** : un lien transmis ou affiché est valable pour tout le monde, et la base ne peut pas le vérifier |
| Départ d'un salarié | Changer le mot de passe | Supprimer son compte | Changer le lien |
| Travail pour François | 1 compte à créer | 1 compte par salarié | Peu, mais la base resterait ouverte |

**Recommandation, choisie par François le 8/11 : le compte du magasin.** C'est le plus simple pour le personnel et la sécurité est réelle. On pourra passer à un compte par personne plus tard sans refaire la page. Le lien secret est écarté : il ne protège rien tant que la base ne vérifie pas qui écrit.

## Comment on sécurise (étape 5)

On utilise la connexion par identifiant et mot de passe de Firebase (Firebase Authentication), appelée par son interface web simple, **sans ajouter de bibliothèque** : l'appli reste en un seul fichier. L'identifiant n'a pas besoin d'être une vraie adresse électronique : aucune adresse personnelle dans le dépôt.

Trois profils, rangés par François dans la base, hors de portée de l'appli :
- **ferme** (François, Aurore, un compte chacun) : lit et écrit tout ce qui existe aujourd'hui, plus le stock du magasin ;
- **magasin** : lit et écrit seulement `magasin/stock` ;
- tout le reste (personne non connectée) : rien.

## Ordre des opérations (pour ne jamais bloquer les téléphones de la ferme)

1. **Sauvegarde** de la base (export JSON depuis la console Firebase), par François. Règle 14.
2. **Code A (étape 5)** : l'appli de la ferme sait se connecter, tout en marchant encore avec la base ouverte. Écran de connexion une seule fois par téléphone ; mode hors ligne conservé.
3. **François** crée les comptes dans la console, se connecte sur ses deux téléphones et vérifie.
4. **François** colle les nouvelles règles dans la console (je les fournis toutes prêtes, avec les anciennes pour revenir en arrière en une minute).
5. **Vérification** : un visiteur sans compte est refusé ; les deux téléphones de la ferme marchent, y compris hors ligne.
6. **Code B (étape 13C)** : page du magasin et affichage du stock dans l'onglet Semaine.
7. **François** donne le compte au magasin. Essai avec une personne du magasin.

## Ce que François devra faire lui-même

- La sauvegarde (étape 1).
- Dans la console Firebase : activer la connexion par identifiant et mot de passe, créer les comptes (ferme et magasin), noter leur profil dans la base, coller les règles. Je rédige le pas-à-pas illustré.
- Saisir lui-même, dans `config.js`, la « clé web » du projet Firebase. Ce n'est pas un secret au sens strict (elle est faite pour être publique), mais la règle du projet est que je ne la vois ni ne l'écris : il la colle lui-même.
- Choisir les mots de passe et les donner au magasin lui-même. Je ne les vois jamais.
- Donner son « vas-y » exprès avant le code B.

Cloudflare n'est pas touché. Aucun service payant : l'offre gratuite de Firebase suffit.

## Risques

- **Verrouiller ses propres téléphones** si les règles sont changées avant que l'appli soit prête : l'ordre ci-dessus l'évite, et le retour arrière tient en un collage.
- **Session qui expire** : la connexion se renouvelle toute seule, mais la lecture en direct doit se rouvrir à chaque renouvellement. À tester en priorité, surtout hors ligne (non vérifié aujourd'hui).
- **Mot de passe partagé** : si un salarié part, on le change et on le redonne aux autres. D'où l'option compte par personne plus tard.
- **Écrasements** : deux personnes saisissent le même produit, la dernière l'emporte, avec prénom et heure visibles, comme ailleurs dans l'appli.
- **Stock périmé** : une case non mise à jour depuis longtemps doit montrer sa date, pour ne pas faire croire qu'elle est fraîche.
- **Le dépôt et la base restent connus de tous** : même fermée, les données déjà dans le dépôt public (listes passées) restent publiques. À garder en tête.
- **Non vérifié** : le partage entre deux vrais téléphones, aujourd'hui, n'a pas été essayé en réel (étape 2 de la feuille de route).

## Découpage, modèle et effort (d'après `docs/ROADMAP.md`)

| Morceau | Qui | Modèle · effort |
|---|---|---|
| Ce plan et les registres | Claude | Sonnet 5.5 · Moyen |
| Pas-à-pas Firebase pour François, règles écrites | Claude | Sonnet 5.5 · Moyen |
| Code A : connexion dans l'appli de la ferme (étape 5) | Claude | Opus 5.5 · Élevé (proposé par la feuille de route) |
| Console Firebase, sauvegarde, comptes, règles | **François** | Sans code |
| Vérification des règles et des deux téléphones | Claude puis François | Sans code |
| Code B : page du magasin, stock affiché dans la Semaine (étape 13C) | Claude | Opus 5.5 · Élevé (proposé par la feuille de route) |

Le code se fait dans un seul fil à la fois, après la refonte de l'interface en cours.
