module.exports = ({ env }) => ({
  // Absolute URL used in admin emails (e.g. password reset links).
  // Must match the public domain so reset links aren't broken.
  url: `${env('PUBLIC_URL', 'https://mipremierlawncare.com')}/admin`,
  auth: {
    secret: env('ADMIN_JWT_SECRET', 'your-admin-jwt-secret'),
  },
  apiToken: {
    salt: env('API_TOKEN_SALT', 'your-api-token-salt'),
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT', 'your-transfer-token-salt'),
    },
  },
  flags: {
    nps: false,
    promoteEE: false,
  },
});
