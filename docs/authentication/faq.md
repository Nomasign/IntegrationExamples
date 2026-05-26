# Authentication — FAQ

### Can I have multiple integration entries on one account?

Yes. Each integration entry is independent — it has its own name, refresh token, webhook secret, and webhook URL. Use separate entries for dev/staging/production environments.

### What happens if I lose my refresh token?

It's only shown once at generation time. If lost, click **Generate Tokens** again — this creates new credentials and **immediately invalidates** the previous ones for that entry. Update your deployed application right away.

### Does regenerating affect other integration entries?

No. Each entry is isolated. Regenerating credentials for one entry has no effect on other entries.

### Do refresh tokens expire?

No. Refresh tokens remain valid indefinitely until you either:
- Regenerate credentials (creates new token, invalidates old)
- Deactivate the integration entry
- Delete the integration entry

### How long do access tokens last?

~1 hour. Your backend should cache the access token and re-exchange the refresh token only when the access token expires (you'll get a 401 response).

### Can I use the same refresh token from multiple servers?

Yes. The refresh token is not single-use — you can exchange it for access tokens from multiple backend instances concurrently. Each exchange returns a new short-lived access token.

### What's the `client_id` in the token request?

It's always `nomasign-integration` — this is a fixed value, not something you generate or configure.
