import { NextRequest } from "next/server";
import { fieldcoreEnv, forward } from "@/lib/fieldcore-server";

// Server-side proxy for the sessions collection. Keeps FIELDCORE_API_KEY out
// of the browser (mirrors app/api/chat/route.ts).
//   GET  /api/sessions        -> GET  /sessions        (list, newest-updated first)
//   POST /api/sessions {title?, project_id?} -> POST /sessions {title?, project_id?} (create)

export const runtime = "nodejs";

export async function GET() {
  const env = await fieldcoreEnv();
  if ("error" in env) return env.error;
  return forward(env.apiUrl, "/sessions", {
    method: "GET",
    headers: env.headers,
  });
}

export async function POST(req: NextRequest) {
  const env = await fieldcoreEnv();
  if ("error" in env) return env.error;

  let title: unknown;
  let projectId: unknown;
  try {
    const body = await req.json().catch(() => ({}));
    title = body?.title;
    projectId = body?.project_id;
  } catch {
    title = undefined;
    projectId = undefined;
  }

  const payload: { title?: string; project_id?: string } = {};
  if (typeof title === "string" && title.trim() !== "") {
    payload.title = title.trim();
  }
  if (typeof projectId === "string" && projectId.trim() !== "") {
    payload.project_id = projectId.trim();
  }

  return forward(env.apiUrl, "/sessions", {
    method: "POST",
    headers: env.headers,
    body: JSON.stringify(payload),
  });
}
