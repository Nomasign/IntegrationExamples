# Step 5 — FAQ

Common questions about webhooks, events, and delivery behavior.

---

### Are webhooks required to use the API?

No. Webhooks are optional. You can send documents, list templates, and check session status via polling without configuring webhooks. Webhooks add real-time notifications when events occur.

### What events can I subscribe to?

Currently, the only event available is:

| Event | Fires when |
|-------|-----------|
| `signing_session.completed` | All participants have signed |

Additional event types (declined, cancelled, per-participant signed) may be added in the future.

### Can I choose which events to receive?

Currently there is only one event type (`signing_session.completed`), so there's nothing to toggle. As more events are added, configuration options will be available in the Integration page.

### What if my endpoint is down?

NomaSign retries with exponential backoff: immediate → +1 min → +5 min → +30 min → +24 h → +25 h (max 6 attempts). After 20 consecutive failures, the endpoint is auto-disabled and you receive an alert email.

### Can I replay missed events?

Yes. All webhook events are recorded. On the Integration page, look for the **View Delivery Logs** button (next to the Send Test Event and Activate/Deactivate buttons). From there you can:

- View all past webhook deliveries
- Inspect the full request body of each event
- Re-send specific events to your endpoint

### Can I have different webhook URLs for different events?

No. Each integration entry has one webhook URL that receives all enabled events. If you need event routing, implement it in your handler by switching on the `type` field.

### Do webhooks use the same base URL as the REST API?

No. Webhooks are outbound — NomaSign sends POST requests **to your URL**. You don't call a NomaSign URL to receive webhooks; you provide your endpoint and NomaSign calls it.

---

[← Back to Step 5](./index.md) | [Troubleshooting →](./troubleshooting.md)
