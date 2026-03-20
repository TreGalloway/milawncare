# Hosting Guide

Complete deployment guide for hosting MI Premier Lawn Care website on Railway with both Astro frontend and Strapi backend.

## Overview

**Architecture**: Both Astro and Strapi hosted on single Railway service  
**Cost**: $7/month (Railway Standard plan)  
**Domain**: Custom domain required  
**Timeline**: Deploy in 2-3 hours  
**Best for**: Local Michigan business (no global CDN needed)

## Why This Setup?

| Factor | Decision |
|--------|----------|
| **Budget** | $7/month fits within $5-10 target |
| **Traffic** | 500 visitors/month = Single region is fine |
| **Complexity** | One platform vs managing two services |
| **Maintenance** | Railway handles updates, SSL, backups |
| **Images** | 20-50 images = Cloudinary free tier sufficient |

**Alternative considered**: Split setup (Vercel + Railway)  
**Why not chosen**: Overkill for local-only business, adds complexity

---

## Prerequisites

Before starting deployment:

1. **Domain purchased** ($10-15/year)
   - Suggested: `mipremierlawncare.com`
   - Providers: Namecheap, Cloudflare, Google Domains
   - **Buy first** - DNS takes 30-60 min to propagate

2. **Railway account created**
   - Sign up at [railway.app](https://railway.app)
   - Connect GitHub account
   - Add payment method ($7/month plan)

3. **Cloudinary account** (free)
   - Sign up at [cloudinary.com](https://cloudinary.com)
   - Free tier: 25GB storage + bandwidth

---

## Deployment Files

These files need to be created in project root:

### 1. railway.toml
```toml
[build]
builder = "DOCKERFILE"

[deploy]
startCommand = "npm start"
healthcheckPath = "/api/health"
healthcheckTimeout = 100
restartPolicyType = "ON_FAILURE"
```

### 2. Dockerfile
```dockerfile
# Multi-stage build for Astro + Strapi
FROM node:20-alpine

# Install pnpm and nginx
RUN npm install -g pnpm && \
    apk add --no-cache nginx

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY strapi-backend/package.json ./strapi-backend/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build Astro (static site)
RUN pnpm build

# Build Strapi admin
WORKDIR /app/strapi-backend
RUN npm run build

# Setup nginx configuration
WORKDIR /app
COPY nginx.conf /etc/nginx/nginx.conf

# Create startup script
COPY start.sh ./
RUN chmod +x start.sh

# Expose port 80
EXPOSE 80

# Start both services
CMD ["./start.sh"]
```

### 3. nginx.conf
```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript;

    server {
        listen 80;
        server_name localhost;
        root /app/dist;
        index index.html;

        # Astro static files
        location / {
            try_files $uri $uri/ /index.html;
            expires 1d;
            add_header Cache-Control "public, immutable";
        }

        # Strapi API
        location /api/ {
            proxy_pass http://localhost:1337;
            proxy_http_version 1.1;
            proxy_set_header X-Forwarded-Host $host;
            proxy_set_header X-Forwarded-Server $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header Host $http_host;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "Upgrade";
        }

        # Strapi Admin
        location /admin {
            proxy_pass http://localhost:1337/admin;
            proxy_http_version 1.1;
            proxy_set_header X-Forwarded-Host $host;
            proxy_set_header X-Forwarded-Server $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header Host $http_host;
        }

        # Strapi Uploads (if using local storage temporarily)
        location /uploads/ {
            proxy_pass http://localhost:1337/uploads/;
        }
    }
}
```

### 4. start.sh
```bash
#!/bin/sh
set -e

echo "Starting MI Premier Lawn Care..."

# Start Strapi in background
cd /app/strapi-backend
echo "Starting Strapi..."
npm start &
STRAPI_PID=$!

# Wait for Strapi to be ready
echo "Waiting for Strapi to start..."
sleep 10

# Check if Strapi is running
if ! kill -0 $STRAPI_PID 2>/dev/null; then
    echo "ERROR: Strapi failed to start"
    exit 1
fi

echo "Strapi started successfully (PID: $STRAPI_PID)"

# Start Nginx in foreground (keeps container running)
echo "Starting Nginx..."
exec nginx -g 'daemon off;'
```

### 5. Update package.json (root)
Add a start script:
```json
{
  "scripts": {
    "dev": "astro dev",
    "start": "./start.sh",
    "build": "astro build",
    "preview": "astro preview",
    "astro": "astro"
  }
}
```

---

## Step-by-Step Deployment

### Phase 1: Prepare Repository (15 min)

1. **Create deployment files** (listed above)

2. **Test locally** (optional but recommended):
   ```bash
   # Build both apps
   pnpm build
   cd strapi-backend && npm run build && cd ..
   
   # Test Docker build (requires Docker installed)
   docker build -t milawn-test .
   docker run -p 80:80 milawn-test
   ```

3. **Commit and push**:
   ```bash
   git add railway.toml Dockerfile nginx.conf start.sh
   git commit -m "feat: add Railway deployment configuration"
   git push
   ```

### Phase 2: Setup Railway (20 min)

1. **Create new project**:
   - Railway dashboard → New Project
   - Select "Deploy from GitHub repo"
   - Choose your milawn repository
   - Railway auto-detects Dockerfile

2. **Add PostgreSQL database**:
   - Click "New" → Database → PostgreSQL
   - Railway provisions automatically
   - Sets `DATABASE_URL` environment variable

3. **Configure environment variables**:
   
   Go to Variables tab and add:
   
   ```env
   # Strapi Secrets (copy from strapi-backend/.env)
   APP_KEYS=your-app-keys-here
   API_TOKEN_SALT=your-api-token-salt
   ADMIN_JWT_SECRET=your-admin-jwt-secret
   JWT_SECRET=your-jwt-secret
   TRANSFER_TOKEN_SALT=your-transfer-token-salt
   
   # Strapi Config
   NODE_ENV=production
   PORT=1337
   HOST=0.0.0.0
   
   # Database (auto-set by Railway, verify it exists)
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   
   # Astro Build
   STRAPI_URL=http://localhost:1337
   STRAPI_API_TOKEN=your-api-token
   PREVIEW_SECRET=your-preview-secret
   
   # Cloudinary (after creating account)
   CLOUDINARY_NAME=your-cloud-name
   CLOUDINARY_KEY=your-api-key
   CLOUDINARY_SECRET=your-api-secret
   ```

4. **Deploy**:
   - Click "Deploy"
   - Watch build logs (takes 5-10 minutes)
   - Railway provides temporary URL

### Phase 3: Configure Cloudinary (10 min)

1. **Install Cloudinary provider**:
   In Strapi admin → Marketplace → Install "Cloudinary" provider

2. **Update Strapi config** (if needed):
   Create/edit `strapi-backend/config/plugins.js`:
   ```javascript
   module.exports = {
     upload: {
       config: {
         provider: 'cloudinary',
         providerOptions: {
           cloud_name: process.env.CLOUDINARY_NAME,
           api_key: process.env.CLOUDINARY_KEY,
           api_secret: process.env.CLOUDINARY_SECRET,
         },
         actionOptions: {
           upload: {},
           uploadStream: {},
           delete: {},
         },
       },
     },
   };
   ```

3. **Redeploy** if you changed config files

### Phase 4: Setup Custom Domain (15 min)

1. **In Railway dashboard**:
   - Go to your service → Settings
   - Click "Custom Domain"
   - Enter your domain: `mipremierlawncare.com`
   - Railway shows DNS records needed

2. **In your domain provider**:
   - Add CNAME record: `mipremierlawncare.com` → `your-app.up.railway.app`
   - Or A record pointing to Railway's IP
   - Wait 5-30 minutes for DNS propagation

3. **Verify SSL**:
   - Railway auto-provisions SSL certificate
   - Test: `https://mipremierlawncare.com`

4. **Update environment variables**:
   ```env
   STRAPI_URL=https://mipremierlawncare.com
   ```
   - Redeploy to apply changes

### Phase 5: Content Setup (30 min)

1. **Create admin user**:
   - Visit `https://your-domain.com/admin`
   - Create first admin account

2. **Set up API permissions**:
   - Settings → Users & Permissions → Roles → Public
   - Enable: find, findOne for all content types
   - Save

3. **Import or recreate content**:
   - Option A: Manually recreate pages, services, etc.
   - Option B: Export from local, import to production

4. **Upload images**:
   - Use Cloudinary (now configured)
   - Or upload directly in Strapi (goes to Cloudinary)

### Phase 6: Testing & Go Live (10 min)

**Test checklist**:
- [ ] Homepage loads at custom domain
- [ ] All pages accessible
- [ ] Images load correctly
- [ ] Admin panel works at `/admin`
- [ ] API endpoints respond at `/api/pages`
- [ ] SSL certificate valid (green lock)
- [ ] Contact forms work (if applicable)
- [ ] Mobile responsive

**Performance check**:
```bash
# Test load time
curl -o /dev/null -s -w "Total time: %{time_total}s\n" https://your-domain.com

# Should be < 1 second for static pages
```

---

## Post-Deployment

### Content Updates

**For minor content changes**:
1. Log into Strapi admin: `https://your-domain.com/admin`
2. Edit content
3. Save & Publish
4. Changes live immediately (no rebuild needed)

**For major site changes** (new components, styling):
1. Update code locally
2. Test with `pnpm dev`
3. Commit and push
4. Railway auto-redeploys

### Monitoring

**Railway dashboard shows**:
- CPU usage
- Memory usage
- Request logs
- Deployment history
- Database metrics

**Set up alerts** (optional):
- CPU > 80%
- Memory > 80%
- Service down

### Backups

**Railway PostgreSQL**:
- Automatic daily backups (included)
- Manual backup: Railway dashboard → Database → Backup

**Content backup**:
```bash
# Export Strapi content
npm run strapi export -- --file backup-$(date +%Y%m%d)
```

### Scaling (Future)

If traffic grows beyond 500/month:

**Option 1: Upgrade Railway** ($7 → $15/month)
- More RAM
- More CPU
- Better performance

**Option 2: Add CDN** (free)
- Cloudflare (free plan)
- Better global performance
- Still keep Railway for hosting

**Option 3: Separate services** ($10/month)
- Astro on Vercel (free)
- Strapi on Railway ($7)
- Better caching

---

## Troubleshooting

### Build Fails

**Error**: "Cannot find module"
- Check if all dependencies in package.json
- Run `pnpm install` locally to verify

**Error**: "Out of memory"
- Upgrade to Railway Standard plan (2GB RAM)
- Or optimize build process

**Error**: "Port already in use"
- Ensure Strapi uses port 1337
- Nginx uses port 80

### Strapi Won't Start

**Check logs**:
```bash
# In Railway dashboard
Click service → Logs tab
```

**Common issues**:
- Missing environment variables
- Database connection failed
- Wrong NODE_ENV

### Domain Not Working

**DNS not propagated**:
```bash
# Check DNS
nslookup your-domain.com

# Should show Railway IP or CNAME
```

**SSL certificate issues**:
- Wait 10-15 minutes after DNS propagation
- Railway auto-provisions SSL
- Check domain spelling

### Images Not Loading

**Cloudinary not configured**:
- Verify environment variables
- Check Cloudinary dashboard for usage
- Test upload in Strapi admin

**Wrong URL paths**:
- Check image URLs in browser dev tools
- Should point to Cloudinary, not localhost

---

## Cost Breakdown

| Service | Monthly Cost | Annual Cost |
|---------|--------------|-------------|
| Railway Standard | $7 | $84 |
| Domain (Namecheap) | ~$1 | $12-15 |
| Cloudinary | $0 | $0 |
| **Total** | **~$8** | **~$100** |

**Free alternatives**:
- Railway Starter: $5/month (less RAM)
- Domain: Google Domains ($12/year)
- Cloudinary: Free tier sufficient

---

## Quick Reference Commands

**View logs**:
```bash
# Railway CLI (optional)
npm install -g @railway/cli
railway logs
```

**Restart service**:
```bash
# Railway dashboard
Click service → Deploy → Redeploy
```

**Database access**:
```bash
# Railway dashboard
Click PostgreSQL → Connect tab
Copy connection string
```

**Environment variables**:
```bash
# View all
railway variables

# Update
railway variables set KEY=value
```

---

## Support Resources

**Railway**:
- Docs: https://docs.railway.app
- Discord: https://discord.gg/railway
- Status: https://railway.statuspage.io

**Strapi**:
- Docs: https://docs.strapi.io
- Forum: https://forum.strapi.io

**Astro**:
- Docs: https://docs.astro.build
- Discord: https://astro.build/chat

**This project**:
- See `docs/TROUBLESHOOT.md` for common issues
- See `AGENTS.md` for project-specific guidance

---

*Last updated: March 20, 2026*  
*For updates or issues, check Railway's documentation for latest best practices*
