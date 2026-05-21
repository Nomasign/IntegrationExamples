"use client";

import { useState } from "react";

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:5203";

type Template = { id: string; title: string };
type WebhookEvent = {
  id: string;
  type: string;
  createdAt: string;
  session?: { id: string };
};

export function IntegrationDemo() {
  const [refreshToken, setRefreshToken] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookEvent[]>([]);
  const [status, setStatus] = useState("");
  const [sendForm, setSendForm] = useState({
    templateId: "",
    label: "Recipient 1",
    name: "",
    email: "",
  });

  async function authenticate() {
    if (!refreshToken.trim()) {
      setStatus("Please paste your refresh token first");
      return;
    }
    setStatus("Authenticating...");
    const res = await fetch(`${API}/api/nomasign/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: refreshToken.trim() }),
    });
    if (!res.ok) {
      setStatus(`Auth failed: ${res.statusText}`);
      return;
    }
    const data = await res.json();
    setToken(data.accessToken);
    setStatus(data.fromCache ? "Token loaded (cached)" : "Token acquired");
  }

  async function loadTemplates() {
    setStatus("Loading templates...");
    const res = await fetch(`${API}/api/nomasign/templates`);
    if (!res.ok) {
      setStatus(`Failed: ${res.statusText}`);
      return;
    }
    const data = await res.json();
    setTemplates(data.items ?? []);
    setStatus(`Loaded ${(data.items ?? []).length} templates`);
  }

  async function sendTemplate() {
    if (!sendForm.templateId || !sendForm.email) {
      setStatus("Template ID and email are required");
      return;
    }
    setStatus("Sending...");
    const res = await fetch(
      `${API}/api/nomasign/templates/${sendForm.templateId}/send`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: [
            {
              label: sendForm.label,
              name: sendForm.name,
              email: sendForm.email,
            },
          ],
        }),
      }
    );
    if (!res.ok) {
      const err = await res.text();
      setStatus(`Send failed: ${err}`);
      return;
    }
    setStatus("Template sent successfully!");
  }

  async function loadWebhooks() {
    const res = await fetch(`${API}/api/webhooks/log`);
    if (res.ok) {
      const data = await res.json();
      setWebhooks(data);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Status banner */}
      {status && (
        <div className="rounded-md border border-border bg-muted px-4 py-2 text-sm text-muted-foreground">
          {status}
        </div>
      )}

      {/* Step 1: Authenticate */}
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-card-foreground">
          1. Authenticate
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste your refresh token below and exchange it for an access token via{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
            POST /connect/token
          </code>
          .
        </p>
        <div className="mt-4 flex flex-col gap-3">
          <input
            type="password"
            placeholder="Paste your refresh token here"
            value={refreshToken}
            onChange={(e) => setRefreshToken(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={authenticate}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Get Access Token
            </button>
            {token && (
              <span className="text-sm font-medium text-success">
                ✓ Authenticated
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Step 2: List Templates */}
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-card-foreground">
          2. List Templates
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Fetch available signing templates via{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
            GET /api/templates
          </code>
          .
        </p>
        <div className="mt-4">
          <button
            onClick={loadTemplates}
            disabled={!token}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Load Templates
          </button>
          {templates.length > 0 && (
            <ul className="mt-4 divide-y divide-border">
              {templates.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between py-2"
                >
                  <div>
                    <span className="font-mono text-xs text-muted-foreground">
                      {t.id}
                    </span>
                    <span className="ml-2 text-sm text-foreground">
                      {t.title}
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      setSendForm((f) => ({ ...f, templateId: t.id }))
                    }
                    className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    Use
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Step 3: Send Template */}
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-card-foreground">
          3. Send for Signature
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Instantiate a template and send it to a recipient via{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
            POST /api/templates/:id/send
          </code>
          .
        </p>
        <div className="mt-4 flex max-w-md flex-col gap-3">
          <input
            placeholder="Template ID"
            value={sendForm.templateId}
            onChange={(e) =>
              setSendForm((f) => ({ ...f, templateId: e.target.value }))
            }
            className="rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <input
            placeholder="Recipient label (e.g. Recipient 1)"
            value={sendForm.label}
            onChange={(e) =>
              setSendForm((f) => ({ ...f, label: e.target.value }))
            }
            className="rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <input
            placeholder="Recipient name"
            value={sendForm.name}
            onChange={(e) =>
              setSendForm((f) => ({ ...f, name: e.target.value }))
            }
            className="rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <input
            placeholder="Recipient email"
            value={sendForm.email}
            onChange={(e) =>
              setSendForm((f) => ({ ...f, email: e.target.value }))
            }
            className="rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={sendTemplate}
            disabled={!token}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </section>

      {/* Step 4: Webhook Events */}
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-card-foreground">
          4. Webhook Events
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          When signing completes, NomaSign POSTs to{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
            /api/webhooks/nomasign
          </code>
          .
        </p>
        <div className="mt-4">
          <button
            onClick={loadWebhooks}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Refresh
          </button>
          {webhooks.length > 0 ? (
            <ul className="mt-4 space-y-1">
              {webhooks.map((w) => (
                <li
                  key={w.id}
                  className="font-mono text-xs text-muted-foreground"
                >
                  [{new Date(w.createdAt).toLocaleTimeString()}]{" "}
                  <strong className="text-foreground">{w.type}</strong> —
                  session {w.session?.id}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              No webhook events yet.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
