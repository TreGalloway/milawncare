import type { Page, StrapiResponse } from '../types/index';

const STRAPI_URL = import.meta.env.STRAPI_URL || 'http://localhost:1337';
const STRAPI_API_TOKEN = import.meta.env.STRAPI_API_TOKEN;

/**
 * Get headers for API requests
 */
function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (STRAPI_API_TOKEN) {
    headers['Authorization'] = `Bearer ${STRAPI_API_TOKEN}`;
  }
  
  return headers;
}

/**
 * Build query params for publication state
 */
function getPublicationStateQuery(isPreview: boolean): string {
  return isPreview ? 'publicationState=preview' : 'publicationState=live';
}

/**
 * Fetch all pages
 */
export async function fetchPages(isPreview = false): Promise<Page[]> {
  const stateQuery = getPublicationStateQuery(isPreview);
  const res = await fetch(
    `${STRAPI_URL}/api/pages?${stateQuery}&populate[heroImage]=*&populate[content][populate]=*`,
    { headers: getHeaders() }
  );
  
  if (!res.ok) {
    throw new Error(`Failed to fetch pages: ${res.statusText}`);
  }
  
  const json: StrapiResponse<Page> = await res.json();
  return json.data;
}

/**
 * Fetch a single page by slug
 */
export async function fetchPage(slug: string, isPreview = false): Promise<Page | null> {
  const stateQuery = getPublicationStateQuery(isPreview);
  const res = await fetch(
    `${STRAPI_URL}/api/pages?filters[slug][$eq]=${slug}&${stateQuery}&populate[heroImage]=*&populate[content][populate]=*`,
    { headers: getHeaders() }
  );
  
  if (!res.ok) {
    throw new Error(`Failed to fetch page: ${res.statusText}`);
  }
  
  const json: StrapiResponse<Page> = await res.json();
  return json.data[0] || null;
}

/**
 * Fetch page by documentId (for preview mode)
 */
export async function fetchPageById(documentId: string, isPreview = false): Promise<Page | null> {
  const stateQuery = getPublicationStateQuery(isPreview);
  const res = await fetch(
    `${STRAPI_URL}/api/pages/${documentId}?${stateQuery}&populate[heroImage]=*&populate[content][populate]=*`,
    { headers: getHeaders() }
  );
  
  if (!res.ok) {
    throw new Error(`Failed to fetch page: ${res.statusText}`);
  }
  
  const json = await res.json();
  return json.data || null;
}

/**
 * Get full image URL
 */
export function getImageUrl(image: { url: string } | undefined): string {
  if (!image?.url) return '';
  if (image.url.startsWith('http')) return image.url;
  return `${STRAPI_URL}${image.url}`;
}
