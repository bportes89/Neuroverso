# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production=false

COPY . .
RUN npx prisma generate
RUN npm run build

# ─── Stage 2: Production ─────────────────────────────────────────────────────
FROM node:18-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

RUN chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 8080

CMD ["node", "dist/main"]
