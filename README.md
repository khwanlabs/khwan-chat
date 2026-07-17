# Khwan chat

A minimal ChatGPT-like web UI where an end-user chats with an agent powered by
[Khwan](https://khwan.example). Khwan is the cognition layer (memory,
identity, learning); the underlying model is called through the Khwan API.

Built with Next.js 14 (App Router), TypeScript, and Tailwind CSS.

## How it works

- `app/page.tsx` — the chat UI (message bubbles, input, loading state, and a small
  coherence readout on assistant replies). State is managed with React hooks.
- `lib/khwan.ts` — a tiny client wrapper the UI calls (`sendMessage`).
- `app/api/chat/route.ts` — a server-side proxy to the Khwan API. It reads the
  credentials from env and forwards `{ input }` to `POST /chat` with the
  `X-API-Key` and `X-Khwan-User` headers, so the API key never reaches the
  browser.

The client → route → Khwan split keeps a clean abstraction: this reference app
uses the simplest `POST /chat` path, but you can later switch to the BYOM
prepare/record flow by changing only the route handler and `lib/khwan.ts`.

## Environment variables

Copy `.env.example` to `.env.local` and fill in:

| Variable            | Description                                              |
| ------------------- | -------------------------------------------------------- |
| `KHWAN_API_KEY` | API key sent as the `X-API-Key` header (server-side).    |
| `KHWAN_API_URL` | Base URL of the Khwan API; the route appends `/chat`.|
| `KHWAN_USER`    | Signed-in end-user id sent as `X-Khwan-User`.        |

All three are server-side only and are never exposed to the browser.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
