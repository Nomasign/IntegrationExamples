# NomaSign Integration Examples

A full-stack example showing how to integrate with the NomaSign signing platform using the Integration API.

## Prerequisites

Before running the example app, you need a NomaSign integration account with a **Refresh Token** and **Webhook Secret**.

👉 **[Follow the Integration Setup Tutorial](./Integration%20Setup%20Tutorial%20(front%20to%20back)/README.md)** for step-by-step instructions with screenshots.

You'll need:

- **A NomaSign account** with a plan that supports integrations ([app.nomasign.com](https://app.nomasign.com)) — if you already have an account, just ensure your plan includes integration access
- **An Integration account** — a dedicated email (e.g. `signing@yourdomain.com`) invited with the **Integrator** role
- **At least one Signing Template** — with recipient placeholders and signature fields
- **A Refresh Token & Webhook Secret** — generated from the Integration page

## Technical Requirements

- .NET 8 SDK
- Node.js 18+
- [pnpm](https://pnpm.io/installation) — install with `npm install -g pnpm` or see [pnpm docs](https://pnpm.io/installation) for other methods

## Setup

### 1. Configure the backend

The backend reads its configuration from `.NET and React/Backend/appsettings.json`. The defaults point to the **production** Integration API — no changes are needed unless you're targeting a different environment.

> **Refresh Token** and **Webhook Secret** are configured at runtime via the example app UI — no need to put secrets in config files.
>
> You can also change the Integration API URL from the UI at runtime (useful for switching between environments).

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

The UI will start on `http://localhost:4999`.

### 4. Configure your webhook URL

In the NomaSign web-app Integration page, set your webhook endpoint to:

```
https://<your-tunnel-url>/api/signing/webhooks/nomasign
```

> **For local development**, you'll need a tunnel so NomaSign can reach your localhost. We recommend [VS Code Dev Tunnels](https://learn.microsoft.com/en-us/azure/developer/dev-tunnels/) — they're free, built into VS Code, and support HTTPS with no third-party signup.
>
> Quick setup:
> ```bash
> # In VS Code: Ctrl+Shift+P → "Dev Tunnels: Create Tunnel"
> # Or via CLI:
> devtunnel create --allow-anonymous
> devtunnel port create -p 5203
> devtunnel host
> ```

## Architecture & process docs

- [`docs/architecture/`](docs/architecture/README.md) — system diagram and what's demonstrated end-to-end
- [`docs/code-flow/`](docs/code-flow/) — per-step walkthrough of what happens behind each button in the demo UI

## Key files

| File | Purpose |
|------|---------|
| `.NET and React/Backend/Signing/Controllers/AuthController.cs` | `POST /api/signing/auth/token` — exchange refresh token for access token |
| `.NET and React/Backend/Signing/Controllers/ConfigController.cs` | `POST /api/signing/config/{refresh-token,webhook-secret,base-url}` |
| `.NET and React/Backend/Signing/Controllers/TemplatesController.cs` | `GET /api/signing/templates`, `POST /api/signing/templates/{id}/send` |
| `.NET and React/Backend/Signing/Controllers/WebhooksController.cs` | `POST /api/signing/webhooks/nomasign` — receives + HMAC-verifies deliveries |
| `.NET and React/Backend/Signing/Services/WebhookService.cs` | HMAC-SHA256 verification logic |
| `.NET and React/Backend/Signing/Services/NomaSignService.cs` | Access-token cache + Integration API orchestration |
| `.NET and React/frontend/src/app/integration-demo.tsx` | UI walking through the integration flow |
