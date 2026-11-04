# Base partagée (Firebase Realtime Database)

## Pourquoi Firebase

GitHub Pages ne sert que des fichiers fixes : il faut un endroit où les deux téléphones écrivent. Firebase Realtime Database est gratuit à cette échelle (offre Spark : 1 Go stocké, 10 Go/mois transférés, 100 connexions simultanées), pousse les changements en temps réel, et s'utilise par son API REST : l'appli n'a besoin d'aucune bibliothèque, seulement de l'adresse de la base (`config.js`).

## Ce qui est stocké

```
listes/
  2026-11-04/
    order: ["bette", "mesclun", ...]          // ordre des lignes ; absent = ordre du fichier (par zone)
    done/
      mesclun: {"by": "François", "at": 1793730000000}   // coché par, heure (millisecondes)
```

Seuls l'ordre et les coches sont dans la base. Les produits et quantités restent dans `listes/*.json` sur GitHub.

## Comment l'appli s'en sert

- **Lecture en temps réel** : `EventSource` sur `<base>/listes/<id>.json` (flux REST de Firebase, événements `put` et `patch`).
- **Écriture** : `PUT <base>/listes/<id>/done/<produit>.json` pour cocher, `DELETE` pour décocher, `PUT .../order.json` pour l'ordre.
- **Hors ligne** : chaque écriture est appliquée tout de suite sur l'écran, gardée dans le téléphone (`localStorage`, clé `recolte.pending.<id>`), et renvoyée au retour du réseau (événement `online`, puis toutes les 15 s). Les écritures en attente gardent la priorité sur ce qui arrive de la base.
- **Copie locale** : le dernier état connu est gardé (`recolte.liste.<id>`) pour ouvrir l'appli sans réseau.
- Autres clés locales : `recolte.qui` (prénom), `recolte.ui` (vue, filtres, panneaux ouverts).

## Règles de sécurité

```json
{ "rules": { "listes": { ".read": true, ".write": true } } }
```

Lecture et écriture libres sous `listes/`, rien ailleurs. Pas de mot de passe : l'adresse de la base est dans `config.js`, donc publique. Pour durcir plus tard : Firebase Authentication (connexion Google de François et Aurore) et des règles `auth != null`, ce qui demande d'ajouter le SDK Firebase à l'appli.

## Vider une semaine

Dans la console Firebase, onglet Data, supprimer le nœud `listes/<id>`. Les téléphones repartent avec des cases vides et l'ordre du fichier.
