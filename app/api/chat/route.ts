import { NextRequest, NextResponse } from "next/server";

// Server-side proxy to the FieldCore API. Keeps FIELDCORE_API_KEY out of
// the browser. The UI posts { input }; we forward it to `POST /chat` with
// the auth + end-user headers and return the JSON unchanged.
//
// To later switch to the BYOM prepare/record flow, replace the single
// fetch below with the two-step sequence — the request/response shape the
// UI sees can stay the same.

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const apiKey = process.env.FIELDCORE_API_KEY;
  const apiUrl = process.env.FIELDCORE_API_URL;
  // The signed-in end-user id. In a real app this comes from the session;
  // here we read it from env as a single-user default.
  const userId = process.env.FIELDCORE_USER ?? "anonymous";

  if (!apiKey || !apiUrl) {
    return NextResponse.json(
      { error: "Missing FIELDCORE_API_KEY or FIELDCORE_API_URL." },
      { status: 500 }
    );
  }

  let input: unknown;
  try {
    const body = await req.json();
    input = body?.input;
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
    const upstream = await fetch(`${apiUrl.replace(/\/$/, "")}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
        "X-FieldCore-User": userId,
      },
      body: JSON.stringify({ input }),
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
        { error: "FieldCore API error.", detail: data },
        { status: upstream.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to reach FieldCore API.", detail: String(err) },
      { status: 502 }
    );
  }
}
