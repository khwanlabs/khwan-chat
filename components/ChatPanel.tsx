"use client";

import { useEffect, useRef, useState } from "react";
import { makeClient } from "@/lib/client";
import { generate } from "@/lib/openai";
import type { Settings } from "@/lib/settings";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  coherence?: number | null;
  /** Number of memory sources Khwan drew on for this turn. */
  sources?: number;
  /** True when the coherence gate blocked the turn (this is the reason). */
  blocked?: boolean;
}

export default function ChatPanel({
  settings,
  onEditSettings,
}: {
  settings: Settings;
  onEditSettings: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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

    try {
      const client = makeClient(settings);

      // 1. Khwan builds the context (memory + constitution + coherence). No LLM.
      const turn = await client.prepare(text);

      // 2. Coherence gate: if the turn isn't allowed, surface the reason + stop.
      if (!turn.allowed) {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            text:
              turn.reason ??
              "Khwan's coherence gate blocked this turn (no reason given).",
            blocked: true,
          },
        ]);
        return;
      }

      // 3. Call your own model directly with the messages Khwan prepared.
      const answer = await generate(
        {
          apiKey: settings.openaiKey,
          model: settings.openaiModel,
          baseUrl: settings.openaiBaseUrl,
        },
        turn.messages,
      );

      // 4. Hand the answer back so Khwan can persist + learn.
      await client.record(turn, answer);

      // 5. Render the answer, with the memory made visible (coherence + sources).
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: answer,
          coherence: turn.coherence,
          sources: turn.sources.length,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setThinking(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <div className="flex h-[100dvh] flex-col">
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold">Khwan Chat Sample</h1>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {settings.userId}
            {settings.core ? ` · core: ${settings.core}` : " · default core"}
          </p>
        </div>
        <button
          type="button"
          onClick={onEditSettings}
          className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Settings
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          {messages.length === 0 && !thinking && (
            <p className="mt-16 text-center text-sm text-slate-400 dark:text-slate-500">
              Say hello to start the conversation.
            </p>
          )}

          {messages.map((m, i) => (
            <Bubble key={i} message={m} />
          ))}

          {thinking && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-2.5 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <span className="inline-flex gap-1">
                  <Dot /> <Dot delay="150ms" /> <Dot delay="300ms" />
                </span>
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

function Dot({ delay = "0ms" }: { delay?: string }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-current"
      style={{ animationDelay: delay }}
    />
  );
}
