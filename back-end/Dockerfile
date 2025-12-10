# Multi-stage build for backend Fastify application

# Stage 1: Install dependencies
FROM node:20-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build TypeScript
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build:ts

# Stage 3: Production image
FROM node:20-alpine
WORKDIR /app

# Copy package files and install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built application from build stage
COPY --from=build /app/dist ./dist

# Expose port (Fastify default is 3000)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application with Fastify CLI
# -a 0.0.0.0 is critical: binds to all interfaces so App Runner can reach the app
CMD ["npx", "fastify", "start", "-l", "info", "-a", "0.0.0.0", "dist/app.js"]
