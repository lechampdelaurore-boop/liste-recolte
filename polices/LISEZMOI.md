# Polices de l'appli (charte douce, étape 42)

Trois polices libres, copiées sans modification depuis les paquets Fontsource 5.3.0 (versions variables, jeu de caractères « latin », qui couvre le français) :

| Fichier | Police | Usage |
|---|---|---|
| `bricolage-grotesque.woff2` | Bricolage Grotesque (© 2022 The Bricolage Grotesque Project Authors) | titres |
| `dm-sans.woff2` | DM Sans (© 2014 The DM Sans Project Authors) | boutons, onglets, noms de produits, quantités |
| `open-sans.woff2` | Open Sans (© 2020 The Open Sans Project Authors) | texte courant |

Licence : SIL Open Font License 1.1, texte complet dans `OFL.txt`. Les polices sont servies par le site lui-même et gardées hors ligne par `sw.js` : aucune police n'est chargée depuis un autre site.

## Apparence pixel art (étape 48, 22/11/2026)

Seulement dans l'apparence « Pixel art » (Réglages → Apparence). Un appareil resté en classique ne les télécharge pas pour afficher la page (le navigateur ne charge une police qu'à l'emploi) ; `sw.js` les garde quand même hors ligne, pour pouvoir choisir le pixel art sans réseau. La page du magasin (`magasin.html`) reste classique et ne les déclare pas.

| Fichier | Police | Usage |
|---|---|---|
| `press-start-2p.woff2` | Press Start 2P (© 2012 The Press Start 2P Project Authors, nom réservé « Press Start 2P ») | titres des cartes, nom de l'appli, petits boutons |
| `vt323.woff2` | VT323 (© 2011 The VT323 Project Authors) | texte : produits, quantités, boutons, fenêtres |
| `signes-pixel.woff2` | Signes pixel (dessinée pour Farm tasks, complétée pour le Cumul) | les signes que les deux polices n'ont pas : ⋯ ▲ ▼ ▴ ▾ ● → − ✓ ＋ 🕘 |

Press Start 2P et VT323 sont copiées sans modification depuis les paquets Fontsource 5.3.0 (jeu « latin », les mêmes fichiers que Farm tasks et la maquette validée) ; licence SIL Open Font License 1.1 (`OFL.txt`). « Signes pixel » est faite par `apparence/fabriquer-signes.py` (11 signes dessinés point par point, moins de 1 Ko) ; elle suit la licence du dépôt. Pour la refaire : `pip install fonttools brotli`, puis `python3 apparence/fabriquer-signes.py` depuis la racine du dépôt.
