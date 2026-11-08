# Base partagée (Firebase Realtime Database)

## Pourquoi Firebase

GitHub Pages ne sert que des fichiers fixes : il faut un endroit où les deux téléphones écrivent. Firebase Realtime Database est gratuit à cette échelle (offre Spark : 1 Go stocké, 10 Go/mois transférés, 100 connexions simultanées), pousse les changements en temps réel, et s'utilise par son API REST : l'appli n'a besoin d'aucune bibliothèque, seulement de l'adresse de la base (`config.js`).

## Ce qui est stocké

```
listes/
  2026-11-04/
    order: ["bette", "mesclun", ...]          // ordre des lignes ; absent = ordre du fichier (par zone)
    done/
      mesclun: {"by": "François", "at": 1793730000000}   // récolté par, heure (millisecondes)
    prep/                                       // préparation de commandes (depuis le 04/11/2026)
      ta/                                       // identifiant du circuit (client)
        mesclun: {"by": "Aurore", "at": 1793731000000}   // ligne mesclun × Très Allier préparée
    prepClient/
      el: {"by": "François", "at": 1793732000000}        // commande Élie prête
    maj/                                        // heure de la dernière action sur chaque chemin (depuis le 05/11/2026)
      done/mesclun: 1793730000000               // même après une décoche : sert à « la dernière action gagne »
      prep/ta/mesclun: 1793731000000
  semaines/                                   // onglet Semaine (depuis le 06/11/2026, étape 13A)
    2026-11-02/                                 // lundi de la semaine
      produits/bette: {"nom":"Bette","caisse":"GH","unite":"5 kg","kg":5,"by":…,"at":…}   // copie de la fiche produit
      dispo/bette: {"n":10,"u":"colis","by":"François","at":…}   // u = colis, kg ou u (bottes, pièces…)
      q/bette/ta-mar: {"n":2,"u":"colis","by":…,"at":…}         // quantité d'un créneau
      tout/tomate-ronde-rouge: {"c":"ta-jeu","by":…,"at":…}      // « tout » : un seul créneau par produit
      report/bette/av63: {"n":0.5,"u":"colis",…}                 // reste 03 → 63 modifié à la main (absent = calculé)
      propose/bette/av63: {"v":true,…}                           // proposé ou non à Auvabio
      creneaux: [ … ]                                            // copie des créneaux : tenue à jour tant que la semaine n'est pas passée, puis gardée
      maj/…                                                      // heure de chaque action, comme pour les listes
  reglages/                                   // réglages partagés (depuis le 08/11/2026, étape 13B)
    debouches: {"debouches":[ … ], "by":"François", "at":…}     // fiche entière des débouchés et de leurs livraisons
```

`listes/reglages/debouches` n'existe qu'après la première modification dans l'écran « Débouchés et livraisons » ; avant, l'appli prend `referentiel/debouches.json`. Chaque modification réécrit la fiche entière, avec le prénom et l'heure ; la dernière modification l'emporte. Un débouché ou une livraison retiré y reste, marqué `"archive": true`. **Ne pas supprimer `listes/reglages`** : ce sont les débouchés de la ferme. Aucune liste de récolte ne s'appelle `reglages`.

Les répartitions sont rangées **sous `listes/`** (dans `listes/semaines/`) parce que les règles de la base n'ouvrent que `listes` : un autre emplacement demanderait de changer les règles de Firebase, réservé à François. Aucune liste de récolte ne s'appelle `semaines`, les deux ne se mélangent pas. **Ne pas supprimer `listes/semaines`** en vidant une semaine de récolte : ce sont les répartitions gardées pour l'historique.

Pour la liste de récolte, seuls l'ordre et les coches sont dans la base. Les coches de préparation (`prep`, `prepClient`) sont à part des coches de récolte (`done`) : l'une ne modifie jamais l'autre. Les produits et quantités restent dans `listes/*.json` sur GitHub.

## Comment l'appli s'en sert

- **Lecture en temps réel** : `EventSource` sur `<base>/listes/<id>.json` (flux REST de Firebase, événements `put` et `patch`).
- **Écriture** (depuis le 05/11/2026) : chaque action est notée avec son heure, puis envoyée en deux temps : `GET <base>/listes/<id>.json` pour relire la base, puis un seul `PATCH <base>/listes/<id>.json` qui écrit plusieurs chemins d'un coup, par exemple `{"done/mesclun": {"by":"François","at":…}, "maj/done/mesclun": …}`. `null` décoche. Mêmes chemins qu'avant : `done/<produit>`, `order`, `prep/<circuit>/<produit>`, `prepClient/<circuit>`.
- **La dernière action gagne** : avant d'envoyer, l'appli compare l'heure de son action à l'heure de la dernière action de la base sur le même chemin (`maj/<chemin>`, ou à défaut le champ `at` de la coche). Si la base a plus récent, l'action du téléphone est abandonnée et l'écran reprend la valeur de la base. L'heure est celle du téléphone : deux téléphones à l'heure du réseau suffisent.
- **Hors ligne** : chaque action est appliquée tout de suite sur l'écran, gardée dans le téléphone (`localStorage`, clé `recolte.pending.<id>`), et envoyée au retour du réseau (événement `online`, à la reconnexion du flux, puis toutes les 15 s). En attendant, elle reste affichée par-dessus ce qui arrive de la base. Le flux temps réel est rouvert s'il s'est fermé.
- **Copie locale** : le dernier état connu des coches est gardé (`recolte.liste.<id>`), et la dernière liste reçue aussi (`recolte.copie`), pour ouvrir l'appli sans réseau même si le cache de la page n'a pas la liste du jour.
- Autres clés locales : `recolte.qui` (prénom), `recolte.ui` (vue, filtres, panneaux ouverts).

## Règles de sécurité

```json
{ "rules": { "listes": { ".read": true, ".write": true } } }
```

Lecture et écriture libres sous `listes/`, rien ailleurs. Pas de mot de passe : l'adresse de la base est dans `config.js`, donc publique. Pour durcir plus tard : Firebase Authentication (connexion Google de François et Aurore) et des règles `auth != null`, ce qui demande d'ajouter le SDK Firebase à l'appli.

## Vider une semaine

Dans la console Firebase, onglet Data, supprimer le nœud `listes/<id>` (une date de récolte, jamais `listes/semaines`). Les téléphones repartent avec des cases vides et l'ordre du fichier.
