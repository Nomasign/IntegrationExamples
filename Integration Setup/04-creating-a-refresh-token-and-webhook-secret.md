# Creating a Refresh Token & Webhook Secret

The final setup step is creating your integration entry and generating the credentials your application needs to authenticate and verify webhooks.

## Steps

### 1. Add a New Integration

On the **Integration** page, click **Add Integration**, fill out the required fields, and save.

![Add new integration form](./images/step-6.png)

### 2. Activate the Integration

Activate your newly created integration to enable API access.

![Activate integration toggle](./images/step-7.png)

### 3. Generate Tokens

Click **Generate Tokens**. You'll receive:

- **Refresh Token** — used to obtain short-lived access tokens via `POST /connect/token`
- **Webhook Secret** — used to verify HMAC-SHA256 signatures on incoming webhook events

![Generate tokens dialog](./images/step-8.png)

> ⚠️ **Copy both values immediately** — they're only shown once. If you lose them, you'll need to regenerate.

## What You'll Use These For

| Credential | Purpose |
|---|---|
| **Refresh Token** | Exchanged for an Access Token to authenticate all API calls |
| **Webhook Secret** | Verifies that incoming webhook payloads are genuinely from NomaSign (HMAC-SHA256) |

## Security Notes

- Never commit your Refresh Token or Webhook Secret to source control
- Store them in environment variables or a secrets manager in production
- The example app accepts the Refresh Token via the UI for demo purposes only

---

---

**Previous:** [← Creating a Signing Template](./03-creating-a-signing-template.md)

**Done!** You now have everything you need. Head back to the [main README](../README.md) to run the example app.
