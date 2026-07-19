# Khwan Chat Sample

A minimal chat built on the Khwan TypeScript client — [`@khwan/client`](https://www.npmjs.com/package/@khwan/client).

Khwan is a pure **AI-memory layer** — it never runs a model. This sample shows
how to wire Khwan's memory around **your own model**: Khwan prepares the
context, you call your model to generate the reply, then you hand the reply back
so Khwan can persist and learn from it.

## The loop

```
prepare  →  your model  →  record
```

1. `const turn = await client.prepare(input)` — Khwan builds the context
   (memory + constitution + coherence). **No LLM call happens here.**
2. If `turn.allowed === false`, the coherence gate blocked the turn — show
   `turn.reason` and stop.
3. Call your own model with `turn.messages`. This sample posts them directly
   from the browser to an OpenAI-compatible `/chat/completions` endpoint with
   **your** OpenAI key, and takes `choices[0].message.content` as the answer.
4. `await client.record(turn, answer)` — Khwan persists the exchange and learns.
5. Render the answer. The sample also surfaces `turn.coherence` and how many
   `turn.sources` were used, so the "memory" is visible.

Your model key is used **only** for the browser → OpenAI call. It is never sent
to Khwan; Khwan never sees your model or its key.

## What it demonstrates

- Creating a client — `new Khwan({ apiKey, userId, baseUrl, core })`
- The full memory loop — `client.prepare(input)` → your model → `client.record(turn, answer)`
- Bringing your own model — a direct browser call to any OpenAI-compatible
  endpoint, with your own key, model, and base URL
- Selecting an isolated **core** with the `core` option — either by typing a
  slug or by loading the account's cores with `client.cores()` into a dropdown
- Making memory visible — showing the `coherence` score and the number of
  `sources` Khwan drew on for each turn

Everything runs client-side. There is no server, no login, and no database —
just React state, `localStorage`, and the client library.

## Prerequisites

- Node.js 18+
- A Khwan API key (see [Getting an API key](#getting-an-api-key))
- An OpenAI (or OpenAI-compatible) API key for your own model

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000, then open the settings panel and enter:

**Khwan · memory layer**

| Field    | What to enter                                          |
| -------- | ------------------------------------------------------ |
| API key  | Your Khwan API key (starts with `kwk_`)                |
| Base URL | The Khwan API base URL (defaults to `https://api.khwan.ai`) |
| User ID  | Any string that identifies the end user                |
| Core     | Optional slug of an isolated core; blank = default     |

**Your model · generation**

| Field           | What to enter                                            |
| --------------- | -------------------------------------------------------- |
| OpenAI API key  | Your model key (starts with `sk-`)                       |
| Model           | Model name (defaults to `gpt-4o-mini`)                   |
| OpenAI base URL | OpenAI-compatible endpoint (defaults to `https://api.openai.com/v1`) |

These values are saved in your browser's `localStorage`. The Khwan values are
sent to the Khwan API; the model key is sent only to the OpenAI endpoint.
Nothing is written to a file or uploaded to a server of ours.

## Getting an API key

Create an account and generate an API key from the Khwan dashboard, then paste
the `kwk_...` key into the settings panel. Bring your own OpenAI-compatible key
for the model.

## How it uses the library

```ts
import { Khwan } from "@khwan/client";

const client = new Khwan({
  apiKey: "kwk_...",
  userId: "alice",
  baseUrl: "https://api.khwan.ai",
  core: "client1", // optional — omit for the account's default core
});

// 1. Khwan builds the context — no model runs here.
const turn = await client.prepare("hello");

// 2. Coherence gate.
if (!turn.allowed) throw new Error(turn.reason ?? "blocked");

// 3. Call YOUR model with the prepared messages.
const res = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${OPENAI_KEY}`,
  },
  body: JSON.stringify({ model: "gpt-4o-mini", messages: turn.messages }),
});
const answer = (await res.json()).choices[0].message.content;

// 4. Hand the answer back so Khwan persists + learns.
await client.record(turn, answer);

// List the isolated cores available on the account:
const cores = await client.cores();
```

See [`lib/client.ts`](lib/client.ts), [`lib/openai.ts`](lib/openai.ts),
[`components/SettingsPanel.tsx`](components/SettingsPanel.tsx), and
[`components/ChatPanel.tsx`](components/ChatPanel.tsx) for the full wiring.

## The client dependency

For local development this repo points at the sibling package on disk:

```json
"@khwan/client": "file:../khwan-client-ts"
```

When this sample is published on its own, switch that to the npm package:

```bash
npm install @khwan/client
```

## Stack

Next.js (App Router) + React + Tailwind CSS + TypeScript.
