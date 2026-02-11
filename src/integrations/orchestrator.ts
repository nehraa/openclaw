/**
 * Orchestrator - cognitive architecture that routes requests through faculties.
 *
 * This is the "brain" that connects all subsystems:
 * - Emotional context enriches the response strategy
 * - Learning logs interactions and updates preferences
 * - Proactive system checks for content to recommend
 * - Ollama model selection adapts based on task complexity
 * - Faculties provide specialized cognitive capabilities:
 *   - Self-healing: Automated error fixing
 *   - Council: Complex reasoning decomposition
 *   - Memory: Deep code indexing and retrieval
 *   - Senses: Multimodal input/output
 *   - Research: Deep web research
 *   - Workflow: Automation creation
 *   - Privacy: PII protection
 *   - Shepherd: Background code health monitoring
 *   - Simulator: Scenario simulation
 *   - Autodidact: Capability discovery
 */

import type { EmotionalContext, EmotionAnalysis } from "../emotional-context/types.js";
import type { ContentItem } from "../learning/recommendations.js";
import type { UserPreferences, Recommendation } from "../learning/types.js";
import type { Notification } from "../proactive/types.js";
import type {
  OllamaModelInfo,
  ModelSwitchResult,
  TaskComplexity,
} from "../providers/ollama/dynamic-model-switch.js";
import { analyzeEmotion } from "../emotional-context/analyzer.js";
import { processMessage as processEmotionalMessage } from "../emotional-context/context-tracker.js";
import { logInteraction, extractTopics } from "../learning/chat-logger.js";
import { updatePreferences, getTopInterests } from "../learning/preference-engine.js";
import { generateRecommendations } from "../learning/recommendations.js";
import { filterCatalog } from "../proactive/content-filter.js";
import { createNotification } from "../proactive/notification-dispatcher.js";
import { isSubscribed, getSubscription } from "../proactive/subscriptions.js";
import {
  classifyTaskComplexity,
  selectModelForTask,
} from "../providers/ollama/dynamic-model-switch.js";
import type {
  FacultyActivation,
  InputAnalysis,
  FacultyResult,
} from "../faculties/types.js";
import {
  healError,
  detectErrorIntent,
  type SelfHealingResult,
} from "../faculties/self-healing.js";
import {
  deliberate,
  detectCouncilIntent,
  type CouncilResult,
} from "../faculties/council.js";
import {
  remember,
  detectMemoryIntent,
  type MemoryResult,
} from "../faculties/memory.js";
import {
  sense,
  detectSensesIntent,
  type SensesResult,
} from "../faculties/senses.js";
import {
  research,
  detectResearchIntent,
  type ResearchResult,
} from "../faculties/research.js";
import {
  automate,
  detectWorkflowIntent,
  type WorkflowResult,
} from "../faculties/workflow.js";
import {
  protect,
  detectPrivacyIntent,
  type PrivacyResult,
} from "../faculties/privacy.js";
import {
  shepherd,
  detectShepherdIntent,
  type ShepherdResult,
} from "../faculties/shepherd.js";
import {
  simulate,
  detectSimulatorIntent,
  type SimulatorResult,
} from "../faculties/simulator.js";
import {
  learn,
  detectAutodidactIntent,
  type AutodidactResult,
} from "../faculties/autodidact.js";

/** Full result from processing a message through all subsystems. */
export type OrchestrationResult = {
  /** Emotional analysis of the input message. */
  emotion: EmotionAnalysis;
  /** Current session emotional context (if tracked). */
  emotionalContext?: EmotionalContext;
  /** Task complexity classification for model selection. */
  taskComplexity: TaskComplexity;
  /** Recommended model for this task (if Ollama models provided). */
  modelRecommendation?: ModelSwitchResult;
  /** Updated user preferences. */
  preferences?: UserPreferences;
  /** Top interest topics for the user. */
  topInterests: string[];
  /** Content recommendations based on the interaction. */
  recommendations: Recommendation[];
  /** Proactive notifications generated. */
  notifications: Notification[];
  /** Response hints based on emotional context and preferences. */
  responseHints: ResponseHints;
  /** Faculty activation decision. */
  facultyActivation?: FacultyActivation;
  /** Faculty processing result (if a faculty was activated). */
  facultyResult?: FacultyResult<
    | SelfHealingResult
    | CouncilResult
    | MemoryResult
    | SensesResult
    | ResearchResult
    | WorkflowResult
    | PrivacyResult
    | ShepherdResult
    | SimulatorResult
    | AutodidactResult
  >;
};

/** Hints to guide how the system should respond. */
export type ResponseHints = {
  /** Suggested response tone based on emotional context. */
  tone: "empathetic" | "encouraging" | "neutral" | "enthusiastic" | "calming";
  /** Suggested verbosity level based on user preferences. */
  verbosity: "concise" | "moderate" | "detailed";
  /** Whether to include recommendations in the response. */
  includeRecommendations: boolean;
  /** Topics to emphasize based on user interests. */
  relevantTopics: string[];
};

/** Configuration for the orchestrator. */
export type OrchestratorConfig = {
  /** User/session identifier. */
  userId: string;
  /** Session key for emotional context. */
  sessionKey: string;
  /** Available Ollama models for dynamic selection. */
  ollamaModels?: OllamaModelInfo[];
  /** Content catalog for recommendations and proactive notifications. */
  contentCatalog?: ContentItem[];
  /** Channel where the interaction occurred. */
  channel?: string;
  /** OpenClaw config for faculties. */
  openClawConfig?: unknown;
};

/**
 * Process a user message through the full orchestration pipeline.
 *
 * Runs emotional analysis, analyzes input for faculty routing, activates
 * appropriate faculty if needed, updates learning, checks for proactive content,
 * classifies task complexity, and generates response hints — all in one call.
 */
export async function processMessage(
  input: string,
  config: OrchestratorConfig,
): Promise<OrchestrationResult> {
  const { userId, sessionKey, ollamaModels, contentCatalog, channel, openClawConfig } = config;

  // 1. Emotional analysis
  const emotion = analyzeEmotion(input);
  const emotionalContext = processEmotionalMessage(sessionKey, input) ?? undefined;

  // 2. Analyze input for faculty routing
  const inputAnalysis = analyzeInput(input);
  const facultyActivation = selectFaculty(inputAnalysis);

  // 3. Activate faculty if needed
  let facultyResult:
    | FacultyResult<
        | SelfHealingResult
        | CouncilResult
        | MemoryResult
        | SensesResult
        | ResearchResult
        | WorkflowResult
        | PrivacyResult
        | ShepherdResult
        | SimulatorResult
        | AutodidactResult
      >
    | undefined;

  if (facultyActivation.faculty !== "none") {
    facultyResult = await activateFaculty(
      facultyActivation.faculty,
      input,
      inputAnalysis,
      { config: openClawConfig, userId, sessionKey },
    );
  }

  // 4. Task complexity classification + model selection
  const taskComplexity = classifyTaskComplexity(input);
  const modelRecommendation =
    ollamaModels && ollamaModels.length > 0
      ? selectModelForTask(ollamaModels, taskComplexity)
      : undefined;

  // 5. Log interaction (output is empty here; call recordResponse() after generating a response)
  const topics = extractTopics(input);
  logInteraction(userId, input, "", { channel, topics });

  // 6. Update preferences and get interests
  const preferences = updatePreferences(userId);
  const topInterests = getTopInterests(userId, 5);

  // 7. Generate recommendations from content catalog
  const recommendations = contentCatalog ? generateRecommendations(userId, contentCatalog, 3) : [];

  // 8. Proactive notifications
  const notifications: Notification[] = [];
  if (isSubscribed(userId) && contentCatalog) {
    const subscription = getSubscription(userId);
    if (subscription) {
      const matches = filterCatalog(contentCatalog, subscription, preferences.topicInterests);
      for (const { item, result } of matches.slice(0, 3)) {
        const notif = createNotification(userId, {
          title: `Recommended: ${item.title}`,
          body: item.summary,
          url: item.url,
          relevance: result.relevance,
          topics: result.matchedTopics,
        });
        if (notif) {
          notifications.push(notif);
        }
      }
    }
  }

  // 9. Generate response hints
  const responseHints = computeResponseHints(emotion, emotionalContext, preferences, topInterests);

  return {
    emotion,
    emotionalContext,
    taskComplexity,
    modelRecommendation,
    preferences,
    topInterests,
    recommendations,
    notifications,
    responseHints,
    facultyActivation,
    facultyResult,
  };
}

/**
 * Compute response hints from emotional context and user preferences.
 */
function computeResponseHints(
  emotion: EmotionAnalysis,
  emotionalContext: EmotionalContext | undefined,
  preferences: UserPreferences | undefined,
  topInterests: string[],
): ResponseHints {
  // Determine tone based on emotional state
  let tone: ResponseHints["tone"] = "neutral";
  if (emotion.dominant === "sadness" || emotion.dominant === "fear") {
    tone = "empathetic";
  } else if (emotion.dominant === "anger" || emotion.dominant === "disgust") {
    tone = "calming";
  } else if (emotion.dominant === "joy" || emotion.dominant === "anticipation") {
    tone = "enthusiastic";
  } else if (emotion.dominant === "trust") {
    tone = "encouraging";
  }

  // If the emotional trend is negative, shift toward empathetic
  if (emotionalContext?.trend === "negative" && tone === "neutral") {
    tone = "empathetic";
  }

  const verbosity = preferences?.preferredStyle.verbosity ?? "moderate";
  const includeRecommendations = topInterests.length > 0;

  return {
    tone,
    verbosity,
    includeRecommendations,
    relevantTopics: topInterests,
  };
}

/**
 * Update the response/output for a previously logged interaction.
 * Call this after generating a response to complete the learning loop.
 */
export function recordResponse(
  userId: string,
  output: string,
  config?: { channel?: string },
): void {
  // Log a follow-up with the response for preference tracking
  logInteraction(userId, "", output, { channel: config?.channel });
  updatePreferences(userId);
}

/**
 * Analyze input to determine which faculty (if any) should handle it.
 */
function analyzeInput(input: string): InputAnalysis {
  return {
    intents: [], // Could be expanded with NLP intent detection
    isError: detectErrorIntent(input),
    requiresDecomposition: detectCouncilIntent(input),
    requiresCodeSearch: detectMemoryIntent(input),
    isMultimodal: detectSensesIntent(input),
    requiresResearch: detectResearchIntent(input),
    isAutomation: detectWorkflowIntent(input),
    hasPII: detectPrivacyIntent(input),
    isCodeHealth: detectShepherdIntent(input),
    isSimulation: detectSimulatorIntent(input),
    isCapabilityDiscovery: detectAutodidactIntent(input),
  };
}

/**
 * Select which faculty should handle the request based on input analysis.
 */
function selectFaculty(analysis: InputAnalysis): FacultyActivation {
  // Priority order: error > privacy > decomposition > multimodal > research > etc.

  if (analysis.isError) {
    return {
      faculty: "self-healing",
      confidence: 0.9,
      reason: "Detected error or debugging request",
    };
  }

  if (analysis.hasPII) {
    return {
      faculty: "privacy",
      confidence: 0.85,
      reason: "Detected potential PII in request",
    };
  }

  if (analysis.requiresDecomposition) {
    return {
      faculty: "council",
      confidence: 0.8,
      reason: "Requires complex multi-agent reasoning",
    };
  }

  if (analysis.isMultimodal) {
    return {
      faculty: "senses",
      confidence: 0.85,
      reason: "Involves multimodal input/output processing",
    };
  }

  if (analysis.requiresResearch) {
    return {
      faculty: "research",
      confidence: 0.75,
      reason: "Requires deep research or information gathering",
    };
  }

  if (analysis.requiresCodeSearch) {
    return {
      faculty: "memory",
      confidence: 0.8,
      reason: "Requires code search or knowledge retrieval",
    };
  }

  if (analysis.isAutomation) {
    return {
      faculty: "workflow",
      confidence: 0.75,
      reason: "Involves automation or workflow creation",
    };
  }

  if (analysis.isCodeHealth) {
    return {
      faculty: "shepherd",
      confidence: 0.7,
      reason: "Related to code health monitoring",
    };
  }

  if (analysis.isSimulation) {
    return {
      faculty: "simulator",
      confidence: 0.7,
      reason: "Involves scenario simulation or what-if analysis",
    };
  }

  if (analysis.isCapabilityDiscovery) {
    return {
      faculty: "autodidact",
      confidence: 0.7,
      reason: "Seeking new capabilities or API discovery",
    };
  }

  return {
    faculty: "none",
    confidence: 0,
    reason: "No specialized faculty needed",
  };
}

/**
 * Activate the appropriate faculty and process the request.
 */
async function activateFaculty(
  faculty: Exclude<FacultyActivation["faculty"], "none">,
  input: string,
  analysis: InputAnalysis,
  config: { config?: unknown; userId?: string; sessionKey?: string },
): Promise<
  FacultyResult<
    | SelfHealingResult
    | CouncilResult
    | MemoryResult
    | SensesResult
    | ResearchResult
    | WorkflowResult
    | PrivacyResult
    | ShepherdResult
    | SimulatorResult
    | AutodidactResult
  >
> {
  try {
    switch (faculty) {
      case "self-healing":
        return await healError(
          {
            error: input,
            autoCreatePR: false,
          },
          config,
        );

      case "council":
        return await deliberate(
          {
            problem: input,
            processType: "sequential",
          },
          config,
        );

      case "memory":
        return await remember(
          {
            action: "search",
            query: input,
            topK: 5,
          },
          config,
        );

      case "senses":
        // Determine action from input
        if (input.toLowerCase().includes("transcribe")) {
          return await sense({ action: "transcribe" }, config);
        } else if (input.toLowerCase().includes("generate image")) {
          return await sense({ action: "generate_image", imagePrompt: input }, config);
        } else if (input.toLowerCase().includes("speak") || input.toLowerCase().includes("say")) {
          return await sense({ action: "synthesize_speech", text: input }, config);
        }
        return { success: false, error: "Could not determine senses action" };

      case "research":
        return await research(
          {
            query: input,
            topK: 5,
            retrieverType: "hybrid",
          },
          config,
        );

      case "workflow":
        return await automate(
          {
            action: "get_templates",
          },
          config,
        );

      case "privacy":
        return await protect(
          {
            text: input,
            redact: true,
            useLocalModel: true,
          },
          config,
        );

      case "shepherd":
        return await shepherd(
          {
            action: "health_check",
          },
          config,
        );

      case "simulator":
        return await simulate(
          {
            scenario: input,
            iterations: 3,
          },
          config,
        );

      case "autodidact":
        return await learn(
          {
            query: input,
            limit: 5,
          },
          config,
        );

      default:
        return {
          success: false,
          error: `Unknown faculty: ${faculty}`,
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
