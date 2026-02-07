/**
 * Types for the self-updating system.
 *
 * Supports monitoring AI research, identifying potential improvements,
 * testing changes in isolation, and requesting approval before applying.
 */

/** Status of an update proposal. */
export type UpdateStatus =
  | "discovered"
  | "analyzing"
  | "testing"
  | "awaiting_approval"
  | "approved"
  | "rejected"
  | "applied"
  | "failed";

/** Category of a potential update. */
export type UpdateCategory =
  | "model"
  | "performance"
  | "security"
  | "feature"
  | "bugfix"
  | "dependency";

/** A discovered potential update/improvement. */
export type UpdateProposal = {
  /** Unique identifier for the proposal. */
  id: string;
  /** Human-readable title. */
  title: string;
  /** Detailed description of the change. */
  description: string;
  /** Category of the update. */
  category: UpdateCategory;
  /** Source where this improvement was discovered. */
  source: string;
  /** Current status of the proposal. */
  status: UpdateStatus;
  /** Impact assessment (low/medium/high). */
  impact: "low" | "medium" | "high";
  /** Risk assessment (low/medium/high). */
  risk: "low" | "medium" | "high";
  /** ISO timestamp when discovered. */
  discoveredAt: string;
  /** ISO timestamp of last status change. */
  updatedAt: string;
  /** Test results, if testing has been performed. */
  testResults?: TestResult;
  /** Reason for rejection, if rejected. */
  rejectionReason?: string;
};

/** Test results for a proposed update. */
export type TestResult = {
  /** Whether tests passed. */
  passed: boolean;
  /** Number of tests run. */
  testsRun: number;
  /** Number of tests passed. */
  testsPassed: number;
  /** Summary of test output. */
  summary: string;
  /** ISO timestamp when testing was completed. */
  completedAt: string;
};

/** Safety check result for a proposed update. */
export type SafetyCheck = {
  /** Whether the update passed the safety check. */
  safe: boolean;
  /** Checks performed. */
  checks: Array<{
    name: string;
    passed: boolean;
    details: string;
  }>;
  /** Overall risk level after analysis. */
  riskLevel: "low" | "medium" | "high" | "critical";
  /** ISO timestamp when the check was completed. */
  checkedAt: string;
};

/** Configuration for the self-update system. */
export type SelfUpdateConfig = {
  /** Whether self-update monitoring is enabled. */
  enabled: boolean;
  /** Whether to auto-apply low-risk, approved updates. */
  autoApplyLowRisk: boolean;
  /** Whether approval is required for all updates. */
  requireApproval: boolean;
  /** Maximum number of pending proposals to track. */
  maxPendingProposals: number;
};
