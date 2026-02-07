import { describe, expect, it } from "vitest";
import { analyzeEmotion, tokenize } from "./analyzer.js";

describe("tokenize", () => {
  it("should split text into lowercase words", () => {
    const tokens = tokenize("Hello World");
    expect(tokens).toEqual(["hello", "world"]);
  });

  it("should remove punctuation", () => {
    const tokens = tokenize("Hello, world! How are you?");
    expect(tokens).toEqual(["hello", "world", "how", "are", "you"]);
  });

  it("should handle empty string", () => {
    expect(tokenize("")).toEqual([]);
  });

  it("should handle multiple spaces", () => {
    const tokens = tokenize("  hello   world  ");
    expect(tokens).toEqual(["hello", "world"]);
  });

  it("should preserve contractions", () => {
    const tokens = tokenize("I can't believe it");
    expect(tokens).toContain("can't");
  });
});

describe("analyzeEmotion", () => {
  it("should detect joy from happy text", () => {
    const result = analyzeEmotion("I am so happy and excited today!");
    expect(result.dominant).toBe("joy");
    expect(result.sentiment).toBe("positive");
    expect(result.sentimentScore).toBeGreaterThan(0);
  });

  it("should detect sadness from sad text", () => {
    const result = analyzeEmotion("I feel so sad and disappointed");
    expect(result.dominant).toBe("sadness");
    expect(result.sentiment).toBe("negative");
    expect(result.sentimentScore).toBeLessThan(0);
  });

  it("should detect anger from angry text", () => {
    const result = analyzeEmotion("I am angry and furious about this");
    expect(result.dominant).toBe("anger");
    expect(result.sentiment).toBe("negative");
  });

  it("should detect fear from fearful text", () => {
    const result = analyzeEmotion("I am terrified and scared");
    expect(result.dominant).toBe("fear");
  });

  it("should return neutral for neutral text", () => {
    const result = analyzeEmotion("The meeting is at 3pm in room 204");
    expect(result.dominant).toBe("neutral");
    expect(result.sentiment).toBe("neutral");
  });

  it("should handle negation", () => {
    const result = analyzeEmotion("I am not happy about this");
    // Negation should reduce the joy score and affect sentiment
    expect(result.sentimentScore).toBeLessThan(0.5);
  });

  it("should handle intensifiers", () => {
    const normal = analyzeEmotion("I am happy");
    const intensified = analyzeEmotion("I am very happy");
    // Intensified should have higher emotion score
    const normalJoy = normal.emotions.find((e) => e.label === "joy")?.score ?? 0;
    const intensifiedJoy = intensified.emotions.find((e) => e.label === "joy")?.score ?? 0;
    expect(intensifiedJoy).toBeGreaterThanOrEqual(normalJoy);
  });

  it("should include timestamp in result", () => {
    const result = analyzeEmotion("test text");
    expect(result.timestamp).toBeDefined();
    expect(() => new Date(result.timestamp)).not.toThrow();
  });

  it("should include original text in result", () => {
    const text = "This is a test message";
    const result = analyzeEmotion(text);
    expect(result.text).toBe(text);
  });

  it("should sort emotions by score descending", () => {
    const result = analyzeEmotion("I am happy but also a bit worried");
    for (let i = 1; i < result.emotions.length; i++) {
      expect(result.emotions[i - 1].score).toBeGreaterThanOrEqual(result.emotions[i].score);
    }
  });

  it("should detect surprise", () => {
    const result = analyzeEmotion("I was shocked and astonished by the news");
    expect(result.dominant).toBe("surprise");
  });

  it("should clamp sentiment score between -1 and 1", () => {
    const result = analyzeEmotion(
      "terrible horrible awful bad worst ugly useless broken fail failed wrong problem poor",
    );
    expect(result.sentimentScore).toBeGreaterThanOrEqual(-1);
    expect(result.sentimentScore).toBeLessThanOrEqual(1);
  });
});
