"use client";

import { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:5203";
const STORAGE_KEY = "nomasign_refresh_token";

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
  const [authResponse, setAuthResponse] = useState<{ raw: object; savedToken: string; fromCache: boolean } | null>(null);
  const [templatesResponse, setTemplatesResponse] = useState<{ status: number; raw: object } | null>(null);
  const [sendResponse, setSendResponse] = useState<{ status: number; raw: object } | null>(null);
  const [webhooksResponse, setWebhooksResponse] = useState<{ status: number; raw: object } | null>(null);
  const [webhookSecret, setWebhookSecret] = useState("");
  const [webhookSecretConfigured, setWebhookSecretConfigured] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookEvent[]>([]);
  const [status, setStatus] = useState("");
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking");
  const [sendForm, setSendForm] = useState({
    templateId: "",
    label: "Recipient 1",
    name: "",
    email: "",
  });

  // Check backend health on mount and every 10 seconds.
  useEffect(() => {
    async function checkHealth() {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`${API}/health`, { signal: controller.signal });
        clearTimeout(timer);
        setBackendStatus(res.ok ? "online" : "offline");
      } catch {
        setBackendStatus("offline");
      }
    }
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  // Check if webhook secret is already configured on mount.
  useEffect(() => {
    fetch(`${API}/api/config/webhook-secret`)
      .then((r) => r.json())
      .then((d) => setWebhookSecretConfigured(d.configured))
      .catch(() => {});
  }, []);

  async function saveWebhookSecret() {
    if (!webhookSecret.trim()) return;
    const res = await fetch(`${API}/api/config/webhook-secret`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: webhookSecret }),
    });
    if (res.ok) {
      setWebhookSecretConfigured(true);
      setStatus("Webhook secret configured");
    }
  }

  // Load saved refresh token from localStorage on mount.
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setRefreshToken(saved);
  }, []);

  function handleRefreshTokenChange(value: string) {
    setRefreshToken(value);
  }

  function clearRefreshToken() {
    localStorage.removeItem(STORAGE_KEY);
    setRefreshToken("");
  }

  async function authenticate() {
    if (!refreshToken.trim()) {
      setStatus("Please paste your refresh token first");
      return;
    }
    setStatus("Authenticating...");
    setAuthResponse(null);
    try {
      const res = await fetch(`${API}/api/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: refreshToken.trim() }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        let parsed: object | null = null;
        try { parsed = JSON.parse(body); } catch { /* not JSON */ }
        setAuthResponse({
          raw: parsed ?? { status: res.status, statusText: res.statusText, body },
          savedToken: null,
          fromCache: false,
        });
        setStatus(`Auth failed (${res.status}): ${body || res.statusText}`);
        return;
      }
      const data = await res.json();
      setToken(data.accessToken);
      setAuthResponse({
        raw: data,
        savedToken: data.accessToken ?? null,
        fromCache: data.fromCache ?? false,
      });
      setStatus(data.fromCache ? "Token loaded (cached)" : "Token acquired");
    } catch (err) {
      setStatus(
        `Cannot reach backend at ${API}. Make sure the .NET server is running (dotnet run) and CORS is configured. Error: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  async function loadTemplates() {
    setStatus("Loading templates...");
    setTemplatesResponse(null);
    try {
      const res = await fetch(`${API}/api/templates`);
      const data = await res.json().catch(() => ({}));
      setTemplatesResponse({ status: res.status, raw: data });
      if (!res.ok) {
        setStatus(`Failed to load templates (${res.status})`);
        return;
      }
      setTemplates(data.items ?? []);
      setStatus(`Loaded ${(data.items ?? []).length} templates`);
    } catch (err) {
      setTemplatesResponse({ status: 0, raw: { error: err instanceof Error ? err.message : String(err) } });
      setStatus(`Cannot reach backend at ${API}`);
    }
  }

  async function sendTemplate() {
    if (!sendForm.templateId || !sendForm.email) {
      setStatus("Template ID and email are required");
      return;
    }
    setStatus("Sending...");
    setSendResponse(null);
    try {
      const res = await fetch(
        `${API}/api/templates/${sendForm.templateId}/send`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: sendForm.label,
            name: sendForm.name,
            email: sendForm.email,
          }),
        }
      );
      const data = await res.json().catch(async () => ({ text: await res.text().catch(() => "") }));
      setSendResponse({ status: res.status, raw: data });
      if (!res.ok) {
        setStatus(`Send failed (${res.status})`);
        return;
      }
      setStatus("Template sent successfully!");
    } catch (err) {
      setSendResponse({ status: 0, raw: { error: err instanceof Error ? err.message : String(err) } });
      setStatus(`Cannot reach backend at ${API}`);
    }
  }

  async function loadWebhooks() {
    setWebhooksResponse(null);
    try {
      const res = await fetch(`${API}/api/webhooks/log`);
      const data = await res.json().catch(() => ({}));
      setWebhooksResponse({ status: res.status, raw: data });
      if (res.ok) {
        setWebhooks(data);
      }
    } catch (err) {
      setWebhooksResponse({ status: 0, raw: { error: err instanceof Error ? err.message : String(err) } });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Backend offline warning */}
      {backendStatus === "offline" && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          Backend unreachable at <code className="font-mono text-xs">{API}</code>.
          Run <code className="font-mono text-xs">dotnet run</code> in the Backend folder to start the server.
        </div>
      )}

      {/* Step 1: Authenticate */}
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-card-foreground">
          1. Authenticate
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Exchange your refresh token for an access token. This is what gets sent to the NomaSign API.
        </p>

        {/* Request builder */}
        <div className="mt-4 rounded-md border border-border overflow-hidden">
          {/* Method + URL bar */}
          <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-3 py-2">
            <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
              POST
            </span>
            <span className="font-mono text-sm text-foreground">/api/auth/token</span>
          </div>

          {/* Headers */}
          <div className="border-b border-border px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
              Headers
            </p>
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-muted-foreground">Content-Type:</span>
              <span className="text-foreground">application/json</span>
            </div>
          </div>

          {/* Body parameters */}
          <div className="px-3 py-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-2">
              Body
            </p>
            <div className="flex flex-col gap-2">
              {/* refresh_token */}
              <div className="flex items-center gap-2">
                <label className="w-28 shrink-0 font-mono text-xs text-muted-foreground">
                  refreshToken
                </label>
                <input
                  type="password"
                  placeholder="Paste your refresh token here"
                  value={refreshToken}
                  onChange={(e) => handleRefreshTokenChange(e.target.value)}
                  className="flex-1 rounded border border-input bg-background px-2 py-1.5 font-mono text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
          </div>

          {/* Send button */}
          <div className="flex items-center gap-3 border-t border-border bg-muted/30 px-3 py-2">
            <button
              onClick={authenticate}
              disabled={!refreshToken.trim()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
            {refreshToken && (
              <button
                onClick={clearRefreshToken}
                className="rounded-md border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                Clear
              </button>
            )}
            {token && (
              <span className="text-sm font-medium text-success">
                ✓ Authenticated
              </span>
            )}
          </div>
        </div>

        {/* Response */}
        {authResponse && (
          <div className="mt-4 rounded-md border border-border overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-3 py-2">
              <span className={`rounded px-2 py-0.5 text-xs font-bold ${authResponse.savedToken ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"}`}>
                {authResponse.savedToken ? "200 OK" : "Error"}
              </span>
              <span className="text-xs text-muted-foreground">Response</span>
            </div>
            <pre className="overflow-x-auto p-3 text-xs font-mono text-foreground bg-background">
              {JSON.stringify(authResponse.raw, null, 2)}
            </pre>
            {authResponse.savedToken && (
              <div className="border-t border-border bg-muted/30 px-3 py-2">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
                  Saved Access Token (used as Bearer token for subsequent requests)
                </p>
                <p className="font-mono text-xs text-foreground break-all">
                  {authResponse.savedToken.slice(0, 30)}...{authResponse.savedToken.slice(-20)}
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Step 2: List Templates */}
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-card-foreground">
          2. List Templates
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Fetch available signing templates from the Integration API.
        </p>

        <div className="mt-4 rounded-md border border-border overflow-hidden">
          {/* Method + URL bar */}
          <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-3 py-2">
            <span className="rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 px-2 py-0.5 text-xs font-bold">
              GET
            </span>
            <span className="font-mono text-sm text-foreground">/api/templates</span>
          </div>

          {/* Info */}
          <div className="border-b border-border px-3 py-2">
            <p className="text-[10px] font-medium text-muted-foreground italic">
              Backend adds Authorization header internally (token managed server-side)
            </p>
          </div>

          {/* Send button */}
          <div className="flex items-center gap-3 border-t border-border bg-muted/30 px-3 py-2">
            <button
              onClick={loadTemplates}
              disabled={!token}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
            {!token && (
              <span className="text-xs text-muted-foreground">Authenticate first</span>
            )}
          </div>
        </div>

        {/* Response */}
        {templatesResponse && (
          <div className="mt-4 rounded-md border border-border overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-3 py-2">
              <span className={`rounded px-2 py-0.5 text-xs font-bold ${templatesResponse.status === 200 ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"}`}>
                {templatesResponse.status === 0 ? "Network Error" : `${templatesResponse.status}`}
              </span>
              <span className="text-xs text-muted-foreground">Response</span>
            </div>
            <pre className="overflow-x-auto p-3 text-xs font-mono text-foreground bg-background max-h-64 overflow-y-auto">
              {JSON.stringify(templatesResponse.raw, null, 2)}
            </pre>
          </div>
        )}

        {/* Template list for selection */}
        {templates.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Select a template to use in Step 3
            </p>
            <ul className="divide-y divide-border rounded-md border border-border">
              {templates.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between px-3 py-2"
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
          </div>
        )}
      </section>

      {/* Step 3: Send Template */}
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-card-foreground">
          3. Send for Signature
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Instantiate a template and send it to a recipient.
        </p>

        <div className="mt-4 rounded-md border border-border overflow-hidden">
          {/* Method + URL bar */}
          <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-3 py-2">
            <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
              POST
            </span>
            <span className="font-mono text-sm text-foreground">
              /api/templates/{sendForm.templateId || ":id"}/send
            </span>
          </div>

          {/* Headers */}
          <div className="border-b border-border px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
              Headers
            </p>
            <div className="flex flex-col gap-1 font-mono text-xs">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Content-Type:</span>
                <span className="text-foreground">application/json</span>
              </div>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground italic">
              Backend adds Authorization header internally
            </p>
          </div>

          {/* Body parameters */}
          <div className="px-3 py-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-2">
              Body
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <label className="w-28 shrink-0 font-mono text-xs text-muted-foreground">
                  templateId
                </label>
                <input
                  placeholder="Select from Step 2 or paste ID"
                  value={sendForm.templateId}
                  onChange={(e) => setSendForm((f) => ({ ...f, templateId: e.target.value }))}
                  className="flex-1 rounded border border-input bg-background px-2 py-1.5 font-mono text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="w-28 shrink-0 font-mono text-xs text-muted-foreground">
                  label
                </label>
                <input
                  placeholder="Recipient 1"
                  value={sendForm.label}
                  onChange={(e) => setSendForm((f) => ({ ...f, label: e.target.value }))}
                  className="flex-1 rounded border border-input bg-background px-2 py-1.5 font-mono text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="w-28 shrink-0 font-mono text-xs text-muted-foreground">
                  name
                </label>
                <input
                  placeholder="John Doe"
                  value={sendForm.name}
                  onChange={(e) => setSendForm((f) => ({ ...f, name: e.target.value }))}
                  className="flex-1 rounded border border-input bg-background px-2 py-1.5 font-mono text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="w-28 shrink-0 font-mono text-xs text-muted-foreground">
                  email
                </label>
                <input
                  placeholder="john@example.com"
                  value={sendForm.email}
                  onChange={(e) => setSendForm((f) => ({ ...f, email: e.target.value }))}
                  className="flex-1 rounded border border-input bg-background px-2 py-1.5 font-mono text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
          </div>

          {/* Send button */}
          <div className="flex items-center gap-3 border-t border-border bg-muted/30 px-3 py-2">
            <button
              onClick={sendTemplate}
              disabled={!token}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
            {!token && (
              <span className="text-xs text-muted-foreground">Authenticate first</span>
            )}
          </div>
        </div>

        {/* Response */}
        {sendResponse && (
          <div className="mt-4 rounded-md border border-border overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-3 py-2">
              <span className={`rounded px-2 py-0.5 text-xs font-bold ${sendResponse.status >= 200 && sendResponse.status < 300 ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"}`}>
                {sendResponse.status === 0 ? "Network Error" : `${sendResponse.status}`}
              </span>
              <span className="text-xs text-muted-foreground">Response</span>
            </div>
            <pre className="overflow-x-auto p-3 text-xs font-mono text-foreground bg-background max-h-64 overflow-y-auto">
              {JSON.stringify(sendResponse.raw, null, 2)}
            </pre>
          </div>
        )}
      </section>

      {/* Step 4: Webhook Events */}
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-card-foreground">
          4. Webhook Events
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          When signing completes, NomaSign POSTs to your webhook endpoint. Check received events below.
        </p>

        {/* HMAC Secret config */}
        <div className="mt-4 rounded-md border border-border bg-muted/30 px-3 py-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-2">
            HMAC Secret {webhookSecretConfigured && <span className="text-green-600 dark:text-green-400 ml-1">✓ configured</span>}
          </p>
          <div className="flex items-center gap-2">
            <input
              type="password"
              placeholder="Paste your HMAC webhook secret"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              className="flex-1 rounded border border-input bg-background px-2 py-1.5 font-mono text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              onClick={saveWebhookSecret}
              disabled={!webhookSecret.trim()}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Set
            </button>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Used to verify the X-NomaSign-Signature header on incoming webhooks.
          </p>
        </div>

        <div className="mt-4 rounded-md border border-border overflow-hidden">
          {/* Method + URL bar */}
          <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-3 py-2">
            <span className="rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 px-2 py-0.5 text-xs font-bold">
              GET
            </span>
            <span className="font-mono text-sm text-foreground">/api/webhooks/log</span>
            <span className="ml-auto text-[10px] text-muted-foreground">(local endpoint — shows received webhook events)</span>
          </div>

          {/* Incoming webhook info */}
          <div className="border-b border-border px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
              NomaSign sends webhooks to
            </p>
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">POST</span>
              <span className="text-foreground">/api/webhooks/nomasign</span>
            </div>
            <div className="mt-1 flex items-center gap-2 font-mono text-xs">
              <span className="text-muted-foreground">X-NomaSign-Signature:</span>
              <span className="text-foreground">HMAC-SHA256 (verified with your webhook secret)</span>
            </div>
          </div>

          {/* Send button */}
          <div className="flex items-center gap-3 border-t border-border bg-muted/30 px-3 py-2">
            <button
              onClick={loadWebhooks}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Response */}
        {webhooksResponse && (
          <div className="mt-4 rounded-md border border-border overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-3 py-2">
              <span className={`rounded px-2 py-0.5 text-xs font-bold ${webhooksResponse.status === 200 ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"}`}>
                {webhooksResponse.status === 0 ? "Network Error" : `${webhooksResponse.status}`}
              </span>
              <span className="text-xs text-muted-foreground">
                Response — {Array.isArray(webhooksResponse.raw) ? `${(webhooksResponse.raw as unknown[]).length} events` : ""}
              </span>
            </div>
            <pre className="overflow-x-auto p-3 text-xs font-mono text-foreground bg-background max-h-64 overflow-y-auto">
              {JSON.stringify(webhooksResponse.raw, null, 2)}
            </pre>
          </div>
        )}
      </section>
    </div>
  );
}
