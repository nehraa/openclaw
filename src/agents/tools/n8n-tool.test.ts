import { describe, expect, it } from "vitest";
import { createN8nTool } from "./n8n-tool.js";

describe("n8n-tool", () => {
  it("creates a tool with correct name and label", () => {
    const tool = createN8nTool();
    expect(tool.name).toBe("n8n");
    expect(tool.label).toBe("n8n Automation");
  });

  it("has a description mentioning key actions", () => {
    const tool = createN8nTool();
    expect(tool.description).toContain("create_workflow");
    expect(tool.description).toContain("list_templates");
    expect(tool.description).toContain("execute_workflow");
  });

  it("list_templates returns built-in templates without n8n config", async () => {
    const tool = createN8nTool();
    const result = await tool.execute("test-call-id", { action: "list_templates" });
    const content = result.content[0];
    expect(content.type).toBe("text");
    const parsed = JSON.parse((content as { text: string }).text);
    expect(parsed.templates).toBeDefined();
    expect(Array.isArray(parsed.templates)).toBe(true);
    expect(parsed.templates.length).toBeGreaterThan(0);
    expect(parsed.templates[0]).toHaveProperty("name");
    expect(parsed.templates[0]).toHaveProperty("description");
    expect(parsed.templates[0]).toHaveProperty("category");
  });

  it("returns error when n8n is not configured", async () => {
    const tool = createN8nTool();
    const result = await tool.execute("test-call-id", { action: "list_workflows" });
    const content = result.content[0];
    expect(content.type).toBe("text");
    const parsed = JSON.parse((content as { text: string }).text);
    expect(parsed.error).toContain("not configured");
  });

  it("returns error for get_workflow without workflow_id", async () => {
    const tool = createN8nTool({
      config: {
        tools: { n8n: { baseUrl: "http://localhost:5678", apiKey: "test-key" } },
      } as unknown as import("../../config/config.js").OpenClawConfig,
    });
    const result = await tool.execute("test-call-id", { action: "get_workflow" });
    const content = result.content[0];
    const parsed = JSON.parse((content as { text: string }).text);
    expect(parsed.error).toBeDefined();
  });
});
