/**
 * Content filter for proactive notifications.
 *
 * Evaluates content against user subscriptions and preferences
 * to determine what should trigger proactive outreach.
 */

import type { ContentItem } from "../learning/recommendations.js";
import type { Subscription } from "./types.js";

/** Result of filtering content for a user. */
export type FilterResult = {
  /** Whether the content passed the filter. */
  matched: boolean;
  /** Relevance score for the match. */
  relevance: number;
  /** Topics that matched the user's filters. */
  matchedTopics: string[];
};

/**
 * Evaluate whether a content item matches a user's subscription filters.
 *
 * Checks topic overlap and relevance threshold to determine if the content
 * should trigger a proactive notification.
 */
export function filterContent(
  item: ContentItem,
  subscription: Subscription,
  topicInterests?: Record<string, number>,
): FilterResult {
  if (!subscription.optedIn) {
    return { matched: false, relevance: 0, matchedTopics: [] };
  }

  const matchedTopics: string[] = [];
  let totalRelevance = 0;

  // Check against subscription topic filters
  const filterTopics = subscription.topicFilters.length > 0
    ? subscription.topicFilters
    : Object.keys(topicInterests ?? {});

  for (const itemTopic of item.topics) {
    const normalized = itemTopic.toLowerCase();
    for (const filter of filterTopics) {
      if (
        normalized === filter.toLowerCase() ||
        normalized.includes(filter.toLowerCase()) ||
        filter.toLowerCase().includes(normalized)
      ) {
        const interest = topicInterests?.[filter] ?? 0.5;
        totalRelevance += interest;
        matchedTopics.push(itemTopic);
        break;
      }
    }
  }

  // Normalize relevance
  const relevance = filterTopics.length > 0
    ? Math.min(1, totalRelevance / Math.max(1, filterTopics.length))
    : 0;

  const matched = relevance >= subscription.minRelevance && matchedTopics.length > 0;

  return {
    matched,
    relevance: Math.round(relevance * 100) / 100,
    matchedTopics,
  };
}

/**
 * Filter a catalog of content items for a specific subscription,
 * returning only items that pass the filter sorted by relevance.
 */
export function filterCatalog(
  catalog: ContentItem[],
  subscription: Subscription,
  topicInterests?: Record<string, number>,
): Array<{ item: ContentItem; result: FilterResult }> {
  return catalog
    .map((item) => ({
      item,
      result: filterContent(item, subscription, topicInterests),
    }))
    .filter(({ result }) => result.matched)
    .sort((a, b) => b.result.relevance - a.result.relevance);
}
