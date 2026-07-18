"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  sendMessage,
  listSessions,
  createSession,
  getMessages,
  renameSession,
  deleteSession,
  listProjects,
  type Session,
  type Project,
  type StoredMessage,
} from "@/lib/khwan";

interface Message {
  role: "user" | "assistant";
  content: string;
  coherence?: number;
  cost?: number;
  promptTokens?: number;
  completionTokens?: number;
  model?: string;
}

function mapStored(m: StoredMessage): Message {
  return {
    role: m.role,
    content: m.content,
    cost: typeof m.cost === "number" ? m.cost : undefined,
    promptTokens: typeof m.prompt_tokens === "number" ? m.prompt_tokens : undefined,
    completionTokens:
      typeof m.completion_tokens === "number" ? m.completion_tokens : undefined,
    model: typeof m.model === "string" ? m.model : undefined,
  };
}

// Compact relative time for the session list (mono meta labels).
function relativeTime(iso?: string): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const s = Math.round(diff / 1000);
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function Page() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false); // sending a message
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile drawer

  // Projects: loaded once on mount. The picker only applies to a NEW chat —
  // the chosen project binds to the session created lazily on first send.
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(""); // "" = None

  // Google login. When signed in, the proxy routes forward this user's token
  // and the API returns THEIR sessions/projects (owner = full, member = read-only).
  const { data: session, status: authStatus } = useSession();
  const userEmail = session?.user?.email ?? null;

  const listEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() =>
      listEndRef.current?.scrollIntoView({ behavior: "smooth" })
    );
  };

  const refreshSessions = useCallback(async (): Promise<Session[]> => {
    const list = await listSessions();
    setSessions(list);
    return list;
  }, []);

  const openSession = useCallback(async (id: string) => {
    setActiveId(id);
    setSidebarOpen(false);
    setError(null);
    setMessagesLoading(true);
    try {
      const stored = await getMessages(id);
      setMessages(stored.map(mapStored));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages.");
      setMessages([]);
    } finally {
      setMessagesLoading(false);
      scrollToBottom();
    }
  }, []);

  // Initial load: fetch sessions and open the most recent.
  useEffect(() => {
    (async () => {
      try {
        const list = await refreshSessions();
        if (list.length > 0) {
          await openSession(list[0].id);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load sessions."
        );
      } finally {
        setSessionsLoading(false);
      }
    })();
  }, [refreshSessions, openSession]);

  // Load the account's projects once for the New-chat picker. A failure here
  // is non-blocking — the picker simply stays hidden and chatting continues.
  useEffect(() => {
    listProjects()
      .then(setProjects)
      .catch(() => setProjects([]));
  }, []);

  // Signing in/out changes identity — and thus which account's sessions and
  // projects the API returns. Reload both when the signed-in user changes
  // (skipping the very first resolve, which the mount effects already covered).
  const prevIdentityRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (authStatus === "loading") return; // wait for the session to resolve
    const identity = userEmail; // null when signed out (demo account)
    if (prevIdentityRef.current === undefined) {
      // First settled value — mount effects already loaded this identity.
      prevIdentityRef.current = identity;
      return;
    }
    if (prevIdentityRef.current === identity) return;
    prevIdentityRef.current = identity;

    // Identity flipped: reset the view and reload for the new account.
    setActiveId(null);
    setMessages([]);
    setSelectedProjectId("");
    setSessionsLoading(true);
    (async () => {
      try {
        const list = await refreshSessions();
        if (list.length > 0) await openSession(list[0].id);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load sessions."
        );
      } finally {
        setSessionsLoading(false);
      }
    })();
    listProjects()
      .then(setProjects)
      .catch(() => setProjects([]));
  }, [userEmail, authStatus, refreshSessions, openSession]);

  function startNewChat() {
    setActiveId(null);
    setMessages([]);
    setInput("");
    setError(null);
    setSelectedProjectId("");
    setSidebarOpen(false);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setError(null);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);
    scrollToBottom();

    try {
      // Lazily create a session on the first message if none is selected.
      let sessionId = activeId;
      if (!sessionId) {
        const created = await createSession(
          selectedProjectId ? { projectId: selectedProjectId } : undefined
        );
        sessionId = created.id;
        setActiveId(created.id);
      }

      const res = await sendMessage(text, sessionId);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.reply ?? "(no reply)",
          coherence: res.coherence,
          cost: typeof res.cost === "number" ? res.cost : undefined,
          promptTokens:
            typeof res.prompt_tokens === "number" ? res.prompt_tokens : undefined,
          completionTokens:
            typeof res.completion_tokens === "number"
              ? res.completion_tokens
              : undefined,
          model: typeof res.model === "string" ? res.model : undefined,
        },
      ]);

      // Refresh the list so the auto-title + updated-at ordering reflect the
      // new turn (keeps the active session pinned to the top).
      await refreshSessions().catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }

  async function commitRename(id: string) {
    const title = renameValue.trim();
    setRenamingId(null);
    if (!title) return;
    // Optimistic.
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title } : s))
    );
    try {
      await renameSession(id, title);
      await refreshSessions().catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rename failed.");
      await refreshSessions().catch(() => {});
    }
  }

  async function confirmDelete(id: string) {
    setConfirmDeleteId(null);
    try {
      await deleteSession(id);
      const list = await refreshSessions();
      if (activeId === id) {
        if (list.length > 0) await openSession(list[0].id);
        else startNewChat();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  const activeSession = sessions.find((s) => s.id === activeId) ?? null;
  const headerTitle =
    activeSession?.title?.trim() ||
    (activeId ? "Conversation" : "New conversation");
  // Project bound to the active session (display-only; no mid-session rebinding).
  const activeProjectName = activeSession?.project_name?.trim() || null;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile drawer backdrop */}
      {sidebarOpen && (
        <button
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-20 bg-ink-950/60 md:hidden"
        />
      )}

      {/* ------------------------- Sessions sidebar ------------------------- */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-72 shrink-0 flex-col border-r border-ink-600 bg-ink-800 transition-transform md:static md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 border-b border-ink-600 px-4 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/khwan-mark.svg" alt="" width={24} height={24} className="shrink-0" />
          <span className="font-mono text-sm font-medium uppercase tracking-wide text-on-dark">
            KHW<span className="text-iris-bright">A</span>N
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 border-b border-ink-600 px-4 py-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-400">
            Conversations
          </span>
          <button
            onClick={startNewChat}
            className="rounded-sm border border-iris-500/60 px-2.5 py-1 text-xs font-medium text-iris-bright transition-colors hover:bg-iris-500 hover:text-white"
          >
            + New chat
          </button>
        </div>

        <p className="border-b border-ink-600 px-4 py-2 text-[11px] leading-snug text-ink-400">
          Your saved conversations — pick up any thread where you left off.
        </p>

        <nav className="flex-1 overflow-y-auto px-2 py-2">
          {sessionsLoading ? (
            <p className="px-2 py-3 text-xs text-ink-400">Loading…</p>
          ) : sessions.length === 0 ? (
            <p className="px-2 py-3 text-xs text-ink-400">
              No conversations yet. Start one with “+ New chat”.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {sessions.map((s) => {
                const active = s.id === activeId;
                return (
                  <li key={s.id}>
                    {renamingId === s.id ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          commitRename(s.id);
                        }}
                        className="px-1 py-1"
                      >
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={() => commitRename(s.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") setRenamingId(null);
                          }}
                          className="w-full rounded-sm border border-iris-500 bg-ink-900 px-2 py-1 text-sm text-on-dark outline-none focus:ring-1 focus:ring-iris-500"
                        />
                      </form>
                    ) : confirmDeleteId === s.id ? (
                      <div className="flex items-center justify-between gap-2 rounded-sm border border-violation/40 bg-ink-900 px-2 py-1.5">
                        <span className="truncate text-xs text-ink-300">
                          Delete this?
                        </span>
                        <span className="flex shrink-0 gap-1">
                          <button
                            onClick={() => confirmDelete(s.id)}
                            className="rounded-xs px-1.5 py-0.5 text-[11px] font-medium text-violation hover:bg-violation hover:text-white"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="rounded-xs px-1.5 py-0.5 text-[11px] text-ink-400 hover:text-on-dark"
                          >
                            Cancel
                          </button>
                        </span>
                      </div>
                    ) : (
                      <div
                        className={`group flex items-center gap-1 rounded-sm px-2 py-1.5 ${
                          active
                            ? "bg-iris-soft-dark"
                            : "hover:bg-ink-700"
                        }`}
                      >
                        <button
                          onClick={() => openSession(s.id)}
                          className="flex min-w-0 flex-1 flex-col items-start text-left"
                        >
                          <span
                            className={`w-full truncate text-sm ${
                              active
                                ? "font-medium text-iris-bright"
                                : "text-on-dark"
                            }`}
                          >
                            {s.title || "Untitled"}
                          </span>
                          <span className="w-full truncate font-mono text-[10px] tabular-nums text-ink-400">
                            {relativeTime(s.updated_at ?? s.created_at)}
                            {typeof s.message_count === "number"
                              ? ` · ${s.message_count} msg`
                              : ""}
                            {s.project_name?.trim() ? (
                              <span className="text-iris-bright">
                                {" · "}
                                {s.project_name.trim()}
                              </span>
                            ) : null}
                          </span>
                        </button>
                        <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            aria-label="Rename"
                            onClick={() => {
                              setRenameValue(s.title || "");
                              setRenamingId(s.id);
                            }}
                            className="rounded-xs px-1 py-0.5 text-[11px] text-ink-400 hover:text-iris-bright"
                          >
                            Rename
                          </button>
                          <button
                            aria-label="Delete"
                            onClick={() => setConfirmDeleteId(s.id)}
                            className="rounded-xs px-1 py-0.5 text-[11px] text-ink-400 hover:text-violation"
                          >
                            Del
                          </button>
                        </span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </nav>

        {/* --------------------------- Account ---------------------------- */}
        <div className="border-t border-ink-600 px-4 py-3">
          {authStatus === "loading" ? (
            <span className="font-mono text-[11px] text-ink-400">Signing in…</span>
          ) : (
            <div className="flex flex-col gap-2">
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-coherence"
                />
                <span className="truncate font-mono text-[11px] text-ink-300" title={userEmail ?? undefined}>
                  {userEmail ?? "signed in"}
                </span>
              </span>
              <button
                onClick={() => signOut()}
                className="self-start rounded-sm border border-ink-600 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-400 transition-colors hover:border-iris-violet hover:text-iris-violet"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ------------------------------ Chat ------------------------------ */}
      <main className="flex min-w-0 flex-1 flex-col">
        <div className="mx-auto flex h-full w-full max-w-2xl flex-col px-4">
          <header className="flex items-center gap-3 border-b border-ink-600 py-4">
            <button
              aria-label="Open conversations"
              onClick={() => setSidebarOpen(true)}
              className="shrink-0 rounded-sm border border-ink-600 px-2 py-1 text-ink-400 md:hidden"
            >
              ☰
            </button>
            <h1 className="min-w-0 shrink truncate text-base font-semibold tracking-tight text-on-dark">
              {headerTitle}
            </h1>
            {activeProjectName && (
              <span
                title={`Project: ${activeProjectName}`}
                className="shrink-0 truncate font-mono text-[11px] tabular-nums text-iris-bright"
              >
                · {activeProjectName}
              </span>
            )}
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto py-6">
            {messagesLoading ? (
              <p className="text-center text-sm text-ink-400">Loading…</p>
            ) : messages.length === 0 && !loading ? (
              <p className="text-center text-sm text-ink-400">
                {activeId
                  ? "This conversation is empty."
                  : "Start a new conversation below."}
              </p>
            ) : null}

            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-md px-4 py-2.5 text-sm ${
                    m.role === "user"
                      ? "bg-iris-500 text-white"
                      : "border border-ink-600 bg-ink-800 text-on-dark"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  {m.role === "assistant" &&
                    (typeof m.coherence === "number" ||
                      typeof m.cost === "number") && (
                      <p className="mt-2 border-t border-ink-600 pt-1.5 font-mono text-[11px] tabular-nums text-ink-400">
                        {typeof m.coherence === "number" && (
                          <>coherence {m.coherence.toFixed(2)}</>
                        )}
                        {typeof m.cost === "number" && (
                          <>
                            {typeof m.coherence === "number" ? " · " : ""}
                            ${m.cost.toFixed(4)}
                            {typeof m.promptTokens === "number" &&
                              typeof m.completionTokens === "number" && (
                                <>
                                  {" "}
                                  ({m.promptTokens}+{m.completionTokens} tok
                                  {m.model ? `, ${m.model}` : ""})
                                </>
                              )}
                          </>
                        )}
                      </p>
                    )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-md border border-ink-600 bg-ink-800 px-4 py-2.5 text-sm text-ink-400">
                  Thinking…
                </div>
              </div>
            )}

            <div ref={listEndRef} />
          </div>

          {error && <p className="pb-2 text-sm text-violation">{error}</p>}

          {/* Project picker — only for a NEW chat. The choice binds to the
              session created lazily on first send; once bound it can't change
              (backend has no rebinding), so we hide this for active sessions. */}
          {!activeId && projects.length > 0 && (
            <div className="flex items-center gap-2 border-t border-ink-600 pt-4">
              <label
                htmlFor="project-picker"
                className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-400"
              >
                Project
              </label>
              <div className="relative">
                <select
                  id="project-picker"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="appearance-none rounded-sm border border-ink-600 bg-ink-800 py-1 pl-2.5 pr-7 font-mono text-xs text-on-dark outline-none focus:border-iris-500 focus:ring-1 focus:ring-iris-500"
                >
                  <option value="">None</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[10px] text-ink-400">
                  ▼
                </span>
              </div>
            </div>
          )}

          <form
            onSubmit={handleSend}
            className="flex gap-2 border-t border-ink-600 py-4"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message…"
              className="flex-1 rounded-md border border-ink-600 bg-ink-800 px-4 py-2.5 text-sm text-on-dark outline-none placeholder:text-ink-400 focus:border-iris-500 focus:ring-1 focus:ring-iris-500"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || input.trim() === ""}
              className="rounded-md bg-iris-500 px-5 py-2.5 text-sm font-medium tracking-[0.01em] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Send
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
