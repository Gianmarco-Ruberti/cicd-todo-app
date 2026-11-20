# Documentation fonctionnelle CI/CD - Todo App (P_DevOps 324)

| | |
|---|---|
| **Projet** | `cicd-todo-app` - cours P_DevOps 324, ETML 3e année |
| **Public** | toute personne qui découvre le projet, **sans connaissance technique** |
| **Document lié** | [Documentation technique](./documentation-technique.md) |
| **Sources** | code, cahier des charges |

> Ce document explique **le pipeline CI/CD** : à quoi il sert, ce qu'il vérifie et comment lire ses résultats.

---

## 1. L'application en quelques lignes

C'est un site web où une personne crée un compte, se connecte et gère une liste de tâches : ajouter,
cocher, modifier, supprimer, rechercher. Chaque utilisateur ne voit que ses propres tâches. Un
profil permet de modifier ses informations ou de supprimer son compte.

Cette application a été fournie comme terrain de test. Le vrai objectif du cours est de
construire une chaîne de contrôles automatiques autour d'elle : le **pipeline CI/CD**.

---

## 2. Qu'est-ce que la CI/CD ?

### Une chaîne de contrôle qualité

Imaginez une usine où chaque modification de l'application est un colis qui doit être expédié. Au
lieu de laisser partir le colis après un simple coup d'œil, on le fait passer sur un convoyeur avec
plusieurs postes de contrôle : conformité, solidité, bon fonctionnement, emballage. Si un poste
refuse le colis, il s'arrête et personne ne l'expédie.

- **CI (intégration continue)** : à chaque modification proposée, des robots vérifient
  automatiquement qu'elle n'abîme rien et qu'elle respecte les règles du projet.
- **CD (livraison / déploiement continus)** : une fois les contrôles passés, l'application est
  empaquetée de façon identique à chaque fois, puis éventuellement mise en ligne.
- **Pipeline** : l'ensemble ordonné de ces contrôles, décrit dans un fichier et exécuté par un
  service externe.

### Pourquoi c'est utile

| Sans pipeline | Avec pipeline |
|---|---|
| On découvre les erreurs des semaines plus tard | elles sont signalées en quelques minutes |
| Ça marche chez moi | tout le monde est vérifié de la même façon |
| Les tests sont lancés si on y pense | ils tournent à chaque modification |
| La mise en ligne est manuelle et stressante | elle est répétable et tracée |
| Impossible de prouver la qualité | chaque exécution laisse une preuve consultable |

---

## 4. Ce que l'on peut vérifier sans être technique

- L'onglet Actions de GitHub montre chaque exécution, son heure, sa durée et son résultat.
- Un clic sur une exécution affiche les étapes, chacune avec son voyant.
- Les rapports et captures sont téléchargeables en bas de l'exécution.
- L'historique permet de voir depuis quand la situation est verte ou rouge.
- Une **release** regroupe une version, sa date et la liste des changements.

---

## 5. Où en est le projet ?

Le pipeline n'est pas encore construit. Il n'existe aucun fichier de workflow dans le dépôt :
aucun contrôle ne se déclenche aujourd'hui. Plusieurs briques manquent également :

| Brique | État | Ce que cela implique |
|---|---|---|
| Déclenchement automatique | absent | rien ne tourne à chaque modification |
| Contrôle du style | prêt techniquement, non branché | sera actif dès le premier workflow |
| Tests du serveur | existants, à fiabiliser | base solide pour la CI |
| Tests de l'interface | aucun test unitaire | l'étape échouerait aujourd'hui |
| Parcours navigateur | un seul navigateur, configuration fragile | le cahier des charges en demande trois |
| Empaquetage | pas de recette de fabrication | l'étape image est à créer |
| Mise en ligne | procédure incomplète | à sécuriser avant publication |
| Release commentée | absente | à produire pour la conformité |

---

## 6. Plan de mise en route, en langage simple

| Étape | Objectif | Résultat visible |
|---|---|---|
| 1 | Faire tourner les premiers contrôles | un voyant vert sur une modification |
| 2 | Rendre les tests fiables | serveur et interface contrôlés à chaque fois |
| 3 | Produire un paquet installable | fichier téléchargeable depuis GitHub |
| 4 | Vérifier le parcours sur trois navigateurs | trois campagnes vertes |
| 5 | Publier une version commentée | release avec liste des changements |
---

## 7. Lexique

| Mot | Explication simple |
|---|---|
| Pipeline | chaîne ordonnée de contrôles automatiques |
| CI/CD | contrôles continus, puis livraison continue |
| Workflow | recette qui décrit les contrôles à exécuter |
| Job | un poste de contrôle dans cette recette |
| Runner | ordinateur loué qui exécute les contrôles |
| Test | vérification automatique d'un comportement attendu |
| Build | fabrication du paquet de l'application |
| Artefact | preuve ou fichier produit par un contrôle |
| Release | version publiée et documentée |
| Secret | information confidentielle stockée dans un coffre |
| Voyant vert / rouge | contrôle réussi / échoué |
| Rollback | retour à la version précédente |