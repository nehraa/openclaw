export {
  clearAllChatLogs,
  clearChatHistory,
  configureLearning,
  extractTopics,
  getChatHistory,
  getInteractionCount,
  getLearningConfig,
  logInteraction,
} from "./chat-logger.js";
export {
  clearAllPreferences,
  clearPreferences,
  getPreferences,
  getTopInterests,
  updatePreferences,
} from "./preference-engine.js";
export { generateRecommendations, resetRecommendationCounter } from "./recommendations.js";
export type {
  ChatInteraction,
  LearningConfig,
  PrivacyLevel,
  Recommendation,
  UserPreferences,
} from "./types.js";
export type { ContentItem } from "./recommendations.js";
