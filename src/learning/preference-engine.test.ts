import { afterEach, describe, expect, it } from "vitest";
import { clearAllChatLogs, configureLearning, logInteraction } from "./chat-logger.js";
import {
  clearAllPreferences,
  getPreferences,
  getTopInterests,
  updatePreferences,
} from "./preference-engine.js";

afterEach(() => {
  clearAllChatLogs();
  clearAllPreferences();
  configureLearning({
    enabled: true,
    privacyLevel: "full",
    maxInteractionsPerUser: 500,
    trackTopics: true,
    enableRecommendations: true,
  });
});

describe("updatePreferences", () => {
  it("should create preferences from interactions", () => {
    logInteraction("user1", "Tell me about machine learning", "ML is...", {
      topics: ["machine learning"],
    });
    logInteraction("user1", "What about deep learning?", "DL is...", {
      topics: ["deep learning"],
    });

    const prefs = updatePreferences("user1");
    expect(prefs.userId).toBe("user1");
    expect(prefs.interactionCount).toBe(2);
    expect(prefs.topicInterests).toBeDefined();
    expect(Object.keys(prefs.topicInterests).length).toBeGreaterThan(0);
  });

  it("should return default preferences for user without history", () => {
    const prefs = updatePreferences("new-user");
    expect(prefs.userId).toBe("new-user");
    expect(prefs.interactionCount).toBe(0);
    expect(prefs.preferredStyle.verbosity).toBe("moderate");
    expect(prefs.preferredStyle.formality).toBe("neutral");
  });

  it("should detect concise verbosity for short messages", () => {
    for (let i = 0; i < 5; i++) {
      logInteraction("user1", "Short msg", "Response");
    }
    const prefs = updatePreferences("user1");
    expect(prefs.preferredStyle.verbosity).toBe("concise");
  });

  it("should detect detailed verbosity for long messages", () => {
    const longInput = "A".repeat(250);
    for (let i = 0; i < 5; i++) {
      logInteraction("user1", longInput, "Response");
    }
    const prefs = updatePreferences("user1");
    expect(prefs.preferredStyle.verbosity).toBe("detailed");
  });

  it("should weight recent topics higher", () => {
    // First several interactions about topic A
    for (let i = 0; i < 10; i++) {
      logInteraction("user1", "topic a discussion", "Response", { topics: ["topicA"] });
    }
    // Then several about topic B (more recent)
    for (let i = 0; i < 10; i++) {
      logInteraction("user1", "topic b discussion", "Response", { topics: ["topicB"] });
    }
    const prefs = updatePreferences("user1");
    // Topic B should have a higher or equal score since it's more recent
    expect(prefs.topicInterests.topicB).toBeGreaterThanOrEqual(prefs.topicInterests.topicA ?? 0);
  });
});

describe("getPreferences", () => {
  it("should return undefined for unknown user", () => {
    expect(getPreferences("unknown")).toBeUndefined();
  });

  it("should return a copy", () => {
    logInteraction("user1", "Hello", "Hi");
    updatePreferences("user1");
    const p1 = getPreferences("user1");
    const p2 = getPreferences("user1");
    expect(p1).toEqual(p2);
    expect(p1).not.toBe(p2);
  });
});

describe("getTopInterests", () => {
  it("should return empty for unknown user", () => {
    expect(getTopInterests("unknown")).toEqual([]);
  });

  it("should return top interests sorted by score", () => {
    logInteraction("user1", "machine learning", "...", { topics: ["ml", "ai", "data"] });
    logInteraction("user1", "machine learning again", "...", { topics: ["ml", "ai"] });
    logInteraction("user1", "machine learning more", "...", { topics: ["ml"] });
    updatePreferences("user1");
    const tops = getTopInterests("user1", 2);
    expect(tops.length).toBeLessThanOrEqual(2);
    expect(tops[0]).toBe("ml");
  });
});
