# Step 4 — Troubleshooting

Common problems with token exchange, API authentication, and credential management.

---

| Problem | Cause | Solution |
|---------|-------|----------|
| `POST /connect/token` returns 400 Bad Request | Wrong `Content-Type`, missing field, or typo in `grant_type` | Must be `application/x-www-form-urlencoded` with `grant_type=refresh_token`, `client_id=nomasign-integration`, and your `refresh_token` |
| `POST /connect/token` returns 401 Unauthorized | Refresh token is invalid, regenerated, or entry is deactivated | Verify the token is current — regenerate if unsure, and check that the integration entry is active |
| `POST /connect/token` returns 404 Not Found | Wrong URL | Use `https://integration.nomasign.com/connect/token` — no trailing slash, no `/api` prefix |
| Access token works once then stops | You're regenerating the refresh token on every call (invalidating the previous one) | Exchange the refresh token only when you need a new access token (on 401 or expiry) — don't regenerate credentials |
| "Generate Tokens" button not visible | Integration entry isn't activated yet | Toggle the entry to **Active** first, then generate tokens |
| Webhook secret doesn't verify incoming events | You copied the wrong secret, or the entry was regenerated since | Regenerate and update your backend with the new secret |
| API calls return 403 Forbidden | Access token is valid but the integrator account lacks permission for that operation | Verify the integrator has the correct role and the resource (template, session) belongs to them |
| Token exchange works locally but fails in production | Environment mismatch — using dev credentials against production or vice versa | Each environment should use its own integration entry with its own credentials |

---

[← Back to Step 4](./index.md) | [FAQ](./faq.md)
