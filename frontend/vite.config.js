import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * Dev-only middleware that proxies /api/chatbase/chat to the Chatbase API.
 * In production (Vercel), the serverless function at api/chatbase/chat.js handles this.
 */
function chatbaseDevProxy() {
  return {
    name: "chatbase-dev-proxy",
    configureServer(server) {
      server.middlewares.use("/api/chatbase/chat", async (req, res) => {
        if (req.method === "OPTIONS") {
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
          res.setHeader("Access-Control-Allow-Headers", "Content-Type");
          res.writeHead(204);
          res.end();
          return;
        }

        if (req.method !== "POST") {
          res.writeHead(405, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }

        // Read the env vars (loaded by Vite including non-VITE_ ones via loadEnv)
        const env = loadEnv("development", process.cwd(), "");
        const apiKey = env.CHATBASE_API_KEY;
        const chatbotId = env.CHATBASE_CHATBOT_ID || env.VITE_CHATBOT_ID;

        if (!apiKey || !chatbotId) {
          console.error("[chatbase-proxy] Missing CHATBASE_API_KEY or CHATBASE_CHATBOT_ID in .env");
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Server misconfigured" }));
          return;
        }

        // Parse the request body
        let body = "";
        for await (const chunk of req) {
          body += chunk;
        }

        let parsed;
        try {
          parsed = JSON.parse(body);
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON" }));
          return;
        }

        const { message, conversationId, history } = parsed;

        if (!message) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "message is required" }));
          return;
        }

        // Build messages array
        const messages = Array.isArray(history) && history.length > 0
          ? [...history, { role: "user", content: message }]
          : [{ role: "user", content: message }];

        const chatbasePayload = {
          chatbotId,
          messages,
          stream: true,
          ...(conversationId ? { conversationId } : {}),
        };

        try {
          const upstream = await fetch("https://www.chatbase.co/api/v1/chat", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(chatbasePayload),
          });

          if (!upstream.ok) {
            const errText = await upstream.text().catch(() => "Unknown error");
            console.error("[chatbase-proxy] API error:", upstream.status, errText);
            res.writeHead(upstream.status, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: `Chatbase API error: ${upstream.status}`, details: errText }));
            return;
          }

          // Stream the response
          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
          });

          const reader = upstream.body.getReader();
          const decoder = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            res.write(chunk);
          }

          res.end();
        } catch (err) {
          console.error("[chatbase-proxy] Proxy error:", err);
          if (!res.headersSent) {
            res.writeHead(500, { "Content-Type": "application/json" });
          }
          res.end(JSON.stringify({ error: "Failed to reach Chatbase API" }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), chatbaseDevProxy()],
});
