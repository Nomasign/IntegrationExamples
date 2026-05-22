# Receiving Webhook Notifications

> **This step is optional.** You can use the NomaSign Integration API (authenticate, list templates, send documents) without setting up webhooks. Webhooks add real-time notifications when signing events occur.

## Overview

When a signing session changes state (completed, declined, cancelled, or a participant signs), NomaSign delivers an HMAC-signed POST request to your configured webhook endpoint. Your server verifies the signature and processes the event.

## Prerequisites

- A publicly reachable HTTPS endpoint (deployed server, Azure Function, or a tunnel like [ngrok](https://ngrok.com) for local development)
- Your **Webhook Secret** (generated in [Step 4](./04-creating-a-refresh-token-and-webhook-secret.md))

## Events

| Event Type | Fires When |
|---|---|
| `signing_session.completed` | All participants have signed (enabled by default) |
| `signing_session.declined` | Any participant declined |
| `signing_session.cancelled` | The sender cancelled the session |
| `signing_participant.signed` | A single participant signed (fires per signer) |

## Payload Shape

```json
{
  "id": "evt_01J...",
  "type": "signing_session.completed",
  "apiVersion": "2026-05-01",
  "createdAt": "2026-05-22T12:34:56Z",
  "environment": "production",
  "session": {
    "id": "...",
    "organizationId": "...",
    "templateId": "...",
    "completedAt": "...",
    "participants": [
      {
        "id": "...",
        "name": "Jane Doe",
        "email": "jane@example.com",
        "role": "otp",
        "signedAt": "2026-05-22T12:34:56Z"
      }
    ],
    "documents": [
      {
        "id": "...",
        "name": "Agreement.pdf",
        "signingLayer": {
          "fields": [
            {
              "id": "...",
              "name": "Full Name",
              "type": "Text",
              "participantId": "...",
              "value": "Jane Doe"
            }
          ]
        }
      }
    ]
  }
}
```

## Security Headers

Every delivery includes these headers:

| Header | Purpose |
|---|---|
| `X-NomaSign-Signature` | `t=<unix_ts>,v1=<hex_hmac>` — HMAC-SHA256 signature |
| `X-NomaSign-Event-Id` | Unique event ID (use as idempotency key) |
| `X-NomaSign-Event-Type` | e.g. `signing_session.completed` |
| `X-NomaSign-Delivery-Id` | Unique delivery attempt ID |
| `X-NomaSign-Environment` | `production`, `staging`, or `dev` |

## Verifying the Signature

The `X-NomaSign-Signature` header follows Stripe's format: `t=<unix_timestamp>,v1=<hex_hmac>`.

The signed string is: `<unix_timestamp>.<raw_request_body>`

### Node.js Example

```javascript
const crypto = require("crypto");

function verifySignature(rawBody, signatureHeader, secret) {
  const parts = signatureHeader.split(",");
  const timestamp = parts.find(p => p.startsWith("t="))?.slice(2);
  const signature = parts.find(p => p.startsWith("v1="))?.slice(3);

  if (!timestamp || !signature) return false;

  // Reject events older than 5 minutes (replay protection)
  const age = Math.abs(Date.now() / 1000 - parseInt(timestamp));
  if (age > 300) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expected, "hex")
  );
}
```

### C# Example

```csharp
using System.Security.Cryptography;
using System.Text;

bool VerifySignature(string rawBody, string signatureHeader, string secret)
{
    var parts = signatureHeader.Split(',');
    var timestamp = parts.FirstOrDefault(p => p.StartsWith("t="))?[2..];
    var signature = parts.FirstOrDefault(p => p.StartsWith("v1="))?[3..];

    if (timestamp == null || signature == null) return false;

    // Replay protection: reject events older than 5 minutes
    var age = Math.Abs(DateTimeOffset.UtcNow.ToUnixTimeSeconds() - long.Parse(timestamp));
    if (age > 300) return false;

    var signedPayload = $"{timestamp}.{rawBody}";
    using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
    var expected = Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(signedPayload))).ToLower();

    return CryptographicOperations.FixedTimeEquals(
        Encoding.UTF8.GetBytes(signature),
        Encoding.UTF8.GetBytes(expected));
}
```

## Delivery & Retries

- **Timeout:** 10 seconds per attempt. Respond with a 2xx within that window.
- **Retry schedule:** immediate → +1 min → +5 min → +30 min → +24 h → +25 h (max 6 attempts).
- **Auto-disable:** After 20 consecutive failures, the endpoint is disabled and an alert email is sent.
- **Idempotency:** Use `X-NomaSign-Event-Id` to deduplicate — retries send the same event ID.

## Best Practices

1. **Respond fast** — return 200 immediately, then process the event asynchronously (queue it).
2. **Verify every request** — always check the HMAC signature before processing.
3. **Enforce the 5-minute replay window** — reject events with stale timestamps.
4. **Use constant-time comparison** — prevents timing attacks on the signature.
5. **Handle duplicates** — store processed event IDs and skip re-deliveries.
6. **Keep processing idempotent** — the same event may arrive more than once.

## Local Development

To receive webhooks locally, expose your backend via a tunnel:

```bash
# Using ngrok (free tier available)
ngrok http 5203

# Then configure your webhook URL in the NomaSign web app:
# https://<your-subdomain>.ngrok.io/api/webhooks/nomasign
```

The example app's backend already includes a `POST /api/webhooks/nomasign` endpoint that verifies signatures and logs received events.

## Configuring in NomaSign

1. Log into the [NomaSign web app](https://app.nomasign.com) and go to **Integration**
2. Create or edit your integration entry
3. Set your **Webhook URL** (must be HTTPS)
4. Choose which events to receive
5. Use **Send Test Event** to verify your endpoint works

---

**Previous:** [← Creating a Refresh Token & Webhook Secret](./04-creating-a-refresh-token-and-webhook-secret.md)

**Done!** Your integration can now receive real-time notifications. Head back to the [main README](../README.md) for the full example.
