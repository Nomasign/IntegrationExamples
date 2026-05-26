# Authentication — Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| `POST /connect/token` returns 400 Bad Request | Wrong `Content-Type`, missing field, or typo in `grant_type` | Must be `application/x-www-form-urlencoded` with `grant_type=refresh_token`, `client_id=nomasign-integration`, and your `refresh_token` |
| `POST /connect/token` returns 401 Unauthorized | Refresh token is invalid, regenerated, or entry is deactivated | Verify the token is current — regenerate if unsure, and check that the integration entry is active |
| `POST /connect/token` returns 404 Not Found | Wrong URL | Use `https://integration.nomasign.com/connect/token` — no trailing slash, no `/api` prefix |
| `invalid_grant` — "issuer associated to the specified token is not valid" | Token was generated against a different environment | Ensure your base URL matches where the token was generated (e.g. `dev.integration.nomasign.com` vs `integration.nomasign.com`) |
| Access token works once then stops | You're regenerating the refresh token on every call (invalidating the previous one) | Exchange the refresh token only when you need a new access token (on 401 or expiry) — don't regenerate credentials |
| "Generate Tokens" button not visible | Integration entry isn't activated yet | Toggle the entry to **Active** first, then generate tokens |
| API calls return 403 Forbidden | Access token is valid but the integrator account lacks permission | Verify the integrator has the correct role and the resource belongs to them |
| Token exchange works locally but fails in production | Environment mismatch — using dev credentials against production or vice versa | Each environment should use its own integration entry with its own credentials |
