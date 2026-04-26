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

# Build-time env vars needed for Next.js static generation
# NEXT_PUBLIC_BACKEND_URL is baked into the client bundle, so it must be set at build time
ARG NEXT_PUBLIC_BACKEND_URL=http://192.168.1.138:3001
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL
ENV BACKEND_URL=http://localhost:3001
ENV NEXTAUTH_URL=http://localhost:3100
ENV NEXTAUTH_SECRET=build-time-placeholder
ENV AUTH_TRUST_HOST=true

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
