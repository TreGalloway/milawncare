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

export interface Page {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  content: Block[];
  heroImage?: StrapiImage;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
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
