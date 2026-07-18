import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Shared server-side helper for the Khwan proxy routes. Centralizes the
// upstream base URL + auth headers so secrets stay out of the browser and every
// route forwards the same way (mirrors app/api/chat/route.ts).
//
// Identity resolution (per multi-user Phase 1):
//   1. If the caller is signed in via Google (NextAuth session carries an
//      id_token), forward `Authorization: Bearer <id_token>`. The API verifies
//      the token and resolves the real account + role (owner = full/mutating,
//      invited member = read-only).
//   2. Otherwise fall back to the server-side demo credentials
//      (`X-API-Key` + `X-Khwan-User`) so the app keeps working locally
//      before the OAuth redirect URI is registered.

export interface KhwanEnv {
  apiUrl: string;
  headers: Record<string, string>;
}

// Returns the upstream base URL + auth headers, or a 500 NextResponse if the
// server is misconfigured. Async because it reads the server session.
// Callers should check `"error" in result`.
export async function khwanEnv(): Promise<
  KhwanEnv | { error: NextResponse }
> {
  const apiUrl = process.env.KHWAN_API_URL;
  if (!apiUrl) {
    return {
      error: NextResponse.json(
        { error: "Missing KHWAN_API_URL." },
        { status: 500 }
      ),
    };
  }

  const base = { apiUrl: apiUrl.replace(/\/$/, "") };

  // Prefer the logged-in user's Google id_token when present.
  const session = (await getServerSession(authOptions)) as
    | { id_token?: string }
    | null;
  if (session?.id_token) {
    return {
      ...base,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.id_token}`,
      },
    };
  }

  // No session — fall back to the single-key demo account.
  const apiKey = process.env.KHWAN_API_KEY;
  const userId = process.env.KHWAN_USER ?? "anonymous";
  if (!apiKey) {
    return {
      error: NextResponse.json(
        { error: "Missing KHWAN_API_KEY (no signed-in session)." },
        { status: 500 }
      ),
    };
  }

  return {
    ...base,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
      "X-Khwan-User": userId,
    },
  };
}

// Forwards a request to the Khwan API and returns its JSON response
// unchanged (status preserved). Used by the sessions proxy routes.
export async function forward(
  apiUrl: string,
  path: string,
  init: RequestInit
): Promise<NextResponse> {
  try {
    const upstream = await fetch(`${apiUrl}${path}`, init);
    const text = await upstream.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { detail: text };
    }

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Khwan API error.", detail: data },
        { status: upstream.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to reach Khwan API.", detail: String(err) },
      { status: 502 }
    );
  }
}
