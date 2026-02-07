/**
 * Update monitor for discovering potential improvements.
 *
 * Tracks proposals from discovery through testing, approval,
 * and application, with safety checks at each stage.
 */

import type { SafetyCheck, SelfUpdateConfig, TestResult, UpdateCategory, UpdateProposal, UpdateStatus } from "./types.js";

const DEFAULT_CONFIG: SelfUpdateConfig = {
  enabled: true,
  autoApplyLowRisk: false,
  requireApproval: true,
  maxPendingProposals: 50,
};

let activeConfig: SelfUpdateConfig = { ...DEFAULT_CONFIG };

/** In-memory proposal store. */
const proposals = new Map<string, UpdateProposal>();

let idCounter = 0;

function generateId(): string {
  return `update-${Date.now()}-${++idCounter}`;
}

/**
 * Configure the self-update system.
 */
export function configureSelfUpdate(config: Partial<SelfUpdateConfig>): void {
  activeConfig = { ...activeConfig, ...config };
}

/**
 * Get the current self-update configuration.
 */
export function getSelfUpdateConfig(): SelfUpdateConfig {
  return { ...activeConfig };
}

/**
 * Register a newly discovered potential update.
 */
export function discoverUpdate(params: {
  title: string;
  description: string;
  category: UpdateCategory;
  source: string;
  impact?: "low" | "medium" | "high";
  risk?: "low" | "medium" | "high";
}): UpdateProposal | undefined {
  if (!activeConfig.enabled) {
    return undefined;
  }

  // Enforce pending limit
  const pendingCount = Array.from(proposals.values()).filter(
    (p) => !["applied", "rejected", "failed"].includes(p.status),
  ).length;
  if (pendingCount >= activeConfig.maxPendingProposals) {
    return undefined;
  }

  const now = new Date().toISOString();
  const proposal: UpdateProposal = {
    id: generateId(),
    title: params.title,
    description: params.description,
    category: params.category,
    source: params.source,
    status: "discovered",
    impact: params.impact ?? "low",
    risk: params.risk ?? "low",
    discoveredAt: now,
    updatedAt: now,
  };

  proposals.set(proposal.id, proposal);
  return structuredClone(proposal);
}

/**
 * Transition a proposal to a new status.
 *
 * Respects `requireApproval`: when enabled, proposals must go through
 * "awaiting_approval" before being approved. When disabled, proposals
 * can transition directly from "testing" to "approved".
 *
 * Respects `autoApplyLowRisk`: when enabled, a low-risk proposal that
 * passes safety checks and tests is automatically moved to "applied".
 */
export function updateProposalStatus(
  proposalId: string,
  status: UpdateStatus,
  context?: { rejectionReason?: string; testResults?: TestResult },
): UpdateProposal | undefined {
  const proposal = proposals.get(proposalId);
  if (!proposal) {
    return undefined;
  }

  proposal.status = status;
  proposal.updatedAt = new Date().toISOString();

  if (context?.rejectionReason) {
    proposal.rejectionReason = context.rejectionReason;
  }
  if (context?.testResults) {
    proposal.testResults = context.testResults;
  }

  // When approval is not required, skip the awaiting_approval step
  if (!activeConfig.requireApproval && status === "awaiting_approval") {
    proposal.status = "approved";
  }

  // Auto-apply low-risk proposals when enabled and tests passed
  if (
    activeConfig.autoApplyLowRisk &&
    proposal.status === "approved" &&
    proposal.risk === "low" &&
    proposal.testResults?.passed
  ) {
    proposal.status = "applied";
  }

  return structuredClone(proposal);
}

/**
 * Run safety checks on a proposal.
 *
 * Evaluates the risk and category of the update against safety criteria.
 */
export function runSafetyCheck(proposalId: string): SafetyCheck | undefined {
  const proposal = proposals.get(proposalId);
  if (!proposal) {
    return undefined;
  }

  const checks: SafetyCheck["checks"] = [];

  // Check 1: Category risk assessment
  const highRiskCategories: UpdateCategory[] = ["security", "feature"];
  const isCategoryRisky = highRiskCategories.includes(proposal.category);
  checks.push({
    name: "category_risk",
    passed: !isCategoryRisky,
    details: isCategoryRisky
      ? `Category '${proposal.category}' requires extra review`
      : `Category '${proposal.category}' is standard`,
  });

  // Check 2: Impact/risk ratio
  const riskValues = { low: 1, medium: 2, high: 3 };
  const impactValue = riskValues[proposal.impact];
  const riskValue = riskValues[proposal.risk];
  const riskRatioOk = impactValue >= riskValue;
  checks.push({
    name: "impact_risk_ratio",
    passed: riskRatioOk,
    details: riskRatioOk
      ? "Impact justifies the risk level"
      : "Risk exceeds expected impact",
  });

  // Check 3: Test results (if available)
  const hasTests = proposal.testResults !== undefined;
  const testsPassed = proposal.testResults?.passed ?? false;
  checks.push({
    name: "test_verification",
    passed: hasTests && testsPassed,
    details: hasTests
      ? testsPassed
        ? `All ${proposal.testResults!.testsRun} tests passed`
        : `${proposal.testResults!.testsRun - proposal.testResults!.testsPassed} tests failed`
      : "No test results available",
  });

  // Check 4: Description completeness
  const hasDescription = proposal.description.length > 20;
  checks.push({
    name: "description_quality",
    passed: hasDescription,
    details: hasDescription
      ? "Description is sufficiently detailed"
      : "Description needs more detail",
  });

  const allPassed = checks.every((c) => c.passed);
  const riskLevel: SafetyCheck["riskLevel"] =
    proposal.risk === "high" || isCategoryRisky
      ? "high"
      : proposal.risk === "medium"
        ? "medium"
        : "low";

  return {
    safe: allPassed,
    checks,
    riskLevel,
    checkedAt: new Date().toISOString(),
  };
}

/**
 * Get a specific proposal by ID.
 */
export function getProposal(proposalId: string): UpdateProposal | undefined {
  const proposal = proposals.get(proposalId);
  return proposal ? structuredClone(proposal) : undefined;
}

/**
 * List proposals, optionally filtered by status.
 */
export function listProposals(filter?: { status?: UpdateStatus; category?: UpdateCategory }): UpdateProposal[] {
  let result = Array.from(proposals.values());

  if (filter?.status) {
    result = result.filter((p) => p.status === filter.status);
  }
  if (filter?.category) {
    result = result.filter((p) => p.category === filter.category);
  }

  return result
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((p) => structuredClone(p));
}

/**
 * Approve a proposal (moves from awaiting_approval to approved).
 */
export function approveProposal(proposalId: string): UpdateProposal | undefined {
  const proposal = proposals.get(proposalId);
  if (!proposal || proposal.status !== "awaiting_approval") {
    return undefined;
  }
  return updateProposalStatus(proposalId, "approved");
}

/**
 * Reject a proposal with a reason.
 */
export function rejectProposal(proposalId: string, reason: string): UpdateProposal | undefined {
  const proposal = proposals.get(proposalId);
  if (!proposal) {
    return undefined;
  }
  return updateProposalStatus(proposalId, "rejected", { rejectionReason: reason });
}

/**
 * Clear all proposals (useful for testing).
 */
export function clearAllProposals(): void {
  proposals.clear();
  idCounter = 0;
}
