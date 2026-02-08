/**
 * Learning tool – gives the agent access to the personal learning system.
 *
 * Exposes user preferences, interaction history, topic interests,
 * and recommendation generation so the agent can adapt to user patterns.
 */

import { Type } from "@sinclair/typebox";
import { getChatHistory, getInteractionCount, extractTopics } from "../../learning/chat-logger.js";
import { getPreferences, getTopInterests } from "../../learning/preference-engine.js";
import { generateRecommendations, type ContentItem } from "../../learning/recommendations.js";
import { stringEnum } from "../schema/typebox.js";
import { type AnyAgentTool, jsonResult, readStringParam } from "./common.js";

const LEARNING_ACTIONS = [
  "get_preferences",
  "get_interests",
  "get_history",
  "get_interaction_count",
  "extract_topics",
  "get_recommendations",
] as const;

const LearningToolSchema = Type.Object({
  action: stringEnum(LEARNING_ACTIONS),
  user_id: Type.Optional(
    Type.String({ description: "User/sender ID to look up. Defaults to current sender." }),
  ),
  text: Type.Optional(
    Type.String({ description: "Text to extract topics from (for extract_topics action)." }),
  ),
  limit: Type.Optional(
    Type.Number({ description: "Max results to return.", minimum: 1, maximum: 50 }),
  ),
});

type LearningToolOptions = {
  senderId?: string;
};

export function createLearningTool(options?: LearningToolOptions): AnyAgentTool {
  const tool: AnyAgentTool = {
    name: "learning",
    label: "Personal Learning",
    description: [
      "Access the personal learning system to understand user preferences and patterns.",
      "Actions: get_preferences (learned user style), get_interests (top topics),",
      "get_history (recent interactions), get_interaction_count, extract_topics (from text),",
      "get_recommendations (personalized suggestions).",
    ].join(" "),
    parameters: LearningToolSchema,
    execute: async (_toolCallId, params: Record<string, unknown>) => {
      const action = readStringParam(params, "action", {
        required: true,
      }) as (typeof LEARNING_ACTIONS)[number];
      const userId = (params.user_id as string) ?? options?.senderId ?? "unknown";

      try {
        switch (action) {
          case "get_preferences": {
            const prefs = getPreferences(userId);
            if (!prefs) {
              return jsonResult({ message: "No preferences tracked yet for this user." });
            }
            return jsonResult({ preferences: prefs });
          }

          case "get_interests": {
            const limit = (params.limit as number) ?? 10;
            const interests = getTopInterests(userId, limit);
            return jsonResult({ userId, interests });
          }

          case "get_history": {
            const limit = (params.limit as number) ?? 10;
            const history = getChatHistory(userId, limit);
            return jsonResult({ userId, count: history.length, interactions: history });
          }

          case "get_interaction_count": {
            const count = getInteractionCount(userId);
            return jsonResult({ userId, interactionCount: count });
          }

          case "extract_topics": {
            const text = readStringParam(params, "text", { required: true });
            const topics = extractTopics(text);
            return jsonResult({ topics });
          }

          case "get_recommendations": {
            // Build a minimal catalog from user interests for self-referential recommendations
            const interests = getTopInterests(userId, 20);
            const catalog: ContentItem[] = interests.map((topic) => ({
              id: `interest-${topic}`,
              title: topic,
              summary: `Content related to ${topic}`,
              topics: [topic],
            }));
            const limit = (params.limit as number) ?? 5;
            const recs = generateRecommendations(userId, catalog, limit);
            return jsonResult({ userId, recommendations: recs });
          }

          default:
            return jsonResult({ error: `Unknown action: ${String(action)}` });
        }
      } catch (err) {
        return jsonResult({
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
  };
  return tool;
}
