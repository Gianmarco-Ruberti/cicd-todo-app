# Procédure de mise en production

Mise en production **manuelle uniquement** : `.github/workflows/deploy-production.yml`
n'a qu'un déclencheur `workflow_dispatch`. Aucun `push`, aucune planification et
aucun enchaînement depuis la CI ne peut lancer une mise en production — même si
la CI de `main` est verte, `main` ne part jamais en production sans un clic.

## Cible

| Élément | Test (automatique) | Production (manuelle) |
|---|---|---|
| Workflow | `.github/workflows/ci.yml` (job `deploy`) | `.github/workflows/deploy-production.yml` |
| Déclencheur | `push` sur `main` | bouton « Run workflow » |
| Environnement GitHub | `test` | `production` |
| Dossier VM | `/var/www/todo/staging` | `/var/www/todo/production` |
| nginx | `:8080` → backend `:3001` | `:80` → backend `:3000` |
| Fichier d'environnement | `/etc/todo/staging.env` | `/etc/todo/production.env` |
| Base MySQL | `todo_staging` | `todo_production` |
| Processus PM2 | `todo-staging` | `todo-production` |
| URL publique (Tailscale Funnel) | <https://m324-vm-d.tailefea5d.ts.net:8443> | <https://m324-vm-d.tailefea5d.ts.net> |

Les fichiers d'environnement (`/etc/todo/*.env`) et les clés JWT restent sur la
VM : ils ne sont ni versionnés ni écrasés par un déploiement.

## Pré-requis (une seule fois)

1. **Secrets du dépôt** — distincts de ceux du test :

   | Secret | Contenu |
   |---|---|
   | `SSH_KEY_PROD` | clé privée SSH de l'utilisateur `deploy` |
   | `TS_OAUTH_CLIENT_ID_PROD` | client OAuth Tailscale |
   | `TS_OAUTH_SECRET_PROD` | secret OAuth Tailscale |

   Variables facultatives, si la cible change : `PROD_HOST`, `TS_TAG_PROD`,
   `SSH_KNOWN_HOSTS_PROD`, `PROD_URL` (valeurs par défaut dans le YAML).

2. **Règle d'approbation** — Settings → Environments → `production` →
   *Required reviewers* → ajouter au moins un réviseur, puis *Save protection
   rules*. Tant que cette règle n'existe pas, l'environnement fonctionne mais
   aucun accord n'est demandé : la mise en production n'est alors protégée que
   par la saisie de confirmation décrite ci-dessous.

3. **Infrastructure** (déjà en place sur `m324-vm-d`) : nginx `:80` pointant sur
   `/var/www/todo/production/frontend` et relayant `/api` vers `127.0.0.1:3000`,
   base `todo_production` avec un utilisateur MySQL ayant `ALL PRIVILEGES` sur
   cette base (les tables sont créées au démarrage par `db.sync()`).

## Déroulé d'une mise en production

1. Onglet **Actions** → *Déploiement production* → **Run workflow** (branche `main`).
2. Renseigner :
   - `ref` : le tag, la branche ou le SHA à déployer (ex. `v1.0.0`, `main`, `644b58f`) ;
   - `confirmation` : taper exactement `DEPLOY`.
3. **Confirmation** : si la saisie n'est pas `DEPLOY`, le job `guard` échoue
   immédiatement et rien n'est déployé.
4. **Vérifications du ref** : lint backend + frontend, tests d'API (SQLite en
   mémoire) et build Vite sont rejoués sur le ref exact choisi. Un ref rouge
   arrête la procédure : aucune version non testée ne part.
5. **Approbation** (si la règle de protection est configurée) : le job
   `Déploiement production` attend qu'un réviseur clique sur *Review deployments*
   → *Approve*.
6. **Déploiement** : le runner rejoint le tailnet, copie `frontend/dist` dans
   `/var/www/todo/production/frontend`, le backend dans `.../backend`
   (clés JWT et `.env` exclus), lance `npm ci --omit=dev` puis
   `DEPLOY_ENV=production pm2 startOrReload ecosystem.config.js` et `pm2 save`.
7. **Vérification** : `http://localhost:80/` doit répondre `200` et
   `/api/todo` `401` (API protégée). En cas d'échec, le run affiche `pm2 status`
   et les 30 dernières lignes de `pm2 logs todo-production`, puis échoue.
   L'URL publique est ensuite contrôlée depuis le runner. Le noeud Tailscale est
   libéré dans tous les cas.
8. **Traçabilité** : le résumé du run indique le ref, le SHA court, l'auteur du
   déclenchement et l'adresse déployée.

## Retour arrière

Le workflow déploie n'importe quel ref : relancer **Run workflow** avec le tag ou
le SHA de la version précédente (`confirmation` = `DEPLOY`) suffit à revenir en
arrière. Le contenu du dossier `frontend` est synchronisé avec `--delete`, donc
les fichiers de la version fautive disparaissent.

Vérification manuelle possible depuis le réseau du groupe :

```sh
curl -I https://m324-vm-d.tailefea5d.ts.net/
curl -o /dev/null -w '%{http_code}\n' https://m324-vm-d.tailefea5d.ts.net/api/todo   # 401 attendu
```

## Ce que la production ne fait jamais

- Se déployer sans intervention humaine (`workflow_dispatch` unique).
- Déployer un ref qui n'a pas passé lint + tests + build.
- Écrire dans `/etc/todo/` ou dans les clés JWT de la VM.
