# ── Stage 1 : builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN npm install -g pnpm@9

WORKDIR /app

# Force NODE_ENV=development so devDependencies (prisma) are installed
# even when Coolify injects NODE_ENV=production as build ARG
ENV NODE_ENV=development

# Copy workspace manifests first for optimal Docker layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/ ./packages/
COPY apps/backend/ ./apps/backend/

# Install all dependencies (including devDependencies required for build)
RUN pnpm install --frozen-lockfile --filter backend...

# Build shared workspace packages first (backend imports from their dist/)
RUN pnpm --filter "@esn/shared-types" --filter "@esn/shared-utils" --filter "@esn/pdf-generator" --filter "@esn/rag-engine" build || true

# Generate Prisma client (use local binary to avoid npx downloading a different version)
RUN cd apps/backend && ./node_modules/.bin/prisma generate

# Compile TypeScript → dist/
RUN pnpm --filter backend build

# ── Stage 2 : runner ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN npm install -g pnpm@9

WORKDIR /app

ENV NODE_ENV=production

# Copy compiled output and Prisma schema (needed for migrate deploy at startup)
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma

# Copy workspace manifests for pnpm install --prod
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/backend/package.json ./apps/backend/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --filter backend... --prod

# Copy generated Prisma client from builder (avoids needing prisma CLI in prod)
COPY --from=builder /app/apps/backend/node_modules/.prisma ./apps/backend/node_modules/.prisma

# Copy prisma CLI from builder for migrate deploy at startup
COPY --from=builder /app/apps/backend/node_modules/prisma ./apps/backend/node_modules/prisma
COPY --from=builder /app/apps/backend/node_modules/.bin/prisma ./apps/backend/node_modules/.bin/prisma

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
USER nestjs

EXPOSE 3001

# Run migrations then start the app
CMD ["sh", "-c", "cd apps/backend && ./node_modules/.bin/prisma migrate deploy && node dist/main.js"]
