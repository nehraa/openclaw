/**
 * Autodidact faculty - capability discovery using public APIs.
 *
 * This faculty helps the agent discover new capabilities by searching for
 * relevant APIs and learning how to integrate them.
 */

import { createPublicApisTool } from "../agents/tools/public-apis-tool.js";
import type { FacultyConfig, FacultyResult } from "./types.js";

export type AutodidactRequest = {
  /** What capability to discover. */
  query: string;
  /** Category to search in. */
  category?: string;
  /** Maximum results to return. */
  limit?: number;
};

export type AutodidactResult = {
  /** Discovered APIs. */
  apis?: Array<{
    name: string;
    description: string;
    category: string;
    url: string;
    auth: string;
    https: boolean;
  }>;
  /** Setup instructions. */
  setupInstructions?: Array<{
    api: string;
    steps: string[];
  }>;
  /** Integration examples. */
  examples?: string[];
};

/**
 * Discover new capabilities by finding and learning about public APIs.
 */
export async function learn(
  request: AutodidactRequest,
  config: FacultyConfig,
): Promise<FacultyResult<AutodidactResult>> {
  try {
    const publicApisTool = createPublicApisTool({ config: config.config });

    // Search for APIs
    const searchResult = await publicApisTool.execute("search", {
      action: request.category ? "by_category" : "search",
      query: request.query,
      category: request.category,
      limit: request.limit ?? 5,
    });

    if (!searchResult.success || searchResult.error) {
      return {
        success: false,
        error: searchResult.error || "Failed to search APIs",
      };
    }

    const apis = (searchResult.data as Record<string, unknown>)?.apis as
      | Array<Record<string, unknown>>
      | undefined;

    if (!apis || apis.length === 0) {
      return {
        success: true,
        data: {
          apis: [],
        },
        metadata: {
          query: request.query,
          resultsFound: 0,
        },
      };
    }

    // Generate setup instructions for found APIs
    const setupInstructions = apis.map((api) => ({
      api: (api.name as string) ?? "",
      steps: generateSetupSteps(api),
    }));

    // Generate integration examples
    const examples = generateIntegrationExamples(apis);

    return {
      success: true,
      data: {
        apis: apis.map((api) => ({
          name: (api.name as string) ?? "",
          description: (api.description as string) ?? "",
          category: (api.category as string) ?? "",
          url: (api.url as string) ?? "",
          auth: (api.auth as string) ?? "",
          https: (api.https as boolean) ?? false,
        })),
        setupInstructions,
        examples,
      },
      metadata: {
        query: request.query,
        resultsFound: apis.length,
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
 * Generate setup steps for an API.
 */
function generateSetupSteps(api: Record<string, unknown>): string[] {
  const apiName = (api.name as string) ?? "API";
  const auth = (api.auth as string) ?? "No";
  const url = (api.url as string) ?? "";

  const steps = [
    `Visit the ${apiName} documentation at ${url}`,
  ];

  if (auth !== "No") {
    steps.push(`Register for an API key (auth type: ${auth})`);
    steps.push("Store API key securely in environment variables");
  }

  steps.push("Install required HTTP client library (e.g., fetch, axios)");
  steps.push(`Make a test request to ${apiName} endpoint`);
  steps.push("Parse and validate the response");
  steps.push("Integrate into your application logic");

  return steps;
}

/**
 * Generate integration examples for discovered APIs.
 */
function generateIntegrationExamples(apis: Array<Record<string, unknown>>): string[] {
  const examples: string[] = [];

  for (const api of apis.slice(0, 2)) {
    const apiName = (api.name as string) ?? "API";
    const auth = (api.auth as string) ?? "No";

    const authHeader = auth !== "No" ? '\n  headers: { "Authorization": "Bearer YOUR_API_KEY" },' : "";

    const example = `// Example: Using ${apiName}
const response = await fetch("${api.url}/endpoint",{${authHeader}
  method: "GET",
});
const data = await response.json();
console.log(data);`;

    examples.push(example);
  }

  return examples;
}

/**
 * Detect if input is about discovering new capabilities or APIs.
 */
export function detectAutodidactIntent(input: string): boolean {
  const learningKeywords = [
    "find api",
    "discover",
    "learn how",
    "integrate",
    "new capability",
    "available apis",
    "what apis",
    "how can i",
    "is there an api",
    "find service",
  ];

  const lowerInput = input.toLowerCase();
  return learningKeywords.some((keyword) => lowerInput.includes(keyword));
}
