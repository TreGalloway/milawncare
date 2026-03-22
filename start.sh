#!/bin/sh
set -e

echo "Starting MI Premier Lawn Care..."

# Start Strapi in background
cd /app/strapi-backend
echo "Starting Strapi..."
npm start &
STRAPI_PID=$!

# Wait for Strapi to be ready
echo "Waiting for Strapi to start..."
sleep 10

# Check if Strapi is running
if ! kill -0 $STRAPI_PID 2>/dev/null; then
    echo "ERROR: Strapi failed to start"
    exit 1
fi

echo "Strapi started successfully (PID: $STRAPI_PID)"

# Start Nginx in foreground (keeps container running)
echo "Starting Nginx..."
exec nginx -g 'daemon off;'
