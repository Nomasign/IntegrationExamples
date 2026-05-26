# Step 5 — Troubleshooting

Common problems with webhook delivery, signature verification, and local tunnels.

---

| Problem | Cause | Solution |
|---------|-------|----------|
| Webhook returns 401 Unauthorized | HMAC secret not configured or wrong | Verify your webhook secret matches what was generated in Step 4. Regenerate if unsure |
| Tunnel URL not reachable | Port visibility is Private | Set visibility to "Public" in VS Code Ports panel (right-click → Port Visibility → Public) |
| Events arrive but signature verification fails | Wrong secret, or body was parsed before verification | Ensure you're reading the **raw body** before JSON parsing. Check that the secret matches Step 4 |
| Backend not receiving requests | Tunnel port mismatch | Verify the tunnel port (5203) matches your backend's actual listening port |
| Signature valid but timestamp rejected | Clock skew or stale event | Your replay window is too tight, or the event is genuinely old (retry). Use 5-minute tolerance |
| Duplicate events received | Normal retry behavior | Use the `id` field as an idempotency key — skip events you've already processed |
| Endpoint auto-disabled | 20 consecutive failures | Fix the underlying issue, re-enable the endpoint in the NomaSign Integration page, then send a test event |
| Events work locally but not in production | Different webhook secret per environment | Each integration entry has its own secret. Ensure production uses the production entry's secret |
| `X-NomaSign-Signature` header missing | Request isn't from NomaSign | Could be a health check, bot, or misconfigured proxy stripping headers. Only process requests with the signature header |

---

[← Back to Step 5](./index.md) | [FAQ](./faq.md)
