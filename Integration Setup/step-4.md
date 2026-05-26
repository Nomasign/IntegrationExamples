# Step 4 — Creating a Refresh Token & Webhook Secret

Create an **integration entry** and generate the credentials your application needs.

## What is an integration entry?

An integration entry represents one set of credentials for one environment. You can have multiple entries (dev, staging, production) — each with its own refresh token, webhook secret, and webhook URL.

## Steps

### 1. Add a New Integration @confirm

On the **Integration** page (logged in as the integrator), click **Add Integration**.

| Field           | What to enter                  | Example                                     |
| --------------- | ------------------------------ | ------------------------------------------- |
| **Name**        | A label for this integration   | `CRM Production` or `HR Dev`                |
| **Webhook URL** | Your HTTPS endpoint (optional) | `https://example.com/api/webhooks/nomasign` |

![Add new integration form](./images/step-6.png)

### 2. Activate the Integration

Toggle the entry to **Active** to enable API access.

![Activate integration toggle](./images/step-7.png)

### 3. Generate Tokens

Click **Generate Tokens**. You'll receive:

- **Refresh Token** — used to obtain short-lived access tokens
- **Webhook Secret** — used to verify webhook HMAC signatures

![Generate tokens dialog](./images/step-8.png)

> ⚠️ **Copy both values immediately** — they're only shown once.

## Security checklist (for production)

- [ ] Refresh token stored in a secrets manager (Azure Key Vault, AWS Secrets Manager, etc.)
- [ ] Webhook secret stored alongside the refresh token
- [ ] Neither value exposed to frontend/client-side code
- [ ] Neither value logged, emailed, or pasted into chat/tickets

> **The example app accepts secrets via the UI for demo purposes only.** In production, read them from a secrets manager at startup.

---

**Previous:** [← Creating a Signing Template](step-3.md) | **Next:** [Receiving Webhook Notifications →](step-5.md) _(optional)_

**Done with setup?** Head back to the [main README](../README.md) to run the example app.

## Relevant docs

- [Authentication](../docs/authentication/index.md)
- [Authentication FAQ](../docs/authentication/faq.md)
- [Authentication Troubleshooting](../docs/authentication/troubleshooting.md)
- [Webhooks](../docs/webhooks/index.md)
