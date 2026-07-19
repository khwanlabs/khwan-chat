// Direct browser → OpenAI call. Khwan never sees this key: it is read from
// localStorage and sent only to the OpenAI-compatible endpoint below.
//
// Khwan's `prepare` hands back the messages to send; we forward them verbatim
// to `POST {baseUrl}/chat/completions` and take the first choice's content as
// the answer, which is then handed back to Khwan via `record`.

import type { Message } from "@khwan/client";

export interface ModelConfig {
  /** OpenAI API key (sk-...). */
  apiKey: string;
  /** Model name, e.g. gpt-4o-mini. */
  model: string;
  /** OpenAI-compatible base URL, e.g. https://api.openai.com/v1. */
  baseUrl: string;
}

interface ChatCompletion {
  choices?: Array<{ message?: { content?: string | null } }>;
}

/** Call an OpenAI-compatible chat-completions endpoint with prepared messages. */
export async function generate(
  cfg: ModelConfig,
  messages: Message[],
): Promise<string> {
  const base = cfg.baseUrl.trim().replace(/\/+$/, "");

  let res: Response;
  try {
    res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: cfg.model.trim(),
        // Forward only role/content — drop any extra fields Khwan may attach.
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });
  } catch (err) {
    throw new Error(
      `Could not reach your model at ${base}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Model request failed (HTTP ${res.status})${
        detail ? `: ${detail.slice(0, 300)}` : ""
      }`,
    );
  }

  const data = (await res.json()) as ChatCompletion;
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("Model response contained no message content.");
  }
  return content;
}
