# ── Stage 1: Build ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests for layer caching
COPY package.json package-lock.json* ./

# Install dependencies (clean install for reproducibility)
RUN npm ci

# Copy source
COPY . .

# VITE_API_URL is injected by Railway at build time
# e.g. https://prepbac-backend-production.up.railway.app
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# ── Stage 2: Serve ──────────────────────────────────────────────────────────────
FROM nginx:alpine AS runner

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config (has listen 80; inside)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Railway injects a dynamic $PORT. Replace listen 80; with listen $PORT;
ENV PORT=80
CMD /bin/sh -c "sed -i \"s/listen 80;/listen ${PORT};/g\" /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"


