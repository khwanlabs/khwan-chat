// The chat endpoint. This is where the whole Khwan loop runs — server-side, so
// the API keys from `.env` never reach the browser:
//
//   prepare (Khwan builds context) → your model generates → record (Khwan learns)
//
// GET  /api/chat  → non-secret config status for the UI (no keys).
// POST /api/chat  → { message, userId? } ⇒ a stream of newline-delimited JSON
//   events so the UI can animate the loop live:
//     { step: "prepare", status: "start" | "done" | "blocked", coherence?, sources?, reason? }
//     { step: "model",   status: "start" | "done", provider?, model? }
//     { step: "record",  status: "start" | "done" }
//     { type: "answer", answer, coherence, sources } | { type: "blocked", reason } | { type: "error", error }
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

  // Stream the loop as newline-delimited JSON so the UI can show each of the
  // three steps as it happens: prepare (Khwan) → your model → record (Khwan).
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));

      try {
        // 1. Khwan builds the context (memory + constitution + coherence). No LLM.
        send({ step: "prepare", status: "start" });
        const turn = await client.prepare(message.trim());

        // Coherence gate: if the turn isn't allowed, surface the reason + stop.
        if (!turn.allowed) {
          const reason =
            turn.reason ??
            "Khwan's coherence gate blocked this turn (no reason given).";
          send({ step: "prepare", status: "blocked", reason });
          send({ type: "blocked", reason });
          controller.close();
          return;
        }
        send({
          step: "prepare",
          status: "done",
          coherence: turn.coherence,
          sources: turn.sources.length,
        });

        // 2. Call the configured provider directly with the prepared messages.
        send({
          step: "model",
          status: "start",
          provider: config.model.provider,
          model: config.model.model,
        });
        const answer = await generate(config.model, turn.messages);
        send({ step: "model", status: "done" });

        // 3. Hand the answer back so Khwan can persist + learn.
        send({ step: "record", status: "start" });
        await client.record(turn, answer);
        send({ step: "record", status: "done" });

        // Final: the answer, with the memory made visible (coherence + sources).
        send({
          type: "answer",
          answer,
          coherence: turn.coherence,
          sources: turn.sources.length,
        });
      } catch (err) {
        // Stream already opened ⇒ status is 200; report failures as an event.
        let error = err instanceof Error ? err.message : String(err);
        if (err instanceof KhwanError) {
          if (err.status === 402) {
            error =
              "Per-user memory limit reached for this plan. Reuse an existing " +
              "User, upgrade for more end-users, or clear the User field to " +
              "chat against one shared brain.";
          } else if (err.status === 422) {
            error = `Invalid user id "${userId ?? ""}". Use letters, numbers, and dashes.`;
          }
        }
        send({ type: "error", error });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      // Ask any proxy (e.g. nginx) not to buffer, so steps arrive live.
      "X-Accel-Buffering": "no",
    },
  });
}
