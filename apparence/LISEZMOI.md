# Images de l'apparence pixel art (étape 48, 22/11/2026)

Seulement dans l'apparence « Pixel art » (Réglages → Apparence), sauf les deux vignettes qui sont dans les Réglages des deux apparences. Contrat : `docs/CONTRAT_APPARENCE_PIXEL_ART.md`. Maquette du Cumul validée par François le 22/11/2026 (`cumul-v3`, avec les dix écarts de l'annexe A). Les mêmes images de base que Farm tasks (dépôt aurore-task, étape 53), pour que les deux outils se ressemblent. Toutes ces images sont gardées hors ligne par `sw.js`.

| Fichier | Ce que c'est | D'où il vient |
|---|---|---|
| `fond-ordinateur.png` | Fond de l'ordinateur, ferme japonaise au coucher du soleil, 480 × 270 points, 64 couleurs. La page l'agrandit d'un nombre entier de fois (4 fois en 1920 × 1080), sans lissage. | Image de François (maquette `cumul-v3`, `sources/bg-480.png`, la même que Farm tasks), copiée sans modification. Publiée avec son accord (point 2 du contrat, 22/11/2026). |
| `fond-telephone.png` | Fond du téléphone, même scène recadrée en hauteur, 195 × 422 points, 64 couleurs. | Image de François (maquette, `sources/bg2-phone.png`), copiée sans modification. Même accord. |
| `cadre-carte.png` | Cadre des cartes et des fenêtres, 33 × 39 points (11 × 13 pixels du cadre, chacun de 3 × 3 points), découpé en 9 morceaux par la page (`border-image`). | Fait par `fabriquer-cadre.cjs` (même fichier que Farm tasks). Pour le refaire : `node apparence/fabriquer-cadre.cjs`. |
| `logo-pixel.png` | Logo « cagette de légumes » en pixels, 32 × 32 points (affiché à 64 points dans le menu de l'ordinateur, 32 sur le téléphone). | Logo du Cumul en pixel art de la maquette (`sources/logo.png`), copié sans modification. |
| `coche-pixel.svg` | Coche blanche des cases cochées de la grille Répartir (ordinateur), 7 × 7 pixels. | Dessinée pour Farm tasks, copiée sans modification. |
| `vignette-classique.png`, `vignette-pixel.png` | Petites images des deux boutons « Classique » et « Pixel art » des Réglages, 300 × 180 points (affichées à 150 × 90). | Capture de la page Répartir avec les données inventées des tests (`tests/donnees-apparence.cjs`, rien de la vraie base), fenêtre de 1500 × 900, réduite à 300 × 180 et ramenée à 64 couleurs. |

Les petits dessins de légumes ne sont pas ici : en pixel art, ils sont calculés sur l'appareil à partir des mêmes dessins d'Ouvre ta ferme (`especes/plants.svg`, `especes/modifies.svg`, non modifiés), réduits à 14 × 14 (téléphone) ou 16 × 16 (ordinateur) sans demi-transparence, avec un contour brun d'un pixel, puis agrandis 2 fois sans lissage (règle R10 du contrat, fonction `miniPxFaire` d'`index.html`).

Les deux fichiers `fabriquer-*` ne sont pas servis à l'appli (aucune page ne les charge) ; ils servent seulement à refaire le cadre et la police des signes (`polices/signes-pixel.woff2`, voir `polices/LISEZMOI.md`).
