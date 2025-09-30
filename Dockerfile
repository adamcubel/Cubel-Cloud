# Use Node.js 20 LTS as base image
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Install Node.js for the OIDC server
RUN apk add --no-cache nodejs npm

# Copy built application from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy server files
COPY --from=builder /app/server /app/server
COPY --from=builder /app/node_modules /app/node_modules

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create config directory for mounting
RUN mkdir -p /app/config

# Copy startup script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose ports
EXPOSE 80 3001

# Start both nginx and OIDC server
CMD ["/docker-entrypoint.sh"]

# Development stage (optional)
FROM node:20-alpine AS development

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies)
RUN npm ci

# Copy source code
COPY . .

# Expose port 3000 for development
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev"]
