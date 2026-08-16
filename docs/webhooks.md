# Webhooks

Webhooks let NomaSign push real-time notifications to your backend when signing events happen. They are the completion signal for an integration: send a document, then wait for the webhook instead of polling.

## How it works

1. You configure a **webhook URL** and receive a **webhook secret** in your integration entry (NomaSign web app → Integration page).
2. When an event occurs, NomaSign sends a `POST` to your URL with a JSON payload.
3. Your backend **verifies the HMAC-SHA256 signature** before processing the event.
4. You respond with `2xx` quickly — heavy processing should happen asynchronously.

## Event types

| Event | Fires when |
|-------|-----------|
| `signing_participant.signed` | One signer has completed signing |
| `signing_session.completed` | All signers have completed — the session is done |
| `signing_session.declined` | A signer declined to sign |
| `signing_session.cancelled` | The session was cancelled by the sender |

## Delivery format

```http
POST /your-webhook-endpoint HTTP/1.1
Content-Type: application/json
X-NomaSign-Event-Id: evt_...
X-NomaSign-Event-Type: signing_session.completed
X-NomaSign-Delivery-Id: 7f3c...
X-NomaSign-Signature: t=1719849600,v1=5257a869e7ecebeda32affa62cdca3fa51cad7e77a0e56ff536d0ce8e108d8bd
X-NomaSign-Environment: production
```

```json
{
  "id": "evt_...",
  "type": "signing_session.completed",
  "apiVersion": "1",
  "createdAt": "2026-07-01T12:00:00Z",
  "session": {
    "id": "abc-123",
    "templateId": "template-456",
    "completedAt": "2026-07-01T12:00:00Z",
    "recipients": [
      { "label": "Signer 1", "name": "Thabo Nkosi", "email": "thabo.nkosi@nomasign.com", "status": "signed", "signedAt": "2026-07-01T11:59:58Z" }
    ],
    "documents": [
      { "document": "contract.pdf", "cloudDocumentId": "b!x1...", "fields": [] }
    ]
  }
}
```

See `WebhookPayload` in [`IntegrationApiDtos.cs`](../.NET%20and%20React/Backend/Signing/Models/IntegrationApiDtos.cs) for the full parsed shape.

## Signature verification (HMAC-SHA256)

The signature header follows a Stripe-style format:

```
X-NomaSign-Signature: t=<unix_timestamp>,v1=<hex_hmac>
```

**Verification steps:**

1. Extract `t` (timestamp) and `v1` (signature) from the header.
2. Construct the signed payload: `{t}.{raw_request_body}` (timestamp + dot + raw body — read the raw body *before* any JSON parsing).
3. Compute HMAC-SHA256 of that string using your webhook secret as the key.
4. Compare your computed signature with `v1` using a **timing-safe comparison**.
5. Reject if `t` is too far in the past (replay protection — recommended: 5 minutes).

### C# example

```csharp
public static bool VerifySignature(string header, string body, string secret)
{
    var parts = header.Split(',')
        .Select(p => p.Split('=', 2))
        .ToDictionary(p => p[0], p => p[1]);

    var timestamp = parts["t"];
    var signature = parts["v1"];

    var signedPayload = $"{timestamp}.{body}";
    using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
    var computed = Convert.ToHexString(
        hmac.ComputeHash(Encoding.UTF8.GetBytes(signedPayload))
    ).ToLowerInvariant();

    return CryptographicOperations.FixedTimeEquals(
        Encoding.UTF8.GetBytes(computed),
        Encoding.UTF8.GetBytes(signature)
    );
}
```

## Delivery rules

- If your endpoint doesn't respond `2xx`, NomaSign retries with exponential backoff; after exhausting retries the event is dropped — design for reconciliation of missed events.
- The same event may be delivered more than once — make your handler **idempotent** (use the delivery/event id as a deduplication key).
- Respond within a few seconds; queue longer work.
- One webhook URL per integration entry — fan out internally if multiple services need the event.
- The **webhook secret** and the **refresh token** are separate credentials generated together; regenerating creates a new pair and invalidates the old one.

## Security requirements

- **Always verify the signature** before processing — never trust an unverified payload.
- **Use HTTPS** — webhook URLs must be TLS-encrypted and publicly reachable (use a tunnel during local development, see the [example app README](../.NET%20and%20React/README.md)).
- **Reject replays** — check the `t` timestamp against the current time.
- **Don't leak the secret** — treat it like a password; store it in a secrets manager.

## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| Webhook never arrives | URL not publicly reachable, or wrong URL in integration entry | Verify the URL is HTTPS, publicly reachable, and matches your deployed endpoint path |
| Signature verification fails | Wrong secret, or body was modified before verification | Read the raw request body before any parsing; verify you're using the current webhook secret |
| Events arrive late, out of order, or twice | Retry backoff | Make your handler idempotent and order-independent |
| Works in dev but not production | Tunnel URL expired, or production URL differs | Update the integration entry's webhook URL |
| "Webhook secret not configured" in the demo | Secret wasn't saved via the config step | Save it through the demo UI or `POST /api/signing/config/webhook-secret` |

## How the demo implements this

| Layer | File |
|---|---|
| Webhook endpoint | `Backend/Signing/Controllers/WebhooksController.cs` → `Receive` |
| Signature verification | `Backend/Signing/Services/WebhookService.cs` |
| Secret retrieval | `Backend/Infra/ISecretStore.cs` → `GetSecretAsync("nomasign-webhook-secret")` |
| Config endpoint | `Backend/Signing/Controllers/ConfigController.cs` → `SetWebhookSecret` |
