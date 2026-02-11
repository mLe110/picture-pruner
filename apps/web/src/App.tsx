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

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select";
}

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [importRootInput, setImportRootInput] = useState("");
  const [exportRootInput, setExportRootInput] = useState("");
  const [showUndecidedOnly, setShowUndecidedOnly] = useState(false);
  const [progress, setProgress] = useState<SessionProgressSummary | null>(null);
  const [exactGroups, setExactGroups] = useState<PhotoGroupResult[]>([]);
  const [similarGroups, setSimilarGroups] = useState<PhotoGroupResult[]>([]);
  const [sessionPhotos, setSessionPhotos] = useState<SessionPhotoRecord[]>([]);
  const [currentPhotoId, setCurrentPhotoId] = useState<string | null>(null);
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

  const reviewPhotos = useMemo(
    () =>
      showUndecidedOnly
        ? sessionPhotos.filter((photo) => photo.decision === null)
        : sessionPhotos,
    [sessionPhotos, showUndecidedOnly]
  );

  const currentPhoto = useMemo(
    () => reviewPhotos.find((photo) => photo.id === currentPhotoId) ?? null,
    [reviewPhotos, currentPhotoId]
  );

  const currentPhotoIndex = useMemo(() => {
    if (!currentPhotoId) {
      return -1;
    }
    return reviewPhotos.findIndex((photo) => photo.id === currentPhotoId);
  }, [currentPhotoId, reviewPhotos]);

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

  const refreshSelectedSession = useCallback(async () => {
    const sessionId = selectedSessionId;
    if (!sessionId) {
      return;
    }

    await Promise.all([loadSessions(), loadSessionDetails(sessionId)]);
  }, [loadSessionDetails, loadSessions, selectedSessionId]);

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

  useEffect(() => {
    if (reviewPhotos.length === 0) {
      setCurrentPhotoId(null);
      return;
    }

    if (!currentPhotoId || !reviewPhotos.some((photo) => photo.id === currentPhotoId)) {
      setCurrentPhotoId(reviewPhotos[0].id);
    }
  }, [currentPhotoId, reviewPhotos]);

  const navigateReviewPhoto = useCallback(
    (offset: number) => {
      if (reviewPhotos.length === 0) {
        return;
      }

      const currentIndex =
        currentPhotoId !== null
          ? reviewPhotos.findIndex((photo) => photo.id === currentPhotoId)
          : -1;
      const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
      const nextIndex =
        ((safeCurrentIndex + offset) % reviewPhotos.length + reviewPhotos.length) %
        reviewPhotos.length;
      setCurrentPhotoId(reviewPhotos[nextIndex].id);
    },
    [currentPhotoId, reviewPhotos]
  );

  const saveDecision = useCallback(
    async (photoId: string, decision: DecisionValue, autoAdvance = false) => {
      const sessionId = selectedSessionId;
      if (!sessionId) {
        return;
      }

      await withBusy(`Saving decision (${decision})`, async () => {
        await apiRequest(`/api/sessions/${sessionId}/decisions/${photoId}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ decision })
        });

        const [progressPayload, photosPayload] = await Promise.all([
          apiRequest<{ progress: SessionProgressSummary }>(`/api/sessions/${sessionId}/progress`),
          apiRequest<{ photos: SessionPhotoRecord[] }>(`/api/sessions/${sessionId}/photos`)
        ]);

        setProgress(progressPayload.progress);
        setSessionPhotos(photosPayload.photos);

        if (autoAdvance) {
          navigateReviewPhoto(1);
        }
      }).catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : "Failed to save decision");
      });
    },
    [navigateReviewPhoto, selectedSessionId, withBusy]
  );

  const clearDecision = useCallback(
    async (photoId: string) => {
      const sessionId = selectedSessionId;
      if (!sessionId) {
        return;
      }

      await withBusy("Clearing decision", async () => {
        await apiRequest(`/api/sessions/${sessionId}/decisions/${photoId}`, {
          method: "DELETE"
        });
        const [progressPayload, photosPayload] = await Promise.all([
          apiRequest<{ progress: SessionProgressSummary }>(`/api/sessions/${sessionId}/progress`),
          apiRequest<{ photos: SessionPhotoRecord[] }>(`/api/sessions/${sessionId}/photos`)
        ]);
        setProgress(progressPayload.progress);
        setSessionPhotos(photosPayload.photos);
      }).catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : "Failed to clear decision");
      });
    },
    [selectedSessionId, withBusy]
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (busyAction !== null || isTypingTarget(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "j" || key === "arrowright") {
        event.preventDefault();
        navigateReviewPhoto(1);
        return;
      }
      if (key === "h" || key === "arrowleft") {
        event.preventDefault();
        navigateReviewPhoto(-1);
        return;
      }
      if (key === "x") {
        event.preventDefault();
        setShowUndecidedOnly((value) => !value);
        return;
      }
      if (!currentPhotoId) {
        return;
      }
      if (key === "k") {
        event.preventDefault();
        void saveDecision(currentPhotoId, "keep", true);
        return;
      }
      if (key === "m") {
        event.preventDefault();
        void saveDecision(currentPhotoId, "maybe", true);
        return;
      }
      if (key === "r") {
        event.preventDefault();
        void saveDecision(currentPhotoId, "reject", true);
        return;
      }
      if (key === "u") {
        event.preventDefault();
        void clearDecision(currentPhotoId);
      }
    };

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
    };
  }, [busyAction, clearDecision, currentPhotoId, navigateReviewPhoto, saveDecision]);

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
    async (actionName: string, endpoint: string, successMessage: string) => {
      if (!selectedSessionId) {
        setErrorMessage("Select a session first.");
        return;
      }

      await withBusy(actionName, async () => {
        await apiRequest(endpoint, { method: "POST" });
        await refreshSelectedSession();
        setStatusMessage(successMessage);
      }).catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : `Failed: ${actionName}`);
      });
    },
    [refreshSelectedSession, selectedSessionId, withBusy]
  );

  const onExportSelection = useCallback(async () => {
    if (!selectedSessionId) {
      setErrorMessage("Select a session first.");
      return;
    }
    if (!exportRootInput.trim()) {
      setErrorMessage("Export root is required.");
      return;
    }

    await withBusy("Exporting selected photos", async () => {
      const payload = await apiRequest<{
        result: {
          outputRoot: string;
          selectedPhotoCount: number;
          exportedPhotoCount: number;
          missingSourceCount: number;
          skippedCount: number;
        };
      }>(`/api/sessions/${selectedSessionId}/export`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ outputRoot: exportRootInput.trim() })
      });

      const summary = payload.result;
      setStatusMessage(
        `Exported ${summary.exportedPhotoCount}/${summary.selectedPhotoCount} keep photos to ${summary.outputRoot} (missing: ${summary.missingSourceCount}, skipped: ${summary.skippedCount})`
      );
    }).catch((error) => {
      setErrorMessage(error instanceof Error ? error.message : "Failed to export selection");
    });
  }, [exportRootInput, selectedSessionId, withBusy]);

  return (
    <main className="app-shell">
      <header className="hero">
        <p className="kicker">Picture Pruner</p>
        <h1>Review Dashboard</h1>
        <p>Import, analyze duplicates, and curate with hotkeys.</p>
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
        <div className="row">
          <input
            type="text"
            value={exportRootInput}
            onChange={(event) => setExportRootInput(event.target.value)}
            placeholder="/absolute/path/to/export-folder"
          />
          <button
            disabled={!selectedSessionId || busyAction !== null}
            onClick={() => void onExportSelection()}
          >
            Export Keep Selection
          </button>
        </div>
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
                await refreshSelectedSession();
                setStatusMessage("Session data refreshed");
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

      <section className="card review-card">
        <div className="review-header">
          <h2>Review</h2>
          <label className="toggle">
            <input
              type="checkbox"
              checked={showUndecidedOnly}
              onChange={(event) => setShowUndecidedOnly(event.target.checked)}
            />
            Undecided only
          </label>
        </div>

        <p className="hint hotkeys">
          Hotkeys: <code>h</code>/<code>j</code> navigate, <code>k</code> keep, <code>m</code>{" "}
          maybe, <code>r</code> reject, <code>u</code> clear, <code>x</code> toggle undecided
          filter.
        </p>

        {currentPhoto ? (
          <div className="review-grid">
            <div className="preview-pane">
              <img
                src={`/api/sessions/${selectedSessionId}/photos/${currentPhoto.id}/file`}
                alt={currentPhoto.sourcePath}
              />
            </div>
            <div className="review-meta">
              <p>
                Photo {currentPhotoIndex + 1} / {reviewPhotos.length}
              </p>
              <p className="path">{currentPhoto.sourcePath}</p>
              <p>
                {currentPhoto.width && currentPhoto.height
                  ? `${currentPhoto.width}x${currentPhoto.height}`
                  : "Unknown dimensions"}{" "}
                | {currentPhoto.fileSize} bytes
              </p>
              <p>
                Decision:{" "}
                <strong>{decisionByPhotoId.get(currentPhoto.id) ?? "undecided"}</strong>
              </p>
              <div className="row wrap">
                <button disabled={busyAction !== null} onClick={() => navigateReviewPhoto(-1)}>
                  Prev
                </button>
                <button disabled={busyAction !== null} onClick={() => navigateReviewPhoto(1)}>
                  Next
                </button>
                <button
                  disabled={busyAction !== null}
                  onClick={() => void saveDecision(currentPhoto.id, "keep", true)}
                >
                  Keep
                </button>
                <button
                  disabled={busyAction !== null}
                  onClick={() => void saveDecision(currentPhoto.id, "maybe", true)}
                >
                  Maybe
                </button>
                <button
                  disabled={busyAction !== null}
                  onClick={() => void saveDecision(currentPhoto.id, "reject", true)}
                >
                  Reject
                </button>
                <button disabled={busyAction !== null} onClick={() => void clearDecision(currentPhoto.id)}>
                  Clear
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p>No photos available in this review queue.</p>
        )}
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
                    <button className="link-button path" onClick={() => setCurrentPhotoId(photo.id)}>
                      {photo.sourcePath}
                    </button>
                    <span className={`decision-badge ${decisionByPhotoId.get(photo.id) ?? "none"}`}>
                      {decisionByPhotoId.get(photo.id) ?? "undecided"}
                    </span>
                    <div className="decision-actions">
                      {decisionValues.map((decision) => (
                        <button
                          key={decision}
                          disabled={busyAction !== null}
                          onClick={() => void saveDecision(photo.id, decision)}
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
                    <button className="link-button path" onClick={() => setCurrentPhotoId(photo.id)}>
                      {photo.sourcePath}
                    </button>
                    <span className={`decision-badge ${decisionByPhotoId.get(photo.id) ?? "none"}`}>
                      {decisionByPhotoId.get(photo.id) ?? "undecided"}
                    </span>
                    <div className="decision-actions">
                      {decisionValues.map((decision) => (
                        <button
                          key={decision}
                          disabled={busyAction !== null}
                          onClick={() => void saveDecision(photo.id, decision)}
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
