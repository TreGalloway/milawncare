import type { Schema, Struct } from '@strapi/strapi';

export interface SharedCtaBanner extends Struct.ComponentSchema {
  collectionName: 'components_shared_cta_banners';
  info: {
    displayName: 'ctaBanner';
    icon: 'lightbulb';
  };
  attributes: {
    buttonLink: Schema.Attribute.String;
    buttonText: Schema.Attribute.String;
    description: Schema.Attribute.String;
    phoneNumber: Schema.Attribute.String;
    title: Schema.Attribute.String;
  };
}

export interface SharedHero extends Struct.ComponentSchema {
  collectionName: 'components_shared_heroes';
  info: {
    displayName: 'hero';
    icon: 'house';
  };
  attributes: {
    backgroundImage: Schema.Attribute.Media<
      'images' | 'files' | 'videos' | 'audios'
    >;
    ctaButton: Schema.Attribute.String;
    CtaLink: Schema.Attribute.String;
    subtitle: Schema.Attribute.String;
    title: Schema.Attribute.String;
  };
}

export interface SharedImageGrid extends Struct.ComponentSchema {
  collectionName: 'components_shared_image_grids';
  info: {
    displayName: 'imageGrid';
    icon: 'landscape';
  };
  attributes: {
    gallery_items: Schema.Attribute.Relation<
      'oneToMany',
      'api::gallery-item.gallery-item'
    >;
    title: Schema.Attribute.String;
  };
}

export interface SharedServiceAreas extends Struct.ComponentSchema {
  collectionName: 'components_shared_service_areas';
  info: {
    displayName: 'serviceAreas';
    icon: 'earth';
  };
  attributes: {
    mapImage: Schema.Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    title: Schema.Attribute.String;
  };
}

export interface SharedServiceGrid extends Struct.ComponentSchema {
  collectionName: 'components_shared_service_grids';
  info: {
    displayName: 'serviceGrid';
    icon: 'dashboard';
  };
  attributes: {
    services: Schema.Attribute.Relation<'oneToMany', 'api::service.service'>;
    subtitle: Schema.Attribute.String;
    title: Schema.Attribute.String;
  };
}

export interface SharedTextBlock extends Struct.ComponentSchema {
  collectionName: 'components_shared_text_blocks';
  info: {
    displayName: 'textBlock';
    icon: 'bold';
  };
  attributes: {
    alignment: Schema.Attribute.String;
    content: Schema.Attribute.Blocks;
    heading: Schema.Attribute.String;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'shared.cta-banner': SharedCtaBanner;
      'shared.hero': SharedHero;
      'shared.image-grid': SharedImageGrid;
      'shared.service-areas': SharedServiceAreas;
      'shared.service-grid': SharedServiceGrid;
      'shared.text-block': SharedTextBlock;
    }
  }
}
