# .NET and React Integration Example

A full-stack example app that demonstrates sending documents for signature and receiving webhook notifications via the NomaSign Integration API.

## Prerequisites

You need a NomaSign account with integration access and the credentials described below.

### 1. Create a NomaSign Account

Sign up at [nomasign.com](https://www.nomasign.com) and select a **Business** plan or higher (integration features are not available on the Free plan).

### 2. Enable Integration

1. Log in to [app.nomasign.com](https://app.nomasign.com)
2. Navigate to **Integration** in the sidebar
3. Follow the prompts to activate your integration profile — this provisions your API access and enables the token/webhook management UI

### 3. Generate a Refresh Token

The refresh token allows your backend to exchange for short-lived access tokens without user interaction.

1. On the Integration page, click **Generate Token**
2. Copy the token immediately — it's only shown once
3. Store it securely (treat it like a password)

### 4. Configure a Webhook + Secret (HMAC)

The webhook secret is used to verify that incoming payloads genuinely come from NomaSign (HMAC-SHA256 signature validation).

1. Scroll to the **Webhooks** section on the Integration page
2. Create a webhook endpoint — set the URL to your backend (e.g. `https://your-tunnel.dev/api/webhooks/nomasign`)
3. Select which events to subscribe to (e.g. Session Completed, Participant Signed)
4. Copy the **Signing Secret** shown in the webhook credentials section

### 5. Create a Signing Template

You need at least one signing template to send documents via the API.

1. Go to **Templates** in the sidebar
2. Create a template with at least one recipient placeholder and signature field
3. Note the template ID (visible in the URL or via the API)

## Technical Prerequisites

- .NET 8 SDK
- Node.js 18+
- pnpm

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
