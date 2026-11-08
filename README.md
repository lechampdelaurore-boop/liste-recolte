# Liste de récolte

Liste de récolte partagée du Champ de l'Aurore (GAEC, Tronget), faite pour le téléphone.
François et Aurore la suivent en même temps pendant la récolte du mercredi : ce que l'un coche disparaît aussi chez l'autre.

**Adresse : https://liste-recolte.pages.dev**

Hébergée sur Cloudflare Pages, relié à ce dépôt : chaque envoi sur `main` est en ligne une minute après. Ne pas utiliser l'adresse `lechampdelaurore-boop.github.io/liste-recolte/` : sur les téléphones où l'accueil des applis de Marc est installé, elle s'ouvre dans cette appli-là (son installation couvre tout le site github.io).

## Sommaire

1. [Utilisation au champ](#utilisation-au-champ)
2. [Mise en route](#mise-en-route) (une seule fois)
3. [Mettre la liste de la semaine](#mettre-la-liste-de-la-semaine) (chaque semaine)
4. [Calcul des caisses](#calcul-des-caisses)
5. [Barre de progression](#barre-de-progression)
6. [Préparation de commandes](#préparation-de-commandes)
7. [Répartition de la semaine (onglet Semaine)](#répartition-de-la-semaine-onglet-semaine)
8. [Licence](#licence)
9. [Fichiers du dépôt](#fichiers-du-dépôt)
10. [Tests](#tests)
11. [Limites connues](#limites-connues)

## Utilisation au champ

| Geste | Effet |
|---|---|
| **Onglets Semaine / Récolte / Préparation / Réglages** (en bas de l'écran sur le téléphone, en haut sur l'ordinateur ; même place et même taille sur chaque page, refonte du 08/11/2026) | Dans l'ordre de la semaine. Semaine : répartition du disponible de la semaine entre les créneaux de vente (voir [Répartition de la semaine](#répartition-de-la-semaine-onglet-semaine)). Récolte : produit, quantité totale. Préparation : la même liste, une ligne par produit et par client, à cocher pendant la préparation des commandes (voir [Préparation de commandes](#préparation-de-commandes)). Réglages : débouchés, livraisons et jours de récolte. Chaque page a son titre sous le bandeau vert. |
| **Puces de circuit** (Très Allier, Marché ven., Panier adéquat, Élie, Locavore, Auvabio 03, Ferme Deschamps, Panier La Magic) | N'affiche que les produits de ce circuit, avec la quantité de ce circuit seulement. Pratique pour préparer une commande. |
| **Petite flèche en bas à droite d'un produit** (onglet Récolte) | Déplie la répartition du produit par client : le colis (ex. « GH de 5 kg »), puis pour chaque client le nombre de colis (colis bois compris) et le poids ou le nombre d'unités correspondant. Toucher à nouveau pour replier. Ouvert ou fermé sur ce téléphone seulement. Remplace l'onglet Détail, caché depuis le 04/11/2026 (`MONTRER_DETAIL` dans `index.html`, à passer à `true` pour le remettre). |
| **Appui long sur une ligne** (0,45 s, sans bouger) | La ligne se décolle (petite vibration) ; la glisser à sa place. Un geste rapide fait défiler la page normalement, sans rien déplacer. L'ordre est le même sur les deux téléphones. |
| **Case à cocher** | La ligne part dans « Récoltes déjà effectuées », avec le prénom et l'heure. |
| **Récoltes déjà effectuées ›** (en bas) | Déroule la liste de ce qui est fait. Toucher la case d'une ligne pour la décocher. |
| **Récolté … %** (barre en haut de la liste) | Avance à chaque coche, sur les deux téléphones : kilos et unités additionnés (voir [Barre de progression](#barre-de-progression)). La petite flèche vers le bas déplie le détail : une barre pour les unités (bottes, bouquets, pièces…), une barre pour les kilos, avec ce qui reste. |
| **Caisses ›** | Nombre de caisses PB, PH, GB, GH, et de colis bois, qui restent à remplir (voir [Calcul des caisses](#calcul-des-caisses)). |
| **👤 prénom** (bandeau vert, en haut à droite, à côté de la pastille « Partagé ») | Change le prénom affiché sur les coches. Demandé à la première coche. |

La pastille sous le titre dit l'état du partage :
- **Partagé** (vert) : tout est envoyé.
- **Hors ligne · 3 coches en attente** (orange) : pas de réseau. Les coches sont affichées tout de suite, gardées sur le téléphone, et partent toutes seules au retour du réseau. Le chiffre dit combien attendent (« changement » s'il y a aussi un changement d'ordre).
- **Envoi… 3 coches en attente** (orange) : le réseau est revenu, l'envoi est en cours.
- **Sur ce téléphone seulement** : la base partagée n'est pas encore configurée (`config.js` vide).
- **Pas connecté** (orange) : la base est fermée par des comptes et ce téléphone ne s'est pas encore connecté (fenêtre « Se connecter »).
- **Compte sans accès** (rouge) : le compte est connecté, mais la base le refuse (pas de profil « ferme », voir [docs/PAS_A_PAS_SECURITE.md](docs/PAS_A_PAS_SECURITE.md)). Le téléphone repasse à « Partagé » tout seul dès que le profil est donné.

**Compte** (depuis le 08/11/2026, étape 5) : quand la clé web est remplie dans `cle-web.js`, chaque téléphone se connecte **une seule fois** (identifiant court, par exemple `francois`, et mot de passe). La connexion est gardée sur le téléphone, même sans réseau ; le mot de passe ne l'est jamais. Le jeton d'accès (valable une heure) se renouvelle tout seul. **Réglages → Compte** montre l'identifiant, le numéro du compte et le bouton « Se déconnecter de ce téléphone ». Clé web vide : pas de compte, l'appli marche comme avant.

**Mode hors ligne** : la dernière liste reçue est gardée sur le téléphone, avec ses coches, et s'ouvre sans réseau. Si deux personnes touchent la même ligne pendant qu'une d'elles est hors ligne, **la dernière action gagne** (d'après l'heure du téléphone où elle a été faite) : par exemple, si Aurore décoche le persil après que François l'a coché sans réseau, le persil reste décoché quand François retrouve le réseau. Une liste ouverte depuis la copie du téléphone est remplacée toute seule par la nouvelle liste de la semaine au retour du réseau, une fois les coches envoyées.

**Installer sur l'écran d'accueil** : Chrome sur Android, menu ⋮ puis « Ajouter à l'écran d'accueil » ; Safari sur iPhone, Partager puis « Sur l'écran d'accueil ». L'appli s'ouvre alors en plein écran et marche sans réseau avec la dernière liste chargée.

## Lisibilité en plein soleil

Fond blanc pur, texte noir, traits de 2 px, textes gros et gras, pas de gris clair ni de couleurs pâles. Les cases à cocher font 44 px. Un seul affichage : même si le téléphone est en mode sombre, la liste reste en fond blanc et texte noir (demande de François, 03/11/2026).

## Mise en route

À faire une seule fois.

### 1. Mettre le site en ligne (Cloudflare Pages)

Sur https://dash.cloudflare.com : **Workers & Pages → Create → Pages → Connect to Git**, dépôt `liste-recolte`, branche `main`, Framework preset **None**, Build command vide, Build output directory `/`, **Save and Deploy**. Adresse obtenue : https://liste-recolte.pages.dev (fait le 03/11/2026).

### 2. Créer la base partagée (Firebase Realtime Database, gratuit)

1. Sur https://console.firebase.google.com, avec le compte Google de la ferme : **Créer un projet**, nom `liste-recolte`, Google Analytics **désactivé**.
2. Menu **Build → Realtime Database → Create Database**. Emplacement **Belgium (europe-west1)**. Mode **Start in test mode**.
3. Onglet **Rules** : remplacer tout le texte par celui-ci, puis **Publish** :
   ```json
   { "rules": { "listes": { ".read": true, ".write": true } } }
   ```
   Sans ce changement, le « test mode » coupe l'accès au bout de 30 jours.
4. Copier l'adresse affichée en haut de l'onglet **Data**, du type `https://liste-recolte-xxxxx-default-rtdb.europe-west1.firebasedatabase.app`.

### 3. Brancher la base dans l'appli

Dans `config.js`, mettre l'adresse entre les apostrophes :
```js
window.RECOLTE_DB_URL = 'https://liste-recolte-xxxxx-default-rtdb.europe-west1.firebasedatabase.app';
```
Puis changer `CACHE` dans `sw.js` (par exemple `recolte-v1` → `recolte-v2`) pour que les téléphones prennent la nouvelle version. Détails du stockage : [docs/base-partagee.md](docs/base-partagee.md).

### 4. Fermer la base par des comptes (étape 5)

Comptes Firebase (identifiant et mot de passe, gratuit), profil « ferme » noté dans la base, clé web dans `cle-web.js`, puis nouvelles règles : le pas-à-pas complet, dans l'ordre et avec le retour arrière, est dans [docs/PAS_A_PAS_SECURITE.md](docs/PAS_A_PAS_SECURITE.md). Règles prêtes à coller : `docs/regles-base/fermees.json` (et `ouvertes.json` pour revenir en arrière).

## Mettre la liste de la semaine

Chaque semaine, la liste vient du **cumul** (colonnes total JEUDI, Très Allier Jeudi, Marché Vendredi, AUVABIO 03) et des commandes des autres circuits (Panier adéquat, Élie, Locavore).

1. Créer `listes/AAAA-MM-JJ.json` (date du jour de récolte), au format décrit dans [docs/format-liste.md](docs/format-liste.md). Le plus simple : copier la liste précédente et changer les quantités.
2. Dans `listes/actuelle.json`, mettre le nouvel identifiant : `{"liste": "AAAA-MM-JJ"}`.
3. Ouvrir une **PR** (jamais d'envoi direct sur `main`), lancer le test, puis fusionner une fois les contrôles verts. Les téléphones affichent la nouvelle liste à la prochaine ouverture, avec des cases vides et l'ordre du fichier (les coches et l'ordre sont rangés par liste).

Une ancienne liste reste consultable avec `?liste=AAAA-MM-JJ` à la fin de l'adresse.

## Calcul des caisses

- Il y a quatre types de caisses, avec le code du cumul : **PB** petite basse, **PH** petite haute, **GB** grande basse, **GH** grande haute.
- Chaque produit porte un code de caisse (champ `caisse`), repris de [referentiel/conditionnements.json](referentiel/conditionnements.json). **Une caisse par colis.**
- Par défaut, **une caisse par circuit** : un demi-colis pour Très Allier et un demi-colis pour le marché font 2 caisses, parce qu'ils partent à deux endroits. En décochant l'option, les demi-colis d'un même produit sont regroupés (ici, 1 caisse).
- **Kilos hors colis** (demande de François, 04/11/2026) : une quantité écrite seulement en kilos pour un circuit (`"5 kg"`) prend une caisse de plus, du type du produit. Exemple : patate douce, 1 colis de 6 kg pour le marché + 5 kg pour Panier La Magic = 2 PH. Regroupées, ces kilos comptent pour leur part de colis (5 kg sur 6). Dans la vue Récolte, on garde l'écriture « 1 colis + 5 kg ».
- Les sachets Locavore, les bottes, les pièces (Élie, courges) et les tomates (« tout ») ne sont pas comptés.
- **Colisage par débouché** : un circuit peut partir dans d'autres colis que les caisses. Panier adéquat, Locavore et Ferme Deschamps partent en **colis bois** (demande de François, 04/11/2026) : PB → petit colis bois, PH → moyen colis bois, GB et GH → grand colis bois. Seule l'étiquette change : un colis bois contient exactement la même chose que la caisse correspondante (10 bouquets de persil en PB = 10 bouquets en petit colis bois). Ces colis sont comptés à part, sous les caisses, et la flèche de répartition ou le filtre du circuit dit lequel prendre et ce qu'on y met (« Panier adéquat : 3,5 grands colis bois de 5 kg »). Comme pour les caisses, un demi-colis occupe un colis : 3,5 colis = 4 colis bois à préparer, dont un à moitié plein. Les autres circuits gardent PB, PH, GB, GH. Réglage dans la liste : voir [docs/format-liste.md](docs/format-liste.md#colisage-par-circuit).
- Le chiffre affiché est ce qui **reste à remplir** : une ligne cochée sort du compte. Avec un filtre de zone ou de circuit, le calcul ne porte que sur ce qui est affiché.

Liste du 4 novembre 2026, rien de coché : 2 PB, 21 PH, 2 GB, 10 GH, et 1 petit, 1 moyen, 4 grands colis bois (par circuit) ; ou 1 PB, 21 PH, 1 GB, 10 GH, et 1 petit, 1 moyen, 4 grands colis bois (regroupées).

## Barre de progression

- L'appli lit le champ `kg` de chaque ligne (par exemple « 5,5 kg + 34 bottes ») : les kilos (et les grammes) vont dans la barre **Kilos**, tout autre « nombre + mot » (bottes, bouquets, pièces, poireaux…) dans la barre **Unités**.
- Une ligne compte quand elle est cochée, en entier. Une ligne sans nombre (les tomates « tout ») n'est pas comptée, et c'est écrit sous les barres.
- Barre du haut : kilos et unités **additionnés** (1 unité compte comme 1 kg).
- La barre porte toujours sur toute la liste, quels que soient les filtres de zone et de circuit.

Liste du 4 novembre 2026 : 183 kg et 66 unités (41 bottes, 10 bouquets, 10 poireaux, 5 pièces), soit 249 en tout.

## Préparation de commandes

Onglet **Préparation** (demande de François, 04/11/2026). Même liste du jour que l'onglet Récolte, mais **une ligne par produit et par client** (par exemple « Bette » pour Très Allier, pour le marché, pour Panier adéquat et pour Locavore : 4 lignes), avec la quantité de ce client (colis bois compris : « 3,5 grands colis bois de 5 kg »).

- **Par client / Par produit** (sous les onglets) : un bloc par client, dans l'ordre des circuits de la liste ; ou un bloc par produit, dans l'ordre de la récolte.
- **Récolté / Pas encore récolté** : sur chaque ligne (tri par client) ou en tête du produit (tri par produit). C'est la coche de l'onglet Récolte, lue telle quelle.
- **Toucher une ligne** (n'importe où, pratique avec des gants) : la ligne est cochée, avec le prénom et l'heure ; la toucher de nouveau la décoche. Elle reste à sa place, barrée, pour ne pas mélanger les lignes.
- **Case du client** (tri par client, dans le bandeau noir) : la commande est prête. Le client passe en vert dans « Commandes prêtes », en bas, et y reste visible avec ses lignes. Cocher le client ne coche pas ses lignes : s'il en reste, c'est écrit (« Attention : 1 ligne pas cochée »). Toucher de nouveau la case remet la commande dans la liste.
- Les **puces de circuit** marchent aussi : « Ferme Deschamps » n'affiche que sa commande.
- Les coches de préparation sont **partagées** entre les téléphones, comme celles de la récolte, mais rangées à part : cocher une préparation ne coche jamais la récolte, et l'inverse (voir [docs/base-partagee.md](docs/base-partagee.md)). La barre de progression et les caisses restent celles de la récolte.

Liste du 4 novembre 2026 : 8 clients, 38 lignes.

## Répartition de la semaine (onglet Semaine)

Onglet **Semaine** (étape 13A, « vas-y » de François du 06/11/2026). Remplace l'ancien tableau de cumul : on écrit ce qu'on pense avoir de disponible pour chaque produit, on le répartit entre les créneaux de vente, et le **reste** dit tout de suite ce qui n'est pas placé ou ce qui manque. Aucun prix.

- **‹ Semaine du lundi … ›** : chaque semaine a sa propre répartition, gardée dans la base (prévu pour l'historique, étape 14).
- **＋ Ajouter un produit** : choisi dans la base des produits (`referentiel/conditionnements.json`), avec le contenu d'un colis (« GH de 5 kg », « GB de 12 bottes »). Une semaine vide propose de **reprendre les produits de la semaine précédente** (sans les quantités).
- **Toucher un produit** le déplie : une case pour le disponible, puis une par créneau (Très Allier mardi, Panier La Magic, Panier adéquat, Locavore, Très Allier jeudi, Auvabio 03, Auvabio 63, Marché de Tronget, Élie). Boutons **− et +** (par demi-colis, ou par kilo, ou par unité), ou on tape : « 3 » (colis), « 10 PB » ou « 10 petites basses », « 12 kg », « 500 g », « 36 bottes ». Le colis porte le nom de sa caisse (PB, PH, GB, GH) ; une autre caisse que celle du produit est refusée. Le bouton d'unité (colis, kg, bottes…) convertit la case. Une ligne peut mélanger les unités ; l'équivalent s'affiche sous chaque case.
- **Reste = disponible − tout ce qui est réparti**, dans les deux unités (« 1 colis (12 bottes) »). **Placé** (vert) : reste à zéro. **À placer** (orange) : il reste à vendre. **Manque** (rouge) : on a promis plus qu'on n'a. Le haut de l'onglet compte les produits placés, à placer, en manque.
- **tout** : une case sans chiffre ; tout ce qui reste va à ce créneau (cas des tomates, quand la récolte est trop faible pour un créneau). Un seul « tout » par produit et par semaine : en cocher un autre décoche le premier.
- **Auvabio : un débouché en deux livraisons.** Quand le produit est « Proposé à Auvabio », le reste après tous les autres créneaux est proposé à Auvabio 63 : **calculé**, affiché à part (cadre en pointillés), **modifiable** (− et +, « Revenir au calcul »). Il n'entre pas dans le reste de la ligne.
- **Trois pages** sous le choix de la semaine (‹ ›, valable pour les trois) : **Répartir** (les fiches, ou la grille sur ordinateur), **Tableau** (téléphone seulement) et **À récolter**. Chaque fiche a une bande de couleur à gauche selon son reste (vert placé, orange à placer, rouge manque) ; le haut de la page Répartir compte les produits en pastilles de ces couleurs. Une autre semaine que la semaine en cours a son choix de semaine sur fond jaune.
- **Tableau** (page de l'onglet Semaine, téléphone) : une ligne par produit, une colonne par créneau, le reste, puis le reste Auvabio 03 → 63. Il défile de côté dans son cadre.
- **Sur ordinateur** (écran d'au moins 1000 px de large) : l'onglet devient une **grille façon tableur** sur toute la largeur, où l'on tape directement dans les cases : « 3 » (colis), « 12 kg », « 36 bottes » ou « tout ». **Tab** passe à la case de droite, **Entrée** ou la flèche du bas à la case du dessous (Maj + Entrée ou flèche du haut : au-dessus), **Échap** annule la saisie, une case vidée est effacée (pour le reste 03 → 63 : retour au calcul). Le reste se recalcule dès qu'on change de case. Un changement venu d'un autre téléphone n'efface pas ce qu'on est en train de taper. Le détail d'une case (équivalence, qui, quand) s'affiche au survol. La croix en bout de ligne retire le produit. Chaque case a un **menu d'unité** (la caisse du produit, kg, ou bottes, bouquets, pièces…) : sur une case remplie il convertit la quantité, sur une case vide il règle l'unité du nombre qu'on tapera (par exemple 24 bottes pour un client qui commande en bottes).
- Chaque case garde le **prénom et l'heure** ; partagé entre les téléphones et utilisable **hors ligne**, comme les coches (« la dernière action gagne »).
- **Débouchés et livraisons** (onglet **Réglages**, page « Débouchés » ; jusqu'au 08/11/2026 au soir, un bouton de l'onglet Semaine ; étape 13B, demande de François du 08/11/2026) : la fiche de chaque débouché, modifiable dans l'appli : **nom**, **colis** (caisses plastique PB, PH, GB, GH ; colis bois ; ou non précisé), **remarque**, et ses **livraisons**. Une livraison = une colonne de la semaine : ses **jours** (au moins un, obligatoire ; plusieurs jours cochés = l'un ou l'autre selon la semaine, comme Panier La Magic mardi ou jeudi ; ou « n'importe quel jour »), un **moment** facultatif (soir…), un nom s'il diffère du débouché (Auvabio 03, Auvabio 63), un **nom court** pour le tableau, et « **reprend le reste de** » (seconde livraison du même débouché, comme Auvabio 63). On peut **ajouter** un débouché ou une livraison, **retirer** (rien n'est effacé : c'est rangé dans « Retirés » et peut être **remis**) et changer l'**ordre** (▲ ▼). Les colonnes de la semaine sont rangées par jour de livraison, puis dans cet ordre. Un changement vaut pour la semaine en cours et les suivantes ; **les semaines passées gardent leurs colonnes**. Une livraison retirée reste affichée dans une semaine où elle a déjà des quantités. Partagé et hors ligne comme le reste (la dernière modification l'emporte).
- **Stock chez Très Allier** : une case par produit, placée **juste avant la première livraison du débouché** (ligne avant « Très Allier mardi » sur téléphone, colonne avant elle sur ordinateur et dans le tableau), saisie par la ferme et toujours modifiable, avec prénom et heure. La page **Stock** de l'onglet Semaine (quatrième page, visible dès qu'un débouché suit son stock) permet de tout remplir d'un coup, au magasin : un champ par produit de la semaine, avec − et +, l'unité au choix, et à côté ce qui est prévu pour ce débouché cette semaine (« Prévu cette semaine : TA mar 3, TA jeu 3 ») ; en haut, combien de produits sont renseignés et la dernière saisie. C'est une information : elle n'entre ni dans le disponible ni dans le reste. Elle apparaît pour chaque débouché dont la fiche a « Suivre son stock au magasin » coché (Très Allier au départ).
- **Jours de récolte** (onglet Réglages, page « Jours de récolte ») : pour chaque jour de récolte, on coche les livraisons qu'on récolte ce jour-là (par exemple le mercredi : Panier adéquat, Locavore, Très Allier jeudi, Auvabio 03 et 63, marché de Tronget). Une livraison n'est récoltée qu'un jour : la cocher ailleurs la déplace. Une livraison récoltée après sa date de livraison, ou sans jour de récolte, est signalée.
- **À récolter, jour par jour** (page « À récolter » de l'onglet Semaine, avec un bouton vers le réglage des jours de récolte) : pour chaque jour de récolte de la semaine, chaque produit avec sa quantité totale (« 3 GH (15 kg) ») et le détail par livraison (« Locavore 2 · Ferme Deschamps 1 »). Les « tout » y sont comptés ; le reste proposé à Auvabio 63 n'y entre que s'il est saisi comme quantité. Rien n'est encore écrit dans les listes de récolte (étape 13D).
- Les débouchés de départ sont dans `referentiel/debouches.json` (une autre ferme y met les siens) ; dès la première modification dans l'appli, la base garde sa propre fiche. Chaque semaine garde sa copie des colonnes.

## Licence

Le code de ce dépôt est publié sous la licence **PolyForm Noncommercial 1.0.0** (fichier [`LICENSE`](LICENSE)), choisie par François le 08/11/2026. En clair : on peut l'utiliser, le copier et le modifier **à titre non commercial** (usage personnel, étude, association, recherche…) ; tout **usage commercial est interdit** sans accord écrit du Champ de l'Aurore. Ce n'est donc pas une licence « open source » au sens strict. Les copies faites avant cette date n'étaient couvertes par aucune licence. Ce résumé n'est pas un conseil juridique : seul le texte de `LICENSE` fait foi.

## Fichiers du dépôt

| Fichier | Rôle |
|---|---|
| `index.html` | Toute l'appli (HTML, CSS, JavaScript), sans bibliothèque ni dépendance. |
| `config.js` | Adresse de la base Firebase. Vide = pas de partage. |
| `cle-web.js` | Clé web du projet Firebase, collée par François lui-même (étape 5). Vide = pas de compte, base ouverte. Les agents IA ne l'ouvrent pas. |
| `docs/regles-base/` | Règles de la base : `fermees.json` (comptes avec le profil « ferme » seulement) et `ouvertes.json` (anciennes, pour revenir en arrière). |
| `listes/actuelle.json` | Liste ouverte par défaut. |
| `listes/AAAA-MM-JJ.json` | Une liste par jour de récolte. Format : [docs/format-liste.md](docs/format-liste.md). |
| `referentiel/conditionnements.json` | Pour chaque produit : type de caisse (PB, PH, GB, GH) et contenu d'un colis (kg, ou nombre de bottes, bouquets, pièces, sachets). Source : onglet « Liste produits » du cumul. Aussi : les colisages (colis bois) et les circuits qui les utilisent. |
| `referentiel/debouches.json` | Débouchés de départ de l'onglet Semaine (avant toute modification dans l'appli) : nom, colis, remarque, et livraisons (jours, moment, nom court, seconde livraison `reprend` : Auvabio 63 reprend Auvabio 03), et jours de récolte (`recoltes`). L'identifiant du débouché est celui du circuit des listes de récolte. |
| `sw.js` | Hors ligne : la page et la liste passent par le réseau, sinon la dernière copie. Changer `CACHE` à chaque modification de l'appli. Ne met jamais la base Firebase en cache. |
| `manifest.webmanifest`, `icons/` | Installation sur l'écran d'accueil. |
| `tests/` | Tests de bout en bout avec deux téléphones et un faux Firebase : liste de récolte (`deux-telephones.cjs`), onglet Semaine (`semaine.cjs`), débouchés et livraisons (`debouches.cjs`), connexion par compte (`connexion.cjs`) ; règles de la base sur l'émulateur officiel de Firebase (`regles.cjs`). |
| `docs/` | Format des listes, fonctionnement de la base partagée. |
| `LICENSE` | Licence PolyForm Noncommercial 1.0.0 : usage non commercial seulement. |
| `AGENTS.md` | Consignes pour les agents IA qui modifient ce dépôt (`CLAUDE.md` y renvoie). |
| `docs/ETAT_DU_PROJET.md`, `docs/ROADMAP.md`, `docs/DECISIONS.md`, `CHANGELOG.md` | Registres : où on en est, étapes, décisions, historique. |

## Tests

```bash
npm install --no-save playwright
npx playwright install chromium   # seulement la première fois
node tests/deux-telephones.cjs
node tests/semaine.cjs
node tests/debouches.cjs
node tests/connexion.cjs
```

`tests/regles.cjs` demande en plus l'émulateur officiel de Firebase (`npm install --no-save firebase-tools`, Java), lancé à part : voir l'en-tête du fichier. Sans émulateur, il dit « NON LANCÉ ».

Le test ouvre deux téléphones simulés (François et Aurore) reliés à un faux Firebase local (`tests/faux-firebase.cjs`) et vérifie : la coche passe d'un téléphone à l'autre avec le prénom, la ligne cochée quitte la liste principale, le glisser-déposer au doigt est partagé, le nombre de caisses et de colis bois (par circuit et regroupés), l'onglet Détail caché (et remis par le réglage), la flèche de répartition par client (colisage et poids, colis bois compris), les filtres Locavore et Ferme Deschamps, le décochage, la barre de progression (globale, unités, kilos, mise à jour d'un téléphone à l'autre), l'onglet Préparation (tri par client et par produit, indicateur de récolte, coches de lignes et de clients partagées et gardées après rechargement, sans toucher aux coches de récolte), et l'absence d'erreur JavaScript. Il sort en erreur si une vérification échoue.

`tests/semaine.cjs` vérifie l'onglet Semaine avec deux téléphones et un ordinateur (grille : largeur, Tab et Entrée, « tout » tapé, unité refusée, menu d'unité de chaque case, reste 03 → 63 tapé puis vidé, saisie gardée pendant un changement venu d'un téléphone, retour aux fiches en fenêtre étroite) : ajout de produits partagé, reste en colis et en kilos ou bottes, couleurs, unités tapées ou converties (et refusées si le produit ne se compte pas ainsi), « tout » unique par produit, reste Auvabio 03 → 63 calculé, modifié puis remis au calcul, hors du reste, tableau, hors ligne, semaines séparées, reprise des produits de la semaine précédente, retrait d'un produit, rechargement, et que la liste de récolte de la base n'est pas touchée.

`tests/connexion.cjs` vérifie la base fermée par des comptes (faux Firebase qui imite les règles et la connexion) : fenêtre « Se connecter » au premier lancement, qui ne se ferme pas sans connexion, aucun appel à la base avant ; mauvais mot de passe ; identifiant court ; mot de passe jamais gardé ; deux téléphones qui partagent leurs coches ; connexion gardée après rechargement ; Semaine et débouchés avec le jeton ; jeton expiré renouvelé tout seul ; coche faite hors ligne envoyée malgré un jeton expiré pendant la coupure ; compte sans profil refusé, puis accepté dès que le profil est donné ; déconnexion ; compte supprimé ; clé web fausse.

`tests/regles.cjs` vérifie `docs/regles-base/fermees.json` sur l'émulateur officiel : syntaxe acceptée ; sans compte, tout refusé (lecture, écriture, flux, racine) ; compte sans profil refusé et incapable de se donner le profil ; compte « ferme » qui lit et écrit listes, semaines et débouchés mais ne touche pas aux profils ; puis l'appli branchée sur l'émulateur (connexion, coches, compte sans accès).

`tests/debouches.cjs` vérifie l'écran « Débouchés et livraisons » avec deux téléphones et un ordinateur : les 7 débouchés de départ repris (jours, colis, Auvabio 63 qui reprend la 03), rien d'écrit dans la base avant une modification, jour obligatoire, changement de jour partagé et colonnes de la semaine rangées en conséquence, nouveau débouché (nom et jour obligatoires), seconde livraison avec reste reporté, retrait gardé puis remis, ordre, colonne gardée quand elle a des quantités, semaine passée inchangée, fiches sur deux colonnes à l'ordinateur, jours de récolte (départ, une livraison par jour, ajout, récolte après livraison signalée, retrait, cadre « À récolter » de la semaine), stock chez Très Allier (saisi, partagé, hors du reste, « tout » refusé, case gardée si le suivi est décoché ; page Stock avec ce qui est prévu, saisie et bouton +, chaque stock juste avant les livraisons de son débouché, un bloc par débouché suivi), hors ligne, rechargement, et que quantités et liste de récolte ne sont pas touchées.

## Limites connues

- **Dépôt et base publics** : tant que l'étape 5 n'est pas finie (règles fermées collées par François), quelqu'un qui connaît l'adresse peut lire la liste (produits, quantités, noms des circuits) et cocher des cases. Ensuite, la base n'est ouverte qu'aux comptes avec le profil « ferme » ; les listes du dépôt (`listes/*.json`) restent publiques, comme le site.
- **Deux personnes qui glissent en même temps** : le dernier ordre envoyé gagne.
- **Glisser-déposer à la souris** sur ordinateur : prévu pour le doigt, la souris n'a été testée qu'en simulation tactile.
- **Lieu des récoltes masqué** (depuis le 04/11/2026) : l'emplacement et les zones (Tunnel, Plein champ, Stock) étaient recopiés à la main depuis l'assolement, sans lien avec Ouvre ta ferme. Ils restent dans les listes mais ne s'affichent plus. Pour les réafficher : `var MONTRER_LIEU = true;` dans `index.html` (et changer `CACHE` dans `sw.js`).
