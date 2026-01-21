#!/bin/sh
set -e

# ========================================
# BidEval Docker Entrypoint
# Handles runtime environment variable injection
# ========================================

echo "Starting BidEval Frontend..."

# Replace environment variables in nginx config
if [ -n "$VITE_N8N_WEBHOOK_URL" ]; then
    echo "Configuring N8N webhook proxy: $VITE_N8N_WEBHOOK_URL"
    # Export N8N_WEBHOOK_URL for envsubst (nginx.conf uses this variable name)
    export N8N_WEBHOOK_URL="$VITE_N8N_WEBHOOK_URL"
    envsubst '${N8N_WEBHOOK_URL}' < /etc/nginx/nginx.conf > /etc/nginx/nginx.conf.tmp
    mv /etc/nginx/nginx.conf.tmp /etc/nginx/nginx.conf
else
    echo "Warning: N8N_WEBHOOK_URL not set, removing proxy configuration"
    # Remove proxy block if no N8N URL provided
    sed -i '/location \/webhook\//,/}/d' /etc/nginx/nginx.conf
fi

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
