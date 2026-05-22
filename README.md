# NomaSign Integration Examples

A full-stack example showing how to integrate with the NomaSign signing platform using the Integration API.

## Prerequisites

Before running the example app, you need a NomaSign integration account with a **Refresh Token** and **Webhook Secret**.

👉 **[Follow the Integration Setup guide](./Integration%20Setup/README.md)** for step-by-step instructions with screenshots.

You'll need:

- **A NomaSign account** with a plan that supports integrations ([app.nomasign.com](https://app.nomasign.com))
- **An Integration account** — a dedicated email (e.g. `signing@yourdomain.com`) invited with the **Integrator** role
- **At least one Signing Template** — with recipient placeholders and signature fields
- **A Refresh Token & Webhook Secret** — generated from the Integration page

## Technical Requirements

- .NET 8 SDK
- Node.js 18+
- pnpm

## Setup

### 1. Configure the backend

Edit `.NET and React/Backend/appsettings.json`:

```json
{
  "NomaSign": {
    "BaseUrl": "https://integration-api.nomasign.com",
    "ClientId": "nomasign-integration"
  }
}
```

> **Refresh Token** and **Webhook Secret** are configured at runtime via the example app UI — no need to put secrets in config files.

### 2. Run the backend

```bash
cd ".NET and React/Backend"
dotnet run
```

The API will start on `http://localhost:5203`. Swagger UI is at `http://localhost:5203/swagger`.

### 3. Run the frontend

```bash
cd ".NET and React/frontend"
pnpm install
pnpm dev
```

The UI will start on `http://localhost:3000`.

### 4. Configure your webhook URL

In the NomaSign web-app Integration page, set your webhook endpoint to:

```
http://localhost:5203/api/webhooks/nomasign
```

> **Note:** For local development, you'll need a tunnel (e.g. [VS Code Dev Tunnels](https://learn.microsoft.com/en-us/azure/developer/dev-tunnels/), [ngrok](https://ngrok.com/)) so NomaSign can reach your localhost.

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for the system diagram and a breakdown of what's demonstrated.

## Key files

| File | Purpose |
|------|---------|
| `.NET and React/Backend/Program.cs` | All API endpoints — token exchange, template proxy, webhook receiver |
| `.NET and React/frontend/src/app/integration-demo.tsx` | UI walking through the integration flow |
