/**
 * Dynamic model selection for Ollama integration.
 *
 * Enables task-based model switching by classifying task complexity
 * and selecting the most appropriate Ollama model accordingly.
 * Supports connecting to remote Ollama instances (cloud mode).
 */

/** Task complexity classification. */
export type TaskComplexity = "simple" | "moderate" | "complex" | "reasoning";

/** Ollama connection configuration. */
export type OllamaConnectionConfig = {
  /** Base URL for the Ollama API (default: http://127.0.0.1:11434). */
  baseUrl: string;
  /** API key for authenticated connections. */
  apiKey?: string;
  /** Connection timeout in ms. */
  timeoutMs: number;
};

/** Result of task-based model selection. */
export type ModelSwitchResult = {
  /** The selected model ID. */
  modelId: string;
  /** The classified task complexity. */
  complexity: TaskComplexity;
  /** Reason for this selection. */
  reason: string;
};

/** Discovered Ollama model metadata. */
export type OllamaModelInfo = {
  name: string;
  size: number;
  parameterSize?: string;
  family?: string;
  isReasoning: boolean;
};

const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434";
const DEFAULT_TIMEOUT_MS = 5000;

/** Keywords suggesting complex tasks. */
const COMPLEXITY_KEYWORDS: Record<TaskComplexity, string[]> = {
  reasoning: [
    "prove",
    "theorem",
    "derive",
    "analyze",
    "logic",
    "mathematical",
    "deduce",
    "reason",
    "evaluate",
    "critique",
    "compare",
    "contrast",
    "synthesize",
    "hypothesize",
  ],
  complex: [
    "explain",
    "implement",
    "design",
    "architect",
    "refactor",
    "optimize",
    "debug",
    "troubleshoot",
    "integrate",
    "migrate",
  ],
  moderate: [
    "write",
    "create",
    "generate",
    "describe",
    "summarize",
    "translate",
    "convert",
    "format",
    "list",
    "outline",
  ],
  simple: ["hello", "hi", "thanks", "yes", "no", "ok", "help", "what", "when", "where", "who"],
};

/**
 * Classify the complexity of a task based on the input text.
 */
export function classifyTaskComplexity(input: string): TaskComplexity {
  const lower = input.toLowerCase();
  const wordCount = lower.split(/\s+/).filter((w) => w.length > 0).length;

  // Very short inputs are likely simple
  if (wordCount <= 3) {
    return "simple";
  }

  // Check for complexity keywords (highest to lowest priority)
  const levels: TaskComplexity[] = ["reasoning", "complex", "moderate", "simple"];
  for (const level of levels) {
    const keywords = COMPLEXITY_KEYWORDS[level];
    if (keywords.some((kw) => lower.includes(kw))) {
      return level;
    }
  }

  // Default based on length
  if (wordCount > 50) {
    return "complex";
  }
  if (wordCount > 15) {
    return "moderate";
  }
  return "simple";
}

/**
 * Select the best Ollama model for a given task complexity.
 *
 * Matches available models to task requirements by preferring
 * reasoning models for complex tasks and smaller models for simple ones.
 */
export function selectModelForTask(
  models: OllamaModelInfo[],
  complexity: TaskComplexity,
): ModelSwitchResult {
  if (models.length === 0) {
    return {
      modelId: "llama3.3:latest",
      complexity,
      reason: "No models available, using default fallback",
    };
  }

  // Sort models by size (ascending)
  const sorted = [...models].toSorted((a, b) => a.size - b.size);
  const reasoningModels = sorted.filter((m) => m.isReasoning);

  switch (complexity) {
    case "reasoning": {
      // Prefer reasoning-capable models, largest available
      const model =
        reasoningModels.length > 0
          ? reasoningModels[reasoningModels.length - 1]
          : sorted[sorted.length - 1];
      return {
        modelId: model.name,
        complexity,
        reason: model.isReasoning
          ? "Selected reasoning model for analytical task"
          : "No reasoning model available, using largest model",
      };
    }
    case "complex": {
      // Use the largest available model
      const model = sorted[sorted.length - 1];
      return {
        modelId: model.name,
        complexity,
        reason: "Selected largest model for complex task",
      };
    }
    case "moderate": {
      // Use a mid-sized model
      const midIndex = Math.floor(sorted.length / 2);
      const model = sorted[midIndex];
      return {
        modelId: model.name,
        complexity,
        reason: "Selected mid-sized model for moderate task",
      };
    }
    case "simple": {
      // Use the smallest model for efficiency
      const model = sorted[0];
      return {
        modelId: model.name,
        complexity,
        reason: "Selected smallest model for simple task",
      };
    }
  }
}

/**
 * Create an Ollama connection configuration.
 *
 * Supports local instances and remote/cloud Ollama servers.
 * Resolution order for baseUrl: options.baseUrl → OLLAMA_HOST env var → default (127.0.0.1:11434).
 * Resolution order for apiKey: options.apiKey → OLLAMA_API_KEY env var.
 */
export function createOllamaConnection(
  options?: Partial<OllamaConnectionConfig>,
): OllamaConnectionConfig {
  return {
    baseUrl: options?.baseUrl ?? process.env.OLLAMA_HOST ?? DEFAULT_OLLAMA_URL,
    apiKey: options?.apiKey ?? process.env.OLLAMA_API_KEY,
    timeoutMs: options?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  };
}

/**
 * Check if an Ollama instance is reachable.
 */
export async function checkOllamaConnection(
  config: OllamaConnectionConfig,
): Promise<{ connected: boolean; error?: string }> {
  // Skip in test environments
  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    return { connected: false, error: "Skipped in test environment" };
  }

  try {
    const headers: Record<string, string> = {};
    if (config.apiKey) {
      headers.Authorization = `Bearer ${config.apiKey}`;
    }

    const response = await fetch(`${config.baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(config.timeoutMs),
      headers,
    });

    return { connected: response.ok };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Perform dynamic model selection: classify the task and pick the best model.
 */
export function dynamicModelSelect(input: string, models: OllamaModelInfo[]): ModelSwitchResult {
  const complexity = classifyTaskComplexity(input);
  return selectModelForTask(models, complexity);
}
