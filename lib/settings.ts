// Client-side settings persisted in localStorage. Nothing here ever touches a
// server — the whole sample runs in the browser against the Khwan API.

export interface Settings {
  apiKey: string;
  baseUrl: string;
  userId: string;
  /** Optional isolated core (แกน) slug. Empty ⇒ the account's default core. */
  core: string;
}

const STORAGE_KEY = "khwan-chat-sample:settings";

export const DEFAULT_BASE_URL = "https://api.khwan.ai";

export function emptySettings(): Settings {
  return { apiKey: "", baseUrl: DEFAULT_BASE_URL, userId: "", core: "" };
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
    };
  } catch {
    return emptySettings();
  }
}

export function saveSettings(settings: Settings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

/** Whether we have the minimum needed to talk to the API. */
export function isConfigured(s: Settings): boolean {
  return Boolean(s.apiKey.trim() && s.baseUrl.trim() && s.userId.trim());
}
