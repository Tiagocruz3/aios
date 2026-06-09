# Vibe Coding Platform

An end-to-end coding platform where users enter text prompts and an AI agent generates full-stack applications in a sandboxed environment with live preview, file explorer, and command logs.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?demo-description=A+full-stack+coding+platform+built+with+Vercel%27s+AI+Cloud%2C+AI+SDK%2C+and+Next.js.&demo-image=https%3A%2F%2Fassets.vercel.com%2Fimage%2Fupload%2Fv1754588832%2FOSSvibecodingplatform%2Fscreenshot.png&demo-title=Vibe+Coding+Platform&demo-url=https%3A%2F%2Fvercel.fyi%2Fvibes&project-name=Vibe+Coding+Platform&repository-name=vibe-coding-platform&repository-url=https%3A%2F%2Fgithub.com%2Fvercel%2Fexamples%2Ftree%2Fmain%2Fapps%2Fvibe-coding-platform&from=vibe-coding-platform-app)

## Features

- Multi-model support via AI Gateway (Claude, GPT, Grok)
- Secure code execution with Vercel Sandbox
- Real-time live preview of generated apps
- File explorer for browsing project files
- Command logs and error monitoring
- One-click deploy to Vercel

## Tech Stack

- [Next.js](https://nextjs.org) with Turbopack
- [AI SDK](https://ai-sdk.dev) v6
- [Vercel AI Gateway](https://vercel.com/docs/ai-gateway)
- [Vercel Sandbox](https://vercel.com/docs/vercel-sandbox)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)

## Getting Started

### Run Locally

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Configure OpenClaw Gateway

"Phantom Chat" (the `/hermes` page) can route text chat through the OpenClaw
(self-hosted) gateway or the built-in AI Gateway. Pick the backend with the
provider selector in the Phantom Chat header, and edit OpenClaw settings via the
gear icon (Settings → Phantom Chat Settings → OpenClaw Settings).

Create `.env.local` (local) or set Vercel env vars with:

```env
# Required — use a PUBLIC url for the Vercel deployment (see note below)
OPENCLAW_GATEWAY_BASE_URL=http://192.168.68.111:8642
OPENCLAW_GATEWAY_TOKEN=<gateway-token>   # mark as Secret in Vercel

# Recommended
OPENCLAW_MODEL=hermes

# Recommended: encrypts settings (e.g. a token entered in the UI) at rest
PHANTOM_SETTINGS_SECRET=<long-random-string>
```

These act as defaults. Per-user overrides entered in Settings take effect
immediately without a redeploy. The gateway token is stored in an encrypted,
httpOnly cookie and is never sent to the browser; all gateway requests are
proxied through `app/api/hermes/route.ts`.

> **LAN vs cloud:** `192.168.68.111:8642` is a private LAN address — it works
> when the app runs on the same network (local `pnpm dev`), but the **Vercel
> deployment cannot reach it**. To use the deployed app, expose the gateway with
> a public tunnel (see `deploy/openclaw-proxy/TUNNEL.md`) and set
> `OPENCLAW_GATEWAY_BASE_URL` to the tunnel's HTTPS URL.

Legacy aliases `OPENCLAW_GATEWAY_URL` and `OPENCLAW_CHAT_MODEL` are still
honored (ws/wss URLs are auto-converted to http/https).


## Supported Models

- Claude Opus 4.6
- Claude Sonnet 4.6
- GPT-5.3 Codex
- Grok 4.1 Reasoning

## Deploy

Click the deploy button above or run:

```bash
vc deploy
```
