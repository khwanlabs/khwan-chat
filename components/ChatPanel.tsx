"use client";

import { useEffect, useRef, useState } from "react";
import type { PublicConfig } from "@/lib/config";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  coherence?: number | null;
  /** Number of memory sources Khwan drew on for this turn. */
  sources?: number;
  /** True when the coherence gate blocked the turn (this is the reason). */
  blocked?: boolean;
}

/** One newline-delimited JSON event from POST /api/chat. */
interface StreamEvent {
  step?: "prepare" | "model" | "record";
  status?: "start" | "done" | "blocked";
  type?: "answer" | "blocked" | "error";
  coherence?: number | null;
  sources?: number;
  provider?: string;
  model?: string;
  reason?: string;
  error?: string;
  answer?: string;
}

type StepStatus = "pending" | "active" | "done";

/** Live state of the three-step loop, shown while a turn is in flight. */
interface LoopSteps {
  prepare: StepStatus;
  model: StepStatus;
  record: StepStatus;
  coherence?: number | null;
  sources?: number;
  provider?: string;
  modelName?: string;
}

export default function ChatPanel({ status }: { status: PublicConfig }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [steps, setSteps] = useState<LoopSteps | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // The end-user we're chatting as. Each distinct value is an isolated sub-brain
  // (Khwan remembers each user separately); empty ⇒ one shared brain. Seeded
  // from KHWAN_USER in .env. `userDraft` is the input; `user` is what we send —
  // committing a new value clears the chat so the brain switch is obvious.
  const [user, setUser] = useState(status.userId ?? "");
  const [userDraft, setUserDraft] = useState(status.userId ?? "");

  // Distinct users we've actually talked to (a turn succeeded) — each is a real
  // sub-brain. Shown as quick-switch chips so you can see who's been used (and,
  // on the free plan, watch the 3 slots fill up). Persisted so a reload keeps them.
  const USED_KEY = "khwan-chat:used-users";
  const [usedUsers, setUsedUsers] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(USED_KEY);
      if (raw) setUsedUsers(JSON.parse(raw) as string[]);
    } catch {
      /* ignore */
    }
  }, []);

  function rememberUser(name: string) {
    if (!name) return;
    setUsedUsers((prev) => {
      if (prev.includes(name)) return prev;
      const next = [...prev, name];
      try {
        window.localStorage.setItem(USED_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  // Commit the draft as the active user. A change clears the chat so the brain
  // switch is obvious.
  function switchTo(next: string) {
    const name = next.trim();
    setUserDraft(name);
    if (name === user) return;
    setUser(name);
    setMessages([]);
    setError(null);
  }

  const commitUser = () => switchTo(userDraft);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, thinking]);

  async function send() {
    const text = input.trim();
    if (!text || thinking) return;

    setInput("");
    setError(null);
    setMessages((m) => [...m, { role: "user", text }]);
    setThinking(true);
    const live: LoopSteps = {
      prepare: "active",
      model: "pending",
      record: "pending",
    };
    setSteps({ ...live });

    try {
      // The whole loop runs on the server and streams each step back to us.
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, userId: user }),
      });

      // Errors before the stream opens (e.g. 503/400) come back as plain JSON.
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? `Request failed (HTTP ${res.status}).`);
      }

      const apply = (ev: StreamEvent) => {
        if (ev.step === "prepare") {
          if (ev.status === "done") {
            live.prepare = "done";
            live.coherence = ev.coherence;
            live.sources = ev.sources;
            live.model = "active";
          } else if (ev.status === "blocked") {
            live.prepare = "done";
          }
        } else if (ev.step === "model") {
          if (ev.status === "start") {
            live.model = "active";
            live.provider = ev.provider;
            live.modelName = ev.model;
          } else if (ev.status === "done") {
            live.model = "done";
            live.record = "active";
          }
        } else if (ev.step === "record") {
          live.record = ev.status === "done" ? "done" : "active";
        } else if (ev.type === "blocked") {
          setMessages((m) => [
            ...m,
            { role: "assistant", text: ev.reason ?? "Blocked.", blocked: true },
          ]);
        } else if (ev.type === "error") {
          setError(ev.error ?? "Request failed.");
        } else if (ev.type === "answer") {
          setMessages((m) => [
            ...m,
            {
              role: "assistant",
              text: ev.answer ?? "",
              coherence: ev.coherence,
              sources: ev.sources,
            },
          ]);
          // A turn landed for this user ⇒ its sub-brain now exists. Track it.
          rememberUser(user);
        }
        setSteps({ ...live });
      };

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (line) apply(JSON.parse(line) as StreamEvent);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setThinking(false);
      setSteps(null);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  const subtitle = [
    status.provider && status.model
      ? `${status.provider} · ${status.model}`
      : null,
    status.core ? `core: ${status.core}` : "default core",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex h-[100dvh] flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold">Khwan Chat Sample</h1>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            User
          </span>
          <input
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={userDraft}
            onChange={(e) => setUserDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitUser();
              }
            }}
            placeholder="shared brain"
            title="Each user gets an isolated memory. Blank = one shared brain."
            className="w-28 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:ring-slate-800"
          />
          <button
            type="button"
            onClick={commitUser}
            disabled={userDraft.trim() === user}
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Switch
          </button>
        </div>
      </header>

      {/* Quick-switch across the brains you've used — plus the shared brain. */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 px-4 py-2 dark:border-slate-800">
        <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
          Brains:
        </span>
        <UserChip label="shared" active={user === ""} onClick={() => switchTo("")} />
        {usedUsers.map((u) => (
          <UserChip
            key={u}
            label={u}
            active={user === u}
            onClick={() => switchTo(u)}
          />
        ))}
        {user !== "" && !usedUsers.includes(user) && (
          <UserChip label={user} active onClick={() => {}} />
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          {messages.length === 0 && !thinking && (
            <div className="mt-16 text-center">
              <p className="text-sm text-slate-400 dark:text-slate-500">
                Say hello to start the conversation.
              </p>
              <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                {user ? (
                  <>
                    Chatting as <span className="font-medium">{user}</span> — an
                    isolated brain. Switch the User to prove Khwan keeps each one
                    separate.
                  </>
                ) : (
                  <>Chatting against one shared brain. Set a User to give them a private memory.</>
                )}
              </p>
            </div>
          )}

          {messages.map((m, i) => (
            <Bubble key={i} message={m} />
          ))}

          {steps && (
            <div className="flex justify-start">
              <div className="w-full max-w-md rounded-2xl rounded-bl-sm border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                <p className="mb-1 px-1 font-mono text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  prepare → your model → record
                </p>
                <StepRow
                  n={1}
                  status={steps.prepare}
                  title="prepare"
                  sub="Khwan builds context — memory + coherence gate. No LLM call."
                  detail={
                    steps.prepare === "done"
                      ? `${steps.sources ?? 0} source${steps.sources === 1 ? "" : "s"} · coherence ${steps.coherence?.toFixed(2) ?? "—"}`
                      : undefined
                  }
                />
                <StepRow
                  n={2}
                  status={steps.model}
                  title="your model"
                  sub={
                    steps.provider
                      ? `${steps.provider} · ${steps.modelName} — your provider, your key`
                      : "your provider, your key. Khwan never sees it."
                  }
                />
                <StepRow
                  n={3}
                  status={steps.record}
                  title="record"
                  sub="Khwan persists + learns → the next prepare is sharper."
                />
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-800">
        <div className="mx-auto flex max-w-2xl items-end gap-2">
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a message…"
            className="max-h-40 flex-1 resize-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:ring-slate-800"
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={thinking || !input.trim()}
            className="shrink-0 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function UserChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "shrink-0 rounded-full bg-slate-900 px-2.5 py-1 text-xs font-medium text-white dark:bg-white dark:text-slate-900"
          : "shrink-0 rounded-full border border-slate-300 px-2.5 py-1 text-xs text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      }
    >
      {label}
    </button>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  // A blocked turn: the coherence gate rejected it before any model was called.
  if (message.blocked) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          <span className="mb-0.5 block text-xs font-semibold uppercase tracking-wide opacity-70">
            Blocked by coherence gate
          </span>
          {message.text}
        </div>
      </div>
    );
  }

  const meta: string[] = [];
  if (message.coherence !== null && message.coherence !== undefined) {
    meta.push(`coherence ${message.coherence.toFixed(2)}`);
  }
  if (message.sources !== undefined) {
    meta.push(`${message.sources} source${message.sources === 1 ? "" : "s"}`);
  }

  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div className="max-w-[85%]">
        <div
          className={
            isUser
              ? "whitespace-pre-wrap rounded-2xl rounded-br-sm bg-slate-900 px-4 py-2.5 text-sm text-white dark:bg-white dark:text-slate-900"
              : "whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-2.5 text-sm text-slate-900 dark:bg-slate-800 dark:text-slate-100"
          }
        >
          {message.text || "(empty response)"}
        </div>
        {!isUser && meta.length > 0 && (
          <p className="mt-1 pl-1 text-xs text-slate-400 dark:text-slate-500">
            {meta.join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}

function StepRow({
  n,
  status,
  title,
  sub,
  detail,
}: {
  n: number;
  status: StepStatus;
  title: string;
  sub: string;
  detail?: string;
}) {
  const dim = status === "pending";
  return (
    <div className="flex items-start gap-2.5 px-1 py-1.5">
      <StepIcon status={status} n={n} />
      <div className="min-w-0 flex-1">
        <p
          className={
            dim
              ? "text-xs font-medium text-slate-400 dark:text-slate-600"
              : "text-xs font-medium text-slate-800 dark:text-slate-100"
          }
        >
          {title}
        </p>
        <p className="text-[11px] leading-snug text-slate-400 dark:text-slate-500">
          {detail ?? sub}
        </p>
      </div>
    </div>
  );
}

function StepIcon({ status, n }: { status: StepStatus; n: number }) {
  if (status === "done") {
    return (
      <span className="mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
        ✓
      </span>
    );
  }
  if (status === "active") {
    return (
      <span className="mt-0.5 flex h-4 w-4 flex-none animate-pulse items-center justify-center rounded-full bg-slate-800 text-[10px] font-semibold text-white dark:bg-white dark:text-slate-900">
        {n}
      </span>
    );
  }
  return (
    <span className="mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded-full border border-slate-300 text-[10px] font-semibold text-slate-400 dark:border-slate-700 dark:text-slate-600">
      {n}
    </span>
  );
}
