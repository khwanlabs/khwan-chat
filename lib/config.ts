// Reads the whole app config from environment variables (`.env`). This module
// is SERVER-ONLY — it is imported from the API route, never from a client
// component — so the API keys it reads never reach the browser.
//
// See `.env.example` for every variable and how to set it.

import "server-only";

import {
  PROVIDER_NAMES,
  isProviderName,
  type ModelConfig,
  type ProviderName,
} from "./providers/types";

export interface KhwanConfig {
  apiKey: string;
  baseUrl: string;
  /** End-user id (isolated sub-brain). Empty ⇒ one shared brain per account. */
  userId?: string;
  /** Isolated core slug. Empty ⇒ the account's default core. */
  core?: string;
}

export interface AppConfig {
  khwan: KhwanConfig;
  model: ModelConfig;
}

/** Public, non-secret view of the config — safe to send to the browser so the
 * UI can show what's active and what's missing. Never includes any key. */
export interface PublicConfig {
  configured: boolean;
  missing: string[];
  provider?: ProviderName;
  model?: string;
  core?: string;
  userId?: string;
}

const DEFAULT_KHWAN_BASE_URL = "https://api.khwan.ai";
const DEFAULT_MAX_TOKENS = 1024;

function env(name: string): string {
  return (process.env[name] ?? "").trim();
}

interface ReadResult {
  config?: AppConfig;
  missing: string[];
  provider?: ProviderName;
  model?: string;
}

/** Parse + validate the environment. Returns the config when complete, or the
 * list of missing/invalid variables otherwise. */
export function readConfig(): ReadResult {
  const missing: string[] = [];

  // ---- Khwan (memory layer) ----
  const khwanKey = env("KHWAN_API_KEY");
  if (!khwanKey) missing.push("KHWAN_API_KEY");
  const khwanBaseUrl = env("KHWAN_BASE_URL") || DEFAULT_KHWAN_BASE_URL;
  const userId = env("KHWAN_USER");
  const core = env("KHWAN_CORE");

  // ---- Model provider (generation) ----
  const providerRaw = env("MODEL_PROVIDER").toLowerCase();
  let provider: ProviderName | undefined;
  if (!providerRaw) {
    missing.push("MODEL_PROVIDER");
  } else if (!isProviderName(providerRaw)) {
    missing.push(
      `MODEL_PROVIDER (got "${providerRaw}"; expected one of ${PROVIDER_NAMES.join(", ")})`,
    );
  } else {
    provider = providerRaw;
  }

  const modelKey = env("MODEL_API_KEY");
  if (!modelKey) missing.push("MODEL_API_KEY");
  const model = env("MODEL_NAME");
  if (!model) missing.push("MODEL_NAME");
  const baseUrl = env("MODEL_BASE_URL") || undefined;

  const maxTokensRaw = env("MODEL_MAX_TOKENS");
  let maxTokens = DEFAULT_MAX_TOKENS;
  if (maxTokensRaw) {
    const parsed = Number(maxTokensRaw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      missing.push(`MODEL_MAX_TOKENS (got "${maxTokensRaw}"; expected a positive number)`);
    } else {
      maxTokens = Math.floor(parsed);
    }
  }

  if (missing.length > 0 || !provider) {
    return { missing, provider, model: model || undefined };
  }

  return {
    missing: [],
    provider,
    model,
    config: {
      khwan: {
        apiKey: khwanKey,
        baseUrl: khwanBaseUrl,
        userId: userId || undefined,
        core: core || undefined,
      },
      model: {
        provider,
        apiKey: modelKey,
        model,
        baseUrl,
        maxTokens,
      },
    },
  };
}

/** Non-secret status for the UI. */
export function publicConfig(): PublicConfig {
  const { config, missing, provider, model } = readConfig();
  if (!config) {
    return { configured: false, missing, provider, model };
  }
  return {
    configured: true,
    missing: [],
    provider: config.model.provider,
    model: config.model.model,
    core: config.khwan.core,
    userId: config.khwan.userId,
  };
}
