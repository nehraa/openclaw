/**
 * Research faculty - deep web research using Haystack.
 *
 * This faculty performs comprehensive research tasks including document analysis,
 * web search, and knowledge aggregation using Haystack's modular pipelines.
 */

import { createHaystackTool } from "../agents/tools/haystack-tool.js";
import type { FacultyConfig, FacultyResult } from "./types.js";

export type ResearchRequest = {
  /** Research query or topic. */
  query: string;
  /** Number of results to retrieve. */
  topK?: number;
  /** Retriever type to use. */
  retrieverType?: "bm25" | "embedding" | "hybrid";
  /** Documents to add to the research pipeline (optional). */
  documents?: Array<{ content: string; meta?: Record<string, unknown> }>;
};

export type ResearchResult = {
  /** Pipeline ID. */
  pipelineId?: string;
  /** Research findings. */
  findings?: Array<{
    content: string;
    score: number;
    source?: string;
  }>;
  /** Summary of research. */
  summary?: string;
  /** Number of documents processed. */
  documentCount?: number;
};

/**
 * Conduct deep research on a topic using modular RAG pipelines.
 */
export async function research(
  request: ResearchRequest,
  config: FacultyConfig,
): Promise<FacultyResult<ResearchResult>> {
  try {
    const haystackTool = createHaystackTool({ config: config.config });

    // Create a pipeline for this research task
    const pipelineResult = await haystackTool.execute("create", {
      action: "create_pipeline",
      pipeline_name: `Research_${Date.now()}`,
      retriever_type: request.retrieverType ?? "hybrid",
    });

    if (!pipelineResult.success || pipelineResult.error) {
      return {
        success: false,
        error: pipelineResult.error || "Failed to create research pipeline",
      };
    }

    const pipelineId = (pipelineResult.data as Record<string, unknown>)?.pipeline_id as string;

    // Add documents if provided
    if (request.documents && request.documents.length > 0) {
      const docsResult = await haystackTool.execute("add_docs", {
        action: "add_documents",
        pipeline_id: pipelineId,
        documents: JSON.stringify(request.documents),
      });

      if (!docsResult.success) {
        return {
          success: false,
          error: "Failed to add documents to pipeline",
        };
      }
    }

    // Perform query
    const queryResult = await haystackTool.execute("query", {
      action: "query",
      pipeline_id: pipelineId,
      query: request.query,
      top_k: request.topK ?? 5,
    });

    if (!queryResult.success || queryResult.error) {
      return {
        success: false,
        error: queryResult.error || "Research query failed",
      };
    }

    const queryData = queryResult.data as Record<string, unknown>;
    const results = (queryData.results as Array<Record<string, unknown>>) ?? [];

    // Generate summary from findings
    const summary = generateResearchSummary(request.query, results);

    return {
      success: true,
      data: {
        pipelineId,
        findings: results.map((r) => ({
          content: (r.content as string) ?? "",
          score: (r.score as number) ?? 0,
          source: ((r.meta as Record<string, unknown> | undefined)?.source as string) ?? "unknown",
        })),
        summary,
        documentCount: results.length,
      },
      metadata: {
        query: request.query,
        retrieverType: request.retrieverType ?? "hybrid",
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
 * Generate a research summary from query results.
 */
function generateResearchSummary(query: string, results: Array<Record<string, unknown>>): string {
  if (results.length === 0) {
    return `No findings for query: "${query}"`;
  }

  const topFindings = results
    .slice(0, 3)
    .map((r, idx) => `${idx + 1}. ${(r.content as string).substring(0, 150)}...`)
    .join("\n");

  return `Research Summary for "${query}":\n\nTop Findings:\n${topFindings}\n\nTotal sources analyzed: ${results.length}`;
}

/**
 * Detect if input requires research or information gathering.
 */
export function detectResearchIntent(input: string): boolean {
  const researchKeywords = [
    "research",
    "investigate",
    "study",
    "analyze",
    "survey",
    "review",
    "literature",
    "find information",
    "learn about",
    "what are the",
    "compare",
    "gather data",
  ];

  const lowerInput = input.toLowerCase();
  return researchKeywords.some((keyword) => lowerInput.includes(keyword));
}
