"use client";

import { useState, useEffect } from "react";
import { RequestBuilder, ApiResponse } from "./components/request-builder";

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:5203";

// Default Integration API target (production). Custom URLs the user adds are
// kept in localStorage under CUSTOM_URLS_KEY; the active selection under SELECTED_URL_KEY.
const PROD_API_URL = "https://integration.nomasign.com";
const CUSTOM_URLS_KEY = "nomasign_demo_custom_api_urls";
const SELECTED_URL_KEY = "nomasign_demo_selected_api_url";
const DOCS_BASE = "https://github.com/Nomasign/IntegrationExamples/blob/main/docs";

function ProcessDocLink({ domain, label }: { domain: string; label?: string }) {
  return (
    <a
      href={`${DOCS_BASE}/${domain}/index.md`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-9 items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary shadow-sm transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {label ?? "Docs"}
      <span aria-hidden="true" className="text-base leading-none">→</span>
    </a>
  );
}

async function readResponseBody(res: Response): Promise<object> {
  const text = await res.text();
  if (!text) return {};

  try {
    const parsed: unknown = JSON.parse(text);
    return parsed !== null && typeof parsed === "object" ? parsed : { body: parsed };
  } catch {
    return { body: text };
  }
}

export function IntegrationDemo() {
  const [refreshToken, setRefreshToken] = useState("");
  const [refreshTokenConfigured, setRefreshTokenConfigured] = useState(false);
  const [isSavingRefreshToken, setIsSavingRefreshToken] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Integration API base URL — global; governs every API call (auth, list,
  // send). Defaults to production; add your own for a self-hosted instance or
  // local testing. Custom URLs + the current selection persist in localStorage.
  const [apiBaseUrl, setApiBaseUrl] = useState(PROD_API_URL);
  const [customUrls, setCustomUrls] = useState<string[]>([]);
  const [isSavingBaseUrl, setIsSavingBaseUrl] = useState(false);

  // Responses
  const [authResponse, setAuthResponse] = useState<ApiResponse>(null);
  const [sendResponse, setSendResponse] = useState<ApiResponse>(null);
  const [webhooksResponse, setWebhooksResponse] = useState<ApiResponse>(null);

  // Loading states
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingWebhooks, setIsLoadingWebhooks] = useState(false);
  const [isSavingSecret, setIsSavingSecret] = useState(false);

  // Other state
  const [webhookSecret, setWebhookSecret] = useState("");
  const [webhookSecretConfigured, setWebhookSecretConfigured] = useState(false);
  const [status, setStatus] = useState("");
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking");
  // The send body — pasted from the app's "Copy Payload for Integration" action.
  const [payloadJson, setPayloadJson] = useState("");

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

  // Check if refresh token and webhook secret are already configured on mount.
  useEffect(() => {
    fetch(`${API}/api/signing/config/refresh-token`)
      .then((r) => r.json())
      .then((d) => setRefreshTokenConfigured(d.configured))
      .catch(() => {});
    fetch(`${API}/api/signing/config/webhook-secret`)
      .then((r) => r.json())
      .then((d) => setWebhookSecretConfigured(d.configured))
      .catch(() => {});
      
    // Load saved custom URLs, then resolve the active base URL. A selection
    // saved in localStorage wins (and is re-applied to the backend, whose
    // RuntimeSettings resets to the default on restart); otherwise use whatever
    // the backend currently reports.
    let savedCustom: string[] = [];
    try {
      savedCustom = JSON.parse(localStorage.getItem(CUSTOM_URLS_KEY) ?? "[]");
      if (Array.isArray(savedCustom)) setCustomUrls(savedCustom);
    } catch {
      /* ignore malformed storage */
    }
    const savedSelection = localStorage.getItem(SELECTED_URL_KEY);
    if (savedSelection) {
      saveBaseUrl(savedSelection, { persistCustom: false });
    } else {
      fetch(`${API}/api/signing/config/base-url`)
        .then((r) => r.json())
        .then((d) => setApiBaseUrl(d.baseUrl ?? PROD_API_URL))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push a base URL to the backend, persist the selection, and (optionally) the
  // custom URL itself. Changing the target clears the cached access token.
  async function saveBaseUrl(url: string, opts: { persistCustom?: boolean } = {}) {
    const trimmed = url.trim();
    if (!trimmed) return;
    setIsSavingBaseUrl(true);
    try {
      const res = await fetch(`${API}/api/signing/config/base-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseUrl: trimmed }),
      });
      if (res.ok) {
        const d = await res.json();
        const applied = d.baseUrl ?? trimmed;
        setApiBaseUrl(applied);
        localStorage.setItem(SELECTED_URL_KEY, applied);
        if (opts.persistCustom && applied !== PROD_API_URL) {
          setCustomUrls((prev) => {
            if (prev.includes(applied)) return prev;
            const next = [...prev, applied];
            localStorage.setItem(CUSTOM_URLS_KEY, JSON.stringify(next));
            return next;
          });
        }
        // Switching environments invalidates any cached access token.
        setIsAuthenticated(false);
        setAuthResponse(null);
      }
    } finally {
      setIsSavingBaseUrl(false);
    }
  }

  function addCustomUrl() {
    const input = window.prompt("Integration API URL (e.g. https://signing.yourcompany.com):");
    if (!input) return;
    const trimmed = input.trim();
    try {
      // Basic sanity check — must be a valid absolute URL.
      new URL(trimmed);
    } catch {
      window.alert("Please enter a valid URL, including http(s)://");
      return;
    }
    saveBaseUrl(trimmed, { persistCustom: true });
  }

  function removeCustomUrl(url: string) {
    setCustomUrls((prev) => {
      const next = prev.filter((u) => u !== url);
      localStorage.setItem(CUSTOM_URLS_KEY, JSON.stringify(next));
      return next;
    });
    if (apiBaseUrl === url) saveBaseUrl(PROD_API_URL);
  }

  async function saveRefreshToken() {
    if (!refreshToken.trim()) return;
    setIsSavingRefreshToken(true);
    try {
      const res = await fetch(`${API}/api/signing/config/refresh-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: refreshToken.trim() }),
      });
      if (res.ok) {
        setRefreshTokenConfigured(true);
        setRefreshToken("");
        setIsAuthenticated(false);
        setStatus("Refresh token saved server-side");
      }
    } finally {
      setIsSavingRefreshToken(false);
    }
  }

  async function saveWebhookSecret() {
    if (!webhookSecret.trim()) return;
    setIsSavingSecret(true);
    try {
      const res = await fetch(`${API}/api/signing/config/webhook-secret`, {
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

  async function authenticate() {
    setIsAuthenticating(true);
    setAuthResponse(null);
    try {
      const res = await fetch(`${API}/api/signing/auth/token`, { method: "POST" });
      const data = await readResponseBody(res);
      setAuthResponse({ status: res.status, raw: data });
      if (!res.ok) {
        setIsAuthenticated(false);
        setStatus(`Auth failed (${res.status})`);
        return;
      }
      setIsAuthenticated(true);
      const fromCache = "fromCache" in data && data.fromCache === true;
      setStatus(fromCache ? "Access token reused (cached server-side)" : "Access token acquired (cached server-side)");
    } catch (err) {
      setAuthResponse({ status: 0, raw: { error: err instanceof Error ? err.message : String(err) } });
      setStatus(`Cannot reach backend at ${API}`);
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function sendTemplate() {
    // The payload is the JSON copied from the app's "Copy Payload for
    // Integration" action, edited to fill in real recipient name/email.
    let parsed: unknown;
    try {
      parsed = JSON.parse(payloadJson);
    } catch {
      setStatus("Payload is not valid JSON — paste the copied payload and fix any edits.");
      return;
    }
    setIsSending(true);
    setSendResponse(null);
    try {
      const res = await fetch(`${API}/api/signing/templates/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const data = await readResponseBody(res);
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
      const res = await fetch(`${API}/api/signing/webhooks/log`);
      const data = await readResponseBody(res);
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

      {/* Global: Integration API target */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-border bg-muted/30 px-3 py-2">
        <label htmlFor="api-target" className="text-xs font-medium text-muted-foreground">
          Integration API
        </label>
        <select
          id="api-target"
          value={apiBaseUrl}
          disabled={isSavingBaseUrl}
          onChange={(e) => {
            if (e.target.value === "__add__") addCustomUrl();
            else saveBaseUrl(e.target.value);
          }}
          className="rounded border border-input bg-background px-2 py-1 font-mono text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value={PROD_API_URL}>Production — {PROD_API_URL}</option>
          {customUrls.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
          <option value="__add__">+ Add custom URL…</option>
        </select>
        {apiBaseUrl !== PROD_API_URL && customUrls.includes(apiBaseUrl) && (
          <button
            onClick={() => removeCustomUrl(apiBaseUrl)}
            disabled={isSavingBaseUrl}
            className="text-xs text-muted-foreground underline-offset-2 hover:text-destructive hover:underline disabled:opacity-50"
          >
            Remove
          </button>
        )}
        <span className="ml-auto text-[10px] text-muted-foreground">
          Token must come from this environment, or auth fails with{" "}
          <code className="font-mono">invalid_grant</code>.
        </span>
      </div>

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
        <p className="mt-1 text-sm text-muted-foreground">
          Store your long-lived refresh token, then exchange it for a short-lived access token. The access token is cached server-side and used as the Bearer token in Steps 2 &amp; 3. Neither token is ever returned to the browser.
        </p>
        <div className="mt-2 mb-4"><ProcessDocLink domain="authentication" /></div>

        {/* Sub-step 1.1: Refresh Token */}
        <div className="mt-5 rounded-md border border-border bg-muted/30 px-4 py-4">
          <h3 className="text-sm font-semibold text-card-foreground">
            1.1 Refresh Token {refreshTokenConfigured && <span className="text-green-600 dark:text-green-400 ml-1 text-xs font-medium">✓ configured</span>}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Paste the long-lived refresh token generated from the NomaSign Integration page. It&apos;s stored in the backend&apos;s secret store (Key Vault in production, in-memory in this demo).
          </p>
          <div className="flex items-center gap-2 mt-3">
            <input
              type="password"
              placeholder={refreshTokenConfigured ? "Paste a new one to replace the saved token" : "Paste your refresh token"}
              value={refreshToken}
              onChange={(e) => setRefreshToken(e.target.value)}
              className="flex-1 rounded border border-input bg-background px-2 py-1.5 font-mono text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              onClick={saveRefreshToken}
              disabled={!refreshToken.trim() || isSavingRefreshToken}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Save
            </button>
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            POST <code className="font-mono">/api/signing/config/refresh-token</code> — writes to the backend&apos;s <code className="font-mono">ISecretStore</code>.
          </p>
        </div>

        {/* Sub-step 1.2: Authenticate */}
        <div className="mt-4 rounded-md border border-border bg-muted/30 px-4 py-4">
          <h3 className="text-sm font-semibold text-card-foreground">
            1.2 Authenticate
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Exchange the stored refresh token for a short-lived access token via <code className="font-mono">POST /connect/token</code>. The backend caches the result and refreshes automatically when it expires.
          </p>
          <div className="mt-3">
            <RequestBuilder
              method="POST"
              url="/api/signing/auth/token"
              info="No body — backend reads the saved refresh token from its secret store"
              onSend={authenticate}
              sendLabel="Authenticate"
              disabled={!refreshTokenConfigured}
              disabledMessage="Save a refresh token first (step 1.1)"
              loading={isAuthenticating}
              extraActions={isAuthenticated ? (
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  ✓ Authenticated
                </span>
              ) : undefined}
              response={authResponse}
            />
          </div>
        </div>
      </section>

      {/* Step 2: Get your template payload */}
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-card-foreground">
          2. Get Your Template Payload
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          In the NomaSign app, open a template&apos;s <strong>⋮</strong> menu and click{" "}
          <strong>Copy Payload for Integration</strong>. That copies a ready-to-send JSON body —
          the <code className="font-mono text-xs">templateId</code> plus a{" "}
          <code className="font-mono text-xs">signingRequests</code> skeleton with{" "}
          <code className="font-mono text-xs">&lt;NAME&gt;</code>/
          <code className="font-mono text-xs">&lt;EMAIL&gt;</code> placeholders to fill in.
        </p>
        <div className="mt-1 mb-4"><ProcessDocLink domain="templates" /></div>

        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
          Paste the copied payload, then replace the placeholders
        </p>
        <textarea
          value={payloadJson}
          onChange={(e) => setPayloadJson(e.target.value)}
          rows={12}
          spellCheck={false}
          placeholder={`{\n  "templateId": "…",\n  "signingRequests": [\n    { "recipients": [{ "label": "Recipient 1", "name": "<NAME>", "email": "<EMAIL>" }] }\n  ]\n}`}
          className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          Tip: the copied JSON includes comments describing each field; remove them (and the{" "}
          <code className="font-mono">&lt;…&gt;</code> placeholders) before sending.
        </p>
      </section>

      {/* Step 3: Send for Signature */}
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-card-foreground">
          3. Send for Signature
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          POST the payload to <code className="font-mono text-xs">/api/templates/send</code>. The
          backend forwards it as-is and attaches the access token — no token ever reaches the
          browser.
        </p>
        <div className="mt-1 mb-4"><ProcessDocLink domain="templates" /></div>

        <RequestBuilder
          method="POST"
          url="/api/signing/templates/send"
          headers={[{ key: "Content-Type", value: "application/json" }]}
          headerNote="Backend adds the Authorization header internally"
          body={
            <textarea
              value={payloadJson}
              onChange={(e) => setPayloadJson(e.target.value)}
              rows={12}
              spellCheck={false}
              placeholder="Paste your template payload in Step 2, or edit it here before sending."
              className="w-full rounded border border-input bg-background p-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
            />
          }
          onSend={sendTemplate}
          disabled={!isAuthenticated || !payloadJson.trim()}
          disabledMessage={!isAuthenticated ? "Authenticate first" : "Paste a payload in Step 2"}
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
        <p className="mt-1 text-sm text-muted-foreground">
          When signing completes, NomaSign POSTs HMAC-signed events to your webhook endpoint.
          This step requires your backend to be publicly reachable (deployed or via a tunnel — we recommend VS Code Dev Tunnels).
        </p>
        <div className="mt-1 mb-4"><ProcessDocLink domain="webhooks" /></div>

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
          url="/api/signing/webhooks/log"
          description="(local endpoint — shows received webhook events)"
          headers={[
            { key: "X-NomaSign-Signature", value: "HMAC-SHA256 (verified with your webhook secret)" },
          ]}
          headerNote="NomaSign sends POST /api/signing/webhooks/nomasign with the signature header above"
          onSend={loadWebhooks}
          sendLabel="Refresh"
          loading={isLoadingWebhooks}
          response={webhooksResponse}
        />
      </section>
    </div>
  );
}
