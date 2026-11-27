// Configuration PM2 commune aux deux environnements de la VM m324-vm-d.
//
// Le fichier est déployé dans /var/www/todo/staging/backend par
// .github/workflows/ci.yml et dans /var/www/todo/production/backend par
// .github/workflows/deploy-production.yml.
//
// L'environnement est choisi par la variable DEPLOY_ENV (staging par défaut) :
//   DEPLOY_ENV=production pm2 startOrReload ecosystem.config.js   → todo-production
//   pm2 startOrReload ecosystem.config.js                          → todo-staging
//
// Les identifiants (port, base MySQL) restent sur la VM, dans
// /etc/todo/<environnement>.env : aucun mot de passe dans le dépôt.
const env = process.env.DEPLOY_ENV === 'production' ? 'production' : 'staging';

module.exports = {
  apps: [
    {
      name: `todo-${env}`,
      script: './app.js',
      cwd: __dirname,
      // Node 22 lit le fichier d'environnement de l'environnement visé au démarrage.
      node_args: `--env-file=/etc/todo/${env}.env`,
    },
  ],
};
