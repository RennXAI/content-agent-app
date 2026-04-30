# Content Agent App

AI-powered content generation web app built with Next.js 15, TypeScript, Tailwind CSS, and the Anthropic Claude API.

## Stack

- **Next.js 15** (App Router, Turbopack)
- **TypeScript 5**
- **Tailwind CSS 3**
- **Anthropic SDK** — streaming + prompt caching

## Project Structure

```
src/
├── app/
│   ├── layout.tsx               # Root layout with Inter font
│   ├── page.tsx                 # Home page
│   ├── globals.css              # Tailwind imports
│   └── api/
│       └── generate/
│           └── route.ts         # POST /api/generate — streaming endpoint
└── components/
    └── ContentGenerator.tsx     # Main UI component (client)
```

## Getting Started

```bash
npm install
cp .env.example .env.local      # Add your ANTHROPIC_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key from console.anthropic.com |

## API

### `POST /api/generate`

Streams content using `claude-sonnet-4-6` with prompt caching on the system prompt.

**Request body:**
```json
{
  "contentType": "blog post",
  "tone": "professional",
  "topic": "The benefits of remote work"
}
```

**Response:** `text/plain` stream (chunked transfer encoding).

## Development

```bash
npm run dev      # Start dev server with Turbopack
npm run build    # Production build
npm run lint     # ESLint
```
