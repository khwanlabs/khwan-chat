"use client";

import { useSession, signIn } from "next-auth/react";

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen items-center justify-center bg-ink-900 px-4 text-on-dark">
      {children}
    </div>
  );
}

// Khwan essence mark — a luminous core inside concentric breath rings with a
// radial aura, blooming indigo→violet→orchid→rose. Matches public/khwan-mark.svg
// and the dashboard gate. Gradient ids are unique to this component.
function EssenceMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      role="img"
      aria-label="Khwan"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="kwChatGateAura" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#f0d0ff" stopOpacity="0.95" />
          <stop offset="0.35" stopColor="#c77dff" stopOpacity="0.45" />
          <stop offset="0.7" stopColor="#7c7bf5" stopOpacity="0.18" />
          <stop offset="1" stopColor="#5b5bf0" stopOpacity="0" />
        </radialGradient>
        <linearGradient
          id="kwChatGateRing"
          x1="12"
          y1="12"
          x2="52"
          y2="52"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#7c7bf5" />
          <stop offset="0.55" stopColor="#c77dff" />
          <stop offset="1" stopColor="#e26fa8" />
        </linearGradient>
      </defs>
      {/* essence aura */}
      <circle cx="32" cy="32" r="30" fill="url(#kwChatGateAura)" />
      {/* concentric breath / iris aperture */}
      <circle cx="32" cy="32" r="20" fill="none" stroke="#7c7bf5" strokeWidth="1.1" opacity="0.4" />
      <circle cx="32" cy="32" r="15.5" fill="none" stroke="#9a6bf5" strokeWidth="1.3" opacity="0.6" />
      <circle cx="32" cy="32" r="11" fill="none" stroke="url(#kwChatGateRing)" strokeWidth="1.6" opacity="0.85" />
      <circle cx="32" cy="32" r="6.5" fill="none" stroke="#e26fa8" strokeWidth="1.8" />
      {/* luminous essence core */}
      <circle cx="32" cy="32" r="3" fill="#f0d0ff" />
    </svg>
  );
}

// Hard login gate wrapping the chat UI. Unauthenticated users must sign in with
// Google before reaching the app — production grade, no demo fallback.
export default function LoginGate({ children }: { children: React.ReactNode }) {
  const { status } = useSession();

  if (status === "loading") {
    return (
      <Centered>
        <span className="animate-pulse font-mono text-sm text-ink-400">Loading…</span>
      </Centered>
    );
  }

  if (status === "authenticated") {
    return <>{children}</>;
  }

  // Unauthenticated → the hard gate.
  return (
    <Centered>
      <div className="w-full max-w-sm rounded-lg border border-ink-600 bg-ink-800 p-8">
        <div className="mb-6 text-center">
          <EssenceMark className="mx-auto mb-3 h-11 w-11" />
          <div className="font-mono text-lg font-medium uppercase tracking-wide text-on-dark">
            KHW<span className="text-iris-bright">A</span>N
          </div>
          <div className="mt-1 text-xs text-ink-400">Sign in to use Khwan chat</div>
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
      </div>
    </Centered>
  );
}
