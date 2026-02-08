import { describe, it, expect, beforeEach } from "vitest";
import type { TemplateContext } from "../templating.js";
import {
  integrateOrchestratorForMessage,
  applyOrchestratorHints,
  type OrchestratorIntegrationConfig,
} from "./orchestrator-integration.js";

describe("orchestrator-integration", () => {
  describe("integrateOrchestratorForMessage", () => {
    it("returns undefined when orchestrator is disabled", () => {
      const result = integrateOrchestratorForMessage(
        "Hello world",
        "session-1",
        undefined, // no config = disabled
        {} as TemplateContext,
      );
      expect(result).toBeUndefined();
    });

    it("integrates message through orchestrator when enabled", () => {
      const cfg = {
        emotionalContext: { enabled: true, historyWindowSize: 20 },
      };
      const sessionCtx = {
        UserId: "user-123",
        OriginatingChannel: "discord",
        Provider: "discord",
      } as TemplateContext;

      const result = integrateOrchestratorForMessage(
        "I am feeling happy and excited!",
        "session-1",
        cfg as any,
        sessionCtx,
      );

      expect(result).toBeDefined();
      expect(result?.orchestrationResult.emotion).toBeDefined();
      expect(result?.responseHints).toBeDefined();
      expect(result?.responseHints.tone).toBeDefined();
    });

    it("detects empathetic tone for sad emotional state", () => {
      const cfg = {
        emotionalContext: { enabled: true, historyWindowSize: 20 },
      } as any;
      const sessionCtx = {} as TemplateContext;

      const result = integrateOrchestratorForMessage(
        "I'm feeling terrible and depressed",
        "session-1",
        cfg,
        sessionCtx,
      );

      expect(result).toBeDefined();
      expect(result?.shouldBeEmpathetic).toBe(true);
    });

    it("handles orchestrator errors gracefully", () => {
      // With an empty config that might cause issues
      const result = integrateOrchestratorForMessage(
        "test message",
        "session-1",
        {} as any,
        {} as TemplateContext,
      );
      // Should return undefined, not throw
      expect(result).toBeUndefined();
    });
  });

  describe("applyOrchestratorHints", () => {
    const basePrompt = "You are a helpful assistant.";

    it("applies empathetic tone hint", () => {
      const hints = {
        tone: "empathetic" as const,
        verbosity: "moderate" as const,
        includeRecommendations: false,
        relevantTopics: [],
      };
      const result = applyOrchestratorHints(basePrompt, hints);
      expect(result).toContain("empathy");
      expect(result).toContain("emotions");
    });

    it("applies calming tone hint", () => {
      const hints = {
        tone: "calming" as const,
        verbosity: "moderate" as const,
        includeRecommendations: false,
        relevantTopics: [],
      };
      const result = applyOrchestratorHints(basePrompt, hints);
      expect(result).toContain("calm");
      expect(result).toContain("reassuring");
    });

    it("applies encouraging tone hint", () => {
      const hints = {
        tone: "encouraging" as const,
        verbosity: "moderate" as const,
        includeRecommendations: false,
        relevantTopics: [],
      };
      const result = applyOrchestratorHints(basePrompt, hints);
      expect(result).toContain("encouraging");
      expect(result).toContain("motivational");
    });

    it("applies enthusiastic tone hint", () => {
      const hints = {
        tone: "enthusiastic" as const,
        verbosity: "moderate" as const,
        includeRecommendations: false,
        relevantTopics: [],
      };
      const result = applyOrchestratorHints(basePrompt, hints);
      expect(result).toContain("enthusiastic");
      expect(result).toContain("upbeat");
    });

    it("applies concise verbosity hint", () => {
      const hints = {
        tone: "neutral" as const,
        verbosity: "concise" as const,
        includeRecommendations: false,
        relevantTopics: [],
      };
      const result = applyOrchestratorHints(basePrompt, hints);
      expect(result).toContain("brief");
      expect(result).toContain("point");
    });

    it("applies detailed verbosity hint", () => {
      const hints = {
        tone: "neutral" as const,
        verbosity: "detailed" as const,
        includeRecommendations: false,
        relevantTopics: [],
      };
      const result = applyOrchestratorHints(basePrompt, hints);
      expect(result).toContain("detailed");
      expect(result).toContain("thorough");
    });

    it("applies topic emphasis hint", () => {
      const hints = {
        tone: "neutral" as const,
        verbosity: "moderate" as const,
        includeRecommendations: false,
        relevantTopics: ["machine learning", "neural networks"],
      };
      const result = applyOrchestratorHints(basePrompt, hints);
      expect(result).toContain("machine learning");
      expect(result).toContain("neural networks");
    });

    it("returns unchanged prompt for neutral tone and moderate verbosity with no topics", () => {
      const hints = {
        tone: "neutral" as const,
        verbosity: "moderate" as const,
        includeRecommendations: false,
        relevantTopics: [],
      };
      const result = applyOrchestratorHints(basePrompt, hints);
      expect(result).toBe(basePrompt);
    });

    it("combines multiple hints", () => {
      const hints = {
        tone: "empathetic" as const,
        verbosity: "detailed" as const,
        includeRecommendations: false,
        relevantTopics: ["mental health"],
      };
      const result = applyOrchestratorHints(basePrompt, hints);
      expect(result).toContain("empathy");
      expect(result).toContain("detailed");
      expect(result).toContain("mental health");
    });
  });
});
