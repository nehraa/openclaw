/**
 * Integrates the orchestrator (emotional context, learning, proactive system)
 * into the reply processing pipeline.
 *
 * This module applies orchestrator results to influence response generation:
 * - Response hints (tone, verbosity) guide model behavior
 * - Emotional context informs conversation strategy
 * - Learning logs interactions for preference tracking
 */

import type { OpenClawConfig } from "../../config/config.js";
import type { OrchestrationResult, ResponseHints } from "../../integrations/orchestrator.js";
import type { TemplateContext } from "../templating.js";
import { processMessage as orchestrateMessage } from "../../integrations/orchestrator.js";

/**
 * Configuration for the orchestrator integration.
 */
export type OrchestratorIntegrationConfig = {
  /** Whether orchestrator integration is enabled (requires emotionalContext.enabled in config). */
  enabled: boolean;
  /** Whether to apply emotional context to response generation. */
  applyEmotionalContext: boolean;
  /** Whether to log interactions for learning. */
  enableLearning: boolean;
  /** Whether to track proactive notifications. */
  enableProactive: boolean;
};

/**
 * Result of orchestrator integration for a message.
 */
export type OrchestratorIntegrationResult = {
  orchestrationResult: OrchestrationResult;
  responseHints: ResponseHints;
  /** Whether the system should use empathetic tone based on emotional state. */
  shouldBeEmpathetic: boolean;
  /** Whether the system should provide more detailed responses. */
  shouldBeDetailed: boolean;
};

/**
 * Resolve orchestrator integration config from the main config.
 */
function resolveOrchestratorIntegrationConfig(
  cfg: OpenClawConfig | undefined,
): OrchestratorIntegrationConfig {
  const emotionalCtx = (cfg as any)?.emotionalContext ?? {};
  return {
    enabled: emotionalCtx.enabled ?? false,
    applyEmotionalContext: true,
    enableLearning: (cfg as any)?.learning?.enabled ?? false,
    enableProactive: (cfg as any)?.proactive?.enabled ?? false,
  };
}

/**
 * Process a user message through the orchestrator pipeline.
 * Returns integration results that can be applied to response generation.
 *
 * @param userMessage The user's input message
 * @param sessionKey Session identifier for context tracking
 * @param cfg The OpenClaw configuration
 * @param sessionCtx Template context with channel/user info
 * @returns Orchestration result and derived hints, or undefined if integration is disabled
 */
export function integrateOrchestratorForMessage(
  userMessage: string,
  sessionKey: string,
  cfg: OpenClawConfig | undefined,
  sessionCtx: TemplateContext,
): OrchestratorIntegrationResult | undefined {
  const integrationCfg = resolveOrchestratorIntegrationConfig(cfg);
  if (!integrationCfg.enabled) {
    return undefined;
  }

  try {
    const orchestrationResult = orchestrateMessage(userMessage, {
      userId: sessionCtx.SenderId ?? "unknown",
      sessionKey,
      channel: sessionCtx.OriginatingChannel ?? sessionCtx.Provider,
      ollamaModels: undefined, // TODO: pass when available
      contentCatalog: undefined, // TODO: wire learning system
    });

    const hints = orchestrationResult.responseHints;

    return {
      orchestrationResult,
      responseHints: hints,
      shouldBeEmpathetic: hints.tone === "empathetic" || hints.tone === "calming",
      shouldBeDetailed: hints.verbosity === "detailed",
    };
  } catch (err) {
    // Log but don't fail if orchestrator integration encounters an error
    console.warn(
      "[orchestrator-integration] Error processing message:",
      err instanceof Error ? err.message : String(err),
    );
    return undefined;
  }
}

/**
 * Apply orchestrator hints to a system prompt or context.
 * This modifies the response generation strategy based on emotional state.
 */
export function applyOrchestratorHints(baseSystemPrompt: string, hints: ResponseHints): string {
  const modifications: string[] = [];

  // Apply tone modifier
  switch (hints.tone) {
    case "empathetic":
      modifications.push(
        "Respond with empathy and understanding. Acknowledge the user's emotions and concerns.",
      );
      break;
    case "calming":
      modifications.push("Use a calm, reassuring tone. Help the user feel heard and supported.");
      break;
    case "encouraging":
      modifications.push(
        "Be encouraging and motivational. Emphasize positive aspects and progress.",
      );
      break;
    case "enthusiastic":
      modifications.push("Be enthusiastic and upbeat. Match the user's positive energy.");
      break;
    case "neutral":
    default:
      // No modification needed
      break;
  }

  // Apply verbosity modifier
  switch (hints.verbosity) {
    case "concise":
      modifications.push("Keep responses brief and to the point. Avoid unnecessary elaboration.");
      break;
    case "detailed":
      modifications.push("Provide detailed and thorough responses. Don't skip important context.");
      break;
    case "moderate":
    default:
      // Keep existing prompt as-is
      break;
  }

  // Apply topic emphasis
  if (hints.relevantTopics.length > 0) {
    modifications.push(
      `When relevant, emphasize these topics: ${hints.relevantTopics.join(", ")}.`,
    );
  }

  if (modifications.length === 0) {
    return baseSystemPrompt;
  }

  // Append orchestrator-driven hints to the system prompt
  const hints_section = `\n\n[Orchestrator Response Hints]\n${modifications.join("\n")}\n`;
  return baseSystemPrompt + hints_section;
}
