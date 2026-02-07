/**
 * Types for the proactive communication system.
 *
 * Supports automated outreach via configured channels when interesting
 * content is discovered, with opt-in subscription management.
 */

/** Supported delivery channels for proactive notifications. */
export type NotificationChannel = "email" | "webhook" | "in-app";

/** A subscriber's notification preferences. */
export type Subscription = {
  /** User identifier. */
  userId: string;
  /** Whether the user has opted in. */
  optedIn: boolean;
  /** Preferred notification channels. */
  channels: NotificationChannel[];
  /** Topic filters — only notify for these topics (empty = all). */
  topicFilters: string[];
  /** Minimum relevance score (0-1) for notifications. */
  minRelevance: number;
  /** ISO timestamp of subscription creation or last update. */
  updatedAt: string;
};

/** A notification to be delivered. */
export type Notification = {
  /** Unique notification identifier. */
  id: string;
  /** Target user. */
  userId: string;
  /** Notification title. */
  title: string;
  /** Notification body/message. */
  body: string;
  /** Optional URL for more info. */
  url?: string;
  /** Relevance score that triggered the notification. */
  relevance: number;
  /** Topics that matched. */
  topics: string[];
  /** Delivery channel used. */
  channel: NotificationChannel;
  /** ISO timestamp when created. */
  createdAt: string;
  /** Delivery status. */
  status: "pending" | "delivered" | "failed";
};

/** Configuration for the proactive communication system. */
export type ProactiveConfig = {
  /** Whether proactive notifications are enabled. */
  enabled: boolean;
  /** Default minimum relevance threshold for notifications. */
  defaultMinRelevance: number;
  /** Maximum notifications per user per day. */
  maxDailyNotifications: number;
  /** Available delivery channels. */
  availableChannels: NotificationChannel[];
};
