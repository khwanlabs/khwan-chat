// Tiny client wrapper the UI uses to talk to our own API routes.
// The routes (app/api/*) proxy to the FieldCore API so the API key stays
// server-side — the browser never sees a secret.
//
// The abstraction is intentionally thin: today it hits the simple
// `POST /chat` path plus the sessions endpoints. If we later switch to the
// BYOM prepare/record flow, only this file and the route handlers need to
// change — the UI keeps calling these functions.

export interface ChatResponse {
  // The assistant's reply text.
  reply: string;
  // Optional cognition metadata surfaced by FieldCore (e.g. coherence).
  coherence?: number;
  // The thread this reply was persisted to.
  session_id?: string;
  // Anything else the API returns, kept for forward-compat.
  [key: string]: unknown;
}

export interface Session {
  id: string;
  title: string;
  created_at: string;
  updated_at?: string;
  message_count?: number;
  // Present when the session is bound to a project (multi-user Phase 3).
  project_id?: string | null;
  project_name?: string | null;
}

export interface Project {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
  session_count?: number;
}

export interface StoredMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  cost: number | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  model: string | null;
  created_at: string;
}

async function unwrap<T>(res: Response, label: string): Promise<T> {
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `${label} failed (${res.status})${detail ? `: ${detail}` : ""}`
    );
  }
  return (await res.json()) as T;
}

// --- Chat -----------------------------------------------------------------

export async function sendMessage(
  input: string,
  sessionId?: string
): Promise<ChatResponse> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      sessionId ? { input, session_id: sessionId } : { input }
    ),
  });
  return unwrap<ChatResponse>(res, "Chat request");
}

// --- Sessions -------------------------------------------------------------

export async function listSessions(): Promise<Session[]> {
  const res = await fetch("/api/sessions", { cache: "no-store" });
  return unwrap<Session[]>(res, "List sessions");
}

// --- Projects -------------------------------------------------------------

export async function listProjects(): Promise<Project[]> {
  const res = await fetch("/api/projects", { cache: "no-store" });
  return unwrap<Project[]>(res, "List projects");
}

export async function createSession(
  opts?: { title?: string; projectId?: string }
): Promise<Session> {
  const payload: { title?: string; project_id?: string } = {};
  if (opts?.title && opts.title.trim() !== "") payload.title = opts.title.trim();
  if (opts?.projectId && opts.projectId.trim() !== "") {
    payload.project_id = opts.projectId.trim();
  }
  const res = await fetch("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return unwrap<Session>(res, "Create session");
}

export async function getMessages(
  sessionId: string
): Promise<StoredMessage[]> {
  const res = await fetch(
    `/api/sessions/${encodeURIComponent(sessionId)}/messages`,
    { cache: "no-store" }
  );
  return unwrap<StoredMessage[]>(res, "Load messages");
}

export async function renameSession(
  sessionId: string,
  title: string
): Promise<{ id: string; title: string }> {
  const res = await fetch(
    `/api/sessions/${encodeURIComponent(sessionId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    }
  );
  return unwrap<{ id: string; title: string }>(res, "Rename session");
}

export async function deleteSession(
  sessionId: string
): Promise<{ removed: string }> {
  const res = await fetch(
    `/api/sessions/${encodeURIComponent(sessionId)}`,
    { method: "DELETE" }
  );
  return unwrap<{ removed: string }>(res, "Delete session");
}
