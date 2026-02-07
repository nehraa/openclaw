/**
 * Subscription management for proactive notifications.
 *
 * Handles opt-in/opt-out and per-user notification preferences.
 */

import type { NotificationChannel, Subscription } from "./types.js";

/** In-memory subscription store. */
const subscriptions = new Map<string, Subscription>();

/**
 * Subscribe a user to proactive notifications.
 */
export function subscribe(
  userId: string,
  options?: {
    channels?: NotificationChannel[];
    topicFilters?: string[];
    minRelevance?: number;
  },
): Subscription {
  const sub: Subscription = {
    userId,
    optedIn: true,
    channels: options?.channels ?? ["in-app"],
    topicFilters: options?.topicFilters ?? [],
    minRelevance: options?.minRelevance ?? 0.3,
    updatedAt: new Date().toISOString(),
  };

  subscriptions.set(userId, sub);
  return structuredClone(sub);
}

/**
 * Unsubscribe a user from proactive notifications.
 */
export function unsubscribe(userId: string): void {
  const existing = subscriptions.get(userId);
  if (existing) {
    existing.optedIn = false;
    existing.updatedAt = new Date().toISOString();
  }
}

/**
 * Get a user's subscription.
 */
export function getSubscription(userId: string): Subscription | undefined {
  const sub = subscriptions.get(userId);
  return sub ? structuredClone(sub) : undefined;
}

/**
 * Check if a user is subscribed and opted in.
 */
export function isSubscribed(userId: string): boolean {
  return subscriptions.get(userId)?.optedIn === true;
}

/**
 * Update a user's subscription settings.
 */
export function updateSubscription(
  userId: string,
  updates: Partial<Pick<Subscription, "channels" | "topicFilters" | "minRelevance">>,
): Subscription | undefined {
  const sub = subscriptions.get(userId);
  if (!sub) {
    return undefined;
  }

  if (updates.channels !== undefined) {
    sub.channels = updates.channels;
  }
  if (updates.topicFilters !== undefined) {
    sub.topicFilters = updates.topicFilters;
  }
  if (updates.minRelevance !== undefined) {
    sub.minRelevance = updates.minRelevance;
  }
  sub.updatedAt = new Date().toISOString();

  return structuredClone(sub);
}

/**
 * Get all active (opted-in) subscriptions.
 */
export function getActiveSubscriptions(): Subscription[] {
  return Array.from(subscriptions.values())
    .filter((s) => s.optedIn)
    .map((s) => structuredClone(s));
}

/**
 * Clear all subscriptions (useful for testing).
 */
export function clearAllSubscriptions(): void {
  subscriptions.clear();
}
