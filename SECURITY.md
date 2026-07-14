# Security & Privacy

AIWriter is a **static, client-only** web app. There is no application backend that receives your API keys.

## Data handling

| Data | Where it lives | Who receives it |
|------|----------------|-----------------|
| API Key / URI / model | Browser `localStorage` | Your chosen API provider (on each request) |
| Writing settings & system prompt | Browser `localStorage` | Sent to your API as prompt context when you generate |
| History | Browser `localStorage` | Not uploaded by this app |
| Novel text | In-memory + optional history / download | Your API provider when you write / ask / revise |

## Threat notes

- **Shared devices**: Clear data via 设置 →「清除本机全部数据」after use.
- **XSS**: UI renders text via React text nodes (`<pre>`), not `dangerouslySetInnerHTML`.
- **API URL**: Only `http:` / `https:` bases are accepted.
- **CORS**: Browser may block direct calls to some providers; that is a browser security feature, not a server proxy in this app.
- **Supply chain**: Review dependencies before deploying; keep Node/npm updated when building.

## Deployment recommendations

- Serve over **HTTPS**.
- Prefer a CDN/static host that sets `X-Content-Type-Options: nosniff` and a strict `Referrer-Policy`.
- Do not inject third-party analytics that can read `localStorage` unless users consent.
- Never commit `.env` files containing real keys (this project does not require server env keys).

## Reporting issues

If you find a vulnerability in this repository, open an issue describing the impact and reproduction steps (without including live secrets).
