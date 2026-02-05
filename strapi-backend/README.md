# Strapi Backend

Strapi v5 CMS for the Milawn project.

## Setup Instructions

### 1. Start Strapi

```bash
npm run develop
```

Strapi will be available at: http://localhost:1337/admin

### 2. Create Admin User

Visit http://localhost:1337/admin and create your first administrator account.

### 3. Configure Public Permissions

1. Go to **Settings** → **Users & Permissions** → **Roles** → **Public**
2. Enable these permissions:
   - **Page**: 
     - `find` (Get all pages)
     - `findOne` (Get single page)
   - **Upload**: 
     - `find` (Access media)
     - `findOne` (Access single media)
3. Save the changes

### 4. Create Pages

1. Go to **Content Manager** → **Page**
2. Click "Create new entry"
3. Fill in the fields:
   - **Title**: Page title (e.g., "About Us")
   - **Slug**: Auto-generated from title (e.g., "about-us")
   - **Content**: Use the Blocks editor to add rich text, images, etc.
   - **Hero Image**: Upload an image (optional)
   - **Meta Title**: SEO title (optional)
   - **Meta Description**: SEO description (optional)
4. Save and publish

### 5. Test the API

```bash
# Get all pages
curl http://localhost:1337/api/pages

# Get specific page by slug
curl http://localhost:1337/api/pages?filters[slug][$eq]=about-us

# Get page with populated relations
curl "http://localhost:1337/api/pages?populate=*"
```

## Content Type Schema

### Page

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | String | Yes | Page title |
| slug | UID | Yes | URL-friendly identifier |
| content | Blocks | No | Rich content using Strapi Blocks editor |
| heroImage | Media | No | Single image for page header |
| metaTitle | String | No | SEO meta title |
| metaDescription | Text | No | SEO meta description |

## Available Scripts

- `npm run develop` - Start development server with auto-reload
- `npm run start` - Start production server
- `npm run build` - Build admin panel

## File Structure

```
strapi-backend/
├── config/           # Configuration files
├── database/         # Database migrations
├── public/           # Public assets
│   └── uploads/      # Uploaded media files
├── src/
│   ├── api/          # API content types
│   │   └── page/     # Page content type
│   ├── extensions/   # Strapi extensions
│   └── index.js      # Bootstrap file
└── package.json
```
