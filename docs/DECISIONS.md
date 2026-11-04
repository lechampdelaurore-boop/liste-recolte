# Décisions validées par François

| Date | Décision |
|---|---|
| 03/11/2026 | Garder `liste-recolte` comme dépôt à part : le site en ligne et Cloudflare Pages y sont reliés. Les futurs outils iront dans `outils-de-la-ferme`. |
| 03/11/2026 | Chaque liste de la semaine passe par une PR, plus d'envoi direct sur `main`. |
| 03/11/2026 | `AGENTS.md` et les registres vivent dans `liste-recolte` ; `CLAUDE.md` renvoie vers `AGENTS.md`. |
| 04/11/2026 | Locavore, Paniers solidaires et Ferme Deschamps partent toujours en colis bois : GH et GB → grand colis bois, PH → moyen colis bois, PB → petit colis bois. Seule l'étiquette change, le contenu reste celui de la caisse (6 bouquets en PB = 6 bouquets en petit colis bois). Les autres circuits gardent PB, PH, GB, GH. Le colisage se règle par circuit dans la liste (pas réservé à cette ferme). |
| 04/11/2026 | Nouveau débouché « Ferme Deschamps » (orthographe confirmée par François). Persil : colis de 10 bouquets, en petit colis bois. |
| 04/11/2026 | **Lieu des récoltes masqué pour l'instant** : ni emplacement (T1-3, B4…), ni puces de zone, ni zone en vue Détail. Raison donnée par François : ces lieux sont recopiés à la main depuis l'assolement, pas reliés à Ouvre ta ferme, donc pas fiables. Retrait réversible : les champs `zone` et `ou` restent dans les listes, un réglage `MONTRER_LIEU` dans `index.html` les réaffiche. Un lien direct avec Ouvre ta ferme pourra les remplacer plus tard. Le bouton « Remettre l'ordre par zone » est retiré (pas seulement renommé). |
| 04/11/2026 | Barre de progression en haut de la liste : la barre globale additionne kilos et unités (1 unité compte comme 1 kg). Détail sous une flèche : une barre pour les unités, une pour les kilos. |

## Décisions de conception (reprises du prompt de reprise du 03/11/2026)

- Vues **Récolte** (produit, emplacement masqué depuis le 04/11/2026, total) et **Détail** (caisse, conditionnement, part de chaque circuit).
- Filtres par zone et par circuit. Zones = lieux réels seulement : **Tunnel, Plein champ, Stock**. Les catégories inventées (« Choux et poireau », « Racines ») sont refusées. Puces de zone masquées depuis le 04/11/2026 (voir plus haut).
- Glisser-déposer par **appui long de 0,45 s**, sans poignée ; un geste rapide fait seulement défiler. L'ordre est partagé entre les deux téléphones.
- Caisses **PB, PH, GB, GH** : une caisse par colis. Par défaut une caisse par circuit ; une option regroupe les demi-colis. Les sachets Locavore, bottes, pièces et tomates « tout » ne sont pas comptés. Le chiffre est ce qui reste à remplir.
- Cases à cocher partagées : la ligne cochée passe dans « Récoltes déjà effectuées », avec prénom et heure.
- Un seul affichage : fond blanc, texte noir, traits épais, pas de gris clair, aucun mode sombre (`color-scheme: only light`).
- Tout dans `index.html`, sans bibliothèque ni étape de construction ; Firebase par l'API REST sans SDK.
- Ne jamais donner l'adresse `*.github.io` de ce compte (elle ouvre l'appli d'un autre membre de la famille sur les téléphones).
- Martin est salarié à temps partiel : jamais « prestation de service ».
