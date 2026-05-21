# .NET and React Integration Example

A full-stack example app that demonstrates sending documents for signature and receiving webhook notifications via the NomaSign Integration API.

## Prerequisites

- .NET 8 SDK
- Node.js 18+
- pnpm
- A NomaSign account (Business plan or higher)

## What you need from NomaSign

Before running this example you need two credentials from your NomaSign account:

### 1. Refresh Token

The refresh token allows your backend to exchange for short-lived access tokens without user interaction.

**To generate one:**

1. Log in to [app.nomasign.com](https://app.nomasign.com)
2. Navigate to **Integration** in the sidebar
3. Click **Generate Token**
4. Copy the token immediately — it's only shown once

### 2. Webhook Secret (HMAC)

The webhook secret is used to verify that incoming webhook payloads genuinely come from NomaSign (HMAC-SHA256 signature validation).

**To get your secret:**

1. In the Integration page, scroll to the **Webhooks** section
2. Create or edit a webhook endpoint
3. Set the URL to your backend's webhook endpoint (e.g. `https://your-tunnel.dev/api/webhooks/nomasign`)
4. Copy the **Signing Secret** shown in the webhook credentials section

### 3. A Signing Template

You need at least one signing template to send documents via the API.

1. Go to **Templates** in the sidebar
2. Create a template with at least one recipient placeholder and signature field
3. Note the template ID (visible in the URL or via the API)

## Configuration

Edit `Backend/appsettings.json` with your credentials:

```json
{
  "NomaSign": {
    "BaseUrl": "https://integration-api.nomasign.com",
    "ClientId": "nomasign-integration",
    "RefreshToken": "paste-your-refresh-token-here",
    "WebhookSecret": "paste-your-webhook-secret-here"
  }
}
```

> **Local development:** If running against a local instance of the Integration API, use `http://localhost:3010` as the BaseUrl.

## Running

### Backend

```bash
cd Backend
dotnet run
```

The API starts on `http://localhost:5203`. Swagger UI is available at `http://localhost:5203/swagger`.

### Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

The UI starts on `http://localhost:3000`.

## Receiving Webhooks Locally

NomaSign needs to reach your backend to deliver webhook notifications. For local development, use a tunnel:

- [VS Code Dev Tunnels](https://learn.microsoft.com/en-us/azure/developer/dev-tunnels/)
- [ngrok](https://ngrok.com/)

Set your tunnel URL + `/api/webhooks/nomasign` as the webhook endpoint in the NomaSign Integration page.
