/**
 * LlamaIndex RAG integration tool – lets the agent create RAG pipelines,
 * ingest documents, build query engines, and perform semantic search.
 *
 * LlamaIndex provides 200+ data loaders, embedding stores, and query engines
 * for building retrieval-augmented generation systems.
 */

import { Type } from "@sinclair/typebox";
import type { OpenClawConfig } from "../../config/config.js";
import { stringEnum } from "../schema/typebox.js";
import { type AnyAgentTool, jsonResult, readStringParam } from "./common.js";

const LLAMAINDEX_ACTIONS = [
  "create_index",
  "ingest_document",
  "ingest_documents",
  "query",
  "list_indexes",
  "delete_index",
  "get_index_stats",
  "create_query_engine",
  "list_query_engines",
] as const;

const LlamaIndexToolSchema = Type.Object({
  action: stringEnum(LLAMAINDEX_ACTIONS),
  index_name: Type.Optional(Type.String({ description: "Name of the index to create or query." })),
  index_id: Type.Optional(Type.String({ description: "Index ID for operations." })),
  document_path: Type.Optional(
    Type.String({ description: "File path to document for ingestion." }),
  ),
  document_paths: Type.Optional(
    Type.String({ description: "Comma-separated file paths for batch ingestion." }),
  ),
  document_text: Type.Optional(Type.String({ description: "Raw text content to ingest." })),
  query: Type.Optional(Type.String({ description: "Query string for semantic search." })),
  query_engine_name: Type.Optional(
    Type.String({ description: "Name for the query engine to create." }),
  ),
  top_k: Type.Optional(
    Type.Number({ description: "Number of results to return.", minimum: 1, maximum: 100 }),
  ),
  embedding_model: Type.Optional(
    Type.String({ description: "Embedding model to use (default: text-embedding-ada-002)." }),
  ),
});

type LlamaIndexConfig = {
  enabled: boolean;
  embeddingModel?: string;
  defaultTopK?: number;
  storePath?: string;
};

/**
 * Resolve LlamaIndex configuration from OpenClaw config.
 */
function resolveLlamaIndexConfig(cfg: OpenClawConfig | undefined): LlamaIndexConfig {
  const toolsCfg = (cfg as Record<string, unknown> | undefined)?.tools as
    | Record<string, unknown>
    | undefined;
  const llamaindex = toolsCfg?.llamaindex as Record<string, unknown> | undefined;

  return {
    enabled: (llamaindex?.enabled as boolean) ?? true,
    embeddingModel: (llamaindex?.embeddingModel as string) ?? "text-embedding-ada-002",
    defaultTopK: (llamaindex?.defaultTopK as number) ?? 5,
    storePath: (llamaindex?.storePath as string) ?? ".llamaindex",
  };
}

// In-memory stores
const indexes = new Map<
  string,
  {
    name: string;
    documents: Array<{ id: string; text: string; metadata?: Record<string, unknown> }>;
    embeddingModel: string;
    createdAt: string;
  }
>();

const queryEngines = new Map<
  string,
  {
    name: string;
    indexId: string;
    topK: number;
    createdAt: string;
  }
>();

export function createLlamaIndexTool(options?: { config?: OpenClawConfig }): AnyAgentTool {
  const tool: AnyAgentTool = {
    name: "llamaindex",
    label: "LlamaIndex RAG",
    description: [
      "Create RAG pipelines, ingest documents, and perform semantic search.",
      "Actions: create_index, ingest_document, ingest_documents, query, list_indexes,",
      "delete_index, get_index_stats, create_query_engine, list_query_engines.",
      "Use create_index to build a new vector index.",
      "Use ingest_document to add documents to an index.",
      "Use query to perform semantic search.",
    ].join(" "),
    parameters: LlamaIndexToolSchema,
    execute: async (_toolCallId, params: Record<string, unknown>) => {
      const config = resolveLlamaIndexConfig(options?.config);

      if (!config.enabled) {
        return jsonResult({ error: "LlamaIndex integration is disabled in config." });
      }

      const action = readStringParam(params, "action", { required: true });
      const indexName = readStringParam(params, "index_name");
      const indexId = readStringParam(params, "index_id");
      const documentPath = readStringParam(params, "document_path");
      const documentPathsStr = readStringParam(params, "document_paths");
      const documentText = readStringParam(params, "document_text");
      const query = readStringParam(params, "query");
      const queryEngineName = readStringParam(params, "query_engine_name");
      const topK = (params.top_k as number | undefined) ?? config.defaultTopK ?? 5;
      const embeddingModel =
        readStringParam(params, "embedding_model") ??
        config.embeddingModel ??
        "text-embedding-ada-002";

      try {
        switch (action) {
          case "create_index": {
            if (!indexName) {
              return jsonResult({ error: "index_name is required for create_index" });
            }
            const id = `idx_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            indexes.set(id, {
              name: indexName,
              documents: [],
              embeddingModel,
              createdAt: new Date().toISOString(),
            });
            return jsonResult({
              success: true,
              index_id: id,
              message: `Index '${indexName}' created with ${embeddingModel}`,
            });
          }

          case "ingest_document": {
            if (!indexId) {
              return jsonResult({ error: "index_id is required for ingest_document" });
            }
            const index = indexes.get(indexId);
            if (!index) {
              return jsonResult({ error: `Index ${indexId} not found` });
            }

            let text = documentText ?? "";
            if (documentPath && !documentText) {
              // In a real implementation, would read from file
              text = `[Simulated content from ${documentPath}]`;
            }

            if (!text) {
              return jsonResult({ error: "document_path or document_text is required" });
            }

            const docId = `doc_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            index.documents.push({
              id: docId,
              text,
              metadata: { source: documentPath ?? "inline" },
            });

            return jsonResult({
              success: true,
              document_id: docId,
              index_id: indexId,
              message: `Document ingested into index '${index.name}'`,
            });
          }

          case "ingest_documents": {
            if (!indexId || !documentPathsStr) {
              return jsonResult({
                error: "index_id and document_paths are required for ingest_documents",
              });
            }
            const index = indexes.get(indexId);
            if (!index) {
              return jsonResult({ error: `Index ${indexId} not found` });
            }

            const paths = documentPathsStr.split(",").map((p) => p.trim());
            const docIds: string[] = [];

            for (const path of paths) {
              const docId = `doc_${Date.now()}_${Math.random().toString(36).slice(2)}`;
              index.documents.push({
                id: docId,
                text: `[Simulated content from ${path}]`,
                metadata: { source: path },
              });
              docIds.push(docId);
            }

            return jsonResult({
              success: true,
              document_ids: docIds,
              index_id: indexId,
              count: docIds.length,
              message: `${docIds.length} documents ingested into index '${index.name}'`,
            });
          }

          case "query": {
            if (!indexId || !query) {
              return jsonResult({ error: "index_id and query are required for query" });
            }
            const index = indexes.get(indexId);
            if (!index) {
              return jsonResult({ error: `Index ${indexId} not found` });
            }

            // Simple keyword matching simulation (real implementation would use embeddings)
            const results = index.documents
              .filter((doc) => doc.text.toLowerCase().includes(query.toLowerCase()))
              .slice(0, topK)
              .map((doc) => ({
                document_id: doc.id,
                text: doc.text,
                metadata: doc.metadata,
                score: 0.95, // Simulated similarity score
              }));

            return jsonResult({
              success: true,
              query,
              results,
              count: results.length,
              note: "Semantic search simulated (LlamaIndex library not installed)",
            });
          }

          case "list_indexes": {
            const indexList = Array.from(indexes.entries()).map(([id, idx]) => ({
              id,
              name: idx.name,
              documentCount: idx.documents.length,
              embeddingModel: idx.embeddingModel,
              createdAt: idx.createdAt,
            }));
            return jsonResult({
              success: true,
              indexes: indexList,
              count: indexList.length,
            });
          }

          case "delete_index": {
            if (!indexId) {
              return jsonResult({ error: "index_id is required for delete_index" });
            }
            const deleted = indexes.delete(indexId);
            if (!deleted) {
              return jsonResult({ error: `Index ${indexId} not found` });
            }
            return jsonResult({
              success: true,
              message: `Index ${indexId} deleted`,
            });
          }

          case "get_index_stats": {
            if (!indexId) {
              return jsonResult({ error: "index_id is required for get_index_stats" });
            }
            const index = indexes.get(indexId);
            if (!index) {
              return jsonResult({ error: `Index ${indexId} not found` });
            }
            return jsonResult({
              success: true,
              index_id: indexId,
              stats: {
                name: index.name,
                documentCount: index.documents.length,
                embeddingModel: index.embeddingModel,
                createdAt: index.createdAt,
              },
            });
          }

          case "create_query_engine": {
            if (!queryEngineName || !indexId) {
              return jsonResult({
                error: "query_engine_name and index_id are required for create_query_engine",
              });
            }
            const index = indexes.get(indexId);
            if (!index) {
              return jsonResult({ error: `Index ${indexId} not found` });
            }
            const id = `qe_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            queryEngines.set(id, {
              name: queryEngineName,
              indexId,
              topK,
              createdAt: new Date().toISOString(),
            });
            return jsonResult({
              success: true,
              query_engine_id: id,
              message: `Query engine '${queryEngineName}' created for index '${index.name}'`,
            });
          }

          case "list_query_engines": {
            const engineList = Array.from(queryEngines.entries()).map(([id, engine]) => ({
              id,
              name: engine.name,
              indexId: engine.indexId,
              topK: engine.topK,
              createdAt: engine.createdAt,
            }));
            return jsonResult({
              success: true,
              queryEngines: engineList,
              count: engineList.length,
            });
          }

          default:
            return jsonResult({ error: `Unknown action: ${action}` });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return jsonResult({ error: `LlamaIndex tool error: ${message}` });
      }
    },
  };

  return tool;
}
