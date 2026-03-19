/**
 * Strapi Types
 */

export interface StrapiImage {
  id: number;
  documentId: string;
  url: string;
  alternativeText?: string;
  caption?: string;
  width?: number;
  height?: number;
  formats?: {
    thumbnail?: { url: string };
    small?: { url: string };
    medium?: { url: string };
    large?: { url: string };
  };
}

export interface Block {
  type: 'paragraph' | 'heading' | 'list' | 'quote' | 'code' | 'image' | 'link' | 'text';
  children?: Block[];
  level?: number;
  format?: 'ordered' | 'unordered';
  image?: StrapiImage;
  url?: string;
  text?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
}

export interface StrapiResponse<T> {
  data: T[];
  meta: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface StrapiSingleResponse<T> {
  data: T;
}

// Page Types
export interface Page {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  content?: Block[];
  heroImage?: StrapiImage;
  metaTitle?: string;
  metaDescription?: string;
  blocks?: PageBlock[];
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type PageBlock = 
  | HeroBlock
  | ServiceGridBlock
  | ServiceAreasBlock
  | CTABlock
  | TextBlock
  | ImageGridBlock;

export interface HeroBlock {
  __component: 'shared.hero';
  id: number;
  title: string;
  subtitle?: string;
  backgroundImage?: StrapiImage;
  ctaButton?: string;
  ctaLink?: string;
}

export interface ServiceGridBlock {
  __component: 'shared.service-grid';
  id: number;
  title?: string;
  subtitle?: string;
  services?: {
    data: Service[];
  };
}

export interface ServiceAreasBlock {
  __component: 'shared.service-areas';
  id: number;
  title?: string;
  mapImage?: StrapiImage;
}

export interface CTABlock {
  __component: 'shared.cta-banner';
  id: number;
  title?: string;
  description?: string;
  buttonText?: string;
  buttonLink?: string;
  phoneNumber?: string;
}

export interface TextBlock {
  __component: 'shared.text-block';
  id: number;
  heading?: string;
  content?: Block[];
  alignment?: 'left' | 'center' | 'right';
}

export interface ImageGridBlock {
  __component: 'shared.image-grid';
  id: number;
  title?: string;
  images?: {
    data: GalleryItem[];
  };
}

// Service Types
export interface Service {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  shortDescription?: string;
  fullDescription?: Block[];
  icon?: string;
  tabOrder?: number;
  ctaButton?: string;
  pricingTable?: string;
  heroImage?: StrapiImage;
  publishedAt?: string;
}

// ServiceArea Types
export interface ServiceArea {
  id: number;
  documentId: string;
  name: string;
  displayOrder?: number;
  publishedAt?: string;
}

// GalleryItem Types
export interface GalleryItem {
  id: number;
  documentId: string;
  title: string;
  image?: StrapiImage;
  description?: string;
  date?: string;
  publishedAt?: string;
}

// SiteSettings Types
export interface SiteSettings {
  id: number;
  documentId: string;
  companyName?: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  yardbookUrl?: string;
  qrCodeImage?: StrapiImage;
  heroTitle?: string;
  heroSubtitle?: string;
  footerTagline?: string;
  hoursOfOperation?: string;
  quoteButtonText?: string;
  facebookUrl?: string;
  publishedAt?: string;
}

// NavigationItem Types
export interface NavigationItem {
  id: number;
  documentId: string;
  label: string;
  url: string;
  tabOrder?: number;
  showInHeader?: boolean;
  publishedAt?: string;
}


