'use strict';

const { execSync } = require('child_process');

module.exports = {
  register(/*{ strapi }*/) {},

  async bootstrap({ strapi }) {
    console.log('✓ Strapi bootstrap complete');

    // Auto-rebuild Astro site when content changes (production only)
    if (process.env.NODE_ENV === 'production') {
      let rebuildTimer = null;
      const REBUILD_DELAY = 30000; // 30s debounce

      function triggerRebuild() {
        if (rebuildTimer) clearTimeout(rebuildTimer);
        rebuildTimer = setTimeout(() => {
          strapi.log.info('Content changed — rebuilding Astro site...');
          try {
            execSync('cd /app && npm run build && nginx -s reload', {
              timeout: 120000,
              stdio: 'inherit',
            });
            strapi.log.info('Astro rebuild complete');
          } catch (err) {
            strapi.log.error('Astro rebuild failed:', err.message);
          }
        }, REBUILD_DELAY);
      }

      strapi.db.lifecycles.subscribe({
        afterCreate: triggerRebuild,
        afterUpdate: triggerRebuild,
        afterDelete: triggerRebuild,
      });

      strapi.log.info('Auto-rebuild enabled (30s debounce)');
    }
  },
};
