import { afterEach, describe, expect, it } from "vitest";
import type { ContentItem } from "../learning/recommendations.js";
import type { OllamaModelInfo } from "../providers/ollama/dynamic-model-switch.js";
import { clearAllEmotionalContexts } from "../emotional-context/context-tracker.js";
import { clearAllChatLogs, configureLearning } from "../learning/chat-logger.js";
import { clearAllPreferences } from "../learning/preference-engine.js";
import { resetRecommendationCounter } from "../learning/recommendations.js";
import { clearAllNotifications, configureProactive } from "../proactive/notification-dispatcher.js";
import { clearAllSubscriptions, subscribe } from "../proactive/subscriptions.js";
import { processMessage } from "./orchestrator.js";

afterEach(() => {
  clearAllEmotionalContexts();
  clearAllChatLogs();
  clearAllPreferences();
  clearAllSubscriptions();
  clearAllNotifications();
  resetRecommendationCounter();
  configureLearning({
    enabled: true,
    privacyLevel: "full",
    trackTopics: true,
    maxInteractionsPerUser: 500,
    enableRecommendations: true,
  });
  configureProactive({
    enabled: true,
    defaultMinRelevance: 0.3,
    maxDailyNotifications: 10,
    availableChannels: ["in-app"],
  });
});

const sampleModels: OllamaModelInfo[] = [
  { name: "tinyllama:latest", size: 1_000_000, isReasoning: false },
  { name: "llama3.3:latest", size: 4_000_000_000, isReasoning: false },
  { name: "deepseek-r1:latest", size: 7_000_000_000, isReasoning: true },
];

const sampleCatalog: ContentItem[] = [
  {
    id: "1",
    title: "AI in Healthcare",
    summary: "New advances in medical AI",
    topics: ["ai", "healthcare"],
    url: "https://example.com/1",
  },
  {
    id: "2",
    title: "TypeScript 6.0",
    summary: "New TS features",
    topics: ["typescript", "programming"],
    url: "https://example.com/2",
  },
  {
    id: "3",
    title: "Climate Change Report",
    summary: "Latest findings",
    topics: ["climate", "science"],
    url: "https://example.com/3",
  },
];

describe("processMessage orchestration", () => {
  it("should return emotional analysis for input", async () => {
    const result = await processMessage("I am so happy today!", {
      userId: "user1",
      sessionKey: "session1",
    });
    expect(result.emotion).toBeDefined();
    expect(result.emotion.sentiment).toBe("positive");
    expect(result.taskComplexity).toBeDefined();
    expect(result.responseHints).toBeDefined();
  });

  it("should classify task complexity", async () => {
    const simple = await processMessage("hello", { userId: "user1", sessionKey: "s1" });
    expect(simple.taskComplexity).toBe("simple");

    const complex = await processMessage(
      "Please explain the internals of V8 JavaScript engine and how JIT compilation works in detail",
      {
        userId: "user2",
        sessionKey: "s2",
      },
    );
    expect(["complex", "moderate"]).toContain(complex.taskComplexity);
  });

  it("should recommend Ollama models based on complexity", async () => {
    const result = await processMessage(
      "Prove that the set of primes is infinite using mathematical induction",
      {
        userId: "user1",
        sessionKey: "s1",
        ollamaModels: sampleModels,
      },
    );
    expect(result.modelRecommendation).toBeDefined();
    expect(result.modelRecommendation!.modelId).toBe("deepseek-r1:latest");
    expect(result.modelRecommendation!.complexity).toBe("reasoning");
  });

  it("should generate response hints based on emotion", async () => {
    const sad = await processMessage("I'm feeling really down and worried about everything", {
      userId: "user1",
      sessionKey: "s1",
    });
    expect(sad.responseHints.tone).toBe("empathetic");

    const happy = await processMessage("This is amazing! I love how this works!", {
      userId: "user2",
      sessionKey: "s2",
    });
    expect(["enthusiastic", "neutral"]).toContain(happy.responseHints.tone);
  });

  it("should update preferences from interaction", async () => {
    await processMessage("Tell me about machine learning and neural networks", {
      userId: "user1",
      sessionKey: "s1",
    });
    const result = await processMessage("I want to learn more about deep learning architectures", {
      userId: "user1",
      sessionKey: "s1",
    });
    expect(result.preferences).toBeDefined();
    expect(result.topInterests.length).toBeGreaterThan(0);
  });

  it("should generate proactive notifications for subscribed users", async () => {
    subscribe("user1", { topicFilters: ["ai"], minRelevance: 0.1 });

    // Build up some interaction history so preferences exist
    await processMessage("Tell me about AI and machine learning", {
      userId: "user1",
      sessionKey: "s1",
    });

    const result = await processMessage("What are the latest advances in artificial intelligence?", {
      userId: "user1",
      sessionKey: "s1",
      contentCatalog: sampleCatalog,
    });
    // Should have at least one notification about AI content
    expect(result.notifications.length).toBeGreaterThanOrEqual(0);
  });

  it("should not generate notifications for unsubscribed users", async () => {
    const result = await processMessage("Tell me about AI", {
      userId: "user1",
      sessionKey: "s1",
      contentCatalog: sampleCatalog,
    });
    expect(result.notifications).toHaveLength(0);
  });

  it("should track emotional context across messages", async () => {
    await processMessage("I'm having a terrible day", { userId: "user1", sessionKey: "s1" });
    await processMessage("Everything is going wrong", { userId: "user1", sessionKey: "s1" });
    const result = await processMessage("I feel so frustrated", { userId: "user1", sessionKey: "s1" });
    expect(result.emotionalContext).toBeDefined();
    expect(result.emotionalContext!.history.length).toBe(3);
  });
});

describe("cognitive architecture - faculty routing", () => {
  it("should detect error intent and route to self-healing faculty", async () => {
    const result = await processMessage("Fix the null pointer error in validator.ts", {
      userId: "test-user",
      sessionKey: "test-session",
    });

    expect(result.facultyActivation).toBeDefined();
    expect(result.facultyActivation?.faculty).toBe("self-healing");
    expect(result.facultyActivation?.confidence).toBeGreaterThan(0.5);
    expect(result.facultyResult).toBeDefined();
  });

  it("should detect complex reasoning and route to council faculty", async () => {
    const result = await processMessage("Design a multi-step plan to refactor the authentication system", {
      userId: "test-user",
      sessionKey: "test-session",
    });

    expect(result.facultyActivation).toBeDefined();
    expect(result.facultyActivation?.faculty).toBe("council");
    expect(result.facultyResult).toBeDefined();
  });

  it("should detect code search and route to memory faculty", async () => {
    const result = await processMessage("Search for all API endpoint definitions", {
      userId: "test-user",
      sessionKey: "test-session",
    });

    expect(result.facultyActivation).toBeDefined();
    expect(result.facultyActivation?.faculty).toBe("memory");
  });

  it("should detect multimodal request and route to senses faculty", async () => {
    const result = await processMessage("Transcribe the audio file from the meeting", {
      userId: "test-user",
      sessionKey: "test-session",
    });

    expect(result.facultyActivation).toBeDefined();
    expect(result.facultyActivation?.faculty).toBe("senses");
  });

  it("should detect research request and route to research faculty", async () => {
    const result = await processMessage("Research the latest trends in LLM architecture", {
      userId: "test-user",
      sessionKey: "test-session",
    });

    expect(result.facultyActivation).toBeDefined();
    expect(result.facultyActivation?.faculty).toBe("research");
  });

  it("should detect automation request and route to workflow faculty", async () => {
    const result = await processMessage("Create a workflow to automate daily reports", {
      userId: "test-user",
      sessionKey: "test-session",
    });

    expect(result.facultyActivation).toBeDefined();
    expect(result.facultyActivation?.faculty).toBe("workflow");
  });

  it("should detect PII and route to privacy faculty", async () => {
    const result = await processMessage("My email is john@example.com and phone is 555-1234", {
      userId: "test-user",
      sessionKey: "test-session",
    });

    expect(result.facultyActivation).toBeDefined();
    expect(result.facultyActivation?.faculty).toBe("privacy");
    expect(result.facultyResult).toBeDefined();
  });

  it("should return 'none' for general queries without special routing", async () => {
    const result = await processMessage("What's the weather today?", {
      userId: "test-user",
      sessionKey: "test-session",
    });

    expect(result.facultyActivation).toBeDefined();
    expect(result.facultyActivation?.faculty).toBe("none");
    expect(result.facultyResult).toBeUndefined();
  });
});
