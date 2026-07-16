// Tiny client wrapper the UI uses to talk to our own API route.
// The route (app/api/chat/route.ts) proxies to the FieldCore API so the
// API key stays server-side.
//
// The abstraction is intentionally thin: today it hits the simple
// `POST /chat` path. If we later switch to the BYOM prepare/record flow,
// only this file and the route handler need to change — the UI keeps
// calling `sendMessage`.

export interface ChatResponse {
  // The assistant's reply text.
  reply: string;
  // Optional cognition metadata surfaced by FieldCore (e.g. coherence).
  coherence?: number;
  // Anything else the API returns, kept for forward-compat.
  [key: string]: unknown;
}

export async function sendMessage(input: string): Promise<ChatResponse> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Chat request failed (${res.status})${detail ? `: ${detail}` : ""}`
    );
  }

  return (await res.json()) as ChatResponse;
}
