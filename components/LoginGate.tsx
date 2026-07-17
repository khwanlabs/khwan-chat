"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";

// Client flag key. Persisted so a reload during local dev keeps the bypass —
// the primary path is still Google; this is only a convenience until the OAuth
// redirect URI is registered. Cleared naturally when the tab closes.
const DEMO_BYPASS_KEY = "fc-demo-bypass";

export function readDemoBypass(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(DEMO_BYPASS_KEY) === "1";
  } catch {
    return false;
  }
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen items-center justify-center bg-ink-900 px-4 text-on-dark">
      {children}
    </div>
  );
}

// FieldCore mark — brightened rings for the dark ground (matches the dashboard
// gate + the sidebar ◈ mark).
function FieldMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      role="img"
      aria-label="FieldCore"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id="fcChatGateField"
          x1="20"
          y1="18"
          x2="44"
          y2="46"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#5B5BF0" />
          <stop offset="1" stopColor="#9A6BF5" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="32" rx="27" ry="10.5" transform="rotate(-24 32 32)" stroke="#7C7BF5" strokeWidth="2.2" opacity="0.9" />
      <ellipse cx="32" cy="32" rx="27" ry="10.5" transform="rotate(24 32 32)" stroke="#7C7BF5" strokeWidth="2.2" opacity="0.4" />
      <path d="M32 19 L45 32 L32 45 L19 32 Z" fill="url(#fcChatGateField)" />
      <circle cx="32" cy="19" r="2.4" fill="#9A6BF5" />
    </svg>
  );
}

// Hard login gate wrapping the chat UI. Unauthenticated users must sign in with
// Google before reaching the app — there is no silent demo fallback in the UI.
// A small, muted dev escape ("Continue as demo (dev)") sets a client flag that
// lets the app render via the proxy's env demo credentials while the OAuth
// redirect URI isn't registered yet.
export default function LoginGate({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  // null = not yet read from sessionStorage (avoid a hydration flash / mismatch).
  const [demoBypass, setDemoBypass] = useState<boolean | null>(null);

  useEffect(() => {
    setDemoBypass(readDemoBypass());
  }, []);

  function enterDemo() {
    try {
      window.sessionStorage.setItem(DEMO_BYPASS_KEY, "1");
    } catch {
      // sessionStorage may be unavailable (private mode) — still allow entry
      // for this render.
    }
    setDemoBypass(true);
  }

  // Resolving the session or the client flag.
  if (status === "loading" || demoBypass === null) {
    return (
      <Centered>
        <span className="animate-pulse font-mono text-sm text-ink-400">Loading…</span>
      </Centered>
    );
  }

  // A real session always wins — the gate never shows when signed in.
  if (status === "authenticated" || demoBypass) {
    return <>{children}</>;
  }

  // Unauthenticated and no demo bypass → the hard gate.
  return (
    <Centered>
      <div className="w-full max-w-sm rounded-lg border border-ink-600 bg-ink-800 p-8">
        <div className="mb-6 text-center">
          <FieldMark className="mx-auto mb-3 h-11 w-11" />
          <div className="text-lg font-semibold tracking-tight text-on-dark">
            Field<span className="text-field-bright">Core</span>
          </div>
          <div className="mt-1 text-xs text-ink-400">Sign in to use FieldCore chat</div>
        </div>

        <button
          onClick={() => signIn("google")}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-white px-3 py-2.5 text-sm font-medium text-ink-900 transition-colors hover:bg-ink-300"
        >
          {/* Google "G" mark */}
          <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden className="shrink-0">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.34A9 9 0 0 0 9 18Z" />
            <path fill="#FBBC05" d="M3.98 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.02-2.34Z" />
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.02 2.34C4.68 5.16 6.66 3.58 9 3.58Z" />
          </svg>
          Sign in with Google
        </button>

        {/* Dev escape hatch — subtle, muted. Lets local dev proceed via the
            proxy's env demo credentials before the OAuth redirect URI exists. */}
        <div className="mt-6 text-center">
          <button
            onClick={enterDemo}
            className="font-mono text-[11px] text-ink-400 underline decoration-ink-600 underline-offset-4 transition-colors hover:text-ink-300"
          >
            Continue as demo (dev)
          </button>
        </div>
      </div>
    </Centered>
  );
}
