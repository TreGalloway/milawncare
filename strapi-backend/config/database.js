const path = require('path');

module.exports = ({ env }) => {
  const databaseUrl = env('DATABASE_URL', '');

  if (databaseUrl) {
    // Production: use PostgreSQL via DATABASE_URL
    return {
      connection: {
        client: 'postgres',
        connection: databaseUrl,
        pool: {
          min: 0,
          max: 5,
        },
      },
    };
  }

  // Development: use SQLite
  return {
    connection: {
      client: 'sqlite',
      connection: {
        filename: path.join(__dirname, '..', '.tmp', 'data.db'),
      },
      useNullAsDefault: true,
    },
  };
};
