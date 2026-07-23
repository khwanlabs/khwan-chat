"use client";

import { useEffect, useState } from "react";
import ChatPanel from "@/components/ChatPanel";
import ConfigNotice from "@/components/ConfigNotice";
import type { PublicConfig } from "@/lib/config";

export default function Page() {
  const [status, setStatus] = useState<PublicConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Ask the server (not the browser) what's configured. No secrets cross here.
  useEffect(() => {
    fetch("/api/chat")
      .then((r) => r.json())
      .then((s: PublicConfig) => setStatus(s))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  if (error) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center px-4">
        <p className="text-sm text-red-600 dark:text-red-400">
          Could not reach the server: {error}
        </p>
      </main>
    );
  }

  if (!status) return null;

  if (!status.configured) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center px-4 py-10">
        <ConfigNotice missing={status.missing} />
      </main>
    );
  }

  return (
    <main>
      <ChatPanel status={status} />
    </main>
  );
}
