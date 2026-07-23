// Google Gemini provider — the Generative Language API.
//
// Differs most from OpenAI: the system prompt is `systemInstruction`, messages
// are `contents` with `parts: [{ text }]`, the assistant role is called
// `model`, the API key is a query parameter, and the model name is in the path.

import type { Message } from "@khwan/client";
import {
  providerError,
  splitSystem,
  type ModelConfig,
  type Provider,
} from "./types";

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
}

export const google: Provider = {
  defaultBaseUrl: "https://generativelanguage.googleapis.com",

  async generate(cfg: ModelConfig, messages: Message[]): Promise<string> {
    const base = (cfg.baseUrl ?? this.defaultBaseUrl).replace(/\/+$/, "");
    const { system, turns } = splitSystem(messages);

    const url =
      `${base}/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent` +
      `?key=${encodeURIComponent(cfg.apiKey)}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(system
          ? { systemInstruction: { parts: [{ text: system }] } }
          : {}),
        generationConfig: { maxOutputTokens: cfg.maxTokens },
        contents: turns.map((t) => ({
          // Gemini uses `model` for the assistant role.
          role: t.role === "assistant" ? "model" : "user",
          parts: [{ text: t.content }],
        })),
      }),
    });

    if (!res.ok) throw await providerError("google", res);

    const data = (await res.json()) as GeminiResponse;
    const text = data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("");
    if (!text) {
      throw new Error("google: response contained no text content.");
    }
    return text;
  },
};
