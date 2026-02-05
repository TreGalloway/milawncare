module.exports = {
  auth: {
    secret: 'your-admin-jwt-secret',
  },
  apiToken: {
    salt: 'your-api-token-salt',
  },
  transfer: {
    token: {
      salt: 'your-transfer-token-salt',
    },
  },
  flags: {
    nps: false,
    promoteEE: false,
  },
};
