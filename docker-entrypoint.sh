#!/bin/sh
set -e

# ========================================
# BidEval Docker Entrypoint
# Handles runtime environment variable injection
# ========================================

echo "Starting BidEval Frontend..."

# Nginx proxy configuration is now hardcoded in nginx.conf
# No need to modify it at runtime
echo "Using hardcoded nginx proxy configuration"

# Inject runtime environment variables into the built JS files
# This allows changing env vars without rebuilding the image
if [ -n "$VITE_SUPABASE_URL" ] || [ -n "$VITE_SUPABASE_ANON_KEY" ] || [ -n "$VITE_N8N_WEBHOOK_URL" ]; then
    echo "Injecting runtime environment variables..."

    # Find and replace placeholder values in JS files
    for file in /usr/share/nginx/html/assets/*.js; do
        if [ -f "$file" ]; then
            # Replace build-time placeholders with runtime values
            if [ -n "$VITE_SUPABASE_URL" ]; then
                sed -i "s|__VITE_SUPABASE_URL__|${VITE_SUPABASE_URL}|g" "$file"
            fi
            if [ -n "$VITE_SUPABASE_ANON_KEY" ]; then
                sed -i "s|__VITE_SUPABASE_ANON_KEY__|${VITE_SUPABASE_ANON_KEY}|g" "$file"
            fi
            if [ -n "$VITE_N8N_WEBHOOK_URL" ]; then
                sed -i "s|__VITE_N8N_WEBHOOK_URL__|${VITE_N8N_WEBHOOK_URL}|g" "$file"
            fi
        fi
    done
fi

echo "Starting Nginx..."
exec "$@"
