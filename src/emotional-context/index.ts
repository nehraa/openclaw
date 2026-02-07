export { analyzeEmotion, tokenize } from "./analyzer.js";
export {
  analyzeText,
  clearAllEmotionalContexts,
  clearEmotionalContext,
  computeSentimentTrend,
  getEmotionalContext,
  processMessage,
} from "./context-tracker.js";
export type {
  EmotionalContext,
  EmotionalContextConfig,
  EmotionAnalysis,
  EmotionLabel,
  EmotionScore,
  Sentiment,
} from "./types.js";
