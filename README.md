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
# Required
OPENCLAW_GATEWAY_BASE_URL=https://darkgrey-quail-161852.hostingersite.com
OPENCLAW_GATEWAY_TOKEN=<gateway-token>   # mark as Secret in Vercel

# Recommended
OPENCLAW_MODEL=openclaw/default

# Recommended: encrypts settings (e.g. a token entered in the UI) at rest
PHANTOM_SETTINGS_SECRET=<long-random-string>
```

These act as defaults. Per-user overrides entered in Settings take effect
immediately without a redeploy. The gateway token is stored in an encrypted,
httpOnly cookie and is never sent to the browser; all OpenClaw requests are
proxied through `app/api/hermes/route.ts`.

Legacy aliases `OPENCLAW_GATEWAY_URL` and `OPENCLAW_CHAT_MODEL` are still
honored. When tunneling a local gateway, forward the port:
`ssh -N -L 18789:127.0.0.1:18789 user@host` and set
`OPENCLAW_GATEWAY_BASE_URL=ws://127.0.0.1:18789` (ws/wss are auto-converted).


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
