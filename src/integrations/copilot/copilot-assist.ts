/**
 * GitHub Copilot integration utilities.
 *
 * Provides helpers for using Copilot as a code assistance backend,
 * including code completion suggestions, code review prompts,
 * and integration with the existing Copilot token management.
 */

import { DEFAULT_COPILOT_API_BASE_URL, resolveCopilotApiToken } from "../../providers/github-copilot-token.js";

/** Configuration for Copilot code assistance. */
export type CopilotAssistConfig = {
  /** Whether Copilot integration is enabled. */
  enabled: boolean;
  /** Agent directory for token resolution. */
  agentDir?: string;
  /** Maximum tokens for completion requests. */
  maxTokens: number;
};

/** A code suggestion from Copilot. */
export type CodeSuggestion = {
  /** The suggested code text. */
  text: string;
  /** Programming language, if detected. */
  language?: string;
  /** Confidence level of the suggestion. */
  confidence: "low" | "medium" | "high";
};

/** Status of the Copilot connection. */
export type CopilotStatus = {
  /** Whether a valid token is available. */
  authenticated: boolean;
  /** The API base URL in use. */
  baseUrl: string;
  /** Error message if authentication failed. */
  error?: string;
};

/**
 * Check the status of the Copilot integration.
 *
 * Resolves the API token and verifies connectivity.
 */
export async function checkCopilotStatus(agentDir?: string): Promise<CopilotStatus> {
  try {
    const token = await resolveCopilotApiToken(agentDir);
    if (!token) {
      return {
        authenticated: false,
        baseUrl: DEFAULT_COPILOT_API_BASE_URL,
        error: "No Copilot token available. Run 'openclaw config auth github-copilot' to authenticate.",
      };
    }

    return {
      authenticated: true,
      baseUrl: token.baseUrl ?? DEFAULT_COPILOT_API_BASE_URL,
    };
  } catch (error) {
    return {
      authenticated: false,
      baseUrl: DEFAULT_COPILOT_API_BASE_URL,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Build a code review prompt for Copilot.
 *
 * Formats code with context for review by a Copilot-backed model.
 */
export function buildCodeReviewPrompt(
  code: string,
  options?: {
    language?: string;
    context?: string;
    focus?: "bugs" | "performance" | "security" | "style" | "all";
  },
): string {
  const language = options?.language ?? "typescript";
  const focus = options?.focus ?? "all";

  const focusInstructions: Record<string, string> = {
    bugs: "Focus on finding bugs, logical errors, and edge cases.",
    performance: "Focus on performance issues, unnecessary allocations, and optimization opportunities.",
    security: "Focus on security vulnerabilities, injection risks, and unsafe operations.",
    style: "Focus on code style, readability, naming conventions, and best practices.",
    all: "Review for bugs, performance, security, and code style.",
  };

  let prompt = `Review the following ${language} code:\n\n`;
  if (options?.context) {
    prompt += `Context: ${options.context}\n\n`;
  }
  prompt += `\`\`\`${language}\n${code}\n\`\`\`\n\n`;
  prompt += focusInstructions[focus];
  prompt += "\n\nProvide specific, actionable feedback with line references where applicable.";

  return prompt;
}

/**
 * Build a code completion prompt for Copilot.
 *
 * Formats a partial code snippet for completion by a Copilot-backed model.
 */
export function buildCodeCompletionPrompt(
  codePrefix: string,
  options?: {
    language?: string;
    suffix?: string;
    instruction?: string;
  },
): string {
  const language = options?.language ?? "typescript";

  let prompt = "";
  if (options?.instruction) {
    prompt += `Instruction: ${options.instruction}\n\n`;
  }
  prompt += `Complete the following ${language} code:\n\n`;
  prompt += `\`\`\`${language}\n${codePrefix}`;
  if (options?.suffix) {
    prompt += `\n// ... your completion here ...\n${options.suffix}`;
  }
  prompt += `\n\`\`\``;

  return prompt;
}

/**
 * Parse code suggestions from a model response.
 *
 * Extracts code blocks from markdown-formatted responses.
 */
export function parseCodeSuggestions(response: string): CodeSuggestion[] {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const suggestions: CodeSuggestion[] = [];

  let match: RegExpExecArray | null = codeBlockRegex.exec(response);
  while (match !== null) {
    const language = match[1] || undefined;
    const text = match[2].trim();
    if (text.length > 0) {
      suggestions.push({
        text,
        language,
        confidence: text.length > 100 ? "high" : text.length > 20 ? "medium" : "low",
      });
    }
    match = codeBlockRegex.exec(response);
  }

  // If no code blocks found, treat the whole response as a suggestion
  if (suggestions.length === 0 && response.trim().length > 0) {
    suggestions.push({
      text: response.trim(),
      confidence: "low",
    });
  }

  return suggestions;
}
