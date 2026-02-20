# Strapi Content Types Setup

## Run Strapi First

```bash
cd strapi-backend && npm run develop
```

Then create these content types in the Strapi Admin panel (http://localhost:1337/admin)

---

## 1. Service (Collection Type)

**API ID**: `service`
**Display Name**: Service

### Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| name | Text (short) | Yes | Service name (e.g., "Mowing") |
| slug | UID | Yes | Auto-generated from name (e.g., "mowing") |
| shortDescription | Text (short) | No | Brief description for cards |
| fullDescription | Rich Text (Blocks) | No | Full description for detail page |
| icon | Text (short) | No | Icon identifier (e.g., "mowing", "snow") |
| tabOrder | Number | No | Display order |
| ctaButton | JSON | No | `{"text": "Get Quote", "url": "http://ydbk.co/137258"}` |
| pricingTable | JSON | No | Pricing tiers array |
| heroImage | Media (single image) | No | |

---

## 2. ServiceArea (Collection Type)

**API ID**: `service-area`
**Display Name**: Service Area

### Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| name | Text (short) | Yes | Area name (e.g., "Flint") |
| displayOrder | Number | No | Display order |

---

## 3. GalleryItem (Collection Type)

**API ID**: `gallery-item`
**Display Name**: Gallery Item

### Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| title | Text (short) | Yes | Image title |
| image | Media (single image) | Yes | The photo |
| description | Text (long) | No | Optional description |
| date | Date | No | When photo was taken |

---

## 4. SiteSettings (Single Type)

**API ID**: `site-settings`
**Display Name**: Site Settings
**Type**: Single Type (not Collection)

### Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| companyName | Text (short) | Yes | "MI Premier Lawn Care, L.L.C" |
| phoneNumber | Text (short) | Yes | "(810) 309-9528" |
| email | Email | No | |
| address | Text (long) | No | |
| yardbookUrl | Text (short) | Yes | "http://ydbk.co/137258" |
| qrCodeImage | Media (single image) | No | Generated QR code |
| heroTitle | Text (short) | No | Homepage hero title |
| heroSubtitle | Text (short) | No | Homepage hero subtitle |

---

## 5. Page - Add Dynamic Zone

**Keep existing fields, add:**

### New Field: blocks (Dynamic Zone)

**JSON Name**: `blocks`
**Type**: Dynamic Zone

Add these components:

#### Component: hero
| Field | Type | Notes |
|-------|------|-------|
| title | Text (short) | |
| subtitle | Text (long) | |
| backgroundImage | Media (single image) | |
| ctaButton | Text (short) | Button text |
| ctaLink | Text (short) | Button URL |

#### Component: serviceGrid
| Field | Type | Notes |
|-------|------|-------|
| title | Text (short) | Section title |
| subtitle | Text (long) | Section subtitle |
| services | Relation | Has many → Service |

#### Component: serviceAreas
| Field | Type | Notes |
|-------|------|-------|
| title | Text (short) | Section title |
| mapImage | Media (single image) | Service area map |

#### Component: ctaBanner
| Field | Type | Notes |
|-------|------|-------|
| title | Text (short) | |
| description | Text (long) | |
| buttonText | Text (short) | |
| buttonLink | Text (short) | |
| phoneNumber | Text (short) | |

#### Component: textBlock
| Field | Type | Notes |
|-------|------|-------|
| heading | Text (short) | |
| content | Rich Text (Blocks) | |
| alignment | Enumeration | left, center, right |

#### Component: imageGrid
| Field | Type | Notes |
|-------|------|-------|
| title | Text (short) | |
| images | Relation | Has many → Gallery Item |

---

## 6. API Permissions (Important!)

After creating content types, go to **Settings → Users & Permissions Plugin → Roles → Public**:

Enable for each content type:
- **Service**: find, findOne
- **ServiceArea**: find, findOne  
- **GalleryItem**: find, findOne
- **SiteSettings**: find
- **Page**: find, findOne
- **Upload**: find, findOne

---

## 7. Create Initial Data

Create these entries in Strapi:

### Services (8):
1. Mowing
2. Hedge Trimming
3. Leaf Removal
4. Fertilizing
5. Mulching
6. Overseeding
7. Snow Removal
8. Salting

### Service Areas (5):
1. Flint
2. Flint Township
3. Flushing
4. Mt. Morris
5. Grand Blanc

### SiteSettings:
- Fill in company info

### Pages:
- Home (slug: "home")
- Services (slug: "services")
- About (slug: "about")
- Gallery (slug: "gallery")
- Contact (slug: "contact")
