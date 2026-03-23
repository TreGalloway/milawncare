# AGENTS.md - MI Premier Lawn Care Project Guide


## Project Overview

This is a website for MI Premier Lawn Care, a lawn care business in Flint, MI. It uses:
- **Frontend**: Astro 4.x + Tailwind CSS (static site generation)
- **Backend**: Strapi v5 (headless CMS with SQLite)
- **Colors**: Kelly Green (#4CBB17), Yellow (#eab308), White

## Quick Start Commands

### Frontend (Astro)
```bash
pnpm dev              # Start dev server at http://localhost:4321
pnpm build           # Build static site to dist/
pnpm preview         # Preview production build

# Build with specific base URL
pnpm build -- --base=/your-base-path
```

### Backend (Strapi)
```bash
# Requires Node 20.x - use fnm or nvm to manage versions
fnm install 20
fnm use 20

cd strapi-backend
npm install           # Install dependencies (first time)
npm run develop       # Start Strapi at http://localhost:1337
npm run build         # Build Strapi admin for production
```

### Testing
```bash
# Tests not currently implemented - when added, use:
pnpm test
pnpm test -- --testNamePattern="specific-test"
```

## Code Style Guidelines

### TypeScript & Astro
- **Types**: Use TypeScript for all `.ts` files, optional for `.astro`
- **Interfaces**: Define in `src/types/index.ts` - prefix with `I` (e.g., `IPage`)
- **Props**: Use `Props` interface in Astro components
- **Functions**: Use arrow functions for components, named functions for utilities
- **Async**: Always handle async operations with try/catch and return fallbacks

### Imports & Organization
```typescript
// Order: built-ins → external → internal → types
import { useState } from 'react';
import { Image } from 'astro:assets';
import Layout from '../layouts/Layout.astro';
import type { IPage } from '../types/index';
```

### Naming Conventions
- **Components**: PascalCase (`HeroSection.astro`)
- **Utilities**: camelCase (`formatDate.ts`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`)
- **Props**: camelCase (`heroTitle`)
- **CSS Classes**: kebab-case (`hero-section`)
- **Files**: kebab-case (`service-card.astro`)

### Error Handling
```typescript
// ALWAYS handle API errors gracefully - never let errors break the page
export async function fetchServices(): Promise<Service[]> {
  try {
    const res = await fetch(`${STRAPI_URL}/api/services`);
    if (!res.ok) {
      console.warn('Failed to fetch services:', res.status);
      return [];  // Return empty array - frontend will show fallback
    }
    const json = await res.json();
    return json.data || [];
  } catch (e) {
    console.warn('Failed to fetch services:', e);
    return [];  // Always return fallback, never throw
  }
}
```

### Component Structure
```astro
---
// Props interface - always define at top
interface Props {
  title: string;
  description?: string;
}

// Destructure with defaults
const { title, description = '' } = Astro.props;
---

<section class="component-name">
  <h2>{title}</h2>
  {description && <p>{description}</p>}
</section>

<style>
.component-name {
  @apply text-center py-8;
}
</style>
```

### Tailwind CSS Guidelines
- Use utility classes for styling
- Create components for repeated patterns
- Use `@apply` for component-specific styles
- Mobile-first responsive design (use `sm:`, `md:`, `lg:` breakpoints)
- Color variables defined in `tailwind.config.mjs`:
  - `primary`: Kelly Green shades (#4CBB17 base)
  - `accent`: Yellow shades (#eab308 base)

## API Integration

### Strapi Endpoints
The frontend fetches from these Strapi content types:
- `/api/pages` - Website pages with Dynamic Zones
- `/api/services` - Service offerings
- `/api/service-areas` - Service areas
- `/api/gallery-items` - Gallery images
- `/api/site-setting` - Site settings (single type)

### Fetching Pattern
```typescript
// Always use getHeaders() for authentication
import { getHeaders } from '../lib/strapi';

const res = await fetch(`${STRAPI_URL}/api/services`, {
  headers: getHeaders()
});
```

### Environment Variables
Create `.env` file (never commit this):
```
STRAPI_URL=http://localhost:1337
STRAPI_API_TOKEN=your-api-token-from-strapi-admin
PREVIEW_SECRET=your-preview-secret
```

## File Structure
```
src/
├── components/           # Reusable Astro components
│   ├── Header.astro      # Navigation header
│   ├── Footer.astro      # Site footer
│   ├── Hero.astro        # Hero section
│   ├── ServiceCard.astro # Service display card
│   ├── ServiceGrid.astro # Grid of services
│   ├── CTABanner.astro   # Call-to-action banner
│   ├── ServiceAreas.astro # Service areas display
│   └── BlocksRenderer.astro # Dynamic Zone renderer
├── layouts/
│   └── Layout.astro     # Base page layout
├── lib/
│   ├── strapi.ts        # API fetch functions
│   └── siteData.ts      # Site settings helpers
├── pages/
│   ├── index.astro      # Homepage
│   ├── about.astro      # About page
│   ├── contact.astro    # Contact page
│   ├── gallery.astro    # Gallery page
│   ├── privacy.astro    # Privacy Policy page
│   ├── terms.astro      # Terms of Service page
│   ├── services/
│   │   ├── index.astro   # Services listing
│   │   └── [slug].astro  # Individual service pages
│   └── [slug].astro    # Dynamic page routes
└── types/
    └── index.ts        # TypeScript interfaces
```

## Strapi Content Types

### Service
- name (Text), slug (UID), shortDescription, fullDescription (Rich Text), icon, tabOrder, pricingTable (JSON), ctaButton (JSON), heroImage

### ServiceArea  
- name (Text), displayOrder (Number)

### GalleryItem
- title (Text), image (Media), description (Text), date (Date)

### SiteSettings (Single)
- companyName, phoneNumber, email, address, yardbookUrl, qrCodeImage, heroTitle, heroSubtitle

### Page (with Dynamic Zone)
- title, slug, blocks (Dynamic Zone with: hero, serviceGrid, serviceAreas, ctaBanner, textBlock, imageGrid)

## Commit Messages
Follow conventional commits:
- `feat: add new hero section component`
- `fix: resolve service card alignment issue`
- `chore: update dependencies`
- `refactor: simplify Strapi fetch functions`

## Testing Strategy
- Use Vitest for component testing
- Test API error handling (ensure fallbacks work)
- Test responsive design at mobile/tablet/desktop
- Validate Strapi data structure matches types

## Performance Guidelines
- Use Astro's built-in image optimization
- Lazy load non-critical components
- Minimize client-side JavaScript
- Preload critical fonts (Inter)
- Leverage SSG with getStaticPaths() for all pages

## Important Notes

1. **Node Version**: Strapi requires Node 20.x - use `fnm` or `nvm` to manage
2. **API Token**: Get from Strapi Admin → Settings → API Tokens
3. **Publishing**: Always publish content in Strapi Content Manager (click Publish button)
4. **Single Types**: Site Settings uses `/api/site-setting` (singular), not plural
5. **Fallbacks**: Always provide hardcoded fallback content when Strapi is unavailable

## Current Action Items

### List 1: Strapi Updates (Done by Client)
- [ ] Update email to `mipremierlawncare@gmail.com` in Site Settings
- [ ] Add "City of Burton" to Service Areas
- [x] Add weekly and biweekly service agreements to company services (pricing table added above)
- [x] Change hours of operation from 8-6 to 8-4 Monday through Thursday
- [ ] Change hero image to one with blue skies and striped lawns
- [ ] Add "Company's Social Responsibility" section on About page
- [ ] Build Snow Removal pricing layout
- [ ] Create Privacy Policy page in Strapi
- [ ] Create Terms of Service page in Strapi

### List 2: Code Changes (Done by Developer)
- [x] Make Footer service areas dynamic (fetch from Strapi)
- [x] Make Footer service links dynamic (fetch from Strapi Services)
- [x] Fix Header company name to include L.L.C
- [x] Create Privacy Policy page
- [x] Create Terms of Service page
- [x] Apply Kelly green (#4CBB17) throughout site

## Hosting & Deployment Plan

### Architecture
- **Platform**: Railway (both Astro + Strapi on single service)
- **Cost**: $7/month (Railway Standard plan)
- **Database**: PostgreSQL (included with Railway)
- **Images**: Cloudinary (free tier)
- **Domain**: Custom domain (purchased separately)

### Why Railway for Both?
- Single platform = simpler management
- Michigan local business = no need for global CDN
- $7/month fits budget
- One service hosts both frontend and backend

### Deployment Timeline
**Target**: Live by tomorrow evening
**Total setup time**: 2-3 hours

See `docs/Hosting.md` for complete deployment guide and configuration files.
