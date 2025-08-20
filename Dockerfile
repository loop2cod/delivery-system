# Multi-stage Dockerfile for UAE Delivery Management System
FROM node:18-alpine AS base

# Install pnpm (pin to project version for lockfile compatibility)
RUN npm install -g pnpm@8.6.10

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./

# Copy all package.json files (preserve paths to avoid duplicates)
COPY backend/package.json backend/package.json
COPY packages/public-pwa/package.json packages/public-pwa/package.json
COPY packages/admin-pwa/package.json packages/admin-pwa/package.json
COPY packages/business-pwa/package.json packages/business-pwa/package.json
COPY packages/driver-pwa/package.json packages/driver-pwa/package.json

# Allow toggling lockfile strictness at build time (defaults to strict)
ARG PNPM_FLAGS="--frozen-lockfile"

# Install ALL dependencies (including dev dependencies for build)
RUN pnpm install $PNPM_FLAGS

# Copy source code
COPY . .

# Build stage - builds all packages and installs production dependencies
FROM base AS builder
RUN pnpm run build
# Reinstall only production dependencies after build
RUN rm -rf node_modules */node_modules */*/node_modules
RUN pnpm install --prod --frozen-lockfile

# Backend production stage
FROM node:18-alpine AS backend
RUN apk add --no-cache dumb-init bash
WORKDIR /app
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/package.json ./backend/
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/.env.production ./.env.production
COPY --from=builder /app/scripts/setup-production-env.sh ./scripts/setup-production-env.sh
RUN chmod +x ./scripts/setup-production-env.sh
EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "./scripts/setup-production-env.sh && node backend/dist/server.js"]

# Public PWA production stage
FROM node:18-alpine AS public-pwa
RUN apk add --no-cache dumb-init
WORKDIR /app/packages/public-pwa
COPY --from=builder /app/packages/public-pwa/.next ./.next
COPY --from=builder /app/packages/public-pwa/package.json ./
COPY --from=builder /app/packages/public-pwa/next.config.js ./
COPY --from=builder /app/packages/public-pwa/node_modules ./node_modules
COPY --from=builder /app/packages/public-pwa/public ./public
EXPOSE 3001
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]

# Admin PWA production stage
FROM node:18-alpine AS admin-pwa
RUN apk add --no-cache dumb-init
WORKDIR /app/packages/admin-pwa
COPY --from=builder /app/packages/admin-pwa/.next ./.next
COPY --from=builder /app/packages/admin-pwa/package.json ./
COPY --from=builder /app/packages/admin-pwa/next.config.js ./
COPY --from=builder /app/packages/admin-pwa/node_modules ./node_modules
COPY --from=builder /app/packages/admin-pwa/public ./public
EXPOSE 3002
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]

# Business PWA production stage
FROM node:18-alpine AS business-pwa
RUN apk add --no-cache dumb-init
WORKDIR /app/packages/business-pwa
COPY --from=builder /app/packages/business-pwa/.next ./.next
COPY --from=builder /app/packages/business-pwa/package.json ./
COPY --from=builder /app/packages/business-pwa/next.config.js ./
COPY --from=builder /app/packages/business-pwa/node_modules ./node_modules
COPY --from=builder /app/packages/business-pwa/public ./public
EXPOSE 3003
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]

# Driver PWA production stage
FROM node:18-alpine AS driver-pwa
RUN apk add --no-cache dumb-init
WORKDIR /app/packages/driver-pwa
COPY --from=builder /app/packages/driver-pwa/.next ./.next
COPY --from=builder /app/packages/driver-pwa/package.json ./
COPY --from=builder /app/packages/driver-pwa/next.config.js ./
COPY --from=builder /app/packages/driver-pwa/node_modules ./node_modules
COPY --from=builder /app/packages/driver-pwa/public ./public
EXPOSE 3004
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]