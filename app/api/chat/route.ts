import { NextRequest, NextResponse } from "next/server";
import { khwanEnv } from "@/lib/khwan-server";

// Server-side proxy to the Khwan API. Keeps secrets out of the browser.
// The UI posts { input }; we forward it to `POST /chat` with the auth headers
// (the signed-in user's Google Bearer when available, else the demo API key —
// see lib/khwan-server.ts) and return the JSON unchanged.
//
// To later switch to the BYOM prepare/record flow, replace the single
// fetch below with the two-step sequence — the request/response shape the
// UI sees can stay the same.

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const env = await khwanEnv();
  if ("error" in env) return env.error;

  let input: unknown;
  let sessionId: unknown;
  try {
    const body = await req.json();
    input = body?.input;
    sessionId = body?.session_id;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof input !== "string" || input.trim() === "") {
    return NextResponse.json(
      { error: "Field `input` must be a non-empty string." },
      { status: 400 }
    );
  }

  try {
    const upstream = await fetch(`${env.apiUrl}/chat`, {
      method: "POST",
      headers: env.headers,
      body: JSON.stringify(
        typeof sessionId === "string" && sessionId
          ? { input, session_id: sessionId }
          : { input }
      ),
    });

    const text = await upstream.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { reply: text };
    }

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Khwan API error.", detail: data },
        { status: upstream.status }
      );
    }

    // Normalize the Khwan field (`response`) to the UI's `reply`.
    const d = (data ?? {}) as Record<string, unknown>;
    return NextResponse.json(
      { reply: d.response ?? d.reply ?? "", coherence: d.coherence, ...d },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to reach Khwan API.", detail: String(err) },
      { status: 502 }
    );
  }
}
