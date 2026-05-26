# Accounts & Roles — Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| Integration page not visible in dashboard | Plan doesn't include Integration API, or user lacks Integrator role | Verify plan level and confirm the Integrator role was assigned by an Admin |
| Invite email not received | Email filtering or wrong address | Check spam/junk, verify the email address, or have the admin resend |
| "Generate Tokens" button disabled | Integration entry is not set to Active | Toggle the entry to **Active** first |
| Can't create integration entry | Not an integrator — or you're on the wrong org | Verify you're logged in with the correct account and have the Integrator role |
| API returns 403 after plan renewal | Cached access token still references old subscription expiry | Clear your cached access token and re-authenticate to get a new one with updated claims |
| "subscription_expires_at" in the past | Subscription lapsed | Renew your plan; then re-authenticate to get a token with the updated expiry |
| Multiple team members getting 401s simultaneously | Someone regenerated credentials, invalidating the shared token | Coordinate credential regeneration — notify all teams using the same integration entry |
| Account locked | Too many failed login attempts | Use the "Forgot password" flow, or contact NomaSign support |
