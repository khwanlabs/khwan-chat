"use client";

import { useEffect, useState } from "react";
import SettingsPanel from "@/components/SettingsPanel";
import ChatPanel from "@/components/ChatPanel";
import {
  emptySettings,
  isConfigured,
  loadSettings,
  saveSettings,
  type Settings,
} from "@/lib/settings";

export default function Page() {
  const [settings, setSettings] = useState<Settings>(emptySettings());
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(false);

  // Hydrate from localStorage after mount (avoids SSR/client mismatch).
  useEffect(() => {
    const stored = loadSettings();
    setSettings(stored);
    setEditing(!isConfigured(stored));
    setReady(true);
  }, []);

  if (!ready) return null;

  if (editing) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center px-4 py-10">
        <SettingsPanel
          settings={settings}
          onChange={setSettings}
          onSave={() => {
            saveSettings(settings);
            setEditing(false);
          }}
        />
      </main>
    );
  }

  return (
    <main>
      <ChatPanel settings={settings} onEditSettings={() => setEditing(true)} />
    </main>
  );
}
