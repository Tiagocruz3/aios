# OpenClaw API proxy (Hostinger)

Phantom Chat in this app talks to an OpenAI-compatible OpenClaw gateway over
HTTPS. Your domain `darkgrey-quail-161852.hostingersite.com` currently serves the
OpenClaw **website** (HTML), so `POST /v1/responses` returns a web page instead
of JSON and chat fails.

These files make that domain **proxy `/v1/*` to the real gateway** while the
website keeps serving at `/`. After this, no app change is needed —
`OPENCLAW_GATEWAY_BASE_URL` stays as your Hostinger URL.

## Prerequisite

The Hostinger server must be able to reach the gateway. Set the upstream to
whatever address works **from that server**:

- gateway running on the same box → `http://127.0.0.1:18789`
- gateway elsewhere → its private/public `http(s)://host:port`

If the gateway only runs on your laptop at `127.0.0.1`, expose it first (e.g. a
Cloudflare Tunnel / ngrok) and use that URL as the upstream.

## Pick your setup

| Hosting type | Use |
| --- | --- |
| Shared hosting (cPanel / hPanel, only File Manager + `.htaccess`) | `v1-proxy.php` + `.htaccess` (Option A) |
| VPS with nginx | `nginx.conf` |
| VPS with Apache + mod_proxy | `apache-vhost.conf` (or `.htaccess` Option B) |

### Shared hosting (PHP proxy — most reliable)

1. Upload `v1-proxy.php` to your site root (next to `index.html`).
2. Edit `$UPSTREAM` in it to the gateway address reachable from the server.
3. Merge the `/v1` rule from `.htaccess` (Option A) into the **top** of your
   root `.htaccess`, **above** any SPA `RewriteRule . /index.html [L]`.

### VPS (nginx / Apache)

Add the provided block to the `server` / `<VirtualHost>` that serves the site,
above any catch-all to `index.html`, set the upstream, and reload the server.

## Verify

From anywhere:

```bash
curl -i -X POST https://darkgrey-quail-161852.hostingersite.com/v1/chat/completions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"model":"openclaw/default","messages":[{"role":"user","content":"Hi"}]}'
```

You want `Content-Type: application/json` and a JSON body (not `text/html`).
Or open the app's diagnostic in a browser:
`/api/phantom-chat/debug?msg=Hi` — both transports should show JSON, not HTML.

Then send "Hi" in Phantom Chat.

## Security

- The proxy forwards the client's `Authorization` header to the gateway and
  never logs or stores the token.
- It only proxies the `/v1/*` namespace; everything else is left to the website.
