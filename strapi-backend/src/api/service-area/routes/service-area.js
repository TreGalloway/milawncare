'use strict';

/**
 * service-area router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::service-area.service-area');
