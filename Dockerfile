# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

ARG PUBLIC_API_URL=/api
ARG PUBLIC_PROXY_URL=/proxy


ENV PUBLIC_API_URL=$PUBLIC_API_URL
ENV PUBLIC_PROXY_URL=$PUBLIC_PROXY_URL

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build:ci

RUN npm prune --omit=dev

# Production stage
FROM node:24-alpine

WORKDIR /app

# Copy the entire .svelte-kit output directory (adapter-node uses this)
COPY --from=builder /app/build ./build
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Expose port (its own default is 3000)
EXPOSE 3636

# Health check /health answers from the frontend alone, without rendering a page or calling the API
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3636) + '/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"

# Start the application
CMD ["node", "build"]
