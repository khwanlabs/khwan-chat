// Client-side settings persisted in localStorage. Nothing here ever touches a
// server of ours — the whole sample runs in the browser. Khwan builds the
// context; your own model (OpenAI-compatible) generates the reply. The two
// keys stay separate: the Khwan key talks to the Khwan API, the OpenAI key is
// used only for the direct browser → OpenAI call and is never sent to Khwan.

export interface Settings {
  // ---- Khwan (memory layer) ----
  apiKey: string;
  baseUrl: string;
  userId: string;
  /** Optional isolated core slug. Empty ⇒ the account's default core. */
  core: string;

  // ---- Your model (generation) ----
  /** OpenAI API key (sk-...). Used only for the browser → OpenAI call. */
  openaiKey: string;
  /** Model name, e.g. gpt-4o-mini. */
  openaiModel: string;
  /** OpenAI-compatible base URL — point it at any compatible endpoint. */
  openaiBaseUrl: string;
}

const STORAGE_KEY = "khwan-chat-sample:settings";

export const DEFAULT_BASE_URL = "https://api.khwan.ai";
export const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
export const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

export function emptySettings(): Settings {
  return {
    apiKey: "",
    baseUrl: DEFAULT_BASE_URL,
    userId: "",
    core: "",
    openaiKey: "",
    openaiModel: DEFAULT_OPENAI_MODEL,
    openaiBaseUrl: DEFAULT_OPENAI_BASE_URL,
  };
}

export function loadSettings(): Settings {
  if (typeof window === "undefined") return emptySettings();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptySettings();
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      ...emptySettings(),
      ...parsed,
      baseUrl: parsed.baseUrl || DEFAULT_BASE_URL,
      openaiModel: parsed.openaiModel || DEFAULT_OPENAI_MODEL,
      openaiBaseUrl: parsed.openaiBaseUrl || DEFAULT_OPENAI_BASE_URL,
    };
  } catch {
    return emptySettings();
  }
}

export function saveSettings(settings: Settings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

/**
 * Whether we have the minimum needed to run the full loop: Khwan credentials
 * to prepare/record, plus your own model's key + name to generate the reply.
 */
export function isConfigured(s: Settings): boolean {
  return Boolean(
    s.apiKey.trim() &&
      s.baseUrl.trim() &&
      s.userId.trim() &&
      s.openaiKey.trim() &&
      s.openaiModel.trim() &&
      s.openaiBaseUrl.trim(),
  );
}
