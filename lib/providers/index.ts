// Provider registry + the single `generate` entry point used by the API route.

import type { Message } from "@khwan/client";
import { anthropic } from "./anthropic";
import { google } from "./google";
import { openai } from "./openai";
import type { ModelConfig, Provider, ProviderName } from "./types";

export * from "./types";

const REGISTRY: Record<ProviderName, Provider> = {
  openai,
  anthropic,
  google,
};

export function getProvider(name: ProviderName): Provider {
  return REGISTRY[name];
}

/** The default base URL a provider uses when `MODEL_BASE_URL` is unset. */
export function defaultBaseUrl(name: ProviderName): string {
  return REGISTRY[name].defaultBaseUrl;
}

/** Run the generation step: adapt the prepared messages to the configured
 * provider and return the answer text. */
export function generate(
  cfg: ModelConfig,
  messages: Message[],
): Promise<string> {
  return getProvider(cfg.provider).generate(cfg, messages);
}
