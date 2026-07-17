import { NextRequest, NextResponse } from "next/server";
import { fieldcoreEnv, forward } from "@/lib/fieldcore-server";

// Server-side proxy for a single session.
//   PATCH  /api/sessions/{id} {title} -> PATCH  /sessions/{id} (rename)
//   DELETE /api/sessions/{id}          -> DELETE /sessions/{id}

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const env = await fieldcoreEnv();
  if ("error" in env) return env.error;
  const { id } = await params;

  let title: unknown;
  try {
    const body = await req.json();
    title = body?.title;
  } catch {
    title = undefined;
  }

  if (typeof title !== "string" || title.trim() === "") {
    return NextResponse.json(
      { error: "Field `title` must be a non-empty string." },
      { status: 400 }
    );
  }

  return forward(env.apiUrl, `/sessions/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: env.headers,
    body: JSON.stringify({ title: title.trim() }),
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const env = await fieldcoreEnv();
  if ("error" in env) return env.error;
  const { id } = await params;

  return forward(env.apiUrl, `/sessions/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: env.headers,
  });
}
