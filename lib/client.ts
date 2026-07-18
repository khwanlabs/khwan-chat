import { Khwan } from "@khwan/client";
import type { Settings } from "./settings";

/** Build a Khwan client from the current settings. */
export function makeClient(s: Settings): Khwan {
  return new Khwan({
    apiKey: s.apiKey.trim(),
    userId: s.userId.trim(),
    baseUrl: s.baseUrl.trim() || undefined,
    // Omit `core` entirely when empty ⇒ the account's default core.
    core: s.core.trim() || undefined,
  });
}
