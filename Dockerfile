# Stage 1: Build — installs all tools and compiles everything
FROM node:20-alpine AS builder

# Build tools needed only for compiling native npm modules
RUN apk add --no-cache build-base python3 postgresql-dev

WORKDIR /app

# Install Astro dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Install Strapi dependencies
COPY strapi-backend/package.json strapi-backend/package-lock.json* ./strapi-backend/
RUN cd strapi-backend && npm install

# Copy source code
COPY . .

# Build Strapi admin (compiles TS + bundles the admin React app)
WORKDIR /app/strapi-backend
ENV NODE_ENV=production
ENV STRAPI_TELEMETRY_DISABLED=true
ENV NODE_OPTIONS=--max-old-space-size=2048
RUN npm run build

# Prune dev dependencies — runtime image only needs prod deps
RUN npm prune --production


# Stage 2: Runtime — clean image, no build tools
FROM node:20-alpine

# Only runtime system deps: nginx (proxy), gettext (envsubst), curl (health check)
RUN apk add --no-cache nginx gettext curl

WORKDIR /app

# Astro source + prod deps (Astro site is built at container startup by start.sh)
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules/
COPY --from=builder /app/src ./src/
COPY --from=builder /app/public ./public/
COPY --from=builder /app/astro.config.mjs ./
COPY --from=builder /app/tailwind.config.mjs ./
COPY --from=builder /app/tsconfig.json ./

# Strapi runtime: entire project with built admin + pruned prod deps
# Copying the whole directory avoids missing files Strapi needs at startup
# (.strapi/client/, tsconfig.json, etc.)
COPY --from=builder /app/strapi-backend ./strapi-backend/

# Nginx config template (rendered at runtime by start.sh via envsubst)
COPY nginx.conf.template /app/nginx.conf.template

COPY start.sh ./
RUN chmod +x start.sh

CMD ["./start.sh"]
