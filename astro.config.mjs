import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [tailwind()],
  output: 'static',
  image: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '1337',
        pathname: '/uploads/**',
      },
    ],
  },
  vite: {
    optimizeDeps: {
      exclude: ['lodash', 'lodash-es', 'lodash/fp', '@strapi/*'],
    },
    resolve: {
      preserveSymlinks: true,
      conditions: ['import', 'browser', 'default'],
    },
    server: {
      fs: {
        strict: true,
        allow: ['..'],
      },
    },
    ssr: {
      external: ['lodash', 'lodash-es', '@strapi/*'],
    },
    build: {
      rollupOptions: {
        external: ['lodash', 'lodash-es', 'lodash/fp'],
      },
    },
  },
});