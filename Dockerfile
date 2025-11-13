# ---------- STAGE 1: Build frontend (Vite) ----------
    FROM node:20-alpine AS frontend-build
    WORKDIR /frontend
    
    # allow build args (if you want to override backend url at build)
    ARG VITE_BACKEND_URL=http://localhost:8080
    ARG VITE_CHAT_API_URL
    ARG VITE_AVATAR_API_URL
    ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
    ENV VITE_CHAT_API_URL=$VITE_CHAT_API_URL
    ENV VITE_AVATAR_API_URL=$VITE_AVATAR_API_URL
    
    # Copy only package files first to leverage layer cache
    COPY ui/package*.json ./
    RUN npm ci --no-audit --no-fund
    
    # Copy frontend source and build (Vite default output: dist)
    COPY ui/ ./
    RUN npm run build
    
    # ---------- STAGE 2: Build Go backend and embed frontend ----------
    FROM golang:1.25-alpine AS go-builder
    WORKDIR /app
    
    # install git and certs for module fetching and TLS
    RUN apk add --no-cache git ca-certificates
    
    # Copy go modules for caching
    COPY backend/go.mod backend/go.sum ./
    RUN go mod download
    
    # Copy backend source
    COPY backend/ ./
    
    # Copy built frontend into backend path expected by app (ui/dist)
    COPY --from=frontend-build /frontend/dist ./ui/dist
    
    # Build static binary
    RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
        go build -ldflags="-s -w" -o /app/main ./main.go
    
    # ---------- STAGE 3: Minimal runtime ----------
    FROM alpine:latest AS runtime
    WORKDIR /home/appuser/app
    
    RUN apk --no-cache add ca-certificates tzdata
    
    # non-root user
    RUN addgroup -S appuser && adduser -S appuser -G appuser
    
    # Copy binary and static assets
    COPY --from=go-builder /app/main ./main
    COPY --from=go-builder /app/ui/dist ./ui/dist
    
    # ensure non-root ownership
    RUN chown -R appuser:appuser /home/appuser/app
    USER appuser
    
    EXPOSE 8080
    
    # do NOT bake env files with secrets into the image; pass them at runtime
    CMD ["./main"]
    