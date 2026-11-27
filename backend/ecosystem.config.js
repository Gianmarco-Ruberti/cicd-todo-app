// Configuration PM2 du staging (VM m324-vm-d).
// Déployée dans /var/www/todo/staging/backend par .github/workflows/deploy-staging.yml.
// Les identifiants (port, base MySQL) restent sur la VM, dans /etc/todo/staging.env :
// aucun mot de passe dans le dépôt.
module.exports = {
  apps: [
    {
      name: 'todo-staging',
      script: './app.js',
      cwd: __dirname,
      // Node 22 lit le fichier d'environnement du staging au démarrage.
      node_args: '--env-file=/etc/todo/staging.env',
    },
  ],
};
