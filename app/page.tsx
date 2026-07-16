"use client";

import { useRef, useState } from "react";
import { sendMessage } from "@/lib/fieldcore";

interface Message {
  role: "user" | "assistant";
  content: string;
  coherence?: number;
}

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    // Defer so the newly added node is in the DOM first.
    requestAnimationFrame(() =>
      listEndRef.current?.scrollIntoView({ behavior: "smooth" })
    );
  };

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
      const res = await sendMessage(text);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.reply ?? "(no reply)",
          coherence: res.coherence,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }

  return (
    <main className="mx-auto flex h-screen max-w-2xl flex-col px-4">
      <header className="border-b border-neutral-200 py-4">
        <h1 className="text-lg font-semibold">FieldCore chat</h1>
        <p className="text-sm text-neutral-500">
          Chat with an agent powered by FieldCore.
        </p>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto py-6">
        {messages.length === 0 && !loading && (
          <p className="text-center text-sm text-neutral-400">
            Start the conversation below.
          </p>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${
              m.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                m.role === "user"
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-900"
              }`}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.role === "assistant" && typeof m.coherence === "number" && (
                <p className="mt-1 text-xs text-neutral-400">
                  coherence {m.coherence.toFixed(2)}
                </p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-neutral-100 px-4 py-2 text-sm text-neutral-400">
              Thinking…
            </div>
          </div>
        )}

        <div ref={listEndRef} />
      </div>

      {error && (
        <p className="pb-2 text-sm text-red-600">{error}</p>
      )}

      <form
        onSubmit={handleSend}
        className="flex gap-2 border-t border-neutral-200 py-4"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 rounded-full border border-neutral-300 px-4 py-2 text-sm outline-none focus:border-neutral-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || input.trim() === ""}
          className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </main>
  );
}
