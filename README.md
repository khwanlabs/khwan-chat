# Khwan Chat Sample

A tiny, unbranded example chat app built on the
[`@khwan/client`](https://www.npmjs.com/package/@khwan/client) TypeScript
library. It shows the smallest useful thing you can build: a chat UI that talks
to the Khwan API directly from the browser.

It demonstrates:

- Creating a client — `new Khwan({ apiKey, userId, baseUrl, core })`
- Sending a turn and rendering the reply — `client.chat(input)`
- Selecting an isolated **core** (แกน) — either by typing a slug or by loading
  the account's cores with `client.cores()` into a dropdown
- Optionally showing the `coherence` score the server returns

Everything runs client-side. There is no server, no login, and no framework
magic — just React state, `localStorage`, and the client library.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:3000. On first load a small settings panel asks for:

| Field    | What to enter                                             |
| -------- | --------------------------------------------------------- |
| API key  | Your Khwan key (starts with `kwk_`)                       |
| Base URL | The API base URL (defaults to `https://api.khwan.ai`)     |
| User ID  | Any string — identifies the end user whose brain you use  |
| Core     | Optional slug of an isolated core; blank = default core   |

These are saved in your browser's `localStorage` and sent straight to the API.
Nothing is written to a file or uploaded to any server of ours.

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

When you publish or copy this sample on its own, swap that for the published
package:

```bash
npm install @khwan/client
```

## Stack

Next.js (App Router) + React + Tailwind CSS + TypeScript. No auth, no server
routes, no database.
