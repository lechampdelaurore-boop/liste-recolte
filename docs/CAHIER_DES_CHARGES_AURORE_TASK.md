# Cahier des charges : Aurore Task, l'outil de tâches qui remplace Google Tasks

*Rédigé le 18/11/2026 au soir, d'après la discussion avec François du même soir (fil « Concevoir l'outil qui remplace Google Tasks ») et la maquette qu'il a vue et corrigée : https://claude.ai/artifact/4GkXkkKoS8UQ8sVbgH5aNX (privée, visible par François). Remplace le plan du 17/11 (`docs/PLAN_TACHES.md`, PR #89, jamais fusionnée). **Documentation seulement : aucun code, rien dans la base, aucun service ouvert.***

*Ce document ne reprend rien de personnel (santé, démarches familiales) : le dépôt est public. Les exemples de tâches sont de la ferme ou inventés.*

## 1. En deux phrases

Aurore Task garde **exactement le fonctionnement de Google Tasks** que la ferme aime (une tâche se crée en un clic, tout se glisse, y compris d'une liste à l'autre) et y ajoute ce qui manque : de vrais encarts RDV / P1 / P2 dans les jours, des astreintes réparties d'un appui, des personnes en couleur, des listes verrouillées, des sous-tâches sur plusieurs niveaux et les rendez-vous de Google Agenda. Rien ne se fait tout seul : la ferme décide toujours du moment.

## 2. Pour qui, sur quoi

| Point | Choix de François (18/11) |
|---|---|
| Nom | **Aurore Task** |
| Qui | François, Aurore et Martin. **Un seul espace commun** : tout le monde voit tout, comme aujourd'hui (Martin voit déjà toutes les listes Google Tasks). Un espace privé par personne pourra venir plus tard, sans urgence. |
| Téléphone | Au travail : voir les tâches du jour, cocher, noter une idée en une ligne. |
| Ordinateur | Pour faire le planning de la semaine : les listes côte à côte, on glisse les tâches d'une colonne à l'autre. |
| Échéances, rappels, notifications | **Aucun** (Google Tasks ne s'en sert pas à la ferme). |
| Tâches terminées | **Effacées** : une tâche cochée disparaît. |
| Listes actuelles | **Retapées à la main** par François, pour faire le tri. Pas d'import depuis Google. |
| Installation | **S'installe sur le téléphone comme une appli**, comme l'outil du Cumul (demande de François du 18/11, 21 h 55) : icône « Aurore Task » sur l'écran d'accueil, ouverture en plein écran sans barre du navigateur, marche hors ligne. |

## 3. Priorité n° 1 : le fonctionnement de Google Tasks, à l'identique

François : « le premier point, que je ne veux pas changer sur Google Tasks, que je trouve très bien foutu ». Si une étape de code doit choisir entre une nouveauté et ces gestes, **les gestes gagnent**.

1. **Créer une tâche en un clic** : un « + » toujours visible ; la ligne s'ouvre, on écrit tout de suite ; « Entrée » enregistre et ouvre la ligne suivante (saisie en rafale, comme Google Tasks). Aucun champ obligatoire à part le texte.
2. **Glisser une tâche** pour la monter ou la descendre dans sa liste, **et d'une liste à l'autre**. Ses sous-tâches la suivent.
3. **Glisser les listes** pour changer leur ordre.
4. **Toutes les listes au même endroit.** Sur le téléphone, on passe de l'une à l'autre **en balayant l'écran** (gauche, droite), comme dans Google Tasks, ou en touchant son nom dans la bande des listes, en bas.
5. **Modifier le texte** d'une tâche en la touchant. Le texte n'est **jamais coupé** : une tâche longue tient sur plusieurs lignes.
6. **Cocher** d'un appui : la tâche disparaît (voir 5.2).

## 4. Les écrans

La maquette montre les quatre écrans ci-dessous (exemples inventés ou tirés des listes de la ferme).

### Téléphone

- **Barre du haut** anthracite, fine (36 px) : nom de la ferme (tiré des réglages, jamais écrit dans le code), bouton Google Agenda (étape 36D), avatar de la personne connectée.
- **Titre de la liste** à gauche ; à droite, le bouton « ⋯ » (menu de la liste) et le « + » vert rond (ajouter une tâche).
- **La liste** : encarts RDV / P1 / P2 pour les jours, liste simple pour les autres.
- **Bande des listes en bas** : tous les noms de listes, qui défilent ; la liste affichée en pastille verte. Pas de deuxième étage : les quatre pastilles d'univers d'Ouvre ta ferme (Production, Vente, Gestion, Paramètres) ont été **retirées à la demande de François** (elles ne mènent nulle part ici). Cette place pourra servir plus tard à passer d'un outil de la ferme à l'autre.
- **À l'ouverture**, l'appli affiche **la liste du jour** (le mercredi, « Mercredi »).
- **Glisser** : appui long (0,45 s, comme la liste de récolte), puis on déplace. Pour changer de liste en glissant : tenir la tâche contre le bord gauche ou droit de l'écran fait passer à la liste voisine. Le menu de la tâche propose aussi « Déplacer vers une autre liste ».
- **Menu d'une tâche** (bouton « ⋯ » de la ligne) : texte, pour qui, zone, couleur du texte, ajouter une sous-tâche, décaler à droite ou à gauche (sous-tâche ou non), déplacer vers une autre liste, ajouter un séparateur en dessous, supprimer.

### Ordinateur (fenêtre d'au moins 1000 px)

- **Menu à gauche** vert très pâle : Planning, Astreintes, Réglages ; puis « Listes affichées » avec une case par liste pour montrer ou cacher sa colonne (choix gardé sur l'ordinateur, pas partagé).
- **En haut** : « Répartir les astreintes » (bouton secondaire), « Mettre à jour les rendez-vous » (bouton outil), « Nouvelle liste » (bouton principal).
- **Les listes en colonnes côte à côte**, qui défilent de gauche à droite ; chaque colonne a son titre (qu'on attrape pour déplacer la colonne), son « ⋯ » et « Ajouter une tâche ».
- **Glisser à la souris**, d'une colonne à l'autre, avec un trait vert à l'endroit où la tâche va tomber. Glisser une tâche un peu vers la droite sous une autre en fait sa sous-tâche, comme dans Google Tasks.
- **Clic droit** sur une tâche : son menu (le même que sur le téléphone).

## 5. Les fonctions, une par une

### 5.1 Les listes

- **Sept listes « jour »** (Lundi à Dimanche), là dès le départ : elles servent chaque semaine, **sans date** (comme aujourd'hui). On ne peut pas les supprimer ; on peut les déplacer et, sur l'ordinateur, les cacher.
- **Autant de listes simples qu'on veut** (S+1, side quests, à suivre, travaux d'hiver, check-list marché, courses, RETEX…) : créer, renommer, supprimer (avec confirmation, et seulement… voir 5.10), déplacer.
- **Une liste « Astreintes »**, spéciale (5.8).
- **Menu « ⋯ » d'une liste** : renommer, ajouter un encart (RDV, P1 ou P2), verrouiller / déverrouiller, supprimer la liste ; pour Astreintes, en plus : « Répartir les astreintes ».

### 5.2 Les tâches

- Une tâche = **une ligne de texte**. Tout le reste est facultatif.
- **Cocher** : la tâche disparaît aussitôt ; un bandeau « Faite : … · Annuler » reste quelques secondes. Cocher une tâche coche aussi ses sous-tâches.
- **Filet de sécurité** (choix de Claude, à confirmer à l'essai) : une tâche cochée reste **7 jours** dans « Faites récemment » (menu « ⋯ » de la liste), d'où on peut la remettre ; ensuite elle est effacée pour de bon. Raison : trois personnes partagent les listes et un doigt glisse vite au champ.
- **Supprimer** (menu de la tâche) : comme cocher, sans le mot « Faite ».

### 5.3 Les sous-tâches, sur plusieurs niveaux

- Une tâche peut avoir des sous-tâches, qui peuvent avoir les leurs, **sans limite** (Google Tasks s'arrête à un niveau : c'est la demande de François).
- À l'écran, chaque niveau est décalé vers la droite ; au-delà de cinq niveaux, le décalage n'augmente plus (pour garder de la place sur le téléphone).
- Sur le téléphone : « Ajouter une sous-tâche » et « Décaler à droite / à gauche » dans le menu de la tâche. Sur l'ordinateur : glisser vers la droite ou la gauche, ou le menu.

### 5.4 Le séparateur

- Une simple ligne en tirets « ------ », sans texte, qu'on ajoute par le menu d'une tâche (« Ajouter un séparateur en dessous ») ou en tapant « ------ » comme texte d'une tâche. Il se glisse comme une tâche, se supprime par appui long (téléphone) ou clic droit (ordinateur). Il marche dans **toutes** les listes.

### 5.5 Les encarts RDV, P1, P2

- Ce sont de **vrais encarts**, plus de fausses tâches « - P1 - ». Dans l'ordre : **RDV** (à heure fixe, l'heure est un champ et s'affiche devant le texte, tâches classées par heure), **P1** (en priorité), **P2** (après les P1).
- **Par défaut, chaque jour a ses trois encarts.** Les autres listes n'en ont pas.
- **Ajouter** un encart : menu « ⋯ » de la liste, « Ajouter un encart : RDV, P1 ou P2 », un à la fois. Marche aussi pour une liste simple (S+1, par exemple).
- **Supprimer** un encart : **seulement s'il est vide, et seulement à la main** (bouton « Supprimer l'encart » sur un encart vide). Rien ne disparaît tout seul.
- Le « + » du titre d'un encart ajoute une tâche dedans ; le « + » du titre de la liste ajoute en haut de P1 (s'il n'y a pas de P1 : en haut de la liste).
- Choix de Claude, à confirmer : si « Répartir les astreintes » ou Google Agenda doivent poser une tâche dans un encart supprimé, **l'encart revient** pour l'accueillir.
- Les noms des encarts (RDV, P1, P2) sont un **réglage** (une autre ferme peut les appeler autrement) ; la ferme les garde tels quels.

### 5.6 Les personnes

- Une tâche est **non affectée par défaut** (« à faire en général »).
- Menu de la tâche (appui long ou « ⋯ » sur le téléphone, clic droit sur l'ordinateur) → « Pour qui ? » : tout le monde, ou une personne.
- **Tout le monde voit toutes les tâches.** Une tâche affectée porte un **rond de couleur avec l'initiale** de la personne, à droite. Rien d'autre ne change (pas de couleur sur le texte, demande de François).
- **Une couleur par personne**, réglable dans les Réglages. Au départ : **François rouge, Aurore rose, Martin bleu.**
- Les personnes (nom, initiale, couleur) sont un réglage : aucun prénom dans le code.

### 5.7 La couleur du texte

- Menu de la tâche → « Couleur du texte » : noir (par défaut), rouge, orange, vert, violet, gris. Pour l'organisation visuelle, au choix de chacun.

### 5.8 Les astreintes

- **La liste Astreintes contient les modèles** des tâches qui reviennent chaque semaine.
- **Le menu de chaque astreinte** permet de choisir **ses jours** (un ou plusieurs, de lundi à dimanche), **sa zone** (RDV avec son heure, P1 ou P2 ; P1 par défaut) et une case **« En pause »** (pour les astreintes de saison : endives l'hiver, courgettes l'été). Sous chaque astreinte, ses jours s'affichent en pastilles.
- **Menu « ⋯ » de la liste Astreintes → « Répartir les astreintes »** (aussi en bouton sur l'ordinateur) : **un appui, au moment choisi par la ferme** (en faisant le planning), recopie chaque astreinte dans chacun de ses jours, à la fin de sa zone, avec ses sous-tâches. **Jamais automatiquement.**
- **Pas de doublon** : si la même astreinte est déjà dans ce jour et pas cochée, elle n'est pas recopiée. Appuyer deux fois ne change rien.
- **Astreintes en pause** : ignorées.
- **Astreintes mensuelles** (« 1 fois par mois : compta ») : **pas de règle « une fois par mois »** ; on les glisse à la main le jour voulu (validé par François).
- Un bandeau dit ce qui a été fait : « 21 tâches posées, 4 déjà présentes, 1 en pause ignorée ».
- Une tâche venue d'une astreinte porte un petit signe « astreinte » ; elle se modifie, se déplace et se coche comme les autres, sans toucher au modèle.

### 5.9 Google Agenda (étape à part, 36D)

- **Bouton « Mettre à jour les rendez-vous de la semaine »**, appuyé quand la ferme le décide, **jamais automatiquement**.
- Il lit les rendez-vous **des 7 jours qui suivent** (à partir du lendemain) et range chacun dans l'**encart RDV de son jour**, avec l'heure et un petit signe « agenda ». Fait le vendredi, il remplit toute la semaine suivante.
- **Lecture seule** : l'agenda vers Aurore Task, jamais l'inverse.
- Rappuyer : ajoute les nouveaux rendez-vous, met à jour l'heure ou le titre de ceux qui ont changé, retire ceux annulés dans l'agenda (s'ils ne sont pas cochés) ; **ne touche jamais aux tâches écrites à la main**. Un rendez-vous supprimé à la main dans Aurore Task ne revient pas.
- **Comment** : Google donne à chaque agenda une « adresse secrète au format iCal » (un lien privé qui contient ses rendez-vous). Un petit programme sur Cloudflare, servi avec le site comme la porte de l'agent, lit ce lien et renvoie les rendez-vous, seulement à un compte de la ferme connecté. Le lien secret est **saisi par François lui-même** dans Cloudflare, jamais dans le dépôt. Gratuit. **Demande le « vas-y » de François** (service sur l'hébergeur).
- Rendez-vous sur la journée entière : dans RDV, sans heure. Rendez-vous répétés (chaque semaine…) : chaque occurrence de la semaine est prise.

### 5.10 Le verrou d'une liste

- Menu « ⋯ » de la liste → « Verrouiller la liste » : plus rien ne se coche, ne se glisse, ne se modifie ni ne s'ajoute ; les cases sont remplacées par des puces ; un bandeau le rappelle. « Déverrouiller » dans le même menu. Pour les check-lists que l'on consulte (check-list marché).
- Une liste verrouillée ne peut pas être supprimée (choix de Claude : il faut d'abord la déverrouiller).

## 6. Ce que l'outil ne fait pas (décidé le 18/11)

- **Pas de date d'échéance, de rappel ni de notification.**
- **Pas de « vider S+1 » ni de report automatique** des tâches non faites : la ferme les place elle-même « à des endroits intelligents ».
- **Pas de vue « Aujourd'hui »** qui mélange les listes : la liste du jour joue ce rôle.
- **Pas de référentiel des planches** ni de suivi par planche (« Suivi amendement » reste une liste de texte).
- **Pas de classement des RETEX** : ils restent en vrac, la ferme trie.
- **Pas d'import de Google Tasks** : les listes sont retapées à la main.
- **Gardé de côté** : « en attente de qui, depuis quand », l'export en texte, un espace privé par personne, les liens avec Ouvre ta ferme et le futur logiciel d'irrigation.

## 7. Charte graphique

**La charte d'origine du module d'irrigation**, pas la version ajustée pour le cumul (demande de François du 18/11, 21 h 37). En résumé :

- Polices hébergées dans le dépôt (déjà dans `polices/`, licence OFL) : titres Bricolage Grotesque léger (300), boutons, onglets et menus DM Sans (500), texte Open Sans. Texte courant 13 px sur ordinateur, 12 px sur téléphone pour le texte secondaire ; **texte des tâches 13 px au moins**.
- Feuille #f8f8f8, blocs blancs **sans bordure**, ombre douce 0 4px 20px rgba(0,0,0,.06) ; texte #111, secondaire #5f5f5f, filets #ddd ; rayons 0,75 / 1 / 1,5 rem (blocs 9,75 px, boutons 14,6 px).
- Boutons : principal vert plein #0b694d ; secondaire contour vert sur #cce2d1 ; outil contour #373737 ; destructif rouge (#dc3545, texte #8f1d2a sur #fbe5e8). Jamais de bleu sur un bouton. Cibles d'au moins 44 px sur téléphone.
- Étiquettes en pilule : RDV bleu pâle (« info » #e1eaff, texte #2a3f8a), P1 orange pâle (#fbe6cf, texte #8a4302), P2 gris (#f2f2f5, texte #373737).
- Cases à cocher **carrées** (celles du module), pas les ronds de Google Tasks (montré sur la maquette, sans remarque de François).
- Icônes au trait, une couleur, 1,7 px ; pas d'emoji.
- Téléphone : barre du haut anthracite #373737 de 36 px ; bande des listes en bas (pastille verte). Ordinateur : menu à gauche #e7f1ee, entrée choisie en vert plein. Aucun mode sombre.

## 8. Technique (choix de Claude sur délégation de François du 8/11, notés dans `docs/DECISIONS.md`)

- **Où ça vit** : une page autonome **`taches.html`** dans ce dépôt, servie par le même site Cloudflare Pages (https://liste-recolte.pages.dev/taches), avec **les mêmes comptes** que la liste de récolte. Pas de nouvel hébergeur, pas de coût. Son propre manifeste, pour l'installer comme une appli à part (« Aurore Task ») sur l'écran d'accueil. Comme `magasin.html`, elle recopie le code de connexion ; `AGENTS.md` notera cette deuxième exception à « tout dans `index.html` » dans la PR de l'étape 36A.
- **Données** : un nœud à part, **`taches/`**, et non sous `listes/` : ainsi le futur compte de Martin pourra ouvrir les tâches **sans** ouvrir la répartition des ventes. Cela demande **une règle de base de plus** dès l'étape 36A (profil « ferme » : lecture et écriture de `taches/`) : sauvegarde d'abord, texte préparé par Claude, publié par François ou sur son autorisation écrite, comme le 12/11.
- **Esquisse des données** (à affiner en codant) :
  - `taches/reglages` : personnes (nom, initiale, couleur), noms des encarts, nom de la ferme affiché.
  - `taches/listes/<id>` : nom, type (`jour` avec son numéro de jour, `simple`, `astreintes`), ordre, encarts présents, verrou (qui, quand).
  - `taches/t/<id>` : liste, encart, tâche mère (sous-tâche), ordre, texte, séparateur, heure, pour qui, couleur du texte, origine (astreinte ou rendez-vous de l'agenda), qui et quand ; pour une astreinte : jours, zone, heure, en pause.
  - `taches/faites/<id>` : les tâches cochées des 7 derniers jours (5.2).
  - Ordre par nombres à virgule (on glisse une tâche entre deux autres sans réécrire toute la liste).
- **Partage en direct** entre les téléphones par un seul flux pour tout `taches/` (un téléphone ne garde que six connexions à la fois vers la même adresse : pas de flux de plus).
- **Hors ligne** au champ, comme la liste de récolte (étape 21) : copie gardée sur le téléphone, actions en attente envoyées au retour du réseau, « la dernière action gagne », pastille « Hors ligne · N changements en attente ».
- **Plusieurs fermes** (règle 15 du projet) : rien de propre au Champ de l'Aurore dans le code. Nom de la ferme, personnes, couleurs, noms des encarts, listes : tout vient des réglages. Les listes de départ se limitent aux sept jours et à « Astreintes ».

## 9. Étapes de réalisation

Le code se fait dans un seul fil à la fois, dans l'ordre. Chaque étape se termine par ses tests (un `tests/taches.cjs` dès la première, deux téléphones et un ordinateur simulés, hors ligne compris), les registres à jour, et l'essai de François avant la suivante.

| N° | Contenu | Modèle · effort | Accord de François |
|---|---|---|---|
| 36A | **Socle** : page `taches.html` installable comme une appli (icône à part), connexion, règle `taches/` ; sept jours et listes simples (créer, renommer, supprimer, déplacer) ; tâches (ajout en un clic et en rafale, modifier, cocher avec « Annuler », « Faites récemment »), sous-tâches sur plusieurs niveaux, séparateur ; glisser dans et entre les listes, déplacer les listes ; téléphone (balayage, bande des listes, ouverture sur le jour, appui long) et ordinateur (colonnes, menu à gauche, clic droit) ; hors ligne, partage en direct ; charte d'origine | Opus 5.5 · Élevé | « Vas-y » pour coder ; sauvegarde puis publication de la règle `taches/` |
| 36B | **Encarts RDV / P1 / P2** (heure des RDV, ajout et suppression à la main) ; **personnes** en couleur et « Pour qui ? » ; **couleur du texte** ; **verrou** de liste ; écran Réglages (personnes, couleurs, noms des encarts, nom de la ferme) | Opus 5.5 · Moyen | « Vas-y » pour coder |
| 36C | **Astreintes** : jours, zone, heure, « En pause », « Répartir les astreintes » sans doublon | Opus 5.5 · Élevé | « Vas-y » pour coder |
| 36D | **Google Agenda** : petit programme sur Cloudflare, bouton « Mettre à jour les rendez-vous de la semaine » | Opus 5.5 · Élevé | « Vas-y » exprès (service sur l'hébergeur) ; adresse secrète de l'agenda saisie par François dans Cloudflare |
| 36E | **Compte de Martin** : un profil « équipe » qui ouvre les tâches seulement | Opus 5.5 · Moyen | « Vas-y » exprès (ouverture d'accès) ; règle publiée par François |

36A est la plus grosse ; elle peut se faire en deux PR (téléphone, puis ordinateur) si le fil le juge plus sûr, sans changer l'ordre.

## 10. Ce qui sera vérifié à chaque étape (critères de réception)

- **Rapidité de saisie** : ajouter une tâche sur le téléphone en **2 appuis** plus le texte (« + », écrire, « Entrée ») ; mesuré dans le test et à l'essai de François.
- **Glisser** : dans une liste, entre deux listes (téléphone et ordinateur), une tâche avec ses sous-tâches, l'ordre des listes ; vérifié sur deux téléphones simulés (l'autre voit le changement) et après rechargement.
- **Cocher** : disparition, « Annuler », sous-tâches cochées avec la mère, « Faites récemment » pendant 7 jours.
- **Hors ligne** : changements faits sans réseau, envoyés au retour, sans doublon.
- **Encarts** : trois par défaut dans les jours ; suppression refusée s'il reste une tâche ; ajout par le menu.
- **Astreintes** : répartition exacte (bons jours, bonne zone), aucun doublon au deuxième appui, « En pause » ignorée.
- **Verrou** : rien de cliquable ni de glissable dans une liste verrouillée.
- **Google Agenda** : sur un faux agenda de test (jamais le vrai dans les tests) : ajout, mise à jour, annulation, rendez-vous répétés, journée entière.
- **Charte** : un test qui vérifie les jetons de la charte d'origine (comme `tests/charte.cjs` pour le cumul).
- **Installation** : la page s'installe sur l'écran d'accueil (manifeste et icône à elle, distincts du Cumul), s'ouvre en plein écran et hors ligne.
- La liste de récolte ne change pas : toute sa suite de tests reste verte.

## 11. Non vérifié, à confirmer

- **Non vérifié** : le délai avec lequel Google met à jour l'« adresse secrète au format iCal » après un changement dans l'agenda (de quelques minutes à quelques heures, selon des connaissances à revérifier à la source avant l'étape 36D). Quel agenda (ou quels agendas) lire : à demander à François au moment de l'étape 36D.
- **Non vérifié** : que le balayage entre listes et l'appui long pour glisser ne se gênent pas sur les vrais téléphones (à l'essai de 36A).
- **Non vérifié** : la lisibilité de la charte d'origine (texte secondaire 12 px, sans bordure) au soleil sur les vrais téléphones.
- **À confirmer à l'essai** (choix de Claude) : le filet « Faites récemment » de 7 jours ; l'encart supprimé qui revient pour une astreinte ou un rendez-vous ; le « + » de la liste qui ajoute en haut de P1 ; le nœud `taches/` à part ; une liste verrouillée qu'on ne peut pas supprimer.
- La maquette est **privée** : seul François peut l'ouvrir tant qu'il ne la partage pas.
