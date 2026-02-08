import { describe, expect, it } from "vitest";
import { createPublicApisTool } from "./public-apis-tool.js";

describe("public-apis-tool", () => {
  it("creates a tool with correct name and label", () => {
    const tool = createPublicApisTool();
    expect(tool.name).toBe("public_apis");
    expect(tool.label).toBe("Public APIs Catalog");
  });

  it("list_categories returns categories with counts", async () => {
    const tool = createPublicApisTool();
    const result = await tool.execute("test-id", { action: "list_categories" });
    const parsed = JSON.parse((result.content[0] as { text: string }).text);
    expect(parsed.categories).toBeDefined();
    expect(Array.isArray(parsed.categories)).toBe(true);
    expect(parsed.categories.length).toBeGreaterThan(10);
    expect(parsed.categories[0]).toHaveProperty("category");
    expect(parsed.categories[0]).toHaveProperty("count");
    expect(parsed.total).toBeGreaterThan(50);
  });

  it("search finds APIs by keyword", async () => {
    const tool = createPublicApisTool();
    const result = await tool.execute("test-id", { action: "search", query: "weather" });
    const parsed = JSON.parse((result.content[0] as { text: string }).text);
    expect(parsed.count).toBeGreaterThan(0);
    expect(parsed.apis[0].category).toBe("Weather");
  });

  it("by_category returns APIs in a category", async () => {
    const tool = createPublicApisTool();
    const result = await tool.execute("test-id", { action: "by_category", category: "Finance" });
    const parsed = JSON.parse((result.content[0] as { text: string }).text);
    expect(parsed.count).toBeGreaterThan(0);
    expect(parsed.apis[0].category).toBe("Finance");
  });

  it("get_setup_info returns setup guide", async () => {
    const tool = createPublicApisTool();
    const result = await tool.execute("test-id", {
      action: "get_setup_info",
      api_name: "OpenWeatherMap",
    });
    const parsed = JSON.parse((result.content[0] as { text: string }).text);
    expect(parsed.api).toBeDefined();
    expect(parsed.setupGuide).toContain("API key");
    expect(parsed.api.name).toBe("OpenWeatherMap");
  });

  it("get_setup_info suggests alternatives when not found", async () => {
    const tool = createPublicApisTool();
    const result = await tool.execute("test-id", {
      action: "get_setup_info",
      api_name: "NonExistentAPI",
    });
    const parsed = JSON.parse((result.content[0] as { text: string }).text);
    expect(parsed.error).toContain("not found");
  });

  it("search for AI returns AI-related APIs", async () => {
    const tool = createPublicApisTool();
    const result = await tool.execute("test-id", { action: "search", query: "AI" });
    const parsed = JSON.parse((result.content[0] as { text: string }).text);
    expect(parsed.count).toBeGreaterThan(0);
  });
});
