/**
 * Chat logging with privacy-aware data retention.
 *
 * Captures chat interactions, respects privacy levels, and supports
 * per-user interaction limits with automatic trimming.
 */

import type { ChatInteraction, LearningConfig, PrivacyLevel } from "./types.js";

const DEFAULT_CONFIG: LearningConfig = {
  enabled: true,
  privacyLevel: "standard",
  maxInteractionsPerUser: 500,
  trackTopics: true,
  enableRecommendations: true,
};

/** In-memory chat log store keyed by userId. */
const chatLogs = new Map<string, ChatInteraction[]>();

let activeConfig: LearningConfig = { ...DEFAULT_CONFIG };

let idCounter = 0;

function generateId(): string {
  return `interaction-${Date.now()}-${++idCounter}`;
}

/** Common stop words filtered out during topic extraction (module-level for reuse). */
const STOP_WORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "shall", "can", "need", "must", "ought",
  "i", "me", "my", "we", "our", "you", "your", "he", "him", "his",
  "she", "her", "it", "its", "they", "them", "their", "what", "which",
  "who", "whom", "this", "that", "these", "those", "am", "in", "on",
  "at", "to", "for", "of", "with", "by", "from", "as", "into", "about",
  "between", "through", "during", "before", "after", "above", "below",
  "and", "but", "or", "nor", "not", "so", "if", "then", "than", "too",
  "very", "just", "because", "how", "when", "where", "why", "all",
  "each", "every", "both", "few", "more", "most", "other", "some",
  "such", "no", "only", "same", "also", "up", "out", "off",
]);

/**
 * Configure the learning system.
 */
export function configureLearning(config: Partial<LearningConfig>): void {
  activeConfig = { ...activeConfig, ...config };
}

/**
 * Get the current learning configuration.
 */
export function getLearningConfig(): LearningConfig {
  return { ...activeConfig };
}

/**
 * Log a chat interaction, respecting privacy settings.
 *
 * @returns The logged interaction (possibly redacted), or undefined if logging is disabled.
 */
export function logInteraction(
  userId: string,
  input: string,
  output: string,
  options?: { channel?: string; topics?: string[] },
): ChatInteraction | undefined {
  if (!activeConfig.enabled || activeConfig.privacyLevel === "off") {
    return undefined;
  }

  const topics = options?.topics ?? (activeConfig.trackTopics ? extractTopics(input) : []);

  const interaction: ChatInteraction = {
    id: generateId(),
    userId,
    input: redactForPrivacy(input, activeConfig.privacyLevel),
    output: redactForPrivacy(output, activeConfig.privacyLevel),
    timestamp: new Date().toISOString(),
    topics,
    channel: options?.channel,
  };

  const userLog = chatLogs.get(userId) ?? [];
  userLog.push(interaction);

  // Trim to max interactions
  if (userLog.length > activeConfig.maxInteractionsPerUser) {
    userLog.splice(0, userLog.length - activeConfig.maxInteractionsPerUser);
  }

  chatLogs.set(userId, userLog);
  return structuredClone(interaction);
}

/**
 * Retrieve chat history for a user (deep-cloned to prevent mutation of stored data).
 */
export function getChatHistory(userId: string, limit?: number): ChatInteraction[] {
  const log = chatLogs.get(userId) ?? [];
  const slice = limit !== undefined && limit > 0 ? log.slice(-limit) : log;
  return slice.map((entry) => structuredClone(entry));
}

/**
 * Clear chat history for a user.
 */
export function clearChatHistory(userId: string): void {
  chatLogs.delete(userId);
}

/**
 * Clear all chat logs (useful for testing).
 */
export function clearAllChatLogs(): void {
  chatLogs.clear();
  idCounter = 0;
}

/**
 * Get total interaction count for a user.
 */
export function getInteractionCount(userId: string): number {
  return chatLogs.get(userId)?.length ?? 0;
}

/**
 * Extract topic keywords from text using simple heuristic extraction.
 * Filters out common stop words and returns significant terms.
 */
export function extractTopics(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  // Count word frequency and return top terms
  const freq = new Map<string, number>();
  for (const word of words) {
    freq.set(word, (freq.get(word) ?? 0) + 1);
  }

  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

/**
 * Redact text based on privacy level.
 *
 * Note: The PII patterns below cover common US-format emails and phone numbers.
 * International phone formats and complex email patterns may not be caught.
 * For production use with stricter requirements, consider a dedicated PII library.
 */
function redactForPrivacy(text: string, level: PrivacyLevel): string {
  switch (level) {
    case "off":
      return "";
    case "minimal":
      // Keep only first 50 chars
      return text.length > 50 ? `${text.slice(0, 50)}...` : text;
    case "standard":
      // Redact potential PII patterns (emails, phone numbers)
      return text
        .replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, "[EMAIL]")
        .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, "[PHONE]");
    case "full":
      return text;
    default:
      return text;
  }
}
