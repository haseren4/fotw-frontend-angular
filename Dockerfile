# Multi-stage Dockerfile for building and serving the Angular app

# ---------- Build stage ----------
FROM node:20-alpine AS build

# Set working directory
WORKDIR /app


# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Copy the rest of the source
COPY . .

# Build the Angular app (production by default per angular.json)
RUN npm run build

# ---------- Runtime stage ----------
FROM nginx:alpine AS runtime

# Copy a custom nginx config to support Angular SPA routing
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy built artifacts from the build stage
# Angular v16+ default output path is dist/<project-name>/browser
COPY --from=build /app/dist/fotw-frontend/browser /usr/share/nginx/html

# Expose port 80 and run nginx
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
