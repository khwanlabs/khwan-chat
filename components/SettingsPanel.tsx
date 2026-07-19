"use client";

import { useState } from "react";
import { Khwan } from "@khwan/client";
import {
  DEFAULT_BASE_URL,
  isConfigured,
  type Settings,
} from "@/lib/settings";

interface Core {
  slug: string;
  name: string;
  is_default: boolean;
}

export default function SettingsPanel({
  settings,
  onChange,
  onSave,
}: {
  settings: Settings;
  onChange: (next: Settings) => void;
  onSave: () => void;
}) {
  const [cores, setCores] = useState<Core[] | null>(null);
  const [loadingCores, setLoadingCores] = useState(false);
  const [coresError, setCoresError] = useState<string | null>(null);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    onChange({ ...settings, [key]: value });

  async function loadCores() {
    setLoadingCores(true);
    setCoresError(null);
    try {
      const client = new Khwan({
        apiKey: settings.apiKey.trim(),
        userId: settings.userId.trim() || "sample",
        baseUrl: settings.baseUrl.trim() || undefined,
      });
      const list = await client.cores();
      setCores(list);
    } catch (err) {
      setCoresError(err instanceof Error ? err.message : String(err));
      setCores(null);
    } finally {
      setLoadingCores(false);
    }
  }

  const canLoadCores = Boolean(
    settings.apiKey.trim() && settings.baseUrl.trim(),
  );

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h1 className="text-lg font-semibold">Connect to Khwan</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Your details are stored only in this browser (localStorage) and sent
        straight to the API. Nothing is uploaded to a server of ours.
      </p>

      <div className="mt-5 space-y-4">
        <Field label="API key" hint="Starts with kwk_">
          <input
            type="password"
            autoComplete="off"
            placeholder="kwk_..."
            value={settings.apiKey}
            onChange={(e) => set("apiKey", e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Base URL">
          <input
            type="text"
            inputMode="url"
            placeholder={DEFAULT_BASE_URL}
            value={settings.baseUrl}
            onChange={(e) => set("baseUrl", e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="User ID" hint="Any string — identifies the end user">
          <input
            type="text"
            autoComplete="off"
            placeholder="alice"
            value={settings.userId}
            onChange={(e) => set("userId", e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field
          label="Core"
          hint="Optional — leave blank for the default core"
        >
          <div className="flex gap-2">
            <input
              type="text"
              autoComplete="off"
              placeholder="default"
              value={settings.core}
              onChange={(e) => set("core", e.target.value)}
              className={inputClass}
            />
            <button
              type="button"
              onClick={loadCores}
              disabled={!canLoadCores || loadingCores}
              className="shrink-0 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {loadingCores ? "Loading…" : "Load"}
            </button>
          </div>

          {cores && cores.length > 0 && (
            <select
              value={settings.core}
              onChange={(e) => set("core", e.target.value)}
              className={`${inputClass} mt-2`}
            >
              <option value="">default core</option>
              {cores
                .filter((c) => !c.is_default)
                .map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name} ({c.slug})
                  </option>
                ))}
            </select>
          )}
          {coresError && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              Could not load cores: {coresError}
            </p>
          )}
        </Field>
      </div>

      <button
        type="button"
        onClick={onSave}
        disabled={!isConfigured(settings)}
        className="mt-6 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
      >
        Start chatting
      </button>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:ring-slate-800";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
        {hint && (
          <span className="ml-2 font-normal text-slate-400 dark:text-slate-500">
            {hint}
          </span>
        )}
      </span>
      {children}
    </label>
  );
}
