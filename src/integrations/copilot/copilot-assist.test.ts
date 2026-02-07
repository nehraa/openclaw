import { describe, expect, it } from "vitest";
import {
  buildCodeCompletionPrompt,
  buildCodeGenerationPrompt,
  buildCodeReviewPrompt,
  buildRefactoringPrompt,
  buildTestGenerationPrompt,
  extractPrimaryCode,
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

describe("buildCodeGenerationPrompt", () => {
  it("should build a generation prompt with defaults", () => {
    const prompt = buildCodeGenerationPrompt("A REST API handler for user registration");
    expect(prompt).toContain("Generate typescript code");
    expect(prompt).toContain("user registration");
    expect(prompt).toContain("production-ready");
  });

  it("should include framework and requirements", () => {
    const prompt = buildCodeGenerationPrompt("WebSocket handler", {
      framework: "Express",
      requirements: ["Support reconnection", "Handle timeouts"],
    });
    expect(prompt).toContain("Express");
    expect(prompt).toContain("Support reconnection");
    expect(prompt).toContain("Handle timeouts");
  });

  it("should include existing code context", () => {
    const prompt = buildCodeGenerationPrompt("Add logging", {
      existingCode: "function process() {}",
    });
    expect(prompt).toContain("function process()");
  });

  it("should support concise style", () => {
    const prompt = buildCodeGenerationPrompt("Hello world", { style: "concise" });
    expect(prompt).toContain("minimal, clean code");
  });

  it("should include fileName when specified", () => {
    const prompt = buildCodeGenerationPrompt("A utility module", { fileName: "utils.ts" });
    expect(prompt).toContain("utils.ts");
  });
});

describe("buildRefactoringPrompt", () => {
  it("should build refactoring prompt for simplify goal", () => {
    const prompt = buildRefactoringPrompt("const x = a ? a : b;", "simplify");
    expect(prompt).toContain("Refactor");
    expect(prompt).toContain("Simplify");
    expect(prompt).toContain("reduce complexity");
  });

  it("should support modularize goal", () => {
    const prompt = buildRefactoringPrompt("big function here", "modularize");
    expect(prompt).toContain("smaller, well-named functions");
  });

  it("should support optimize goal", () => {
    const prompt = buildRefactoringPrompt("slow code", "optimize");
    expect(prompt).toContain("Optimize");
    expect(prompt).toContain("performance");
  });

  it("should support type-safety goal", () => {
    const prompt = buildRefactoringPrompt("any everywhere", "type-safety");
    expect(prompt).toContain("type safety");
    expect(prompt).toContain("remove `any`");
  });

  it("should support test-friendly goal", () => {
    const prompt = buildRefactoringPrompt("coupled code", "test-friendly");
    expect(prompt).toContain("testable");
    expect(prompt).toContain("dependency injection");
  });

  it("should include context when provided", () => {
    const prompt = buildRefactoringPrompt("code", "simplify", { context: "This is a hook" });
    expect(prompt).toContain("This is a hook");
  });
});

describe("buildTestGenerationPrompt", () => {
  it("should build test generation prompt with defaults", () => {
    const prompt = buildTestGenerationPrompt("function add(a, b) { return a + b; }");
    expect(prompt).toContain("vitest");
    expect(prompt).toContain("thorough");
  });

  it("should support exhaustive coverage", () => {
    const prompt = buildTestGenerationPrompt("code", { coverage: "exhaustive" });
    expect(prompt).toContain("exhaustive");
    expect(prompt).toContain("property-based");
  });

  it("should include existing tests", () => {
    const prompt = buildTestGenerationPrompt("code", {
      existingTests: "it('should add', () => {})",
    });
    expect(prompt).toContain("avoid duplicating");
    expect(prompt).toContain("should add");
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

  it("should parse non-word language IDs like c++ and objective-c", () => {
    const response = "```c++\nint main() {}\n```\n\n```objective-c\n@interface Foo\n```";
    const suggestions = parseCodeSuggestions(response);
    expect(suggestions).toHaveLength(2);
    expect(suggestions[0].language).toBe("c++");
    expect(suggestions[1].language).toBe("objective-c");
  });
});

describe("extractPrimaryCode", () => {
  it("should return the longest code block", () => {
    const response = "```ts\na\n```\n\n```ts\nconst longCode = true;\nconst more = true;\n```";
    const result = extractPrimaryCode(response);
    expect(result).toBeDefined();
    expect(result!.code).toContain("longCode");
  });

  it("should return undefined for empty response", () => {
    expect(extractPrimaryCode("")).toBeUndefined();
    expect(extractPrimaryCode("   ")).toBeUndefined();
  });
});
