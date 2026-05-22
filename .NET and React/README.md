# .NET and React Integration Example

A full-stack example app that demonstrates sending documents for signature and receiving webhook notifications via the NomaSign Integration API.

## Prerequisites

You need a NomaSign integration account with a **Refresh Token** and **Webhook Secret**.

👉 **[Follow the integration setup guide on nomasign.com](https://www.nomasign.com/integrate)** to create your account and generate credentials.

You'll also need at least one **Signing Template** — go to **Templates** in the web app, create a template with at least one recipient placeholder and signature field.

## Technical Requirements

- .NET 8 SDK
- Node.js 18+
- pnpm

## Configuration

Edit `Backend/appsettings.json`:

```json
{
  "NomaSign": {
    "BaseUrl": "https://integration-api.nomasign.com",
    "ClientId": "nomasign-integration"
  }
}
```

> **Refresh Token** and **Webhook Secret** are configured at runtime via the example app UI — no secrets in config files.

## Running

### Backend

```bash
cd ".NET and React/Backend"
dotnet run
```

The API starts on `http://localhost:5203`. Swagger UI is available at `http://localhost:5203/swagger`.

### Frontend

```bash
cd ".NET and React/frontend"
pnpm install
pnpm dev
```

The UI starts on `http://localhost:3000`.

## Receiving Webhooks Locally

NomaSign needs to reach your backend to deliver webhook notifications. For local development, use a tunnel:

- [VS Code Dev Tunnels](https://learn.microsoft.com/en-us/azure/developer/dev-tunnels/)
- [ngrok](https://ngrok.com/)

Set your tunnel URL + `/api/webhooks/nomasign` as the webhook endpoint in the NomaSign Integration page.
