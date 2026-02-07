import { afterEach, describe, expect, it } from "vitest";
import {
  approveProposal,
  clearAllProposals,
  configureSelfUpdate,
  discoverUpdate,
  getProposal,
  listProposals,
  rejectProposal,
  runSafetyCheck,
  updateProposalStatus,
} from "./update-monitor.js";

afterEach(() => {
  clearAllProposals();
  configureSelfUpdate({
    enabled: true,
    autoApplyLowRisk: false,
    requireApproval: true,
    maxPendingProposals: 50,
  });
});

describe("discoverUpdate", () => {
  it("should create a proposal", () => {
    const proposal = discoverUpdate({
      title: "Upgrade model provider",
      description: "New provider version available with better performance",
      category: "model",
      source: "release-monitor",
    });
    expect(proposal).toBeDefined();
    expect(proposal!.status).toBe("discovered");
    expect(proposal!.category).toBe("model");
  });

  it("should return undefined when disabled", () => {
    configureSelfUpdate({ enabled: false });
    const proposal = discoverUpdate({
      title: "Test",
      description: "Test update",
      category: "model",
      source: "test",
    });
    expect(proposal).toBeUndefined();
  });

  it("should enforce pending limit", () => {
    configureSelfUpdate({ maxPendingProposals: 2 });
    discoverUpdate({ title: "1", description: "test1", category: "model", source: "test" });
    discoverUpdate({ title: "2", description: "test2", category: "model", source: "test" });
    const third = discoverUpdate({
      title: "3",
      description: "test3",
      category: "model",
      source: "test",
    });
    expect(third).toBeUndefined();
  });

  it("should default to low impact and risk", () => {
    const proposal = discoverUpdate({
      title: "Test",
      description: "Test update description here",
      category: "performance",
      source: "test",
    });
    expect(proposal!.impact).toBe("low");
    expect(proposal!.risk).toBe("low");
  });
});

describe("updateProposalStatus", () => {
  it("should transition status", () => {
    const proposal = discoverUpdate({
      title: "Test",
      description: "Test update",
      category: "model",
      source: "test",
    });
    const updated = updateProposalStatus(proposal!.id, "analyzing");
    expect(updated!.status).toBe("analyzing");
  });

  it("should accept test results", () => {
    const proposal = discoverUpdate({
      title: "Test",
      description: "Test update",
      category: "model",
      source: "test",
    });
    const updated = updateProposalStatus(proposal!.id, "testing", {
      testResults: {
        passed: true,
        testsRun: 10,
        testsPassed: 10,
        summary: "All tests passed",
        completedAt: new Date().toISOString(),
      },
    });
    expect(updated!.testResults).toBeDefined();
    expect(updated!.testResults!.passed).toBe(true);
  });

  it("should return undefined for unknown proposal", () => {
    expect(updateProposalStatus("unknown", "analyzing")).toBeUndefined();
  });
});

describe("runSafetyCheck", () => {
  it("should pass safety checks for low-risk model update", () => {
    const proposal = discoverUpdate({
      title: "Minor model update",
      description: "Updated model definitions for better accuracy in responses",
      category: "model",
      source: "release-feed",
    });
    // Add test results
    updateProposalStatus(proposal!.id, "testing", {
      testResults: {
        passed: true,
        testsRun: 5,
        testsPassed: 5,
        summary: "All tests passed",
        completedAt: new Date().toISOString(),
      },
    });

    const check = runSafetyCheck(proposal!.id);
    expect(check).toBeDefined();
    expect(check!.safe).toBe(true);
    expect(check!.riskLevel).toBe("low");
  });

  it("should flag security updates as high risk", () => {
    const proposal = discoverUpdate({
      title: "Security patch",
      description: "Fix critical vulnerability in authentication flow process",
      category: "security",
      source: "security-scanner",
      risk: "high",
    });

    const check = runSafetyCheck(proposal!.id);
    expect(check!.riskLevel).toBe("high");
  });

  it("should fail when tests not present", () => {
    const proposal = discoverUpdate({
      title: "Test update",
      description: "An update without test verification results",
      category: "performance",
      source: "test",
    });
    const check = runSafetyCheck(proposal!.id);
    expect(check).toBeDefined();
    // Should have at least one failed check (test_verification)
    expect(check!.checks.some((c) => c.name === "test_verification" && !c.passed)).toBe(true);
  });
});

describe("approveProposal", () => {
  it("should approve proposals in awaiting_approval status", () => {
    const proposal = discoverUpdate({
      title: "Test",
      description: "Test update",
      category: "model",
      source: "test",
    });
    updateProposalStatus(proposal!.id, "awaiting_approval");
    const approved = approveProposal(proposal!.id);
    expect(approved!.status).toBe("approved");
  });

  it("should not approve proposals in other statuses", () => {
    const proposal = discoverUpdate({
      title: "Test",
      description: "Test update",
      category: "model",
      source: "test",
    });
    // Still in "discovered" status
    const result = approveProposal(proposal!.id);
    expect(result).toBeUndefined();
  });
});

describe("requireApproval config", () => {
  it("should skip awaiting_approval when requireApproval is false", () => {
    configureSelfUpdate({ requireApproval: false });
    const proposal = discoverUpdate({
      title: "Test",
      description: "Test update",
      category: "model",
      source: "test",
    });
    // Trying to move to awaiting_approval should auto-promote to approved
    const updated = updateProposalStatus(proposal!.id, "awaiting_approval");
    expect(updated!.status).toBe("approved");
  });
});

describe("autoApplyLowRisk config", () => {
  it("should auto-apply low-risk approved proposals with passing tests", () => {
    configureSelfUpdate({ autoApplyLowRisk: true, requireApproval: false });
    const proposal = discoverUpdate({
      title: "Minor tweak",
      description: "A small low-risk improvement to the system",
      category: "performance",
      source: "monitor",
      risk: "low",
    });
    updateProposalStatus(proposal!.id, "testing", {
      testResults: {
        passed: true,
        testsRun: 5,
        testsPassed: 5,
        summary: "All tests passed",
        completedAt: new Date().toISOString(),
      },
    });
    // Moving to awaiting_approval should cascade: skip approval → auto-apply
    const updated = updateProposalStatus(proposal!.id, "awaiting_approval");
    expect(updated!.status).toBe("applied");
  });

  it("should NOT auto-apply medium-risk proposals", () => {
    configureSelfUpdate({ autoApplyLowRisk: true, requireApproval: false });
    const proposal = discoverUpdate({
      title: "Medium risk",
      description: "A medium-risk improvement to the system",
      category: "performance",
      source: "monitor",
      risk: "medium",
    });
    updateProposalStatus(proposal!.id, "testing", {
      testResults: {
        passed: true,
        testsRun: 5,
        testsPassed: 5,
        summary: "All tests passed",
        completedAt: new Date().toISOString(),
      },
    });
    const updated = updateProposalStatus(proposal!.id, "awaiting_approval");
    expect(updated!.status).toBe("approved"); // approved but NOT auto-applied
  });
});

describe("rejectProposal", () => {
  it("should reject with a reason", () => {
    const proposal = discoverUpdate({
      title: "Test",
      description: "Test update",
      category: "model",
      source: "test",
    });
    const rejected = rejectProposal(proposal!.id, "Not needed at this time");
    expect(rejected!.status).toBe("rejected");
    expect(rejected!.rejectionReason).toBe("Not needed at this time");
  });
});

describe("listProposals", () => {
  it("should list all proposals", () => {
    discoverUpdate({ title: "1", description: "test1", category: "model", source: "test" });
    discoverUpdate({ title: "2", description: "test2", category: "security", source: "test" });
    const all = listProposals();
    expect(all).toHaveLength(2);
  });

  it("should filter by status", () => {
    const p1 = discoverUpdate({
      title: "1",
      description: "test1",
      category: "model",
      source: "test",
    });
    discoverUpdate({ title: "2", description: "test2", category: "model", source: "test" });
    updateProposalStatus(p1!.id, "analyzing");

    expect(listProposals({ status: "discovered" })).toHaveLength(1);
    expect(listProposals({ status: "analyzing" })).toHaveLength(1);
  });

  it("should filter by category", () => {
    discoverUpdate({ title: "1", description: "test1", category: "model", source: "test" });
    discoverUpdate({ title: "2", description: "test2", category: "security", source: "test" });
    expect(listProposals({ category: "model" })).toHaveLength(1);
  });
});

describe("getProposal", () => {
  it("should return undefined for unknown ID", () => {
    expect(getProposal("unknown")).toBeUndefined();
  });
});
