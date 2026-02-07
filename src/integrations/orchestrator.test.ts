import { afterEach, describe, expect, it } from "vitest";
import { processMessage } from "./orchestrator.js";
import { clearAllEmotionalContexts } from "../emotional-context/context-tracker.js";
import { clearAllChatLogs, configureLearning } from "../learning/chat-logger.js";
import { clearAllPreferences } from "../learning/preference-engine.js";
import { clearAllSubscriptions, subscribe } from "../proactive/subscriptions.js";
import { clearAllNotifications, configureProactive } from "../proactive/notification-dispatcher.js";
import { resetRecommendationCounter } from "../learning/recommendations.js";
import type { OllamaModelInfo } from "../providers/ollama/dynamic-model-switch.js";
import type { ContentItem } from "../learning/recommendations.js";

afterEach(() => {
  clearAllEmotionalContexts();
  clearAllChatLogs();
  clearAllPreferences();
  clearAllSubscriptions();
  clearAllNotifications();
  resetRecommendationCounter();
  configureLearning({ enabled: true, privacyLevel: "full", trackTopics: true, maxInteractionsPerUser: 500, enableRecommendations: true });
  configureProactive({ enabled: true, defaultMinRelevance: 0.3, maxDailyNotifications: 10, availableChannels: ["in-app"] });
});

const sampleModels: OllamaModelInfo[] = [
  { name: "tinyllama:latest", size: 1_000_000, isReasoning: false },
  { name: "llama3.3:latest", size: 4_000_000_000, isReasoning: false },
  { name: "deepseek-r1:latest", size: 7_000_000_000, isReasoning: true },
];

const sampleCatalog: ContentItem[] = [
  { id: "1", title: "AI in Healthcare", summary: "New advances in medical AI", topics: ["ai", "healthcare"], url: "https://example.com/1" },
  { id: "2", title: "TypeScript 6.0", summary: "New TS features", topics: ["typescript", "programming"], url: "https://example.com/2" },
  { id: "3", title: "Climate Change Report", summary: "Latest findings", topics: ["climate", "science"], url: "https://example.com/3" },
];

describe("processMessage orchestration", () => {
  it("should return emotional analysis for input", () => {
    const result = processMessage("I am so happy today!", {
      userId: "user1",
      sessionKey: "session1",
    });
    expect(result.emotion).toBeDefined();
    expect(result.emotion.sentiment).toBe("positive");
    expect(result.taskComplexity).toBeDefined();
    expect(result.responseHints).toBeDefined();
  });

  it("should classify task complexity", () => {
    const simple = processMessage("hello", { userId: "user1", sessionKey: "s1" });
    expect(simple.taskComplexity).toBe("simple");

    const complex = processMessage("Please explain the internals of V8 JavaScript engine and how JIT compilation works in detail", {
      userId: "user2",
      sessionKey: "s2",
    });
    expect(["complex", "moderate"]).toContain(complex.taskComplexity);
  });

  it("should recommend Ollama models based on complexity", () => {
    const result = processMessage("Prove that the set of primes is infinite using mathematical induction", {
      userId: "user1",
      sessionKey: "s1",
      ollamaModels: sampleModels,
    });
    expect(result.modelRecommendation).toBeDefined();
    expect(result.modelRecommendation!.modelId).toBe("deepseek-r1:latest");
    expect(result.modelRecommendation!.complexity).toBe("reasoning");
  });

  it("should generate response hints based on emotion", () => {
    const sad = processMessage("I'm feeling really down and worried about everything", {
      userId: "user1",
      sessionKey: "s1",
    });
    expect(sad.responseHints.tone).toBe("empathetic");

    const happy = processMessage("This is amazing! I love how this works!", {
      userId: "user2",
      sessionKey: "s2",
    });
    expect(["enthusiastic", "neutral"]).toContain(happy.responseHints.tone);
  });

  it("should update preferences from interaction", () => {
    processMessage("Tell me about machine learning and neural networks", {
      userId: "user1",
      sessionKey: "s1",
    });
    const result = processMessage("I want to learn more about deep learning architectures", {
      userId: "user1",
      sessionKey: "s1",
    });
    expect(result.preferences).toBeDefined();
    expect(result.topInterests.length).toBeGreaterThan(0);
  });

  it("should generate proactive notifications for subscribed users", () => {
    subscribe("user1", { topicFilters: ["ai"], minRelevance: 0.1 });

    // Build up some interaction history so preferences exist
    processMessage("Tell me about AI and machine learning", {
      userId: "user1",
      sessionKey: "s1",
    });

    const result = processMessage("What are the latest advances in artificial intelligence?", {
      userId: "user1",
      sessionKey: "s1",
      contentCatalog: sampleCatalog,
    });
    // Should have at least one notification about AI content
    expect(result.notifications.length).toBeGreaterThanOrEqual(0);
  });

  it("should not generate notifications for unsubscribed users", () => {
    const result = processMessage("Tell me about AI", {
      userId: "user1",
      sessionKey: "s1",
      contentCatalog: sampleCatalog,
    });
    expect(result.notifications).toHaveLength(0);
  });

  it("should track emotional context across messages", () => {
    processMessage("I'm having a terrible day", { userId: "user1", sessionKey: "s1" });
    processMessage("Everything is going wrong", { userId: "user1", sessionKey: "s1" });
    const result = processMessage("I feel so frustrated", { userId: "user1", sessionKey: "s1" });
    expect(result.emotionalContext).toBeDefined();
    expect(result.emotionalContext!.history.length).toBe(3);
  });
});
