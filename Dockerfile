# ========================================
# BidEval - Multi-stage Docker Build
# Stage 1: Build frontend with Node
# Stage 2: Serve with Nginx
# Usage: docker compose build && docker compose up -d
# ========================================

# --- Stage 1: Build ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for layer caching
COPY front-rfq/package*.json ./

# Install dependencies (cached between builds via BuildKit)
RUN --mount=type=cache,target=/root/.npm \
    npm ci --legacy-peer-deps

# Copy source code
COPY front-rfq/ .

# Receive Supabase env vars as build args (from docker-compose)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Build Vite app
RUN npm run build

# --- Stage 2: Serve ---
FROM nginx:alpine

COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/dist /usr/share/nginx/html
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:80/ || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
