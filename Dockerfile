# ========================================
# BidEval - Multi-stage Docker Build
# Stage 1: Build frontend with Node
# Stage 2: Serve with Nginx
# ========================================

FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY front-rfq/package*.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source code
COPY front-rfq/ ./

# Build arguments for environment variables
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_SUPABASE_SCHEMA=public

# Set environment variables for build
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_SCHEMA=$VITE_SUPABASE_SCHEMA

# n8n URLs are relative paths handled by nginx proxy
# They're defined in .env.production and baked into the build
# No need to pass them as ARGs since they don't change between envs

# Build the application
RUN npm run build


FROM nginx:alpine AS production

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built application from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose port 80
EXPOSE 80

# Health check (use 127.0.0.1 — Alpine resolves localhost to IPv6)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:80/ || exit 1

# Start nginx
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
