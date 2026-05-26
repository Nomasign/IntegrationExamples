# Receiving Webhook Notifications

> **This step is optional.** You can use the NomaSign Integration API (authenticate, list templates, send documents) without setting up webhooks. Webhooks add real-time notifications when signing events occur.

## Overview

When a signing session changes state (completed, declined, cancelled, or a participant signs), NomaSign delivers an HMAC-signed POST request to your configured webhook endpoint. Your server verifies the signature and processes the event.

## Prerequisites

- A publicly reachable HTTPS endpoint (deployed server, Azure Function, or a tunnel for local development)
- Your **Webhook Secret** (generated in [Step 4](../step-4/index.md))

## Events

| Event Type | Fires When |
|---|---|
| `signing_session.completed` | All participants have signed |

> **Note:** Additional event types (declined, cancelled, per-participant signed) may be added in the future.

## Payload Shape

Every webhook delivery is a JSON POST with the following structure. Here's a complete example for a `signing_session.completed` event:

```json
{
  "id": "evt_01J8XYZABC123",
  "type": "signing_session.completed",
  "apiVersion": "2026-05-01",
  "createdAt": "2026-05-26T14:32:00Z",
  "environment": "production",
  "session": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "organizationId": "org_abc123",
    "templateId": "tpl_def456",
    "status": "completed",
    "completedAt": "2026-05-26T14:31:58Z",
    "recipients": [
      {
        "label": "Signer 1",
        "name": "Jane Doe",
        "email": "jane@example.com",
        "status": "signed",
        "signedAt": "2026-05-26T14:31:58Z"
      }
    ],
    "documents": [
      {
        "document": "Employment Agreement.pdf",
        "cloudDocumentId": "doc_789xyz",
        "fields": [
          {
            "label": "customer_name",
            "type": "Text",
            "recipient": "Signer 1",
            "value": "Jane Doe"
          },
          {
            "label": "contract_start_date",
            "type": "Text",
            "recipient": "Signer 1",
            "value": "2026-06-01"
          }
        ]
      }
    ]
  }
}
```

### Payload field reference

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique event ID — use as idempotency key |
| `type` | string | Event type (see Events table above) |
| `apiVersion` | string | API version that generated this event |
| `createdAt` | ISO 8601 | When the event was created |
| `environment` | string | `production`, `staging`, or `dev` |
| `session.id` | UUID | Signing session ID |
| `session.templateId` | string | Template that was instantiated |
| `session.status` | string | `completed`, `declined`, or `cancelled` |
| `session.recipients[]` | array | Each recipient with their signing status |
| `session.documents[]` | array | Each document with filled field values |

> **Forward-compatible:** New fields may be added to payloads over time. Your handler should ignore unknown properties — do not fail on unexpected keys.

## Critical: Raw body handling

The HMAC signature is calculated over the **exact raw bytes** of the HTTP request body. This is the single most common source of webhook verification failures.

**You must:**
- Read the raw request body as bytes/string **before** any JSON parsing or model binding
- Never re-serialize parsed JSON and verify against that (whitespace and key order will differ)
- Ensure your framework's body parser hasn't consumed or modified the body before you read it

### ASP.NET Core — reading raw body

```csharp
[HttpPost("nomasign")]
public async Task<IActionResult> Receive()
{
    // Read raw body BEFORE any model binding
    using var reader = new StreamReader(Request.Body);
    var rawBody = await reader.ReadToEndAsync();

    var signatureHeader = Request.Headers["X-NomaSign-Signature"].FirstOrDefault();
    // ... verify signature using rawBody ...
}
```

### Express.js — reading raw body

```javascript
// Must configure express to preserve raw body
app.use("/api/webhooks/nomasign", express.raw({ type: "application/json" }));

app.post("/api/webhooks/nomasign", (req, res) => {
  const rawBody = req.body.toString("utf8");
  const signatureHeader = req.headers["x-nomasign-signature"];
  // ... verify signature using rawBody ...
});
```

## Security Header

Every delivery includes this header:

| Header | Purpose |
|---|---|
| `X-NomaSign-Signature` | `t=<unix_ts>,v1=<hex_hmac>` — HMAC-SHA256 signature |

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
- **Idempotency:** Use the payload's `id` field to deduplicate — retries send the same event ID.

## Best Practices

1. **Respond fast** — return 200 immediately, then process the event asynchronously (queue it).
2. **Verify every request** — always check the HMAC signature before processing.
3. **Enforce the 5-minute replay window** — reject events with stale timestamps.
4. **Use constant-time comparison** — prevents timing attacks on the signature.
5. **Handle duplicates** — store processed event IDs and skip re-deliveries.
6. **Keep processing idempotent** — the same event may arrive more than once.

## Local Development

To receive webhooks on your local machine, you need a public URL that tunnels traffic to your localhost backend. We recommend **VS Code Dev Tunnels** — they're free, built into VS Code, require no third-party signup, and provide HTTPS by default.

### Option A: VS Code UI (Easiest)

1. Open the **Ports** panel in VS Code (Terminal → Ports tab, or `Ctrl+Shift+P` → "Ports: Focus on Ports View")
2. Click **Forward a Port** and enter `5203` (the example backend port)
3. Set visibility to **Public** (right-click the row → Port Visibility → Public)
4. Copy the generated URL (e.g. `https://abc123-5203.euw.devtunnels.ms`)
5. In the NomaSign web app, set your webhook URL to:  
   `https://abc123-5203.euw.devtunnels.ms/api/signing/webhooks/nomasign`

> **Tip:** The tunnel stays active as long as VS Code is open. Restart it from the Ports panel if disconnected.

### Option B: CLI

If you prefer the command line:

```bash
# Install the Dev Tunnels CLI (one-time)
# Windows: winget install Microsoft.devtunnel
# macOS:   brew install --cask devtunnel
# Linux:   curl -sL https://aka.ms/DevTunnelCliInstall | bash

# Login (one-time)
devtunnel user login

# Create and start a tunnel for your backend port
devtunnel host -p 5203 --allow-anonymous
```

The CLI outputs a URL like `https://abc123-5203.euw.devtunnels.ms`. Set your webhook endpoint to:

```
https://<your-tunnel-url>/api/signing/webhooks/nomasign
```

### Verifying It Works

1. Start your backend (`dotnet run` in the Backend folder)
2. Start the tunnel (VS Code Ports panel or CLI)
3. In the NomaSign web app → Integration page → set your webhook URL to the tunnel URL + `/api/signing/webhooks/nomasign`
4. Click **Send Test Event** in the NomaSign UI
5. Check your backend logs — you should see the event received and verified
6. In the example app UI at `http://localhost:4999`, click "Refresh" in the Webhook section to see the logged event

> **Stuck?** See the [FAQ](./faq.md) or [Troubleshooting](./troubleshooting.md) for signature failures, tunnel issues, retries, and more.

## Configuring in NomaSign

1. Log into the [NomaSign web app](https://app.nomasign.com) and go to **Integration**
2. Create or edit your integration entry
3. Set your **Webhook URL** (must be HTTPS)
4. Choose which events to receive
5. Use **Send Test Event** to verify your endpoint works

---

**Previous:** [← Creating a Refresh Token & Webhook Secret](../step-4/index.md)

**Done!** Your integration can now receive real-time notifications. Head back to the [main README](../../README.md) for the full example.
