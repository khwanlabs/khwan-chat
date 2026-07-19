# Khwan Chat Sample

A minimal chat built on the Khwan TypeScript client — [`@khwan/client`](https://www.npmjs.com/package/@khwan/client).

It's the smallest useful thing you can build with the library: a chat UI that
talks to the hosted Khwan API directly from the browser.

## What it demonstrates

- Creating a client — `new Khwan({ apiKey, userId, baseUrl, core })`
- Hosted chat — sending a turn and rendering the reply with `client.chat(input)`
- Selecting an isolated **core** with the `core` option — either by typing a
  slug or by loading the account's cores with `client.cores()` into a dropdown
- Optionally showing the `coherence` score the server returns with each reply

Everything runs client-side. There is no server, no login, and no database —
just React state, `localStorage`, and the client library.

## Prerequisites

- Node.js 18+
- A Khwan API key (see [Getting an API key](#getting-an-api-key))

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000, then open the settings panel and enter:

| Field    | What to enter                                          |
| -------- | ------------------------------------------------------ |
| API key  | Your API key (starts with `kwk_`)                      |
| Base URL | The API base URL (defaults to `https://api.khwan.ai`)  |
| User ID  | Any string that identifies the end user                |
| Core     | Optional slug of an isolated core; blank = default     |

These values are saved in your browser's `localStorage` and sent straight to
the API. Nothing is written to a file or uploaded to a server of ours.

## Getting an API key

Create an account and generate an API key from the Khwan dashboard, then paste
the `kwk_...` key into the settings panel.

## How it uses the library

```ts
import { Khwan } from "@khwan/client";

const client = new Khwan({
  apiKey: "kwk_...",
  userId: "alice",
  baseUrl: "https://api.khwan.ai",
  core: "client1", // optional — omit for the account's default core
});

const reply = await client.chat("hello");
console.log(reply.text, reply.coherence);

// List the isolated cores available on the account:
const cores = await client.cores();
```

See [`lib/client.ts`](lib/client.ts), [`components/SettingsPanel.tsx`](components/SettingsPanel.tsx),
and [`components/ChatPanel.tsx`](components/ChatPanel.tsx) for the full wiring.

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
</content>
</invoke>
