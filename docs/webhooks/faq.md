# Webhooks — FAQ

### Do I have to use webhooks?

Not strictly. You could poll the API for status changes. But webhooks are strongly recommended — they're faster, use less bandwidth, and don't hit rate limits.

### Can I receive webhooks on localhost during development?

Not directly — NomaSign needs a publicly reachable URL. Use a tunneling tool:
- **ngrok** — `ngrok http 5203` gives you a public HTTPS URL
- **Cloudflare Tunnel** — similar, free tier available
- **VS Code port forwarding** — built into VS Code's dev tunnels

Update your integration entry's webhook URL to the tunnel URL during development.

### What if my endpoint is down when an event fires?

NomaSign retries with exponential backoff. If all retries fail, the event is dropped. Design your system to reconcile missed events (e.g., periodic polling as a fallback).

### Can I have multiple webhook URLs per integration entry?

No — one URL per entry. If you need to fan out to multiple services, have your webhook endpoint forward the event internally.

### Is the webhook secret the same as the refresh token?

No. They are separate credentials:
- **Refresh token** — used to authenticate API calls (get access token)
- **Webhook secret** — used to verify incoming webhook signatures

Both are generated together but serve different purposes.

### Can I regenerate the webhook secret without changing the refresh token?

No — regenerating credentials creates both a new refresh token and a new webhook secret. Update both in your deployed application.

### What HTTP status should my endpoint return?

Return `200 OK` (or any `2xx`). Anything else is treated as a failure and triggers retries.

### How quickly must my endpoint respond?

Within a few seconds. If your processing takes longer, return `200` immediately and process asynchronously (queue the event).
