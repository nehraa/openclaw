/**
 * Content recommendation engine.
 *
 * Generates recommendations based on learned user preferences
 * by matching topic interests against a content catalog.
 */

import { getPreferences } from "./preference-engine.js";
import type { Recommendation } from "./types.js";

/** Represents a piece of content available for recommendation. */
export type ContentItem = {
  id: string;
  title: string;
  summary: string;
  url?: string;
  topics: string[];
};

let idCounter = 0;

function generateRecommendationId(): string {
  return `rec-${Date.now()}-${++idCounter}`;
}

/**
 * Generate recommendations for a user based on their learned preferences.
 *
 * Scores each content item against the user's topic interests and returns
 * the top matches above a minimum relevance threshold.
 *
 * @param userId - User to generate recommendations for
 * @param catalog - Available content items to recommend
 * @param limit - Maximum number of recommendations to return
 * @param minRelevance - Minimum relevance score (0-1) for inclusion
 */
export function generateRecommendations(
  userId: string,
  catalog: ContentItem[],
  limit = 5,
  minRelevance = 0.1,
): Recommendation[] {
  const prefs = getPreferences(userId);
  if (!prefs || Object.keys(prefs.topicInterests).length === 0) {
    return [];
  }

  const scored: Array<{ item: ContentItem; score: number; matched: string[] }> = [];

  for (const item of catalog) {
    let totalScore = 0;
    const matchedTopics: string[] = [];

    for (const topic of item.topics) {
      const normalizedTopic = topic.toLowerCase();
      // Check for exact or partial matches in user interests
      for (const [interest, weight] of Object.entries(prefs.topicInterests)) {
        if (
          normalizedTopic === interest.toLowerCase() ||
          normalizedTopic.includes(interest.toLowerCase()) ||
          interest.toLowerCase().includes(normalizedTopic)
        ) {
          totalScore += weight;
          matchedTopics.push(topic);
          break;
        }
      }
    }

    // Normalize score by number of topics in the item
    const relevance = item.topics.length > 0 ? totalScore / item.topics.length : 0;

    if (relevance >= minRelevance) {
      scored.push({ item, score: relevance, matched: matchedTopics });
    }
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item, score, matched }) => ({
      id: generateRecommendationId(),
      title: item.title,
      summary: item.summary,
      url: item.url,
      relevance: Math.round(score * 100) / 100,
      matchedTopics: matched,
      generatedAt: new Date().toISOString(),
    }));
}

/**
 * Reset the recommendation ID counter (useful for testing).
 */
export function resetRecommendationCounter(): void {
  idCounter = 0;
}
