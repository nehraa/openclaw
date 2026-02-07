import { describe, expect, it } from "vitest";
import type { Subscription } from "./types.js";
import { filterCatalog, filterContent } from "./content-filter.js";

const createSubscription = (overrides?: Partial<Subscription>): Subscription => ({
  userId: "user1",
  optedIn: true,
  channels: ["in-app"],
  topicFilters: ["ai", "typescript"],
  minRelevance: 0.2,
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe("filterContent", () => {
  it("should match content with overlapping topics", () => {
    const sub = createSubscription();
    const result = filterContent(
      { id: "1", title: "AI article", summary: "...", topics: ["ai", "ml"] },
      sub,
    );
    expect(result.matched).toBe(true);
    expect(result.matchedTopics).toContain("ai");
  });

  it("should not match when opted out", () => {
    const sub = createSubscription({ optedIn: false });
    const result = filterContent(
      { id: "1", title: "AI article", summary: "...", topics: ["ai"] },
      sub,
    );
    expect(result.matched).toBe(false);
  });

  it("should not match when no topics overlap", () => {
    const sub = createSubscription({ topicFilters: ["cooking"] });
    const result = filterContent(
      { id: "1", title: "AI article", summary: "...", topics: ["ai", "ml"] },
      sub,
    );
    expect(result.matched).toBe(false);
  });

  it("should use topicInterests when no topicFilters", () => {
    const sub = createSubscription({ topicFilters: [] });
    const result = filterContent(
      { id: "1", title: "AI article", summary: "...", topics: ["ai"] },
      sub,
      { ai: 0.9 },
    );
    expect(result.matched).toBe(true);
  });

  it("should respect minRelevance threshold", () => {
    const sub = createSubscription({ minRelevance: 0.99 });
    const result = filterContent(
      { id: "1", title: "AI article", summary: "...", topics: ["ai", "cooking", "sports"] },
      sub,
    );
    expect(result.matched).toBe(false);
  });
});

describe("filterCatalog", () => {
  it("should return matching items sorted by relevance", () => {
    const sub = createSubscription({ topicFilters: ["ai", "typescript"] });
    const catalog = [
      { id: "1", title: "AI Guide", summary: "...", topics: ["ai"] },
      { id: "2", title: "Cooking", summary: "...", topics: ["cooking"] },
      { id: "3", title: "TS & AI", summary: "...", topics: ["typescript", "ai"] },
    ];

    const results = filterCatalog(catalog, sub);
    expect(results.length).toBeGreaterThan(0);
    // Cooking should not be in results
    expect(results.every((r) => r.item.id !== "2")).toBe(true);
  });

  it("should return empty for opted-out user", () => {
    const sub = createSubscription({ optedIn: false });
    const catalog = [{ id: "1", title: "AI", summary: "...", topics: ["ai"] }];
    expect(filterCatalog(catalog, sub)).toEqual([]);
  });
});
