# AGENTS.md

> Ce fichier, c'est le mode d'emploi du repo. Il est lu par les humains **et** par les
> agents IA (Codebuff, Copilot, Cursor, Claude Code...). Si tu es une IA : lis-le en entier
> avant de toucher au code, et respecte les règles de la section 11.

---

## 1. Le projet en 2 lignes

`cicd-todo-app` = une app de todo-list (frontend **Vue 3 + TypeScript**, API **Node/Express**,
**MySQL** via Sequelize) sur laquelle on doit construire et **justifier un pipeline CI/CD complet**
dans le cadre du cours ETML 3e année.

- Repo : `git@github.com:Gianmarco-Ruberti/cicd-todo-app.git`
- Branche principale : `main`
- Docs du projet : `Doc/` (cahier des charges `CdC-Todo-App-324.pdf`, `journal_de_travail`, outils)
- Équipe : 2 étudiants ETML, 3e année.

Règle d'or : **le pipeline est le livrable**. Une feature sans test ni étape de CI qui la couvre
n'est pas "finie".

---

## 2. Stack technique

| Couche        | Technos                                                                 | Version                |
| ------------- | ----------------------------------------------------------------------- | ---------------------- |
| Frontend      | Vue 3, TypeScript, Vite, Pinia, Vue Router, Tailwind CSS 4              | Vue 3.5 / Vite 6 / TS 5.5 |
| UI            | Headless UI, Heroicons, Tiptap, vee-validate + Yup                      | —                      |
| Tests front   | Vitest (unit), Cypress (e2e)                                            | Vitest 3 / Cypress 15  |
| Backend       | Node.js, Express 4, CommonJS                                            | Node 20+ recommandé    |
| Data          | Sequelize 6 + MySQL (prod/dev), SQLite `:memory:` (tests)               | MySQL `lts`            |
| Auth          | JWT **RS256** + bcrypt                                                  | —                      |
| Tests back    | Jest 29 + Supertest                                                     | —                      |
| Qualité       | ESLint 9 (flat config) + Prettier 3                                     | —                      |
| Infra locale  | Docker Compose : MySQL, Redis Stack, MongoDB                            | —                      |
| CI/CD cible   | GitHub Actions (workflows à créer dans `.github/workflows/`)            | —                      |

> ⚠️ Mongo et Redis sont **lancés** par `docker-compose.yaml` mais **pas encore branchés** dans
> le backend (aucun `require('mongoose')` / `require('redis')` dans `backend/`). La migration
> Mongo + le cache Redis font partie des objectifs du cours : ne les documente pas comme "faits"
> tant que le code n'est pas là.

---

## 3. Arborescence

```text
.
├── backend/                 # API Express (CommonJS)
│   ├── app.js               # entrée : createApp / initApp / stopApp
│   ├── config/
│   │   ├── database.js      # Sequelize (MySQL, ou SQLite :memory: si NODE_ENV=test)
│   │   └── keys/            # paire RSA pour JWT (privée gitignorée !)
│   ├── controllers/         # auth, todo, user
│   ├── middlewares/         # auth.js (Bearer JWT)
│   ├── models/              # User, Todo + initModels()
│   ├── routes/              # /api/user, /api/auth, /api/todo, /test (test only)
│   ├── tests/               # Jest + Supertest
│   ├── ecosystem.config.js  # PM2 (prod)
│   └── package.json
├── frontend/                # SPA Vue 3 (ESM)
│   ├── src/
│   │   ├── components/      # composants réutilisables (PascalCase)
│   │   ├── views/           # pages App*.vue
│   │   ├── router/          # routes + guards
│   │   ├── shared/          # services, stores Pinia, helpers, interfaces, guards
│   │   └── assets/
│   ├── cypress/e2e/         # specs e2e
│   ├── vite.config.ts       # alias @ -> src, proxy /api -> :3000
│   └── package.json
├── Doc/                     # cahier des charges, journal de travail, outils
├── docker-compose.yaml      # MySQL + Redis + Mongo
├── README.md                # présentation + screenshots
├── README-DOCKER.md         # services Docker + credentials de dev
└── AGENTS.md                # <- toi, maintenant
```

**Pas de `package.json` à la racine.** Toutes les commandes npm se lancent dans `backend/` ou
`frontend/`. C'est la cause n°1 des "npm ERR! missing script".

---

## 4. Démarrage rapide (dev)

```sh
# 1. Les services
docker compose up -d          # MySQL :3306, Redis :6379/:8001, Mongo :27017

# 2. Backend
cd backend
npm install
printf 'DB_URL="mysql://app_user:app_password@localhost:3306/db_todoapp"\nPORT=3000\n' > .env
npm run start                 # node --watch app.js

# 3. Frontend (autre terminal)
cd frontend
npm install
npm run dev                   # http://localhost:5173, proxy /api -> :3000
```

Identifiants de dev : voir `README-DOCKER.md` (MySQL `app_user` / `app_password`, Redis `admin`,
Mongo `root` / `admin`). **Ce sont des credentials de dev uniquement**, jamais en prod.

### Variables d'environnement

| Variable   | Où            | Rôle                                                        |
| ---------- | ------------- | ----------------------------------------------------------- |
| `DB_URL`   | `backend/.env`| URL Sequelize MySQL. **Obligatoire** hors mode test.        |
| `PORT`     | `backend/.env`| Port HTTP de l'API (défaut `3000`).                         |
| `NODE_ENV` | shell / CI    | `test` → SQLite en mémoire + route `/test/reset` activée.   |

`backend/app.js` fait `process.loadEnvFile('./.env')` : **le fichier `.env` doit exister** et la
commande doit être lancée **depuis `backend/`**. Sinon : `ENOENT`. En CI, crée-le (voir §8).

Secrets JWT : `backend/config/keys/jwtRS256.key` (privée, ignorée par git via `*.key`) et
`jwtRS256.key.pub` (publique, versionnée). Le code les lit en **chemin relatif au cwd**, donc
toujours lancer depuis `backend/`. En CI, il faut **régénérer la paire** (voir §8).

---

## 5. Commandes utiles

### Backend (depuis `backend/`)

| Commande             | Effet                                                             |
| -------------------- | ----------------------------------------------------------------- |
| `npm run start`      | API en dev avec hot-reload                                        |
| `npm run start:e2e`  | API avec `NODE_ENV=test` (active `/test/reset`, DB SQLite mémoire)|
| `npm run test:dev`   | Jest en watch                                                     |
| `npm run test:ci`    | Jest + couverture, `--ci --silent` (c'est CELLE de la CI)          |
| `npm run lint`       | ESLint **avec `--fix`** (local seulement)                          |
| `npx eslint .`       | ESLint **sans** `--fix` → à utiliser en CI                        |
| `npm run format`     | Prettier write sur tout le dossier                                 |

### Frontend (depuis `frontend/`)

| Commande             | Effet                                                             |
| -------------------- | ----------------------------------------------------------------- |
| `npm run dev`        | Vite dev server                                                   |
| `npm run build`      | type-check + build prod dans `frontend/dist/`                     |
| `npm run type-check` | `vue-tsc --noEmit`                                                |
| `npm run test:unit`  | Vitest (watch). En CI : `npx vitest run`                          |
| `npm run e2e:open`   | Cypress interactif (build dev sur :4173)                          |
| `npm run e2e:run`    | Cypress headless, **navigateur Chrome**, build test sur :4173      |
| `npm run lint`       | ESLint **avec `--fix`** (local seulement)                          |
| `npm run format`     | Prettier write sur `src/`                                          |

> 🧠 `frontend/README.md` mentionne `test:e2e` et `test:e2e:dev` : **ces scripts n'existent pas**.
> Utilise `e2e:run` / `e2e:open`. Corrige le README si tu passes par là.

---

## 6. Conventions de code

- **Backend** : CommonJS (`require` / `module.exports`), pas d'import ESM. Un domaine = un
  controller + une route + un model. Les models sont exposés via `app.locals.models`.
- **Frontend** : ESM, alias `@/` → `frontend/src/`. Composants `PascalCase.vue`, vues `App*.vue`,
  logique métier dans `shared/services` et `shared/stores` (Pinia), appels HTTP via
  `shared/helpers/fetch-wrapper.ts`.
- **Style** : Prettier fait foi (2 espaces, single quotes, `semi: true`, printWidth 100,
  pas de trailing comma). Ne discute pas le style à la main : `npm run format`.
  ⚠️ Une partie des fichiers actuels n'est pas formatée : ne reformate pas tout le repo dans une
  PR de feature, ça noie le diff.
- **Langue** : messages utilisateur en français, code (variables, fonctions) en anglais.
  Commentaires courts, utiles, pas de roman.
- **Erreurs API** : status HTTP explicites (400/401/403/404/500), `console.error` côté serveur,
  jamais de stack trace renvoyée au client.

### Tests

- Backend : Jest, fichiers `backend/tests/**/*.test.js`, DB **SQLite en mémoire** (pas de mock de
  la DB), requêtes via Supertest, reset entre chaque test via `tests/setup.js`.
- Frontend : Vitest (peu/pas de specs pour l'instant) + Cypress e2e qui a besoin du backend en
  `NODE_ENV=test` sur `:3000` (route `/test/reset`) et du front build sur `:4173`.
- Un bug corrigé = un test qui échouait avant et passe après. Pas de test "vitrine".

---

## 7. Git & GitHub

- **Branches** : `main` protégée, on travaille sur `feat/...`, `fix/...`, `ci/...`, `docs/...`,
  `chore/...`, puis **PR** vers `main`.
- **Commits** : [Conventional Commits](https://www.conventionalcommits.org/).
  Format : `type(scope): message à l'impératif, en minuscule`.
  ```text
  feat(todo): ajouter le filtre par date
  fix(auth): renvoyer 401 au lieu de 403 sans token
  ci(backend): lancer jest avec couverture sur Node 20
  docs(readme): documenter les variables d'environnement
  chore(deps): bump vite to 6.2
  ```
  Types autorisés : `feat`, `fix`, `ci`, `docs`, `test`, `refactor`, `chore`, `perf`.
  L'historique contient des `chor(...)` : on ne réécrit pas le passé, on applique le format
  standard **à partir de maintenant**.
- **Ne jamais committer** : `node_modules/`, `dist/`, `coverage/`, `.env*`, `*.key`,
  `cypress/videos|screenshots`, et les verrous LibreOffice `~$*` / `.~lock.*`.
- **Ne jamais** : `push --force` sur `main`, `--no-verify`, merger une PR avec la CI rouge.

---

## 8. CI/CD — le cœur du projet

### 8.1 Pipeline cible

Ordre pensé **du plus rapide au plus lent** : on veut péter en 30 s, pas en 15 min.

```text
push / PR
   │
   ├─ 1. install       npm ci (backend + frontend), cache npm
   ├─ 2. lint          eslint (SANS --fix) [+ prettier --check une fois le repo formaté]
   ├─ 3. typecheck     vue-tsc --noEmit
   ├─ 4. test:backend  jest --coverage --ci  (SQLite mémoire, zéro service)
   ├─ 5. test:front    vitest run
   ├─ 6. build:front   vite build
   ├─ 7. e2e           backend NODE_ENV=test + preview + cypress run
   └─ 8. docker        build image + push GHCR (main uniquement)
                       └─ 9. deploy  (main uniquement, après accord)
```

| # | Étape       | Commande (cwd)                                                        | Artefact / gate                  |
| - | ----------- | --------------------------------------------------------------------- | -------------------------------- |
| 1 | Install     | `npm ci` (`backend/`, `frontend/`)                                    | cache `~/.npm`                   |
| 2 | Lint        | `npx eslint .` (`backend/`, `frontend/`) + `npx prettier --check src/` (`frontend/`) | 0 erreur ESLint                  |
| 3 | Typecheck   | `npm run type-check` (`frontend/`)                                    | 0 erreur TS                      |
| 4 | Tests back  | `npm run test:ci` (`backend/`)                                        | `coverage/cobertura-coverage.xml`|
| 5 | Tests front | `npx vitest run` (`frontend/`)                                        | rapport Vitest                   |
| 6 | Build front | `npm run build` (`frontend/`)                                         | `frontend/dist/`                 |
| 7 | E2E         | `npm run e2e:run` (`frontend/`) + backend `npm run start:e2e`         | Cypress vidéos/screenshots       |
| 8 | Image       | `docker build` + push GHCR                                            | tag = SHA court + `latest`       |
| 9 | Deploy      | PM2 (`ecosystem.config.js`) ou conteneur, via SSH                     | healthcheck `/api/todo`          |

**Pré-requis CI à ne pas oublier** (sinon la CI est rouge dès la 1re minute) :

1. `backend/.env` **doit exister** → `touch backend/.env` (ou `printf 'NODE_ENV=test\n'`). En mode
   test la DB est SQLite, donc pas besoin de `DB_URL`.
2. La **clé privée JWT** n'est pas dans le repo (`*.key` ignoré). La régénérer dans le job :
   ```sh
   cd backend
   mkdir -p config/keys
   openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out config/keys/jwtRS256.key
   openssl rsa -pubout -in config/keys/jwtRS256.key -out config/keys/jwtRS256.key.pub
   ```
   (ou l'injecter depuis un secret GitHub si vous préférez).
3. Cypress : `e2e:run` force `--browser chrome` → installer Chrome dans le runner
   (`cypress-io/github-action` gère ça) ou passer par Electron en changeant le script.
4. Node : **épingler une version** (`actions/setup-node` + `.nvmrc`, Node 20 LTS). Il n'y a pas de
   `.nvmrc` aujourd'hui.

### 8.2 Pourquoi ces étapes (la partie "justification" du cours)

- **Lint + typecheck avant les tests** : ça coûte quelques secondes et évite de lancer 3 min de
  tests pour une virgule oubliée.
- **Tests backend sans service externe** : `NODE_ENV=test` bascule Sequelize sur SQLite
  `:memory:` → pas de conteneur MySQL à démarrer, tests rapides et déterministes. C'est un
  argument fort à mettre dans le rapport.
- **Couverture en artefact** (`cobertura`) : preuve chiffrée, exploitable par GitHub/GitLab et
  dans le rapport.
- **E2E séparés** : lents et fragiles, ils valident le parcours utilisateur réel (login → todo),
  pas la peine de les relancer à chaque micro-commit → PR + `main`, ou nightly.
- **Build avant E2E** : on teste le bundle de prod, pas le dev server (sources maps activées).
- **Image Docker + tag par SHA** : déploiement reproductible et rollback trivial.
- **Cache npm** : gain de temps réel sur chaque run.

### 8.3 Règles non négociables

- CI **rouge = merge bloqué** (branch protection sur `main` + checks requis).
- Pas de `|| true`, pas de `--passWithNoTests` pour masquer un problème, pas de test supprimé
  pour faire passer la CI. Si un test est instable, on le répare ou on l'isole avec un ticket.
- Pas de secret dans le YAML, les logs ou le code : GitHub Secrets uniquement.
- Un workflow = un fichier clair (`ci.yml`, `cd.yml`), `concurrency` pour annuler les runs
  obsolètes, `permissions` minimales.

---

## 9. Definition of Done

Une tâche est finie quand :

- [ ] le code tourne en local (`npm run dev` + `npm run start`) ;
- [ ] `npm run lint` et `npm run type-check` passent ;
- [ ] les tests concernés passent (`test:ci` / `vitest run` / `e2e:run`) ;
- [ ] le pipeline CI est **vert** sur la PR ;
- [ ] la doc impactée est à jour (`README.md`, `README-DOCKER.md`, ce fichier) ;
- [ ] le commit respecte Conventional Commits et la PR explique le **pourquoi**.

---

## 10. Pièges connus / dette technique

À lire avant de debug "pourquoi ça marche pas" :

1. **`.env` obligatoire** : `process.loadEnvFile('./.env')` throw `ENOENT` si absent, même en mode
   test. Et tout est relatif au **cwd** → lance depuis `backend/`.
2. **Clé JWT privée absente en CI** : `config/keys/index.js` fait `readFileSync` → crash immédiat.
   Voir §8.1.
3. **`npm run lint` fait `--fix`** des deux côtés → en CI, utiliser `npx eslint .` pour détecter
   au lieu de corriger en silence.
4. **Pas de specs Vitest** actuellement : `npx vitest run` échoue avec "No test files found".
   Soit vous ajoutez des tests unitaires, soit vous le savez et vous adaptez l'étape (mais pas en
   la supprimant).
5. **Prettier `--check` est rouge aujourd'hui** : plusieurs fichiers ne sont pas formatés.
   Faites UN commit `chore(format): prettier` dédié, puis ajoutez `--check` comme gate CI.
6. **`ecosystem.config.js` pointe sur `./index.js`** alors que l'entrée réelle est `app.js`.
   Le déploiement PM2 échouera tel quel. `PORT: 80` demande aussi des privilèges.
7. **Le backend sert `../dist`** (racine du repo) alors que Vite build dans `frontend/dist`.
   Pour un déploiement "un seul serveur", il faut copier/paramétrer le build → à trancher dans
   l'étape deploy.
8. **Mongo + Redis non intégrés** (voir §2). Ne pas raconter dans le rapport que c'est fait.
9. **Cypress** : `e2e:run` exige Chrome et un backend `NODE_ENV=test` déjà lancé, sinon les specs
   tombent en timeout. Identifiants de test codés en dur dans `cypress.config.ts`.
10. **`.~lock.*` (LibreOffice)** traîne dans `Doc/` : à ignorer/ne pas committer.
11. **Pas de `.github/workflows/`** : le pipeline est à créer. C'est LE travail du projet, pas un
    bonus de fin.

---

## 11. Règles pour l'agent IA

Si tu es une IA qui bosse sur ce repo :

1. **Lis `README.md`, `README-DOCKER.md` et ce fichier** avant d'écrire du code.
2. **Respecte la stack et l'archi existantes.** Pas de refactor global, pas de migration de
   framework, pas de nouveau state manager "parce que c'est mieux".
3. **Pas de nouvelle dépendance sans demander.** Si tu en ajoutes une, justifie-la et mets à jour
   `package.json` + lockfile.
4. **Ne touche jamais aux secrets** : pas de `.env`, pas de `*.key`, pas de credentials en dur.
5. **Vérifie avant de dire "c'est fait"** : lance le lint, le typecheck et les tests concernés,
   et rapporte honnêtement ce qui n'a pas pu tourner.
6. **Ne modifie pas une étape de CI pour la faire passer.** Corrige la cause.
7. Si tu ajoutes/renommes une commande, un script ou une étape de pipeline → **mets à jour ce
   fichier** (tableaux §5 et §8).
8. Les commentaires, messages d'erreur utilisateur et docs sont en **français** ; le code en
   **anglais**.
9. Commits en Conventional Commits, une PR = un sujet.
10. En cas de doute sur le périmètre : demande, ne devine pas et ne livre pas 400 lignes à côté.

---

## 12. Contacts

- Équipe : 2 étudiants ETML, 3e année informatique.
- GitHub : `Gianmarco-Ruberti/cicd-todo-app`.
- Docs projet : `Doc/CdC-Todo-App-324.pdf` (cahier des charges) et `Doc/journal_de_travail.*`.

Bonne chance, et faites tourner la CI avant de dormir 😴
