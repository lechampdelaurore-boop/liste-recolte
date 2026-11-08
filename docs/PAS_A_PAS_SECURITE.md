# Pas-à-pas : fermer la base par des comptes (étape 5)

*Écrit le 8/11/2026 avec le code de l'étape 5. À faire par François lui-même, dans l'ordre, sur l'ordinateur. Claude ne voit jamais ni les mots de passe, ni la clé web, ni la sauvegarde.*

**Fait le 8/11/2026 au soir** (base fermée à 20 h 55). Ce qui a été appris sur la vraie console est noté ci-dessous ; à reprendre tel quel pour une autre ferme ou pour recréer un compte.

## En deux phrases

Aujourd'hui, toute personne qui connaît l'adresse de la base peut lire et modifier les listes. Après ces huit actions, seuls les comptes que vous créez, avec le profil « ferme », y ont accès ; un téléphone se connecte une seule fois.

## Ce qu'il faut savoir avant de commencer

- **L'ordre compte.** Tant que l'action 7 (les règles) n'est pas faite, rien ne change pour la ferme : la base reste ouverte et les téléphones marchent comme avant. Après l'action 5, les téléphones demandent de se connecter une fois.
- **Retour arrière en une minute** : si quelque chose ne va pas après l'action 7, recoller les anciennes règles (`docs/regles-base/ouvertes.json`, plus bas) et publier. Tout remarche comme avant.
- **Identifiant sans vraie adresse** : un compte s'appelle par exemple `francois@ferme.invalid`. Ce n'est pas une adresse électronique : elle ne reçoit rien, et `.invalid` est un nom réservé qui n'appartient à personne. Sur le téléphone, on tape seulement `francois`, l'appli ajoute le reste.
- **Mot de passe oublié** : Firebase ne peut pas l'envoyer (pas de vraie adresse). On supprime le compte dans la console et on le recrée, puis on refait l'action 4 pour ce compte.
- Les noms des boutons de la console Firebase peuvent varier un peu selon la langue ; ceux ci-dessous sont ceux de la console en français.

## Action 1 : la sauvegarde (avant tout le reste)

1. Ouvrir https://console.firebase.google.com, choisir le projet de la liste de récolte.
2. Menu de gauche : **Realtime Database**, onglet **Données**.
3. En haut à droite du cadre des données : le bouton **⋮** (trois points), puis **Exporter JSON**.
4. Un fichier `.json` se télécharge. Le garder sur l'ordinateur (par exemple dans un dossier « Sauvegardes liste de récolte », avec la date). **Ne pas l'envoyer à Claude, ne pas le mettre sur GitHub** : il contient les vraies données de la ferme.

## Action 2 : activer la connexion par identifiant et mot de passe

1. Menu de gauche : **Authentication** (sous « Créer » ou « Build »). S'il y a un bouton **Commencer**, cliquer dessus.
2. Onglet **Sign-in method** (ou **Mode de connexion**).
3. Choisir **Adresse e-mail/Mot de passe**, cocher **Activer** (la première case seulement, pas « Lien envoyé par e-mail »), puis **Enregistrer**.
4. Si la page **Paramètres** de l'onglet propose « Autoriser la création de comptes » (*Enable create (sign-up)*), la décocher : ainsi, personne ne peut se créer de compte seul. Sur la vraie console (8/11), on a décoché la création **et la suppression** de compte par l'utilisateur. Si la case n'existe pas, ce n'est pas grave : un compte créé par quelqu'un d'autre n'a pas le profil « ferme » et la base le refuse (vérifié sur l'émulateur de Firebase).

## Action 3 : créer les comptes

1. Toujours dans **Authentication**, onglet **Users** (ou **Utilisateurs**), bouton **Ajouter un utilisateur**.
2. Adresse : `francois@ferme.invalid`. Mot de passe : à choisir par vous (au moins 6 caractères). **Ajouter un utilisateur**.
3. Recommencer pour `aurore@ferme.invalid`, avec un autre mot de passe.
4. Noter les mots de passe à l'abri (carnet, gestionnaire de mots de passe). Ne jamais les écrire à Claude.

*Vérifié le 8/11* : la vraie console accepte la fin `@ferme.invalid`.

## Action 4 : donner le profil « ferme » à chaque compte

Le profil dit à la base qui fait partie de la ferme. Sans lui, un compte est refusé.

1. Dans **Authentication**, onglet **Users** : à côté de chaque compte, la colonne **UID utilisateur** (une suite de lettres et de chiffres). Survoler la case : une petite icône permet de la copier.
2. Aller dans **Realtime Database**, onglet **Données**.
3. Survoler la toute première ligne (l'adresse de la base) : un **+** apparaît. Cliquer dessus.
4. Clé : `profils`. Ne rien mettre dans Valeur, et cliquer sur le **+** au bout de la ligne : une ligne en dessous apparaît.
5. Dans cette ligne : Clé = l'UID de François (collé), Valeur = `ferme` (sans guillemets). Cliquer sur **Ajouter**.
6. Survoler la ligne `profils` qui vient d'apparaître, cliquer sur son **+**, et faire de même pour l'UID d'Aurore, valeur `ferme`.
7. Vérifier : sous `profils`, deux lignes, chacune « UID : "ferme" ».

Ne rien toucher d'autre dans les données (surtout pas `listes`).

## Action 5 : coller la clé web dans l'appli

La clé web n'est pas un mot de passe (elle est faite pour être publique), mais la règle du projet est que Claude ne la voit ni ne l'écrit.

1. Console Firebase : roue dentée **⚙** en haut à gauche, **Paramètres du projet**, onglet **Général**. Copier la **Clé API Web**. *Vu le 8/11* : si la ligne n'apparaît pas, c'est que le projet n'a pas encore d'**application Web** : en bas de la même page, « Vos applications », bouton **</>** (Web), un nom (par exemple « liste-recolte »), sans cocher Firebase Hosting, **Enregistrer l'application** ; la clé apparaît alors (`apiKey`).
2. Sur GitHub, ouvrir le dépôt `liste-recolte`, le fichier `cle-web.js`, puis le crayon (**Edit this file**).
3. Dans la dernière ligne, coller la clé **entre les deux apostrophes** : `window.RECOLTE_CLE_WEB = 'la-clé-ici';`. Ne rien changer d'autre.
4. Bouton **Commit changes…**, choisir **Create a new branch for this commit and start a pull request**, puis **Propose changes** et **Create pull request**.
5. Fusionner vous-même cette PR (**Merge pull request**, puis **Confirm merge**) : Claude ne l'ouvre pas, pour ne pas voir la clé. Dire ensuite à Claude « clé collée » : il vérifie que le site est bien redéployé, sans lire la clé.

À partir de là, les téléphones demandent de se connecter (action 6). La base est encore ouverte.

## Action 6 : se connecter sur les deux téléphones

1. Ouvrir https://liste-recolte.pages.dev (recharger la page si elle était déjà ouverte).
2. La fenêtre **Se connecter** s'ouvre. Identifiant : `francois` (ou `aurore`), puis le mot de passe. **Se connecter**.
3. Vérifier que la pastille en haut dit **Partagé**, et qu'une coche passe bien d'un téléphone à l'autre.
4. Dans **Réglages**, page **Compte** : on voit l'identifiant et le numéro du compte (le même que l'UID de l'action 4).

La connexion reste sur le téléphone, même sans réseau. On ne la refait qu'après « Se déconnecter » ou un changement de mot de passe.

## Action 7 : fermer la base (les règles)

1. Console Firebase, **Realtime Database**, onglet **Règles**.
2. Avant de changer : sélectionner tout le texte actuel et le copier dans un fichier sur l'ordinateur (c'est le retour arrière ; il doit ressembler aux « anciennes règles » plus bas).
3. Effacer tout le texte et coller exactement les **nouvelles règles** ci-dessous, puis **Publier**. *Vu le 8/11* : si la console affiche « Parse error » en ligne 1, c'est que l'ancien texte est resté au-dessus du collage ; l'effacer pour qu'il ne reste que les nouvelles règles, puis publier.

Nouvelles règles (`docs/regles-base/fermees.json` à l'époque ; depuis l'étape 13C, ce texte est dans `docs/regles-base/fermees-sans-magasin.json` et `fermees.json` ajoute le magasin, voir `docs/PAS_A_PAS_MAGASIN.md`) :

```json
{
  "rules": {
    "listes": {
      ".read": "auth != null && root.child('profils').child(auth.uid).val() === 'ferme'",
      ".write": "auth != null && root.child('profils').child(auth.uid).val() === 'ferme'"
    }
  }
}
```

Anciennes règles, pour revenir en arrière (`docs/regles-base/ouvertes.json`) :

```json
{
  "rules": {
    "listes": {
      ".read": true,
      ".write": true
    }
  }
}
```

## Action 8 : vérifier

1. Sur les deux téléphones : la pastille dit toujours **Partagé**, une coche passe de l'un à l'autre. Si un téléphone dit **Compte sans accès** : dans **Réglages**, page **Compte**, comparer le numéro du compte avec la ligne de `profils` (action 4) et corriger la console ; le téléphone repasse à « Partagé » tout seul en moins d'une minute.
2. Sur l'ordinateur, dans une fenêtre de navigation privée, ouvrir l'adresse de la base suivie de `/listes.json` (adresse dans `config.js`). Il doit s'afficher `"Permission denied"` (accès refusé). Avant l'action 7, cette même adresse montrait les listes.
3. Dire à Claude « règles collées » : il refait la vérification 2 de son côté (sans compte, il ne peut que constater le refus) et met les registres à jour.

En cas de souci : recoller les anciennes règles (action 7), publier, et prévenir Claude.

## Ce qui a été vérifié avant de vous le donner

- Les règles ont été essayées sur l'**émulateur officiel de Firebase** (copie locale de Firebase, sans la vraie base) : syntaxe acceptée ; sans compte, tout est refusé (lecture, écriture, flux en direct, racine) ; un compte sans profil est refusé et ne peut pas se donner le profil ; un compte « ferme » lit et écrit les listes, les semaines et les débouchés, mais ne peut pas toucher aux profils ; l'appli s'y connecte, coche et partage. Test `tests/regles.cjs`.
- L'appli a été essayée avec deux téléphones simulés : connexion une seule fois, jeton renouvelé tout seul toutes les heures, mode hors ligne gardé, compte refusé, déconnexion. Test `tests/connexion.cjs`.
- **Vérifié le 8/11 en réel** : la vraie console (libellés ci-dessus, `@ferme.invalid` accepté) ; après publication, sans compte, la base répond « Permission denied » ; l'appli connectée dit « Partagé ». Correction faite en route (PR #44) : la pastille restait sur « Connexion… » quand l'appli s'ouvrait sur l'onglet Semaine.
