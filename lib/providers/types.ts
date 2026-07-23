// Provider abstraction for the generation step of the loop.
//
// Khwan's `prepare` hands back `turn.messages` in the OpenAI shape
// (`{ role, content }`, roles `system` / `user` / `assistant`). Each provider
// below adapts those messages to its own API and returns the answer text,
// which is then handed back to Khwan via `record`. All of this runs
// SERVER-SIDE (in the Next.js API route), so your model key stays in `.env`
// and never reaches the browser.

import type { Message } from "@khwan/client";

/** Supported provider families. `openai` also covers any OpenAI-compatible
 * endpoint (Groq, OpenRouter, DeepSeek, Together, Mistral, xAI, Ollama,
 * LM Studio, vLLM, …) via `MODEL_BASE_URL`. */
export type ProviderName = "openai" | "anthropic" | "google";

export const PROVIDER_NAMES: readonly ProviderName[] = [
  "openai",
  "anthropic",
  "google",
];

export function isProviderName(v: string): v is ProviderName {
  return (PROVIDER_NAMES as readonly string[]).includes(v);
}

/** Resolved model configuration read from the environment. */
export interface ModelConfig {
  provider: ProviderName;
  /** Provider API key. */
  apiKey: string;
  /** Model name, e.g. `gpt-4o-mini`, `claude-3-5-haiku-latest`, `gemini-1.5-flash`. */
  model: string;
  /** Optional base-URL override. Falls back to the provider's default. */
  baseUrl?: string;
  /** Upper bound on generated tokens. */
  maxTokens: number;
}

export interface Provider {
  /** Base URL used when `MODEL_BASE_URL` is unset. */
  readonly defaultBaseUrl: string;
  /** Adapt the prepared messages to this provider and return the answer text. */
  generate(cfg: ModelConfig, messages: Message[]): Promise<string>;
}

/** Split prepared messages into a joined system prompt and the conversation
 * turns — used by providers that carry the system prompt out-of-band
 * (Anthropic, Google). */
export function splitSystem(messages: Message[]): {
  system: string;
  turns: Array<{ role: "user" | "assistant"; content: string }>;
} {
  const systemParts: string[] = [];
  const turns: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const m of messages) {
    if (m.role === "system") {
      if (m.content) systemParts.push(m.content);
    } else {
      // Treat everything non-system as an assistant/user turn.
      turns.push({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      });
    }
  }
  return { system: systemParts.join("\n\n"), turns };
}

/** Uniform error for a failed provider HTTP call. */
export async function providerError(
  provider: ProviderName,
  res: Response,
): Promise<Error> {
  const detail = await res.text().catch(() => "");
  return new Error(
    `${provider} request failed (HTTP ${res.status})${
      detail ? `: ${detail.slice(0, 300)}` : ""
    }`,
  );
}
