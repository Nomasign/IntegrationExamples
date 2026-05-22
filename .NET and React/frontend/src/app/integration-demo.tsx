"use client";

import { useState, useEffect } from "react";
import { RequestBuilder, ApiResponse } from "./components/request-builder";

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:5203";
const STORAGE_KEY = "nomasign_refresh_token";

type Template = { id: string; title: string };

export function IntegrationDemo() {
  const [refreshToken, setRefreshToken] = useState("");
  const [token, setToken] = useState<string | null>(null);

  // Responses
  const [authResponse, setAuthResponse] = useState<ApiResponse>(null);
  const [templatesResponse, setTemplatesResponse] = useState<ApiResponse>(null);
  const [sendResponse, setSendResponse] = useState<ApiResponse>(null);
  const [webhooksResponse, setWebhooksResponse] = useState<ApiResponse>(null);

  // Loading states
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingWebhooks, setIsLoadingWebhooks] = useState(false);
  const [isSavingSecret, setIsSavingSecret] = useState(false);
  const [isSavingBaseUrl, setIsSavingBaseUrl] = useState(false);

  // Other state
  const [baseUrl, setBaseUrl] = useState("");
  const [baseUrlSaved, setBaseUrlSaved] = useState(false);
  const [webhookSecret, setWebhookSecret] = useState("");
  const [webhookSecretConfigured, setWebhookSecretConfigured] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
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

  // Load current base URL from backend on mount.
  useEffect(() => {
    fetch(`${API}/api/config/base-url`)
      .then((r) => r.json())
      .then((d) => {
        setBaseUrl(d.baseUrl ?? "");
        setBaseUrlSaved(true);
      })
      .catch(() => {});
  }, []);

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

  async function saveWebhookSecret() {
    if (!webhookSecret.trim()) return;
    setIsSavingSecret(true);
    try {
      const res = await fetch(`${API}/api/config/webhook-secret`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: webhookSecret }),
      });
      if (res.ok) {
        setWebhookSecretConfigured(true);
        setStatus("Webhook secret configured");
      }
    } finally {
      setIsSavingSecret(false);
    }
  }

  async function saveBaseUrl() {
    if (!baseUrl.trim()) return;
    setIsSavingBaseUrl(true);
    setBaseUrlSaved(false);
    try {
      const res = await fetch(`${API}/api/config/base-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseUrl: baseUrl.trim() }),
      });
      if (res.ok) {
        setBaseUrlSaved(true);
        setStatus(`Integration API URL set to ${baseUrl.trim()}`);
      }
    } finally {
      setIsSavingBaseUrl(false);
    }
  }

  async function authenticate() {
    if (!refreshToken.trim()) {
      setStatus("Please paste your refresh token first");
      return;
    }
    setIsAuthenticating(true);
    setAuthResponse(null);
    try {
      const res = await fetch(`${API}/api/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: refreshToken.trim() }),
      });
      const data = await res.json().catch(async () => {
        const text = await res.text().catch(() => "");
        return { status: res.status, statusText: res.statusText, body: text };
      });
      setAuthResponse({ status: res.status, raw: data });
      if (!res.ok) {
        setStatus(`Auth failed (${res.status})`);
        return;
      }
      setToken(data.accessToken);
      setStatus(data.fromCache ? "Token loaded (cached)" : "Token acquired");
    } catch (err) {
      setAuthResponse({ status: 0, raw: { error: err instanceof Error ? err.message : String(err) } });
      setStatus(`Cannot reach backend at ${API}`);
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function loadTemplates() {
    setIsLoadingTemplates(true);
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
    } finally {
      setIsLoadingTemplates(false);
    }
  }

  async function sendTemplate() {
    if (!sendForm.templateId || !sendForm.email) {
      setStatus("Template ID and email are required");
      return;
    }
    setIsSending(true);
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
    } finally {
      setIsSending(false);
    }
  }

  async function loadWebhooks() {
    setIsLoadingWebhooks(true);
    setWebhooksResponse(null);
    try {
      const res = await fetch(`${API}/api/webhooks/log`);
      const data = await res.json().catch(() => ({}));
      setWebhooksResponse({ status: res.status, raw: data });
    } catch (err) {
      setWebhooksResponse({ status: 0, raw: { error: err instanceof Error ? err.message : String(err) } });
    } finally {
      setIsLoadingWebhooks(false);
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

      {/* Integration API base URL config */}
      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <label className="shrink-0 text-sm font-medium text-card-foreground">
            Integration API URL
          </label>
          <input
            placeholder="https://dev.integration.nomasign.com"
            value={baseUrl}
            onChange={(e) => { setBaseUrl(e.target.value); setBaseUrlSaved(false); }}
            className="flex-1 rounded border border-input bg-background px-3 py-1.5 font-mono text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={saveBaseUrl}
            disabled={!baseUrl.trim() || isSavingBaseUrl}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSavingBaseUrl && (
              <svg className="h-3.5 w-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            Set
          </button>
          {baseUrlSaved && (
            <span className="text-sm font-medium text-green-600 dark:text-green-400">✓</span>
          )}
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          All API calls from this demo go through this URL. Default: <code className="font-mono">https://dev.integration.nomasign.com</code>
        </p>
      </section>

      {/* Status bar */}
      {status && (
        <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground">
          {status}
        </div>
      )}

      {/* Step 1: Authenticate */}
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-card-foreground">
          1. Authenticate
        </h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          Exchange your refresh token for an access token. This is what gets sent to the NomaSign API.
        </p>

        <RequestBuilder
          method="POST"
          url="/api/auth/token"
          headers={[{ key: "Content-Type", value: "application/json" }]}
          body={
            <div className="flex flex-col gap-2">
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
          }
          onSend={authenticate}
          disabled={!refreshToken.trim()}
          loading={isAuthenticating}
          extraActions={
            <>
              {refreshToken && (
                <button
                  onClick={clearRefreshToken}
                  className="rounded-md border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Clear
                </button>
              )}
              {token && (
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  ✓ Authenticated
                </span>
              )}
            </>
          }
          response={authResponse}
          responseExtra={
            authResponse?.status === 200 && (authResponse.raw as Record<string, unknown>).accessToken ? (
              <div className="border-t border-border bg-muted/30 px-3 py-2">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
                  Saved Access Token (used as Bearer token for subsequent requests)
                </p>
                <p className="font-mono text-xs text-foreground break-all">
                  {((authResponse.raw as Record<string, unknown>).accessToken as string).slice(0, 30)}...{((authResponse.raw as Record<string, unknown>).accessToken as string).slice(-20)}
                </p>
              </div>
            ) : undefined
          }
        />
      </section>

      {/* Step 2: List Templates */}
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-card-foreground">
          2. List Templates
        </h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          Fetch available signing templates from the Integration API.
        </p>

        <RequestBuilder
          method="GET"
          url="/api/templates"
          info="Backend adds Authorization header internally (token managed server-side)"
          onSend={loadTemplates}
          disabled={!token}
          disabledMessage="Authenticate first"
          loading={isLoadingTemplates}
          response={templatesResponse}
        />

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
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          Instantiate a template and send it to a recipient.
        </p>

        <RequestBuilder
          method="POST"
          url={`/api/templates/${sendForm.templateId || ":id"}/send`}
          headers={[{ key: "Content-Type", value: "application/json" }]}
          headerNote="Backend adds Authorization header internally"
          body={
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
          }
          onSend={sendTemplate}
          disabled={!token}
          disabledMessage="Authenticate first"
          loading={isSending}
          response={sendResponse}
        />
      </section>

      {/* Step 4: Webhook Events (Optional) */}
      <section className="rounded-lg border border-dashed border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-card-foreground">
            4. Webhook Notifications
          </h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Optional
          </span>
        </div>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          When signing completes, NomaSign POSTs HMAC-signed events to your webhook endpoint.
          This step requires your backend to be publicly reachable (deployed or via a tunnel like ngrok).
        </p>

        <div className="mb-4 rounded-md border border-primary/20 bg-primary/5 px-4 py-3">
          <p className="text-sm font-medium text-foreground">📖 Webhook setup guide</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Learn how to receive and verify webhook events, configure HMAC secrets, and handle retries.
          </p>
          <a
            href="https://github.com/Nomasign/IntegrationExamples/blob/main/Integration%20Setup/05-receiving-webhook-notifications.md"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
          >
            Read the webhook guide →
          </a>
        </div>

        {/* HMAC Secret config */}
        <div className="mb-4 rounded-md border border-border bg-muted/30 px-3 py-3">
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
              disabled={!webhookSecret.trim() || isSavingSecret}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSavingSecret && (
                <svg className="h-3 w-3 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              Set
            </button>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Used to verify the X-NomaSign-Signature header on incoming webhooks.
          </p>
        </div>

        <RequestBuilder
          method="GET"
          url="/api/webhooks/log"
          description="(local endpoint — shows received webhook events)"
          headers={[
            { key: "X-NomaSign-Signature", value: "HMAC-SHA256 (verified with your webhook secret)" },
          ]}
          headerNote="NomaSign sends POST /api/webhooks/nomasign with the signature header above"
          onSend={loadWebhooks}
          sendLabel="Refresh"
          loading={isLoadingWebhooks}
          response={webhooksResponse}
        />
      </section>
    </div>
  );
}
