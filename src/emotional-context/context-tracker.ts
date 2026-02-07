/**
 * Tracks emotional context across a conversation session.
 *
 * Maintains a rolling window of emotion analyses and computes
 * aggregate metrics (trend, average sentiment, dominant emotion)
 * to provide conversational emotional awareness.
 */

import { analyzeEmotion } from "./analyzer.js";
import type {
  EmotionalContext,
  EmotionalContextConfig,
  EmotionAnalysis,
  EmotionLabel,
  Sentiment,
} from "./types.js";

const DEFAULT_CONFIG: EmotionalContextConfig = {
  enabled: true,
  historyWindowSize: 20,
};

/** Per-session emotional context store. */
const sessions = new Map<string, EmotionalContext>();

/**
 * Process a message and update the emotional context for the session.
 *
 * @returns The updated emotional context, or undefined if tracking is disabled.
 */
export function processMessage(
  sessionKey: string,
  text: string,
  config: Partial<EmotionalContextConfig> = {},
): EmotionalContext | undefined {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  if (!cfg.enabled) {
    return undefined;
  }

  const analysis = analyzeEmotion(text);
  const context = sessions.get(sessionKey) ?? createEmptyContext(sessionKey);

  // Append analysis and trim to window size
  context.history.push(analysis);
  if (context.history.length > cfg.historyWindowSize) {
    context.history = context.history.slice(-cfg.historyWindowSize);
  }

  // Recompute aggregates
  updateAggregates(context);
  sessions.set(sessionKey, context);

  return structuredClone(context);
}

/**
 * Get the current emotional context for a session without modifying it.
 */
export function getEmotionalContext(sessionKey: string): EmotionalContext | undefined {
  const context = sessions.get(sessionKey);
  return context ? structuredClone(context) : undefined;
}

/**
 * Clear emotional context for a session (e.g., on /new).
 */
export function clearEmotionalContext(sessionKey: string): void {
  sessions.delete(sessionKey);
}

/**
 * Clear all tracked sessions (useful for testing).
 */
export function clearAllEmotionalContexts(): void {
  sessions.clear();
}

/**
 * Analyze text without updating session context.
 */
export function analyzeText(text: string): EmotionAnalysis {
  return analyzeEmotion(text);
}

function createEmptyContext(sessionKey: string): EmotionalContext {
  return {
    sessionKey,
    history: [],
    trend: "neutral",
    averageSentiment: 0,
    dominantEmotion: "neutral",
    updatedAt: new Date().toISOString(),
  };
}

function updateAggregates(context: EmotionalContext): void {
  const { history } = context;
  if (history.length === 0) {
    context.trend = "neutral";
    context.averageSentiment = 0;
    context.dominantEmotion = "neutral";
    context.updatedAt = new Date().toISOString();
    return;
  }

  // Average sentiment
  const totalSentiment = history.reduce((sum, a) => sum + a.sentimentScore, 0);
  context.averageSentiment = totalSentiment / history.length;

  // Sentiment trend
  context.trend =
    context.averageSentiment > 0.1
      ? "positive"
      : context.averageSentiment < -0.1
        ? "negative"
        : "neutral";

  // Dominant emotion by frequency
  context.dominantEmotion = computeDominantEmotion(history);
  context.updatedAt = new Date().toISOString();
}

function computeDominantEmotion(history: EmotionAnalysis[]): EmotionLabel {
  const counts = new Map<EmotionLabel, number>();
  for (const analysis of history) {
    const current = counts.get(analysis.dominant) ?? 0;
    counts.set(analysis.dominant, current + 1);
  }

  let best: EmotionLabel = "neutral";
  let bestCount = 0;
  for (const [label, count] of counts) {
    if (count > bestCount) {
      best = label;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Compute a sentiment trend direction from a list of sentiments.
 * Returns "positive" if trending up, "negative" if down, "neutral" otherwise.
 */
export function computeSentimentTrend(sentiments: number[]): Sentiment {
  if (sentiments.length < 2) {
    return "neutral";
  }
  const mid = Math.floor(sentiments.length / 2);
  const firstHalf = sentiments.slice(0, mid);
  const secondHalf = sentiments.slice(mid);

  const avgFirst = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length;
  const diff = avgSecond - avgFirst;

  if (diff > 0.15) {
    return "positive";
  }
  if (diff < -0.15) {
    return "negative";
  }
  return "neutral";
}
