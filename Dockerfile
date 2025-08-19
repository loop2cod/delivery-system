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
COPY packages/*/package.json packages/*/package.json

# Allow toggling lockfile strictness at build time (defaults to strict)
ARG PNPM_FLAGS="--frozen-lockfile"

# Install dependencies
RUN pnpm install $PNPM_FLAGS

# Copy source code
COPY . .

# Build stage
FROM base AS builder
RUN pnpm run build

# Backend production stage
FROM node:18-alpine AS backend
WORKDIR /app
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/package.json ./backend/
COPY --from=builder /app/backend/node_modules ./backend/node_modules
EXPOSE 3000
CMD ["node", "backend/dist/server.js"]

# Public PWA production stage
FROM node:18-alpine AS public-pwa
WORKDIR /app
COPY --from=builder /app/packages/public-pwa/.next ./packages/public-pwa/.next
COPY --from=builder /app/packages/public-pwa/package.json ./packages/public-pwa/
COPY --from=builder /app/packages/public-pwa/node_modules ./packages/public-pwa/node_modules
COPY --from=builder /app/packages/public-pwa/public ./packages/public-pwa/public
EXPOSE 3001
CMD ["npm", "start", "--prefix", "packages/public-pwa"]

# Admin PWA production stage
FROM node:18-alpine AS admin-pwa
WORKDIR /app
COPY --from=builder /app/packages/admin-pwa/.next ./packages/admin-pwa/.next
COPY --from=builder /app/packages/admin-pwa/package.json ./packages/admin-pwa/
COPY --from=builder /app/packages/admin-pwa/node_modules ./packages/admin-pwa/node_modules
COPY --from=builder /app/packages/admin-pwa/public ./packages/admin-pwa/public
EXPOSE 3002
CMD ["npm", "start", "--prefix", "packages/admin-pwa"]

# Business PWA production stage
FROM node:18-alpine AS business-pwa
WORKDIR /app
COPY --from=builder /app/packages/business-pwa/.next ./packages/business-pwa/.next
COPY --from=builder /app/packages/business-pwa/package.json ./packages/business-pwa/
COPY --from=builder /app/packages/business-pwa/node_modules ./packages/business-pwa/node_modules
COPY --from=builder /app/packages/business-pwa/public ./packages/business-pwa/public
EXPOSE 3003
CMD ["npm", "start", "--prefix", "packages/business-pwa"]

# Driver PWA production stage
FROM node:18-alpine AS driver-pwa
WORKDIR /app
COPY --from=builder /app/packages/driver-pwa/.next ./packages/driver-pwa/.next
COPY --from=builder /app/packages/driver-pwa/package.json ./packages/driver-pwa/
COPY --from=builder /app/packages/driver-pwa/node_modules ./packages/driver-pwa/node_modules
COPY --from=builder /app/packages/driver-pwa/public ./packages/driver-pwa/public
EXPOSE 3004
CMD ["npm", "start", "--prefix", "packages/driver-pwa"]