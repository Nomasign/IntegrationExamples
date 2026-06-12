# Integration Setup Tutorial

Welcome to the NomaSign Integration Setup guide. This section walks you through everything you need before you can start sending documents for signature via the API.

## What is a NomaSign Integration?

A NomaSign integration lets you send documents for signature, pre-fill recipient details and custom fields, and receive real-time webhook notifications — all from your own system. Whether you're connecting a CRM, HR platform, or custom application, the Integration API handles the signing workflow while you control when and how documents are sent.

## How It Works

1. **Authenticate** — exchange your Refresh Token for a short-lived Access Token via `POST /connect/token`
2. **Send a Document** — call `POST /api/templates/send` with the template ID, recipient details, and field values. NomaSign creates a signing session and emails the document to the signer.
3. **Receive Webhooks** — NomaSign sends HMAC-signed webhook events to your endpoint when documents are signed, declined, or cancelled.

## What You Can Build

- **Automated document sending** — trigger signature requests from your CRM, HR system, or any backend
- **Real-time status updates** — receive webhook notifications the moment a document is signed, declined, or cancelled
- **Template automation** — create templates once in the web app, then instantiate them via API with different recipients each time
- **Custom workflows** — combine sending and webhooks to build fully automated document flows (onboarding, contracts, compliance)

## Setup Steps

Follow these guides in order:

1. [Creating a NomaSign Account](step-1.md)
2. [Creating an Integration Account](step-2.md)
3. [Creating a Signing Template](step-3.md)
4. [Creating a Refresh Token & Webhook Secret](step-4.md)
5. [Receiving Webhook Notifications](step-5.md) *(optional)*

Once you've completed steps 1–4, head back to the [main README](../README.md) to run the example app. Step 5 covers webhook notifications — useful when you want real-time event updates, but not required to send documents.

## Reference documentation

For deeper technical details, see the [domain docs](../docs/README.md):
- [Accounts & Roles](../docs/accounts/index.md)
- [Authentication](../docs/authentication/index.md)
- [Templates](../docs/templates/index.md)
- [Webhooks](../docs/webhooks/index.md)
