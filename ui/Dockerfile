# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Accept build arguments for Vite environment variables
ARG VITE_BACKEND_URL=http://localhost:8080
ARG VITE_CHAT_API_URL
ARG VITE_AVATAR_API_URL

# Set environment variables for build
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
ENV VITE_CHAT_API_URL=$VITE_CHAT_API_URL
ENV VITE_AVATAR_API_URL=$VITE_AVATAR_API_URL

# Copy package files
COPY package*.json ./

# Install dependencies (cached layer)
RUN npm ci --only=production=false

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage - nginx
FROM nginx:alpine

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config for SPA routing
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

