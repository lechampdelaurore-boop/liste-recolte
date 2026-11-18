# Charte douce du module d'irrigation : comparaison et choix (18/11/2026)

Rien n'est appliqué au code. Source : `index.html` de liste-recolte (lu le 18/11), AGENTS.md, charte-module.md.

| Élément | Aujourd'hui (« plein soleil ») | Charte du module | Ce qui change |
|---|---|---|---|
| Polices | `system-ui` partout, aucune police hébergée | Bricolage Grotesque 300 (titres), DM Sans 500 (boutons, onglets), Open Sans (texte) | 3 polices à héberger chez nous (licence OFL) ; l'appli doit rester utilisable hors ligne |
| Fond | Blanc pur, blocs blancs | Page #f8f8f8, blocs blancs | Fond très légèrement gris |
| Traits | Bordures noires de 2 px, ombre pleine `0 3px 0 #000` | Bordures #ddd, ombre douce 0 4px 20px | Fini les gros traits noirs : contraste plus faible |
| Texte | Noir #000, secondaire #1f1f1f, « pas de gris clair » | #111, secondaire #5f5f5f | Texte secondaire plus clair |
| Rayons | 14 / 12 / 10 / 8 px, mélangés | 0,75 / 1 / 1,5 rem | Un jeu unique |
| Boutons | Vert #0a5a1c, bord noir, ombre pleine | Plein #0b694d ; secondaire contour vert sur #cce2d1 ; destructif rouge | Vert voisin, boutons plus doux |
| Onglets | 5 onglets en bas (téléphone), boutons à ombre sur ordinateur | Ordinateur : menu à gauche #e7f1ee. Téléphone : barre du haut anthracite + barre du bas à deux étages + 4 univers | Gros changement de navigation |
| Tableaux | Cartes à bordure noire | Lignes alternées, totaux en tuiles #e3f2ee | Grille, Cumul, Préparation |
| Couleurs d'état | Jaune #ffe680 pour les avertissements, rouge/vert forts | Succès #198754, attention #cb6503, danger #dc3545 | Palette plus sobre |
| Icônes | À vérifier (emojis éventuels) | Au trait, une couleur, 1,7 px | À inventorier |
| Taille du texte | Grande (gants, soleil) | 13 px ordinateur, 12 px téléphone | Plus petit sur téléphone |

## Points en conflit avec ce que le dépôt a déjà validé
1. AGENTS.md : « fond blanc, texte noir, traits épais, pas de gris clair, aucun mode sombre ». La charte demande #f8f8f8, bordures #ddd, texte secondaire #5f5f5f. Le mode sombre reste exclu dans les deux cas.
2. AGENTS.md : « gros éléments tactiles (usage au champ, au soleil, avec des gants) ». La charte dit 44 px minimum (déjà tenu : 44-48 px) mais texte à 12 px sur téléphone.
3. Couleurs PB/PH/GB/GH (#0a3d91, #004f57, #6e3900, #9e110a) et couleurs par débouché dans Répartir : la charte ne les prévoit pas ; à garder. Le bleu #0a3d91 de PB est proche du « bleu réservé à l'eau ».
4. Appui long 0,45 s, ordre de récolte, aucune donnée touchée : inchangés. C'est du CSS seul.
5. Deux fichiers à garder identiques : `index.html` et `magasin.html` (cloche, miniatures).

## Questions à poser, une par une (6)
1. Contraste « plein soleil » ou charte douce ?
2. Hébergement des trois polices.
3. Taille du texte sur téléphone.
4. Navigation (barre du haut anthracite, barre du bas à deux étages).
5. Icônes au trait à la place des emojis.
6. Couleurs des caisses et des débouchés, et usage du bleu.

## Multi-fermes
Aucune couleur ou police propre à Tronget : le nom de la ferme vient des réglages ; les jetons (couleurs, rayons) sont déclarés une fois en haut du CSS.

## Réponses de François
1. (18/11) Charte douce partout, téléphone et ordinateur ; sur téléphone, garder le texte principal très foncé et les boutons verts pleins.
2. (18/11) Polices hébergées dans le dépôt et mises en mémoire hors ligne : recommandation de Claude, François a passé à la question suivante sans objection.
3. (18/11) Texte courant 13 px partout ; noms de produits, quantités et boutons restent grands (au moins 16 px). François : « D'accord avec toi ».
4. (18/11) Navigation : barre du haut anthracite + barre du bas à 4 pages (pastille verte) sur téléphone, menu à gauche sur ordinateur, onglets de Semaine en haut du contenu ; François : « Ok, essayons comme ça ».
5. (18/11) Remplacer les 2 emojis (✓, 👤) par des icônes au trait, épaisseur 1,7 px partout ; François : « Ok ».
6. (18/11) Garder les couleurs des caisses et des débouchés en les adoucissant ; jamais de bleu sur un bouton ; bleu eau réservé à l'eau ; François : « Ok ».
