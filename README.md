# Liste de récolte

Liste de récolte partagée du Champ de l'Aurore, faite pour le téléphone : **https://lechampdelaurore-boop.github.io/liste-recolte/**

## Ce qu'elle fait

- **Vue Récolte** : produit, emplacement et quantité totale. **Vue Détail** : type de caisse, conditionnement et répartition par circuit (Très Allier, marché, paniers solidaires, Ellie, Locavore, Auvabio 03).
- **Filtres** par zone et par circuit (en filtrant un circuit, la quantité affichée est celle de ce circuit).
- **Glisser-déposer** : appuyer sur ⠿ et glisser la ligne. L'ordre est le même pour tout le monde.
- **Caisses** : nombre de caisses petite basse (PB), petite haute (PH), grande basse (GB) et grande haute (GH) à remplir, d'après le code du cumul, une caisse par colis. Option : une caisse par circuit (par défaut) ou demi-colis regroupés. Les sachets Locavore, bottes, pièces et tomates ne sont pas comptés.
- **Cases à cocher partagées** : ce qui est coché passe dans « Récoltes déjà effectuées », avec qui l'a coché et à quelle heure.
- Marche hors ligne : les coches faites sans réseau partent dès que le téléphone se reconnecte.

## Fichiers

- `listes/AAAA-MM-JJ.json` : une liste par jour de récolte. `listes/actuelle.json` dit laquelle s'ouvre. Une ancienne liste s'ouvre avec `?liste=2026-11-04`.
- `config.js` : adresse de la base Firebase Realtime Database qui partage les coches et l'ordre. Vide = chaque téléphone garde ses coches pour lui.
- `index.html` : toute l'appli, sans bibliothèque. `sw.js` et `manifest.webmanifest` : installation sur l'écran d'accueil et hors ligne (changer `CACHE` dans `sw.js` après une modification de l'appli).

## Base partagée

Dans la base, chaque liste est sous `listes/<id>` : `order` (ordre des lignes) et `done/<produit>` (`by`, `at`). Règles de la base :

```json
{ "rules": { "listes": { ".read": true, ".write": true } } }
```
