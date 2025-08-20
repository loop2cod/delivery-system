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
# Copy backend build output and package manifest
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/package.json ./backend/
# Copy pnpm root node_modules (contains .pnpm store) and backend's node_modules
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/node_modules ./backend/node_modules
# Env and setup
COPY --from=builder /app/.env.production ./.env.production
COPY --from=builder /app/scripts/setup-production-env.sh ./scripts/setup-production-env.sh
RUN chmod +x ./scripts/setup-production-env.sh
EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "./scripts/setup-production-env.sh && node backend/dist/server.js"]

# Public PWA production stage
FROM node:18-alpine AS public-pwa
RUN apk add --no-cache dumb-init
WORKDIR /app
# Copy the entire workspace root node_modules (contains hoisted dependencies)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/public-pwa ./packages/public-pwa
WORKDIR /app/packages/public-pwa
EXPOSE 3001
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]

# Admin PWA production stage
FROM node:18-alpine AS admin-pwa
RUN apk add --no-cache dumb-init
WORKDIR /app
# Copy the entire workspace root node_modules (contains hoisted dependencies)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/admin-pwa ./packages/admin-pwa
WORKDIR /app/packages/admin-pwa
EXPOSE 3002
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]

# Business PWA production stage
FROM node:18-alpine AS business-pwa
RUN apk add --no-cache dumb-init
WORKDIR /app
# Copy the entire workspace root node_modules (contains hoisted dependencies)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/business-pwa ./packages/business-pwa
WORKDIR /app/packages/business-pwa
EXPOSE 3003
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]

# Driver PWA production stage
FROM node:18-alpine AS driver-pwa
RUN apk add --no-cache dumb-init
WORKDIR /app
# Copy the entire workspace root node_modules (contains hoisted dependencies)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/driver-pwa ./packages/driver-pwa
WORKDIR /app/packages/driver-pwa
EXPOSE 3004
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]