"use client";

import { useState, useEffect } from "react";
import { z } from "zod";
import { RequestBuilder, ApiResponse } from "./components/request-builder";

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:5203";
const REPO_URL = "https://github.com/Nomasign/IntegrationExamples";
const DOCS_BASE = `${REPO_URL}/blob/main/docs`;

function ProcessDocLink({ href, label }: { href: string; label?: string }) {
  return (
    <a
      href={href}
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

const sendFormSchema = z.object({
  templateId: z.string().min(1, "Template ID is required — copy it from the template's URL in the web app"),
  label: z.string().min(1, "Recipient label is required"),
  name: z.string().min(1, "Recipient name is required — this is shown on the signing document"),
  email: z.string().min(1, "Recipient email is required").email("Must be a valid email address"),
});

type SendFormErrors = Partial<Record<keyof z.infer<typeof sendFormSchema>, string>>;

export function IntegrationDemo() {
  const [refreshToken, setRefreshToken] = useState("");
  const [refreshTokenConfigured, setRefreshTokenConfigured] = useState(false);
  const [isSavingRefreshToken, setIsSavingRefreshToken] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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
  const [sendForm, setSendForm] = useState({
    templateId: "",
    label: "Recipient 1",
    name: "",
    email: "",
  });
  const [sendFormErrors, setSendFormErrors] = useState<SendFormErrors>({});

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
  }, []);

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
    // Validate all fields with Zod
    const result = sendFormSchema.safeParse(sendForm);
    if (!result.success) {
      const fieldErrors: SendFormErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof SendFormErrors;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setSendFormErrors(fieldErrors);
      setStatus("Please fix the highlighted fields before sending");
      return;
    }
    setSendFormErrors({});
    setIsSending(true);
    setSendResponse(null);
    try {
      const res = await fetch(
        `${API}/api/signing/templates/${sendForm.templateId}/send`,
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
          Store your long-lived refresh token, then exchange it for a short-lived access token. The access token is cached server-side and used as the Bearer token in Step 2. Neither token is ever returned to the browser.
        </p>
        <div className="mt-2 mb-4"><ProcessDocLink href={`${REPO_URL}#quick-start`} /></div>

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

      {/* Step 2: Send Template */}
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-card-foreground">
          2. Send for Signature
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Instantiate a template and send it to a recipient. Copy the template id from the template&apos;s URL in the NomaSign web app (or use its <strong>Copy payload</strong> button). The backend maps this simple <code className="font-mono text-xs">{`{ label, name, email }`}</code> DTO into the Integration API&apos;s nested <code className="font-mono text-xs">signingRequests</code> payload.
        </p>
        <div className="mt-1 mb-4"><ProcessDocLink href={`${DOCS_BASE}/templates.md`} /></div>

        <RequestBuilder
          method="POST"
          url={`/api/signing/templates/${sendForm.templateId || ":id"}/send`}
          headers={[{ key: "Content-Type", value: "application/json" }]}
          headerNote="Backend adds Authorization header internally"
          body={
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <label className="w-28 shrink-0 font-mono text-xs text-muted-foreground">
                    templateId
                  </label>
                  <input
                    placeholder="Paste the template id"
                    value={sendForm.templateId}
                    onChange={(e) => { setSendForm((f) => ({ ...f, templateId: e.target.value })); setSendFormErrors((prev) => ({ ...prev, templateId: undefined })); }}
                    className={`flex-1 rounded border px-2 py-1.5 font-mono text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 ${sendFormErrors.templateId ? 'border-red-500 bg-red-50 dark:bg-red-950/20 focus:border-red-500 focus:ring-red-500' : 'border-input bg-background focus:border-primary focus:ring-ring'}`}
                  />
                </div>
                {sendFormErrors.templateId && (
                  <p className="ml-[7.5rem] text-[11px] font-medium text-red-600 dark:text-red-400">{sendFormErrors.templateId}</p>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <label className="w-28 shrink-0 font-mono text-xs text-muted-foreground">
                    label
                  </label>
                  <input
                    placeholder="Recipient 1"
                    value={sendForm.label}
                    onChange={(e) => { setSendForm((f) => ({ ...f, label: e.target.value })); setSendFormErrors((prev) => ({ ...prev, label: undefined })); }}
                    className={`flex-1 rounded border px-2 py-1.5 font-mono text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 ${sendFormErrors.label ? 'border-red-500 bg-red-50 dark:bg-red-950/20 focus:border-red-500 focus:ring-red-500' : 'border-input bg-background focus:border-primary focus:ring-ring'}`}
                  />
                </div>
                {sendFormErrors.label && (
                  <p className="ml-[7.5rem] text-[11px] font-medium text-red-600 dark:text-red-400">{sendFormErrors.label}</p>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <label className="w-28 shrink-0 font-mono text-xs text-muted-foreground">
                    name <span className="text-red-500">*</span>
                  </label>
                  <input
                    placeholder="John Doe"
                    value={sendForm.name}
                    onChange={(e) => { setSendForm((f) => ({ ...f, name: e.target.value })); setSendFormErrors((prev) => ({ ...prev, name: undefined })); }}
                    className={`flex-1 rounded border px-2 py-1.5 font-mono text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 ${sendFormErrors.name ? 'border-red-500 bg-red-50 dark:bg-red-950/20 focus:border-red-500 focus:ring-red-500' : 'border-input bg-background focus:border-primary focus:ring-ring'}`}
                  />
                </div>
                {sendFormErrors.name && (
                  <p className="ml-[7.5rem] text-[11px] font-medium text-red-600 dark:text-red-400">{sendFormErrors.name}</p>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <label className="w-28 shrink-0 font-mono text-xs text-muted-foreground">
                    email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="john@nomasign.com"
                    value={sendForm.email}
                    onChange={(e) => { setSendForm((f) => ({ ...f, email: e.target.value })); setSendFormErrors((prev) => ({ ...prev, email: undefined })); }}
                    className={`flex-1 rounded border px-2 py-1.5 font-mono text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 ${sendFormErrors.email ? 'border-red-500 bg-red-50 dark:bg-red-950/20 focus:border-red-500 focus:ring-red-500' : 'border-input bg-background focus:border-primary focus:ring-ring'}`}
                  />
                </div>
                {sendFormErrors.email && (
                  <p className="ml-[7.5rem] text-[11px] font-medium text-red-600 dark:text-red-400">{sendFormErrors.email}</p>
                )}
              </div>
            </div>
          }
          onSend={sendTemplate}
          disabled={!isAuthenticated}
          disabledMessage="Authenticate first"
          loading={isSending}
          response={sendResponse}
        />
      </section>

      {/* Step 4: Webhook Events (Optional) */}
      <section className="rounded-lg border border-dashed border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-card-foreground">
            3. Webhook Notifications
          </h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Optional
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          When signing completes, NomaSign POSTs HMAC-signed events to your webhook endpoint.
          This step requires your backend to be publicly reachable (deployed or via a tunnel — we recommend VS Code Dev Tunnels).
        </p>
        <div className="mt-1 mb-4"><ProcessDocLink href={`${DOCS_BASE}/webhooks.md`} /></div>

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
