# Khwan Chat Sample

A minimal, multi-provider chat built on the Khwan TypeScript client —
[`@khwan/client`](https://www.npmjs.com/package/@khwan/client).

Khwan is a pure **AI-memory layer** — it never runs a model. This sample shows
how to wire Khwan's memory around **your own model**: Khwan prepares the
context, you call your model to generate the reply, then you hand the reply back
so Khwan can persist and learn from it.

Everything is configured through a **`.env` file** — there is no settings popup
and no login. Clone it, fill in `.env.local`, pick your provider, run.

## The loop

```
prepare  →  your model  →  record
```

1. `const turn = await client.prepare(input)` — Khwan builds the context
   (memory + constitution + coherence). **No LLM call happens here.**
2. If `turn.allowed === false`, the coherence gate blocked the turn — show
   `turn.reason` and stop.
3. Call your own model with `turn.messages`.
4. `await client.record(turn, answer)` — Khwan persists the exchange and learns.
5. Render the answer, plus `turn.coherence` and how many `turn.sources` Khwan
   used, so the "memory" is visible.

In this sample the whole loop runs **server-side**, inside the Next.js route
[`app/api/chat/route.ts`](app/api/chat/route.ts). That's what keeps your API
keys in `.env` and out of the browser: the browser only ever sends the user's
message and receives the answer.

## Bring your own model — multiple providers

Set `MODEL_PROVIDER` to one of three families. The provider adapter translates
Khwan's prepared messages into each API's shape.

| `MODEL_PROVIDER` | Vendor           | Example `MODEL_NAME`      | Default endpoint |
| ---------------- | ---------------- | ------------------------- | ---------------- |
| `openai`         | OpenAI           | `gpt-4o-mini`             | `https://api.openai.com/v1` |
| `anthropic`      | Anthropic Claude | `claude-3-5-haiku-latest` | `https://api.anthropic.com` |
| `google`         | Google Gemini    | `gemini-1.5-flash`        | `https://generativelanguage.googleapis.com` |

**Anything OpenAI-compatible** works through `MODEL_PROVIDER=openai` plus a
`MODEL_BASE_URL` — Groq, OpenRouter, DeepSeek, Together, Mistral, xAI (Grok),
Ollama, LM Studio, vLLM, and more. The full cheat-sheet of base URLs and model
names is in [`.env.example`](.env.example).

Adding a fourth provider is one file: implement the `Provider` interface in
[`lib/providers/`](lib/providers) and register it in
[`lib/providers/index.ts`](lib/providers/index.ts).

## Prerequisites

- Node.js 18+
- A Khwan API key (from the Khwan dashboard — starts with `kwk_`)
- An API key for whichever model provider you choose

## Run it

```bash
npm install
cp .env.example .env.local   # then edit .env.local
npm run dev
```

Open http://localhost:3000. If anything required is missing, the app tells you
exactly which variables to set.

## Configuration (`.env.local`)

All configuration is environment variables — copy `.env.example` and fill it in.
Values are read **only on the server**; none are exposed to the browser.

**Khwan · memory layer**

| Variable         | Required | Notes |
| ---------------- | :------: | ----- |
| `KHWAN_API_KEY`  | ✅       | Your Khwan key (`kwk_...`). |
| `KHWAN_BASE_URL` | —        | Defaults to `https://api.khwan.ai`. |
| `KHWAN_USER`     | —        | End-user id → an isolated sub-brain (paid). Blank = one shared brain. |
| `KHWAN_CORE`     | —        | Isolated core slug. Blank = the account's default core. |

**Your model · generation**

| Variable           | Required | Notes |
| ------------------ | :------: | ----- |
| `MODEL_PROVIDER`   | ✅       | `openai` \| `anthropic` \| `google`. |
| `MODEL_API_KEY`    | ✅       | The provider's key. |
| `MODEL_NAME`       | ✅       | Model name, e.g. `gpt-4o-mini`. |
| `MODEL_BASE_URL`   | —        | Override the endpoint (e.g. to hit an OpenAI-compatible host). |
| `MODEL_MAX_TOKENS` | —        | Cap on generated tokens. Defaults to `1024`. |

Restart `npm run dev` after editing `.env.local`.

## How it uses the library

```ts
import { Khwan } from "@khwan/client";
import { generate } from "@/lib/providers"; // provider adapter (openai | anthropic | google)

const client = new Khwan({
  apiKey: process.env.KHWAN_API_KEY!,
  baseUrl: process.env.KHWAN_BASE_URL,
  userId: process.env.KHWAN_USER || undefined,
  core: process.env.KHWAN_CORE || undefined,
});

// 1. Khwan builds the context — no model runs here.
const turn = await client.prepare("hello");

// 2. Coherence gate.
if (!turn.allowed) throw new Error(turn.reason ?? "blocked");

// 3. Call YOUR model with the prepared messages, via the configured provider.
const answer = await generate(modelConfig, turn.messages);

// 4. Hand the answer back so Khwan persists + learns.
await client.record(turn, answer);
```

See [`app/api/chat/route.ts`](app/api/chat/route.ts),
[`lib/config.ts`](lib/config.ts), and [`lib/providers/`](lib/providers) for the
full wiring.

## Security notes

- API keys live in `.env` and are read only in server code (`lib/config.ts`
  imports `server-only`). They are never bundled into the client.
- The browser talks only to this app's `/api/chat` route — never directly to
  Khwan or your model provider.
- Your model key is never sent to Khwan; Khwan never sees your model.

## The client dependency

This sample depends on the published client from npm:

```json
"@khwan/client": "^0.1.0"
```

`npm install` pulls it for you — nothing else to wire up.

## License

MIT — see [LICENSE](LICENSE).

## Stack

Next.js (App Router, Node runtime) + React + Tailwind CSS + TypeScript.
