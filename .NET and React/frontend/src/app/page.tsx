import { IntegrationDemo } from "./integration-demo";

export default function Home() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Page header */}
      <div className="border-b border-border">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-1 p-4 lg:p-6">
          <h1 className="text-2xl font-semibold leading-tight text-foreground">
            Integration
          </h1>
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
