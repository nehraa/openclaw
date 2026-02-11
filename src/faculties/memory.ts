/**
 * Memory faculty - deep code indexing and semantic retrieval.
 *
 * This faculty uses LlamaIndex and Qdrant for building vector indexes of code,
 * documentation, and other content for semantic search and RAG.
 */

import { createLlamaIndexTool } from "../agents/tools/llamaindex-tool.js";
import { createQdrantTool } from "../agents/tools/qdrant-tool.js";
import type { FacultyConfig, FacultyResult } from "./types.js";

export type MemoryRequest = {
  /** Action to perform: index, search, or retrieve. */
  action: "index" | "search" | "retrieve" | "stats";
  /** Index name to use or create. */
  indexName?: string;
  /** Documents to index (file paths or text). */
  documents?: Array<{ path?: string; text?: string; metadata?: Record<string, unknown> }>;
  /** Query for semantic search. */
  query?: string;
  /** Number of results to return. */
  topK?: number;
};

export type MemoryResult = {
  /** Index ID. */
  indexId?: string;
  /** Collection ID (Qdrant). */
  collectionId?: string;
  /** Search results. */
  results?: Array<{
    text: string;
    score: number;
    metadata?: Record<string, unknown>;
  }>;
  /** Index statistics. */
  stats?: {
    documentCount: number;
    vectorSize: number;
    createdAt: string;
  };
  /** Document IDs for indexed content. */
  documentIds?: string[];
};

/**
 * Perform memory operations: indexing, search, or retrieval.
 */
export async function remember(
  request: MemoryRequest,
  config: FacultyConfig,
): Promise<FacultyResult<MemoryResult>> {
  try {
    const llamaIndexTool = createLlamaIndexTool({ config: config.config });
    const qdrantTool = createQdrantTool({ config: config.config });

    switch (request.action) {
      case "index":
        return await indexDocuments(request, llamaIndexTool, qdrantTool);
      case "search":
        return await searchMemory(request, llamaIndexTool);
      case "stats":
        return await getMemoryStats(request, llamaIndexTool);
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

async function indexDocuments(
  request: MemoryRequest,
  llamaIndexTool: ReturnType<typeof createLlamaIndexTool>,
  qdrantTool: ReturnType<typeof createQdrantTool>,
): Promise<FacultyResult<MemoryResult>> {
  const indexName = request.indexName ?? `index_${Date.now()}`;

  // Create LlamaIndex index
  const indexResult = await llamaIndexTool.execute("create", {
    action: "create_index",
    index_name: indexName,
    embedding_model: "text-embedding-ada-002",
  });

  if (!indexResult.success || indexResult.error) {
    return {
      success: false,
      error: indexResult.error || "Failed to create index",
    };
  }

  const indexId = (indexResult.data as Record<string, unknown>)?.index_id as string;

  // Create corresponding Qdrant collection
  const collectionResult = await qdrantTool.execute("create", {
    action: "create_collection",
    collection_name: indexName,
    vector_size: 1536, // OpenAI embedding size
    distance: "cosine",
  });

  const documentIds: string[] = [];

  // Ingest documents
  if (request.documents && request.documents.length > 0) {
    for (const doc of request.documents) {
      const ingestResult = await llamaIndexTool.execute("ingest", {
        action: "ingest_document",
        index_id: indexId,
        document_path: doc.path,
        document_text: doc.text,
      });

      if (ingestResult.success) {
        const docId = (ingestResult.data as Record<string, unknown>)?.document_id as string;
        if (docId) {
          documentIds.push(docId);
        }
      }
    }
  }

  return {
    success: true,
    data: {
      indexId,
      collectionId: collectionResult.success
        ? ((collectionResult.data as Record<string, unknown>)?.collection_name as string)
        : undefined,
      documentIds,
    },
    metadata: {
      indexName,
      documentCount: documentIds.length,
    },
  };
}

async function searchMemory(
  request: MemoryRequest,
  llamaIndexTool: ReturnType<typeof createLlamaIndexTool>,
): Promise<FacultyResult<MemoryResult>> {
  if (!request.query || !request.indexName) {
    return {
      success: false,
      error: "query and indexName are required for search",
    };
  }

  // First, get the index ID by listing indexes
  const listResult = await llamaIndexTool.execute("list", {
    action: "list_indexes",
  });

  if (!listResult.success) {
    return {
      success: false,
      error: "Failed to list indexes",
    };
  }

  const indexes = (listResult.data as Record<string, unknown>)?.indexes as Array<Record<string, unknown>>;
  const targetIndex = indexes?.find((idx) => idx.name === request.indexName);

  if (!targetIndex) {
    return {
      success: false,
      error: `Index '${request.indexName}' not found`,
    };
  }

  const indexId = targetIndex.id as string;

  // Perform search
  const searchResult = await llamaIndexTool.execute("query", {
    action: "query",
    index_id: indexId,
    query: request.query,
    top_k: request.topK ?? 5,
  });

  if (!searchResult.success || searchResult.error) {
    return {
      success: false,
      error: searchResult.error || "Search failed",
    };
  }

  const results = (searchResult.data as Record<string, unknown>)?.results as
    | Array<Record<string, unknown>>
    | undefined;

  return {
    success: true,
    data: {
      indexId,
      results: results?.map((r) => ({
        text: (r.text as string) ?? "",
        score: (r.score as number) ?? 0,
        metadata: r.metadata as Record<string, unknown> | undefined,
      })),
    },
    metadata: {
      query: request.query,
      resultCount: results?.length ?? 0,
    },
  };
}

async function getMemoryStats(
  request: MemoryRequest,
  llamaIndexTool: ReturnType<typeof createLlamaIndexTool>,
): Promise<FacultyResult<MemoryResult>> {
  if (!request.indexName) {
    return {
      success: false,
      error: "indexName is required for stats",
    };
  }

  const listResult = await llamaIndexTool.execute("list", {
    action: "list_indexes",
  });

  if (!listResult.success) {
    return {
      success: false,
      error: "Failed to list indexes",
    };
  }

  const indexes = (listResult.data as Record<string, unknown>)?.indexes as Array<Record<string, unknown>>;
  const targetIndex = indexes?.find((idx) => idx.name === request.indexName);

  if (!targetIndex) {
    return {
      success: false,
      error: `Index '${request.indexName}' not found`,
    };
  }

  const indexId = targetIndex.id as string;

  const statsResult = await llamaIndexTool.execute("stats", {
    action: "get_index_stats",
    index_id: indexId,
  });

  if (!statsResult.success) {
    return {
      success: false,
      error: "Failed to get stats",
    };
  }

  const stats = (statsResult.data as Record<string, unknown>)?.stats as Record<string, unknown> | undefined;

  return {
    success: true,
    data: {
      indexId,
      stats: stats
        ? {
            documentCount: (stats.documentCount as number) ?? 0,
            vectorSize: 1536,
            createdAt: (stats.createdAt as string) ?? "",
          }
        : undefined,
    },
  };
}

/**
 * Detect if input requires code search or knowledge retrieval.
 */
export function detectMemoryIntent(input: string): boolean {
  const memoryKeywords = [
    "search code",
    "find in",
    "look up",
    "retrieve",
    "remember",
    "what does",
    "where is",
    "show me",
    "documentation for",
    "examples of",
  ];

  const lowerInput = input.toLowerCase();
  return memoryKeywords.some((keyword) => lowerInput.includes(keyword));
}
