import { afterEach, describe, expect, it } from "vitest";
import type { ContentItem } from "./recommendations.js";
import { clearAllChatLogs, configureLearning, logInteraction } from "./chat-logger.js";
import { clearAllPreferences, updatePreferences } from "./preference-engine.js";
import { generateRecommendations, resetRecommendationCounter } from "./recommendations.js";

const CATALOG: ContentItem[] = [
  { id: "1", title: "Intro to ML", summary: "Basics of machine learning", topics: ["ml", "ai"] },
  {
    id: "2",
    title: "Deep Learning Guide",
    summary: "Neural networks",
    topics: ["deep learning", "ai"],
  },
  { id: "3", title: "Cooking 101", summary: "Basic recipes", topics: ["cooking", "food"] },
  {
    id: "4",
    title: "Advanced TypeScript",
    summary: "TS patterns",
    topics: ["typescript", "programming"],
  },
];

afterEach(() => {
  clearAllChatLogs();
  clearAllPreferences();
  resetRecommendationCounter();
  configureLearning({
    enabled: true,
    privacyLevel: "full",
    maxInteractionsPerUser: 500,
    trackTopics: true,
    enableRecommendations: true,
  });
});

describe("generateRecommendations", () => {
  it("should return empty for user without preferences", () => {
    const recs = generateRecommendations("unknown", CATALOG);
    expect(recs).toEqual([]);
  });

  it("should recommend based on learned interests", () => {
    logInteraction("user1", "machine learning", "...", { topics: ["ml", "ai"] });
    logInteraction("user1", "artificial intelligence", "...", { topics: ["ai"] });
    updatePreferences("user1");

    const recs = generateRecommendations("user1", CATALOG);
    expect(recs.length).toBeGreaterThan(0);
    // Should recommend ML/AI content, not cooking
    const titles = recs.map((r) => r.title);
    expect(titles).toContain("Intro to ML");
    expect(titles).not.toContain("Cooking 101");
  });

  it("should respect limit parameter", () => {
    logInteraction("user1", "everything", "...", {
      topics: ["ml", "ai", "cooking", "programming", "typescript"],
    });
    updatePreferences("user1");
    const recs = generateRecommendations("user1", CATALOG, 2);
    expect(recs.length).toBeLessThanOrEqual(2);
  });

  it("should respect minRelevance threshold", () => {
    logInteraction("user1", "cooking", "...", { topics: ["cooking"] });
    updatePreferences("user1");
    // With a high threshold, fewer items should match
    const recs = generateRecommendations("user1", CATALOG, 5, 0.9);
    expect(recs.length).toBeLessThanOrEqual(1);
  });

  it("should include matched topics in recommendations", () => {
    logInteraction("user1", "AI stuff", "...", { topics: ["ai"] });
    updatePreferences("user1");
    const recs = generateRecommendations("user1", CATALOG);
    for (const rec of recs) {
      expect(rec.matchedTopics.length).toBeGreaterThan(0);
    }
  });

  it("should sort by relevance descending", () => {
    logInteraction("user1", "all interests", "...", {
      topics: ["ml", "ai", "programming", "typescript"],
    });
    updatePreferences("user1");
    const recs = generateRecommendations("user1", CATALOG);
    for (let i = 1; i < recs.length; i++) {
      expect(recs[i - 1].relevance).toBeGreaterThanOrEqual(recs[i].relevance);
    }
  });
});
