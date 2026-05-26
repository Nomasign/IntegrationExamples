# Step 3 — Troubleshooting

Common problems when creating templates or using them via the API.

---

| Problem | Cause | Solution |
|---------|-------|----------|
| `GET /api/templates` returns empty array | Templates were created by a different account | Log in as the integrator and create templates there |
| API payload rejected: "recipient label not found" | Label mismatch (case-sensitive) | Check exact spelling/casing of recipient placeholders in the template |
| Document sends but fields are empty | Field labels in API don't match template | Compare `fields[].label` in your payload with the template's field names exactly |
| Template not visible after creation | Browser cache or wrong account session | Hard-refresh, verify you're logged in as the integrator (check profile menu) |
| "Template not found" error on send | Wrong template ID or template was deleted | Verify the ID via `GET /api/templates` — copy from the response |
| Signer sees blank where a value should be | Field was optional and not pre-filled, or label typo | Double-check your payload's field labels against the template |
| Template shows in UI but not in API | Logged into UI as integrator but API token is from a different integration entry | Ensure the refresh token you're using belongs to the same integrator account |

---

[← Back to Step 3](./index.md) | [FAQ](./faq.md)
