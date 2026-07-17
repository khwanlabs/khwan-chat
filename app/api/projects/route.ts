import { fieldcoreEnv, forward } from "@/lib/fieldcore-server";

// Server-side proxy for the projects collection. Keeps FIELDCORE_API_KEY out
// of the browser (mirrors app/api/sessions/route.ts).
//   GET /api/projects -> GET /projects (list the account's projects)

export const runtime = "nodejs";
// The upstream project list changes as projects are created/deleted; never
// serve a stale cached copy from the route handler.
export const dynamic = "force-dynamic";

export async function GET() {
  const env = await fieldcoreEnv();
  if ("error" in env) return env.error;
  return forward(env.apiUrl, "/projects", {
    method: "GET",
    headers: env.headers,
    // Next caches fetch GETs by default; the project list must stay live.
    cache: "no-store",
  });
}
