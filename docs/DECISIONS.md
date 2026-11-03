# Décisions validées par François

| Date | Décision |
|---|---|
| 03/11/2026 | Garder `liste-recolte` comme dépôt à part : le site en ligne et Cloudflare Pages y sont reliés. Les futurs outils iront dans `outils-de-la-ferme`. |
| 03/11/2026 | Chaque liste de la semaine passe par une PR, plus d'envoi direct sur `main`. |
| 03/11/2026 | `AGENTS.md` et les registres vivent dans `liste-recolte` ; `CLAUDE.md` renvoie vers `AGENTS.md`. |

## Décisions de conception (reprises du prompt de reprise du 03/11/2026)

- Vues **Récolte** (produit, emplacement, total) et **Détail** (caisse, conditionnement, part de chaque circuit).
- Filtres par zone et par circuit. Zones = lieux réels seulement : **Tunnel, Plein champ, Stock**. Les catégories inventées (« Choux et poireau », « Racines ») sont refusées.
- Glisser-déposer par **appui long de 0,45 s**, sans poignée ; un geste rapide fait seulement défiler. L'ordre est partagé entre les deux téléphones.
- Caisses **PB, PH, GB, GH** : une caisse par colis. Par défaut une caisse par circuit ; une option regroupe les demi-colis. Les sachets Locavore, bottes, pièces et tomates « tout » ne sont pas comptés. Le chiffre est ce qui reste à remplir.
- Cases à cocher partagées : la ligne cochée passe dans « Récoltes déjà effectuées », avec prénom et heure.
- Un seul affichage : fond blanc, texte noir, traits épais, pas de gris clair, aucun mode sombre (`color-scheme: only light`).
- Tout dans `index.html`, sans bibliothèque ni étape de construction ; Firebase par l'API REST sans SDK.
- Ne jamais donner l'adresse `*.github.io` de ce compte (elle ouvre l'appli d'un autre membre de la famille sur les téléphones).
- Martin est salarié à temps partiel : jamais « prestation de service ».
