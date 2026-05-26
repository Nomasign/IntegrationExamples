# Creating a Signing Template

Templates are reusable document structures. Think of an employment contract — you always want to swap out the name, the date, and who's signing, but the whole structure stays the same. That's a template.

Your integration will instantiate a template each time it sends a document, filling in the variable parts (recipient details, field values) via the API.

## Important: Template scope

Templates are **user-scoped**. The Integration API can only access templates created by the integrator account. Templates created by other users (admins, members) in your organization are not visible to the API.

This means: **you must create your API templates while logged in as the integrator account.**

## Steps

While logged in as the **integrator account**:

1. Go to **Templates** in the sidebar
2. Click **Create Template**
3. Upload a document (PDF or Word — Word files are converted to PDF)
4. Add at least one **recipient placeholder** (e.g. `Signer 1`)
5. Place a **signature field** on the document for that recipient
6. Optionally add other fields (name, date, custom text) that your API calls can pre-fill
7. **Save** the template

## Recipient placeholders and the API

A **recipient placeholder** is a named slot in the template that gets filled with a real person when you send via API. The placeholder label (e.g. `Signer 1`) is what your API payload uses to map a real name/email to that slot.

Example: if your template has a placeholder called `Signer 1`, your API call maps a real person to it:

```json
{
  "signingRequests": [{
    "recipients": [{
      "label": "Signer 1",
      "name": "Jane Smith",
      "email": "jane@example.com"
    }]
  }]
}
```

> **Placeholder labels are case-sensitive.** If your template says `Signer 1`, your API payload must use `"label": "Signer 1"` exactly.

## Pre-fillable fields and naming

Any text fields you add to the template can be pre-filled by the API using their **label**. Give each field a clear, stable, developer-friendly name:

| Good names | Bad names |
|---|---|
| `customer_name` | `Text 1` |
| `contract_start_date` | `Field 2` |
| `salary_amount` | `Input` |

Fields are referenced in the API payload like this:

```json
{
  "signingRequests": [{
    "recipients": [{ "label": "Signer 1", "name": "Jane Smith", "email": "jane@example.com" }],
    "fields": [
      { "label": "customer_name", "recipient": "Signer 1", "value": "Jane Smith" },
      { "label": "contract_start_date", "recipient": "Signer 1", "value": "2026-06-01" }
    ]
  }]
}
```

## Finding your Template ID

After saving, note the **template ID** — you'll see it in:
- The URL bar when viewing the template (e.g. `.../templates/{id}`)
- The API response from `GET /api/templates` (the example app calls this and lists templates for you)

This ID is what your integration passes to `POST /api/templates/{id}/send`.

## Before using a template via API

Checklist:

- [ ] Every signer has at least one required signature field
- [ ] All API-filled fields have clear, stable names
- [ ] Recipient placeholder labels are final (changing them breaks API calls)
- [ ] You've tested the template manually in the UI at least once (send it to yourself)
- [ ] The template was created by the integrator account (not another user)

> **Warning:** Renaming recipient placeholders or field labels after going live will break existing API integrations. Treat production templates like versioned contracts — clone before making changes.

> **Stuck?** See the [FAQ](./faq.md) or [Troubleshooting](./troubleshooting.md) for common template issues (API can't see templates, field mismatches, etc.).

---

**Previous:** [← Creating an Integration Account](../step-2/index.md) | **Next:** [Creating a Refresh Token & Webhook Secret →](../step-4/index.md)
