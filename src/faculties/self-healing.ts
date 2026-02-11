/**
 * Self-healing faculty - automatically fixes runtime errors using SWE-agent.
 *
 * This faculty monitors for errors in user input and can automatically
 * generate fixes, run tests, and create pull requests.
 */

import type { FacultyConfig, FacultyResult } from "./types.js";
import { createSWEAgentTool } from "../agents/tools/swe-agent-tool.js";

export type SelfHealingRequest = {
  /** Error message or stack trace to fix. */
  error: string;
  /** Repository URL or name. */
  repository?: string;
  /** Issue URL if available. */
  issueUrl?: string;
  /** Automatically create PR after fixing. */
  autoCreatePR?: boolean;
};

export type SelfHealingResult = {
  /** Fix ID for tracking. */
  fixId?: string;
  /** Generated patch content. */
  patch?: string;
  /** Files that were modified. */
  filesModified?: string[];
  /** Whether tests passed after the fix. */
  testsPass?: boolean;
  /** PR URL if created. */
  prUrl?: string;
  /** Analysis of the issue. */
  analysis?: {
    rootCause: string;
    complexity: string;
    confidence: number;
  };
};

/**
 * Analyze an error and attempt to fix it using SWE-agent.
 */
export async function healError(
  request: SelfHealingRequest,
  config: FacultyConfig,
): Promise<FacultyResult<SelfHealingResult>> {
  try {
    const tool = createSWEAgentTool({ config: config.config });

    // First analyze the issue
    const analysisResult = await tool.execute("analysis", {
      action: "analyze_issue",
      issue_url: request.issueUrl,
      repository: request.repository,
    });

    if (!analysisResult) {
      return {
        success: false,
        error: "Failed to analyze issue",
      };
    }

    const analysis = (analysisResult.details as Record<string, unknown>)?.analysis as
      | Record<string, unknown>
      | undefined;

    // Then attempt to fix the issue
    const fixResult = await tool.execute("fix", {
      action: "fix_issue",
      issue_url: request.issueUrl,
      repository: request.repository,
      auto_create_pr: request.autoCreatePR ?? false,
    });

    if (!fixResult) {
      return {
        success: false,
        error: "Failed to fix issue",
        data: {
          analysis: analysis
            ? {
                rootCause: (analysis.root_cause as string) ?? "Unknown",
                complexity: (analysis.complexity as string) ?? "Unknown",
                confidence: (analysis.confidence as number) ?? 0,
              }
            : undefined,
        },
      };
    }

    const fixData = fixResult.details as Record<string, unknown>;

    // Run tests on the fix
    const testResult = await tool.execute("test", {
      action: "run_tests",
      fix_id: fixData.fix_id as string,
    });

    const testsPass =
      testResult && (testResult.details as Record<string, unknown>)?.tests_pass === true;

    // Optionally create PR
    let prUrl: string | undefined;
    if (request.autoCreatePR && testsPass) {
      const prResult = await tool.execute("pr", {
        action: "create_pr",
        fix_id: fixData.fix_id as string,
      });
      if (prResult) {
        prUrl = (prResult.details as Record<string, unknown>)?.pr_url as string | undefined;
      }
    }

    return {
      success: true,
      data: {
        fixId: fixData.fix_id as string | undefined,
        patch: fixData.patch as string | undefined,
        filesModified: fixData.files_modified as string[] | undefined,
        testsPass,
        prUrl,
        analysis: analysis
          ? {
              rootCause: (analysis.root_cause as string) ?? "Unknown",
              complexity: (analysis.complexity as string) ?? "Unknown",
              confidence: (analysis.confidence as number) ?? 0,
            }
          : undefined,
      },
      metadata: {
        analysisDuration: "simulated",
        fixDuration: "simulated",
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check if an input appears to be an error that needs healing.
 */
export function detectErrorIntent(input: string): boolean {
  const errorKeywords = [
    "error",
    "exception",
    "crash",
    "bug",
    "fix",
    "broken",
    "failing",
    "stack trace",
    "traceback",
    "undefined",
    "null pointer",
    "segfault",
  ];

  const lowerInput = input.toLowerCase();
  return errorKeywords.some((keyword) => lowerInput.includes(keyword));
}
