# Multi-stage build for Astro + Strapi
FROM node:20-alpine

# Install pnpm, nginx, gettext (for envsubst), and build tools (for native modules)
RUN npm install -g pnpm && \
    apk add --no-cache nginx gettext build-base python3 postgresql-dev curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./
COPY strapi-backend/package.json ./strapi-backend/

# Install Astro dependencies
RUN npm install

# Copy source code
COPY . .

# Build Strapi admin
WORKDIR /app/strapi-backend
RUN npm install
ENV NODE_ENV=production
RUN npm run build

# Setup nginx config template (rendered at runtime by start.sh)
WORKDIR /app
COPY nginx.conf.template /app/nginx.conf.template


# Create startup script
COPY start.sh ./
RUN chmod +x start.sh

# Start both services
CMD ["./start.sh"]
