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
