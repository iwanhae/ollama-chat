# Bun + React Ollama Chat Server

A high-performance Bun web server hosting a premium React-TS Chat UI that interacts with a local Ollama instance.

## Getting Started

### Development
1. Start the backend server:
   ```bash
   bun run server.ts
   ```
2. Start the Vite React development server:
   ```bash
   bun run dev
   ```

### Production Build
1. Build the React frontend:
   ```bash
   bun run build
   ```
2. Start the Bun production server (serves both API and built frontend static assets):
   ```bash
   bun run server.ts
   ```
