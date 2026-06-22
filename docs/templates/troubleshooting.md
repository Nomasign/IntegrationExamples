# Templates — Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| `GET /api/templates` returns empty array | Templates were created by a different account | Log in as the integrator and create templates there |
| `400 unmapped_placeholders` on send | A template placeholder has no matching recipient. Recipient labels are matched **case-insensitively**, so check spelling (not casing) | Give every placeholder label a recipient with the same label in `signingRequests[].recipients[]` |
| Document sends but fields are empty | Field labels in API don't match template | Compare `fields[].label` in your payload with the template's field names exactly |
| Template not visible after creation | Browser cache or wrong account session | Hard-refresh, verify you're logged in as the integrator (check profile menu) |
| "Template not found" error on send | Wrong template ID or template was deleted | Verify the ID via `GET /api/templates` — copy from the response |
| Signer sees blank where a value should be | Field was optional and not pre-filled, or label typo | Double-check your payload's field labels against the template |
| Template shows in UI but not in API | API token is from a different integration entry | Ensure the refresh token you're using belongs to the same integrator account that created the template |
