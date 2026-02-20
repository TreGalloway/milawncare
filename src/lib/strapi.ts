import type { 
  Page, 
  StrapiResponse, 
  StrapiSingleResponse,
  Service, 
  ServiceArea, 
  GalleryItem, 
  SiteSettings 
} from '../types/index';

const STRAPI_URL = import.meta.env.STRAPI_URL || 'http://localhost:1337';
const STRAPI_API_TOKEN = import.meta.env.STRAPI_API_TOKEN;

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (STRAPI_API_TOKEN) {
    headers['Authorization'] = `Bearer ${STRAPI_API_TOKEN}`;
  }
  
  return headers;
}

function getPublicationStateQuery(isPreview: boolean): string {
  return isPreview ? 'publicationState=preview' : 'publicationState=live';
}

export function getImageUrl(image: { url: string } | undefined): string {
  if (!image?.url) return '';
  if (image.url.startsWith('http')) return image.url;
  return `${STRAPI_URL}${image.url}`;
}

// ============ Page Functions ============

export async function fetchPages(isPreview = false): Promise<Page[]> {
  try {
    const stateQuery = getPublicationStateQuery(isPreview);
    const res = await fetch(
      `${STRAPI_URL}/api/pages?${stateQuery}&populate[heroImage]=*&populate[blocks][populate]=*`,
      { headers: getHeaders() }
    );
    
    if (!res.ok) {
      console.warn('Failed to fetch pages:', res.statusText);
      return [];
    }
    
    const json: StrapiResponse<Page> = await res.json();
    return json.data;
  } catch (e) {
    console.warn('Failed to fetch pages:', e);
    return [];
  }
}

export async function fetchPage(slug: string, isPreview = false): Promise<Page | null> {
  try {
    const stateQuery = getPublicationStateQuery(isPreview);
    const res = await fetch(
      `${STRAPI_URL}/api/pages?filters[slug][$eq]=${slug}&${stateQuery}&populate[heroImage]=*&populate[blocks][populate]=*`,
      { headers: getHeaders() }
    );
    
    if (!res.ok) {
      console.warn('Failed to fetch page:', res.statusText);
      return null;
    }
    
    const json: StrapiResponse<Page> = await res.json();
    return json.data[0] || null;
  } catch (e) {
    console.warn('Failed to fetch page:', e);
    return null;
  }
}

export async function fetchPageById(documentId: string, isPreview = false): Promise<Page | null> {
  try {
    const stateQuery = getPublicationStateQuery(isPreview);
    const res = await fetch(
      `${STRAPI_URL}/api/pages/${documentId}?${stateQuery}&populate[heroImage]=*&populate[blocks][populate]=*`,
      { headers: getHeaders() }
    );
    
    if (!res.ok) {
      console.warn('Failed to fetch page:', res.statusText);
      return null;
    }
    
    const json = await res.json();
    return json.data || null;
  } catch (e) {
    console.warn('Failed to fetch page:', e);
    return null;
  }
}

// ============ Service Functions ============

export async function fetchServices(isPreview = false): Promise<Service[]> {
  try {
    const stateQuery = getPublicationStateQuery(isPreview);
    const res = await fetch(
      `${STRAPI_URL}/api/services?${stateQuery}&sort[tabOrder]=asc&populate[heroImage]=*`,
      { headers: getHeaders() }
    );
    
    if (!res.ok) {
      console.warn('Failed to fetch services:', res.statusText);
      return [];
    }
    
    const json: StrapiResponse<Service> = await res.json();
    return json.data;
  } catch (e) {
    console.warn('Failed to fetch services:', e);
    return [];
  }
}

export async function fetchService(slug: string, isPreview = false): Promise<Service | null> {
  try {
    const stateQuery = getPublicationStateQuery(isPreview);
    const res = await fetch(
      `${STRAPI_URL}/api/services?filters[slug][$eq]=${slug}&${stateQuery}&populate[heroImage]=*`,
      { headers: getHeaders() }
    );
    
    if (!res.ok) {
      console.warn('Failed to fetch service:', res.statusText);
      return null;
    }
    
    const json: StrapiResponse<Service> = await res.json();
    return json.data[0] || null;
  } catch (e) {
    console.warn('Failed to fetch service:', e);
    return null;
  }
}

// ============ ServiceArea Functions ============

export async function fetchServiceAreas(isPreview = false): Promise<ServiceArea[]> {
  try {
    const stateQuery = getPublicationStateQuery(isPreview);
    const res = await fetch(
      `${STRAPI_URL}/api/service-areas?${stateQuery}&sort[displayOrder]=asc`,
      { headers: getHeaders() }
    );
    
    if (!res.ok) {
      console.warn('Failed to fetch service areas:', res.statusText);
      return [];
    }
    
    const json: StrapiResponse<ServiceArea> = await res.json();
    return json.data;
  } catch (e) {
    console.warn('Failed to fetch service areas:', e);
    return [];
  }
}

// ============ GalleryItem Functions ============

export async function fetchGalleryItems(isPreview = false): Promise<GalleryItem[]> {
  try {
    const stateQuery = getPublicationStateQuery(isPreview);
    const res = await fetch(
      `${STRAPI_URL}/api/gallery-items?${stateQuery}&sort[date]=desc&populate[image]=*`,
      { headers: getHeaders() }
    );
    
    if (!res.ok) {
      console.warn('Failed to fetch gallery items:', res.statusText);
      return [];
    }
    
    const json: StrapiResponse<GalleryItem> = await res.json();
    return json.data;
  } catch (e) {
    console.warn('Failed to fetch gallery items:', e);
    return [];
  }
}

// ============ SiteSettings Functions ============

export async function fetchSiteSettings(isPreview = false): Promise<SiteSettings | null> {
  try {
    const stateQuery = getPublicationStateQuery(isPreview);
    const res = await fetch(
      `${STRAPI_URL}/api/site-settings?${stateQuery}&populate[qrCodeImage]=*`,
      { headers: getHeaders() }
    );
    
    if (!res.ok) {
      console.warn('Failed to fetch site settings:', res.statusText);
      return null;
    }
    
    const json: StrapiResponse<SiteSettings> = await res.json();
    return json.data[0] || null;
  } catch (e) {
    console.warn('Failed to fetch site settings:', e);
    return null;
  }
}

// ============ Helper Functions ============

export function getFullImageUrl(image: StrapiImage | undefined): string {
  if (!image?.url) return '';
  if (image.url.startsWith('http')) return image.url;
  
  if (image.url.startsWith('/')) {
    return `${STRAPI_URL}${image.url}`;
  }
  return image.url;
}

export function getImageFormatUrl(image: StrapiImage | undefined, format: 'thumbnail' | 'small' | 'medium' | 'large'): string {
  if (!image?.formats?.[format]?.url) {
    return getFullImageUrl(image);
  }
  return getFullImageUrl(image.formats[format]);
}
