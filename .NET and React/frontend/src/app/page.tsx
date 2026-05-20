import { IntegrationDemo } from "./integration-demo";

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-bold">NomaSign Integration Example</h1>
      <p className="mt-2 text-sm text-gray-500">
        Demonstrates: token exchange, listing templates, sending for signature,
        and receiving webhooks.
      </p>
      <div className="mt-8">
        <IntegrationDemo />
      </div>
    </main>
  );
}
