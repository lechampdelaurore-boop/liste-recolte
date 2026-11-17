# Plan : un outil de tâches qui remplace Google Tasks (étapes 36 et 38 à 46)

*Rédigé le 17/11/2026, à la demande de François (cahier « Google Tasks : usage réel et besoins », capture du 2/11). **Étude seulement : aucun code, rien dans la base, aucun service ouvert.** Les choix de conception sont à confirmer à l'essai ; cinq questions de fait restent pour François (fin du document), une à la fois.*

*Ce plan ne reprend rien de personnel du cahier (santé, démarches familiales) : le dépôt est public. Les exemples de tâches sont de la ferme ou inventés.*

## En deux phrases

Une page de tâches, dans le même site et avec les mêmes comptes que la liste de récolte, où **ajouter une tâche tient en une ligne de texte, en un geste**, et où le reste (jour, zone RDV / P1 / P2, personne, « en attente », emplacement) est facultatif. Les astreintes se posent toutes seules dans les jours, au lieu d'être recopiées chaque semaine.

## Ce qui marche aujourd'hui et qu'il faut garder

D'après le cahier, François a choisi Google Tasks parce que le planning d'Ouvre ta ferme demande trop de clics (type de tâche obligatoire). Il y note **tout** (ferme et foyer mêlés) pour libérer la tête. À garder à tout prix :

1. **Une ligne = une tâche**, sans champ obligatoire, au téléphone.
2. **Ferme et foyer dans le même outil**, avec possibilité de masquer le privé quand on montre l'écran.
3. **Une liste par jour, week-end compris**, découpée en trois zones : RDV (heure précise), P1 (en priorité), P2 (après les P1).
4. **Des listes sans date** : petites et grosses « side quests », « à suivre », travaux d'hiver, visites techniques, retours d'expérience (RETEX), à commander, check-list marché, courses.
5. **Une boîte « S+1 »** : on y note dans la semaine ce qu'il faudra faire la semaine suivante.
6. **Des sous-tâches.**

## Ce qui manque et que l'outil apporte

| Irritant dans le cahier | Réponse de l'outil |
|---|---|
| Astreintes recopiées à la main dans 7 listes chaque semaine | **Modèles récurrents** : l'appli pose elle-même la tâche dans le bon jour (chaque mardi, lundi-mercredi-vendredi, mardi à vendredi, une fois par mois, seulement en saison) |
| Le planning « S+1 » du vendredi saute souvent | **Assistant « Préparer la semaine »**, court : vider S+1 dans les jours, voir les astreintes posées, reporter ce qui n'a pas été fait |
| Tâches qui glissent d'un jour à l'autre sans trace | **Report visible** (« reportée de lundi ») |
| « En attente de… » écrit dans le titre | **État « en attente »** : de qui, depuis quand, relance |
| Qui fait quoi écrit dans le titre | **Personne** (François, Aurore, Martin…) et une vue par personne |
| Planches et blocs en texte libre, 178 tâches terminées sans date utile | **Référentiel d'emplacements** et listes de suivi par planche avec la date de réalisation |
| Titres longs coupés, listes longues non affichables en entier | **Texte jamais coupé**, page qui défile en entier, export en texte ou markdown |
| RETEX non exploitables | RETEX classés **par culture et par mois** |
| Pas de vue « aujourd'hui » toutes listes confondues | **Vue « Aujourd'hui »** : les tâches du jour, quelle que soit leur liste |

## Où ça vit : une page autonome, même base

**Proposition : `taches.html`**, une page autonome, comme `magasin.html` : même site Cloudflare Pages, même connexion par compte, même base Firebase, mêmes règles de style (charte « plein soleil », gros éléments tactiles, hors ligne). Raisons :

- `index.html` fait déjà tout l'écran de la récolte, avec quatre onglets fixes voulus par François ; un cinquième onglet de tâches alourdirait un écran fait pour le champ.
- Les tâches n'ont pas les mêmes utilisateurs : Martin, par exemple, verrait ses tâches sans voir la répartition des ventes.
- Une page qui se développe seule ne risque pas de casser la liste de récolte, utilisée chaque semaine.

Un lien « Tâches » depuis la liste de récolte et un retour en arrière suffisent. Conséquence pour les règles du dépôt : `AGENTS.md` aura une deuxième exception à « tout dans `index.html` » (la connexion est recopiée comme pour `magasin.html`).

**Pas de nouveau service, pas de coût.** Les tâches s'écrivent sous `listes/taches/…`, c'est-à-dire sous le nœud que le profil « ferme » lit et écrit déjà : **aucune règle de base à changer pour le socle**. (Seul le « privé par compte », étape 45, demandera des règles ; voir plus bas.)

## Les données (esquisse, à affiner en codant)

Tout est facultatif sauf le titre. Une tâche est un petit objet sous `listes/taches/t/<identifiant>` :

| Champ | Sens |
|---|---|
| `t` | le titre, une ligne de texte (seul champ obligatoire) |
| `liste` | l'identifiant de sa liste (voir plus bas) ; vide = « Boîte de réception » |
| `jour` | date AAAA-MM-JJ si elle est prévue un jour précis |
| `zone` | `rdv`, `p1` ou `p2` (vide = sans zone) |
| `heure` | HH:MM, surtout pour les RDV |
| `parent` | identifiant de la tâche mère (sous-tâche) |
| `pour` | personne (identifiant d'une personne des réglages) |
| `etat` | `ouverte`, `faite` ou `attente` |
| `attente` | `{ de, depuis, relance }` quand l'état est « attente » |
| `lieu` | identifiant d'un emplacement du référentiel (bloc, serre, planche) |
| `modele` | identifiant du modèle récurrent qui l'a posée, le cas échéant |
| `fait` | `{ par, a }` : qui l'a terminée et quand |
| `reportee` | date d'origine si elle a été reportée |
| `ordre` | position dans sa liste ou sa zone |
| `prive` | vrai pour une tâche du foyer (voir « Le privé ») |

**Listes** (`listes/taches/listes/<id>`) : nom, type, ordre, couleur. Trois types :
- **Jour** (générée : une vue par date, week-end compris, pas une liste à créer chaque semaine) ;
- **Sans date** (side quests, à suivre, travaux d'hiver, visites, à commander, check-list, courses…) ;
- **Suivi par emplacement** (type « Suivit amendement » : une ligne par planche, avec la date de réalisation, pour voir d'un coup d'œil ce qui est fait et à faire).

**S+1** n'est pas un jour : c'est une liste spéciale « Semaine prochaine » que l'assistant vide dans les jours le vendredi.

**Réglages d'une ferme** (modifiables dans l'outil, sans code) : les personnes, les listes, les noms et libellés des zones, les emplacements, les modèles récurrents. Rien de propre au Champ de l'Aurore dans le code : ses listes (Lundi… Dimanche, Astreintes, side quests, etc.), ses blocs et ses abréviations (S, C, N, A, G) sont un **jeu de départ** dans `referentiel/taches-depart.json`, comme `referentiel/debouches.json`, à charger ou à ignorer. Une autre ferme choisira ses propres listes et sa propre échelle de priorités.

## Les récurrences, sans serveur

Un **modèle** dit : titre, liste ou zone, heure, jours (`lun, mer, ven`, `mar à ven`, « le 1er du mois », « chaque 1er juin »), période de l'année (« de novembre à mars »), personne. À l'ouverture de la page (et pas de serveur), l'appli pose les tâches des jours à venir (par exemple les 14 prochains jours) avec un **identifiant fixe** tiré du modèle et de la date : si deux téléphones s'ouvrent en même temps, ils écrivent la même tâche, pas deux. Une tâche posée mais effacée ou terminée ne se repose pas. Le modèle « Astreintes » du cahier (42 tâches) est le premier test.

Les modèles à compléter à la pose (les « TDS : », « Plantations : » du cahier) sont des tâches **à compléter** : le titre est posé avec la mention, la personne n'a qu'à écrire la suite.

## Le privé

Le cahier mêle volontairement ferme et foyer. Deux niveaux, à ne pas confondre :

1. **Masquer à l'écran** (étape 40) : un bouton « Cacher le privé » pour quand on montre l'écran. Affichage seulement ; les données restent lisibles par tous ceux qui ont accès aux tâches.
2. **Vraiment privé** (étape 45) : les tâches privées sont rangées sous un chemin propre à chaque compte (`taches-privees/<compte>`), que seul ce compte lit. **Demande une règle de base de plus : sauvegarde avant, règles publiées par François lui-même, « vas-y » exprès.** À faire avant tout accès donné à une autre personne que François et Aurore (Martin, une autre ferme).

Tant que le niveau 2 n'existe pas, recommandation : ne pas mettre de choses sensibles (santé, démarches) dans l'outil.

## Écrans (téléphone d'abord)

1. **Aujourd'hui** : les tâches du jour par zone RDV / P1 / P2, les retards en haut, un grand « ＋ » toujours visible. Cocher d'un appui, comme la liste de récolte. Une tâche tapée ici sans rien d'autre prend le jour affiché.
2. **Semaine** : sept jours (lundi au dimanche, numéro ISO comme ailleurs dans l'appli), une ligne par jour avec son nombre de tâches ; plier et déplier ; la boîte « Semaine prochaine ».
3. **Listes** : les listes sans date et les suivis par emplacement, toujours lisibles en entier.
4. **Boîte de réception** : tout ce qui a été saisi sans liste ni jour.
5. **Préparer la semaine** (assistant du vendredi) : trois pas, chacun court : vider la boîte « Semaine prochaine » dans les jours ; voir les astreintes posées ; reporter ce qui n'a pas été fait.
6. **Réglages** : listes, personnes, zones, emplacements, modèles récurrents (repliés comme l'onglet Réglages de la récolte).
7. **Export** : une liste ou tout, en texte ou markdown.

**Saisie en un geste** : une ligne de texte, un bouton. Les raccourcis écrits dans le titre comme François le fait aujourd'hui (« Mardi 13h : mercuriale ») sont **compris au passage, jamais obligatoires** : l'appli propose de ranger la tâche au mardi à 13 h, et un seul appui accepte ou garde le texte tel quel. Dictée à la voix : le clavier du téléphone suffit.

**Les tâches terminées** ne s'effacent pas : elles restent avec leur date et la personne, repliées dans une section « Faites », archivées par semaine. C'est ce qui donne la traçabilité par planche qui manque aujourd'hui.

## Ce que l'outil ne fera pas (au début)

- **Pas d'irrigation** : le tour d'eau (« B10 2h A S ») viendra du futur logiciel d'irrigation. La liste provisoire « Tour d'irrig » se migre telle quelle.
- **Pas de rappel ni de notification** avant l'étape 26 de la roadmap (Web Push, service sur l'hébergeur, « vas-y » exprès).
- **Pas de lien avec Ouvre ta ferme** avant d'avoir vérifié ce que leur outil permet (étape 46, recherche). À confirmer : une API ou un export du planning hebdomadaire existe-t-il ? Si une lecture est faite un jour : au plus 4 requêtes par seconde, clé saisie par François seul.
- **Pas de lien avec Google Agenda** au début : les RDV propres à l'outil restent dans l'outil ; un lien (lecture, puis éventuellement écriture) est une piste de l'étape 46.
- **Pas de partage avec l'extérieur** (Très Allier, Auvabio) pour les tâches : le cahier n'en parle pas.
- **Pas d'API Google Tasks** (identifiants Google, secret à saisir, service tiers) : voir l'étape 44.

## Reprise des listes actuelles (étape 44)

Une seule fois, **sans API Google** : François exporte ses listes (Google Takeout, un fichier) et l'outil les importe, sauf les listes qu'il écarte (le foyer, si besoin). Chaque ligne d'une liste devient une tâche ; les séparateurs « - RDV - », « - P1 - », « - P2 - » deviennent des zones ; « Astreintes » devient une liste de **modèles proposés** (François valide un par un, rien ne se pose seul) ; le jour et l'heure écrits dans les titres sont **proposés**, pas devinés. **Vraies données : « vas-y » exprès et copie de l'export gardée par François avant.**

## Étapes proposées pour la feuille de route

Le code se fait dans un seul fil à la fois (règle 17 du projet), donc dans l'ordre. **Le socle (39) est la première étape à lancer**, après les réponses de François aux deux premières questions. Modèles et efforts : `docs/ROADMAP.md`, lignes 36 et 38 à 46.

| N° | Contenu | Pourquoi dans cet ordre |
|---|---|---|
| 38 | Les cinq questions de fait à François | Sans code, ne bloque pas le socle |
| 39 | **Socle** : page `taches.html`, connexion, boîte de réception, listes sans date, ajout en une ligne, sous-tâches, fait / défait, texte entier, export | C'est le cœur : si la capture n'est pas plus rapide que Google Tasks, le reste ne sert à rien |
| 40 | **Jour et semaine** : zones RDV / P1 / P2 avec heure, vue Aujourd'hui, vue Semaine, « Semaine prochaine », report visible, bouton « Cacher le privé » | Remplace les sept listes jour |
| 41 | **Récurrences** : modèles, pose automatique sans doublon, assistant « Préparer la semaine » | Le plus gros gain attendu (fin du copier-coller) |
| 42 | **Personnes et attente** : « pour » et vue par personne, état « en attente de » avec relance | Remplace « À suivre » ; l'accès de Martin demandera un « vas-y » (ouverture d'accès) |
| 43 | **Emplacements et suivis** : référentiel (blocs, serres, planches), listes de suivi par planche avec date, RETEX par culture et par mois | Remplace « Suivit Amendement » et « RETEX » |
| 44 | **Reprise des listes Google Tasks** (une fois, par fichier) | En dernier parmi les fonctions, pour ne pas migrer avant d'avoir essayé |
| 45 | **Privé par compte** (règles de base) | Avant tout accès d'une autre personne ; peut se faire plus tôt si François le demande |
| 46 | **Liens** (recherche seulement) : Ouvre ta ferme (import du planning hebdomadaire), Google Agenda, logiciel d'irrigation | Rien à coder tant que ce n'est pas vérifié à la source |

Chaque étape de code se termine comme les autres : tests (un `tests/taches.cjs` ajouté dès le socle, deux téléphones et un ordinateur simulés, hors ligne), registres à jour, essai de François avant l'étape suivante. **Rien de ce plan ne touche aux vraies données avant l'étape 44** (et le socle ne lit ni n'écrit rien de la liste de récolte).

## Ce qui n'est pas vérifié

- Tout le contenu du cahier vient d'une transcription de captures ; les titres coupés par « … » n'ont pas été lus en entier.
- Que Google Tasks propose un export lisible par l'outil (Google Takeout : connaissance à revérifier à la source avant l'étape 44).
- Qu'on puisse saisir aussi vite qu'aujourd'hui : à mesurer à l'essai du socle (nombre d'appuis pour ajouter une tâche sur le vrai téléphone de François).
- La consommation du téléphone et le temps de chargement avec des milliers de tâches terminées (178 dans un seul suivi aujourd'hui) : à tester avec des données inventées.

## Questions pour François (une à la fois, numérotées sur le total)

Les choix de conception sont pris par Claude (délégation du 8/11) et notés dans `docs/DECISIONS.md`. Il ne reste que des **faits que seul François connaît** :

1. **Qui s'en sert ?** François seul, ou aussi Aurore, Martin ? Les listes Google sont-elles sur un compte commun ? *Recommandation : François et Aurore d'abord, Martin plus tard avec sa vue « mes tâches » (ouverture d'accès, « vas-y » exprès).*
2. **Sur quels appareils ?** Téléphone, ordinateur, les deux ? *Recommandation : téléphone d'abord, ordinateur ensuite (grille de la semaine).*
3. **Les dates d'échéance, rappels ou notifications de Google Tasks sont-ils utilisés ?** *Recommandation : pas de rappel au début ; on y reviendra avec l'étape 26.*
4. **Les tâches terminées : gardées ou effacées en fin de semaine ?** *Recommandation : gardées, repliées, archivées par semaine.*
5. **Qu'est-ce qui manque ou, au contraire, est inutile dans la liste de besoins ci-dessus ?** Aucune liste de souhaits explicite dans le cahier, à part « Dév un planning mieux ». *Recommandation : lancer le socle sans attendre cette réponse.*
