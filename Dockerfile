# Stage 1: Build React App
FROM oven/bun:1 as builder

WORKDIR /app

# Install dependencies first for caching
COPY package.json bun.lockb* ./
RUN bun install

# Copy source and build
COPY . .
RUN bun run build

# Stage 2: Serve
FROM oven/bun:1-alpine

WORKDIR /app

# Copy the built files from builder
COPY --from=builder /app/dist ./dist
COPY server.ts ./

# Default environment variables
ENV NODE_ENV=production
ENV PORT=3000
# host.docker.internal is used to access the host's localhost where Ollama is typically running
ENV OLLAMA_HOST=http://host.docker.internal:11434

EXPOSE 3000

CMD ["bun", "run", "server.ts"]
