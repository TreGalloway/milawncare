# Multi-stage build for Astro + Strapi
FROM node:20-alpine

# Install pnpm and nginx
RUN npm install -g pnpm && \
    apk add --no-cache nginx

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY strapi-backend/package.json ./strapi-backend/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build Astro (static site)
RUN pnpm build

# Build Strapi admin
WORKDIR /app/strapi-backend
RUN npm run build

# Setup nginx configuration
WORKDIR /app
COPY nginx.conf /etc/nginx/nginx.conf

# Create startup script
COPY start.sh ./
RUN chmod +x start.sh

# Expose port 80
EXPOSE 80

# Start both services
CMD ["./start.sh"]
