import { describe, expect, it, beforeEach } from "vitest";
import { clearAllChatLogs, logInteraction } from "../../learning/chat-logger.js";
import { clearAllPreferences, updatePreferences } from "../../learning/preference-engine.js";
import { createLearningTool } from "./learning-tool.js";

describe("learning-tool", () => {
  beforeEach(() => {
    clearAllChatLogs();
    clearAllPreferences();
  });

  it("creates a tool with correct name and label", () => {
    const tool = createLearningTool();
    expect(tool.name).toBe("learning");
    expect(tool.label).toBe("Personal Learning");
  });

  it("get_preferences returns no prefs when empty", async () => {
    const tool = createLearningTool({ senderId: "user-1" });
    const result = await tool.execute("test-id", { action: "get_preferences" });
    const parsed = JSON.parse((result.content[0] as { text: string }).text);
    expect(parsed.message).toContain("No preferences");
  });

  it("get_preferences returns prefs after interactions", async () => {
    logInteraction("user-1", "Tell me about TypeScript", "TypeScript is...", {
      topics: ["typescript", "programming"],
    });
    updatePreferences("user-1");

    const tool = createLearningTool({ senderId: "user-1" });
    const result = await tool.execute("test-id", { action: "get_preferences" });
    const parsed = JSON.parse((result.content[0] as { text: string }).text);
    expect(parsed.preferences).toBeDefined();
    expect(parsed.preferences.userId).toBe("user-1");
  });

  it("get_interaction_count returns count", async () => {
    logInteraction("user-2", "Hello", "Hi!", {});
    logInteraction("user-2", "How are you?", "Good!", {});

    const tool = createLearningTool({ senderId: "user-2" });
    const result = await tool.execute("test-id", { action: "get_interaction_count" });
    const parsed = JSON.parse((result.content[0] as { text: string }).text);
    expect(parsed.interactionCount).toBe(2);
  });

  it("extract_topics returns topics from text", async () => {
    const tool = createLearningTool();
    const result = await tool.execute("test-id", {
      action: "extract_topics",
      text: "I want to learn about machine learning and Python programming",
    });
    const parsed = JSON.parse((result.content[0] as { text: string }).text);
    expect(parsed.topics).toBeDefined();
    expect(Array.isArray(parsed.topics)).toBe(true);
  });
});
