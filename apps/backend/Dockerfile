# ── Stage 1 : builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN npm install -g pnpm@9

WORKDIR /app

# Copy workspace manifests first for optimal Docker layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/ ./packages/
COPY apps/backend/ ./apps/backend/

# Install all dependencies (including devDependencies required for build)
RUN pnpm install --frozen-lockfile --filter backend...

# Generate Prisma client
RUN pnpm --filter backend exec prisma generate

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

# Re-generate Prisma client in runner stage (links against installed @prisma/client)
RUN pnpm --filter backend exec prisma generate

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
USER nestjs

EXPOSE 3001

# Run migrations then start the app
CMD ["sh", "-c", "pnpm --filter backend exec prisma migrate deploy && node apps/backend/dist/main.js"]
