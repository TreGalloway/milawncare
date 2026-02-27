'use strict';

/**
 * service-area service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::service-area.service-area');
