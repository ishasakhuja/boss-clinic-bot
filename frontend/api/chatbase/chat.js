/**
 * Vercel Serverless Function: Chatbase Chat Proxy
 *
 * Proxies chat requests to the Chatbase API so the API key
 * stays server-side and is never exposed to the browser.
 *
 * POST /api/chatbase/chat
 * Body: { message: string, conversationId?: string, history?: array }
 */

const CHATBASE_API_URL = "https://www.chatbase.co/api/v1/chat";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.CHATBASE_API_KEY;
  const chatbotId = process.env.CHATBASE_CHATBOT_ID || process.env.VITE_CHATBOT_ID;

  if (!apiKey || !chatbotId) {
    console.error("Missing CHATBASE_API_KEY or CHATBASE_CHATBOT_ID env vars");
    return res.status(500).json({ error: "Server misconfigured" });
  }

  const { message, conversationId, history } = req.body || {};

  if (!message) {
    return res.status(400).json({ error: "message is required" });
  }

  // Build message history: either use provided history or just the new message
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
    const upstream = await fetch(CHATBASE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(chatbasePayload),
    });

    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => "Unknown error");
      console.error("Chatbase API error:", upstream.status, errText);
      return res.status(upstream.status).json({
        error: `Chatbase API error: ${upstream.status}`,
        details: errText,
      });
    }

    // Stream the response back to the client as SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        res.write(chunk);
      }
    } catch (streamErr) {
      console.error("Stream error:", streamErr);
    }

    res.end();
  } catch (err) {
    console.error("Chatbase proxy error:", err);
    return res.status(500).json({ error: "Failed to reach Chatbase API" });
  }
}
