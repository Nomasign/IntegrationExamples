# Step 2 — FAQ

Common questions about creating and managing the integrator account.

---

### Can I use my personal/admin account as the integrator?

A dedicated integrator account gives you least privilege, easier credential rotation, a clear audit trail, and a professional sender identity for signers.

### Can I have multiple integrator accounts?

Yes. You might have separate integrator accounts per environment (`nomasign-dev@`, `nomasign-staging@`, `nomasign-prod@`). Each has its own templates and integration entries.

### What do signers see as the "from" address?

Signers see the integrator account's email address and display name as the sender. Choose something professional and monitored (e.g. `signing@yourdomain.com`).

### Does the integrator need a paid plan?

No. The Integration feature is on the **org owner's** plan. The integrator account gets API access through the Integrator role — no separate subscription needed.

### Can I remove or downgrade an integrator?

Yes. The org owner can change the role or remove the member from the Manage Organization page. Removing the integrator doesn't delete their templates but does revoke API access.

---

[← Back to Step 2](./index.md) | [Troubleshooting →](./troubleshooting.md)
