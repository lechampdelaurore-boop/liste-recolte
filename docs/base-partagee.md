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
    fige: {"id":…, "titre":…, "pour":…, "source":…, "semaine":"2026-11-09", "circuits":[…], "items":[…], "colisages":{…}, "by":"François", "at":…}
                                                // étape 13D : liste calculée depuis la semaine, figée à la première coche (absente pour une liste en fichier)
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
      stock/bette/ta: {"n":2,"u":"colis","by":…,"at":…}          // stock au magasin Très Allier (information, hors du reste)
      creneaux: [ … ]                                            // copie des créneaux : tenue à jour tant que la semaine n'est pas passée, puis gardée
      habitudes: [ … ]                                           // copie des jours de récolte habituels (étape 13D), tenue et gardée de la même façon
      recoltes/2026-11-11: {"livraisons":["ps","lv",…],"by":…,"at":…}   // jour de récolte propre à cette semaine (ajouté, ou livraisons changées)
      recoltes/2026-11-09: {"retire":true,"by":…,"at":…}         // jour habituel retiré pour cette semaine seulement
      maj/…                                                      // heure de chaque action, comme pour les listes
  reglages/                                   // réglages partagés (depuis le 08/11/2026, étape 13B)
    debouches: {"debouches":[ … ], "recoltes":[ … ], "rec":true, "by":"François", "at":…}   // débouchés, livraisons et jours de récolte habituels (recoltes[].chaque : « Chaque semaine », absent = oui)
profils/                                      // étape 5 : écrit par François dans la console, jamais par l'appli
  <uid du compte>: "ferme"                    // ce compte lit et écrit tout « listes »
```

`listes/reglages/debouches` n'existe qu'après la première modification dans l'écran « Débouchés et livraisons » ; avant, l'appli prend `referentiel/debouches.json`. Chaque modification réécrit la fiche entière, avec le prénom et l'heure ; la dernière modification l'emporte. Un débouché ou une livraison retiré y reste, marqué `"archive": true`. **Ne pas supprimer `listes/reglages`** : ce sont les débouchés de la ferme. Aucune liste de récolte ne s'appelle `reglages`.

Les répartitions sont rangées **sous `listes/`** (dans `listes/semaines/`) parce que les règles de la base n'ouvrent que `listes` : un autre emplacement demanderait de changer les règles de Firebase, réservé à François. Aucune liste de récolte ne s'appelle `semaines`, les deux ne se mélangent pas. **Ne pas supprimer `listes/semaines`** en vidant une semaine de récolte : ce sont les répartitions gardées pour l'historique.

Pour la liste de récolte, seuls l'ordre, les coches et (depuis l'étape 13D) la liste figée sont dans la base. Les coches de préparation (`prep`, `prepClient`) sont à part des coches de récolte (`done`) : l'une ne modifie jamais l'autre. Depuis l'étape 13D, les produits et quantités d'une liste sont **calculés depuis la semaine** (`listes/semaines/<lundi>`) : la liste d'un jour de récolte a pour identifiant sa date (`listes/2026-11-11`). Tant que personne n'a coché, rien n'est écrit pour elle ; la première coche écrit aussi `fige` (la liste telle qu'elle était) et, si le jour vient d'un jour habituel, `recoltes/<date>` dans la semaine (le jour existe alors « en dur »). Les listes faites à la main avant 13D restent dans `listes/*.json` sur GitHub et l'emportent pour leur date.

## Comment l'appli s'en sert

- **Lecture en temps réel** : `EventSource` sur `<base>/listes/<id>.json` (flux REST de Firebase, événements `put` et `patch`).
- **Écriture** (depuis le 05/11/2026) : chaque action est notée avec son heure, puis envoyée en deux temps : `GET <base>/listes/<id>.json` pour relire la base, puis un seul `PATCH <base>/listes/<id>.json` qui écrit plusieurs chemins d'un coup, par exemple `{"done/mesclun": {"by":"François","at":…}, "maj/done/mesclun": …}`. `null` décoche. Mêmes chemins qu'avant : `done/<produit>`, `order`, `prep/<circuit>/<produit>`, `prepClient/<circuit>`.
- **La dernière action gagne** : avant d'envoyer, l'appli compare l'heure de son action à l'heure de la dernière action de la base sur le même chemin (`maj/<chemin>`, ou à défaut le champ `at` de la coche). Si la base a plus récent, l'action du téléphone est abandonnée et l'écran reprend la valeur de la base. L'heure est celle du téléphone : deux téléphones à l'heure du réseau suffisent.
- **Hors ligne** : chaque action est appliquée tout de suite sur l'écran, gardée dans le téléphone (`localStorage`, clé `recolte.pending.<id>`, une par liste : une coche faite sur la liste du mercredi part dans celle du mercredi même si l'on est passé au mardi), et envoyée au retour du réseau (événement `online`, à la reconnexion du flux, puis toutes les 15 s). En attendant, elle reste affichée par-dessus ce qui arrive de la base. Le flux temps réel est rouvert s'il s'est fermé.
- **Copie locale** : le dernier état connu des coches (et de la liste figée) est gardé (`recolte.liste.<id>`), la semaine aussi (`recolte.semaine.<lundi>`), la dernière liste en fichier ouverte par `?liste=` (`recolte.copie`) et les listes en fichier trouvées pour une date (`recolte.fichiers`), pour ouvrir l'appli sans réseau.
- Autres clés locales : `recolte.qui` (prénom), `recolte.ui` (vue, filtres, panneaux ouverts), `recolte.compte` (étape 5 : identifiant, numéro du compte, jeton et jeton de renouvellement ; jamais le mot de passe).
- **Compte** (étape 5, depuis le 08/11/2026) : si `cle-web.js` contient la clé web du projet, l'appli se connecte par l'API web de Firebase Authentication (`accounts:signInWithPassword`, puis `securetoken …/token` pour renouveler), sans bibliothèque. Chaque appel à la base (lecture, flux, écriture) porte `?auth=<jeton>`. Le jeton vaut une heure : il est renouvelé cinq minutes avant la fin (vérifié toutes les 15 s et au retour du réseau), ou dès que la base ferme un flux par `auth_revoked` ou répond « jeton expiré » ; les trois flux sont alors rouverts avec le nouveau. Refus « Permission denied » : pastille « Compte sans accès ». Renouvellement refusé (compte supprimé, désactivé, mot de passe changé) : le téléphone oublie le compte et redemande la connexion ; ce qui attendait d'être envoyé reste gardé et part après. Un identifiant sans « @ » est complété par `@ferme.invalid` (`DOMAINE_COMPTES` dans `index.html`) : aucune vraie adresse.

## Règles de sécurité

Jusqu'au 8/11/2026 à 20 h 55 (anciennes règles, gardées pour revenir en arrière) : `docs/regles-base/ouvertes.json`.

```json
{ "rules": { "listes": { ".read": true, ".write": true } } }
```

Lecture et écriture libres sous `listes/`, rien ailleurs. Pas de mot de passe : l'adresse de la base est dans `config.js`, donc publique.

**En place depuis le 8/11/2026 à 20 h 55** (étape 5) : `docs/regles-base/fermees.json`. Seul un compte connecté **avec le profil « ferme »** (`profils/<uid>` = `"ferme"`) lit et écrit `listes/` ; personne ne lit ni n'écrit `profils/` ni rien d'autre, sauf la console. Le profil est indispensable : avec la clé web (publique), n'importe qui pourrait se créer un compte, et `auth != null` seul le laisserait entrer. Les règles sont essayées sur l'émulateur officiel par `tests/regles.cjs`. Pas-à-pas pour les poser, avec le retour arrière : `docs/PAS_A_PAS_SECURITE.md`. Le compte du magasin (étape 13C) ajoutera un profil « magasin » qui n'ouvrira que son stock.

## Vider une semaine

Dans la console Firebase, onglet Data, supprimer le nœud `listes/<id>` (une date de récolte, jamais `listes/semaines`). Les téléphones repartent avec des cases vides et l'ordre du fichier.
