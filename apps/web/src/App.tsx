import { useEffect, useState } from "react";
import type { HealthResponse } from "@picture-pruner/shared";

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadHealth() {
      try {
        const response = await fetch("/api/health", {
          signal: controller.signal
        });
        if (!response.ok) {
          throw new Error(`Health check failed with ${response.status}`);
        }

        const payload = (await response.json()) as HealthResponse;
        setHealth(payload);
        setError(null);
      } catch (loadError) {
        if (controller.signal.aborted) {
          return;
        }
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unexpected error while loading API health"
        );
      }
    }

    loadHealth();

    return () => {
      controller.abort();
    };
  }, []);

  return (
    <main className="app-shell">
      <header>
        <p className="kicker">Picture Pruner</p>
        <h1>Phase 1 Foundation</h1>
        <p>
          Monorepo scaffold with Fastify, Drizzle, SQLite, and a React shell.
        </p>
      </header>

      <section className="card">
        <h2>Pipeline Roadmap</h2>
        <ol>
          <li>Import local photo folders and persist metadata.</li>
          <li>Detect exact duplicates using SHA-256.</li>
          <li>Cluster similar shots and review manually.</li>
          <li>Export only curated photos for Google Photos upload.</li>
        </ol>
      </section>

      <section className="card">
        <h2>API Health</h2>
        {health ? (
          <dl>
            <dt>Status</dt>
            <dd>{health.status}</dd>
            <dt>Timestamp</dt>
            <dd>{health.timestamp}</dd>
            <dt>Database</dt>
            <dd>{health.dbFilePath}</dd>
          </dl>
        ) : (
          <p>{error ?? "Loading API health..."}</p>
        )}
      </section>
    </main>
  );
}

export default App;
