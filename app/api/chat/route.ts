// The chat endpoint. This is where the whole Khwan loop runs — server-side, so
// the API keys from `.env` never reach the browser:
//
//   prepare (Khwan builds context) → your model generates → record (Khwan learns)
//
// GET  /api/chat  → non-secret config status for the UI (no keys).
// POST /api/chat  → { message, userId? } ⇒ { answer, coherence, sources, blocked, reason }.
//
// `userId` (optional) selects an ISOLATED per-user sub-brain so the demo can
// show Khwan remembering each user separately. Omit/blank ⇒ one shared brain.
// Per-user sub-brains are a paid Khwan feature (the free plan returns 402).

import { Khwan, KhwanError } from "@khwan/client";
import { NextResponse } from "next/server";
import { publicConfig, readConfig } from "@/lib/config";
import { generate } from "@/lib/providers";

// Reads env + calls out to the model provider — run on the Node.js runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(publicConfig());
}

export async function POST(req: Request) {
  const { config, missing } = readConfig();
  if (!config) {
    return NextResponse.json(
      {
        error:
          "Server is not configured. Set the missing variables in .env — see README.",
        missing,
      },
      { status: 503 },
    );
  }

  let body: { message?: unknown; userId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const { message } = body;
  if (typeof message !== "string" || !message.trim()) {
    return NextResponse.json(
      { error: "Body must be { message: string }." },
      { status: 400 },
    );
  }

  // Resolve the end-user: the browser's value wins (empty ⇒ shared brain),
  // otherwise fall back to KHWAN_USER from .env. This is what makes each user a
  // separate, isolated sub-brain.
  const bodyUserId =
    typeof body.userId === "string" ? body.userId.trim() : undefined;
  const userId =
    bodyUserId !== undefined ? bodyUserId || undefined : config.khwan.userId;

  const client = new Khwan({
    apiKey: config.khwan.apiKey,
    baseUrl: config.khwan.baseUrl,
    userId,
    core: config.khwan.core,
  });

  try {
    // 1. Khwan builds the context (memory + constitution + coherence). No LLM.
    const turn = await client.prepare(message.trim());

    // 2. Coherence gate: if the turn isn't allowed, surface the reason + stop.
    if (!turn.allowed) {
      return NextResponse.json({
        blocked: true,
        reason:
          turn.reason ??
          "Khwan's coherence gate blocked this turn (no reason given).",
      });
    }

    // 3. Call the configured provider directly with the prepared messages.
    const answer = await generate(config.model, turn.messages);

    // 4. Hand the answer back so Khwan can persist + learn.
    await client.record(turn, answer);

    // 5. Return the answer with the memory made visible (coherence + sources).
    return NextResponse.json({
      answer,
      coherence: turn.coherence,
      sources: turn.sources.length,
    });
  } catch (err) {
    // Make the per-user (paid) and bad-id cases readable in the UI.
    if (err instanceof KhwanError) {
      if (err.status === 402) {
        return NextResponse.json(
          {
            error:
              "Per-user memory limit reached for this plan. Reuse an existing " +
              "User, upgrade for more end-users, or clear the User field to " +
              "chat against one shared brain.",
          },
          { status: 402 },
        );
      }
      if (err.status === 422) {
        return NextResponse.json(
          {
            error: `Invalid user id "${userId ?? ""}". Use letters, numbers, and dashes.`,
          },
          { status: 422 },
        );
      }
    }
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: detail }, { status: 502 });
  }
}
