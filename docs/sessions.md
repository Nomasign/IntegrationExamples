# Direct Send (Sessions)

Send your own PDF documents for signature and get a signing link for each signer. Use this when every document is unique, for example generated per transaction: contract packs, statements, offers built by your own system.

> If you send the same document pack repeatedly, prefer [templates](templates.md). A template is prepared once when you design it, so each send is a smaller, faster call that uses far less of your API allowance. Direct send downloads and prepares your documents on every call.

> The full request/response contract (all parameters, response codes, example payloads) lives in the **interactive API reference** at [integration.nomasign.com/docs](https://integration.nomasign.com/docs).

## How it works

1. Upload your PDFs to the cloud drive connected to the integration account (OneDrive or Google Drive) and keep the file ids the provider returns.
2. Call `POST /api/sessions/send` with the file ids and who must sign. Signature fields are placed automatically: initials for every signer on every page, plus a final signature page.
3. Each `signingRequests` entry creates its own signing session from the same documents, so one call can send the same pack to several independent signer groups.
4. The response returns a signing link per signer, for you to deliver through your own channels.
5. Webhooks tell you when signing completes; see the [webhooks guide](webhooks.md).

## Sending documents

```http
POST /api/sessions/send
Authorization: Bearer <access_token>
Content-Type: application/json
```

```json
{
  "cloudFileIds": ["b!x1...", "b!x2..."],
  "title": "Fleet Contract",
  "signingRequests": [
    {
      "recipients": [
        { "name": "Thabo Nkosi", "email": "thabo.nkosi@nomasign.com" }
      ]
    }
  ],
  "signingType": "parallel",
  "expiresInDays": 30
}
```

- By default no emails are sent (`notify` defaults to false): you deliver the returned signing links yourself. Pass `notify: true` to have the invites and lifecycle updates emailed from the integration account.
- The one-time code that verifies each signer at signing time is **always** delivered by NomaSign, regardless of `notify`. That is what ties the signature to a verified identity.
- The call is synchronous and returns when every session has been created and sent. Base your HTTP timeout on the number and size of the files; 120 to 180 seconds is a sensible client setting.

## Reading the response

| Status | Meaning | What to do |
|---|---|---|
| `200` | Every entry created and sent | Deliver the signing links; `sourceFileSafeToDelete: true` means you may delete the source files |
| `207` | Some entries failed | Call again with only the failed entries; **keep the source files** until every entry has succeeded |
| `422` | Documents rejected, nothing was created | Fix or regenerate the listed files and call again |
| `400` | Invalid input (unknown file id, folder id, non-PDF, over the size limit) | Correct the request |
| `502` | The cloud provider failed during download | Retry |
| `503` | Cloud connection unavailable | Follow the `reconnectUrl` in the response, then retry |

A partial failure never keeps a broken session: a failed entry's session is removed, and document problems reject the whole call before anything is created.

## Document requirements

- PDF only, up to **5 MB per file** and **25 MB per call**.
- Flat, unencrypted PDFs. Rejected with a per-file reason when a document is `encrypted`, uses `xfa` (a legacy Adobe form format), or cannot be parsed (`load-failed`). Regenerating the document as a standard flat PDF resolves all three.

## Cancelling

```http
POST /api/sessions/cancel
```

Pass the `sessionId` from the send response. Every outstanding signing link is revoked, so recipients who have not signed yet can no longer open it. If the session was sent with `notify: true`, a cancellation email goes out from the integration account; a silent session is cancelled silently.

Cancelling is idempotent: a session that was already cancelled, expired, or declined returns `200` with `alreadyCancelled: true`, so retrying after a timeout is safe. A session every signer has completed returns `409` and the signed documents stand.

## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| `400 invalid_cloud_file` | The id is not a PDF file: a folder id, a non-PDF, or a file over 5 MB | Check the id and the file; the message names the offending file |
| `400 total_size_exceeded` | The referenced files total more than 25 MB | Split the documents across multiple calls or reduce their size |
| `422` with `failedDocuments` | A document is encrypted, XFA, or unreadable | Regenerate it as a flat, unencrypted PDF |
| I treated `207` as success | Partial failure: some entries have `status: "failed"` | Check per-entry `status`; resend only the failed entries and keep the source files until then |
| Client timeout on large packs | Synchronous processing of many or large files | Raise your HTTP client timeout (the .NET default of 100 seconds is the usual culprit) |
| Signing link says it is no longer valid | The session was cancelled or has expired | Send again; cancelled links cannot be revived |
