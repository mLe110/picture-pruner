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

export interface ExactDuplicateAnalysisResult {
  sessionId: string;
  scannedPhotoCount: number;
  hashedPhotoCount: number;
  duplicateGroupCount: number;
  duplicatePhotoCount: number;
  missingFileCount: number;
  startedAt: string;
  finishedAt: string;
}

export interface SimilarDuplicateAnalysisResult {
  sessionId: string;
  scannedPhotoCount: number;
  candidateGroupCount: number;
  candidatePhotoCount: number;
  startedAt: string;
  finishedAt: string;
}

export interface GroupedPhotoItem {
  id: string;
  sourcePath: string;
  rank: number | null;
}

export interface PhotoGroupResult {
  id: string;
  createdAt: string;
  confidence: number;
  photos: GroupedPhotoItem[];
}

export interface SessionDecisionRecord {
  sessionId: string;
  photoId: string;
  sourcePath: string;
  decision: DecisionValue;
  reason: string | null;
  updatedAt: string;
}

export interface SessionProgressSummary {
  sessionId: string;
  totalPhotos: number;
  keepCount: number;
  rejectCount: number;
  maybeCount: number;
  undecidedCount: number;
  exactGroupCount: number;
  similarGroupCount: number;
}

export interface SessionPhotoRecord {
  id: string;
  sourcePath: string;
  fileSize: number;
  width: number | null;
  height: number | null;
  takenAt: string | null;
  decision: DecisionValue | null;
}

export interface ExportSessionRequest {
  outputRoot: string;
}

export interface ExportSessionResult {
  sessionId: string;
  outputRoot: string;
  selectedPhotoCount: number;
  exportedPhotoCount: number;
  missingSourceCount: number;
  skippedCount: number;
  startedAt: string;
  finishedAt: string;
}

export interface PickGroupPhotoRequest {
  keepPhotoId: string;
  rejectOthers?: boolean;
  reason?: string;
}

export interface PickGroupPhotoResult {
  sessionId: string;
  groupId: string;
  keepPhotoId: string;
  rejectOthers: boolean;
  updatedCount: number;
}
