# Content Agent

AI-powered content generation web app built with Next.js 15, TypeScript, Tailwind CSS, and the Anthropic Claude API. Streams content in real time with prompt caching enabled on the system prompt.

## Features

- Streaming responses (`text/plain` chunked transfer)
- Prompt caching on the system prompt for lower latency and cost
- Five content types and five tones out of the box
- Server-side input validation with sane length limits
- Health check endpoint for uptime monitoring
- Strict TypeScript, ESLint, Prettier, and Tailwind preconfigured

## Stack

- [Next.js 15](https://nextjs.org/) (App Router, Turbopack)
- [TypeScript 5](https://www.typescriptlang.org/)
- [Tailwind CSS 3](https://tailwindcss.com/)
- [Anthropic SDK](https://github.com/anthropics/anthropic-sdk-typescript) (`claude-sonnet-4-6`)

## Quick start

Requirements: Node.js 20+ (`.nvmrc` is committed) and an Anthropic API key.

```bash
git clone https://github.com/RennXAI/content-agent-app.git
cd content-agent-app
npm install
cp .env.example .env.local
# Edit .env.local and set ANTHROPIC_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable            | Required | Description                                                  |
| ------------------- | -------- | ------------------------------------------------------------ |
| `ANTHROPIC_API_KEY` | Yes      | API key from [console.anthropic.com](https://console.anthropic.com). |

The app validates that `ANTHROPIC_API_KEY` is set on the first request and returns `503` if missing.

## Project structure

```
src/
├── app/
│   ├── layout.tsx               # Root layout, metadata, fonts
│   ├── page.tsx                 # Home
│   ├── globals.css              # Tailwind directives
│   └── api/
│       ├── generate/route.ts    # POST /api/generate (streaming)
│       └── health/route.ts      # GET  /api/health
├── components/
│   └── ContentGenerator.tsx     # Main client UI
└── lib/
    └── env.ts                   # Server-side env validation
```

## API

### `POST /api/generate`

Streams content using `claude-sonnet-4-6` with prompt caching on the system prompt.

Request body:

```json
{
  "contentType": "blog post",
  "tone": "professional",
  "topic": "The benefits of remote work"
}
```

Limits:

- `contentType`: 1–64 chars
- `tone`: 1–64 chars
- `topic`: 1–2000 chars

Responses:

- `200 text/plain` — chunked stream of generated content
- `400 application/json` — invalid input (`{ "error": "..." }`)
- `503 application/json` — server missing `ANTHROPIC_API_KEY`
- `500 application/json` — upstream / unknown error

Example:

```bash
curl -N -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"contentType":"blog post","tone":"professional","topic":"Remote work"}'
```

### `GET /api/health`

Returns `{"status":"ok"}` with `200`. Useful for load balancer / uptime checks.

## Scripts

```bash
npm run dev        # Dev server (Turbopack)
npm run build      # Production build
npm run start      # Start production server
npm run lint       # ESLint
npm run format     # Prettier write
npm run typecheck  # tsc --noEmit
```

## Deploy

### Vercel (recommended)

1. Import the repo on [vercel.com](https://vercel.com/new).
2. Set `ANTHROPIC_API_KEY` in Project Settings → Environment Variables.
3. Deploy. Streaming works out of the box on Vercel's Edge and Node.js runtimes.

### Docker / self-host

```bash
npm ci
npm run build
ANTHROPIC_API_KEY=sk-ant-... npm run start
```

The app listens on `PORT` (default `3000`).

## License

MIT
