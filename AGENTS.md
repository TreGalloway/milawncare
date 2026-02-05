# AGENTS.md - Milawn Project Guide

## Quick Start Commands

```bash
# Frontend (Astro)
pnpm dev          # Start dev server
pnpm build        # Build static site
pnpm preview      # Preview production build

# Backend (Strapi)
cd strapi-backend && npm run develop  # Start Strapi
npm run build     # Build Strapi for production

# Single test (when tests exist)
pnpm test -- --testNamePattern="specific-test"
```

## Code Style Guidelines

### TypeScript & Astro
- **Types**: Use TypeScript for all `.ts` files, optional for `.astro`
- **Interfaces**: Define in `src/types/index.ts` - prefix with `I` (e.g., `IPage`)
- **Props**: Use `Props` interface in Astro components
- **Functions**: Use arrow functions for components, named functions for utilities

### Imports & Organization
```typescript
// Order: built-ins → external → internal → types
import { useState } from 'react';
import { Image } from 'astro:assets';
import Layout from '@layouts/Layout.astro';
import type { IPage } from '@types/index';
```

### Naming Conventions
- **Components**: PascalCase (`HeroSection.astro`)
- **Utilities**: camelCase (`formatDate.ts`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`)
- **Props**: camelCase (`heroTitle`)
- **CSS Classes**: kebab-case (`hero-section`)

### Error Handling
```typescript
// Always handle API errors gracefully
const fetchPages = async (): Promise<IPage[]> => {
  try {
    const response = await fetch(`${API_URL}/api/pages`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch pages:', error);
    return []; // Return empty array instead of breaking
  }
};
```

### Component Structure
```astro
---
// Props interface
export interface Props {
  title: string;
  description?: string;
}

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
- Use `@apply` for component styles
- Mobile-first responsive design
- Color variables in `tailwind.config.js`

### API Patterns
- **Base URL**: Use env variables (`import.meta.env.STRAPI_URL`)
- **Error States**: Always provide fallback content
- **Loading**: Use Astro's `client:load` for dynamic content
- **Caching**: Leverage SSG with `getStaticPaths()`

### File Structure
```
src/
├── components/           # Reusable components
├── layouts/             # Page layouts
├── lib/                # Utilities & API
├── pages/              # Astro pages
├── styles/             # Global styles
└── types/              # TypeScript definitions
```

### Commit Messages
- `feat: add new hero section component`
- `fix: resolve service card alignment issue`
- `chore: update dependencies`

### Environment Setup
```bash
# Backend
STRAPI_URL=http://localhost:1337
STRAPI_API_TOKEN=your-token
PREVIEW_SECRET=preview-key

# Frontend (Astro)
PUBLIC_STRAPI_URL=http://localhost:1337
```

### Testing Strategy
- Use Vitest for component testing
- Test API error handling
- Responsive design testing
- Strapi data validation tests

### Performance Guidelines
- Use Astro Image component for images
- Lazy load non-critical components
- Minimize client-side JavaScript
- Preload critical fonts and images