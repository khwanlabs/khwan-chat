// Anthropic (Claude) provider — the Messages API.
//
// Differs from OpenAI: the system prompt is a top-level `system` field (not a
// message), auth is `x-api-key` + `anthropic-version`, and `max_tokens` is
// required. We pull the system prompt out of the prepared messages and send
// the rest as the conversation.

import type { Message } from "@khwan/client";
import {
  providerError,
  splitSystem,
  type ModelConfig,
  type Provider,
} from "./types";

const ANTHROPIC_VERSION = "2023-06-01";

interface AnthropicResponse {
  content?: Array<{ type?: string; text?: string }>;
}

export const anthropic: Provider = {
  defaultBaseUrl: "https://api.anthropic.com",

  async generate(cfg: ModelConfig, messages: Message[]): Promise<string> {
    const base = (cfg.baseUrl ?? this.defaultBaseUrl).replace(/\/+$/, "");
    const { system, turns } = splitSystem(messages);

    const res = await fetch(`${base}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": cfg.apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: cfg.model,
        max_tokens: cfg.maxTokens,
        ...(system ? { system } : {}),
        messages: turns.map((t) => ({ role: t.role, content: t.content })),
      }),
    });

    if (!res.ok) throw await providerError("anthropic", res);

    const data = (await res.json()) as AnthropicResponse;
    const text = data.content
      ?.filter((b) => b.type === "text" && typeof b.text === "string")
      .map((b) => b.text)
      .join("");
    if (!text) {
      throw new Error("anthropic: response contained no text content.");
    }
    return text;
  },
};
