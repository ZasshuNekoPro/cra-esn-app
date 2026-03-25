# ── Stage 1 : deps ────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

RUN npm install -g pnpm@9

WORKDIR /app

# Copy workspace manifests for optimal Docker layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/ ./packages/
COPY apps/frontend/ ./apps/frontend/

RUN pnpm install --frozen-lockfile --filter frontend...

# ── Stage 2 : builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN npm install -g pnpm@9

WORKDIR /app

COPY --from=deps /app ./

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN pnpm --filter frontend build

# ── Stage 3 : runner ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Standalone output: self-contained Node server (no node_modules needed)
COPY --from=builder /app/apps/frontend/.next/standalone ./
COPY --from=builder /app/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=builder /app/apps/frontend/public ./apps/frontend/public

USER nextjs

EXPOSE 3100
ENV PORT=3100
ENV HOSTNAME=0.0.0.0

CMD ["node", "apps/frontend/server.js"]
