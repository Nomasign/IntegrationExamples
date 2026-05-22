import { ReactNode } from "react";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

type Header = { key: string; value: string };

export type ApiResponse = {
  status: number;
  raw: object;
} | null;

interface RequestBuilderProps {
  method: HttpMethod;
  url: string;
  description?: string;
  headers?: Header[];
  headerNote?: string;
  body?: ReactNode;
  info?: string;
  onSend: () => void | Promise<void>;
  sendLabel?: string;
  disabled?: boolean;
  disabledMessage?: string;
  loading?: boolean;
  extraActions?: ReactNode;
  response?: ApiResponse;
  responseExtra?: ReactNode;
}

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  POST: "bg-primary/10 text-primary",
  PUT: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  PATCH: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  DELETE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

function StatusBadge({ status }: { status: number }) {
  const isSuccess = status >= 200 && status < 300;
  const colorClass = status === 0
    ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
    : isSuccess
      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";

  const label = status === 0 ? "Network Error" : `${status}`;

  return (
    <span className={`rounded px-2 py-0.5 text-xs font-bold ${colorClass}`}>
      {label}
    </span>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin text-primary-foreground"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export function RequestBuilder({
  method,
  url,
  description,
  headers,
  headerNote,
  body,
  info,
  onSend,
  sendLabel = "Send",
  disabled = false,
  disabledMessage,
  loading = false,
  extraActions,
  response,
  responseExtra,
}: RequestBuilderProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border border-border overflow-hidden">
        {/* Method + URL bar */}
        <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-3 py-2">
          <span className={`rounded px-2 py-0.5 text-xs font-bold ${METHOD_COLORS[method]}`}>
            {method}
          </span>
          <span className="font-mono text-sm text-foreground">{url}</span>
          {description && (
            <span className="ml-auto text-[10px] text-muted-foreground">{description}</span>
          )}
        </div>

        {/* Headers */}
        {(headers || headerNote) && (
          <div className="border-b border-border px-3 py-2">
            {headers && headers.length > 0 && (
              <>
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
                  Headers
                </p>
                <div className="flex flex-col gap-1 font-mono text-xs">
                  {headers.map((h) => (
                    <div key={h.key} className="flex items-center gap-2">
                      <span className="text-muted-foreground">{h.key}:</span>
                      <span className="text-foreground">{h.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            {headerNote && (
              <p className="mt-1 text-[10px] text-muted-foreground italic">{headerNote}</p>
            )}
          </div>
        )}

        {/* Info section */}
        {info && (
          <div className="border-b border-border px-3 py-2">
            <p className="text-[10px] font-medium text-muted-foreground italic">{info}</p>
          </div>
        )}

        {/* Body */}
        {body && (
          <div className="px-3 py-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-2">
              Body
            </p>
            {body}
          </div>
        )}

        {/* Action bar */}
        <div className="flex items-center gap-3 border-t border-border bg-muted/30 px-3 py-2">
          <button
            onClick={onSend}
            disabled={disabled || loading}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading && <Spinner />}
            {loading ? "Loading..." : sendLabel}
          </button>
          {extraActions}
          {disabled && disabledMessage && (
            <span className="text-xs text-muted-foreground">{disabledMessage}</span>
          )}
        </div>
      </div>

      {/* Response */}
      {response && (
        <div className="rounded-md border border-border overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-3 py-2">
            <StatusBadge status={response.status} />
            <span className="text-xs text-muted-foreground">Response</span>
          </div>
          <pre className="overflow-x-auto p-3 text-xs font-mono text-foreground bg-background max-h-64 overflow-y-auto">
            {JSON.stringify(response.raw, null, 2)}
          </pre>
          {responseExtra}
        </div>
      )}
    </div>
  );
}
