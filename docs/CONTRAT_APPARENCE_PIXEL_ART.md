# Contrat : choisir l'apparence, classique ou pixel art (Cumul)

*Étape 48 de la feuille de route. Rédigé le 22/11/2026, **avant tout code**, en Opus 5.5 · Élevé (exigence de François pour ce contrat). Contrat jumeau pour Farm tasks : `docs/CONTRAT_APPARENCE_PIXEL_ART.md` du dépôt `aurore-task` (étape 53 là-bas). Les deux contrats ont les mêmes règles ; seul ce qui est propre à chaque appli diffère.*

**Demande de François (22/11/2026, 13 h 38) :** « Est-ce que ce serait faisable d'avoir, en fait, dans les réglages du cumul et aussi dans les réglages de task, la possibilité d'avoir soit l'apparence actuelle, donc qui est inspirée du logiciel Ouvre ta ferme, avec une charte spécifique, soit l'apparence en pixel art ? » Puis (13 h 39) : rédiger le contrat seulement une fois la maquette du Cumul validée, ce qu'il a fait à 13 h 51.

**État : à confirmer par François (quatre points, partie 9). Aucun code n'est écrit.**

**Références validées par François** (fichiers du projet, pas dans ce dépôt) :
- `maquette-pixel-art/cumul-v3/` : maquette du Cumul validée le 22/11/2026 à 13 h 51, **écarts compris** (`maquette-cumul-v3.pdf`, captures 1 à 7, `NOTE-ECARTS.md`, `sources/`).
- `maquette-pixel-art/farm-tasks-v3/` : la charte de départ, validée pour Farm tasks le 21/11/2026 à 22 h 45 (`CHARTE-PIXEL-ART.md`).

L'annexe A recopie ici toutes les valeurs de la charte et les dix écarts propres au Cumul : **ce dépôt fait foi**, pas la copie des fichiers du projet.

---

## 1. En une phrase

Dans les Réglages, une page **« Apparence »** propose deux choix, **Classique** (la charte douce d'aujourd'hui, inchangée) et **Pixel art** (la maquette validée). Le choix s'applique tout de suite, ne vaut que pour cet appareil, et ne change **que l'habillage** : mêmes pages, mêmes boutons au même endroit, mêmes gestes, mêmes données.

## 2. Ce que veulent dire « classique » et « pixel art »

- **Classique** : la charte douce (étape 42, la même que le module d'irrigation d'Ouvre ta ferme), telle qu'elle est en ligne le 22/11/2026 : jetons de `:root`, bloc `CHARTE-DOUCE-DEBUT` … `CHARTE-DOUCE-FIN`, `tests/charte.cjs`. Elle ne change pas d'un point : c'est la règle R6.
- **Pixel art** : la charte validée pour Farm tasks le 21/11, appliquée au Cumul avec dix écarts validés le 22/11 (annexe A) : fond de ferme au coucher du soleil en gros pixels, barres brun foncé à filet orange, blocs en « cartes » à cadre de pixels et haut rose, polices Press Start 2P et VT323, logo « cagette de légumes » en pixels, petits dessins de légumes passés en pixels.

## 3. Règles (comportement voulu)

**R1. Où se fait le choix.** Dans l'onglet Réglages, une quatrième page **« Apparence »**, à côté de Débouchés, Jours de récolte et Compte, **toujours visible** (même sans compte). Elle porte la phrase « Ce choix ne vaut que pour cet appareil. Les autres gardent le leur. » et deux gros boutons : **Classique** et **Pixel art**, chacun avec une petite vignette de l'apparence (image fixe, quelques Ko). Le bouton choisi est marqué (`aria-pressed`). Sur un téléphone de 360 points, les quatre pastilles de pages des Réglages restent lisibles (sur deux lignes s'il le faut), sans texte coupé.

**R2. Effet immédiat.** Toucher un des deux boutons change l'apparence tout de suite et la garde sur l'appareil, sans recharger la page ni rien enregistrer d'autre. Rien n'est perdu au changement : page, semaine et jour choisis, filtre, position.

**R3. Un choix par appareil, et par appli.** Le choix est gardé dans la mémoire du navigateur sous la clé **`recolte.apparence`** (`"classique"` ou `"pixel"`). Il n'est **jamais** écrit dans la base : rien sous `listes/`, `magasins/` ni ailleurs, rien dans la sauvegarde de chaque nuit, aucune règle de base à changer. Il ne suit pas la personne : Aurore garde le classique sur son téléphone même si François passe en pixel art sur le sien. Farm tasks a son propre choix (autre adresse, donc autre mémoire) : choisir ici ne change pas Farm tasks, et inversement. *(Point 1 de la partie 9.)*

**R4. Par défaut : classique.** Un appareil qui n'a jamais choisi, ou dont la mémoire a été effacée, est en classique. Le jour de la mise en ligne, personne ne voit de changement tant qu'il n'a pas choisi. Une valeur inconnue dans la clé vaut classique.

**R5. Pas d'éclair au démarrage.** Un très court script en tête de page lit la clé et pose `data-apparence="pixel"` sur `<html>` avant le premier affichage.

**R6. Le classique ne change pas d'un point.** Toutes les règles de style du pixel art sont dans **un seul bloc** de `index.html`, entre les marques `PIXEL-ART-DEBUT` et `PIXEL-ART-FIN`, placé après `CHARTE-DOUCE-FIN`, et chacune commence par `:root[data-apparence="pixel"]`. En dehors de ce bloc, le code ne change que pour : le script de tête (R5), la page « Apparence » (R1), la couleur de la barre du navigateur (R17), les miniatures (R10), le rangement des signes que les polices pixel n'ont pas (R11), et les deux petits éléments que demandent les écarts validés (annexe A, écarts 2 et 3), **cachés en classique**. Les blocs recopiés à l'identique dans `magasin.html` (`CLOCHE-DEBUT` … `CLOCHE-FIN`, `ESPECE_AUSSI`, la connexion) ne sont pas touchés : l'habillage de la cloche se fait dans le bloc pixel art. Vérification : les captures de l'apparence classique sont **identiques au point près** avant et après le changement (partie 6, test T2).

**R7. Un habillage, rien d'autre.** Même page, mêmes éléments, mêmes boutons au même endroit, même ordre. Gestes gardés tels quels : cocher et son animation, « Annuler », appui long de 0,45 s pour glisser sur le téléphone (sans poignée), poignée et boutons de tri au survol sur l'ordinateur, flèche de répartition par client, « ⋯ » d'annulation, saisie dans la grille et dans le stock, glisser des jours. Aucune écriture de plus dans la base, **aucun flux en direct de plus** (il en reste au plus quatre). Le code ne regarde pas l'apparence pour agir : seules exceptions permises, poser l'attribut (R5), la barre du navigateur (R17), les miniatures (R10) et le facteur d'agrandissement du fond (annexe A, A1).

**R8. Fidèle à la maquette validée.** Les écrans de la maquette (ordinateur, Semaine → Répartir, haut et bas de la grille ; téléphone, Récolte haut et liste, Préparation par client, Stock ; logo) doivent ressembler aux captures `cumul-v3` : mêmes couleurs exactes (annexe A), mêmes cadres, mêmes polices et tailles, même logo, **écarts validés compris**. Les positions peuvent bouger de quelques points. Un écart visible se signale à François avec une capture, il ne se tranche pas seul.

**R9. Les écrans que la maquette ne montre pas** suivent la charte « par analogie » (annexe A, A9) : Semaine → Cumul et À récolter (téléphone et ordinateur), Stock sur l'ordinateur, Historique des semaines, Commandes à valider, Préparation par produit, Récolte et Préparation sur l'ordinateur (lignes compactes, poignée), Réglages (Débouchés et leurs couleurs, Jours de récolte, Compte, Apparence), fenêtres (Qui récolte ?, Connexion, Ajouter un produit, Modifier le cumul, Annuler une récolte, Notifications), cloche, ordre habituel, légende, filtre, messages d'attention, écrans vides, récolte annulée, barre de progression et caisses. **Chacun est montré à François en capture (téléphone et ordinateur) avant la fusion.**

**R10. Petits dessins de légumes en pixels** (écart 1, validé). En pixel art, chaque miniature est le même dessin d'Ouvre ta ferme réduit à une petite grille (14 × 14 sur le téléphone, 16 × 16 sur l'ordinateur), sans demi-transparence, avec un contour brun `#3a2016` d'un pixel, agrandi sans lissage, comme dans la maquette (`sources/mini-px.cjs`).
- `especes/plants.svg` et `especes/modifies.svg` **ne sont pas modifiés** et aucun fichier dérivé n'est ajouté au dépôt : la version en pixels est **calculée sur l'appareil** au moment de l'affichage, une fois par espèce, puis gardée en mémoire le temps de la visite. Raison : ces dessins sont sous licence AGPL-3.0 (`especes/LISEZMOI.md`) ; ne rien recopier évite d'ajouter un fichier dérivé à décrire et à tenir à jour.
- `miniHtml(nom)` reste la seule entrée pour afficher une miniature ; l'espèce montrée reste lisible dans la page (le test des miniatures vérifie le bon dessin dans les deux apparences).
- Repasser en classique remet les dessins d'origine.

**R11. Polices et signes.** Press Start 2P (titres) et VT323 (texte), licence SIL OFL 1.1, **hébergées dans `polices/`**, jamais chargées d'un autre site, gardées hors ligne. Elles ne sont téléchargées que par un appareil en pixel art. Mesuré le 22/11 : elles ont tous les accents du français, « œ », « « » », « ’ », « … », mais **pas** `⋯ ＋ ▲ ▼ ▴ ▾ →` ni, pour Press Start 2P, `−`. Ces signes, présents dans le Cumul (« ⋯ », « ＋ » des boutons d'ajout, « − » du stock, flèches de tri), doivent être **dessinés en petites icônes en pixels** ou **pris exprès dans la police classique de l'interface** (DM Sans), jamais laissés au hasard d'une police du système. Les trois polices de la charte douce restent déclarées à l'identique dans `index.html` et `magasin.html` ; le test `charte.cjs` qui compare les polices des deux pages est adapté pour ne comparer que celles-là (les deux nouvelles ne sont déclarées que dans le bloc pixel art d'`index.html`, sauf réponse contraire au point 3).

**R12. Lisibilité et accessibilité.**
- Tailles : noms de produits et quantités en VT323 de **23 points sur le téléphone** ; dans la grille de l'ordinateur, **21 points** (écart 8, les chiffres doivent se lire vite) ; aucun texte de l'interface en VT323 sous 18 points sur le téléphone. La règle de la charte douce (« noms de produits, quantités et boutons au moins 16 points ») reste vraie.
- **La grille Répartir tient en entier sur un écran de 1366 points**, sans défilement de côté, comme aujourd'hui (`tests/semaine.cjs`). Si ce n'est pas le cas avec 21 points, on prend la plus grande taille qui tient et on le montre à François.
- Zones à toucher : au moins 44 × 44 points sur le téléphone, comme en classique (cases de récolte et de préparation, « ⋯ », flèches, « + » et « − » du stock, pastilles).
- Contraste mesuré (rapport WCAG) : texte ordinaire au moins 4,5 ; gros titres et icônes au moins 3. Mesures faites sur la charte : texte `#3b2a2f` sur crème 12,4 ; quantité bleue `#1e5f86` 6,4 ; texte secondaire `#7a5a46` 5,7 ; boutons blancs sur rose foncé `#a8406f` 5,8 ; étiquettes « Récolté » `#2f6a3e` sur `#dcefd8` 5,3, « Pas encore récolté » `#8a4a10` sur `#fbe0c0` 5,4, « annulée » `#8a2a1e` sur `#f8d8d0` 6,5 ; barre `#fff3e0` sur brun 13,2. **À surveiller** : le titre blanc sur le haut rose `#e0709f` ne fait que 3,0 seul ; c'est son **contour `#8a2a5a`, obligatoire**, qui le rend lisible. Les textes posés sur le fond (écart 7) gardent toujours leur contour brun.
- Le bleu reste réservé aux quantités et à l'eau : **jamais de bleu sur un bouton**, en pixel art comme en classique.
- Au champ (soleil, gants) : **non vérifié** ; c'est l'essai de François sur son téléphone. VT323 est plus fine que DM Sans.

**R13. L'impression reste sobre.** L'impression de la grille (« Imprimer », page Répartir, `#semPrint`) est **toujours en classique**, quelle que soit l'apparence : mêmes polices, mêmes couleurs, couleurs des débouchés gardées, pas de fond. Vérification : même texte (`pdftotext`) et mêmes polices dans le PDF (`pdffonts`) en classique et en pixel art.

**R14. Hors ligne.** Tous les nouveaux fichiers (fond, cadre, logo, icônes, deux polices) sont servis par le site et ajoutés à la liste `SHELL` de `sw.js`, et `CACHE` change. Un appareil qui a ouvert le Cumul une fois avec le réseau peut passer en pixel art **sans réseau**. Poids ajouté : environ 350 Ko, gardé une fois sur chaque appareil, même resté en classique. Aucune requête vers un autre site (test).

**R15. Ordinateur.** Menu de gauche de 200 points en pixel art (écart 10 ; 184 en classique), crème jusqu'à environ 70 % puis fondu ; logo de 64 points et « Cumul » dessous ; la colonne des produits de la grille reste collée au menu sans passer dessous. Lignes compactes, poignée et tri au survol de la Récolte inchangés.

**R16. Téléphone.** La barre du haut part avec la page quand on descend, comme aujourd'hui (écart 9) ; logo de 32 points. Barre du bas à quatre pages, page choisie en rose.

**R17. Plusieurs fermes.** Rien de propre à une ferme : noms et couleurs des débouchés (Réglages), produits, caisses, jours de récolte, nom de la ferme viennent des données et du référentiel, comme en classique. Le fond est **le même décor pour toutes les fermes**, dans un seul fichier facile à remplacer (`apparence/`). Les couleurs des débouchés (`--dc`) et des caisses (PB, PH, GB, GH) gardent leur sens ; elles sont posées sur crème au lieu de blanc.

**R18. Icône, onglet et barre du navigateur.** L'icône installée, l'icône d'onglet et celle des notifications **restent la cagette actuelle** : elles sont communes à tous les appareils (manifeste, fichiers d'icônes). Dans l'appli, en pixel art, le logo est la cagette en pixels. La couleur de la barre du navigateur sur le téléphone (`theme-color`) passe au brun `#3a2420` en pixel art et revient à `#373737` en classique.

**R19. La page du magasin** (`magasin.html`, employés des magasins) **reste en classique** dans cette étape. *(Point 3 de la partie 9.)*

**R20. Aucune donnée touchée.** Pas de migration, pas d'écriture dans la base, pas de sauvegarde à faire avant. Rien à publier dans la console Firebase, rien sur Cloudflare.

## 4. Ce qui ne change pas

Les données et la base ; les règles de la base ; les calculs (cumul, reste, caisses, listes calculées, portions) ; les gestes ; la place et l'ordre de chaque bouton ; le nombre de flux en direct ; la cloche et ses relectures ; la page du magasin ; l'impression ; l'adresse, le nom, l'icône installée ; le comportement hors ligne ; l'apparence classique.

## 5. Fichiers prévus

| Fichier | Changement |
|---|---|
| `index.html` | Script de tête (R5) ; bloc `PIXEL-ART-DEBUT` … `PIXEL-ART-FIN` après `CHARTE-DOUCE-FIN` ; page « Apparence » des Réglages et quelques lignes pour la gérer ; miniatures en pixels (R10) ; signes de R11 ; titre « À récolter » et compteurs du haut rose (écarts 2 et 3, cachés en classique) ; `theme-color` (R18). Toujours un seul fichier, sans bibliothèque ni étape de construction. |
| `magasin.html` | **Aucun changement** (R19). |
| `apparence/` (nouveau) | `fond-ordinateur.png` (480 × 270, 64 couleurs) et `fond-telephone.png` (195 × 422), repris tels quels de la maquette ; `cadre-carte.png` (image du cadre découpée en 9 morceaux, ombre comprise) ; `logo-pixel.png` (32 × 32) ; icônes des signes de R11 ; vignettes des deux apparences pour R1 ; `LISEZMOI.md` (provenance et licence de chaque image, dont le fond : point 2 de la partie 9) ; `fabriquer-cadre.cjs` (refait le cadre à partir des couleurs de l'annexe A). |
| `polices/` | `press-start-2p.woff2`, `vt323.woff2` (jeu « latin », copiés sans modification, même source que les trois autres) ; `LISEZMOI.md` et `OFL.txt` complétés (auteurs : Codeman38 pour Press Start 2P ; Peter Hull pour VT323). |
| `sw.js` | Nouveaux fichiers dans `SHELL`, `CACHE` changé. |
| `tests/apparence.cjs` (nouveau) | Tests T1 à T13 (partie 6). |
| Tests existants | Une variable `APPARENCE=pixel` fait tourner chaque test dans l'apparence pixel art (T3) ; `charte.cjs` adapté (R11). |
| `README.md`, `AGENTS.md`, registres | Mis à jour dans la même PR. |

## 6. Tests à prévoir (chacun relié à une règle)

- **T1 (R3, R4, R20)** : appareil neuf → classique, aucun attribut sur `<html>`. Choisir « Pixel art » dans Réglages → Apparence → attribut posé, clé `recolte.apparence` = `"pixel"`, **aucune écriture** reçue par la fausse base (aucun PUT, PATCH ni DELETE de plus dans le journal des appels du faux Firebase). Recharger → toujours pixel art. Revenir à « Classique » → attribut retiré. Valeur inconnue → classique. Sans compte (pas de clé web) : la page Apparence est là et marche.
- **T2 (R6)** : captures de l'apparence classique (téléphone 390 × 844 : Semaine, Récolte, Préparation par client et par produit, Stock, Réglages ; ordinateur 1366 × 768 et 1920 × 1080 : Répartir, Récolte, Préparation), faites sur `main` puis sur la branche, avec les mêmes données inventées et la même heure figée : **0 point différent** (seule exception : la quatrième pastille des Réglages). `tests/charte.cjs` passe sans changement de ses vérifications d'aspect.
- **T3 (R7)** : **tous les tests de `AGENTS.md` passent aussi avec `APPARENCE=pixel`**, sauf les vérifications d'aspect propres à la charte douce (`charte.cjs`, tailles et couleurs mesurées ailleurs), marquées comme telles et remplacées par leur équivalent pixel art dans `apparence.cjs`. La liste des vérifications sautées est collée dans la PR.
- **T4 (R5)** : au premier affichage, `<html>` a déjà `data-apparence="pixel"`.
- **T5 (R8, annexe A)** : en pixel art, couleurs et tailles calculées par le navigateur : barre `#3a2420` à filet `#f08a3c` ; haut des cartes `#e0709f` ; titres blancs à contour `#8a2a5a` ; intérieur `#fff4e4` ; bouton « Ajouter un produit » et « + »/« − » du stock en rose ; produits 23 points (téléphone) et grille 21 points (ordinateur) en VT323 ; cadre posé par `border-image` ; page choisie en rose ; polices chargées depuis le site.
- **T6 (R10)** : en pixel art, chaque miniature montre l'espèce attendue (`miniatures.cjs` dans les deux apparences), dessinée sur une grille de 14 ou 16 pixels sans demi-transparence ; `plants.svg` et `modifies.svg` gardent leur empreinte (SHA-256 de `especes/LISEZMOI.md`) ; aucun nouveau fichier dans `especes/`.
- **T7 (R11)** : `document.fonts.check` vrai pour les deux polices ; aucun signe de R11 affiché dans une police du système.
- **T8 (R12)** : grille Répartir entière sur 1366 points en pixel art ; contrastes calculés sur les couleurs réelles (liste collée dans la PR) ; zones à toucher d'au moins 44 points sur le téléphone ; aucun bouton bleu.
- **T9 (R13)** : impression de la grille en pixel art et en classique : même texte (`pdftotext`) et mêmes polices (`pdffonts` : ni Press Start 2P ni VT323).
- **T10 (R14)** : chaque nouveau fichier est dans `SHELL` ; `CACHE` différent de `main` ; aucune requête vers un autre domaine que le site et la base, dans les deux apparences ; service worker actif et réseau coupé : passer en pixel art affiche fond et polices.
- **T11 (performance)** : processeur ralenti 4 fois : affichage de la page Répartir avec 40 produits et 12 débouchés, et de la Récolte avec 30 produits : pas plus de 20 % plus lent qu'en classique ; aucun filtre graphique (`filter`, `backdrop-filter`) sur un élément qui défile ; miniatures en pixels calculées une seule fois par espèce.
- **T12 (R2)** : changer d'apparence garde la page, la semaine, le jour et le filtre choisis.
- **T13 (R19)** : `magasin.html` identique à `main` (empreinte du fichier) et en classique même si `recolte.apparence` vaut `"pixel"` sur l'appareil.

Avant d'ouvrir la PR : tous les tests de `AGENTS.md`, dans les deux apparences, sorties réelles collées.

## 7. Ce qui restera non vérifié après le code

Les vrais téléphones (soleil, gants, iPhone), Firefox et Edge, l'écran de François, la page du magasin chez les employés (inchangée). Ils seront dits « non vérifiés » dans le compte rendu, et François essaie sur ses appareils.

## 8. Découpage et réglage

- **Étape 48, une seule PR de code** pour le Cumul, en **Opus 5.5 · Élevé**, après celle de Farm tasks si François suit la recommandation du point 4 (le cadre, les polices et le hors ligne y auront été réglés ; on reprend les mêmes fichiers d'`apparence/`). Jamais en même temps (un seul fil de code à la fois).
- La PR montre à François les captures des écrans de la maquette et de ceux de R9, téléphone et ordinateur. **Elle n'est fusionnée qu'après son accord sur ces captures.**
- Après fusion : vérifier le déploiement (contrôle Cloudflare du commit de `main`) avant de dire que c'est en ligne. Rien à faire sur l'hébergeur.

## 9. Points à confirmer par François

1. **Le choix vaut pour un appareil** (pas pour une personne, ni pour toute la ferme), et chaque appli a le sien. Recommandation : oui. Raisons : Aurore et Martin gardent le classique s'ils veulent, rien n'est écrit dans la base, ça marche sans réseau.
2. **L'image du fond** (la ferme japonaise au coucher du soleil, fournie par François) va dans un dépôt **public** : il faut savoir d'où elle vient. Recommandation : si François l'a faite lui-même (photo, dessin ou outil d'image), on la publie et `apparence/LISEZMOI.md` le dit ; si elle vient d'un site, on ne la publie pas et on en fait une autre avant le code.
3. **La page du magasin reste en classique** pour cette étape. Recommandation : oui. Raisons : elle sert aux employés des magasins, elle n'a pas de Réglages, la maquette ne la montre pas ; on pourra l'habiller plus tard si François le demande.
4. **L'ordre** : recommandation, **Farm tasks d'abord**, puis le Cumul.

---

## Annexe A : la charte pixel art (valeurs à respecter)

Recopiée de `CHARTE-PIXEL-ART.md` (validée le 21/11/2026) et de `NOTE-ECARTS.md` (validée le 22/11/2026), complétée par ce que montrent les captures et `sources/skin-cumul.css`, `carte-cumul.cjs`, `mini-px.cjs`.

**A1. Le fond.** Image de François convertie en vrai pixel art, **64 couleurs, sans tramage** (le même fichier que Farm tasks). Ordinateur : 480 × 270 pixels, agrandie **4 fois sans lissage** pour 1920 × 1080. Téléphone : 195 × 422, agrandie **2 fois**. Toujours un facteur **entier** : pour une autre taille d'écran, le plus petit facteur entier qui couvre la fenêtre, centré ; le reste, s'il y en a, en `#2a1810`. Le fond ne bouge pas quand on fait défiler : il est posé sur un calque fixe (pas `background-attachment: fixed`, qu'iPhone ne sait pas faire).

**A2. Barres.** Barre du haut (téléphone) et barre du bas brun foncé `#3a2420`, filet orange `#f08a3c` de 4 points, ombre `#2a1810`. Nom de l'appli en Press Start 2P 13 points crème `#fff3e0`. Pastille « Partagé » : point carré vert `#6fd08a`. Pastille de la personne : rose `#e0709f`, texte blanc, marches `#f8b4d0` / `#a8406f`. Pages de la barre du bas en VT323 19 points `#e8d8c8`, icônes sans lissage ; page choisie sur rose, texte blanc, marches roses.

**A3. Menu de gauche (ordinateur).** 200 points (écart 10). Crème `rgba(255,246,232,.95)` jusqu'à environ 70 %, fondu jusqu'à 0 vers 78 %, bord droit brun `#6e4a34` de 4 points. Logo pixel 64 × 64, « Cumul » dessous en Press Start 2P 13 points `#b84a2a` avec ombre `#ffd3a8`. Entrées en VT323 21 points `#6a5348` ; entrée choisie sur rose, texte blanc, marches. En bas : « Partagé » et le nom de la personne en pastilles à marches.

**A4. Les cartes.** Un pixel du cadre = **3 × 3 points**. Cadre de **5 pixels** : `#3a2016`, `#c9875a`, `#e8a874`, `#3a2016`, puis l'intérieur crème `#fff4e4`. Coins **en escalier** (5, 3, 2, 1, 1). Ombre en escalier **6 points** plus bas (`rgba(42,24,16,.55)`), **dessinée dans l'image du cadre**. Technique : `border-image` avec `cadre-carte.png` découpée en 9 morceaux, `background-clip: padding-box`. Pas de canevas. Les cartes : la grille Répartir, la liste « À récolter » de la Récolte, chaque client de la Préparation, « Stock chez … ».

**A5. Le haut des cartes.** Rose `#e0709f`, reflet `#f8b4d0`, ombre `#c4508a`, trait `#3a2016`, filet `#f7dcc4`. Titre en Press Start 2P 13 points, **blanc à contour `#8a2a5a`** de 3 points ; à droite, un sous-titre en VT323 19 points crème à contour `#8a2a5a` (« 9 produits »). Préparation : la case du client est crème à marches `#8a2a5a`.

**A6. Blocs secondaires** (écart 4) : choix de la semaine, Filtre, « Récolté », « Caisses », Historique : crème, cadre en marches brun `#6e4a34` de 4 points et ombre `#2a1810`, sans le gros cadre des cartes. Choix de la semaine : titre en Press Start 2P 11 points `#8a2a5a`, flèches carrées brunes.

**A7. Lignes et boutons.**
- Lignes de produits : pas de cadre par ligne, séparation en pointillé `#efcdb4` de 3 points. Nom en VT323 23 points `#3b2a2f` (téléphone), quantité en VT323 23 points bleu `#1e5f86`, détail 18 points `#7a5a46`.
- Cases à cocher : blanches, marches `#8a6a52`, 30 points ; cochées : vert `#4f9a64`, marches `#9ad8a8` / `#1e5a34`, coche blanche. Case de récolte annulée : `#f6e6d2`, marches `#c9b49a`.
- « ⋯ » et flèches : carrés crème, marches `#e2c8ac`, signe `#a8406f`.
- Étiquettes : « Récolté » `#dcefd8` / `#2f6a3e`, « Pas encore récolté » `#fbe0c0` / `#8a4a10`, « annulée » `#f8d8d0` / `#8a2a1e`, en marches de leur couleur de texte (écart 5).
- Pastilles de choix (pages de la Semaine, jours, filtres) : crème à marches `#8a6a52` et ombre ; choisie en rose, texte blanc.
- Boutons d'action principaux (écart 6) : « Ajouter un produit », « + » et « − » du stock : rose foncé `#a8406f`, texte blanc, reliefs `#e0709f` / `#6a1e44`, ombre `#2a1810`. Sur le haut rose de la grille, « Ajouter un produit » est crème pour rester lisible (écart 3). Boutons secondaires : crème, marches `#8a6a52`.
- Barre de progression : fond `#f2d8c0`, remplissage en bandes vertes `#4f9a64` / `#3d7a50`, carrée.
- Couleurs qui portent un sens (écart 5) : vert « placé », « Récolté », « Compté » ; orange « à placer », « Pas encore récolté » ; rouge « en manque » ; adoucies pour le crème.

**A8. Le logo.** La cagette de légumes en pixel art, grille 32 × 32 (`maquette-pixel-art/cumul-v3/sources/logo.png` des fichiers du projet, image 7 de la maquette). 64 points dans le menu de l'ordinateur, 32 points dans la barre du téléphone. Agrandi sans lissage.

**A9. Règles « par analogie » pour les écrans non maquettés.**
- Une fenêtre (Ajouter un produit, Modifier le cumul, Qui récolte ?, Connexion, Notifications…) est une **carte** : même cadre, haut rose avec son titre en blanc à contour, intérieur crème.
- Une page à plusieurs blocs suit A6 ; une liste de lignes suit A7.
- Champ à remplir : fond blanc, marches `#8a6a52`, texte VT323 d'au moins 20 points (au moins 16 points réels sur l'iPhone, sinon il zoome).
- Messages d'attention : `#fbe0c0` / `#8a4a10`, en marches.
- Tableaux (Cumul, Historique, Commandes) : comme la grille Répartir (intérieur crème, filets pointillés, titres de colonnes en VT323, couleurs des débouchés gardées).
- Animation de la coche : la même qu'en classique, avec le vert `#4f9a64`.
- Pas d'arrondi lisse nulle part : coins carrés ou en escalier.

**A10. Les dix écarts du Cumul validés le 22/11** (rappel de `NOTE-ECARTS.md`) :
1. Petits dessins de légumes gardés, passés en pixels (R10).
2. Titre « À récolter » (et le nombre de produits) sur le haut rose de la liste de la Récolte. En classique, il reste caché.
3. Haut rose de la grille de l'ordinateur : compteurs (« 21 produits », placé, à placer, en manque…) et bouton « Ajouter un produit » crème. En classique, rien ne bouge.
4. Blocs secondaires en cadre léger (A6).
5. Couleurs qui portent un sens gardées, adoucies (A7).
6. Boutons roses pour les actions principales (A7).
7. Textes posés sur le fond (livraisons du jour, semaine, conseils) en crème `#fff3e0` à contour brun `#3a2420`.
8. Produits en 23 points sur le téléphone ; grille de l'ordinateur en 21 points (R12).
9. Barre du haut du téléphone qui part avec la page (R16).
10. Menu de gauche de 200 points (R15).
