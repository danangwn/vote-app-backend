# Use a small Node base
FROM node:18-alpine AS deps
WORKDIR /usr/src/app

# Install dependencies (use package-lock.json for reproducible installs)
COPY package*.json ./
RUN npm ci --only=production

# Build final image
FROM node:18-alpine AS runner
WORKDIR /usr/src/app

# Copy production deps
COPY --from=deps /usr/src/app/node_modules ./node_modules

# Copy app source
COPY . .

# Create a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

ENV NODE_ENV=production
ENV PORT=4000

# Healthcheck (optional): try root endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD wget -qO- --timeout=5 http://localhost:4000/ || exit 1

EXPOSE 4000
CMD ["node", "server.js"]
