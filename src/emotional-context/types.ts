/**
 * Types for the emotional context learning system.
 *
 * Provides emotion detection and sentiment analysis for conversational text,
 * maintaining emotional context throughout conversations.
 */

/** Supported emotion categories for classification. */
export type EmotionLabel =
  | "joy"
  | "sadness"
  | "anger"
  | "fear"
  | "surprise"
  | "disgust"
  | "trust"
  | "anticipation"
  | "neutral";

/** Sentiment polarity of text. */
export type Sentiment = "positive" | "negative" | "neutral";

/** Result of analyzing a single text segment. */
export type EmotionScore = {
  /** The detected emotion label. */
  label: EmotionLabel;
  /** Confidence score between 0 and 1. */
  score: number;
};

/** Full analysis result for a piece of text. */
export type EmotionAnalysis = {
  /** The analyzed text. */
  text: string;
  /** Overall sentiment polarity. */
  sentiment: Sentiment;
  /** Sentiment confidence between -1 (negative) and 1 (positive). */
  sentimentScore: number;
  /** Detected emotions ranked by confidence. */
  emotions: EmotionScore[];
  /** The dominant (highest-scoring) emotion. */
  dominant: EmotionLabel;
  /** ISO timestamp of the analysis. */
  timestamp: string;
};

/** A snapshot of emotional context for a conversation session. */
export type EmotionalContext = {
  /** Session identifier. */
  sessionKey: string;
  /** Rolling window of recent emotion analyses. */
  history: EmotionAnalysis[];
  /** Aggregate sentiment trend over the window. */
  trend: Sentiment;
  /** Average sentiment score over the window. */
  averageSentiment: number;
  /** Most frequent dominant emotion in the window. */
  dominantEmotion: EmotionLabel;
  /** ISO timestamp of the last update. */
  updatedAt: string;
};

/** Configuration for the emotional context system. */
export type EmotionalContextConfig = {
  /** Whether emotional context tracking is enabled. */
  enabled: boolean;
  /** Maximum number of analyses to keep in the rolling window. */
  historyWindowSize: number;
};
