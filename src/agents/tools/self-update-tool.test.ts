import { describe, expect, it, beforeEach } from "vitest";
import { clearAllProposals, configureSelfUpdate } from "../../self-update/update-monitor.js";
import { createSelfUpdateTool } from "./self-update-tool.js";

describe("self-update-tool", () => {
  beforeEach(() => {
    clearAllProposals();
    configureSelfUpdate({
      enabled: true,
      autoApplyLowRisk: false,
      requireApproval: true,
      maxPendingProposals: 50,
    });
  });

  it("creates a tool with correct name and label", () => {
    const tool = createSelfUpdateTool();
    expect(tool.name).toBe("self_update");
    expect(tool.label).toBe("Self-Update");
  });

  it("status action returns config", async () => {
    const tool = createSelfUpdateTool();
    const result = await tool.execute("test-id", { action: "status" });
    const parsed = JSON.parse((result.content[0] as { text: string }).text);
    expect(parsed.config).toBeDefined();
    expect(parsed.config.enabled).toBe(true);
  });

  it("discover action creates a proposal", async () => {
    const tool = createSelfUpdateTool();
    const result = await tool.execute("test-id", {
      action: "discover",
      title: "Test improvement",
      description: "A test improvement that does something useful",
      category: "performance",
      source: "test-suite",
    });
    const parsed = JSON.parse((result.content[0] as { text: string }).text);
    expect(parsed.proposal).toBeDefined();
    expect(parsed.proposal.title).toBe("Test improvement");
    expect(parsed.proposal.status).toBe("discovered");
  });

  it("list action returns proposals", async () => {
    const tool = createSelfUpdateTool();
    await tool.execute("test-id", {
      action: "discover",
      title: "First proposal",
      description: "A first test improvement proposal for listing",
      category: "bugfix",
      source: "test",
    });
    const result = await tool.execute("test-id", { action: "list" });
    const parsed = JSON.parse((result.content[0] as { text: string }).text);
    expect(parsed.count).toBe(1);
    expect(parsed.proposals[0].title).toBe("First proposal");
  });

  it("safety_check action runs safety checks", async () => {
    const tool = createSelfUpdateTool();
    const discoverResult = await tool.execute("test-id", {
      action: "discover",
      title: "Check me",
      description: "An improvement that needs safety checking carefully",
      category: "performance",
      source: "test",
    });
    const proposal = JSON.parse((discoverResult.content[0] as { text: string }).text).proposal;

    const result = await tool.execute("test-id", {
      action: "safety_check",
      proposal_id: proposal.id,
    });
    const parsed = JSON.parse((result.content[0] as { text: string }).text);
    expect(parsed.safetyCheck).toBeDefined();
    expect(parsed.safetyCheck.checks).toBeDefined();
  });
});
