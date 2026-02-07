/**
 * Notification dispatcher for proactive communication.
 *
 * Creates and manages notifications with rate limiting per user.
 */

import type { Notification, NotificationChannel, ProactiveConfig } from "./types.js";

const DEFAULT_CONFIG: ProactiveConfig = {
  enabled: true,
  defaultMinRelevance: 0.3,
  maxDailyNotifications: 10,
  availableChannels: ["in-app"],
};

let activeConfig: ProactiveConfig = { ...DEFAULT_CONFIG };

/** In-memory notification store keyed by userId. */
const notifications = new Map<string, Notification[]>();

/** Daily notification counts keyed by "userId:date". */
const dailyCounts = new Map<string, number>();

let idCounter = 0;

function generateId(): string {
  return `notif-${Date.now()}-${++idCounter}`;
}

function dailyKey(userId: string): string {
  return `${userId}:${new Date().toISOString().slice(0, 10)}`;
}

/**
 * Configure the proactive notification system.
 */
export function configureProactive(config: Partial<ProactiveConfig>): void {
  activeConfig = { ...activeConfig, ...config };
}

/**
 * Get the current proactive configuration.
 */
export function getProactiveConfig(): ProactiveConfig {
  return { ...activeConfig };
}

/**
 * Create a notification for a user.
 *
 * Respects daily rate limits and system enablement.
 *
 * @returns The created notification, or undefined if rate-limited or disabled.
 */
export function createNotification(
  userId: string,
  params: {
    title: string;
    body: string;
    url?: string;
    relevance: number;
    topics: string[];
    channel?: NotificationChannel;
  },
): Notification | undefined {
  if (!activeConfig.enabled) {
    return undefined;
  }

  const key = dailyKey(userId);
  const count = dailyCounts.get(key) ?? 0;
  if (count >= activeConfig.maxDailyNotifications) {
    return undefined;
  }

  const channel = params.channel ?? "in-app";
  if (!activeConfig.availableChannels.includes(channel)) {
    return undefined;
  }

  const notification: Notification = {
    id: generateId(),
    userId,
    title: params.title,
    body: params.body,
    url: params.url,
    relevance: params.relevance,
    topics: params.topics,
    channel,
    createdAt: new Date().toISOString(),
    status: "pending",
  };

  const userNotifs = notifications.get(userId) ?? [];
  userNotifs.push(notification);
  notifications.set(userId, userNotifs);
  dailyCounts.set(key, count + 1);

  return notification;
}

/**
 * Get notifications for a user.
 */
export function getNotifications(
  userId: string,
  options?: { status?: Notification["status"]; limit?: number },
): Notification[] {
  let userNotifs = notifications.get(userId) ?? [];

  if (options?.status) {
    userNotifs = userNotifs.filter((n) => n.status === options.status);
  }

  if (options?.limit !== undefined && options.limit > 0) {
    userNotifs = userNotifs.slice(-options.limit);
  }

  return userNotifs.map((n) => ({ ...n }));
}

/**
 * Mark a notification as delivered.
 */
export function markDelivered(userId: string, notificationId: string): boolean {
  const userNotifs = notifications.get(userId);
  if (!userNotifs) {
    return false;
  }

  const notif = userNotifs.find((n) => n.id === notificationId);
  if (!notif) {
    return false;
  }

  notif.status = "delivered";
  return true;
}

/**
 * Mark a notification as failed.
 */
export function markFailed(userId: string, notificationId: string): boolean {
  const userNotifs = notifications.get(userId);
  if (!userNotifs) {
    return false;
  }

  const notif = userNotifs.find((n) => n.id === notificationId);
  if (!notif) {
    return false;
  }

  notif.status = "failed";
  return true;
}

/**
 * Clear all notifications and counters (useful for testing).
 */
export function clearAllNotifications(): void {
  notifications.clear();
  dailyCounts.clear();
  idCounter = 0;
}
