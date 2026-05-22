"use client";

import { useState, useEffect } from "react";
import { IntegrationDemo } from "./integration-demo";

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:5203";

export default function Home() {
  const [backendUp, setBackendUp] = useState<boolean | null>(null);

  useEffect(() => {
    async function check() {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`${API}/health`, { signal: controller.signal });
        clearTimeout(timer);
        setBackendUp(res.ok);
      } catch {
        setBackendUp(false);
      }
    }
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Page header */}
      <div className="border-b border-border">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-1 p-4 lg:p-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold leading-tight text-foreground">
              Integration
            </h1>
            <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
              backendUp === true ? 'border-green-300 text-green-700 dark:border-green-700 dark:text-green-400' : backendUp === false ? 'border-red-300 text-red-700 dark:border-red-700 dark:text-red-400' : 'border-border text-muted-foreground'
            }`}>
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${
                backendUp === true ? 'bg-green-500' : backendUp === false ? 'bg-red-500' : 'bg-gray-400 animate-pulse'
              }`} />
              {backendUp === true ? 'Backend connected' : backendUp === false ? 'Backend offline' : 'Checking...'}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Connect NomaSign to your systems with webhooks and APIs.
          </p>
        </div>
      </div>

      {/* Scrolling body */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 lg:p-6">
          <IntegrationDemo />
        </div>
      </div>
    </div>
  );
}
