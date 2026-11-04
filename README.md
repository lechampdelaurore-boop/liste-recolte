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
6. [Fichiers du dépôt](#fichiers-du-dépôt)
7. [Tests](#tests)
8. [Limites connues](#limites-connues)

## Utilisation au champ

| Geste | Effet |
|---|---|
| **Récolte / Détail** (en haut) | Récolte : produit, quantité totale. Détail : en plus le type de caisse, le conditionnement et la part de chaque circuit. |
| **Puces de circuit** (Très Allier, Marché ven., Paniers solidaires, Ellie, Locavore, Auvabio 03, Ferme Deschamps) | N'affiche que les produits de ce circuit, avec la quantité de ce circuit seulement. Pratique pour préparer une commande. |
| **Appui long sur une ligne** (0,45 s, sans bouger) | La ligne se décolle (petite vibration) ; la glisser à sa place. Un geste rapide fait défiler la page normalement, sans rien déplacer. L'ordre est le même sur les deux téléphones. |
| **Case à cocher** | La ligne part dans « Récoltes déjà effectuées », avec le prénom et l'heure. |
| **Récoltes déjà effectuées ›** (en bas) | Déroule la liste de ce qui est fait. Toucher la case d'une ligne pour la décocher. |
| **Récolté … %** (barre en haut de la liste) | Avance à chaque coche, sur les deux téléphones : kilos et unités additionnés (voir [Barre de progression](#barre-de-progression)). La petite flèche vers le bas déplie le détail : une barre pour les unités (bottes, bouquets, pièces…), une barre pour les kilos, avec ce qui reste. |
| **Caisses ›** | Nombre de caisses PB, PH, GB, GH, et de colis bois, qui restent à remplir (voir [Calcul des caisses](#calcul-des-caisses)). |
| **👤 prénom** (en haut à droite) | Change le prénom affiché sur les coches. Demandé à la première coche. |

La pastille sous le titre dit l'état du partage :
- **Partagé** (vert) : tout est envoyé.
- **Hors ligne, envoi en attente** (orange) : pas de réseau. Les coches sont gardées sur le téléphone et partent toutes seules au retour du réseau.
- **Sur ce téléphone seulement** : la base partagée n'est pas encore configurée (`config.js` vide).

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

## Mettre la liste de la semaine

Chaque semaine, la liste vient du **cumul** (colonnes total JEUDI, Très Allier Jeudi, Marché Vendredi, AUVABIO 03) et des commandes des autres circuits (paniers solidaires, Ellie, Locavore).

1. Créer `listes/AAAA-MM-JJ.json` (date du jour de récolte), au format décrit dans [docs/format-liste.md](docs/format-liste.md). Le plus simple : copier la liste précédente et changer les quantités.
2. Dans `listes/actuelle.json`, mettre le nouvel identifiant : `{"liste": "AAAA-MM-JJ"}`.
3. Ouvrir une **PR** (jamais d'envoi direct sur `main`), lancer le test, puis fusionner une fois les contrôles verts. Les téléphones affichent la nouvelle liste à la prochaine ouverture, avec des cases vides et l'ordre du fichier (les coches et l'ordre sont rangés par liste).

Une ancienne liste reste consultable avec `?liste=AAAA-MM-JJ` à la fin de l'adresse.

## Calcul des caisses

- Il y a quatre types de caisses, avec le code du cumul : **PB** petite basse, **PH** petite haute, **GB** grande basse, **GH** grande haute.
- Chaque produit porte un code de caisse (champ `caisse`), repris de [referentiel/conditionnements.json](referentiel/conditionnements.json). **Une caisse par colis.**
- Par défaut, **une caisse par circuit** : un demi-colis pour Très Allier et un demi-colis pour le marché font 2 caisses, parce qu'ils partent à deux endroits. En décochant l'option, les demi-colis d'un même produit sont regroupés (ici, 1 caisse).
- Les sachets Locavore, les bottes, les pièces (Ellie, courges) et les tomates (« tout ») ne sont pas comptés.
- **Colisage par débouché** : un circuit peut partir dans d'autres colis que les caisses. Paniers solidaires, Locavore et Ferme Deschamps partent en **colis bois** (demande de François, 04/11/2026) : PB → petit colis bois, PH → moyen colis bois, GB et GH → grand colis bois. Seule l'étiquette change : un colis bois contient exactement la même chose que la caisse correspondante (10 bouquets de persil en PB = 10 bouquets en petit colis bois). Ces colis sont comptés à part, sous les caisses, et la vue Détail ou le filtre du circuit dit lequel prendre et ce qu'on y met (« Paniers : 3,5 grands colis bois de 5 kg »). Comme pour les caisses, un demi-colis occupe un colis : 3,5 colis = 4 colis bois à préparer, dont un à moitié plein. Les autres circuits gardent PB, PH, GB, GH. Réglage dans la liste : voir [docs/format-liste.md](docs/format-liste.md#colisage-par-circuit).
- Le chiffre affiché est ce qui **reste à remplir** : une ligne cochée sort du compte. Avec un filtre de zone ou de circuit, le calcul ne porte que sur ce qui est affiché.

Liste du 4 novembre 2026, rien de coché : 2 PB, 19 PH, 2 GB, 10 GH, et 1 petit, 1 moyen, 4 grands colis bois (par circuit) ; ou 1 PB, 19 PH, 1 GB, 10 GH, et 1 petit, 1 moyen, 4 grands colis bois (regroupées).

## Barre de progression

- L'appli lit le champ `kg` de chaque ligne (par exemple « 5,5 kg + 34 bottes ») : les kilos (et les grammes) vont dans la barre **Kilos**, tout autre « nombre + mot » (bottes, bouquets, pièces, poireaux…) dans la barre **Unités**.
- Une ligne compte quand elle est cochée, en entier. Une ligne sans nombre (les tomates « tout ») n'est pas comptée, et c'est écrit sous les barres.
- Barre du haut : kilos et unités **additionnés** (1 unité compte comme 1 kg).
- La barre porte toujours sur toute la liste, quels que soient les filtres de zone et de circuit.

Liste du 4 novembre 2026 : 173 kg et 66 unités (41 bottes, 10 bouquets, 10 poireaux, 5 pièces), soit 239 en tout.

## Fichiers du dépôt

| Fichier | Rôle |
|---|---|
| `index.html` | Toute l'appli (HTML, CSS, JavaScript), sans bibliothèque ni dépendance. |
| `config.js` | Adresse de la base Firebase. Vide = pas de partage. |
| `listes/actuelle.json` | Liste ouverte par défaut. |
| `listes/AAAA-MM-JJ.json` | Une liste par jour de récolte. Format : [docs/format-liste.md](docs/format-liste.md). |
| `referentiel/conditionnements.json` | Pour chaque produit : type de caisse (PB, PH, GB, GH) et contenu d'un colis (kg, ou nombre de bottes, bouquets, pièces, sachets). Source : onglet « Liste produits » du cumul. Aussi : les colisages (colis bois) et les circuits qui les utilisent. |
| `sw.js` | Hors ligne : la page et la liste passent par le réseau, sinon la dernière copie. Changer `CACHE` à chaque modification de l'appli. Ne met jamais la base Firebase en cache. |
| `manifest.webmanifest`, `icons/` | Installation sur l'écran d'accueil. |
| `tests/` | Test de bout en bout avec deux téléphones et un faux Firebase. |
| `docs/` | Format des listes, fonctionnement de la base partagée. |
| `AGENTS.md` | Consignes pour les agents IA qui modifient ce dépôt (`CLAUDE.md` y renvoie). |
| `docs/ETAT_DU_PROJET.md`, `docs/ROADMAP.md`, `docs/DECISIONS.md`, `CHANGELOG.md` | Registres : où on en est, étapes, décisions, historique. |

## Tests

```bash
npm install --no-save playwright
npx playwright install chromium   # seulement la première fois
node tests/deux-telephones.cjs
```

Le test ouvre deux téléphones simulés (François et Aurore) reliés à un faux Firebase local (`tests/faux-firebase.cjs`) et vérifie : la coche passe d'un téléphone à l'autre avec le prénom, la ligne cochée quitte la liste principale, le glisser-déposer au doigt est partagé, le nombre de caisses et de colis bois (par circuit et regroupés), la vue Détail d'un circuit en colis bois, les filtres Locavore et Ferme Deschamps, le décochage, la barre de progression (globale, unités, kilos, mise à jour d'un téléphone à l'autre), et l'absence d'erreur JavaScript. Il sort en erreur si une vérification échoue.

## Limites connues

- **Dépôt et base publics** : quelqu'un qui connaît l'adresse peut lire la liste (produits, quantités, noms des circuits) et cocher des cases. Il n'y a pas de mot de passe. Acceptable pour une liste de récolte ; à revoir si on y met des données sensibles.
- **Deux personnes qui glissent en même temps** : le dernier ordre envoyé gagne.
- **Glisser-déposer à la souris** sur ordinateur : prévu pour le doigt, la souris n'a été testée qu'en simulation tactile.
- **Lieu des récoltes masqué** (depuis le 04/11/2026) : l'emplacement et les zones (Tunnel, Plein champ, Stock) étaient recopiés à la main depuis l'assolement, sans lien avec Ouvre ta ferme. Ils restent dans les listes mais ne s'affichent plus. Pour les réafficher : `var MONTRER_LIEU = true;` dans `index.html` (et changer `CACHE` dans `sw.js`).
