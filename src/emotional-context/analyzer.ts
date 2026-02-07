/**
 * Text emotion and sentiment analyzer.
 *
 * Uses keyword-based heuristics for lightweight emotion detection
 * without external ML model dependencies. Tokenizes input text and
 * applies weighted lexicon matching to classify emotions and sentiment.
 */

import type { EmotionAnalysis, EmotionLabel, EmotionScore, Sentiment } from "./types.js";

/** Lexicon mapping emotion keywords to their labels and weights. */
const EMOTION_LEXICON: Record<string, { label: EmotionLabel; weight: number }[]> = {
  // Joy indicators
  happy: [{ label: "joy", weight: 1.0 }],
  glad: [{ label: "joy", weight: 0.8 }],
  excited: [{ label: "joy", weight: 0.9 }],
  delighted: [{ label: "joy", weight: 0.9 }],
  wonderful: [{ label: "joy", weight: 0.8 }],
  great: [{ label: "joy", weight: 0.6 }],
  amazing: [{ label: "joy", weight: 0.9 }],
  love: [{ label: "joy", weight: 0.8 }],
  enjoy: [{ label: "joy", weight: 0.7 }],
  pleased: [{ label: "joy", weight: 0.7 }],
  cheerful: [{ label: "joy", weight: 0.8 }],
  fantastic: [{ label: "joy", weight: 0.9 }],
  // Sadness indicators
  sad: [{ label: "sadness", weight: 1.0 }],
  unhappy: [{ label: "sadness", weight: 0.9 }],
  depressed: [{ label: "sadness", weight: 1.0 }],
  disappointed: [{ label: "sadness", weight: 0.8 }],
  miserable: [{ label: "sadness", weight: 0.9 }],
  heartbroken: [{ label: "sadness", weight: 1.0 }],
  lonely: [{ label: "sadness", weight: 0.7 }],
  grief: [{ label: "sadness", weight: 1.0 }],
  // Anger indicators
  angry: [{ label: "anger", weight: 1.0 }],
  furious: [{ label: "anger", weight: 1.0 }],
  annoyed: [{ label: "anger", weight: 0.7 }],
  frustrated: [{ label: "anger", weight: 0.8 }],
  irritated: [{ label: "anger", weight: 0.7 }],
  outraged: [{ label: "anger", weight: 1.0 }],
  mad: [{ label: "anger", weight: 0.8 }],
  hostile: [{ label: "anger", weight: 0.9 }],
  // Fear indicators
  afraid: [{ label: "fear", weight: 1.0 }],
  scared: [{ label: "fear", weight: 1.0 }],
  anxious: [{ label: "fear", weight: 0.8 }],
  worried: [{ label: "fear", weight: 0.7 }],
  terrified: [{ label: "fear", weight: 1.0 }],
  nervous: [{ label: "fear", weight: 0.6 }],
  panicked: [{ label: "fear", weight: 1.0 }],
  dread: [{ label: "fear", weight: 0.9 }],
  // Surprise indicators
  surprised: [{ label: "surprise", weight: 1.0 }],
  shocked: [{ label: "surprise", weight: 0.9 }],
  astonished: [{ label: "surprise", weight: 0.9 }],
  unexpected: [{ label: "surprise", weight: 0.7 }],
  amazed: [{ label: "surprise", weight: 0.8 }],
  stunned: [{ label: "surprise", weight: 0.9 }],
  // Disgust indicators
  disgusted: [{ label: "disgust", weight: 1.0 }],
  revolted: [{ label: "disgust", weight: 0.9 }],
  repulsed: [{ label: "disgust", weight: 0.9 }],
  appalled: [{ label: "disgust", weight: 0.8 }],
  gross: [{ label: "disgust", weight: 0.6 }],
  // Trust indicators
  trust: [{ label: "trust", weight: 1.0 }],
  reliable: [{ label: "trust", weight: 0.8 }],
  confident: [{ label: "trust", weight: 0.7 }],
  faithful: [{ label: "trust", weight: 0.8 }],
  dependable: [{ label: "trust", weight: 0.8 }],
  // Anticipation indicators
  eager: [{ label: "anticipation", weight: 0.8 }],
  hopeful: [{ label: "anticipation", weight: 0.7 }],
  looking: [{ label: "anticipation", weight: 0.3 }],
  expecting: [{ label: "anticipation", weight: 0.7 }],
  awaiting: [{ label: "anticipation", weight: 0.7 }],
  curious: [{ label: "anticipation", weight: 0.6 }],
};

/** Sentiment polarity scores for common words. */
const SENTIMENT_LEXICON: Record<string, number> = {
  // Positive
  good: 0.5,
  great: 0.7,
  excellent: 0.9,
  amazing: 0.9,
  wonderful: 0.8,
  fantastic: 0.9,
  love: 0.8,
  like: 0.3,
  happy: 0.8,
  pleased: 0.6,
  enjoy: 0.6,
  beautiful: 0.7,
  perfect: 0.9,
  awesome: 0.8,
  brilliant: 0.8,
  best: 0.7,
  thank: 0.5,
  thanks: 0.5,
  helpful: 0.6,
  impressive: 0.7,
  // Negative
  bad: -0.5,
  terrible: -0.9,
  horrible: -0.9,
  awful: -0.8,
  hate: -0.9,
  dislike: -0.5,
  sad: -0.7,
  angry: -0.7,
  annoyed: -0.5,
  frustrated: -0.6,
  disappointed: -0.6,
  ugly: -0.6,
  worst: -0.8,
  poor: -0.5,
  useless: -0.7,
  broken: -0.5,
  fail: -0.6,
  failed: -0.6,
  wrong: -0.5,
  problem: -0.4,
};

/** Negation words that flip sentiment polarity. */
const NEGATION_WORDS = new Set(["not", "no", "never", "neither", "nobody", "nothing", "nowhere", "nor", "cannot", "can't", "don't", "doesn't", "didn't", "won't", "wouldn't", "shouldn't", "couldn't", "isn't", "aren't", "wasn't", "weren't"]);

/** Intensifier words that amplify sentiment/emotion scores. */
const INTENSIFIERS: Record<string, number> = {
  very: 1.3,
  extremely: 1.5,
  incredibly: 1.5,
  really: 1.2,
  absolutely: 1.4,
  totally: 1.3,
  completely: 1.3,
  utterly: 1.4,
  quite: 1.1,
  somewhat: 0.8,
  slightly: 0.6,
  barely: 0.5,
  hardly: 0.5,
};

/**
 * Tokenize text into lowercase words, removing punctuation.
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s'-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

/**
 * Analyze the emotional content and sentiment of text.
 *
 * Scans tokens against emotion and sentiment lexicons, applying
 * negation and intensifier modifiers for context-aware scoring.
 */
export function analyzeEmotion(text: string): EmotionAnalysis {
  const tokens = tokenize(text);
  const emotionScores = new Map<EmotionLabel, number>();
  let sentimentTotal = 0;
  let sentimentCount = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // Check for negation in the previous two tokens
    const isNegated =
      (i > 0 && NEGATION_WORDS.has(tokens[i - 1])) ||
      (i > 1 && NEGATION_WORDS.has(tokens[i - 2]));

    // Check for intensifier in the previous token
    const intensifier = i > 0 ? (INTENSIFIERS[tokens[i - 1]] ?? 1.0) : 1.0;

    // Process emotion lexicon matches
    const emotionEntries = EMOTION_LEXICON[token];
    if (emotionEntries) {
      for (const entry of emotionEntries) {
        const adjustedWeight = entry.weight * intensifier * (isNegated ? -0.5 : 1.0);
        const current = emotionScores.get(entry.label) ?? 0;
        emotionScores.set(entry.label, current + adjustedWeight);
      }
    }

    // Process sentiment lexicon matches
    const sentimentValue = SENTIMENT_LEXICON[token];
    if (sentimentValue !== undefined) {
      const adjustedSentiment = sentimentValue * intensifier * (isNegated ? -1 : 1);
      sentimentTotal += adjustedSentiment;
      sentimentCount++;
    }
  }

  // Build sorted emotion scores
  const emotions: EmotionScore[] = Array.from(emotionScores.entries())
    .map(([label, score]) => ({
      label,
      score: Math.max(0, Math.min(1, Math.abs(score))),
    }))
    .sort((a, b) => b.score - a.score);

  // Determine dominant emotion
  const dominant: EmotionLabel = emotions.length > 0 ? emotions[0].label : "neutral";

  // Calculate overall sentiment
  const sentimentScore =
    sentimentCount > 0
      ? Math.max(-1, Math.min(1, sentimentTotal / sentimentCount))
      : 0;

  const sentiment: Sentiment =
    sentimentScore > 0.1 ? "positive" : sentimentScore < -0.1 ? "negative" : "neutral";

  return {
    text,
    sentiment,
    sentimentScore,
    emotions,
    dominant,
    timestamp: new Date().toISOString(),
  };
}
