/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly STRAPI_URL: string;
  readonly STRAPI_API_TOKEN: string;
  readonly PREVIEW_SECRET: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
