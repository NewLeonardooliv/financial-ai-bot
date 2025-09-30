# Use the official Bun image
FROM oven/bun:1-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S bun && \
    adduser -S bun -u 1001

# Change ownership of the app directory
RUN chown -R bun:bun /usr/src/app

# Switch to non-root user
USER bun

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Run the application
CMD ["bun", "run", "src/index.ts"]
