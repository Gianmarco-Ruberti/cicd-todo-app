const { Sequelize } = require('sequelize');

const isTest = process.env.NODE_ENV === 'test';

// Sur la VM, les identifiants arrivent séparément (/etc/todo/staging.env) ;
// en local, on peut fournir directement une URL complète via DB_URL.
function getDbUrl() {
  if (process.env.DB_URL) return process.env.DB_URL;

  const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
  if (DB_HOST && DB_USER && DB_NAME) {
    const password = DB_PASSWORD ? `:${encodeURIComponent(DB_PASSWORD)}` : '';
    return `mysql://${encodeURIComponent(DB_USER)}${password}@${DB_HOST}/${DB_NAME}`;
  }

  return undefined;
}

let sequelize;
if (isTest) {
  // Fast, zero-setup DB for tests
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false
  });
} else {
  const dbUrl = getDbUrl();
  if (!dbUrl) {
    throw new Error('Missing DB_URL environment variable (ou DB_HOST / DB_USER / DB_NAME)');
  }
  sequelize = new Sequelize(dbUrl, {
    dialect: 'mysql', // Assurez-vous que le dialecte est correct
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    // don't add the timestamp attributes (updatedAt, createdAt)
    define: {
      timestamps: false
    },
    // The retry config if Deadlock Happened
    retry: {
      match: [/Deadlock/i],
      max: 3, // Maximum retry 3 times
      backoffBase: 1000, // Initial backoff duration in ms. Default: 100,
      backoffExponent: 1.5 // Exponent to increase backoff each try. Default: 1.1
    }
  });
}

module.exports = {
  sequelize
};
