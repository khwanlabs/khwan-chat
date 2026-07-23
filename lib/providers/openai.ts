// OpenAI-compatible provider.
//
// Covers OpenAI itself and any endpoint that speaks the same
// `/chat/completions` protocol: Groq, OpenRouter, Together, DeepSeek, Mistral,
// xAI (Grok), Ollama, LM Studio, vLLM, … — just point `MODEL_BASE_URL` at it.

import type { Message } from "@khwan/client";
import { providerError, type ModelConfig, type Provider } from "./types";

interface ChatCompletion {
  choices?: Array<{ message?: { content?: string | null } }>;
}

export const openai: Provider = {
  defaultBaseUrl: "https://api.openai.com/v1",

  async generate(cfg: ModelConfig, messages: Message[]): Promise<string> {
    const base = (cfg.baseUrl ?? this.defaultBaseUrl).replace(/\/+$/, "");

    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        max_tokens: cfg.maxTokens,
        // Forward only role/content — drop any extra fields Khwan may attach.
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!res.ok) throw await providerError("openai", res);

    const data = (await res.json()) as ChatCompletion;
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new Error("openai: response contained no message content.");
    }
    return content;
  },
};
