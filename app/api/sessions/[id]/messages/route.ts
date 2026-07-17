import { NextRequest } from "next/server";
import { khwanEnv, forward } from "@/lib/khwan-server";

// Server-side proxy for a session's transcript.
//   GET /api/sessions/{id}/messages -> GET /sessions/{id}/messages (ordered)

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const env = await khwanEnv();
  if ("error" in env) return env.error;
  const { id } = await params;

  return forward(
    env.apiUrl,
    `/sessions/${encodeURIComponent(id)}/messages`,
    { method: "GET", headers: env.headers }
  );
}
