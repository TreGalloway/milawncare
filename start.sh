#!/bin/sh
set -e

echo "Starting MI Premier Lawn Care..."

# Railway provides PORT - nginx listens on it
# Strapi always listens on 1337 internally
export NGINX_PORT="${PORT:-80}"
echo "Nginx will listen on port $NGINX_PORT"

# 1. Generate nginx config from template
envsubst '$NGINX_PORT' < /app/nginx.conf.template > /etc/nginx/nginx.conf

# 2. Start nginx FIRST so Railway health checks pass immediately
#    /api/health returns 200 directly from nginx (see nginx.conf.template)
echo "Starting Nginx on port $NGINX_PORT..."
nginx -g 'daemon off;' &
NGINX_PID=$!

# 3. Start Strapi on port 1337 in background
cd /app/strapi-backend
echo "Starting Strapi on port 1337..."
PORT=1337 npm start &
STRAPI_PID=$!

# 4. Wait for Strapi to be ready (up to 120s)
echo "Waiting for Strapi to be ready..."
MAX_RETRIES=60
RETRY_COUNT=0
# Strapi v5 /_health returns HTTP 204 (No Content).
# BusyBox wget --spider treats 204 as a failure, so use curl instead.
until curl -sf http://localhost:1337/_health 2>/dev/null; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
    echo "ERROR: Strapi did not become ready in time"
    exit 1
  fi
  echo "Waiting for Strapi... ($RETRY_COUNT/$MAX_RETRIES)"
  sleep 2
done
echo "Strapi is ready! (PID: $STRAPI_PID)"

# 5. Build Astro now that Strapi is available for data fetching
echo "Building Astro site..."
cd /app
npm run build
echo "Astro build complete!"

# 6. Reload nginx to pick up the newly built /app/dist static files
echo "Reloading Nginx to serve Astro build..."
nginx -s reload

# 7. Keep the container alive by waiting on nginx
wait $NGINX_PID
