# .NET and React Integration Example

A full-stack example app that demonstrates sending documents for signature and receiving webhook notifications via the NomaSign Integration API.

## Prerequisites

You need a NomaSign integration account with a **Refresh Token** and **Webhook Secret**.

👉 **[Follow the integration setup guide on nomasign.com](https://www.nomasign.com/integrate)** to create your account and generate credentials.

You'll also need at least one **Signing Template** — go to **Templates** in the web app, create a template with at least one recipient placeholder and signature field.

## Technical Requirements

- .NET 8 SDK
- Node.js 18+
- [pnpm](https://pnpm.io/installation) — install with `npm install -g pnpm` or see [pnpm docs](https://pnpm.io/installation) for other methods

## Configuration

The backend reads its configuration from `Backend/appsettings.json`. The defaults point to the **production** Integration API — no changes needed unless targeting a different environment.

> **Refresh Token** and **Webhook Secret** are configured at runtime via the example app UI — no secrets in config files.
>
> You can also change the Integration API URL from the UI at runtime (useful for switching between environments).

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

The UI starts on `http://localhost:4999`.

## Receiving Webhooks Locally

NomaSign needs to reach your backend to deliver webhook notifications. For local development, use **VS Code Dev Tunnels** (recommended):

```bash
# In VS Code: Ctrl+Shift+P → "Dev Tunnels: Create Tunnel"
# Or via CLI:
devtunnel create --allow-anonymous
devtunnel port create -p 5203
devtunnel host
```

Then set your tunnel URL + `/api/signing/webhooks/nomasign` as the webhook endpoint in the NomaSign Integration page.

> **Why VS Code Dev Tunnels?** They're free, built into VS Code, require no third-party signup, and support HTTPS by default. See [Microsoft Dev Tunnels docs](https://learn.microsoft.com/en-us/azure/developer/dev-tunnels/) for details.
