# Step 3 — Creating a Signing Template @confirm we need screenshots

Templates are reusable document structures. Your integration instantiates a template each time it sends a document, filling in recipients and field values via the API.

> **Important:** Templates are user-scoped. The API can only access templates created by the integrator account. Log in as the integrator to create templates.

## Steps

While logged in as the **integrator account**:

1. Go to **Templates** in the sidebar
2. Click **Upload Template**
3. Upload a document.
4. Add at least one **recipient placeholder** (e.g. `Signer 1`)
5. Place a **signature field** on the document for that recipient
6. Optionally add text fields that your API calls can pre-fill
7. **Save** the template (top right button)

## Naming your fields

Give each field a clear, stable, developer-friendly label:

| Good names            | Bad names |
| --------------------- | --------- |
| `customer_name`       | `Text 1`  |
| `contract_start_date` | `Field 2` |
| `salary_amount`       | `Input`   |

> **Labels are case-sensitive.** Your API payload must match exactly.

## Finding your Template ID

After saving, note the template ID — visible in:

- The URL bar when viewing the template
- The API response from `GET /api/templates` in the integration sample app.

## Before going live

- [ ] Every signer has at least one required signature field
- [ ] All API-filled fields have clear, stable names
- [ ] Recipient placeholder labels are final (changing them breaks API calls)
- [ ] You've tested the template manually in the UI at least once
- [ ] The template was created by the integrator account

> **Warning:** Renaming placeholders or field labels after going live breaks existing integrations. Clone the template before making changes.

---

**Previous:** [← Creating an Integration Account](step-2.md) | **Next:** [Creating a Refresh Token & Webhook Secret →](step-4.md)

## Relevant docs

- [Templates](../docs/templates/index.md)
- [Templates FAQ](../docs/templates/faq.md)
- [Templates Troubleshooting](../docs/templates/troubleshooting.md)
