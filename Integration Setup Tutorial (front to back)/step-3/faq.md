# Step 3 — FAQ

Common questions about creating and managing signing templates for API use.

---

### Why can't the API see templates created by my admin account?

Templates are **user-scoped**. The Integration API can only access templates owned by the integrator account that authenticated the request. Templates created by other users (admin, owner, members) are invisible to the API.

**Fix:** Log in as the integrator account and create the template there.

### Can I share a template between multiple integrator accounts?

No. Each integrator account has its own templates. If you need the same template on multiple integrator accounts, you'll need to recreate it on each one.

### What file formats can I upload?

PDF and Word (.docx). Word files are automatically converted to PDF during template creation.

### Can I update a template after it's in use?

You can edit a template, but be careful:
- **Safe changes:** Adding new optional fields, adjusting field positions, updating document text.
- **Breaking changes:** Renaming recipient placeholders, renaming field labels, removing fields your API integration references.

If you need breaking changes, **clone the template** and update your API code to use the new template ID.

### How do I find a template's ID?

Two ways:
1. **URL bar** — when viewing the template in the NomaSign web app, the ID is in the URL (e.g. `.../templates/abc123`)
2. **API** — call `GET /api/templates` and look at the `id` field in the response

### Are field labels case-sensitive?

Yes. `customer_name` and `Customer_Name` are different labels. Your API payload must match the template's field labels exactly.

### What happens if I send a field value the template doesn't have?

Unknown fields are silently ignored — the document is sent without them. This won't cause an error, but the field won't appear on the document.

### What happens if I omit a required field?

If a field is marked as required in the template and not pre-filled by the API, the signer will be prompted to fill it in manually during signing.

---

[← Back to Step 3](./index.md) | [Troubleshooting →](./troubleshooting.md)
