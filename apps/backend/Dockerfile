# ── Stage 1 : builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN npm install -g pnpm@9

WORKDIR /app

# Force NODE_ENV=development so devDependencies (prisma) are installed
ENV NODE_ENV=development
# Skip Puppeteer's bundled Chrome download — Chromium is installed in the runner stage
# PUPPETEER_SKIP_DOWNLOAD is the v21+ name; keep the old one for compat
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Copy workspace manifests first for optimal Docker layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/ ./packages/
COPY apps/backend/ ./apps/backend/

# Install all dependencies (including devDependencies required for build)
RUN pnpm install --frozen-lockfile --filter backend...

# Build shared workspace packages first (backend imports from their dist/)
RUN pnpm --filter "@esn/shared-types" --filter "@esn/shared-utils" --filter "@esn/pdf-generator" --filter "@esn/rag-engine" build || true

# Generate Prisma client
RUN cd apps/backend && ./node_modules/.bin/prisma generate

# Compile TypeScript → dist/
RUN pnpm --filter backend build

# ── Stage 2 : runner ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

# Chromium + required libs for Puppeteer PDF generation
RUN apk add --no-cache \
    openssl \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
  && npm install -g pnpm@9

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_SKIP_DOWNLOAD=true

WORKDIR /app

ENV NODE_ENV=production

# Copy compiled output and Prisma schema (needed for migrate deploy at startup)
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma

# Copy workspace manifests for pnpm install
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/backend/package.json ./apps/backend/

# Install all dependencies (need prisma CLI for migrate deploy at startup)
ENV NODE_ENV=development
RUN pnpm install --frozen-lockfile --filter backend...
ENV NODE_ENV=production

# Re-generate Prisma client in runner context
RUN cd apps/backend && ./node_modules/.bin/prisma generate

# Non-root user for security (no chown needed - run prisma as root then switch)
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

EXPOSE 3001

# Run migrations then start the app
CMD ["sh", "-c", "cd apps/backend && ./node_modules/.bin/prisma migrate deploy && node dist/main.js"]
