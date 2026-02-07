/**
 * Types for the personal learning system.
 *
 * Covers chat logging, user preference learning, topic tracking,
 * and personalized content recommendations with privacy controls.
 */

/** Privacy level controlling what data is retained. */
export type PrivacyLevel = "off" | "minimal" | "standard" | "full";

/** Configuration for the learning system. */
export type LearningConfig = {
  /** Whether the learning system is enabled. */
  enabled: boolean;
  /** Privacy level for data retention. */
  privacyLevel: PrivacyLevel;
  /** Maximum number of interactions to keep per user. */
  maxInteractionsPerUser: number;
  /** Whether to track topic preferences. */
  trackTopics: boolean;
  /** Whether to generate recommendations. */
  enableRecommendations: boolean;
};

/** A logged chat interaction. */
export type ChatInteraction = {
  /** Unique interaction identifier. */
  id: string;
  /** User or session identifier. */
  userId: string;
  /** The user's input message. */
  input: string;
  /** The system's response. */
  output: string;
  /** ISO timestamp of the interaction. */
  timestamp: string;
  /** Detected topics from the interaction. */
  topics: string[];
  /** Channel where the interaction occurred (e.g., "telegram", "discord"). */
  channel?: string;
};

/** Learned preferences for a user. */
export type UserPreferences = {
  /** User identifier. */
  userId: string;
  /** Topic interest scores (topic → weight). Higher = more interested. */
  topicInterests: Record<string, number>;
  /** Preferred response style hints. */
  preferredStyle: {
    verbosity: "concise" | "moderate" | "detailed";
    formality: "casual" | "neutral" | "formal";
  };
  /** Number of interactions analyzed. */
  interactionCount: number;
  /** ISO timestamp of the last update. */
  updatedAt: string;
};

/** A content recommendation entry. */
export type Recommendation = {
  /** Unique recommendation identifier. */
  id: string;
  /** Title of the recommended content. */
  title: string;
  /** Brief description or summary. */
  summary: string;
  /** URL or reference to the content. */
  url?: string;
  /** Relevance score between 0 and 1. */
  relevance: number;
  /** Topics that matched this recommendation. */
  matchedTopics: string[];
  /** ISO timestamp when generated. */
  generatedAt: string;
};
