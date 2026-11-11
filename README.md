# Liste de récolte (appli « Cumul »)

Depuis le 8/11/2026, l'appli s'appelle **« Cumul »** (titre, en-tête, appli installée) ; l'adresse et le dépôt gardent le nom « liste-recolte ».

Liste de récolte partagée du Champ de l'Aurore (GAEC, Tronget), faite pour le téléphone.
François et Aurore la suivent en même temps pendant la récolte du mercredi : ce que l'un coche disparaît aussi chez l'autre.

**Adresse : https://liste-recolte.pages.dev**

Hébergée sur Cloudflare Pages, relié à ce dépôt : chaque envoi sur `main` est en ligne une minute après. Ne pas utiliser l'adresse `lechampdelaurore-boop.github.io/liste-recolte/` : sur les téléphones où l'accueil des applis de Marc est installé, elle s'ouvre dans cette appli-là (son installation couvre tout le site github.io).

## Sommaire

1. [Utilisation au champ](#utilisation-au-champ)
2. [Mise en route](#mise-en-route) (une seule fois)
3. [La liste de récolte de chaque jour](#la-liste-de-récolte-de-chaque-jour) (elle se remplit toute seule depuis l'onglet Semaine)
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
| **Onglets Semaine / Récolte / Préparation / Réglages** (en bas de l'écran sur le téléphone, en haut sur l'ordinateur ; même place et même taille sur chaque page, refonte du 08/11/2026) | Dans l'ordre de la semaine. Semaine : répartition du disponible de la semaine entre les créneaux de vente (voir [Répartition de la semaine](#répartition-de-la-semaine-onglet-semaine)). Récolte : la liste du jour de récolte choisi, produit et quantité totale (voir [La liste de récolte de chaque jour](#la-liste-de-récolte-de-chaque-jour)). Préparation : la même liste, une ligne par produit et par client, à cocher pendant la préparation des commandes (voir [Préparation de commandes](#préparation-de-commandes)). Réglages : débouchés, livraisons et jours de récolte. Chaque page a son titre sous le bandeau vert. |
| **Puces de circuit** (Très Allier, Marché ven., Panier adéquat, Élie, Locavore, Auvabio 03, Ferme Deschamps, Panier La Magic) | N'affiche que les produits de ce circuit, avec la quantité de ce circuit seulement. Pratique pour préparer une commande. |
| **Petite flèche en bas à droite d'un produit** (onglet Récolte) | Déplie la répartition du produit par client : le colis (ex. « GH de 5 kg »), puis pour chaque client le nombre de colis (colis bois compris) et le poids ou le nombre d'unités correspondant. Toucher à nouveau pour replier. Ouvert ou fermé sur ce téléphone seulement. Remplace l'onglet Détail, caché le 04/11/2026 puis supprimé le 09/11/2026. |
| **Appui long sur une ligne** (0,45 s, sans bouger) | La ligne se décolle (petite vibration) ; la glisser à sa place. Un geste rapide fait défiler la page normalement, sans rien déplacer. L'ordre est le même sur les deux téléphones. |
| **Enregistrer cet ordre** (en bas de la liste à récolter de l'onglet Récolte, juste avant « Récoltes déjà effectuées », téléphone et ordinateur ; depuis le 09/11/2026) | Garde l'ordre de la liste affichée comme **ordre de récolte habituel** de la ferme (dans la base, avec le prénom et l'heure). Ensuite, chaque jour de récolte **pas encore trié** s'ouvre directement dans cet ordre ; les produits qui n'y sont pas encore se placent à la fin, et la phrase sous le bouton les nomme. Un jour déjà trié à la main garde son ordre. Les produits absents de la liste affichée gardent leur place dans l'ordre habituel. Quand la liste suit déjà l'ordre habituel, le bouton dit « ✓ Ordre habituel » et ne fait rien. Ranger la liste n'écrit pas l'ordre habituel : seul ce bouton l'écrit. Sans réseau, il attend et part au retour du réseau. |
| **Sur ordinateur (fenêtre d'au moins 1000 px, souris) : poignée et boutons de tri** | Lignes compactes (environ 48 px). La poignée (six points, à gauche) décolle la ligne tout de suite, sans appui long. Au survol d'une ligne, quatre boutons : tout en haut, monter d'un cran, descendre d'un cran, tout en bas ; après monter ou descendre, la ligne reste sous la souris pour cliquer encore. Le téléphone ne change pas. |
| **Case à cocher** | La ligne devient vert plein (nom en blanc, case qui grossit) et reste à sa place environ 3 secondes, pour voir quel produit on vient de cocher ; puis elle glisse vers la droite et part dans « Récoltes déjà effectuées », avec le prénom et l'heure. Toucher de nouveau la case pendant ces 3 secondes décoche. La coche est enregistrée et partagée tout de suite ; sur l'autre téléphone, la ligne part sans animation. |
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

**Miniatures des légumes** (09/11/2026, demande de François) : devant le nom de chaque produit, le petit dessin de son espèce, pris dans les dessins d'Ouvre ta ferme (dossier [`especes/`](especes/LISEZMOI.md)) : Récolte, Préparation, Semaine (Répartir, Cumul, À récolter, Stock), « Ajouter un produit » et page du magasin. L'espèce se trouve à partir du nom du produit : en minuscules, sans accents, avec des tirets, en retirant les mots de la fin jusqu'à trouver une espèce (« Carotte (botte) » → carotte, « Tomate Cerise » → tomate-cerise), plus quelques noms qu'Ouvre ta ferme écrit autrement (bette → blette, salade → laitue, rabiole → navet, radis → radis-rave (« Radis d'hiver en mélange » → le même radis recoloré en rouge-rose, dessin retouché dans `especes/modifies.svg`), chou vert → chou blanc, chou frisé → chou de Milan, chou chinois → pé-tsaï, roquette → roquette cultivée, petit pois → pois, aillet → ail, aromatiques → persil (demande de François du 9/11)…). Pas d'espèce trouvée : pas de dessin. Ça marche pour les produits d'une autre ferme, tant que leur nom commence par une espèce connue d'Ouvre ta ferme.

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

## La liste de récolte de chaque jour

Depuis l'étape 13D (08/11/2026), **plus de fichier ni de PR chaque semaine** : la liste d'un jour de récolte se remplit toute seule depuis l'onglet Semaine (le cumul).

1. Dans l'onglet **Semaine**, page **Répartir**, on remplit le cumul de la semaine (disponible et part de chaque livraison).
2. Page **À récolter** : les **jours de récolte** de la semaine, **repliés** : une ligne par jour (son nom, « Chaque semaine » ou non, ses livraisons, combien de produits à récolter) et une flèche qui déplie son détail (demande de François du 09/11/2026). Tout en haut, les boutons **« ＋ Nouveau jour de récolte »** et **« Régler les jours habituels »** ; le premier ouvre un petit menu **« Quel jour de récolte créer ? »** avec les jours de la semaine qui n'en ont pas encore, et rien n'est créé tant qu'on n'a pas choisi (« Annuler » referme le menu). Déplier, replier ou ouvrir le menu n'écrit rien dans la base. Les jours habituels cochés « Chaque semaine » (au Champ de l'Aurore : le lundi, pour les livraisons du mardi ; le mercredi, pour celles du mercredi, du jeudi et du vendredi) sont déjà là, avec leurs livraisons cochées. On peut, **pour cette semaine seulement**, cocher ou décocher une livraison (une livraison n'est récoltée qu'un jour : la cocher ailleurs la déplace), **ajouter un jour** (ses livraisons sont proposées déjà cochées : celles du jour habituel s'il y en a un, sinon celles qui suivent ce jour et ne sont récoltées nulle part) ou **retirer un jour**. La case **« Chaque semaine »** d'un jour le rend habituel (créé tout seul dans les semaines suivantes) ; décochée, le jour reste dans cette semaine et n'est plus créé ensuite. Rien n'est effacé. Le bouton **« Voir la liste de récolte »** ouvre la liste de ce jour.
3. Onglets **Récolte** et **Préparation** : la semaine choisie dans l'onglet Semaine (rappelée en haut), et un **menu des jours de récolte** de cette semaine (« Lundi 9 », « Mercredi 11 »). S'ouvre le jour de récolte d'aujourd'hui ou le prochain (sinon le dernier de la semaine). Une semaine passée choisie un autre jour revient à la semaine en cours.

**Ce que contient la liste d'un jour** : un circuit par débouché dont une livraison est récoltée ce jour-là (Auvabio 03 et 63 réunis en « Auvabio »), une ligne par produit qui a une quantité pour l'une de ces livraisons. Colis → nombre de colis (comptés dans les caisses, en colis bois pour un débouché en colis bois) ; kilos → « 5 kg » ; bottes, pièces → « 6 bottes ». Le **total** et les **kilos** de chaque ligne sont calculés. « tout » reste « tout ». Le stock au magasin n'y entre jamais ; le reste proposé à Auvabio 63 seulement s'il est saisi comme quantité. Une quantité sans fiche de produit n'y entre pas et c'est signalé.

**Liste figée à la première coche** : tant que personne n'a coché, la liste suit la semaine en direct. La première coche (récolte, préparation ou ordre des lignes) la **fige** : elle ne change plus sous les yeux de ceux qui récoltent. Si la semaine change ensuite, chaque ligne touchée le dit (« Changé dans la semaine : maintenant 7 colis + 3 kg (38 kg) », « Retiré de la semaine »), un encadré jaune résume, et le bouton **« Mettre la liste à jour »** reprend la semaine (les coches restent).

**Messages** : « Le cumul de cette semaine est vide. » (rien de réparti), « Aucun jour de récolte cette semaine. » (des quantités, mais pas de jour), « Rien à récolter ce jour-là. » (aucune quantité pour ses livraisons), chacun avec un bouton vers l'onglet Semaine.

**Listes en fichier** (faites à la main avant 13D, comme `listes/2026-11-04.json`) : une liste en fichier l'emporte pour sa date ; ses coches restent où elles étaient. Une liste en fichier s'ouvre aussi directement avec `?liste=AAAA-MM-JJ` à la fin de l'adresse (format : [docs/format-liste.md](docs/format-liste.md)). `listes/actuelle.json` ne sert plus à l'appli.

## Calcul des caisses

- Les types de caisses viennent de [referentiel/conditionnements.json](referentiel/conditionnements.json) (`caisses`, une autre ferme y met les siennes). Ici, avec le code du cumul : **PB** petite basse, **PH** petite haute, **GB** grande basse, **GH** grande haute, et **CB** caisse bleue (depuis le 9/11/2026). Une caisse qui n'est la caisse principale d'aucun produit (la caisse bleue) n'apparaît dans le cadre « Caisses » que quand elle a un compte.
- Chaque produit porte un code de caisse (champ `caisse`), repris de [referentiel/conditionnements.json](referentiel/conditionnements.json). **Une caisse par colis.**
- Par défaut, **une caisse par circuit** : un demi-colis pour Très Allier et un demi-colis pour le marché font 2 caisses, parce qu'ils partent à deux endroits. En décochant l'option, les demi-colis d'un même produit sont regroupés (ici, 1 caisse).
- **Kilos hors colis** (demande de François, 04/11/2026) : une quantité écrite seulement en kilos pour un circuit (`"5 kg"`) prend une caisse de plus, du type du produit. Exemple : patate douce, 1 colis de 6 kg pour le marché + 5 kg pour Panier La Magic = 2 PH. Regroupées, ces kilos comptent pour leur part de colis (5 kg sur 6). Dans la vue Récolte, on garde l'écriture « 1 colis + 5 kg ».
- Les sachets Locavore, les bottes, les pièces (Élie, courges) et les tomates (« tout ») ne sont pas comptés.
- **Caisse de récolte** (demande de François, 09/11/2026) : un produit peut être récolté dans une autre caisse que celle où il part (champ `recolte_en` du référentiel). La carotte lavée est toujours récoltée en caisse bleue de 16 kg : elle est comptée en caisses bleues d'après son poids total, tous circuits ensemble, arrondi au-dessus (56 kg = 4 CB), puisqu'elle est lavée puis reconditionnée. Elle ne compte alors ni en PH ni en colis bois. La page « À récolter » de la Semaine l'écrit aussi (« récolte : 4 CB »).
- **Caisses déjà sur place** (demande de François, 11/11/2026) : un produit dont les caisses sont rangées là où on le récolte (champ `"caisses_sur_place": true` du référentiel ; ici l'endive) n'est pas compté dans les caisses à emporter. Sa ligne garde sa quantité ; ses caisses sont nommées sous le cadre (« Pas comptées, caisses déjà sur place : Endive (3 PH). »).
- **Autres conditionnements** (même demande) : un produit peut partir, au choix, dans une autre caisse que la sienne (champ `autres_colis`). La carotte lavée part en PH de 8 kg ou en CB de 16 kg : le choix se fait case par case dans l'onglet Semaine (menu ou bouton d'unité : PH, CB, kg ; ou « 2 CB », « 2 caisses bleues » tapé). La liste de récolte écrit « 5 PH + 1 CB », la Préparation « 1 CB · 16 kg » pour le client concerné. Une même livraison du même jour qui mêle PH et CB est convertie en PH.
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

- **Par client / Par produit** (sous les onglets) : un bloc par client, ou un bloc par produit. Tout est **par ordre alphabétique** (demande de François du 11/11/2026), sans bouton de tri : les clients et, dans chaque client, ses produits ; ou les produits et, dans chaque produit, ses clients. Ordre alphabétique français : accents et majuscules ne comptent pas (« Élie » vient après « Auvabio 03 » et avant « Ferme Deschamps »). L'ordre de l'onglet Récolte ne change pas.
- **Récolté / Pas encore récolté** : sur chaque ligne (tri par client) ou en tête du produit (tri par produit). C'est la coche de l'onglet Récolte, lue telle quelle.
- **Toucher une ligne** (n'importe où, pratique avec des gants) : la ligne est cochée, avec le prénom et l'heure ; la toucher de nouveau la décoche. Elle reste à sa place, barrée, pour ne pas mélanger les lignes.
- **Case du client** (tri par client, dans le bandeau noir) : la commande est prête. Le client passe en vert dans « Commandes prêtes », en bas, et y reste visible avec ses lignes. Cocher le client ne coche pas ses lignes : s'il en reste, c'est écrit (« Attention : 1 ligne pas cochée »). Toucher de nouveau la case remet la commande dans la liste.
- Les **puces de circuit** marchent aussi : « Ferme Deschamps » n'affiche que sa commande.
- Les coches de préparation sont **partagées** entre les téléphones, comme celles de la récolte, mais rangées à part : cocher une préparation ne coche jamais la récolte, et l'inverse (voir [docs/base-partagee.md](docs/base-partagee.md)). La barre de progression et les caisses restent celles de la récolte.

Liste du 4 novembre 2026 : 8 clients, 38 lignes.

## Répartition de la semaine (onglet Semaine)

Onglet **Semaine** (étape 13A, « vas-y » de François du 06/11/2026). Remplace l'ancien tableau de cumul : on écrit ce qu'on pense avoir de disponible pour chaque produit, on le répartit entre les créneaux de vente, et le **reste** dit tout de suite ce qui n'est pas placé ou ce qui manque. Aucun prix.

- **‹ Semaine 46 · du 9 novembre ›** (numéro de semaine ISO puis date du lundi) : chaque semaine a sa propre répartition, gardée dans la base.
- **Historique des semaines** (bouton sous le choix de la semaine ; étape 14, 09/11/2026) : toutes les semaines enregistrées jusqu'à la semaine en cours, la plus récente en haut, repliées. La flèche d'une semaine montre ses jours de récolte : combien de produits cochés sur combien, le total en kilos (et bottes, pièces…), qui a coché et de quelle heure à quelle heure, chaque produit coché avec sa quantité, qui et à quelle heure (dans l'ordre de la coche), ce qui n'a pas été coché, la préparation (lignes préparées, commandes prêtes). « Ouvrir la liste de ce jour » rouvre l'onglet Récolte sur ce jour ; « Voir la répartition de cette semaine » rouvre l'onglet Semaine, page Cumul, sur cette semaine. **Lecture seule** : la page n'écrit rien dans la base. Les quantités sont celles de la liste du jour (l'appli note la coche, pas le poids réellement récolté). Sans réseau, l'historique déjà lu sur le téléphone s'affiche, avec un avertissement.
- **＋ Ajouter un produit** : choisi dans la base des produits (`referentiel/conditionnements.json`), avec le contenu d'un colis (« GH de 5 kg », « GB de 12 bottes »). Une semaine vide propose de **reprendre les produits de la semaine précédente** (sans les quantités).
- **Toucher un produit** le déplie : une case pour le disponible, puis une par créneau (Très Allier mardi, Panier La Magic, Panier adéquat, Locavore, Très Allier jeudi, Auvabio 03, Auvabio 63, Marché de Tronget, Élie). Boutons **− et +** (par demi-colis, ou par kilo, ou par unité), ou on tape : « 3 » (colis), « 10 PB » ou « 10 petites basses », « 12 kg », « 500 g », « 36 bottes ». Le colis porte le nom de sa caisse (PB, PH, GB, GH) ; une autre caisse que celle du produit est refusée. Le bouton d'unité (colis, kg, bottes…) convertit la case. Une ligne peut mélanger les unités ; l'équivalent s'affiche sous chaque case.
- **Reste = disponible − tout ce qui est réparti**, dans les deux unités (« 1 colis (12 bottes) »). **Placé** (vert) : reste à zéro. **À placer** (orange) : il reste à vendre. **Manque** (rouge) : on a promis plus qu'on n'a. Le haut de l'onglet compte les produits placés, à placer, en manque.
- **tout** : une case sans chiffre ; tout ce qui reste va à ce créneau (cas des tomates, quand la récolte est trop faible pour un créneau). Un seul « tout » par produit et par semaine : en cocher un autre décoche le premier.
- **Auvabio : un débouché en deux livraisons.** Quand le produit est « Proposé à Auvabio », le reste après tous les autres créneaux est proposé à Auvabio 63 : **calculé**, affiché à part (cadre en pointillés), **modifiable** (− et +, « Revenir au calcul »). Il n'entre pas dans le reste de la ligne.
- **Trois pages** sous le choix de la semaine (‹ ›, valable pour les trois, et pour les onglets Récolte et Préparation) : **Répartir** (les fiches, ou la grille sur ordinateur), **Cumul** (téléphone seulement ; s'appelait « Tableau » jusqu'au 08/11/2026) et **À récolter**. Chaque fiche a une bande de couleur à gauche selon son reste (vert placé, orange à placer, rouge manque) ; le haut de la page Répartir compte les produits en pastilles de ces couleurs. Une autre semaine que la semaine en cours a son choix de semaine sur fond jaune.
- **Cumul** (page de l'onglet Semaine, téléphone) : une ligne par produit, une colonne par créneau, le reste, puis le reste Auvabio 03 → 63. Il défile de côté dans son cadre.
- **Sur ordinateur** (écran d'au moins 1000 px de large) : l'onglet devient une **grille façon tableur** sur toute la largeur, où l'on tape directement dans les cases : « 3 » (colis), « 12 kg », « 36 bottes » ou « tout ». **Tab** passe à la case de droite, **Entrée** ou la flèche du bas à la case du dessous (Maj + Entrée ou flèche du haut : au-dessus), **Échap** annule la saisie, une case vidée est effacée (pour le reste 03 → 63 : retour au calcul). Le reste se recalcule dès qu'on change de case. Un changement venu d'un autre téléphone n'efface pas ce qu'on est en train de taper. Le détail d'une case (équivalence, qui, quand) s'affiche au survol. La grille n'a pas d'ascenseur à elle : tous les produits s'affichent, la page défile, la ligne des titres reste collée en haut et la colonne des produits à gauche. La croix en bout de ligne retire le produit. Chaque case a un **menu d'unité** (la caisse du produit, kg, ou bottes, bouquets, pièces…) : sur une case remplie il convertit la quantité, sur une case vide il règle l'unité du nombre qu'on tapera (par exemple 24 bottes pour un client qui commande en bottes).
- Chaque case garde le **prénom et l'heure** ; partagé entre les téléphones et utilisable **hors ligne**, comme les coches (« la dernière action gagne »).
- **Débouchés et livraisons** (onglet **Réglages**, page « Débouchés » ; jusqu'au 08/11/2026 au soir, un bouton de l'onglet Semaine ; étape 13B, demande de François du 08/11/2026) : la fiche de chaque débouché, modifiable dans l'appli : **nom**, **colis** (caisses plastique PB, PH, GB, GH ; colis bois ; ou non précisé), **remarque**, et ses **livraisons**. Une livraison = une colonne de la semaine : ses **jours** (au moins un, obligatoire ; plusieurs jours cochés = l'un ou l'autre selon la semaine, comme Panier La Magic mardi ou jeudi ; ou « n'importe quel jour »), un **moment** facultatif (soir…), un nom s'il diffère du débouché (Auvabio 03, Auvabio 63), un **nom court** pour le tableau, et « **reprend le reste de** » (seconde livraison du même débouché, comme Auvabio 63). On peut **ajouter** un débouché ou une livraison, **retirer** (rien n'est effacé : c'est rangé dans « Retirés » et peut être **remis**) et changer l'**ordre** (▲ ▼). Les colonnes de la semaine sont rangées par jour de livraison, puis dans cet ordre. Un changement vaut pour la semaine en cours et les suivantes ; **les semaines passées gardent leurs colonnes**. Une livraison retirée reste affichée dans une semaine où elle a déjà des quantités. Partagé et hors ligne comme le reste (la dernière modification l'emporte).
- **Stock chez Très Allier** : une case par produit, placée **juste avant la première livraison du débouché** (ligne avant « Très Allier mardi » sur téléphone, colonne avant elle sur ordinateur et dans le tableau), saisie par la ferme et toujours modifiable, avec prénom et heure. La page **Stock** de l'onglet Semaine (quatrième page, visible dès qu'un débouché suit son stock) permet de tout remplir d'un coup, au magasin : un champ par produit de la semaine, avec − et +, l'unité au choix, et à côté ce qui est prévu pour ce débouché cette semaine (« Prévu cette semaine : TA mar 3, TA jeu 3 ») ; en haut, combien de produits sont renseignés et la dernière saisie. C'est une information : elle n'entre ni dans le disponible ni dans le reste. Elle apparaît pour chaque débouché dont la fiche a « Suivre son stock au magasin » coché (Très Allier au départ).
- **Stock saisi par le magasin** (étape 13C, depuis le 08/11/2026) : le magasin a sa page, https://liste-recolte.pages.dev/magasin (`magasin.html`), et un seul compte (profil `magasin:ta`). On s'y connecte une fois par téléphone ; la page demande d'abord **« Qui saisit ? »** (prénom gardé sur le téléphone, modifiable d'un appui en haut de l'écran, prénoms déjà utilisés proposés). La page s'ouvre sur la semaine en cours ; les flèches ‹ › changent de semaine, toujours après confirmation. La liste de la semaine est vide au départ : on ajoute les produits un par un (« Ajouter un produit », avec recherche, ou « Reprendre les produits de la semaine d'avant »), puis on tape le chiffre, en colis par défaut ou en kilos (− et +), avec la valeur, le prénom et l'heure sous la case ; × retire un produit. Les produits saisis par un autre téléphone du magasin apparaissent d'eux-mêmes. Chaque saisie ajoute une ligne au journal, que le magasin ne peut ni lire ni effacer. Sans réseau, la saisie attend. Côté ferme, la case « Stock chez Très Allier » montre **la saisie la plus récente, de la ferme ou du magasin** (« Igor (magasin) ») ; une case vide montre en aide ce que le magasin avait compté la semaine d'avant ; un produit saisi par le magasin et absent de la semaine y entre tout seul (s'il a été retiré par la ferme, il reste proposé à part, avec « Ajouter à la semaine ») ; sous chaque case « Stock Très Allier » de la grille, qui et quand ; la page « Stock » a le bouton **« Qui a saisi au magasin cette semaine ? »** (saisies regroupées par personne). Le prénom est déclaré, pas vérifié. Mise en place : `docs/PAS_A_PAS_MAGASIN.md`.
- **Jours de récolte habituels** (onglet Réglages, page « Jours de récolte ») : pour chaque jour de récolte, on coche les livraisons qu'on récolte ce jour-là (par exemple le mercredi : Panier adéquat, Locavore, Très Allier jeudi, Auvabio 03 et 63, marché de Tronget), et « Chaque semaine » (créé tout seul dans chaque semaine ; décoché, il sert de proposition quand on ajoute ce jour à une semaine). Une livraison n'est récoltée qu'un jour : la cocher ailleurs la déplace. Une livraison récoltée après sa date de livraison, ou sans jour de récolte, est signalée. Un changement vaut pour les semaines qui ne l'ont pas changé elles-mêmes ; les semaines passées gardent leurs jours.
- **À récolter, jour par jour** (page « À récolter » de l'onglet Semaine) : les jours de récolte de la semaine (voir [La liste de récolte de chaque jour](#la-liste-de-récolte-de-chaque-jour)), repliés ; pour chacun, sous sa flèche, ses livraisons à cocher, « Chaque semaine », chaque produit avec sa quantité totale (« 3 GH (15 kg) ») et le détail par livraison (« Locavore 2 · Ferme Deschamps 1 »), et le bouton « Voir la liste de récolte ». Les « tout » y sont comptés ; le reste proposé à Auvabio 63 n'y entre que s'il est saisi comme quantité.
- Les débouchés de départ sont dans `referentiel/debouches.json` (une autre ferme y met les siens) ; dès la première modification dans l'appli, la base garde sa propre fiche. Chaque semaine garde sa copie des colonnes.

## Licence

Le code de ce dépôt est publié sous la licence **PolyForm Noncommercial 1.0.0** (fichier [`LICENSE`](LICENSE)), choisie par François le 08/11/2026. En clair : on peut l'utiliser, le copier et le modifier **à titre non commercial** (usage personnel, étude, association, recherche…) ; tout **usage commercial est interdit** sans accord écrit du Champ de l'Aurore. Ce n'est donc pas une licence « open source » au sens strict. Les copies faites avant cette date n'étaient couvertes par aucune licence. Ce résumé n'est pas un conseil juridique : seul le texte de `LICENSE` fait foi.

**Exception : le dossier `especes/`** (dessins des espèces d'Ouvre ta ferme, copiés sans modification) reste sous la licence de leur auteur, la **GNU Affero GPL version 3 ou ultérieure** (AGPL-3.0, texte dans `especes/LICENSE-AGPL-3.0.txt`) ; la licence PolyForm ne s'y applique pas. Voir [`especes/LISEZMOI.md`](especes/LISEZMOI.md).

## Fichiers du dépôt

| Fichier | Rôle |
|---|---|
| `index.html` | Toute l'appli (HTML, CSS, JavaScript), sans bibliothèque ni dépendance. |
| `config.js` | Adresse de la base Firebase. Vide = pas de partage. |
| `cle-web.js` | Clé web du projet Firebase, collée par François lui-même (étape 5). Vide = pas de compte, base ouverte. Les agents IA ne l'ouvrent pas. |
| `docs/regles-base/` | Règles de la base : `fermees.json` (comptes avec le profil « ferme » seulement) et `ouvertes.json` (anciennes, pour revenir en arrière). |
| `listes/actuelle.json` | Ancienne liste ouverte par défaut (avant l'étape 13D) ; ne sert plus à l'appli. |
| `listes/AAAA-MM-JJ.json` | Listes faites à la main avant l'étape 13D (une par jour de récolte) ; une liste en fichier l'emporte pour sa date. Format : [docs/format-liste.md](docs/format-liste.md). |
| `referentiel/conditionnements.json` | Pour chaque produit : type de caisse (PB, PH, GB, GH) et contenu d'un colis (kg, ou nombre de bottes, bouquets, pièces, sachets). Source : onglet « Liste produits » du cumul. Aussi : les colisages (colis bois) et les circuits qui les utilisent. Un produit marqué `"masque": true` n'est plus proposé à l'ajout mais reste lisible dans les semaines qui l'ont déjà ; `"remplace_par"` donne le produit qui le remplace quand on reprend la semaine précédente (exemple : l'ancien « Persil frisé (bouquet) », remplacé le 9/11/2026). Ne pas renommer un produit déjà utilisé : son nom fait son identifiant dans la base. `"autres_colis"` : autres caisses où le produit peut partir, avec leur contenu (`[{"caisse": "CB", "kg": 16}]`) ; `"recolte_en"` : caisse où il est récolté, si ce n'est pas la sienne (`{"caisse": "CB", "kg": 16}`). Exemple : la carotte lavée (9/11/2026). |
| `referentiel/debouches.json` | Débouchés de départ de l'onglet Semaine (avant toute modification dans l'appli) : nom, colis, remarque, et livraisons (jours, moment, nom court, seconde livraison `reprend` : Auvabio 63 reprend Auvabio 03), et jours de récolte (`recoltes`). L'identifiant du débouché est celui du circuit des listes de récolte. |
| `especes/` | Dessins des espèces d'Ouvre ta ferme (`plants.svg`, 183 dessins, copie sans modification, licence AGPL-3.0) : la miniature devant le nom de chaque produit. Voir `especes/LISEZMOI.md`. |
| `magasin.html` | Page du magasin (étape 13C) : saisie du stock avec le compte du magasin. Autonome, même charte. |
| `sw.js` | Hors ligne : la page et la liste passent par le réseau, sinon la dernière copie. Changer `CACHE` à chaque modification de l'appli. Ne met jamais la base Firebase en cache. |
| `manifest.webmanifest`, `icons/` | Installation sur l'écran d'accueil. |
| `tests/` | Tests de bout en bout avec deux téléphones et un faux Firebase : liste de récolte (`deux-telephones.cjs`), onglet Semaine (`semaine.cjs`), débouchés et livraisons (`debouches.cjs`), connexion par compte (`connexion.cjs`), listes calculées depuis la semaine (`listes-calculees.cjs`), couleur des débouchés (`couleurs.cjs`), filtre par jour de récolte et impression (`filtre.cjs`), flèches du clavier dans la grille (`fleches.cjs`), tri de l'onglet Récolte sur ordinateur (`tri-ordinateur.cjs`), aromatiques (`aromatiques.cjs`), miniatures des légumes (`miniatures.cjs`), animation de la coche (`animation-coche.cjs`), ordre de récolte habituel (`ordre-habituel.cjs`), historique des semaines (`historique.cjs`), caisses d'endives hors du total (`endives-sur-place.cjs`), céleri-branche en bouquet (`celeri-bouquet.cjs`) ; règles de la base sur l'émulateur officiel de Firebase (`regles.cjs`). |
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
node tests/listes-calculees.cjs
node tests/magasin.cjs
node tests/couleurs.cjs
node tests/filtre.cjs
node tests/fleches.cjs
node tests/aromatiques.cjs
node tests/tri-ordinateur.cjs
node tests/caisse-bleue.cjs
node tests/miniatures.cjs
node tests/animation-coche.cjs
node tests/jours-recolte.cjs
node tests/ordre-habituel.cjs
node tests/historique.cjs
node tests/endives-sur-place.cjs
node tests/celeri-bouquet.cjs
```

`tests/endives-sur-place.cjs` vérifie, sur un téléphone et un ordinateur, que les caisses d'endives ne comptent pas dans le cadre « Caisses » (tuiles et total) mais sont nommées dessous, que la ligne de l'endive garde sa quantité, que le total ne bouge pas quand on les coche, qu'une autre ferme sans le réglage les compte comme avant, et que la semaine n'est pas réécrite.

`tests/celeri-bouquet.cjs` vérifie, sur un téléphone, que « Céleri-branche en bouquet » est un produit à part (identifiant `celeri-branche-en-bouquet`) en grande basse de 10 bouquets, avec le dessin du céleri-branche, que le céleri-branche au kilo et ses quantités restent tels quels, et que, dans Récolte et Préparation, il part en GB pour les débouchés en caisses plastiques et en grand colis bois pour ceux en colis bois.

`tests/historique.cjs` vérifie la page « Historique » avec un téléphone et un ordinateur : bouton dans l'onglet Semaine, visible sans défiler ; semaines passées dans l'ordre, la semaine prochaine absente, toutes repliées, et seuls les noms des jours et semaines lus à l'ouverture (lecture « shallow ») ; une semaine dépliée lit son jour et montre le résumé (« 2 produits récoltés sur 3 · 16 kg »), les produits dans l'ordre de la coche avec qui et l'heure, « Pas coché », la préparation ; semaine sans coche ; liste en fichier du 4/11 reprise ; « Ouvrir la liste de ce jour » et « Voir la répartition » ; sans réseau, l'historique déjà lu avec un avertissement, puis « Réessayer » ; pas de défilement de côté ; la base identique du début à la fin.

`tests/ordre-habituel.cjs` vérifie l'ordre de récolte habituel avec un ordinateur et un téléphone, sur deux semaines à venir : sans ordre habituel, l'ordre alphabétique d'avant et rien d'écrit ; bouton là sur les deux, en bas de la liste à récolter, assez grand pour le doigt ; ranger la liste n'écrit pas l'ordre habituel, le clic l'écrit (prénom et heure) ; un jour pas encore trié le prend tout seul, sur l'autre appareil aussi, les nouveaux produits à la fin et nommés ; la semaine suivante s'ouvre dans cet ordre ; un jour déjà trié garde son ordre, inchangé dans la base ; enregistrer depuis une liste plus courte garde la place des produits absents ; hors ligne, « 1 changement en attente » puis envoi au retour du réseau ; fusion des ordres cas par cas ; semaines non touchées.

`tests/jours-recolte.cjs` vérifie la page « À récolter » avec un téléphone et un ordinateur : boutons « Nouveau jour de récolte » et « Régler les jours habituels » en haut, visibles sans défiler ; jours repliés, une ligne chacun avec « N produits à récolter » ou « Rien à récolter » ; la flèche déplie un seul jour, un second toucher le replie ; le menu « Quel jour de récolte créer ? » propose les seuls jours libres, « Annuler » ne crée rien, choisir « Jeudi » crée le jeudi (pas le mardi), déplié ; semaine aux sept jours sans bouton « Nouveau » ; déplier, replier et le menu n'écrivent rien dans la base.

`tests/animation-coche.cjs` vérifie l'animation de la coche dans l'onglet Récolte, avec deux téléphones et un ordinateur : ligne cochée encore à sa place et en vert plein 0,5 s et 1,9 s après, partie dans « Récoltes déjà effectuées » à 3,3 s, coche enregistrée et compteur à jour tout de suite, rien d'animé sur l'autre téléphone, animation pas relancée par une coche reçue entre-temps, second toucher qui décoche, deux coches coup sur coup, pas de glisser-déposer sur une ligne en animation, ordinateur (lignes compactes, case qui ne saute pas).

`tests/caisse-bleue.cjs` vérifie la caisse bleue avec un téléphone et un ordinateur : référentiel (caisse CB, carotte lavée en PH de 8 kg avec CB de 16 kg en plus, récoltée en CB), semaine saisie avant le changement complétée sans rien écrire, liste de récolte « 5 PH + 1 CB » (56 kg), cadre « Caisses » à 4 CB (avec ou sans « une caisse par circuit »), Préparation client par client (CB, PH, colis bois), bouton et menu d'unité PH, CB, kg, saisie « 2 caisses bleues », refus de « 1 GH », conversion CB → PH → kg, page « À récolter », fiche copiée par « Ajouter un produit ».

`tests/couleurs.cjs` vérifie la couleur des débouchés avec un téléphone et un ordinateur : palette lisible sur fond blanc (contraste d'au moins 7), une couleur différente pour chaque débouché de départ, une fiche gardée dans la base avant les couleurs qui reprend celles du départ (et la première couleur libre pour un débouché inconnu du départ), rien d'écrit avant un choix, choix partagé et gardé, les autres débouchés qui gardent la leur, nouveau débouché avec une couleur libre, et dans la page « Répartir » (grille, fiches du téléphone, page Cumul) titre, chiffre et unité de chaque débouché dans sa couleur.

`tests/filtre.cjs` vérifie le bouton « Filtre » et l'impression avec un téléphone et un ordinateur : bouton fermé au départ qui dit « tout affiché », assez grand pour le doigt ; cadre avec une case par jour de récolte de la semaine (et une pour les livraisons sans jour) et une case par débouché (ordre des réglages, couleur du débouché, livraisons et stock rappelés), toutes cochées ; un jour décoché masque ses colonnes dans Répartir (fiches et grille) et Cumul, et le stock d'un débouché dont toutes les livraisons sont masquées ; un débouché décoché masque toutes ses livraisons et son stock ; jours et débouchés se combinent ; reste inchangé, note des colonnes masquées, avertissement pour un débouché masqué qui a des quantités, rien d'écrit dans la base, choix propre à chaque appareil et gardé au rechargement ; « Tout afficher » et « Fermer » ; une autre ferme sans jours de récolte n'a que ses débouchés ; bouton « Imprimer » : feuille qui suit le filtre, titre, récoltes imprimées et débouchés masqués, seul le tableau à l'impression, couleurs gardées, PDF en paysage.

`tests/fleches.cjs` vérifie les flèches du clavier dans la grille « Répartir » de l'ordinateur : gauche et droite passent à la case d'à côté quand le curseur est au bord du texte (sinon il bouge dans la case), rien au bout de la ligne, Maj + flèche sélectionne ; ce qu'on tape est enregistré en changeant de case ; haut et bas restent dans la colonne ; les colonnes masquées par le filtre sont sautées ; le menu d'unité garde ses flèches et le curseur y reste. Données factices seulement.

`tests/tri-ordinateur.cjs` vérifie le tri de l'onglet Récolte sur ordinateur (fenêtre de 1366 × 768 avec souris) : lignes d'environ 48 px, poignée à gauche, boutons de tri visibles au survol seulement et désactivés aux bouts, tout en haut et tout en bas, monter et descendre plusieurs fois sans bouger la souris (la ligne reste dessous), glisser par la poignée sans attendre, ordre enregistré et reçu par un second ordinateur, filtre de circuit, accès au clavier ; puis qu'un téléphone et une fenêtre de 900 px gardent l'affichage du téléphone (lignes hautes, appui long, ni poignée ni boutons).

`tests/regles.cjs` demande en plus l'émulateur officiel de Firebase (`npm install --no-save firebase-tools`, Java), lancé à part : voir l'en-tête du fichier. Sans émulateur, il dit « NON LANCÉ ».

Le test ouvre deux téléphones simulés (François et Aurore) reliés à un faux Firebase local (`tests/faux-firebase.cjs`) et vérifie : la coche passe d'un téléphone à l'autre avec le prénom, la ligne cochée quitte la liste principale, le glisser-déposer au doigt est partagé, le nombre de caisses et de colis bois (par circuit et regroupés), l'absence de l'onglet Détail (supprimé le 09/11/2026 ; un téléphone resté dessus rouvre sur Récolte), la flèche de répartition par client (colisage et poids, colis bois compris), les filtres Locavore et Ferme Deschamps, le décochage, la barre de progression (globale, unités, kilos, mise à jour d'un téléphone à l'autre), l'onglet Préparation (tri par client et par produit, indicateur de récolte, coches de lignes et de clients partagées et gardées après rechargement, sans toucher aux coches de récolte), et l'absence d'erreur JavaScript. Il sort en erreur si une vérification échoue.

`tests/semaine.cjs` vérifie l'onglet Semaine avec deux téléphones et un ordinateur (grille : largeur, Tab et Entrée, « tout » tapé, unité refusée, menu d'unité de chaque case, reste 03 → 63 tapé puis vidé, saisie gardée pendant un changement venu d'un téléphone, retour aux fiches en fenêtre étroite) : ajout de produits partagé, reste en colis et en kilos ou bottes, couleurs, unités tapées ou converties (et refusées si le produit ne se compte pas ainsi), « tout » unique par produit, reste Auvabio 03 → 63 calculé, modifié puis remis au calcul, hors du reste, tableau, hors ligne, semaines séparées, reprise des produits de la semaine précédente, retrait d'un produit, rechargement, et que la liste de récolte de la base n'est pas touchée.

`tests/listes-calculees.cjs` vérifie l'étape 13D avec deux téléphones : « Le cumul de cette semaine est vide » (Récolte et Préparation) ; la liste du 4/11 refaite par l'outil dans une semaine et comparée ligne à ligne au fichier (19 lignes sur 22, total et kilos identiques ; les trois autres mêlent deux unités pour un même produit, ce que la semaine ne porte pas) ; un circuit par débouché, colis bois ; le menu des jours de récolte et le jour ouvert par défaut ; « Rien à récolter ce jour-là » ; la liste figée à la première coche, les écarts signalés sur la ligne et dans l'encadré, « Mettre la liste à jour » ; la Préparation qui suit le même jour ; dans la page « À récolter », jour ajouté avec ses livraisons proposées, livraison déplacée d'un jour à l'autre, « Chaque semaine » coché puis décoché (rien d'effacé, rien de copié à l'avance), jour retiré pour une semaine ; « Aucun jour de récolte cette semaine » ; la liste en fichier du 4/11 qui l'emporte pour sa date ; une coche faite hors ligne qui part dans la bonne liste après un changement de jour ; et que ni les quantités de la semaine ni la liste du 4/11 ne bougent. Les quatre autres tests ouvrent la liste du 4/11 par `?liste=2026-11-04`.

`tests/magasin.cjs` vérifie la page du magasin et son effet côté ferme (faux Firebase qui imite les nouvelles règles) : avant leur publication, la ferme reste « Partagé » et le magasin est prévenu ; connexion puis « Qui saisit ? » obligatoire, prénom remis en forme et sans doublon, proposé sur un autre téléphone ; saisie en kilos et en caisses avec prénom, heure et journal ; texte refusé ; le compte du magasin refusé pour les listes, le journal, un autre magasin, les profils ; deuxième téléphone en direct ; la ferme voit le stock (page Stock, Cumul, grille de l'ordinateur), l'aide de la semaine d'avant, « Qui a saisi » ; la dernière saisie l'emporte dans les deux sens ; case vidée par la ferme ; saisie hors ligne envoyée au retour ; comptes de la ferme et sans profil sur la page du magasin ; déconnexion.

`tests/connexion.cjs` vérifie la base fermée par des comptes (faux Firebase qui imite les règles et la connexion) : fenêtre « Se connecter » au premier lancement, qui ne se ferme pas sans connexion, aucun appel à la base avant ; mauvais mot de passe ; identifiant court ; mot de passe jamais gardé ; deux téléphones qui partagent leurs coches ; connexion gardée après rechargement ; Semaine et débouchés avec le jeton ; jeton expiré renouvelé tout seul ; coche faite hors ligne envoyée malgré un jeton expiré pendant la coupure ; compte sans profil refusé, puis accepté dès que le profil est donné ; déconnexion ; compte supprimé ; clé web fausse.

`tests/regles.cjs` vérifie `docs/regles-base/fermees.json` sur l'émulateur officiel : syntaxe acceptée ; sans compte, tout refusé (lecture, écriture, flux, racine) ; compte sans profil refusé et incapable de se donner le profil ; compte « ferme » qui lit et écrit listes, semaines et débouchés mais ne touche pas aux profils ; puis l'appli branchée sur l'émulateur (connexion, coches, compte sans accès).

`tests/debouches.cjs` vérifie l'écran « Débouchés et livraisons » avec deux téléphones et un ordinateur : les 7 débouchés de départ repris (jours, colis, Auvabio 63 qui reprend la 03), rien d'écrit dans la base avant une modification, jour obligatoire, changement de jour partagé et colonnes de la semaine rangées en conséquence, nouveau débouché (nom et jour obligatoires), seconde livraison avec reste reporté, retrait gardé puis remis, ordre, colonne gardée quand elle a des quantités, semaine passée inchangée, fiches sur deux colonnes à l'ordinateur, jours de récolte (départ, une livraison par jour, ajout, récolte après livraison signalée, retrait, cadre « À récolter » de la semaine), stock chez Très Allier (saisi, partagé, hors du reste, « tout » refusé, case gardée si le suivi est décoché ; page Stock avec ce qui est prévu, saisie et bouton +, chaque stock juste avant les livraisons de son débouché, un bloc par débouché suivi), hors ligne, rechargement, et que quantités et liste de récolte ne sont pas touchées.

## Limites connues

- **Dépôt public, base fermée** : depuis le 8/11/2026 (étape 5), la base n'est ouverte qu'aux comptes avec le profil « ferme » ; les listes du dépôt (`listes/*.json`) restent publiques, comme le site.
- **Deux personnes qui glissent en même temps** : le dernier ordre envoyé gagne. De même pour l'ordre habituel enregistré au même moment sur deux appareils.
- **Ordre habituel et liste en cours** : un jour pas encore trié suit l'ordre habituel ; si quelqu'un enregistre un nouvel ordre habituel pendant la récolte de ce jour, ses lignes se réordonnent (les coches restent). Le trier une fois le fixe.
- **Liste figée** (étape 13D) : si deux téléphones font la toute première coche d'une liste au même moment, la dernière liste figée envoyée gagne (même contenu, sauf si la semaine a changé entre les deux). Une semaine passée garde ses jours de récolte habituels seulement si elle a été modifiée au moins une fois (copie prise à la première modification, comme ses colonnes).
- **Glisser-déposer à la souris** sur ordinateur : prévu pour le doigt, la souris n'a été testée qu'en simulation tactile.
- **Lieu des récoltes masqué** (depuis le 04/11/2026) : l'emplacement et les zones (Tunnel, Plein champ, Stock) étaient recopiés à la main depuis l'assolement, sans lien avec Ouvre ta ferme. Ils restent dans les listes mais ne s'affichent plus. Pour les réafficher : `var MONTRER_LIEU = true;` dans `index.html` (et changer `CACHE` dans `sw.js`).
