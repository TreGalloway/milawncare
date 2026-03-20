# Troubleshooting Guide

## Recently Resolved Issues

### Issue: "node:module.createRequire is not a function" Error in Strapi Admin

**Symptoms:**
- Error in browser console when accessing `http://localhost:1337/admin`:
  - `Module "node:module" has been externalized for browser compatibility`
  - `Cannot access "node:module.createRequire" in client code`
  - File reference: `lodash.mjs:2:14`
  - `Uncaught TypeError: import_node_module.createRequire is not a function`

**Context:**
- Occurs when accessing Strapi Admin Panel (port 1337)
- Error originates from Strapi's Vite build cache
- Affects the browser-based admin interface, not the API

**Root Cause:**
A patch script (`strapi-backend/scripts/patch-lodash-fp.js`) was previously run that:
1. Created ESM wrapper files (`lodash.mjs`, `fp.mjs`) using `createRequire` from `node:module`
2. Modified lodash's `package.json` to add ESM exports pointing to the wrapper files
3. Strapi's Vite build cached the compiled code in `node_modules/.strapi/vite/deps/`

Later, `npm install` was run which:
- Restored the original lodash files (CommonJS only)
- Removed the patched `.mjs` wrapper files
- However, the **Vite cache** still contained the old compiled code with Node.js-only `createRequire` calls

When the Strapi admin panel loads in the browser, it uses this cached chunk which tries to call `createRequire` from `node:module` - a Node.js-only API that doesn't exist in browser environments.

**Solution:**

Clear Strapi's Vite cache and restart:

```bash
cd strapi-backend
rm -rf node_modules/.strapi .strapi
npm run develop
```

Wait for Strapi to fully rebuild the admin panel (you'll see the admin URL in the console).

**Prevention:**

Updated `astro.config.mjs` to prevent lodash from being bundled in the Astro frontend:

```javascript
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
}
```

**Related Changes:**
- Commit: Enhanced Vite configuration to exclude lodash from bundling
- Files modified: `astro.config.mjs`

---

### Issue: "Cannot find module 'kleur/colors'" Error

**Symptoms:**
- Error when starting Astro dev server:
  - `Cannot find module 'kleur/colors' imported from '/Volumes/x9-pro/Users/tre/code/milawn/node_modules/astro/dist/runtime/server/endpoint.js'`
- Stack trace points to Astro's internal files
- Server fails to start or crashes immediately

**Context:**
- Occurs when running `pnpm dev` in the frontend
- `kleur` is a color utility library used internally by Astro for terminal output
- Error appeared after clearing caches with `rm -rf .astro node_modules/.vite`

**Root Cause:**
Corrupted `node_modules` or broken symlinks after clearing caches. The `kleur` package is a dependency of Astro, but the symlinks or package structure became corrupted, preventing Node.js from resolving the module.

**Solution:**

Reinstall all frontend dependencies:

```bash
cd /Volumes/x9-pro/Users/tre/code/milawn
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm dev
```

**Alternative (quicker fix):**

```bash
cd /Volumes/x9-pro/Users/tre/code/milawn
pnpm add kleur
pnpm dev
```

---

## Troubleshooting Template

Use this template to document new issues:

```markdown
### Issue: [Brief, Descriptive Title]

**Symptoms:**
- [List specific error messages]
- [Describe unexpected behavior]
- [Note any file references or line numbers]

**Context:**
- [When does this occur?]
- [What were you doing when it happened?]
- [Which port/service is affected? 4321 (Astro) or 1337 (Strapi)?]

**Root Cause:**
- [Explain the underlying technical reason]
- [Identify which component/system is responsible]
- [Note any recent changes that may have triggered it]

**Solution:**
\`\`\`bash
# Commands to fix the issue
# Step 1: ...
# Step 2: ...
\`\`\`

**Prevention:**
- [Steps to prevent this from happening again]
- [Configuration changes made]
- [Best practices to follow]

**Related Changes:**
- Commit: [commit hash or description]
- Files modified: [list of files]
```

---

## Quick Reference Commands

### Frontend (Astro) Issues

**Clear Astro caches:**
```bash
rm -rf .astro node_modules/.vite
pnpm dev
```

**Reinstall frontend dependencies:**
```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm dev
```

**Build for production:**
```bash
pnpm build
```

### Backend (Strapi) Issues

**Clear Strapi caches:**
```bash
cd strapi-backend
rm -rf node_modules/.strapi .strapi
npm run develop
```

**Full Strapi reset:**
```bash
cd strapi-backend
rm -rf node_modules .strapi package-lock.json
npm install
npm run develop
```

**Build Strapi admin for production:**
```bash
cd strapi-backend
npm run build
```

### Full Project Reset

If both frontend and backend are having issues:

```bash
# Frontend reset
cd /Volumes/x9-pro/Users/tre/code/milawn
rm -rf node_modules pnpm-lock.yaml .astro
pnpm install

# Backend reset  
cd strapi-backend
rm -rf node_modules .strapi package-lock.json
npm install

# Start both services
# Terminal 1:
cd strapi-backend && npm run develop

# Terminal 2:
cd /Volumes/x9-pro/Users/tre/code/milawn && pnpm dev
```

---

## General Troubleshooting Guidelines

### 1. Identify the Service

First, determine which service is causing the error:

- **Port 4321** (`http://localhost:4321`) = Astro frontend
- **Port 1337** (`http://localhost:1337`) = Strapi backend
- **Port 1337/admin** (`http://localhost:1337/admin`) = Strapi admin panel

### 2. Check Error Location

- **Browser console errors** = Frontend (Astro) or Admin panel (Strapi) issue
- **Terminal/server errors** = Backend (Strapi API) or build process issue

### 3. Clear Appropriate Caches

Always try clearing caches before reinstalling:

| Issue Type | Cache Location | Command |
|------------|---------------|---------|
| Astro frontend | `.astro/`, `node_modules/.vite/` | `rm -rf .astro node_modules/.vite` |
| Strapi backend | `strapi-backend/node_modules/.strapi/`, `strapi-backend/.strapi/` | `rm -rf strapi-backend/node_modules/.strapi strapi-backend/.strapi` |

### 4. When to Reinstall Dependencies

Reinstall if:
- Cache clearing doesn't help
- You see "Cannot find module" errors
- Symlink-related errors appear
- Package versions seem out of sync

### 5. Check Running Processes

Sometimes multiple instances cause conflicts:

```bash
# Check what's running on the ports
lsof -i :4321  # Astro frontend
lsof -i :1337  # Strapi backend

# Kill if needed
kill $(lsof -t -i:4321)
kill $(lsof -t -i:1337)
```

### 6. Check Environment Variables

Ensure `.env` file exists with required variables:

```bash
# Frontend (.env)
STRAPI_URL=http://localhost:1337
STRAPI_API_TOKEN=your-token-here
PREVIEW_SECRET=your-secret-here

# Backend (strapi-backend/.env)
# Created automatically by Strapi, usually no manual edits needed
```

### 7. Node.js Version

Strapi requires Node.js 20.x:

```bash
# Check version
node --version

# If not 20.x, switch using fnm
fnm install 20
fnm use 20
```

### 8. Common Module Resolution Issues

If you see "Module X has been externalized for browser compatibility":

- This means Vite found a Node.js-only module being imported in browser code
- Check if the import is in frontend code (shouldn't be)
- Add the module to `vite.optimizeDeps.exclude` in `astro.config.mjs`
- If it's a transitive dependency, try adding it to `vite.ssr.external`

### 9. Strapi Admin Panel Won't Load

If the admin panel shows a blank page or errors:

1. Clear Strapi cache: `rm -rf strapi-backend/node_modules/.strapi`
2. Rebuild admin: `cd strapi-backend && npm run build`
3. Restart: `npm run develop`

### 10. Database Issues

If Strapi won't start due to database errors:

```bash
# Reset SQLite database (WARNING: deletes all data!)
cd strapi-backend
rm .tmp/data.db
npm run develop
```

---

## Getting Help

If an issue persists after following this guide:

1. Check the logs carefully for the **first** error (subsequent errors are often cascades)
2. Search this document for similar error messages
3. Check the [Astro documentation](https://docs.astro.build) or [Strapi documentation](https://docs.strapi.io)
4. Document the issue using the template above and add it to this file

---

*Last updated: March 20, 2026*
*For issues with this project, check AGENTS.md for project-specific guidance*
