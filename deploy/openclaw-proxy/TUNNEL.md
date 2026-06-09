# Expose the OpenClaw gateway with a tunnel (recommended)

Your gateway runs at `http://127.0.0.1:18789` on a private machine. Vercel runs
in the cloud and can't reach `127.0.0.1`, so publish the gateway with a tunnel
and point the app at the tunnel's public HTTPS URL.

This is the simplest path and leaves your Hostinger website untouched.

## Option 1 — Cloudflare Tunnel (free, recommended)

Run these **on the machine where the gateway runs**.

### Quick test (temporary URL, changes each restart)

```bash
# install cloudflared (macOS: brew install cloudflared ; Linux: see Cloudflare docs)
cloudflared tunnel --url http://127.0.0.1:18789
```

It prints a public URL like `https://random-words.trycloudflare.com`. Use that
as the gateway base URL (below). Good for a first end-to-end test.

### Stable URL (named tunnel, survives restarts) — for real use

```bash
cloudflared tunnel login
cloudflared tunnel create openclaw
# Map a hostname you control in Cloudflare DNS, e.g. gateway.yourdomain.com:
cloudflared tunnel route dns openclaw gateway.yourdomain.com
cloudflared tunnel run --url http://127.0.0.1:18789 openclaw
```

Then the base URL is `https://gateway.yourdomain.com`. Keep `cloudflared`
running (install it as a service for always-on).

## Option 2 — ngrok (quick alternative)

```bash
ngrok http 18789
```

Use the printed `https://….ngrok-free.app` URL. Note free ngrok URLs change on
restart; a reserved domain or Cloudflare named tunnel is better for production.

## Point the app at the tunnel

Set the gateway base URL to the tunnel URL — **no redeploy needed** either way:

- In the app: Settings → Phantom Chat Settings → OpenClaw Settings → **Gateway
  Base URL** = your tunnel URL, then Save. (Per-user, takes effect immediately.)
- Or as the deploy-wide default: set `OPENCLAW_GATEWAY_BASE_URL` in Vercel →
  Project → Settings → Environment Variables, then redeploy.

Keep `OPENCLAW_GATEWAY_TOKEN` set in Vercel (the app sends it as a Bearer token;
it's never exposed to the browser).

## Verify

Open in a browser (uses the server-side token):

```
https://aios-omega.vercel.app/api/phantom-chat/debug?msg=Hi
```

You want `contentType: application/json` and a JSON `body` (not `text/html`).
Then send "Hi" in Phantom Chat. Once confirmed, the temporary `debug` route can
be removed.

## Notes

- The gateway must actually expose the OpenAI-compatible HTTP API on 18789. If
  the tunnel returns 404 for `/v1/responses` AND `/v1/chat/completions`, the app
  shows "OpenClaw Gateway endpoints not enabled or gateway needs restart." —
  enable those endpoints / restart the gateway.
- A tunnel exposes the gateway to the internet; the Bearer token is what
  protects it, so keep the token secret and strong.
