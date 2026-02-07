/**
 * User preference learning engine.
 *
 * Analyzes chat interaction patterns to build user preference profiles,
 * including topic interests and preferred communication style.
 */

import type { UserPreferences } from "./types.js";
import { getChatHistory } from "./chat-logger.js";

/** In-memory preference store. */
const preferences = new Map<string, UserPreferences>();

/**
 * Decay factor for older topic signals (exponential decay).
 * Each step back in history multiplies the weight by this factor,
 * so the most recent interaction has weight 1.0 and the Nth previous
 * has weight 0.95^N. This ensures recent topics dominate preferences.
 */
const TOPIC_DECAY = 0.95;

/**
 * Update user preferences based on their chat history.
 *
 * Recalculates topic interests and style preferences from
 * recent interactions using frequency-weighted scoring.
 */
export function updatePreferences(userId: string): UserPreferences {
  const history = getChatHistory(userId);
  const existing = preferences.get(userId) ?? createDefaultPreferences(userId);

  // Rebuild topic interests from history with recency weighting
  const topicScores = new Map<string, number>();
  for (let i = 0; i < history.length; i++) {
    const recencyWeight = TOPIC_DECAY ** (history.length - 1 - i);
    for (const topic of history[i].topics) {
      const current = topicScores.get(topic) ?? 0;
      topicScores.set(topic, current + recencyWeight);
    }
  }

  // Normalize scores to [0, 1]
  const maxScore = Math.max(1, ...topicScores.values());
  const topicInterests: Record<string, number> = {};
  for (const [topic, score] of topicScores) {
    topicInterests[topic] = Math.round((score / maxScore) * 100) / 100;
  }

  // Infer verbosity preference from average message length (keep default when no history)
  const verbosity: "concise" | "moderate" | "detailed" =
    history.length > 0
      ? (() => {
          const avgInputLength =
            history.reduce((sum, h) => sum + h.input.length, 0) / history.length;
          return avgInputLength < 50 ? "concise" : avgInputLength < 200 ? "moderate" : "detailed";
        })()
      : existing.preferredStyle.verbosity;

  const updated: UserPreferences = {
    ...existing,
    topicInterests,
    preferredStyle: {
      ...existing.preferredStyle,
      verbosity,
    },
    interactionCount: history.length,
    updatedAt: new Date().toISOString(),
  };

  preferences.set(userId, updated);
  return structuredClone(updated);
}

/**
 * Get current preferences for a user.
 */
export function getPreferences(userId: string): UserPreferences | undefined {
  const prefs = preferences.get(userId);
  return prefs ? structuredClone(prefs) : undefined;
}

/**
 * Get top N topics of interest for a user.
 */
export function getTopInterests(userId: string, limit = 5): string[] {
  const prefs = preferences.get(userId);
  if (!prefs) {
    return [];
  }

  return Object.entries(prefs.topicInterests)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([topic]) => topic);
}

/**
 * Clear preferences for a user.
 */
export function clearPreferences(userId: string): void {
  preferences.delete(userId);
}

/**
 * Clear all preferences (useful for testing).
 */
export function clearAllPreferences(): void {
  preferences.clear();
}

function createDefaultPreferences(userId: string): UserPreferences {
  return {
    userId,
    topicInterests: {},
    preferredStyle: {
      verbosity: "moderate",
      formality: "neutral",
    },
    interactionCount: 0,
    updatedAt: new Date().toISOString(),
  };
}
