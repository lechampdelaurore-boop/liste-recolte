# Consignes pour les agents IA

Appli web statique (GitHub Pages) de liste de récolte partagée pour François et Aurore, Le Champ de l'Aurore. Lire `README.md` d'abord.

## Ajouter la liste de la semaine

- Suivre `docs/format-liste.md`. Créer `listes/AAAA-MM-JJ.json`, puis mettre à jour `listes/actuelle.json`.
- Ne jamais inventer une quantité, un conditionnement ou un emplacement : s'il manque, demander à François.
- Garder le vocabulaire maison tel quel : cumul, colis, PB / PH / GB / GH, noms des circuits (Très Allier, Marché, Paniers solidaires, Ellie, Locavore, Auvabio 03).
- Martin est salarié à temps partiel : ne jamais parler de prestation de service.

## Modifier l'appli

- Tout tient dans `index.html`, sans bibliothèque ni étape de construction. Garder ça.
- Après toute modification de `index.html`, `config.js` ou des icônes : changer `CACHE` dans `sw.js`.
- Lancer `node tests/deux-telephones.cjs` avant d'envoyer, et mettre à jour le test et `README.md` si le comportement change.
- Textes de l'interface en français, phrases courtes, gros éléments tactiles (usage au champ, au soleil, avec des gants).
- Ne pas mettre de secret dans le dépôt : il est public.
