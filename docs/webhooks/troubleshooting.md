# Webhooks — Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| Webhook never arrives | URL not publicly reachable, or wrong URL in integration entry | Verify the URL is HTTPS, publicly reachable, and matches your deployed endpoint path |
| Signature verification fails | Wrong secret, or body was modified (middleware parsed it before verification) | Read the raw request body before any parsing; verify you're using the current webhook secret |
| `401 Unauthorized` from your endpoint | Signature mismatch | Double-check your HMAC computation: payload is `{t}.{raw_body}`, key is webhook secret, hash is SHA256 |
| Events arrive late or out of order | Network issues or retry backoff | Design your handler to be idempotent and order-independent |
| Duplicate events received | NomaSign retried (your endpoint was slow or returned non-2xx briefly) | Make your handler idempotent — use `sessionId` + `eventType` as a deduplication key |
| Webhook works in dev but not production | Tunnel URL expired, or production URL has different path | Update the integration entry's webhook URL to your production endpoint |
| "Webhook secret not configured" in demo | Secret wasn't saved via the config step | Save the webhook secret through the demo UI (Step 4) or POST to `/api/signing/config/webhook-secret` |
| Replay attack concern | Attacker resending old webhook payloads | Check the `t` timestamp — reject events older than 5 minutes |
