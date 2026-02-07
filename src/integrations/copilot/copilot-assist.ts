/**
 * GitHub Copilot integration utilities.
 *
 * Provides helpers for using Copilot as a code assistance backend,
 * including code completion, code generation, code review, refactoring prompts,
 * and integration with the existing Copilot token management.
 */

import {
  DEFAULT_COPILOT_API_BASE_URL,
  resolveCopilotApiToken,
} from "../../providers/github-copilot-token.js";
import { ensureAuthProfileStore } from "../../agents/auth-profiles/store.js";
import { listProfilesForProvider } from "../../agents/auth-profiles/profiles.js";

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
 * Resolve a GitHub token from auth profile store for the github-copilot provider.
 */
function resolveGitHubTokenFromProfiles(agentDir?: string): string | undefined {
  try {
    const store = ensureAuthProfileStore(agentDir);
    const ids = listProfilesForProvider(store, "github-copilot");
    for (const id of ids) {
      const cred = store.profiles[id];
      if (!cred) {
        continue;
      }
      if (cred.type === "token") {
        return cred.token;
      }
      if (cred.type === "api_key") {
        return cred.key;
      }
    }
  } catch {
    // Profile store may not be available in all environments
  }
  return undefined;
}

/**
 * Check the status of the Copilot integration.
 *
 * Resolves a GitHub token from auth profiles, then exchanges it for a
 * Copilot API token to verify connectivity.
 */
export async function checkCopilotStatus(agentDir?: string): Promise<CopilotStatus> {
  try {
    const githubToken = resolveGitHubTokenFromProfiles(agentDir);
    if (!githubToken) {
      return {
        authenticated: false,
        baseUrl: DEFAULT_COPILOT_API_BASE_URL,
        error:
          "No GitHub token found. Run 'openclaw config auth github-copilot' to authenticate.",
      };
    }

    const result = await resolveCopilotApiToken({ githubToken });
    return {
      authenticated: true,
      baseUrl: result.baseUrl ?? DEFAULT_COPILOT_API_BASE_URL,
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
    performance:
      "Focus on performance issues, unnecessary allocations, and optimization opportunities.",
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
 * Build a full code generation prompt for Copilot.
 *
 * Creates a structured prompt that generates complete, production-ready
 * code from a description — similar to how coding agents write code.
 */
export function buildCodeGenerationPrompt(
  description: string,
  options?: {
    language?: string;
    framework?: string;
    fileName?: string;
    existingCode?: string;
    requirements?: string[];
    style?: "concise" | "detailed" | "production";
  },
): string {
  const language = options?.language ?? "typescript";
  const style = options?.style ?? "production";

  const styleInstructions: Record<string, string> = {
    concise: "Write minimal, clean code without comments or excessive abstractions.",
    detailed: "Include JSDoc comments, type annotations, and clear variable names.",
    production:
      "Write production-ready code with proper error handling, type safety, JSDoc comments, and comprehensive edge-case coverage.",
  };

  let prompt = `Generate ${language} code for the following:\n\n`;
  prompt += `**Description:** ${description}\n\n`;

  if (options?.framework) {
    prompt += `**Framework:** ${options.framework}\n`;
  }
  if (options?.fileName) {
    prompt += `**File:** ${options.fileName}\n`;
  }
  if (options?.requirements && options.requirements.length > 0) {
    prompt += `**Requirements:**\n${options.requirements.map((r) => `- ${r}`).join("\n")}\n\n`;
  }
  if (options?.existingCode) {
    prompt += `**Existing code context:**\n\`\`\`${language}\n${options.existingCode}\n\`\`\`\n\n`;
  }

  prompt += `**Style:** ${styleInstructions[style]}\n\n`;
  prompt += `Produce a complete, self-contained ${language} implementation. `;
  prompt += "Include all necessary imports, types, and exports. ";
  prompt += "Output only the code in a single fenced code block.";

  return prompt;
}

/**
 * Build a refactoring prompt for Copilot.
 *
 * Generates structured prompts that refactor existing code with specific goals.
 */
export function buildRefactoringPrompt(
  code: string,
  goal: "simplify" | "modularize" | "optimize" | "type-safety" | "test-friendly",
  options?: {
    language?: string;
    context?: string;
  },
): string {
  const language = options?.language ?? "typescript";

  const goalInstructions: Record<string, string> = {
    simplify:
      "Simplify this code: reduce complexity, remove redundancy, and improve readability while preserving behavior.",
    modularize:
      "Break this code into smaller, well-named functions/modules. Each function should have a single responsibility.",
    optimize:
      "Optimize this code for performance: reduce allocations, avoid unnecessary work, and use efficient data structures.",
    "type-safety":
      "Improve type safety: add proper TypeScript types, remove `any`, add type guards, and use discriminated unions where appropriate.",
    "test-friendly":
      "Refactor this code to be more testable: extract dependencies, use dependency injection, and separate pure logic from side effects.",
  };

  let prompt = `Refactor the following ${language} code.\n\n`;
  prompt += `**Goal:** ${goalInstructions[goal]}\n\n`;
  if (options?.context) {
    prompt += `**Context:** ${options.context}\n\n`;
  }
  prompt += `\`\`\`${language}\n${code}\n\`\`\`\n\n`;
  prompt += "Output the refactored code in a single fenced code block. ";
  prompt += "Explain key changes briefly after the code block.";

  return prompt;
}

/**
 * Build a test generation prompt for Copilot.
 *
 * Creates structured prompts for generating comprehensive test suites.
 */
export function buildTestGenerationPrompt(
  code: string,
  options?: {
    language?: string;
    framework?: string;
    coverage?: "basic" | "thorough" | "exhaustive";
    existingTests?: string;
  },
): string {
  const language = options?.language ?? "typescript";
  const framework = options?.framework ?? "vitest";
  const coverage = options?.coverage ?? "thorough";

  const coverageInstructions: Record<string, string> = {
    basic: "Write basic happy-path tests for core functionality.",
    thorough:
      "Write thorough tests covering happy paths, edge cases, error conditions, and boundary values.",
    exhaustive:
      "Write exhaustive tests covering all code paths, including negative tests, concurrent scenarios, type edge cases, and property-based test ideas.",
  };

  let prompt = `Generate ${framework} tests for the following ${language} code:\n\n`;
  prompt += `\`\`\`${language}\n${code}\n\`\`\`\n\n`;
  prompt += `**Coverage level:** ${coverageInstructions[coverage]}\n\n`;

  if (options?.existingTests) {
    prompt += `**Existing tests (avoid duplicating):**\n\`\`\`${language}\n${options.existingTests}\n\`\`\`\n\n`;
  }

  prompt += `Use ${framework} conventions (describe/it/expect). `;
  prompt += "Include proper setup/teardown where needed. ";
  prompt += "Output the test file in a single fenced code block.";

  return prompt;
}

/**
 * Parse code suggestions from a model response.
 *
 * Extracts code blocks from markdown-formatted responses.
 * Supports language IDs with non-word characters (e.g., c++, objective-c).
 */
export function parseCodeSuggestions(response: string): CodeSuggestion[] {
  // Support non-\w language IDs like c++, objective-c, etc.
  const codeBlockRegex = /```([^\n]*)\n([\s\S]*?)```/g;
  const suggestions: CodeSuggestion[] = [];

  for (const match of response.matchAll(codeBlockRegex)) {
    const rawLang = match[1]?.trim();
    const language = rawLang && rawLang.length > 0 ? rawLang : undefined;
    const text = match[2].trim();
    if (text.length > 0) {
      suggestions.push({
        text,
        language,
        confidence: text.length > 100 ? "high" : text.length > 20 ? "medium" : "low",
      });
    }
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

/**
 * Extract the first code block from a response, or the full text if no blocks found.
 * Useful for getting a single generated code result.
 */
export function extractPrimaryCode(response: string): { code: string; language?: string } | undefined {
  const suggestions = parseCodeSuggestions(response);
  if (suggestions.length === 0) {
    return undefined;
  }
  // Return the longest code block (most likely the main implementation)
  const primary = suggestions.sort((a, b) => b.text.length - a.text.length)[0];
  return { code: primary.text, language: primary.language };
}
