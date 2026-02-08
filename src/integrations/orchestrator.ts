/**
 * Orchestrator that wires emotional context, learning, proactive notifications,
 * and model selection into a unified message processing pipeline.
 *
 * This is the "brain" that connects all the subsystems so each feature feeds
 * into the others:
 * - Emotional context enriches the response strategy
 * - Learning logs interactions and updates preferences
 * - Proactive system checks for content to recommend
 * - Ollama model selection adapts based on task complexity
 */

import type { EmotionalContext, EmotionAnalysis } from "../emotional-context/types.js";
import type { ContentItem } from "../learning/recommendations.js";
import type { UserPreferences, Recommendation } from "../learning/types.js";
import type { Notification } from "../proactive/types.js";
import type {
  OllamaModelInfo,
  ModelSwitchResult,
  TaskComplexity,
} from "../providers/ollama/dynamic-model-switch.js";
import { analyzeEmotion } from "../emotional-context/analyzer.js";
import { processMessage as processEmotionalMessage } from "../emotional-context/context-tracker.js";
import { logInteraction, extractTopics } from "../learning/chat-logger.js";
import { updatePreferences, getTopInterests } from "../learning/preference-engine.js";
import { generateRecommendations } from "../learning/recommendations.js";
import { filterCatalog } from "../proactive/content-filter.js";
import { createNotification } from "../proactive/notification-dispatcher.js";
import { isSubscribed, getSubscription } from "../proactive/subscriptions.js";
import {
  classifyTaskComplexity,
  selectModelForTask,
} from "../providers/ollama/dynamic-model-switch.js";

/** Full result from processing a message through all subsystems. */
export type OrchestrationResult = {
  /** Emotional analysis of the input message. */
  emotion: EmotionAnalysis;
  /** Current session emotional context (if tracked). */
  emotionalContext?: EmotionalContext;
  /** Task complexity classification for model selection. */
  taskComplexity: TaskComplexity;
  /** Recommended model for this task (if Ollama models provided). */
  modelRecommendation?: ModelSwitchResult;
  /** Updated user preferences. */
  preferences?: UserPreferences;
  /** Top interest topics for the user. */
  topInterests: string[];
  /** Content recommendations based on the interaction. */
  recommendations: Recommendation[];
  /** Proactive notifications generated. */
  notifications: Notification[];
  /** Response hints based on emotional context and preferences. */
  responseHints: ResponseHints;
};

/** Hints to guide how the system should respond. */
export type ResponseHints = {
  /** Suggested response tone based on emotional context. */
  tone: "empathetic" | "encouraging" | "neutral" | "enthusiastic" | "calming";
  /** Suggested verbosity level based on user preferences. */
  verbosity: "concise" | "moderate" | "detailed";
  /** Whether to include recommendations in the response. */
  includeRecommendations: boolean;
  /** Topics to emphasize based on user interests. */
  relevantTopics: string[];
};

/** Configuration for the orchestrator. */
export type OrchestratorConfig = {
  /** User/session identifier. */
  userId: string;
  /** Session key for emotional context. */
  sessionKey: string;
  /** Available Ollama models for dynamic selection. */
  ollamaModels?: OllamaModelInfo[];
  /** Content catalog for recommendations and proactive notifications. */
  contentCatalog?: ContentItem[];
  /** Channel where the interaction occurred. */
  channel?: string;
};

/**
 * Process a user message through the full orchestration pipeline.
 *
 * Runs emotional analysis, updates learning, checks for proactive content,
 * classifies task complexity, and generates response hints — all in one call.
 */
export function processMessage(input: string, config: OrchestratorConfig): OrchestrationResult {
  const { userId, sessionKey, ollamaModels, contentCatalog, channel } = config;

  // 1. Emotional analysis
  const emotion = analyzeEmotion(input);
  const emotionalContext = processEmotionalMessage(sessionKey, input) ?? undefined;

  // 2. Task complexity classification + model selection
  const taskComplexity = classifyTaskComplexity(input);
  const modelRecommendation =
    ollamaModels && ollamaModels.length > 0
      ? selectModelForTask(ollamaModels, taskComplexity)
      : undefined;

  // 3. Log interaction (output is empty here; call recordResponse() after generating a response)
  const topics = extractTopics(input);
  logInteraction(userId, input, "", { channel, topics });

  // 4. Update preferences and get interests
  const preferences = updatePreferences(userId);
  const topInterests = getTopInterests(userId, 5);

  // 5. Generate recommendations from content catalog
  const recommendations = contentCatalog ? generateRecommendations(userId, contentCatalog, 3) : [];

  // 6. Proactive notifications
  const notifications: Notification[] = [];
  if (isSubscribed(userId) && contentCatalog) {
    const subscription = getSubscription(userId);
    if (subscription) {
      const matches = filterCatalog(contentCatalog, subscription, preferences.topicInterests);
      for (const { item, result } of matches.slice(0, 3)) {
        const notif = createNotification(userId, {
          title: `Recommended: ${item.title}`,
          body: item.summary,
          url: item.url,
          relevance: result.relevance,
          topics: result.matchedTopics,
        });
        if (notif) {
          notifications.push(notif);
        }
      }
    }
  }

  // 7. Generate response hints
  const responseHints = computeResponseHints(emotion, emotionalContext, preferences, topInterests);

  return {
    emotion,
    emotionalContext,
    taskComplexity,
    modelRecommendation,
    preferences,
    topInterests,
    recommendations,
    notifications,
    responseHints,
  };
}

/**
 * Compute response hints from emotional context and user preferences.
 */
function computeResponseHints(
  emotion: EmotionAnalysis,
  emotionalContext: EmotionalContext | undefined,
  preferences: UserPreferences | undefined,
  topInterests: string[],
): ResponseHints {
  // Determine tone based on emotional state
  let tone: ResponseHints["tone"] = "neutral";
  if (emotion.dominant === "sadness" || emotion.dominant === "fear") {
    tone = "empathetic";
  } else if (emotion.dominant === "anger" || emotion.dominant === "disgust") {
    tone = "calming";
  } else if (emotion.dominant === "joy" || emotion.dominant === "anticipation") {
    tone = "enthusiastic";
  } else if (emotion.dominant === "trust") {
    tone = "encouraging";
  }

  // If the emotional trend is negative, shift toward empathetic
  if (emotionalContext?.trend === "negative" && tone === "neutral") {
    tone = "empathetic";
  }

  const verbosity = preferences?.preferredStyle.verbosity ?? "moderate";
  const includeRecommendations = topInterests.length > 0;

  return {
    tone,
    verbosity,
    includeRecommendations,
    relevantTopics: topInterests,
  };
}

/**
 * Update the response/output for a previously logged interaction.
 * Call this after generating a response to complete the learning loop.
 */
export function recordResponse(
  userId: string,
  output: string,
  config?: { channel?: string },
): void {
  // Log a follow-up with the response for preference tracking
  logInteraction(userId, "", output, { channel: config?.channel });
  updatePreferences(userId);
}
