export const duplicateGroupKinds = ["exact", "similar"] as const;
export type DuplicateGroupKind = (typeof duplicateGroupKinds)[number];

export const decisionValues = ["keep", "reject", "maybe"] as const;
export type DecisionValue = (typeof decisionValues)[number];

export const sessionStatuses = ["active", "completed", "archived"] as const;
export type SessionStatus = (typeof sessionStatuses)[number];

export interface HealthResponse {
  status: "ok";
  timestamp: string;
  dbFilePath: string;
}

export interface SessionSummary {
  id: string;
  importRoot: string;
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
  photoCount: number;
}

export interface CreateSessionRequest {
  importRoot: string;
}

export interface ImportSessionRequest {
  importRoot?: string;
}

export interface ImportSessionResult {
  sessionId: string;
  importRoot: string;
  scannedFileCount: number;
  importedPhotoCount: number;
  updatedPhotoCount: number;
  linkedExistingCount: number;
  skippedFileCount: number;
  startedAt: string;
  finishedAt: string;
}
