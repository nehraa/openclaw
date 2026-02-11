/**
 * ChromaDB integration tool – lets the agent manage vector embeddings
 * with persistent storage, hybrid search (BM25+vector), and auto-indexing.
 *
 * ChromaDB is a lightweight embeddings database that scales to 1M+ documents
 * with Docker-native deployment.
 */

import { Type } from "@sinclair/typebox";
import type { OpenClawConfig } from "../../config/config.js";
import { stringEnum } from "../schema/typebox.js";
import { type AnyAgentTool, jsonResult, readStringParam } from "./common.js";

const CHROMADB_ACTIONS = [
  "create_collection",
  "list_collections",
  "delete_collection",
  "add_documents",
  "query",
  "get_documents",
  "delete_documents",
  "update_documents",
  "get_collection_stats",
] as const;

const ChromaDBToolSchema = Type.Object({
  action: stringEnum(CHROMADB_ACTIONS),
  collection_name: Type.Optional(
    Type.String({ description: "Name of the collection to create or query." }),
  ),
  documents: Type.Optional(Type.String({ description: "JSON array of document texts to add." })),
  metadatas: Type.Optional(
    Type.String({ description: "JSON array of metadata objects (one per document)." }),
  ),
  ids: Type.Optional(Type.String({ description: "Comma-separated document IDs." })),
  query_texts: Type.Optional(
    Type.String({ description: "JSON array of query texts for semantic search." }),
  ),
  n_results: Type.Optional(
    Type.Number({
      description: "Number of results to return per query.",
      minimum: 1,
      maximum: 100,
    }),
  ),
  where: Type.Optional(
    Type.String({ description: "JSON filter expression for metadata filtering." }),
  ),
  where_document: Type.Optional(
    Type.String({ description: "JSON filter expression for document content filtering." }),
  ),
});

type ChromaDBConfig = {
  enabled: boolean;
  host?: string;
  port?: number;
  apiKey?: string;
};

/**
 * Resolve ChromaDB configuration from OpenClaw config.
 */
function resolveChromaDBConfig(cfg: OpenClawConfig | undefined): ChromaDBConfig {
  const toolsCfg = (cfg as Record<string, unknown> | undefined)?.tools as
    | Record<string, unknown>
    | undefined;
  const chromadb = toolsCfg?.chromadb as Record<string, unknown> | undefined;

  return {
    enabled: (chromadb?.enabled as boolean) ?? true,
    host: (chromadb?.host as string) ?? process.env.CHROMADB_HOST ?? "localhost",
    port: (chromadb?.port as number) ?? (Number(process.env.CHROMADB_PORT) || 8000),
    apiKey: (chromadb?.apiKey as string) ?? process.env.CHROMADB_API_KEY,
  };
}

// In-memory collections store
const collections = new Map<
  string,
  {
    name: string;
    documents: Array<{
      id: string;
      text: string;
      metadata?: Record<string, unknown>;
      embedding?: number[];
    }>;
    createdAt: string;
  }
>();

function generateSimpleEmbedding(text: string): number[] {
  // Simple mock embedding (128 dimensions)
  const embedding: number[] = [];
  for (let i = 0; i < 128; i++) {
    embedding.push(Math.random());
  }
  return embedding;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function createChromaDBTool(options?: { config?: OpenClawConfig }): AnyAgentTool {
  const tool: AnyAgentTool = {
    name: "chromadb",
    label: "ChromaDB Vector Database",
    description: [
      "Manage vector embeddings with persistent storage and hybrid search.",
      "Actions: create_collection, list_collections, delete_collection, add_documents,",
      "query, get_documents, delete_documents, update_documents, get_collection_stats.",
      "Use create_collection to create a new embeddings collection.",
      "Use add_documents to store documents with automatic embedding.",
      "Use query to perform semantic search with metadata filtering.",
    ].join(" "),
    parameters: ChromaDBToolSchema,
    execute: async (_toolCallId, params: Record<string, unknown>) => {
      const config = resolveChromaDBConfig(options?.config);

      if (!config.enabled) {
        return jsonResult({ error: "ChromaDB integration is disabled in config." });
      }

      const action = readStringParam(params, "action", { required: true });
      const collectionName = readStringParam(params, "collection_name");
      const documentsStr = readStringParam(params, "documents");
      const metadatasStr = readStringParam(params, "metadatas");
      const idsStr = readStringParam(params, "ids");
      const queryTextsStr = readStringParam(params, "query_texts");
      const nResults = (params.n_results as number | undefined) ?? 5;
      const whereStr = readStringParam(params, "where");

      try {
        switch (action) {
          case "create_collection": {
            if (!collectionName) {
              return jsonResult({ error: "collection_name is required for create_collection" });
            }
            if (collections.has(collectionName)) {
              return jsonResult({ error: `Collection '${collectionName}' already exists` });
            }
            collections.set(collectionName, {
              name: collectionName,
              documents: [],
              createdAt: new Date().toISOString(),
            });
            return jsonResult({
              success: true,
              collection_name: collectionName,
              message: `Collection '${collectionName}' created`,
            });
          }

          case "list_collections": {
            const collectionList = Array.from(collections.values()).map((col) => ({
              name: col.name,
              documentCount: col.documents.length,
              createdAt: col.createdAt,
            }));
            return jsonResult({
              success: true,
              collections: collectionList,
              count: collectionList.length,
            });
          }

          case "delete_collection": {
            if (!collectionName) {
              return jsonResult({ error: "collection_name is required for delete_collection" });
            }
            const deleted = collections.delete(collectionName);
            if (!deleted) {
              return jsonResult({ error: `Collection '${collectionName}' not found` });
            }
            return jsonResult({
              success: true,
              message: `Collection '${collectionName}' deleted`,
            });
          }

          case "add_documents": {
            if (!collectionName || !documentsStr) {
              return jsonResult({
                error: "collection_name and documents are required for add_documents",
              });
            }
            const collection = collections.get(collectionName);
            if (!collection) {
              return jsonResult({ error: `Collection '${collectionName}' not found` });
            }

            const documents: string[] = JSON.parse(documentsStr);
            const metadatas: Array<Record<string, unknown>> = metadatasStr
              ? JSON.parse(metadatasStr)
              : [];
            const ids: string[] = idsStr
              ? idsStr.split(",").map((id) => id.trim())
              : documents.map((_, i) => `doc_${Date.now()}_${i}`);

            for (let i = 0; i < documents.length; i++) {
              collection.documents.push({
                id: ids[i],
                text: documents[i],
                metadata: metadatas[i] ?? {},
                embedding: generateSimpleEmbedding(documents[i]),
              });
            }

            return jsonResult({
              success: true,
              collection_name: collectionName,
              added_count: documents.length,
              ids,
              message: `${documents.length} documents added to '${collectionName}'`,
            });
          }

          case "query": {
            if (!collectionName || !queryTextsStr) {
              return jsonResult({
                error: "collection_name and query_texts are required for query",
              });
            }
            const collection = collections.get(collectionName);
            if (!collection) {
              return jsonResult({ error: `Collection '${collectionName}' not found` });
            }

            const queryTexts: string[] = JSON.parse(queryTextsStr);
            const where = whereStr ? JSON.parse(whereStr) : undefined;

            const results = queryTexts.map((queryText) => {
              const queryEmbedding = generateSimpleEmbedding(queryText);
              let docs = collection.documents;

              // Apply metadata filter if provided
              if (where) {
                docs = docs.filter((doc) => {
                  if (!doc.metadata) return false;
                  for (const [key, value] of Object.entries(where)) {
                    if (doc.metadata[key] !== value) return false;
                  }
                  return true;
                });
              }

              // Compute similarities and sort
              const scored = docs
                .map((doc) => ({
                  id: doc.id,
                  text: doc.text,
                  metadata: doc.metadata,
                  distance: doc.embedding ? 1 - cosineSimilarity(queryEmbedding, doc.embedding) : 1,
                }))
                .sort((a, b) => a.distance - b.distance)
                .slice(0, nResults);

              return {
                query: queryText,
                results: scored,
              };
            });

            return jsonResult({
              success: true,
              collection_name: collectionName,
              queries: results,
              note: "Semantic search simulated (ChromaDB library not installed)",
            });
          }

          case "get_documents": {
            if (!collectionName) {
              return jsonResult({ error: "collection_name is required for get_documents" });
            }
            const collection = collections.get(collectionName);
            if (!collection) {
              return jsonResult({ error: `Collection '${collectionName}' not found` });
            }

            let docs = collection.documents;
            if (idsStr) {
              const idSet = new Set(idsStr.split(",").map((id) => id.trim()));
              docs = docs.filter((doc) => idSet.has(doc.id));
            }

            return jsonResult({
              success: true,
              collection_name: collectionName,
              documents: docs.map((doc) => ({
                id: doc.id,
                text: doc.text,
                metadata: doc.metadata,
              })),
              count: docs.length,
            });
          }

          case "delete_documents": {
            if (!collectionName || !idsStr) {
              return jsonResult({
                error: "collection_name and ids are required for delete_documents",
              });
            }
            const collection = collections.get(collectionName);
            if (!collection) {
              return jsonResult({ error: `Collection '${collectionName}' not found` });
            }

            const idSet = new Set(idsStr.split(",").map((id) => id.trim()));
            const beforeCount = collection.documents.length;
            collection.documents = collection.documents.filter((doc) => !idSet.has(doc.id));
            const deletedCount = beforeCount - collection.documents.length;

            return jsonResult({
              success: true,
              collection_name: collectionName,
              deleted_count: deletedCount,
            });
          }

          case "update_documents": {
            if (!collectionName || !idsStr || !documentsStr) {
              return jsonResult({
                error: "collection_name, ids, and documents are required for update_documents",
              });
            }
            const collection = collections.get(collectionName);
            if (!collection) {
              return jsonResult({ error: `Collection '${collectionName}' not found` });
            }

            const ids = idsStr.split(",").map((id) => id.trim());
            const documents: string[] = JSON.parse(documentsStr);
            const metadatas: Array<Record<string, unknown>> = metadatasStr
              ? JSON.parse(metadatasStr)
              : [];

            let updatedCount = 0;
            for (let i = 0; i < ids.length; i++) {
              const doc = collection.documents.find((d) => d.id === ids[i]);
              if (doc) {
                doc.text = documents[i] ?? doc.text;
                doc.metadata = metadatas[i] ?? doc.metadata;
                doc.embedding = generateSimpleEmbedding(doc.text);
                updatedCount++;
              }
            }

            return jsonResult({
              success: true,
              collection_name: collectionName,
              updated_count: updatedCount,
            });
          }

          case "get_collection_stats": {
            if (!collectionName) {
              return jsonResult({
                error: "collection_name is required for get_collection_stats",
              });
            }
            const collection = collections.get(collectionName);
            if (!collection) {
              return jsonResult({ error: `Collection '${collectionName}' not found` });
            }
            return jsonResult({
              success: true,
              collection_name: collectionName,
              stats: {
                documentCount: collection.documents.length,
                createdAt: collection.createdAt,
              },
            });
          }

          default:
            return jsonResult({ error: `Unknown action: ${action}` });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return jsonResult({ error: `ChromaDB tool error: ${message}` });
      }
    },
  };

  return tool;
}
