# Documentation technique CI/CD - Todo App (P_DevOps 324)

| | |
|---|---|
| **Projet** | `cicd-todo-app` - support du cours P_DevOps 324 |
| **Public** | développeur qui reprend le dépôt et doit construire le pipeline |
| **Document lié** | [Documentation fonctionnelle](./documentation-fonctionnelle.md) |
| **Sources** | code, `README-DOCKER.md`, CdC |

> Le livrable du cours est le **pipeline CI/CD**, pas l'application. Celle-ci sert de système à
> tester : elle est décrite ici uniquement dans ce qui influence la CI (démarrage, base de test,
> build, routes de santé). Aucun workflow n'existe aujourd'hui : ce document décrit la cible,
> les prérequis et les pièges à traiter avant de l'écrire.

---

## 1. Ce que la CI doit savoir de l'application

| Élément | Valeur utile pour la CI |
|---|---|
| Backend | Express 4, CommonJS, entrée `backend/app.js`, port `3000` |
| Frontend | Vue 3 + Vite 6, build dans `frontend/dist`, preview sur `4173` |
| Base | MySQL via `DB_URL` ; SQLite `:memory:` si `NODE_ENV=test` |
| Auth | JWT RS256, clé privée **absente du dépôt** (`*.key` ignoré) |
| Tests back | Jest + Supertest, `backend/tests/**/*.test.js` |
| Tests front | Vitest configuré, **aucune spec** ; Cypress e2e (Chrome) |
| Santé | `GET /api/todo` renvoie 401 sans token = serveur vivant |
| Reset test | `POST /test/reset`, actif seulement si `NODE_ENV=test` |

---

## 2. État du dépôt au départ

| Élément | État | Impact CI |
|---|---|---|
| `.github/workflows/` | absent | rien n'est automatisé |
| `Dockerfile` | absent | l'étape image est à créer de zéro |
| `.nvmrc` | absent | version Node non épinglée |
| `package-lock.json` | présent dans `backend/` et `frontend/` | `npm ci` reproductible |
| Specs Vitest | absentes | `vitest run` échoue « No test files found » |
| Prettier | non conforme | `prettier --check` rouge aujourd'hui |
| `npm run lint` | `--fix` des deux côtés | corrige au lieu de détecter |
| PM2 | `./index.js`, port 80 | déploiement cassé |
| Front statique | `express.static('../dist')` | ne sert pas `frontend/dist` |
| Mongo / Redis | lancés, non branchés | inutiles en CI |
| Cypress | Chrome uniquement, identifiants en dur | matrice 3 navigateurs à faire |

---

## 3. Pipeline cible

schema : [schema du workflow](./schema-workflow-v1.md)

Ordre voulu : échouer en 30 secondes plutôt qu'en 15 minutes. Les contrôles statiques passent
avant les tests, les tests avant le build, le build avant l'e2e, l'e2e avant l'image.

| # | Job | Commande (cwd) | Preuve / gate |
|---|---|---|---|
| 1 | Install | `npm ci` (`backend/`, `frontend/`) | cache npm, lockfile respecté |
| 2 | Lint | `npx eslint .` (`backend/`, `frontend/`) | 0 erreur |
| 3 | Typecheck | `npm run type-check` (`frontend/`) | 0 erreur TS |
| 4 | Tests back | `npm run test:ci` (`backend/`) | `coverage/cobertura-coverage.xml` |
| 5 | Tests front | `npx vitest run` (`frontend/`) | rapport Vitest |
| 6 | Build | `npm run build` (`frontend/`) | `frontend/dist/` |
| 7 | E2E | backend `npm run start:e2e` + `npm run e2e:run` (`frontend/`) | vidéos/screenshots Cypress |
| 8 | Image | `docker build` + push GHCR | tag SHA court + `latest` |
| 9 | Deploy | SSH + PM2/conteneur, **main seulement** | `/api/todo` répond |

### Pourquoi ces choix (à reprendre dans le rapport)

- **Lint et typecheck avant les tests** : quelques secondes contre plusieurs minutes.
- **Tests backend sans service** : `NODE_ENV=test` bascule sur SQLite mémoire ; aucun conteneur
  MySQL à démarrer, exécution rapide et déterministe. C'est l'argument technique le plus fort.
- **Couverture en artefact** : preuve chiffrée et exploitable dans le rapport.
- **E2E séparés** : lents et fragiles ; à réserver aux PR et à `main`, ou en nightly.
- **Build avant e2e** : on teste le bundle de production, pas le serveur de dev.
- **Image taguée par SHA** : déploiement reproductible, rollback immédiat.

---

## 4. Sécurité de la chaîne

| Risque | Mesure |
|---|---|
| Secret dans le YAML ou les logs | GitHub Secrets, masquage, jamais d'`echo` |
| Token trop permissif | `permissions` minimales par workflow |
| Action compromise | épingler les actions (tag majeur, SHA en prod) |
| Identifiants de test | variables d'environnement, comptes jetables |
| Dépendances vulnérables | Dependabot + `npm audit` en information |
| Déploiement non maîtrisé | environment protégé + approbation |
| Artefacts sensibles | rétention courte, pas de `.env` ni `*.key` |

La clé privée JWT ne doit jamais être committée ni affichée : la régénérer à chaque job est plus
simple et suffisant pour des tests.

---

## 5. Collaboration et qualité

- Branches `feat/`, `fix/`, `ci/`, `docs/`, `chore/` → PR vers `main`.
- Conventional Commits : `type(scope): message à l'impératif`.
- `main` protégée : checks requis (lint, typecheck, tests, build), CI rouge = merge bloqué.
- Un workflow = un fichier clair (`ci.yml`, `cd.yml`), `concurrency` activé.
- Definition of Done : code local, lint, typecheck, tests concernés, CI verte, doc à jour.

Interdits : `|| true`, `--passWithNoTests`, test supprimé pour passer, `push --force` sur `main`,
`--no-verify`, merge avec CI rouge.

---

## 6. Équivalents locaux des commandes CI

| CI | Local |
|---|---|
| `npm i` | `npm install` |
| `npx eslint .` | `npm run lint` (attention : `--fix`) |
| `npm run type-check` | idem |
| `npm run test:ci` | `npm run test:dev` (watch) |
| `npx vitest run` | `npm run test:unit` (watch) |
| `npm run build` | idem |
| `npm run e2e:run` | idem, avec backend `start:e2e` lancé |