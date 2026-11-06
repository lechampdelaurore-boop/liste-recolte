# Historique des changements

## 2026-11-06

- **Jours de livraison** : Auvabio 03 et 63 le jeudi ; chaque débouché doit avoir un jour de livraison (demande de François). `docs/debouches.md` et `DECISIONS.md` mis à jour. Aucun changement de l'appli.

- **Colisage relevé dans les fiches d'agréage Auvabio** (PDF de 69 pages envoyé par François) : `docs/colisage-fiches-agreage.md`, avec les écarts par rapport à `referentiel/conditionnements.json`. Aucun changement du référentiel ni de l'appli.

- **Historique voulu** (demande de François) : étape 14 précisée, historique des récoltes et des répartitions entre débouchés ; l'étape 13 devra enregistrer ses répartitions. Aucun changement de l'appli.

- **Débouchés décrits** dans `docs/debouches.md` et étape 22 notée (débouchés paramétrables : ajout, suppression, colisage plastique ou bois, jours de livraison), demande de François. Aucun changement de l'appli.

- **Réponses de François sur le tableau de cumul** : sens de « tout » (tout chez Très Allier), AUVABIO 03 et 63 = un débouché en deux livraisons. `docs/tableau-cumul.md` et `DECISIONS.md` mis à jour. Aucun changement de l'appli.

- **Groupe non repris** (décision de François) : la colonne « Groupe » du tableur, priorité de récolte, est remplacée par le glisser-déposer. Documents mis à jour, aucun changement de l'appli.

- **Mode hors ligne, premier retour réel** (sans code) : François écrit le 6/11 au soir qu'il « semble bien fonctionner ». Registres à jour ; la règle « la dernière action gagne » reste non vérifiée en réel. Aucun changement de l'appli.

- **Messages de félicitations retirés** (demande de François du 6/11). Quand tout est coché, la liste à faire reste simplement vide : plus de « Tout est récolté. Bravo. ». Retirés aussi : « Toutes les commandes sont prêtes. Bravo. » (Préparation), « Tout est récolté. » devant les kilos de la barre de progression, « Tout est préparé · » sur un produit en tri par produit. Gardés : « Rien pour ce filtre. », l'alerte « Attention : N lignes pas cochées », la pastille hors ligne. `CACHE` → `recolte-v16`. Test deux-téléphones : 84 vérifications (2 nouvelles).

- **Prix hors de l'outil** (décision de François) : la description de la fiche des prix est réduite à la liste des produits ; formules et marges retirées de `docs/tableau-cumul.md` et de la feuille de route. Aucun changement de l'appli.

- **Tableau de cumul et fiche des prix** décrits dans `docs/tableau-cumul.md` (document seulement, calculs devinés à confirmer). Étapes 13 et 19 de la feuille de route renvoient vers lui. Aucun changement de l'appli.

## 2026-11-05

- **Mode hors ligne** (étape 21, demande de François du 5/11). Une partie existait déjà (page en cache, coches gardées et renvoyées) ; ajouté : la dernière liste reçue est gardée sur le téléphone et s'ouvre sans réseau ; la pastille dit « Hors ligne · 3 coches en attente », puis « Envoi… » et « Partagé » ; règle « la dernière action gagne » (avant, le téléphone resté hors ligne gagnait toujours, même s'il avait agi en premier) : chaque action est notée avec son heure, aussi dans la base (`maj`), et l'envoi relit la base avant d'écrire ; le flux temps réel se rouvre s'il s'est fermé ; une liste ouverte depuis la copie est remplacée par la nouvelle au retour du réseau. `CACHE` → `recolte-v15`. Test deux-téléphones : 82 vérifications (18 nouvelles, avec coupure du réseau) ; le faux Firebase sait lire en JSON, écrire en `PATCH` et couper les flux.
- **Feuille de route** (sans code) : étape 21, mode hors ligne (demande de François du 5/11), en Opus 5.5 · Élevé. Aucun changement de l'appli.

## 2026-11-04

- **Onglet Détail retiré pour l'instant, remplacé par une petite flèche sous chaque produit** (demandes de François du 4/11 au soir). L'onglet Détail est caché : il ne reste que Récolte et Préparation. Rien n'est effacé : `MONTRER_DETAIL = true` dans `index.html` le remet tel quel ; un téléphone resté sur Détail rouvre sur Récolte. Dans l'onglet Récolte, chaque produit a une petite flèche en bas à droite qui déplie sa répartition par client : le colis (« GH de 5 kg »), puis chaque client avec son nombre de colis (colis bois compris) et le poids ou les unités (« Panier adéquat : 3,5 grands colis bois de 5 kg · 17,5 kg »). La flèche ne coche pas le produit et ne lance pas le glisser-déposer. `CACHE` → `recolte-v14`. Test deux-téléphones : 64 vérifications (11 nouvelles).

- **Feuille de route** (sans code) : étape 19 précisée (base de données des produits et colisages, modifiable sans code) ; étape 20 notée, réinterroger la vue Détail, redondante avec l'onglet Préparation (décision reportée). Aucun changement de l'appli.

- **Préparation de commandes** (étape 10, demande de François du 4/11 après-midi) : troisième onglet « Préparation » à côté de Récolte et Détail. Même liste du jour, une ligne par produit et par client (38 lignes, 8 clients le 4/11), avec la quantité du client (colis bois compris). Tri par client ou par produit. Chaque ligne porte « Récolté » ou « Pas encore récolté », repris des coches de récolte. Toucher une ligne la coche (prénom et heure) ; la case du client marque la commande prête, qui passe en bas dans « Commandes prêtes » et reste visible. Coches partagées par la base, rangées à part (`prep`, `prepClient`) : les coches de récolte ne changent pas. `CACHE` → `recolte-v13`. Test deux-téléphones : 53 vérifications (23 nouvelles).

- **Feuille de route** : vision de François inscrite (étapes 10 à 20, sans code) : préparation de commandes, commandes de plusieurs canaux, stock du magasin, arbitrage hebdomadaire, historique, prise de temps, lien Ouvre ta ferme, plusieurs fermes. Aucun changement de l'appli.

- **Kilos hors colis** (demande de François) : une quantité en kilos seuls pour un circuit (« 5 kg ») compte maintenant pour une caisse de plus. Liste du 4/11 : patates douces 1 colis + 5 kg = 2 PH ; caisses rien de coché : 2 PB, 21 PH, 2 GB, 10 GH. `CACHE` → `recolte-v12`.
- Nouveau débouché « Panier La Magic » (caisses habituelles, pas de colis bois). Liste du 4/11 : 5 kg de patates douces et 1 colis de radis noir rond (PH, 5 kg, d'après le référentiel ; produit ajouté à la liste, sans emplacement puisque le lieu est masqué) pour lui. Liste : 183 kg ; caisses : 19 → 20 PH. Les 5 kg sont écrits en kilos, comme la commande : ils ne sont pas comptés dans les caisses.
- Le débouché « Paniers solidaires » devient « Panier adéquat » (liste du 4/11, référentiel, docs, test). Identifiant `ps` inchangé : les coches et les filtres gardés sur les téléphones restent valables. Pas de changement de l'appli, `CACHE` inchangé.
- **Lieu des récoltes masqué** (demande de François du 4/11) : plus d'emplacement sous les produits, plus de puces Tunnel / Plein champ / Stock, plus de zone dans la vue Détail. Les lieux venaient d'un assolement recopié à la main, pas d'Ouvre ta ferme. Rien n'est effacé : les champs `zone` et `ou` restent dans les listes, et `MONTRER_LIEU = true` dans `index.html` les réaffiche. Le bouton du bas « Remettre l'ordre par zone » est retiré (demande de François du 4/11) : l'ordre glissé reste jusqu'à la liste suivante, qui repart dans l'ordre du fichier. `CACHE` → `recolte-v11`. Test deux-téléphones : 28 vérifications (4 nouvelles).
- Liste du 4/11 : la Ferme Deschamps ajoute 1 colis de carottes lavées (PH, 8 kg, donc 1 moyen colis bois de 8 kg, d'après le référentiel). Carotte : 3 colis, 24 kg ; liste : 173 kg et 66 unités. Pas de changement de l'appli, `CACHE` inchangé.
- **Barre de progression** en haut de la liste (demande de François du 4/11) : « Récolté … % » avance à chaque coche, kilos et unités additionnés ; une flèche vers le bas déplie une barre pour les unités et une pour les kilos, avec ce qui reste. Lit le champ `kg` des lignes ; les tomates « tout » ne sont pas comptées. Liste du 4/11 : 165 kg et 66 unités.
- `sw.js` : `CACHE` passe à `recolte-v9`. Test deux-téléphones : 24 vérifications (7 nouvelles) ; le test fait maintenant défiler jusqu'à la liste avant le glisser-déposer, car la barre pousse la bette hors de l'écran du téléphone simulé.
- **Correctif colis bois** (remarque de François) : le colis bois garde le contenu de la caisse correspondante. L'appli l'écrit maintenant : « 1 petit colis bois de 10 bouquets », « 3,5 grands colis bois de 5 kg » (17,5 kg, comme en GH). Le filtre d'un circuit donne aussi le total en bouquets ou en bottes, plus seulement en kg. Quantités et comptes inchangés. `CACHE` → `recolte-v8`, test : 17 vérifications.
- **Colisage par débouché** : un circuit peut avoir son propre colisage (`colisages` et `circuits[].colisage` dans la liste). Paniers solidaires, Locavore et Ferme Deschamps sont en colis bois : PB → petit colis bois, PH → moyen colis bois, GB et GH → grand colis bois. Les colis bois sont comptés à part dans « Caisses » et nommés dans la vue Détail et le filtre du circuit.
- Liste du 4 novembre : nouveau circuit Ferme Deschamps, 1 colis de 10 bouquets de persil (petit colis bois). Caisses à remplir : 2 PB, 19 PH, 2 GB, 10 GH (au lieu de 14 GH : la bette des paniers passe en colis bois), plus 1 petit et 4 grands colis bois.
- Référentiel : colisage bois, circuits concernés, persil frisé en bouquet (10 par colis, PB), 74 produits.
- `sw.js` : `CACHE` passe à `recolte-v7`. Test deux-téléphones : 15 vérifications (4 nouvelles).

## 2026-11-03

- Ajout de `AGENTS.md` et des registres (`docs/ETAT_DU_PROJET.md`, `docs/ROADMAP.md`, `docs/DECISIONS.md`, `CHANGELOG.md`). `CLAUDE.md` renvoie vers `AGENTS.md`.
- La liste de la semaine passe désormais par une PR (README, `docs/format-liste.md`).
- README : appui long corrigé à 0,45 s (comme dans le code).
- Aucun changement du code de l'appli, `CACHE` reste `recolte-v6`.

## Avant (d'après `git log`)

- Un seul affichage : fond blanc, texte noir, même en mode sombre.
- Appui long pour déplacer une ligne, charte lisible en plein soleil.
- Zones réelles : Tunnel, Plein champ, Stock.
- Référentiel des conditionnements (73 produits), base Firebase partagée, documentation et test de bout en bout, première version de l'appli.
