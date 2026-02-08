import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createShannonTool } from "./shannon-tool.js";

describe("shannon-tool", () => {
  it("creates a tool with correct name and label", () => {
    const tool = createShannonTool();
    expect(tool.name).toBe("shannon");
    expect(tool.label).toBe("Shannon Code Analysis");
  });

  it("has a description mentioning entropy", () => {
    const tool = createShannonTool();
    expect(tool.description).toContain("entropy");
    expect(tool.description).toContain("analyze_file");
  });

  it("analyzes a file and returns metrics", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "shannon-test-"));
    const testFile = "test.ts";
    fs.writeFileSync(
      path.join(tmpDir, testFile),
      `
function hello() {
  console.log("Hello, world!");
  return 42;
}

export { hello };
`.trim(),
    );

    const tool = createShannonTool({ sandboxRoot: tmpDir });
    const result = await tool.execute("test-call-id", {
      action: "analyze_file",
      path: testFile,
    });
    const content = result.content[0];
    expect(content.type).toBe("text");
    const parsed = JSON.parse((content as { text: string }).text);
    expect(parsed.language).toBe("typescript");
    expect(parsed.metrics).toBeDefined();
    expect(parsed.metrics.entropy).toBeGreaterThan(0);
    expect(parsed.metrics.totalLines).toBeGreaterThan(0);
    expect(parsed.metrics.codeLines).toBeGreaterThan(0);
    expect(parsed.quality).toBeDefined();

    fs.rmSync(tmpDir, { recursive: true });
  });

  it("rejects absolute paths", async () => {
    const tool = createShannonTool();
    const result = await tool.execute("test-call-id", {
      action: "analyze_file",
      path: "/etc/passwd",
    });
    const content = result.content[0];
    const parsed = JSON.parse((content as { text: string }).text);
    expect(parsed.error).toContain("not allowed");
  });

  it("rejects path traversal", async () => {
    const tool = createShannonTool();
    const result = await tool.execute("test-call-id", {
      action: "analyze_file",
      path: "../../../etc/passwd",
    });
    const content = result.content[0];
    const parsed = JSON.parse((content as { text: string }).text);
    expect(parsed.error).toContain("not allowed");
  });

  it("generates entropy report with hotspots", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "shannon-test-"));
    const testFile = "complex.ts";
    fs.writeFileSync(
      path.join(tmpDir, testFile),
      `
import { something } from "./module";
const x = { a: 1, b: 2, c: 3, d: 4, e: "hello world foo bar baz" };
function processData(input: string, options: Record<string, unknown>) {
  const result = Object.entries(options).map(([key, value]) => key + String(value));
  return result.join(", ") + " processed: " + input;
}
export default processData;
`.trim(),
    );

    const tool = createShannonTool({ sandboxRoot: tmpDir });
    const result = await tool.execute("test-call-id", {
      action: "entropy_report",
      path: testFile,
    });
    const content = result.content[0];
    const parsed = JSON.parse((content as { text: string }).text);
    expect(parsed.overallEntropy).toBeGreaterThan(0);
    expect(parsed.entropyDistribution).toBeDefined();
    expect(parsed.totalLines).toBeGreaterThan(0);

    fs.rmSync(tmpDir, { recursive: true });
  });

  it("analyzes a directory", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "shannon-test-"));
    fs.writeFileSync(path.join(tmpDir, "a.ts"), 'const a = "hello";');
    fs.writeFileSync(path.join(tmpDir, "b.py"), 'print("hello")');

    const tool = createShannonTool({ sandboxRoot: tmpDir });
    const result = await tool.execute("test-call-id", {
      action: "analyze_directory",
      path: ".",
    });
    const content = result.content[0];
    const parsed = JSON.parse((content as { text: string }).text);
    expect(parsed.filesAnalyzed).toBe(2);
    expect(parsed.averageEntropy).toBeGreaterThan(0);

    fs.rmSync(tmpDir, { recursive: true });
  });
});
