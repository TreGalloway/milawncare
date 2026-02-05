# Milawn

A modern SSG website built with **Astro**, **Strapi v5**, and **Tailwind CSS**.

## Architecture

```
milawn/
├── strapi-backend/     # Strapi v5 CMS (localhost:1337)
│   ├── Page content type with Blocks editor
│   ├── Media Library for images
│   └── REST API
│
└── src/                # Astro frontend
    ├── pages/          # SSG routes
    ├── components/     # React/Astro components
    └── lib/            # API utilities
```

## Prerequisites

- Node.js 20.x (use nvm to manage versions)
- pnpm (package manager)

## Quick Start

### 1. Start Strapi Backend

```bash
cd strapi-backend
source ~/.nvm/nvm.sh && nvm use 20
npm run develop
```

**First-time setup:**
1. Visit http://localhost:1337/admin
2. Create an admin user
3. Go to Settings → Users & Permissions → Roles → Public
4. Enable permissions for Page (find, findOne) and Upload (find, findOne)
5. Create your first page in Content Manager

### 2. Start Astro Frontend

```bash
# In a new terminal
cd /Volumes/x9-pro/Users/tre/code/milawn
source ~/.nvm/nvm.sh && nvm use 20
pnpm dev
```

The Astro site will be available at: http://localhost:4321

## Features

### ✅ Implemented

- **Static Site Generation (SSG)** - Lightning fast performance
- **Strapi v5 CMS** - Headless CMS with Blocks editor
  - Page content type (title, slug, content, heroImage, SEO)
  - Draft & publish workflow
  - Media Library for images
- **Tailwind CSS** - Utility-first styling
- **Blocks Renderer** - Renders Strapi Blocks content (paragraphs, headings, lists, images, quotes, code)
- **Preview Mode** - `/api/preview?secret=preview-secret-key&documentId=xxx`
- **Images from Strapi** - Served directly from Media Library

### 📝 Content Structure

**Page Collection Type:**
- `title` (String, required) - Page title
- `slug` (UID, required) - URL-friendly identifier
- `content` (Blocks) - Rich content with Strapi Blocks editor
- `heroImage` (Media) - Single image for page header
- `metaTitle` (String) - SEO meta title
- `metaDescription` (Text) - SEO meta description

## API Usage

### Get All Pages
```bash
curl http://localhost:1337/api/pages?populate=*
```

### Get Specific Page
```bash
curl "http://localhost:1337/api/pages?filters[slug][$eq]=about-us&populate=*"
```

### Preview Draft Content
```bash
curl "http://localhost:1337/api/pages?publicationState=preview&populate=*"
```

## Development Workflow

1. **Add content in Strapi** - Create/edit pages in the admin panel
2. **View in Astro** - Pages are automatically fetched at build time
3. **Preview drafts** - Use preview mode before publishing
4. **Build for production** - Static HTML generated with all content

## Project Structure

```
milawn/
├── strapi-backend/
│   ├── config/              # Strapi configuration
│   ├── src/api/page/        # Page content type
│   │   ├── content-types/
│   │   ├── controllers/
│   │   ├── routes/
│   │   └── services/
│   └── README.md
│
├── src/
│   ├── components/
│   │   └── BlocksRenderer.astro    # Renders Strapi Blocks
│   ├── layouts/
│   │   └── Layout.astro            # Base layout
│   ├── lib/
│   │   └── strapi.ts               # API utilities
│   ├── pages/
│   │   ├── index.astro             # Homepage (lists all pages)
│   │   ├── [slug].astro            # Dynamic page routes
│   │   └── api/preview.astro       # Preview mode
│   └── types/
│       └── index.ts                # TypeScript types
│
├── .env                     # Environment variables
├── astro.config.mjs         # Astro configuration
├── tailwind.config.mjs      # Tailwind configuration
└── package.json
```

## Commands Reference

### Strapi Backend
```bash
cd strapi-backend
npm run develop    # Start dev server with hot reload
npm run start      # Start production server
npm run build      # Build admin panel
```

### Astro Frontend
```bash
# In project root
pnpm dev           # Start dev server (localhost:4321)
pnpm build         # Build for production
pnpm preview       # Preview production build
```

## Environment Variables

**Frontend (.env):**
```env
STRAPI_URL=http://localhost:1337
STRAPI_API_TOKEN=                    # Optional: for private content
PREVIEW_SECRET=preview-secret-key    # For preview mode
```

**Backend (strapi-backend/.env):**
Created automatically on first run

## Deployment

### Build Static Site
```bash
# 1. Ensure Strapi is running with content
# 2. Build Astro
pnpm build

# Output in dist/ directory
```

### Deployment Options

**Frontend (Astro):**
- Netlify, Vercel, Cloudflare Pages (static hosting)
- AWS S3 + CloudFront
- Any static hosting

**Backend (Strapi):**
- Strapi Cloud
- DigitalOcean, Heroku, Railway
- Self-hosted VPS
- AWS/GCP/Azure

## Next Steps

1. ✓ Create pages in Strapi admin
2. ✓ Test API endpoints
3. ✓ View pages in Astro frontend
4. Customize styling in `tailwind.config.mjs`
5. Add more content types as needed
6. Configure deployment pipeline

## Troubleshooting

**Strapi won't start:**
- Ensure Node.js 20.x is active: `nvm use 20`
- Check port 1337 is available
- Delete `.tmp/` and restart

**Astro can't fetch data:**
- Verify Strapi is running
- Check public permissions are enabled
- Test API: `curl http://localhost:1337/api/pages`

**Preview mode not working:**
- Verify PREVIEW_SECRET in .env matches the URL parameter
- Check page documentId exists in Strapi

## License

MIT
# milawncare
