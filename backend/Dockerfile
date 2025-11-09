# Build stage
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Install git for go modules that may need it
RUN apk add --no-cache git ca-certificates

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies (cached layer)
RUN go mod download

# Copy source code
COPY . .

# Build the application
# CGO_ENABLED=0 creates a static binary
# -ldflags="-s -w" strips debug info to reduce size
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o main .

# Final stage - minimal runtime
FROM alpine:latest

WORKDIR /app

# Install ca-certificates for HTTPS requests
RUN apk --no-cache add ca-certificates tzdata

# Copy binary from builder
COPY --from=builder /app/main .

# Copy env file if exists (optional)
COPY --from=builder /app/env.env* ./

# Expose port
EXPOSE 8080

# Run the application
CMD ["./main"]

