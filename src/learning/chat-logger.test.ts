import { afterEach, describe, expect, it } from "vitest";
import {
  clearAllChatLogs,
  clearChatHistory,
  configureLearning,
  extractTopics,
  getChatHistory,
  getInteractionCount,
  logInteraction,
} from "./chat-logger.js";

afterEach(() => {
  clearAllChatLogs();
  // Reset to defaults
  configureLearning({
    enabled: true,
    privacyLevel: "standard",
    maxInteractionsPerUser: 500,
    trackTopics: true,
    enableRecommendations: true,
  });
});

describe("logInteraction", () => {
  it("should log an interaction", () => {
    const result = logInteraction("user1", "Hello there", "Hi! How can I help?");
    expect(result).toBeDefined();
    expect(result!.userId).toBe("user1");
    expect(result!.input).toBeDefined();
    expect(result!.output).toBeDefined();
    expect(result!.timestamp).toBeDefined();
  });

  it("should return undefined when disabled", () => {
    configureLearning({ enabled: false });
    const result = logInteraction("user1", "Hello", "Hi");
    expect(result).toBeUndefined();
  });

  it("should return undefined when privacy is off", () => {
    configureLearning({ privacyLevel: "off" });
    const result = logInteraction("user1", "Hello", "Hi");
    expect(result).toBeUndefined();
  });

  it("should redact emails in standard mode", () => {
    const result = logInteraction("user1", "My email is test@example.com", "Noted");
    expect(result!.input).toContain("[EMAIL]");
    expect(result!.input).not.toContain("test@example.com");
  });

  it("should redact phone numbers in standard mode", () => {
    const result = logInteraction("user1", "Call me at 555-123-4567", "OK");
    expect(result!.input).toContain("[PHONE]");
  });

  it("should truncate in minimal mode", () => {
    configureLearning({ privacyLevel: "minimal" });
    const longText = "A".repeat(100);
    const result = logInteraction("user1", longText, "Response");
    expect(result!.input.length).toBeLessThan(longText.length);
    expect(result!.input).toContain("...");
  });

  it("should keep full text in full mode", () => {
    configureLearning({ privacyLevel: "full" });
    const email = "My email is test@example.com";
    const result = logInteraction("user1", email, "Noted");
    expect(result!.input).toBe(email);
  });

  it("should trim to max interactions", () => {
    configureLearning({ maxInteractionsPerUser: 3 });
    logInteraction("user1", "msg1", "resp1");
    logInteraction("user1", "msg2", "resp2");
    logInteraction("user1", "msg3", "resp3");
    logInteraction("user1", "msg4", "resp4");
    expect(getInteractionCount("user1")).toBe(3);
  });

  it("should include channel when provided", () => {
    const result = logInteraction("user1", "Hello", "Hi", { channel: "telegram" });
    expect(result!.channel).toBe("telegram");
  });

  it("should extract topics automatically", () => {
    const result = logInteraction("user1", "Tell me about machine learning algorithms", "Sure!");
    expect(result!.topics.length).toBeGreaterThan(0);
  });
});

describe("getChatHistory", () => {
  it("should return empty array for unknown user", () => {
    expect(getChatHistory("unknown")).toEqual([]);
  });

  it("should return limited history", () => {
    for (let i = 0; i < 10; i++) {
      logInteraction("user1", `msg${i}`, `resp${i}`);
    }
    const history = getChatHistory("user1", 3);
    expect(history).toHaveLength(3);
  });
});

describe("clearChatHistory", () => {
  it("should clear specific user", () => {
    logInteraction("user1", "Hello", "Hi");
    logInteraction("user2", "Hello", "Hi");
    clearChatHistory("user1");
    expect(getChatHistory("user1")).toEqual([]);
    expect(getChatHistory("user2")).toHaveLength(1);
  });
});

describe("extractTopics", () => {
  it("should extract meaningful words", () => {
    const topics = extractTopics("Machine learning is transforming artificial intelligence");
    expect(topics).toContain("machine");
    expect(topics).toContain("learning");
    expect(topics).toContain("artificial");
    expect(topics).toContain("intelligence");
  });

  it("should filter stop words", () => {
    const topics = extractTopics("The quick brown fox is a very fast animal");
    expect(topics).not.toContain("the");
    expect(topics).not.toContain("is");
    expect(topics).not.toContain("a");
  });

  it("should return top 10 topics max", () => {
    const longText = Array.from({ length: 50 }, (_, i) => `uniqueword${i}`).join(" ");
    const topics = extractTopics(longText);
    expect(topics.length).toBeLessThanOrEqual(10);
  });
});
