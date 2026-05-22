# Creating a Signing Template

Templates define the document layout, recipient placeholders, and signature fields that your integration will use each time it sends a document.

## Steps

While logged in as the integrator account:

1. Go to **Templates** in the sidebar
2. Click **Create Template**
3. Upload a document (PDF, Word, etc.)
4. Add at least one **recipient placeholder** (e.g. "Signer 1")
5. Place a **signature field** on the document for that recipient
6. Optionally add other fields (name, date, custom text fields) that your API calls can pre-fill
7. **Save** the template

## Finding Your Template ID

After saving, note the **template ID** — you'll see it in:
- The URL bar when viewing the template (e.g. `.../templates/{id}`)
- The API response when calling `GET /api/templates` (We'll get to this in a second if you dont understand it now its fine.)

This ID is what your integration passes to `POST /api/templates/{id}/send` to instantiate the template with real recipient data.

---

**Previous:** [← Creating an Integration Account](./02-creating-an-integration-account.md) | **Next:** [Creating a Refresh Token & Webhook Secret →](./04-creating-a-refresh-token-and-webhook-secret.md)
