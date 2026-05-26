# Accounts & Roles — FAQ

### Do I need a separate NomaSign account for the integration?

Recommended but not required. A dedicated integrator account (e.g. `integration@yourcompany.com`) keeps API credentials independent of personal accounts. If someone leaves your team, you don't lose API access.

### Can one person be both Admin and Integrator?

Yes. Roles are additive. An admin can also have the Integrator role.

### What happens to my integration if I downgrade my plan?

The integration entry remains but stops working. API calls will fail until you upgrade to a plan with Integration API access.

### Can I transfer templates between accounts?

Not directly via the API. You'd need to recreate the template on the target account.

### How many integration entries can I create?

There's no hard limit in practice. Create as many as you need for your environments.

### What's the difference between deactivating and deleting an entry?

- **Deactivate** — credentials stop working immediately but the entry (and its config) remain. Reactivate later to restore access with the same credentials.
- **Delete** — permanently removes the entry and invalidates all its credentials. Cannot be undone.

### Can multiple team members share one integrator account?

The account credentials (email/password) are shared, yes. But for API access, what matters is the refresh token — store it in a shared secrets manager rather than sharing login credentials.

### I accepted the integrator invite but don't see the Integration page

- Verify your subscription plan supports the Integration API.
- Hard-refresh the page (Ctrl+Shift+R).
- Check that the invite was for the Integrator role specifically (not just Member).
