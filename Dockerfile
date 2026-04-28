# Stage 1: install dependencies
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: build the application
FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV BUILD_STANDALONE=true
# DATABASE_URL must be defined at build time only if pages use static generation
# with DB access. For this app all data fetching is at runtime, so a stub suffices.
ENV DATABASE_URL=postgresql://localhost/stub
RUN npm run build

# Stage 3: production runtime
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache su-exec tzdata shadow \
  && addgroup --system --gid 1001 appgroup \
  && adduser --system --uid 1001 -G appgroup appuser

# Copy the standalone server output
COPY --from=builder /app/.next/standalone ./
# Copy static assets
COPY --from=builder --chown=appuser:appgroup /app/.next/static ./.next/static
# Copy public assets
COPY --from=builder /app/public ./public

COPY --chmod=0755 docker/entrypoint.sh /usr/local/bin/entrypoint.sh

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "server.js"]
