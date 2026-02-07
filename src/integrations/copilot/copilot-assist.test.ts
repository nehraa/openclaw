import { describe, expect, it } from "vitest";
import {
  buildCodeCompletionPrompt,
  buildCodeReviewPrompt,
  parseCodeSuggestions,
} from "./copilot-assist.js";

describe("buildCodeReviewPrompt", () => {
  it("should build a review prompt with defaults", () => {
    const prompt = buildCodeReviewPrompt("const x = 1;");
    expect(prompt).toContain("Review the following typescript code");
    expect(prompt).toContain("const x = 1;");
    expect(prompt).toContain("bugs, performance, security, and code style");
  });

  it("should use specified language", () => {
    const prompt = buildCodeReviewPrompt("def foo():", { language: "python" });
    expect(prompt).toContain("python");
  });

  it("should include context when provided", () => {
    const prompt = buildCodeReviewPrompt("code here", { context: "This is a web server" });
    expect(prompt).toContain("This is a web server");
  });

  it("should respect focus parameter", () => {
    const prompt = buildCodeReviewPrompt("code", { focus: "security" });
    expect(prompt).toContain("security vulnerabilities");
  });

  it("should handle bugs focus", () => {
    const prompt = buildCodeReviewPrompt("code", { focus: "bugs" });
    expect(prompt).toContain("bugs");
    expect(prompt).toContain("edge cases");
  });

  it("should handle performance focus", () => {
    const prompt = buildCodeReviewPrompt("code", { focus: "performance" });
    expect(prompt).toContain("performance");
  });
});

describe("buildCodeCompletionPrompt", () => {
  it("should build completion prompt", () => {
    const prompt = buildCodeCompletionPrompt("function add(a: number, b: number)");
    expect(prompt).toContain("Complete the following");
    expect(prompt).toContain("function add");
  });

  it("should include instruction when provided", () => {
    const prompt = buildCodeCompletionPrompt("function", {
      instruction: "Add error handling",
    });
    expect(prompt).toContain("Add error handling");
  });

  it("should include suffix when provided", () => {
    const prompt = buildCodeCompletionPrompt("function start() {", {
      suffix: "}",
    });
    expect(prompt).toContain("your completion here");
    expect(prompt).toContain("}");
  });
});

describe("parseCodeSuggestions", () => {
  it("should extract code blocks from markdown", () => {
    const response = "Here's the code:\n```typescript\nconst x = 1;\n```\n";
    const suggestions = parseCodeSuggestions(response);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].text).toBe("const x = 1;");
    expect(suggestions[0].language).toBe("typescript");
  });

  it("should extract multiple code blocks", () => {
    const response = "```js\nconst a = 1;\n```\n\n```python\nx = 2\n```";
    const suggestions = parseCodeSuggestions(response);
    expect(suggestions).toHaveLength(2);
    expect(suggestions[0].language).toBe("js");
    expect(suggestions[1].language).toBe("python");
  });

  it("should handle code blocks without language", () => {
    const response = "```\nplain code\n```";
    const suggestions = parseCodeSuggestions(response);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].language).toBeUndefined();
  });

  it("should treat plain text as low-confidence suggestion", () => {
    const response = "Just use const x = 1;";
    const suggestions = parseCodeSuggestions(response);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].confidence).toBe("low");
  });

  it("should assign confidence based on code length", () => {
    const longCode = "a".repeat(150);
    const response = `\`\`\`ts\n${longCode}\n\`\`\``;
    const suggestions = parseCodeSuggestions(response);
    expect(suggestions[0].confidence).toBe("high");
  });

  it("should return empty for empty response", () => {
    expect(parseCodeSuggestions("")).toEqual([]);
    expect(parseCodeSuggestions("   ")).toEqual([]);
  });
});
