# Step 5 — Receiving Webhook Notifications

> **This step is optional.** You can send documents via API without webhooks. Webhooks add real-time notifications when signing events occur.

## Overview

When a signing session changes state, NomaSign delivers an HMAC-signed POST to your configured webhook endpoint. Your server verifies the signature and processes the event.

## Prerequisites

- A publicly reachable HTTPS endpoint (or a tunnel for local development)
- Your **Webhook Secret** (generated in [Step 4](step-4.md))

## Local development with Dev Tunnels

To receive webhooks locally, you need a public URL that tunnels to your backend.

### VS Code UI (Easiest)

1. Open the **Ports** panel (Terminal → Ports tab)
2. Click **Forward a Port** → enter `5203`
3. Set visibility to **Public** (right-click → Port Visibility → Public)
4. Copy the URL (e.g. `https://abc123-5203.euw.devtunnels.ms`)
5. Set webhook URL to: `<tunnel-url>/api/signing/webhooks/nomasign`

Other options are ngrok, outside the scope of this doc.

### CLI

```bash
devtunnel user login
devtunnel host -p 5203 --allow-anonymous
```

Set webhook URL to: `<tunnel-url>/api/signing/webhooks/nomasign`

## Configuring in NomaSign @confirm

1. Go to **Integration** page in the NomaSign web app
2. Edit your integration entry
3. Set your **Webhook URL** (must be HTTPS)
4. Use **Send Test Event** to verify your endpoint works

## Verifying it works

1. Start your backend (`dotnet run`)
2. Start the tunnel
3. Set webhook URL in NomaSign to tunnel URL + `/api/signing/webhooks/nomasign`
4. Click **Send Test Event** in NomaSign
5. Check backend logs for the received event

---

**Previous:** [← Creating a Refresh Token & Webhook Secret](step-4.md)

**Done!** Head back to the [main README](../README.md) to run the example app.

## Relevant docs

- [Webhooks](../docs/webhooks/index.md)
- [Webhooks FAQ](../docs/webhooks/faq.md)
- [Webhooks Troubleshooting](../docs/webhooks/troubleshooting.md)
- [Authentication](../docs/authentication/index.md)
