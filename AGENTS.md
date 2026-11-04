# Consignes pour les agents IA

Appli web statique « Liste de récolte » du Champ de l'Aurore (GAEC, Tronget, Allier), liste partagée par François et Aurore. Hébergée sur Cloudflare Pages : https://liste-recolte.pages.dev (déploie depuis `main`).

## Avant de commencer

1. Lire ce fichier, puis la section « Où on en est » de `docs/ETAT_DU_PROJET.md`.
2. Lire `README.md` et le reste des registres seulement pour ce que la tâche demande.
3. Le dépôt fait foi. Si le dépôt et ce que dit François se contredisent, le lui signaler au lieu de trancher seul.

## Registres (à tenir à jour dans la même PR que le changement)

| Fichier | Contenu |
|---|---|
| `docs/ETAT_DU_PROJET.md` | Où on en est, ce qui est vérifié ou non |
| `docs/ROADMAP.md` | Étapes, avec modèle et effort, et celles réservées à François |
| `docs/DECISIONS.md` | Décisions validées par François, avec la date |
| `CHANGELOG.md` | Historique des changements |
| `docs/reprise.md` | Prompt de reprise d'origine (historique, daté du 3/11/2026) |

## Façon de travailler

- Écrire à François en français, en le vouvoyant, en phrases simples, sans jargon non expliqué. Il dicte souvent à la voix : un mot bizarre est sans doute une erreur de dictée, lui demander plutôt que deviner.
- Toute modification passe par une PR, registres compris. Jamais d'écriture directe sur `main`. Une PR par sujet, rien de plus que ce que la tâche demande.
- Mesurer avant d'écrire (lancer les contrôles, noter leur état), vérifier après. Ce qui n'a pas été vérifié est dit « non vérifié ».
- Avant d'affirmer qu'une chose est fusionnée, déployée ou verte, la vérifier à la source.
- Ne jamais voir, saisir, écrire ni consigner une clé, un jeton, un mot de passe ou l'adresse électronique de François. Le dépôt est public.
- Ne jamais réduire un outil au seul cas de cette ferme : elle sert d'exemple et d'essai, pas de limite.
- Ne jamais donner l'adresse `*.github.io` de ce compte : elle ouvre l'appli d'un autre membre de la famille sur les téléphones. Seule adresse à donner : https://liste-recolte.pages.dev. Rien de la ferme dans un autre dépôt que celui-ci.

## Ajouter la liste de la semaine

- Suivre `docs/format-liste.md`. Créer `listes/AAAA-MM-JJ.json`, puis mettre à jour `listes/actuelle.json`, **dans une PR** (pas d'envoi direct sur `main`, décision du 3/11/2026). La PR se fusionne une fois le test vert.
- Caisse et conditionnement : les prendre dans `referentiel/conditionnements.json`. Un produit absent : demander à François, puis l'ajouter au référentiel.
- Ne jamais inventer une quantité, un conditionnement, un emplacement ou un regroupement : s'il manque, poser **une seule** question à François.
- Garder le vocabulaire maison : cumul, colis, PB / PH / GB / GH, colis bois (petit, moyen, grand), circuits (Très Allier, Marché, Panier adéquat (ex-Paniers solidaires), Ellie, Locavore, Auvabio 03, Ferme Deschamps, Panier La Magic).
- Colisage par circuit : Panier adéquat, Locavore et Ferme Deschamps partent en colis bois. Le recopier dans chaque liste depuis le référentiel (voir `docs/format-liste.md`, « Colisage par circuit »).
- Citer la source des chiffres (cumul, date) dans `source`.
- Martin est salarié à temps partiel : ne jamais parler de prestation de service.
- Les listes et les coches sont des données réelles et partagées : jamais de suppression ni de modification en masse sans le « vas-y » de François. Sauvegarde avant toute migration de la base.

## Modifier l'appli

- Tout tient dans `index.html`, sans bibliothèque ni étape de construction. Garder ça.
- Après toute modification de `index.html`, `config.js` ou des icônes : changer `CACHE` dans `sw.js`.
- Lancer `node tests/deux-telephones.cjs` avant d'ouvrir la PR et coller la sortie réelle dans la PR. Mettre à jour le test et `README.md` si le comportement change. Un contrôle omis l'est avec sa raison.
- Textes de l'interface en français, phrases courtes, gros éléments tactiles (usage au champ, au soleil, avec des gants).
- Charte « plein soleil » : fond blanc, texte noir, traits épais, pas de gris clair, aucun mode sombre. Glisser-déposer uniquement par appui long (0,45 s), sans poignée.
- Zones : Tunnel, Plein champ, Stock, et seulement elles. Lieu des récoltes (zones et emplacements) masqué depuis le 04/11/2026 (`MONTRER_LIEU` dans `index.html`) : ne pas le réafficher sans l'accord de François.
- Onglet Détail caché depuis le 04/11/2026 (`MONTRER_DETAIL` dans `index.html`), remplacé par la flèche de répartition par client sous chaque produit : ne pas le remettre sans l'accord de François.

## Accord de François nécessaire

Tout ce qui touche les vraies données de la ferme en masse, un service payant ou l'hébergeur (Cloudflare ou autre), l'ouverture d'un accès à d'autres personnes, et toute étape que `docs/ROADMAP.md` lui réserve.
