import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  DecisionValue,
  HealthResponse,
  PhotoGroupResult,
  SessionPhotoRecord,
  SessionProgressSummary,
  SessionSummary
} from "@picture-pruner/shared";

type ApiResponse<T> = T & { error?: string };

const decisionValues: DecisionValue[] = ["keep", "maybe", "reject"];

async function apiRequest<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const contentType = response.headers.get("content-type") ?? "";

  let payload: ApiResponse<T> | null = null;
  if (contentType.includes("application/json")) {
    payload = (await response.json()) as ApiResponse<T>;
  }

  if (!response.ok) {
    throw new Error(payload?.error ?? `Request failed: ${response.status}`);
  }

  return payload as T;
}

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [importRootInput, setImportRootInput] = useState("");
  const [progress, setProgress] = useState<SessionProgressSummary | null>(null);
  const [exactGroups, setExactGroups] = useState<PhotoGroupResult[]>([]);
  const [similarGroups, setSimilarGroups] = useState<PhotoGroupResult[]>([]);
  const [sessionPhotos, setSessionPhotos] = useState<SessionPhotoRecord[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) ?? null,
    [sessions, selectedSessionId]
  );

  const decisionByPhotoId = useMemo(() => {
    const map = new Map<string, DecisionValue | null>();
    for (const photo of sessionPhotos) {
      map.set(photo.id, photo.decision);
    }
    return map;
  }, [sessionPhotos]);

  const withBusy = useCallback(
    async <T,>(label: string, action: () => Promise<T>) => {
      setBusyAction(label);
      setErrorMessage(null);
      try {
        const result = await action();
        return result;
      } finally {
        setBusyAction(null);
      }
    },
    []
  );

  const loadHealth = useCallback(async () => {
    const data = await apiRequest<HealthResponse>("/api/health");
    setHealth(data);
  }, []);

  const loadSessions = useCallback(async () => {
    const payload = await apiRequest<{ sessions: SessionSummary[] }>("/api/sessions");
    setSessions(payload.sessions);
    if (!selectedSessionId && payload.sessions.length > 0) {
      setSelectedSessionId(payload.sessions[0].id);
    }
    if (
      selectedSessionId &&
      payload.sessions.every((session) => session.id !== selectedSessionId)
    ) {
      setSelectedSessionId(payload.sessions[0]?.id ?? null);
    }
  }, [selectedSessionId]);

  const loadSessionDetails = useCallback(async (sessionId: string) => {
    const [progressPayload, exactPayload, similarPayload, photosPayload] = await Promise.all([
      apiRequest<{ progress: SessionProgressSummary }>(`/api/sessions/${sessionId}/progress`),
      apiRequest<{ groups: PhotoGroupResult[] }>(
        `/api/sessions/${sessionId}/analysis/exact-duplicates`
      ),
      apiRequest<{ groups: PhotoGroupResult[] }>(
        `/api/sessions/${sessionId}/analysis/similar-candidates`
      ),
      apiRequest<{ photos: SessionPhotoRecord[] }>(`/api/sessions/${sessionId}/photos`)
    ]);

    setProgress(progressPayload.progress);
    setExactGroups(exactPayload.groups);
    setSimilarGroups(similarPayload.groups);
    setSessionPhotos(photosPayload.photos);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await Promise.all([loadHealth(), loadSessions()]);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to initialize app");
      }
    })();
  }, [loadHealth, loadSessions]);

  useEffect(() => {
    if (!selectedSessionId) {
      setProgress(null);
      setExactGroups([]);
      setSimilarGroups([]);
      setSessionPhotos([]);
      return;
    }

    void withBusy("Loading session details", async () => {
      await loadSessionDetails(selectedSessionId);
    }).catch((error) => {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load selected session"
      );
    });
  }, [selectedSessionId, loadSessionDetails, withBusy]);

  const onCreateSession = useCallback(async () => {
    if (!importRootInput.trim()) {
      setErrorMessage("Import root is required.");
      return;
    }

    await withBusy("Creating session", async () => {
      const payload = await apiRequest<{ session: SessionSummary }>("/api/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ importRoot: importRootInput.trim() })
      });

      setStatusMessage(`Session created: ${payload.session.id}`);
      await loadSessions();
      setSelectedSessionId(payload.session.id);
    }).catch((error) => {
      setErrorMessage(error instanceof Error ? error.message : "Failed to create session");
    });
  }, [importRootInput, loadSessions, withBusy]);

  const runSessionAction = useCallback(
    async (
      actionName: string,
      endpoint: string,
      successMessage: string,
      method: "POST" | "PUT" | "DELETE" = "POST"
    ) => {
      if (!selectedSessionId) {
        setErrorMessage("Select a session first.");
        return;
      }

      await withBusy(actionName, async () => {
        await apiRequest(endpoint, { method });
        await Promise.all([loadSessions(), loadSessionDetails(selectedSessionId)]);
        setStatusMessage(successMessage);
      }).catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : `Failed: ${actionName}`);
      });
    },
    [loadSessionDetails, loadSessions, selectedSessionId, withBusy]
  );

  const setDecision = useCallback(
    async (photoId: string, decision: DecisionValue) => {
      if (!selectedSessionId) {
        return;
      }

      await withBusy(`Saving decision (${decision})`, async () => {
        await apiRequest(`/api/sessions/${selectedSessionId}/decisions/${photoId}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ decision })
        });

        const [progressPayload, photosPayload] = await Promise.all([
          apiRequest<{ progress: SessionProgressSummary }>(
            `/api/sessions/${selectedSessionId}/progress`
          ),
          apiRequest<{ photos: SessionPhotoRecord[] }>(`/api/sessions/${selectedSessionId}/photos`)
        ]);

        setProgress(progressPayload.progress);
        setSessionPhotos(photosPayload.photos);
      }).catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : "Failed to save decision");
      });
    },
    [selectedSessionId, withBusy]
  );

  return (
    <main className="app-shell">
      <header className="hero">
        <p className="kicker">Picture Pruner</p>
        <h1>Review Dashboard</h1>
        <p>Import, analyze duplicates, and mark keep/reject/maybe selections.</p>
      </header>

      <section className="card">
        <h2>Connection</h2>
        <p>
          API:{" "}
          <strong>{health ? `${health.status} (${health.timestamp})` : "Loading..."}</strong>
        </p>
        <p className="path">{health?.dbFilePath ?? "Waiting for API response..."}</p>
      </section>

      <section className="card">
        <h2>Session Setup</h2>
        <div className="row">
          <input
            type="text"
            value={importRootInput}
            onChange={(event) => setImportRootInput(event.target.value)}
            placeholder="/absolute/path/to/photos"
          />
          <button onClick={() => void onCreateSession()} disabled={busyAction !== null}>
            Create Session
          </button>
        </div>
        <div className="row">
          <select
            value={selectedSessionId ?? ""}
            onChange={(event) =>
              setSelectedSessionId(event.target.value ? event.target.value : null)
            }
          >
            <option value="">Select a session</option>
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.id.slice(0, 8)} | {session.photoCount} photos
              </option>
            ))}
          </select>
          <button onClick={() => void loadSessions()} disabled={busyAction !== null}>
            Refresh Sessions
          </button>
        </div>
        <p className="path">{selectedSession?.importRoot ?? "No session selected"}</p>
      </section>

      <section className="card">
        <h2>Actions</h2>
        <div className="row wrap">
          <button
            disabled={!selectedSessionId || busyAction !== null}
            onClick={() =>
              void runSessionAction(
                "Importing photos",
                `/api/sessions/${selectedSessionId}/import`,
                "Import finished"
              )
            }
          >
            Import Photos
          </button>
          <button
            disabled={!selectedSessionId || busyAction !== null}
            onClick={() =>
              void runSessionAction(
                "Analyzing exact duplicates",
                `/api/sessions/${selectedSessionId}/analysis/exact-duplicates`,
                "Exact duplicate analysis finished"
              )
            }
          >
            Analyze Exact Duplicates
          </button>
          <button
            disabled={!selectedSessionId || busyAction !== null}
            onClick={() =>
              void runSessionAction(
                "Analyzing similar candidates",
                `/api/sessions/${selectedSessionId}/analysis/similar-candidates`,
                "Similar candidate analysis finished"
              )
            }
          >
            Analyze Similar Candidates
          </button>
          <button
            disabled={!selectedSessionId || busyAction !== null}
            onClick={() =>
              void withBusy("Refreshing data", async () => {
                if (selectedSessionId) {
                  await Promise.all([loadSessions(), loadSessionDetails(selectedSessionId)]);
                  setStatusMessage("Session data refreshed");
                }
              }).catch((error) => {
                setErrorMessage(
                  error instanceof Error ? error.message : "Failed to refresh session"
                );
              })
            }
          >
            Refresh Session Data
          </button>
        </div>
        <p className="hint">{busyAction ?? statusMessage ?? "Ready"}</p>
        {errorMessage ? <p className="error">{errorMessage}</p> : null}
      </section>

      <section className="card">
        <h2>Progress</h2>
        {progress ? (
          <dl className="metrics">
            <dt>Total Photos</dt>
            <dd>{progress.totalPhotos}</dd>
            <dt>Keep</dt>
            <dd>{progress.keepCount}</dd>
            <dt>Reject</dt>
            <dd>{progress.rejectCount}</dd>
            <dt>Maybe</dt>
            <dd>{progress.maybeCount}</dd>
            <dt>Undecided</dt>
            <dd>{progress.undecidedCount}</dd>
            <dt>Exact Groups</dt>
            <dd>{progress.exactGroupCount}</dd>
            <dt>Similar Groups</dt>
            <dd>{progress.similarGroupCount}</dd>
          </dl>
        ) : (
          <p>Select a session to view progress.</p>
        )}
      </section>

      <section className="card">
        <h2>Exact Duplicate Groups ({exactGroups.length})</h2>
        {exactGroups.length === 0 ? (
          <p>No exact duplicate groups yet.</p>
        ) : (
          <div className="group-list">
            {exactGroups.map((group) => (
              <article className="group-card" key={group.id}>
                <header>
                  <strong>{group.id.slice(0, 8)}</strong>
                  <span>confidence {group.confidence.toFixed(2)}</span>
                </header>
                {group.photos.map((photo) => (
                  <div className="photo-row" key={photo.id}>
                    <span className="path">{photo.sourcePath}</span>
                    <span className={`decision-badge ${decisionByPhotoId.get(photo.id) ?? "none"}`}>
                      {decisionByPhotoId.get(photo.id) ?? "undecided"}
                    </span>
                    <div className="decision-actions">
                      {decisionValues.map((decision) => (
                        <button
                          key={decision}
                          disabled={busyAction !== null}
                          onClick={() => void setDecision(photo.id, decision)}
                        >
                          {decision}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2>Similar Candidate Groups ({similarGroups.length})</h2>
        {similarGroups.length === 0 ? (
          <p>No similar candidate groups yet.</p>
        ) : (
          <div className="group-list">
            {similarGroups.map((group) => (
              <article className="group-card" key={group.id}>
                <header>
                  <strong>{group.id.slice(0, 8)}</strong>
                  <span>confidence {group.confidence.toFixed(2)}</span>
                </header>
                {group.photos.map((photo) => (
                  <div className="photo-row" key={photo.id}>
                    <span className="path">{photo.sourcePath}</span>
                    <span className={`decision-badge ${decisionByPhotoId.get(photo.id) ?? "none"}`}>
                      {decisionByPhotoId.get(photo.id) ?? "undecided"}
                    </span>
                    <div className="decision-actions">
                      {decisionValues.map((decision) => (
                        <button
                          key={decision}
                          disabled={busyAction !== null}
                          onClick={() => void setDecision(photo.id, decision)}
                        >
                          {decision}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default App;
