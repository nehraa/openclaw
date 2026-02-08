import { z } from "zod";

/**
 * Configuration schemas for beta learning system features.
 */

export const PrivacyLevelSchema = z.enum(["off", "minimal", "standard", "full"]);

export const LearningConfigSchema = z
  .object({
    /** Whether the learning system is enabled. */
    enabled: z.boolean().optional().default(false),
    /** Privacy level for data retention. */
    privacyLevel: PrivacyLevelSchema.optional().default("minimal"),
    /** Maximum number of interactions to keep per user. */
    maxInteractionsPerUser: z.number().int().positive().optional().default(1000),
    /** Whether to track topic preferences. */
    trackTopics: z.boolean().optional().default(true),
    /** Whether to generate recommendations. */
    enableRecommendations: z.boolean().optional().default(true),
  })
  .strict()
  .optional();

export const EmotionalContextConfigSchema = z
  .object({
    /** Whether emotional context tracking is enabled. */
    enabled: z.boolean().optional().default(false),
    /** Maximum number of analyses to keep in the rolling window. */
    historyWindowSize: z.number().int().positive().optional().default(10),
  })
  .strict()
  .optional();

export const NotificationChannelSchema = z.enum(["email", "webhook", "in-app"]);

export const ProactiveConfigSchema = z
  .object({
    /** Whether proactive notifications are enabled. */
    enabled: z.boolean().optional().default(false),
    /** Default minimum relevance threshold for notifications. */
    defaultMinRelevance: z.number().min(0).max(1).optional().default(0.7),
    /** Maximum notifications per user per day. */
    maxDailyNotifications: z.number().int().positive().optional().default(5),
    /** Available delivery channels. */
    availableChannels: z.array(NotificationChannelSchema).optional().default(["in-app"]),
  })
  .strict()
  .optional();
