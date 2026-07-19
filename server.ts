import { serve } from "bun";

const OLLAMA_HOST = "http://localhost:11434";
const PORT = 3000;

console.log(`Starting Bun server on http://localhost:${PORT}...`);

serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // 1. API: List Models
    if (url.pathname === "/api/models" && req.method === "GET") {
      try {
        const response = await fetch(`${OLLAMA_HOST}/api/tags`);
        if (!response.ok) {
          return new Response(`Ollama returned status ${response.status}`, { status: 500 });
        }
        const data = await response.json();
        return new Response(JSON.stringify(data), {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
      } catch (err) {
        console.error("Error fetching models from Ollama:", err);
        return new Response(JSON.stringify({ error: "Failed to connect to Ollama. Make sure it is running." }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // 2. API: Chat (Streaming proxy)
    if (url.pathname === "/api/chat" && req.method === "POST") {
      try {
        const body = await req.json();
        const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...body,
            stream: true, // Always stream back to Bun
          }),
        });

        if (!response.ok) {
          const errMsg = await response.text();
          return new Response(errMsg, { status: response.status });
        }

        // Pipe the body readable stream directly to the client
        return new Response(response.body, {
          headers: {
            "Content-Type": "application/x-ndjson",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
          },
        });
      } catch (err) {
        console.error("Error in chat proxy:", err);
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // CORS preflight requests
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // 3. Serve Static Files from Vite dist directory
    const filePath = url.pathname === "/" ? "/index.html" : url.pathname;
    const file = Bun.file(`./dist${filePath}`);

    if (await file.exists()) {
      return new Response(file);
    }

    // SPA routing fallback: serve index.html for unknown routes
    const indexFile = Bun.file("./dist/index.html");
    if (await indexFile.exists()) {
      return new Response(indexFile);
    }

    // Fallback if index.html hasn't been built yet
    return new Response(
      `<html>
        <head><title>Ollama React App</title></head>
        <body style="font-family: sans-serif; background: #0b0f19; color: #fff; text-align: center; padding-top: 100px;">
          <h1>Ollama Chat Server is running!</h1>
          <p>Please run <code>bun run build</code> in the project root to bundle and serve the React interface.</p>
          <p>Or run <code>bun run dev</code> to start the development server.</p>
        </body>
      </html>`,
      {
        headers: { "Content-Type": "text/html" },
      }
    );
  },
});
