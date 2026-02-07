import { describe, expect, it } from "vitest";
import type { OllamaModelInfo } from "./dynamic-model-switch.js";
import {
  classifyTaskComplexity,
  createOllamaConnection,
  dynamicModelSelect,
  selectModelForTask,
} from "./dynamic-model-switch.js";

const MOCK_MODELS: OllamaModelInfo[] = [
  { name: "phi3:latest", size: 2_000_000_000, isReasoning: false },
  { name: "llama3.3:latest", size: 8_000_000_000, isReasoning: false },
  { name: "deepseek-r1:latest", size: 14_000_000_000, isReasoning: true },
  { name: "mixtral:latest", size: 26_000_000_000, isReasoning: false },
];

describe("classifyTaskComplexity", () => {
  it("should classify simple greetings", () => {
    expect(classifyTaskComplexity("hello")).toBe("simple");
    expect(classifyTaskComplexity("hi there")).toBe("simple");
    expect(classifyTaskComplexity("yes")).toBe("simple");
  });

  it("should classify moderate tasks", () => {
    expect(classifyTaskComplexity("Write a short story about a cat")).toBe("moderate");
    expect(classifyTaskComplexity("Summarize this article for me")).toBe("moderate");
    expect(classifyTaskComplexity("Create a list of vegetables")).toBe("moderate");
  });

  it("should classify complex tasks", () => {
    expect(classifyTaskComplexity("Implement a binary search tree in TypeScript")).toBe("complex");
    expect(classifyTaskComplexity("Design a microservice architecture for this system")).toBe(
      "complex",
    );
    expect(classifyTaskComplexity("Debug this error in the authentication flow")).toBe("complex");
  });

  it("should classify reasoning tasks", () => {
    expect(classifyTaskComplexity("Prove that the square root of 2 is irrational")).toBe(
      "reasoning",
    );
    expect(classifyTaskComplexity("Analyze the logical implications of this theorem")).toBe(
      "reasoning",
    );
  });

  it("should classify very short inputs as simple", () => {
    expect(classifyTaskComplexity("ok")).toBe("simple");
    expect(classifyTaskComplexity("a b")).toBe("simple");
  });

  it("should classify long unrecognized text based on length", () => {
    const longText = Array.from({ length: 60 }, (_, i) => `word${i}`).join(" ");
    expect(classifyTaskComplexity(longText)).toBe("complex");
  });
});

describe("selectModelForTask", () => {
  it("should select smallest model for simple tasks", () => {
    const result = selectModelForTask(MOCK_MODELS, "simple");
    expect(result.modelId).toBe("phi3:latest");
    expect(result.complexity).toBe("simple");
  });

  it("should select largest model for complex tasks", () => {
    const result = selectModelForTask(MOCK_MODELS, "complex");
    expect(result.modelId).toBe("mixtral:latest");
    expect(result.complexity).toBe("complex");
  });

  it("should prefer reasoning model for reasoning tasks", () => {
    const result = selectModelForTask(MOCK_MODELS, "reasoning");
    expect(result.modelId).toBe("deepseek-r1:latest");
    expect(result.reason).toContain("reasoning model");
  });

  it("should select mid-sized model for moderate tasks", () => {
    const result = selectModelForTask(MOCK_MODELS, "moderate");
    // Mid index of 4 sorted models = index 2
    expect(result.modelId).toBe("deepseek-r1:latest");
    expect(result.complexity).toBe("moderate");
  });

  it("should fallback when no models available", () => {
    const result = selectModelForTask([], "complex");
    expect(result.modelId).toBe("llama3.3:latest");
    expect(result.reason).toContain("fallback");
  });

  it("should use largest model when no reasoning model for reasoning task", () => {
    const nonReasoningModels = MOCK_MODELS.filter((m) => !m.isReasoning);
    const result = selectModelForTask(nonReasoningModels, "reasoning");
    expect(result.modelId).toBe("mixtral:latest");
    expect(result.reason).toContain("No reasoning model");
  });
});

describe("dynamicModelSelect", () => {
  it("should classify and select in one call", () => {
    const result = dynamicModelSelect("Hello!", MOCK_MODELS);
    expect(result.complexity).toBe("simple");
    expect(result.modelId).toBe("phi3:latest");
  });

  it("should select reasoning model for analytical input", () => {
    const result = dynamicModelSelect(
      "Analyze the logical structure of this argument",
      MOCK_MODELS,
    );
    expect(result.complexity).toBe("reasoning");
    expect(result.modelId).toBe("deepseek-r1:latest");
  });
});

describe("createOllamaConnection", () => {
  it("should use default values", () => {
    const conn = createOllamaConnection();
    expect(conn.baseUrl).toBeDefined();
    expect(conn.timeoutMs).toBe(5000);
  });

  it("should accept custom base URL", () => {
    const conn = createOllamaConnection({ baseUrl: "http://remote:11434" });
    expect(conn.baseUrl).toBe("http://remote:11434");
  });

  it("should accept custom timeout", () => {
    const conn = createOllamaConnection({ timeoutMs: 10000 });
    expect(conn.timeoutMs).toBe(10000);
  });

  it("should accept API key for cloud connections", () => {
    const conn = createOllamaConnection({ apiKey: "test-key" });
    expect(conn.apiKey).toBe("test-key");
  });
});
