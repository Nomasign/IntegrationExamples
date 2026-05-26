# Accounts & Roles

This section covers the NomaSign account setup, subscription plans, and the integrator role required for API access.

## NomaSign account

You need an active NomaSign account to use the Integration API. The account provides:

- Access to the NomaSign web application
- Template creation and management
- Integration configuration page

> @confirm: Which plans should be used for Integration API access in this guide?

## The Integrator role

The **Integrator** is a specialized role in NomaSign that allows the account to act as a integration bridge.

- Has API access via refresh tokens
- Owns templates visible to the API
- Receives webhook notifications
- Is separate from Admin/Member roles.

### How to get the Integrator role

1. An **Admin** of the NomaSign organization goes to **Settings → Team**.
2. Invites a new team member (or modifies an existing one).
3. Assigns the **Integrator** role.
4. The invited user accepts and gains access to the Integration page.

> **Best practice:** Create a dedicated integrator account (e.g. `signme@yourcompany.com`) rather than using a personal admin account. This keeps API credentials independent of individual team members.

## Integration entries

Once you have the Integrator role, you manage **integration entries** on the Integration page:

| Field                      | Purpose                                                 |
| -------------------------- | ------------------------------------------------------- |
| **Name**                   | Label for your reference (e.g. "Production", "Staging") |
| **Active** toggle          | Must be active to use credentials                       |
| **Webhook Callback URL**   | Where NomaSign sends event notifications                |
| **Generate Tokens** button | Creates refresh token + webhook secret                  |

### Multiple entries

You can create multiple integration entries for different environments.

```shell
├── Production  → production refresh token, production webhook URL
├── Staging     → staging refresh token, staging webhook URL
└── Development → dev refresh token, ngrok/tunnel webhook URL
```

Each entry is fully independent — separate credentials, separate webhook URLs.

## Subscription expiry

Your access token's JWT includes a `subscription_expires_at` claim. The demo backend reads this to prevent using tokens beyond subscription expiry:

```json
{
  "sub": "user-uuid",
  "subscription_expires_at": "2026-12-31T23:59:59Z",
  ...
}
```

If your subscription lapses, API calls will fail even with a valid refresh token. Renew your plan to restore access.
