import { afterEach, describe, expect, it } from "vitest";
import {
  clearAllEmotionalContexts,
  clearEmotionalContext,
  computeSentimentTrend,
  getEmotionalContext,
  processMessage,
} from "./context-tracker.js";

afterEach(() => {
  clearAllEmotionalContexts();
});

describe("processMessage", () => {
  it("should create context on first message", () => {
    const result = processMessage("session-1", "I am happy today!");
    expect(result).toBeDefined();
    expect(result!.sessionKey).toBe("session-1");
    expect(result!.history).toHaveLength(1);
  });

  it("should accumulate history across messages", () => {
    processMessage("session-1", "I am happy");
    processMessage("session-1", "I am excited");
    const ctx = processMessage("session-1", "Everything is wonderful");
    expect(ctx!.history).toHaveLength(3);
  });

  it("should trim history to window size", () => {
    for (let i = 0; i < 25; i++) {
      processMessage("session-1", `Message ${i}`, { historyWindowSize: 5 });
    }
    const ctx = getEmotionalContext("session-1");
    expect(ctx!.history.length).toBeLessThanOrEqual(5);
  });

  it("should return undefined when disabled", () => {
    const result = processMessage("session-1", "test", { enabled: false });
    expect(result).toBeUndefined();
  });

  it("should compute positive trend for happy messages", () => {
    processMessage("session-1", "I am happy and excited!");
    processMessage("session-1", "Everything is wonderful and amazing!");
    const ctx = processMessage("session-1", "I love this, it's fantastic!");
    expect(ctx!.trend).toBe("positive");
    expect(ctx!.averageSentiment).toBeGreaterThan(0);
  });

  it("should compute negative trend for sad messages", () => {
    processMessage("session-1", "I feel sad and disappointed");
    processMessage("session-1", "Everything is terrible and awful");
    const ctx = processMessage("session-1", "I hate how bad this is");
    expect(ctx!.trend).toBe("negative");
    expect(ctx!.averageSentiment).toBeLessThan(0);
  });

  it("should track dominant emotion across messages", () => {
    processMessage("session-1", "I am happy and delighted");
    processMessage("session-1", "I am excited and cheerful");
    processMessage("session-1", "I love everything, it's amazing");
    const ctx = getEmotionalContext("session-1");
    expect(ctx!.dominantEmotion).toBe("joy");
  });
});

describe("getEmotionalContext", () => {
  it("should return undefined for unknown session", () => {
    expect(getEmotionalContext("unknown")).toBeUndefined();
  });

  it("should return a copy (not a reference)", () => {
    processMessage("session-1", "Hello");
    const ctx1 = getEmotionalContext("session-1");
    const ctx2 = getEmotionalContext("session-1");
    expect(ctx1).toEqual(ctx2);
    expect(ctx1).not.toBe(ctx2);
  });
});

describe("clearEmotionalContext", () => {
  it("should clear specific session", () => {
    processMessage("session-1", "Hello");
    processMessage("session-2", "World");
    clearEmotionalContext("session-1");
    expect(getEmotionalContext("session-1")).toBeUndefined();
    expect(getEmotionalContext("session-2")).toBeDefined();
  });
});

describe("computeSentimentTrend", () => {
  it("should return neutral for single value", () => {
    expect(computeSentimentTrend([0.5])).toBe("neutral");
  });

  it("should return positive for increasing trend", () => {
    expect(computeSentimentTrend([-0.5, -0.3, 0.1, 0.5, 0.8])).toBe("positive");
  });

  it("should return negative for decreasing trend", () => {
    expect(computeSentimentTrend([0.8, 0.5, 0.1, -0.3, -0.5])).toBe("negative");
  });

  it("should return neutral for flat trend", () => {
    expect(computeSentimentTrend([0.5, 0.5, 0.5, 0.5])).toBe("neutral");
  });
});
