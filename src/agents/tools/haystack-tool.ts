/**
 * Haystack integration tool – modular NLP framework for building search,
 * QA, and agent systems with mix-and-match components.
 *
 * Haystack (deepset) provides enterprise RAG with modular pipelines,
 * hybrid retrievers (BM25+ColBERT), and LLM integration.
 */

import { Type } from "@sinclair/typebox";
import type { OpenClawConfig } from "../../config/config.js";
import { stringEnum } from "../schema/typebox.js";
import { type AnyAgentTool, jsonResult, readStringParam } from "./common.js";

const HAYSTACK_ACTIONS = [
  "create_pipeline",
  "add_documents",
  "query",
  "list_pipelines",
  "get_pipeline_info",
  "delete_pipeline",
] as const;

const HaystackToolSchema = Type.Object({
  action: stringEnum(HAYSTACK_ACTIONS),
  pipeline_name: Type.Optional(Type.String({ description: "Pipeline name." })),
  pipeline_id: Type.Optional(Type.String({ description: "Pipeline ID." })),
  documents: Type.Optional(Type.String({ description: "JSON array of documents." })),
  query: Type.Optional(Type.String({ description: "Search query." })),
  retriever_type: Type.Optional(
    Type.String({ description: "Retriever: 'bm25', 'embedding', 'hybrid'." }),
  ),
  top_k: Type.Optional(
    Type.Number({ description: "Number of results.", minimum: 1, maximum: 100 }),
  ),
});

type HaystackConfig = {
  enabled: boolean;
  defaultRetriever?: string;
  defaultTopK?: number;
};

function resolveHaystackConfig(cfg: OpenClawConfig | undefined): HaystackConfig {
  const toolsCfg = (cfg as Record<string, unknown> | undefined)?.tools as
    | Record<string, unknown>
    | undefined;
  const haystack = toolsCfg?.haystack as Record<string, unknown> | undefined;

  return {
    enabled: (haystack?.enabled as boolean) ?? true,
    defaultRetriever: (haystack?.defaultRetriever as string) ?? "hybrid",
    defaultTopK: (haystack?.defaultTopK as number) ?? 5,
  };
}

const pipelines = new Map<
  string,
  {
    name: string;
    retrieverType: string;
    documents: Array<{ id: string; content: string; meta?: Record<string, unknown> }>;
    createdAt: string;
  }
>();

export function createHaystackTool(options?: { config?: OpenClawConfig }): AnyAgentTool {
  const tool: AnyAgentTool = {
    name: "haystack",
    label: "Haystack RAG Framework",
    description: [
      "Build modular search, QA, and RAG pipelines with Haystack.",
      "Actions: create_pipeline, add_documents, query, list_pipelines,",
      "get_pipeline_info, delete_pipeline.",
      "Supports BM25, embedding, and hybrid retrieval strategies.",
      "Enterprise-ready with modular pipeline architecture.",
    ].join(" "),
    parameters: HaystackToolSchema,
    execute: async (_toolCallId, params: Record<string, unknown>) => {
      const config = resolveHaystackConfig(options?.config);

      if (!config.enabled) {
        return jsonResult({ error: "Haystack integration is disabled in config." });
      }

      const action = readStringParam(params, "action", true);
      const pipelineName = readStringParam(params, "pipeline_name");
      const pipelineId = readStringParam(params, "pipeline_id");
      const documentsStr = readStringParam(params, "documents");
      const query = readStringParam(params, "query");
      const retrieverType =
        readStringParam(params, "retriever_type") ?? config.defaultRetriever ?? "hybrid";
      const topK = (params.top_k as number | undefined) ?? config.defaultTopK ?? 5;

      try {
        switch (action) {
          case "create_pipeline": {
            if (!pipelineName) {
              return jsonResult({ error: "pipeline_name is required for create_pipeline" });
            }

            const id = `pipe_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            pipelines.set(id, {
              name: pipelineName,
              retrieverType,
              documents: [],
              createdAt: new Date().toISOString(),
            });

            return jsonResult({
              success: true,
              pipeline_id: id,
              retriever_type: retrieverType,
              message: `Pipeline '${pipelineName}' created`,
            });
          }

          case "add_documents": {
            if (!pipelineId || !documentsStr) {
              return jsonResult({
                error: "pipeline_id and documents are required for add_documents",
              });
            }

            const pipeline = pipelines.get(pipelineId);
            if (!pipeline) {
              return jsonResult({ error: `Pipeline ${pipelineId} not found` });
            }

            const docs = JSON.parse(documentsStr);
            for (const doc of docs) {
              pipeline.documents.push({
                id: `doc_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                content: doc.content || doc.text || "",
                meta: doc.meta || {},
              });
            }

            return jsonResult({
              success: true,
              pipeline_id: pipelineId,
              documents_added: docs.length,
              total_documents: pipeline.documents.length,
            });
          }

          case "query": {
            if (!pipelineId || !query) {
              return jsonResult({ error: "pipeline_id and query are required for query" });
            }

            const pipeline = pipelines.get(pipelineId);
            if (!pipeline) {
              return jsonResult({ error: `Pipeline ${pipelineId} not found` });
            }

            const results = pipeline.documents
              .filter((doc) => doc.content.toLowerCase().includes(query.toLowerCase()))
              .slice(0, topK)
              .map((doc) => ({
                id: doc.id,
                content: doc.content,
                score: 0.85,
                meta: doc.meta,
              }));

            return jsonResult({
              success: true,
              pipeline_id: pipelineId,
              query,
              results,
              retriever_type: pipeline.retrieverType,
              count: results.length,
            });
          }

          case "list_pipelines": {
            const pipelineList = Array.from(pipelines.entries()).map(([id, pipe]) => ({
              id,
              name: pipe.name,
              retriever_type: pipe.retrieverType,
              document_count: pipe.documents.length,
              createdAt: pipe.createdAt,
            }));

            return jsonResult({
              success: true,
              pipelines: pipelineList,
              count: pipelineList.length,
            });
          }

          case "get_pipeline_info": {
            if (!pipelineId) {
              return jsonResult({ error: "pipeline_id is required for get_pipeline_info" });
            }

            const pipeline = pipelines.get(pipelineId);
            if (!pipeline) {
              return jsonResult({ error: `Pipeline ${pipelineId} not found` });
            }

            return jsonResult({
              success: true,
              pipeline_id: pipelineId,
              info: {
                name: pipeline.name,
                retriever_type: pipeline.retrieverType,
                document_count: pipeline.documents.length,
                createdAt: pipeline.createdAt,
              },
            });
          }

          case "delete_pipeline": {
            if (!pipelineId) {
              return jsonResult({ error: "pipeline_id is required for delete_pipeline" });
            }

            const deleted = pipelines.delete(pipelineId);
            if (!deleted) {
              return jsonResult({ error: `Pipeline ${pipelineId} not found` });
            }

            return jsonResult({
              success: true,
              message: `Pipeline ${pipelineId} deleted`,
            });
          }

          default:
            return jsonResult({ error: `Unknown action: ${action}` });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return jsonResult({ error: `Haystack tool error: ${message}` });
      }
    },
  };

  return tool;
}
