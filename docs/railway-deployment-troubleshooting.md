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

## Issue 13 — Navigation links fail with "can't connect to :8080"

**Symptom:** After browsing the site for 1–2 minutes, clicking navigation links (e.g., Services, About) fails with "Zen can't connect to the server at mipremierlawncare.com:8080."

**Cause:** Nginx's default trailing-slash redirect behavior leaks Railway's internal port.

Astro SSG generates directory-based routes (e.g., `/app/dist/services/index.html`). When a browser requests `/services`, nginx's `try_files $uri $uri/ /index.html` finds the directory `/app/dist/services/` and issues a **301 redirect** to append the trailing slash. By default, nginx includes its listen port in the redirect `Location` header:
```
Location: http://mipremierlawncare.com:8080/services/
```
Railway assigns port 8080 internally but only exposes 80/443 publicly, so the browser can't connect.

The aggressive `expires 1d; add_header Cache-Control "public, immutable"` on the `location /` block (originally added for static file performance) made this worse — the browser cached the bad 301 redirect for 24 hours. Even after a fix, the cached redirect continued failing.

**Fix (nginx.conf.template):**

1. Added `port_in_redirect off;` and `absolute_redirect off;` to the `server {}` block — prevents nginx from including the internal port in any redirect `Location` headers:
```nginx
port_in_redirect off;
absolute_redirect off;
```

2. Changed `try_files` to serve index.html directly without triggering a redirect:
```nginx
location / {
    try_files $uri $uri/index.html =404;
}
```
The old `$uri/` fallback triggered an internal-to-external redirect when a directory was found. The new `$uri/index.html` serves the file directly.

3. Moved aggressive caching to a separate static-asset-only location block:
```nginx
location ~* \.(css|js|jpg|jpeg|png|gif|ico|svg|webp|avif|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```
HTML pages now use default no-cache behavior, which is correct for content that rebuilds when CMS data changes.

**Key lesson:** Never cache HTML responses with `immutable` on a site that rebuilds dynamically. Cache only fingerprinted static assets.

---

## Issue 14 — Strapi admin "Cannot read image.png" on NavigationItem

**Symptom:** When creating or editing NavigationItem entries in the Strapi admin panel, the admin throws "Cannot read image.png — this model does not support image input" even though the NavigationItem content type has no image field (only `label`, `url`, `tabOrder`, `showInHeader`).

**Cause:** The Strapi admin panel is built during the Docker image build step (`RUN npm run build` in the Dockerfile). At Docker build time, no database is available (`DATABASE_URL` is a Railway runtime env var), so the admin's compiled schema cache is stale or based on incomplete information. At runtime, the admin's compiled JavaScript has incorrect assumptions about which fields exist on content types.

**Fix (start.sh):**

1. Clear Strapi's `.cache` directory before starting Strapi — removes stale schema data from the Docker build:
```sh
rm -rf /app/strapi-backend/.cache
```

2. Rebuild the Strapi admin panel at runtime, after Strapi is healthy and the database is available:
```sh
echo "Rebuilding Strapi admin panel..."
cd /app/strapi-backend
NODE_ENV=production npm run build 2>&1 || echo "WARN: Strapi admin rebuild failed, using Docker-build version"
```
The `|| echo` fallback ensures the container still starts if the rebuild fails. The Docker-build version of the admin is used as a fallback.

**Key lesson:** Strapi admin builds that happen without a database connection produce stale schema caches. In single-container deployments where the database is only available at runtime, rebuild the admin after the database is connected.

> ⚠️ **Superseded by Issue 15.** The runtime `strapi build` introduced here causes an out-of-memory crash in Railway's production containers. Do **not** rebuild the Strapi admin at runtime. See Issue 15 for the correct approach.

---

## Issue 15 — Runtime `strapi build` OOM wipes admin panel → "Not Found"

**Symptom:** Strapi admin at `/admin` returns a plain-text "Not Found" (9 bytes, `text/plain`). Container logs show:
```
Rebuilding Strapi admin panel...
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
Aborted
WARN: Strapi admin rebuild failed, using Docker-build version
```
Then later:
```
Error: ENOENT: no such file or directory, open '/app/strapi-backend/build/index.html'
```

**Cause:** Issue 14's fix added `NODE_ENV=production npm run build` to `start.sh` at container startup. Railway's production containers have ~512MB RAM. Node.js's default heap cap is ~486MB. The Vite bundler (used by `strapi build`) is extremely memory-intensive and hits the heap limit mid-write. The OOM kill corrupts or deletes `build/index.html` and the JS chunk files. Strapi then can't find the admin panel and returns Koa's default plain-text 404.

**Fix:**
1. Remove the runtime `npm run build` block from `start.sh`:
```sh
# REMOVE these lines:
echo "Rebuilding Strapi admin panel..."
cd /app/strapi-backend
NODE_ENV=production npm run build 2>&1 || echo "WARN: ..."
```

2. Build the Strapi admin **once** at Docker build time with a raised heap limit (see Issue 16 for the Dockerfile change):
```dockerfile
ENV NODE_OPTIONS=--max-old-space-size=2048
RUN npm run build
```
Railway's Docker build environment has significantly more RAM than the runtime container, so the build succeeds there.

**Key lesson:** Never run `strapi build` (or any Vite build) inside a production container at startup. Railway production instances are memory-constrained. Build at image-build time where resources are less limited.

---

## Issue 16 — Docker image export timeout (single-stage image too large)

**Symptom:** Railway build log ends with a timeout during the "exporting to docker image format" step. Build itself completes successfully but the image never gets pushed.

**Cause:** The single-stage Dockerfile installed build tools that were needed only to compile native npm modules, but they remained in the final image. `apk add --no-cache build-base python3 postgresql-dev` pulled in gcc, g++, clang, llvm, icu, and 64 total APK packages (~735MB). Combined with node_modules, the final image reached ~1.5GB. Railway's image export step timed out before finishing.

**Fix:** Rewrote the Dockerfile as a **multi-stage build**:
```dockerfile
# Stage 1: Builder — has all compilers, runs strapi build, prunes devDeps
FROM node:20-alpine AS builder
RUN apk add --no-cache build-base python3 postgresql-dev
# ... install deps, copy source ...
ENV NODE_OPTIONS=--max-old-space-size=2048
RUN npm run build       # builds Strapi admin panel with 2GB heap
RUN npm prune --production

# Stage 2: Runtime — clean Alpine, no build tools
FROM node:20-alpine
RUN apk add --no-cache nginx gettext curl   # runtime-only: 23.6MB total
COPY --from=builder /app/strapi-backend ./strapi-backend/
# ... copy only what's needed at runtime ...
```

Also added `.dockerignore` to reduce build context:
```
.git
.claude          # worktrees — can be very large
node_modules
strapi-backend/node_modules
.tmp
*.log
```

**Result:** Runtime image goes from ~1.5GB → ~400MB. Export completes within Railway's timeout.

---

## Issue 17 — `COPY strapi-backend/dist/` fails (directory doesn't exist)

**Symptom:** Multi-stage build fails with:
```
ERROR: "/app/strapi-backend/dist": not found
Dockerfile:54
54 | >>> COPY --from=builder /app/strapi-backend/dist ./strapi-backend/dist/
```

**Cause:** When designing the multi-stage COPY stage, `strapi-backend/dist/` was included on the assumption that `strapi build` compiles TypeScript to `dist/`. It does not. `strapi build` only outputs the admin panel to `build/`. The `dist/` directory is created by `strapi start`/`strapi develop` at runtime (Strapi compiles TS on the fly at startup).

**Fix:** Remove the `dist/` COPY line entirely:
```dockerfile
# Remove this line:
COPY --from=builder /app/strapi-backend/dist ./strapi-backend/dist/
```

Strapi v5 compiles TypeScript from `src/` at container startup — no pre-compiled `dist/` needed in the image.

---

## Issue 18 — Cherry-picked COPY lines miss files Strapi v5 needs at startup

**Symptom:** After the multi-stage build succeeds and deploys, the admin HTML loads (HTTP 200) but all JS chunks return HTTP 404. Browser console shows:
```
Loading module from "https://mipremierlawncare.com/admin/strapi-Cmy6igNu.js"
was blocked because of a disallowed MIME type ("text/html").
```
Railway HTTP logs confirm: `GET /admin/strapi-Cmy6igNu.js → 404`.

**Cause:** The runtime stage used individual `COPY` lines for each strapi-backend subdirectory (`src/`, `config/`, `build/`, `public/`, `favicon.png`). This missed:
- `.strapi/client/` — auto-generated admin entry points (`index.html`, `app.js`) that Strapi v5 generates and needs at startup to locate and serve the admin panel
- `tsconfig.json` — Strapi uses this to determine if the project uses TypeScript and to resolve paths at startup

Without `.strapi/client/`, Strapi v5 couldn't properly initialize its admin-serving middleware. The `build/index.html` existed but the JS chunk files weren't being served.

**Fix:** Replace the 7 individual `COPY` lines with a single directory copy:
```dockerfile
# Before (missed .strapi/client/, tsconfig.json, etc.):
COPY --from=builder /app/strapi-backend/package.json ./strapi-backend/
COPY --from=builder /app/strapi-backend/node_modules ./strapi-backend/node_modules/
COPY --from=builder /app/strapi-backend/src ./strapi-backend/src/
COPY --from=builder /app/strapi-backend/config ./strapi-backend/config/
COPY --from=builder /app/strapi-backend/build ./strapi-backend/build/
COPY --from=builder /app/strapi-backend/public ./strapi-backend/public/
COPY --from=builder /app/strapi-backend/favicon.png ./strapi-backend/

# After (copies everything — node_modules are already pruned in builder):
COPY --from=builder /app/strapi-backend ./strapi-backend/
```

**Key lesson:** When using a multi-stage build, copy entire project directories rather than cherry-picking subdirectories unless you have a comprehensive list of every file a framework needs at runtime.

---

## Issue 19 — `start.sh` fix existed only in worktree branch, not `main`

**Symptom:** Despite having committed a fix to remove the runtime admin rebuild, every new Railway deploy still showed "Rebuilding Strapi admin panel..." in the logs and still OOMed. The admin remained broken after every deploy.

**Cause:** The `start.sh` fix (removing the runtime `strapi build`) was committed to the `claude/festive-lewin` git worktree branch — a separate branch used during development. The `main` branch, which Railway deploys from, still had the old `start.sh` with the OOM rebuild at step 6. The Dockerfile was updated in `main` (multi-stage build) but `start.sh` was not.

**Fix:** Read `main`'s `start.sh` directly and remove the runtime rebuild block:
```sh
# Remove from start.sh in main:
# 6. Rebuild Strapi admin against live DB schema
echo "Rebuilding Strapi admin panel..."
cd /app/strapi-backend
NODE_ENV=production npm run build 2>&1 || echo "WARN: Strapi admin rebuild failed, using Docker-build version"
```
Commit and push directly to `main`.

**Key lesson:** When using git worktrees for development, always verify which branch is being deployed and sync fixes to that branch explicitly. A fix committed to a feature branch has no effect on production until merged or cherry-picked to the deploy branch.

---

## Final Working Architecture

**Docker image:** Multi-stage build — builder stage compiles everything, runtime stage is clean Alpine with only nginx + curl + Node.js. Image size ~400MB vs the original ~1.5GB.

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
1. nginx starts immediately on `$PORT` → Railway health checks pass from second 0
2. Strapi `.cache` cleared (removes any stale data from Docker build)
3. Strapi starts in background on `1337` → connects to Railway Postgres
4. `curl -sf localhost:1337/_health` polls until 204 received
5. `astro build` runs with live Strapi data → outputs to `/app/dist/`
6. `nginx -s reload` picks up new static files
7. `wait $NGINX_PID` keeps container alive

**Note:** The Strapi admin panel is built **once** during `docker build` with `NODE_OPTIONS=--max-old-space-size=2048`. It is **not** rebuilt at container startup — the production container does not have enough RAM for the Vite bundler (see Issues 15, 19).

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
