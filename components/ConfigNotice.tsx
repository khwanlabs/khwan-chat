"use client";

// Shown when the server reports that `.env` is missing required variables.
// Lists exactly what's missing so the dev can fix their `.env` and reload.

export default function ConfigNotice({ missing }: { missing: string[] }) {
  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h1 className="text-lg font-semibold">Configure your .env</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        This sample reads all its configuration from environment variables. Copy{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5 text-xs dark:bg-slate-800">
          .env.example
        </code>{" "}
        to{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5 text-xs dark:bg-slate-800">
          .env.local
        </code>
        , fill it in, and restart the dev server. See the README for details.
      </p>

      {missing.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/60 dark:bg-amber-950/40">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
            Missing or invalid
          </p>
          <ul className="mt-2 space-y-1">
            {missing.map((m) => (
              <li
                key={m}
                className="font-mono text-xs text-amber-900 dark:text-amber-100"
              >
                {m}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
        The keys live only on the server — they are never sent to the browser.
      </p>
    </div>
  );
}
