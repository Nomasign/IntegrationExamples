# Templates

Templates are reusable document structures — the recommended way to send documents through the Integration API. Think of an employment contract: the structure stays the same, but you swap out the name, the date, and who's signing each time. You design the template once in the NomaSign web app; each API call then only carries recipients and field values, which makes template sends the fastest and lightest calls the API offers.

> The full request/response contract (all parameters, response codes, example payloads) lives in the **interactive API reference** at [integration.nomasign.com/docs](https://integration.nomasign.com/docs). This page covers what the reference can't: how to design templates that are good to integrate against.

## Key concepts

### Template scope

Templates are **user-scoped**. The Integration API can only access templates created by the integrator account. Templates created by other users (admins, members) in your organization are not visible to the API.

### Recipient placeholders

A recipient placeholder is a named slot in the template that gets filled with a real person when you send via API. The placeholder label (e.g. `Signer 1`) is what your API payload uses to map a real name/email to that slot. Placeholder labels are matched case-insensitively.

### Pre-fillable fields

Any text fields you add to the template can be pre-filled by the API using their label. **Field labels are matched exactly (case-sensitive)**, and unmatched values are silently skipped — so give each field a clear, stable, developer-friendly name:

| Good names | Bad names |
|---|---|
| `customer_name` | `Text 1` |
| `contract_start_date` | `Field 2` |
| `salary_amount` | `Input` |

If several fields share a label, address them with a numeric suffix: `Amount` fills the first field labelled Amount, `Amount 2` the second, and so on.

## Sending a template

```http
POST /api/templates/send
Authorization: Bearer <access_token>
Content-Type: application/json
```

```json
{
  "templateId": "<template-id>",
  "signingRequests": [{
    "recipients": [{
      "label": "Signer 1",
      "name": "Jane Smith",
      "email": "jane.smith@nomasign.com"
    }],
    "fields": [
      { "label": "customer_name", "recipient": "Signer 1", "value": "Jane Smith" },
      { "label": "contract_start_date", "recipient": "Signer 1", "value": "2026-06-01" }
    ]
  }]
}
```

- The template id travels **in the body**, not the URL.
- You can pass multiple recipients per signing request, and multiple signing requests per call — each signing request becomes its own signing session.
- `fields` is optional — omit it if you don't need to pre-fill any values.
- To find a template's id: it's in the URL bar when viewing the template in the web app, and the **Copy payload** button includes it in the generated request body.
- See the [API reference](https://integration.nomasign.com/docs) for the optional invite settings (subject, message, cc, reminders, expiry).

## Template checklist (before going live)

- [ ] Every signer has at least one required signature field
- [ ] All API-filled fields have clear, stable names
- [ ] Recipient placeholder labels are final (changing them breaks API calls)
- [ ] You've tested the template manually in the UI at least once
- [ ] The template was created by the integrator account

> **Warning:** Renaming recipient placeholders or field labels after going live will break existing API integrations. Treat production templates like versioned contracts — clone before making changes.

## FAQ

**Can I update a template after it's in use?**
Safe: adding optional fields, adjusting positions, updating document text. Breaking: renaming placeholders or field labels, removing fields your integration references. For breaking changes, clone the template and point your code at the new id.

**What file formats can templates use?**
PDF and Word (.docx); Word files are converted to PDF during template creation.

**What happens if I send a field value the template doesn't have?**
It is silently skipped — the document is sent without it.

**What happens if I omit a required field?**
The signer is prompted to fill it in manually during signing.

**Can I share a template between integrator accounts?**
No — templates are per-account. Recreate it on each account that needs it.

## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| "Template not found" error on send | Wrong template id, template was deleted, or it was created by a different account | Copy the id from the template's URL (or Copy payload), logged in as the integrator account whose refresh token you use |
| Recipient label not matched | Label mismatch with the template's placeholders | Check the placeholder labels in the template |
| Document sends but fields are empty | Field labels in API don't match template (matching is case-sensitive) | Compare `fields[].label` in your payload with the template's field names exactly |

## How the demo implements this

| Layer | File |
|---|---|
| Send endpoint | `Backend/Signing/Controllers/TemplatesController.cs` → `Send` |
| Orchestration | `Backend/Signing/Services/NomaSignService.cs` → `SendRawAsync` |
| HTTP calls | `Backend/Signing/Clients/NomaSignClient.cs` → `SendRawAsync` |

The demo forwards the payload exactly as pasted from the web app's **Copy payload** action; there is no DTO mapping layer to keep in sync with the API.
