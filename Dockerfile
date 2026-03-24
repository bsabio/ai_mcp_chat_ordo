# ── Stage 1: install dependencies ────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ── Stage 2: build the Next.js application ──────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx next build

# ── Stage 3: production runner (standalone output) ──────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

RUN mkdir -p /app/.data && chown -R nextjs:nodejs /app

# Copy standalone server + trimmed node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Copy static assets and public dir (not included in standalone output)
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/docs ./docs

# Copy release manifest for health/version endpoints
COPY --from=builder --chown=nextjs:nodejs /app/release ./release

# Copy config directory for identity and prompt customization
COPY --from=builder --chown=nextjs:nodejs /app/config ./config

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
