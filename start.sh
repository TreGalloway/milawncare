#!/bin/sh
set -e

echo "Starting MI Premier Lawn Care..."

# Railway provides PORT - nginx will listen on it
# Strapi always listens on 1337 internally
export NGINX_PORT="${PORT:-80}"
echo "Nginx will listen on port $NGINX_PORT"

# 1. Generate nginx config from template
envsubst '$NGINX_PORT' < /app/nginx.conf.template > /etc/nginx/nginx.conf

# 2. Start Strapi on port 1337 (override PORT for Strapi)
cd /app/strapi-backend
echo "Starting Strapi on port 1337..."
PORT=1337 npm start &
STRAPI_PID=$!

# 3. Wait for Strapi to actually be ready (up to 60s)
echo "Waiting for Strapi to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0
until wget --spider -q http://localhost:1337/_health 2>/dev/null; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
    echo "ERROR: Strapi did not become ready in time"
    exit 1
  fi
  echo "Waiting for Strapi... ($RETRY_COUNT/$MAX_RETRIES)"
  sleep 2
done
echo "Strapi is ready! (PID: $STRAPI_PID)"

# 4. Build Astro now that Strapi is available for data fetching
echo "Building Astro site..."
cd /app
npm run build
echo "Astro build complete!"

# 5. Start Nginx in foreground (keeps container running)
echo "Starting Nginx on port $NGINX_PORT..."
exec nginx -g 'daemon off;'
