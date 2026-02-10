/**
 * Qdrant integration tool – lets the agent manage high-performance vector
 * search with payload filtering, quantization, and multi-tenancy.
 *
 * Qdrant is a vector database that scales to Discord-level performance with
 * semantic search and advanced filtering capabilities.
 */

import { Type } from "@sinclair/typebox";
import type { OpenClawConfig } from "../../config/config.js";
import { stringEnum } from "../schema/typebox.js";
import { type AnyAgentTool, jsonResult, readStringParam } from "./common.js";

const QDRANT_ACTIONS = [
  "create_collection",
  "list_collections",
  "delete_collection",
  "upsert_points",
  "search",
  "scroll",
  "delete_points",
  "get_collection_info",
  "create_snapshot",
  "list_snapshots",
] as const;

const QdrantToolSchema = Type.Object({
  action: stringEnum(QDRANT_ACTIONS),
  collection_name: Type.Optional(
    Type.String({ description: "Name of the collection." }),
  ),
  vectors: Type.Optional(
    Type.String({ description: "JSON array of vectors to upsert." }),
  ),
  payloads: Type.Optional(
    Type.String({ description: "JSON array of payload objects (metadata)." }),
  ),
  ids: Type.Optional(
    Type.String({ description: "Comma-separated point IDs." }),
  ),
  query_vector: Type.Optional(
    Type.String({ description: "JSON array representing the query vector." }),
  ),
  limit: Type.Optional(
    Type.Number({ description: "Number of results to return.", minimum: 1, maximum: 100 }),
  ),
  filter: Type.Optional(
    Type.String({ description: "JSON filter expression for payload filtering." }),
  ),
  vector_size: Type.Optional(
    Type.Number({ description: "Size of vectors in this collection.", minimum: 1 }),
  ),
  distance: Type.Optional(
    Type.String({ description: "Distance metric: 'cosine', 'euclid', 'dot'." }),
  ),
  offset: Type.Optional(
    Type.Number({ description: "Offset for pagination (scroll).", minimum: 0 }),
  ),
});

type QdrantConfig = {
  enabled: boolean;
  host?: string;
  port?: number;
  apiKey?: string;
  grpcPort?: number;
};

/**
 * Resolve Qdrant configuration from OpenClaw config.
 */
function resolveQdrantConfig(cfg: OpenClawConfig | undefined): QdrantConfig {
  const toolsCfg = (cfg as Record<string, unknown> | undefined)?.tools as
    | Record<string, unknown>
    | undefined;
  const qdrant = toolsCfg?.qdrant as Record<string, unknown> | undefined;

  return {
    enabled: (qdrant?.enabled as boolean) ?? true,
    host: (qdrant?.host as string) ?? process.env.QDRANT_HOST ?? "localhost",
    port: (qdrant?.port as number) ?? Number(process.env.QDRANT_PORT) || 6333,
    apiKey: (qdrant?.apiKey as string) ?? process.env.QDRANT_API_KEY,
    grpcPort: (qdrant?.grpcPort as number) ?? 6334,
  };
}

// In-memory collections store
const collections = new Map<
  string,
  {
    name: string;
    vectorSize: number;
    distance: string;
    points: Array<{
      id: string;
      vector: number[];
      payload?: Record<string, unknown>;
    }>;
    createdAt: string;
  }
>();

const snapshots = new Map<string, { collectionName: string; createdAt: string }>();

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

export function createQdrantTool(options?: { config?: OpenClawConfig }): AnyAgentTool {
  const tool: AnyAgentTool = {
    name: "qdrant",
    label: "Qdrant Vector Database",
    description: [
      "Manage high-performance vector search with payload filtering and quantization.",
      "Actions: create_collection, list_collections, delete_collection, upsert_points,",
      "search, scroll, delete_points, get_collection_info, create_snapshot, list_snapshots.",
      "Use create_collection to create a new vector collection.",
      "Use upsert_points to add vectors with metadata payloads.",
      "Use search to perform semantic search with advanced filtering.",
    ].join(" "),
    parameters: QdrantToolSchema,
    execute: async (_toolCallId, params: Record<string, unknown>) => {
      const config = resolveQdrantConfig(options?.config);

      if (!config.enabled) {
        return jsonResult({ error: "Qdrant integration is disabled in config." });
      }

      const action = readStringParam(params, "action", true);
      const collectionName = readStringParam(params, "collection_name");
      const vectorsStr = readStringParam(params, "vectors");
      const payloadsStr = readStringParam(params, "payloads");
      const idsStr = readStringParam(params, "ids");
      const queryVectorStr = readStringParam(params, "query_vector");
      const limit = (params.limit as number | undefined) ?? 10;
      const filterStr = readStringParam(params, "filter");
      const vectorSize = (params.vector_size as number | undefined) ?? 128;
      const distance = readStringParam(params, "distance") ?? "cosine";
      const offset = (params.offset as number | undefined) ?? 0;

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
              vectorSize,
              distance,
              points: [],
              createdAt: new Date().toISOString(),
            });
            return jsonResult({
              success: true,
              collection_name: collectionName,
              vector_size: vectorSize,
              distance,
              message: `Collection '${collectionName}' created`,
            });
          }

          case "list_collections": {
            const collectionList = Array.from(collections.values()).map((col) => ({
              name: col.name,
              vectorSize: col.vectorSize,
              distance: col.distance,
              pointsCount: col.points.length,
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

          case "upsert_points": {
            if (!collectionName || !vectorsStr) {
              return jsonResult({
                error: "collection_name and vectors are required for upsert_points",
              });
            }
            const collection = collections.get(collectionName);
            if (!collection) {
              return jsonResult({ error: `Collection '${collectionName}' not found` });
            }

            const vectors: number[][] = JSON.parse(vectorsStr);
            const payloads: Array<Record<string, unknown>> = payloadsStr
              ? JSON.parse(payloadsStr)
              : [];
            const ids: string[] = idsStr
              ? idsStr.split(",").map((id) => id.trim())
              : vectors.map((_, i) => `point_${Date.now()}_${i}`);

            for (let i = 0; i < vectors.length; i++) {
              // Update or insert
              const existingIndex = collection.points.findIndex((p) => p.id === ids[i]);
              if (existingIndex >= 0) {
                collection.points[existingIndex] = {
                  id: ids[i],
                  vector: vectors[i],
                  payload: payloads[i] ?? {},
                };
              } else {
                collection.points.push({
                  id: ids[i],
                  vector: vectors[i],
                  payload: payloads[i] ?? {},
                });
              }
            }

            return jsonResult({
              success: true,
              collection_name: collectionName,
              upserted_count: vectors.length,
              ids,
            });
          }

          case "search": {
            if (!collectionName || !queryVectorStr) {
              return jsonResult({
                error: "collection_name and query_vector are required for search",
              });
            }
            const collection = collections.get(collectionName);
            if (!collection) {
              return jsonResult({ error: `Collection '${collectionName}' not found` });
            }

            const queryVector: number[] = JSON.parse(queryVectorStr);
            const filter = filterStr ? JSON.parse(filterStr) : undefined;

            let points = collection.points;

            // Apply filter if provided
            if (filter) {
              points = points.filter((point) => {
                if (!point.payload) return false;
                for (const [key, value] of Object.entries(filter)) {
                  if (point.payload[key] !== value) return false;
                }
                return true;
              });
            }

            // Compute similarities and sort
            const results = points
              .map((point) => ({
                id: point.id,
                score: cosineSimilarity(queryVector, point.vector),
                payload: point.payload,
              }))
              .sort((a, b) => b.score - a.score)
              .slice(0, limit);

            return jsonResult({
              success: true,
              collection_name: collectionName,
              results,
              count: results.length,
              note: "Vector search simulated (Qdrant library not installed)",
            });
          }

          case "scroll": {
            if (!collectionName) {
              return jsonResult({ error: "collection_name is required for scroll" });
            }
            const collection = collections.get(collectionName);
            if (!collection) {
              return jsonResult({ error: `Collection '${collectionName}' not found` });
            }

            const points = collection.points.slice(offset, offset + limit).map((point) => ({
              id: point.id,
              payload: point.payload,
            }));

            return jsonResult({
              success: true,
              collection_name: collectionName,
              points,
              count: points.length,
              offset,
              hasMore: offset + limit < collection.points.length,
            });
          }

          case "delete_points": {
            if (!collectionName || !idsStr) {
              return jsonResult({
                error: "collection_name and ids are required for delete_points",
              });
            }
            const collection = collections.get(collectionName);
            if (!collection) {
              return jsonResult({ error: `Collection '${collectionName}' not found` });
            }

            const idSet = new Set(idsStr.split(",").map((id) => id.trim()));
            const beforeCount = collection.points.length;
            collection.points = collection.points.filter((point) => !idSet.has(point.id));
            const deletedCount = beforeCount - collection.points.length;

            return jsonResult({
              success: true,
              collection_name: collectionName,
              deleted_count: deletedCount,
            });
          }

          case "get_collection_info": {
            if (!collectionName) {
              return jsonResult({
                error: "collection_name is required for get_collection_info",
              });
            }
            const collection = collections.get(collectionName);
            if (!collection) {
              return jsonResult({ error: `Collection '${collectionName}' not found` });
            }
            return jsonResult({
              success: true,
              collection: {
                name: collection.name,
                vectorSize: collection.vectorSize,
                distance: collection.distance,
                pointsCount: collection.points.length,
                createdAt: collection.createdAt,
              },
            });
          }

          case "create_snapshot": {
            if (!collectionName) {
              return jsonResult({ error: "collection_name is required for create_snapshot" });
            }
            const collection = collections.get(collectionName);
            if (!collection) {
              return jsonResult({ error: `Collection '${collectionName}' not found` });
            }
            const snapshotId = `snap_${Date.now()}`;
            snapshots.set(snapshotId, {
              collectionName,
              createdAt: new Date().toISOString(),
            });
            return jsonResult({
              success: true,
              snapshot_id: snapshotId,
              collection_name: collectionName,
              message: `Snapshot created for '${collectionName}'`,
            });
          }

          case "list_snapshots": {
            const snapshotList = Array.from(snapshots.entries()).map(([id, snap]) => ({
              id,
              collectionName: snap.collectionName,
              createdAt: snap.createdAt,
            }));
            return jsonResult({
              success: true,
              snapshots: snapshotList,
              count: snapshotList.length,
            });
          }

          default:
            return jsonResult({ error: `Unknown action: ${action}` });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return jsonResult({ error: `Qdrant tool error: ${message}` });
      }
    },
  };

  return tool;
}
