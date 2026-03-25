# Railway Deployment Troubleshooting Log

This document records every issue encountered deploying the MI Premier Lawn Care site (Astro SSG + Strapi v5 + Nginx) to Railway, and exactly how each was resolved.

**Stack:** Astro (SSG frontend) + Strapi v5 (headless CMS) + Nginx (reverse proxy) — all in a single Docker container on Railway.

---

## Issue 1 — PORT conflict: nginx hardcoded to port 80

**Symptom:** Health checks failing with "service unavailable". Railway assigns a random `PORT` (e.g. 8080) to services at runtime, but nginx was hardcoded to `listen 80;`.

**Cause:** `nginx.conf` had a static `listen 80;` directive. Railway routes external traffic to whatever port the container is listening on — since nothing was on the Railway-assigned port, all requests were rejected.

**Fix:**
- Renamed `nginx.conf` → `nginx.conf.template`
- Changed `listen 80;` → `listen ${NGINX_PORT};`
- In `start.sh`, added `envsubst '$NGINX_PORT' < /app/nginx.conf.template > /etc/nginx/nginx.conf` using the `gettext` package (provides `envsubst`)
- Added `gettext` to the Dockerfile `apk add` command

---

## Issue 2 — Health check 404: wrong path on wrong process

**Symptom:** Railway's health check (`/api/health`) returned 404.

**Cause:** Railway's health check path `/api/health` was being routed directly to Strapi (which was incorrectly bound to `PORT`). Strapi's own health endpoint is `/_health`, not `/api/health`, so it returned 404.

**Fix (initial):** Added a dedicated nginx `location` block:
```nginx
location = /api/health {
    proxy_pass http://localhost:1337/_health;
    proxy_http_version 1.1;
}
```
This was later changed (see Issue 8) to return 200 directly from nginx.

---

## Issue 3 — Astro ECONNREFUSED on every page during build

**Symptom:** Build logs flooded with `Failed to fetch services`, `Failed to fetch site settings`, etc. — all `ECONNREFUSED`.

**Cause:** `astro build` was running as a Dockerfile `RUN` step during image construction. At that point, Strapi doesn't exist yet — there's no CMS running to fetch data from. All `fetch()` calls in Astro pages failed immediately.

**Fix:** Removed `RUN npm run build` for Astro from the Dockerfile entirely. Moved the Astro build to runtime inside `start.sh`, after Strapi is confirmed healthy:
```sh
# After Strapi is ready...
cd /app && npm run build
```
The pages still render with empty/fallback data if a fetch fails, but at runtime Strapi is available so all fetches succeed.

---

## Issue 4 — Strapi hardcoded to SQLite, ignoring Railway Postgres

**Symptom:** Strapi crashed on startup with database connection errors. Railway provides a Postgres service linked via `DATABASE_URL`.

**Cause:** `strapi-backend/config/database.js` was hardcoded to use SQLite:
```js
// Always used SQLite — ignored DATABASE_URL entirely
connection: { client: 'sqlite', ... }
```

**Fix:** Rewrote `database.js` to branch on `DATABASE_URL`:
```js
module.exports = ({ env }) => {
  const databaseUrl = env('DATABASE_URL', '');
  if (databaseUrl) {
    return { connection: { client: 'postgres', connection: databaseUrl, ... } };
  }
  // SQLite fallback for local development only
  return { connection: { client: 'sqlite', ... } };
};
```

---

## Issue 5 — Missing `pg` driver and incompatible `better-sqlite3` version

**Symptom:** Strapi crashed with `Cannot find module 'pg'` and native module compilation errors for `better-sqlite3`.

**Cause:**
- `pg` (PostgreSQL driver) was not listed in `strapi-backend/package.json` dependencies
- `better-sqlite3` was at v9, which is not compatible with Strapi v5 (requires v11+)
- Alpine Linux lacks native build tools needed to compile native Node.js modules

**Fix:**
- Added `"pg": "^8.13.0"` to `strapi-backend/package.json`
- Bumped `"better-sqlite3": "^11.0.0"`
- Added to Dockerfile: `build-base python3 postgresql-dev` so native modules can compile

---

## Issue 6 — Strapi env vars using hardcoded insecure defaults

**Symptom:** Strapi started with deprecation/security warnings; secrets not loaded from Railway.

**Cause:** `config/server.js` and `config/admin.js` had hardcoded string fallbacks instead of reading from environment variables:
```js
keys: ['yourKeyA', 'yourKeyB'],          // never read APP_KEYS
secret: 'your-admin-jwt-secret',          // never read ADMIN_JWT_SECRET
```

**Fix:** Updated both files to use Strapi's `env()` helper for all secrets:
```js
// server.js
app: { keys: env.array('APP_KEYS') }

// admin.js
auth: { secret: env('ADMIN_JWT_SECRET') }
apiToken: { salt: env('API_TOKEN_SALT') }
```
Required Railway env vars: `DATABASE_URL`, `APP_KEYS`, `ADMIN_JWT_SECRET`, `API_TOKEN_SALT`, `JWT_SECRET`.

---

## Issue 7 — `strapi build` "Debug Failure": wrong tsconfig found

**Symptom:** `strapi build` crashed during the admin panel build step with:
```
Error: Debug Failure.
  at resolve-config-options.js:9:43
  at Object.run (basic.js:21:55)
  at module.exports (compile.js:9:19)
```

**Cause (deep):** There was no `tsconfig.json` inside `strapi-backend/`. The Strapi CLI calls `ts.findConfigFile()` which searches the given directory **and all parent directories**. It found the **Astro project's** `tsconfig.json` at `/app/tsconfig.json` (one level up). This made `tsconfig.config` truthy, triggering a TypeScript compilation step.

However, `tsUtils.compile()` uses a **separate** search function (`getConfigPath`) that is **restricted to the strapi-backend directory** — it found nothing and passed `undefined` as the config path to TypeScript's compiler, which cannot handle `undefined` → "Debug Failure" crash.

**Fix:** Added `strapi-backend/tsconfig.json` with two critical settings:
```json
{
  "compilerOptions": {
    "outDir": ".",      // distDir resolves to /app/strapi-backend itself
    "noEmit": true,     // TypeScript validates but writes no files
    "allowJs": true,
    "checkJs": false,
    "skipLibCheck": true
  }
}
```
- `outDir: "."` — When Strapi resolves `distDir` from this tsconfig, it gets the project root (`/app/strapi-backend`). Strapi then looks for content types at `distDir/src/api/` = `/app/strapi-backend/src/api/` ✅
- `noEmit: true` — Prevents TypeScript from writing compiled output files; the JS source files are used directly

---

## Issue 8 — Health check timing: nginx started too late

**Symptom:** Railway health checks kept failing with "service unavailable" for the full 100-second window, then the deployment was marked as failed.

**Cause:** `start.sh` started nginx **last** — only after Strapi was fully up AND the Astro build completed (~50–75 seconds total). During that window, no HTTP server was listening on the Railway-assigned port, so every health check attempt returned "connection refused."

**Fix:** Reordered `start.sh` to start nginx **first**:
```sh
# 1. Start nginx immediately (health checks pass from second 0)
nginx -g 'daemon off;' &
NGINX_PID=$!

# 2. Start Strapi in background
PORT=1337 npm start &

# 3. Wait for Strapi, build Astro, reload nginx
# ...

wait $NGINX_PID   # keeps container alive
```
Also changed `/api/health` in `nginx.conf.template` to return 200 directly from nginx (not proxy to Strapi), so the health check passes the instant nginx starts regardless of Strapi's state:
```nginx
location = /api/health {
    return 200 "OK";
    add_header Content-Type text/plain;
}
```

---

## Issue 9 — Strapi readiness loop never detected Strapi was up

**Symptom:** Logs showed "Strapi started successfully" but the wait loop in `start.sh` kept printing "Waiting for Strapi..." until timeout, then the container exited and restarted — an infinite loop.

**Cause:** Strapi v5's `/_health` endpoint returns **HTTP 204 No Content** (not 200). The readiness check used BusyBox `wget --spider` (Alpine Linux's default `wget`). BusyBox `wget --spider` makes a HEAD request and expects either a body or a 200 response — it does **not** treat 204 as a successful response, even though 204 is a valid 2xx status.

**Root cause in Strapi source** (`@strapi/core/dist/services/server/index.js`):
```js
const healthCheck = async (ctx) => {
    ctx.set('strapi', 'You are so French!');
    ctx.status = 204;   // ← returns 204, not 200
};
router.all('/_health', healthCheck);
```

**Fix:**
- Added `curl` to Dockerfile: `apk add --no-cache ... curl`
- Replaced `wget --spider` with `curl -sf` in `start.sh`:
```sh
until curl -sf http://localhost:1337/_health 2>/dev/null; do
```
`curl -sf` treats any HTTP 2xx (including 204) as success and only returns a non-zero exit code on 4xx/5xx errors.

---

## Issue 10 — Telemetry CORS errors blocking admin panel load

**Symptom:** Strapi admin panel shows infinite loading spinner. Browser console shows repeated CORS errors:
```
Cross-Origin Request Blocked: https://analytics.strapi.io/api/v2/track
```

**Cause:** Strapi's telemetry sends tracking data to `analytics.strapi.io` on every admin page load. Railway's network blocks outbound requests to this domain. The failed requests cause CORS errors that can hang the admin UI.

Critically, `STRAPI_TELEMETRY_DISABLED=true` set as a Railway runtime env var does **not** work because the admin panel is built at Docker build time (`RUN npm run build` in Dockerfile). Runtime env vars only exist after the container starts — the admin was already compiled without the telemetry flag.

**Fix:**
1. Added `"telemetryDisabled": true` to `strapi-backend/package.json` in the `"strapi"` object (the canonical method — what `strapi telemetry:disable` CLI writes):
```json
"strapi": {
  "uuid": "milawn-strapi-cms",
  "telemetryDisabled": true
}
```
2. Added `ENV STRAPI_TELEMETRY_DISABLED=true` to Dockerfile **before** `RUN npm run build` (belt and suspenders):
```dockerfile
ENV NODE_ENV=production
ENV STRAPI_TELEMETRY_DISABLED=true
RUN npm run build
```

**Key lesson:** Any `STRAPI_ADMIN_*` or telemetry env vars must be present at Docker build time, not just at runtime.

---

## Issue 11 — CSP blocking `unsafe-eval` crashes admin JavaScript

**Symptom:** Content Manager shows infinite loading spinner. Content-Type Builder sidebar loads but content area is empty. Dashboard widgets show "error". Browser console shows:
```
Content-Security-Policy: The page's settings blocked a JavaScript eval (script-src) from being executed because it violates the following directive: "script-src 'self'" (Missing 'unsafe-eval')
Object { err: TypeError }
```

**Cause:** Strapi's `strapi::security` middleware (which wraps `koa-helmet`) sets a strict Content Security Policy. The default `script-src 'self'` directive blocks `eval()` and `new Function()`. Strapi's admin JS bundle uses `eval()` for Content Manager and Content-Type Builder operations, causing a TypeError that breaks these admin pages.

**Fix:** Configured `strapi::security` in `strapi-backend/config/middlewares.js` to allow `'unsafe-eval'` and `'unsafe-inline'` in `script-src`:
```javascript
module.exports = [
  'strapi::logger',
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          'connect-src': ["'self'", "https:"],
          'img-src': ["'self'", "data:", "blob:", "market-assets.strapi.io"],
          'media-src': ["'self'", "data:", "blob:"],
          'style-src': ["'self'", "'unsafe-inline'"],
        },
      },
    },
  },
  'strapi::cors',
  // ... rest of middleware unchanged
];
```

---

## Issue 12 — Strapi plugin API routes not proxied through nginx

**Symptom:** Content Manager and Content-Type Builder show infinite loading. Network tab shows API calls like `/content-manager/content-types-settings` and `/content-type-builder/reserved-names` returning **Type: html** (6.55 kB) instead of JSON. The response is Astro's `index.html`.

**Cause:** Strapi plugin API routes are served at their own top-level paths — they are **not** under the `/admin/` prefix:
- `/content-manager/` — Content Manager plugin
- `/content-type-builder/` — Content-Type Builder plugin
- `/upload/` — Upload plugin API (distinct from `/uploads/` for static files)
- `/users-permissions/` — Users & Permissions plugin
- `/i18n/` — Internationalization plugin

The nginx config only had proxy locations for `/api/`, `/admin`, and `/uploads/`. Plugin API calls fell through to the Astro catch-all:
```nginx
location / {
    try_files $uri $uri/ /index.html;   # ← served HTML for API calls
    expires 1d;
    add_header Cache-Control "public, immutable";  # ← cached wrong response for 1 day!
}
```

This was especially insidious because `Cache-Control: public, immutable` told browsers to cache the HTML response for 1 day without revalidation. Even after fixing the nginx config, browsers continued serving cached HTML until the cache expired or was manually cleared.

**Fix:** Added nginx proxy locations for each Strapi plugin path:
```nginx
location /content-manager/ {
    proxy_pass http://localhost:1337/content-manager/;
    proxy_http_version 1.1;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Server $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Host $http_host;
}
# Same pattern for: /content-type-builder/, /upload/, /users-permissions/, /i18n/
```

**Important:** After deploying this fix, users must **hard refresh** (Cmd+Shift+R / Ctrl+Shift+R) or clear the browser cache to flush the cached HTML responses. Without this, the browser continues serving stale HTML for the plugin API endpoints.

---

## Final Working Architecture

```
Railway edge (HTTPS:443)
    → container:${PORT} (nginx)
        → /api/health              → return 200 directly (Railway health check)
        → /api/*                   → proxy → localhost:1337 (Strapi API)
        → /admin                   → proxy → localhost:1337/admin (Strapi admin panel)
        → /content-manager/        → proxy → localhost:1337 (Strapi Content Manager plugin)
        → /content-type-builder/   → proxy → localhost:1337 (Strapi Content-Type Builder plugin)
        → /upload/                 → proxy → localhost:1337 (Strapi Upload plugin API)
        → /users-permissions/      → proxy → localhost:1337 (Strapi Users & Permissions plugin)
        → /i18n/                   → proxy → localhost:1337 (Strapi i18n plugin)
        → /uploads/                → proxy → localhost:1337/uploads/ (static uploaded files)
        → /                        → /app/dist/ (Astro static files)
```

**Container startup sequence:**
1. nginx starts immediately on `$PORT` → Railway health checks pass
2. Strapi starts in background on `1337` → connects to Railway Postgres
3. `curl -sf localhost:1337/_health` polls until 204 received
4. `astro build` runs with live Strapi data → outputs to `/app/dist/`
5. `nginx -s reload` picks up new static files
6. `wait $NGINX_PID` keeps container alive

---

## Railway Environment Variables Required

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Auto-injected by Railway Postgres plugin |
| `APP_KEYS` | Strapi app keys (comma-separated base64 strings) |
| `ADMIN_JWT_SECRET` | JWT secret for Strapi admin panel |
| `API_TOKEN_SALT` | Salt for Strapi API tokens |
| `JWT_SECRET` | JWT secret for Strapi content API |
| `NODE_ENV` | Set to `production` |
| `PORT` | **Do NOT set** — Railway auto-assigns |
