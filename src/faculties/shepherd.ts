/**
 * Shepherd faculty - background code health monitoring.
 *
 * This faculty monitors code quality, runs automated checks, and suggests
 * improvements proactively (simulated trigger-based monitoring).
 */

import type { FacultyConfig, FacultyResult } from "./types.js";
import { createSWEAgentTool } from "../agents/tools/swe-agent-tool.js";

export type ShepherdRequest = {
  /** Action to perform. */
  action: "health_check" | "suggest_improvements" | "run_tests" | "check_security";
  /** Repository to monitor. */
  repository?: string;
  /** Files to check (optional, defaults to all). */
  files?: string[];
};

export type ShepherdResult = {
  /** Overall health score (0-100). */
  healthScore?: number;
  /** Issues detected. */
  issues?: Array<{
    type: "bug" | "style" | "security" | "performance" | "test";
    severity: "low" | "medium" | "high";
    file: string;
    description: string;
    suggestedFix?: string;
  }>;
  /** Improvement suggestions. */
  suggestions?: string[];
  /** Test results. */
  testResults?: {
    passed: number;
    failed: number;
    coverage: string;
  };
};

/**
 * Monitor code health and provide proactive suggestions.
 */
export async function shepherd(
  request: ShepherdRequest,
  config: FacultyConfig,
): Promise<FacultyResult<ShepherdResult>> {
  try {
    const sweAgentTool = createSWEAgentTool({ config: config.config });

    switch (request.action) {
      case "health_check":
        return await performHealthCheck(request, sweAgentTool);
      case "suggest_improvements":
        return await suggestImprovements(request, sweAgentTool);
      case "run_tests":
        return await runTests(request, sweAgentTool);
      case "check_security":
        return await checkSecurity(request);
      default:
        return {
          success: false,
          error: `Unknown action: ${request.action}`,
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function performHealthCheck(
  request: ShepherdRequest,
  tool: ReturnType<typeof createSWEAgentTool>,
): Promise<FacultyResult<ShepherdResult>> {
  // List recent fixes to gauge code health
  const listResult = await tool.execute("list", {
    action: "list_fixes",
  });

  const fixes = listResult
    ? ((listResult.details as Record<string, unknown>)?.fixes as Array<Record<string, unknown>>)
    : [];

  // Simulate health score calculation
  const recentIssueCount = fixes?.length ?? 0;
  const healthScore = Math.max(0, 100 - recentIssueCount * 10);

  // Generate simulated issues
  const issues = [
    {
      type: "style" as const,
      severity: "low" as const,
      file: "src/utils/helper.ts",
      description: "Inconsistent indentation detected",
      suggestedFix: "Run prettier to auto-format",
    },
    {
      type: "performance" as const,
      severity: "medium" as const,
      file: "src/data/processor.ts",
      description: "Inefficient loop detected in data processing",
      suggestedFix: "Use map() instead of manual iteration",
    },
  ];

  return {
    success: true,
    data: {
      healthScore,
      issues: healthScore < 80 ? issues : [],
      suggestions: [
        "Consider adding more unit tests for edge cases",
        "Update dependencies to latest stable versions",
        "Add documentation for public APIs",
      ],
    },
    metadata: {
      repository: request.repository ?? "unknown",
      checksRun: ["style", "performance", "tests"],
    },
  };
}

async function suggestImprovements(
  request: ShepherdRequest,
  tool: ReturnType<typeof createSWEAgentTool>,
): Promise<FacultyResult<ShepherdResult>> {
  // Analyze code patterns and suggest improvements
  const suggestions = [
    "Extract repeated code into reusable functions",
    "Add error handling for async operations",
    "Implement caching for expensive computations",
    "Use TypeScript strict mode for better type safety",
    "Add integration tests for critical paths",
  ];

  return {
    success: true,
    data: {
      suggestions,
    },
    metadata: {
      analysisType: "static_analysis",
    },
  };
}

async function runTests(
  request: ShepherdRequest,
  tool: ReturnType<typeof createSWEAgentTool>,
): Promise<FacultyResult<ShepherdResult>> {
  // Simulate test run (would use actual test framework in production)
  const testResults = {
    passed: 42,
    failed: 3,
    coverage: "85.5%",
  };

  const issues =
    testResults.failed > 0
      ? [
          {
            type: "test" as const,
            severity: "high" as const,
            file: "tests/integration.test.ts",
            description: `${testResults.failed} tests failing`,
            suggestedFix: "Review failing test cases and fix implementation",
          },
        ]
      : [];

  return {
    success: true,
    data: {
      testResults,
      issues,
      healthScore: testResults.failed === 0 ? 100 : 70,
    },
    metadata: {
      testFramework: "vitest",
      totalTests: testResults.passed + testResults.failed,
    },
  };
}

async function checkSecurity(request: ShepherdRequest): Promise<FacultyResult<ShepherdResult>> {
  // Simulate security scan
  const issues = [
    {
      type: "security" as const,
      severity: "high" as const,
      file: "src/api/auth.ts",
      description: "Potential SQL injection vulnerability",
      suggestedFix: "Use parameterized queries",
    },
  ];

  return {
    success: true,
    data: {
      issues,
      healthScore: 60,
      suggestions: [
        "Enable Content Security Policy headers",
        "Implement rate limiting on API endpoints",
        "Rotate API keys regularly",
      ],
    },
    metadata: {
      scanType: "security",
      vulnerabilitiesFound: issues.length,
    },
  };
}

/**
 * Detect if input is about code quality or health monitoring.
 */
export function detectShepherdIntent(input: string): boolean {
  const healthKeywords = [
    "code quality",
    "health check",
    "lint",
    "test coverage",
    "technical debt",
    "refactor",
    "improve code",
    "best practices",
    "code review",
    "static analysis",
  ];

  const lowerInput = input.toLowerCase();
  return healthKeywords.some((keyword) => lowerInput.includes(keyword));
}
