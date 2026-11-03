# Format d'une liste de récolte

Un fichier par jour de récolte : `listes/AAAA-MM-JJ.json`. `listes/actuelle.json` désigne celle qui s'ouvre : `{"liste": "2026-11-04"}`.

## Exemple commenté

```jsonc
{
  "id": "2026-11-04",                       // identique au nom du fichier ; sert aussi de clé dans la base partagée
  "titre": "Récolte du mercredi 4 novembre",
  "pour": "Livraisons du jeudi 5 et marché du vendredi 6 novembre 2026",
  "source": "Cumul envoyé par François le 03/11/2026, ...",   // affiché en bas de page
  "circuits": [                              // ordre d'affichage des circuits
    {"id": "ta", "nom": "Très Allier", "court": "TA"},
    {"id": "mk", "nom": "Marché ven.", "court": "Marché"}
  ],
  "items": [
    {
      "id": "bette",                         // unique, minuscules, sans espace ni . # $ [ ] /
      "produit": "Bette",
      "zone": "Tunnel",                      // sert aux puces de zone
      "ou": "T4-2 (bette S36), sinon B2-8/9",// emplacement, texte libre
      "caisse": "GH",                        // PB, PH, GB, GH, ou null si pas de caisse
      "condit": "5 kg",                      // conditionnement d'un colis ; « N kg » permet le calcul des kg par circuit
      "circ": {                              // quantité par circuit
        "ta": 1,                             //   nombre = colis (0,5 = demi-colis) → compté dans les caisses
        "mk": 1.5,
        "ps": 3.5,
        "lv": "1 × 1 kg + 4 × 500 g"         //   texte = autre unité (sachets, bottes, pièces) → pas compté dans les caisses
      },
      "total": "6 colis + 3 kg",             // affiché en gros dans la vue Récolte
      "kg": "33 kg"                          // affiché en petit sous le total
    }
  ]
}
```

## Champs

| Champ | Obligatoire | Notes |
|---|---|---|
| `id` | oui | Date de récolte `AAAA-MM-JJ`. Changer d'`id` repart avec des cases vides. |
| `titre`, `pour`, `source` | oui | Textes affichés. `source` doit dire d'où viennent les chiffres et à quelle date. |
| `circuits[]` | oui | `id` court (sert de clé dans `circ`), `nom` (puce de filtre), `court` (vue Détail). Un circuit sans aucune quantité n'a pas de puce. |
| `items[].id` | oui | Garder le même `id` d'une semaine à l'autre pour un même produit. |
| `items[].zone` | oui | Libellés actuels : `Tunnel`, `Choux et poireau`, `Racines`, `Stock`. L'ordre des puces suit le premier produit de chaque zone. |
| `items[].caisse` | oui | Code du cumul. `null` pour les produits hors caisse (tomates « tout », persil en botte, courges à la pièce). |
| `items[].circ` | oui | Nombre = colis ; texte = autre unité. Un circuit absent ou à 0 n'est pas affiché. |
| `items[].total`, `items[].kg` | oui | Calculés à la main (colis × conditionnement, plus les autres unités). L'appli ne les recalcule pas. |

## Règles pour remplir

- Les quantités viennent du **cumul** (colis × conditionnement) et des commandes des circuits. Locavore : quantité = Qté × Format (500 g, 1 kg, 1 u).
- Ne jamais inventer une quantité ou un conditionnement : si une valeur manque (par exemple un conditionnement affiché « 0% » dans le cumul), demander à François.
- Les emplacements viennent de la liste d'assolement Ouvre ta ferme ; indiquer sa date dans `source`.
- Vérifier le fichier avant d'envoyer : `python3 -c "import json;json.load(open('listes/AAAA-MM-JJ.json'))"`.
