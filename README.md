# NomaSign Integration Examples

A full-stack example (.NET + React) showing how to integrate with the [NomaSign](https://www.nomasign.com) signing platform: authenticate, send a template for signature, and receive webhook notifications.

## Where to find what

| Resource | What it's for |
|---|---|
| [Setup guide](https://www.nomasign.com/api/steps/) | Create your NomaSign account, integration account, template, and credentials — do this first |
| [API reference](https://integration.nomasign.com/docs) | The authoritative interactive contract: endpoints, schemas, response codes, example payloads |
| [Example app](.NET%20and%20React/README.md) | Runnable full-stack demo — clone, configure, run |
| [Templates guide](docs/templates.md) | How to design templates that are good to integrate against |
| [Direct send guide](docs/sessions.md) | Send your own generated PDFs for signature and get signing links back |
| [Webhooks guide](docs/webhooks.md) | Event types and HMAC-SHA256 signature verification, with code |

## Quick start

**1. Get credentials** — follow the [setup guide](https://www.nomasign.com/api/steps/) to create an integration account and generate a **Refresh Token** and **Webhook Secret**.

**2. Exchange the refresh token for an access token** (~1 hour lifetime; cache it and re-exchange on expiry):

```bash
curl -X POST "https://integration.nomasign.com/connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "refresh_token=YOUR_REFRESH_TOKEN"
```

Store the refresh token in a secrets manager — never in source code or frontend code. The access token is used as a `Bearer` token on all API calls and should never leave your backend.

**3. Send a template for signature:**

```bash
curl -X POST "https://integration.nomasign.com/api/templates/send" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "YOUR_TEMPLATE_ID",
    "signingRequests": [{
      "recipients": [
        { "label": "Signer 1", "name": "Jane Smith", "email": "jane.smith@nomasign.com" }
      ]
    }]
  }'
```

**4. Receive webhooks** when signing completes — see the [webhooks guide](docs/webhooks.md).

## Run the example app

The [.NET and React example](.NET%20and%20React/README.md) walks through the same flow with a UI: paste your credentials, list your templates, send one, and watch the webhook arrive. See its README for prerequisites and run instructions.
