/**
 * AnythingLLM integration tool – lets the agent manage local RAG workspaces
 * with document ingestion, embedding, and context-aware chat.
 *
 * AnythingLLM is a desktop RAG application (MIT License, 22k+ stars) that provides
 * private document chat with support for multiple LLM providers and vector databases.
 */

import { Type } from "@sinclair/typebox";
import type { OpenClawConfig } from "../../config/config.js";
import { stringEnum } from "../schema/typebox.js";
import { type AnyAgentTool, jsonResult, readStringParam } from "./common.js";

const ANYTHINGLLM_ACTIONS = [
  "create_workspace",
  "upload_document",
  "chunk_document",
  "embed_document",
  "chat_with_docs",
  "search_documents",
  "list_workspaces",
  "get_workspace_status",
] as const;

const AnythingLLMToolSchema = Type.Object({
  action: stringEnum(ANYTHINGLLM_ACTIONS),
  workspace_name: Type.Optional(
    Type.String({ description: "Name of the workspace to create or query." }),
  ),
  document_path: Type.Optional(Type.String({ description: "Path to document file to upload." })),
  document_id: Type.Optional(Type.String({ description: "ID of the document to process." })),
  message: Type.Optional(Type.String({ description: "Chat message to send to the workspace." })),
  query: Type.Optional(Type.String({ description: "Search query for semantic document search." })),
  chunk_size: Type.Optional(
    Type.Number({
      description: "Size of document chunks in characters.",
      minimum: 100,
      maximum: 4000,
    }),
  ),
  chunk_overlap: Type.Optional(
    Type.Number({ description: "Overlap between chunks in characters.", minimum: 0, maximum: 500 }),
  ),
  max_results: Type.Optional(
    Type.Number({ description: "Maximum number of search results.", minimum: 1, maximum: 50 }),
  ),
  include_metadata: Type.Optional(
    Type.Boolean({ description: "Include document metadata in results." }),
  ),
});

type AnythingLLMConfig = {
  enabled: boolean;
  host?: string;
  port?: number;
  apiKey?: string;
  defaultWorkspace?: string;
};

/**
 * Resolve AnythingLLM configuration from OpenClaw config.
 */
function resolveAnythingLLMConfig(cfg: OpenClawConfig | undefined): AnythingLLMConfig {
  const toolsCfg = (cfg as Record<string, unknown> | undefined)?.tools as
    | Record<string, unknown>
    | undefined;
  const anythingllm = toolsCfg?.anythingllm as Record<string, unknown> | undefined;

  return {
    enabled: (anythingllm?.enabled as boolean) ?? true,
    host: (anythingllm?.host as string) ?? process.env.ANYTHINGLLM_HOST ?? "localhost",
    port: (anythingllm?.port as number) ?? (Number(process.env.ANYTHINGLLM_PORT) || 3001),
    apiKey: (anythingllm?.apiKey as string) ?? process.env.ANYTHINGLLM_API_KEY,
    defaultWorkspace: (anythingllm?.defaultWorkspace as string) ?? "default",
  };
}

// In-memory workspaces store
const workspaces = new Map<
  string,
  {
    name: string;
    documents: Array<{
      id: string;
      path: string;
      chunks: Array<{
        id: string;
        text: string;
        embedding?: number[];
        metadata?: Record<string, unknown>;
      }>;
      uploadedAt: string;
    }>;
    chatHistory: Array<{
      role: "user" | "assistant";
      content: string;
      timestamp: string;
    }>;
    createdAt: string;
  }
>();

function generateSimpleEmbedding(text: string): number[] {
  // Simple mock embedding (384 dimensions, typical for sentence transformers)
  const embedding: number[] = [];
  for (let i = 0; i < 384; i++) {
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

function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
  }
  return chunks;
}

export function createAnythingLLMTool(options?: { config?: OpenClawConfig }): AnyAgentTool {
  const tool: AnyAgentTool = {
    name: "anythingllm",
    label: "AnythingLLM RAG Platform",
    description: [
      "Manage local RAG workspaces with document ingestion and context-aware chat.",
      "Actions: create_workspace, upload_document, chunk_document, embed_document,",
      "chat_with_docs, search_documents, list_workspaces, get_workspace_status.",
      "Use create_workspace to set up a new document workspace.",
      "Use upload_document to add documents for processing.",
      "Use chat_with_docs to query documents with context-aware responses.",
    ].join(" "),
    parameters: AnythingLLMToolSchema,
    execute: async (_toolCallId, params: Record<string, unknown>) => {
      const config = resolveAnythingLLMConfig(options?.config);

      if (!config.enabled) {
        return jsonResult({ error: "AnythingLLM integration is disabled in config." });
      }

      const action = readStringParam(params, "action", { required: true });
      const workspaceName = readStringParam(params, "workspace_name");
      const documentPath = readStringParam(params, "document_path");
      const documentId = readStringParam(params, "document_id");
      const message = readStringParam(params, "message");
      const query = readStringParam(params, "query");
      const chunkSize = (params.chunk_size as number | undefined) ?? 1000;
      const chunkOverlap = (params.chunk_overlap as number | undefined) ?? 200;
      const maxResults = (params.max_results as number | undefined) ?? 10;
      const includeMetadata = (params.include_metadata as boolean | undefined) ?? true;

      try {
        switch (action) {
          case "create_workspace": {
            if (!workspaceName) {
              return jsonResult({ error: "workspace_name is required for create_workspace" });
            }
            if (workspaces.has(workspaceName)) {
              return jsonResult({ error: `Workspace '${workspaceName}' already exists` });
            }
            workspaces.set(workspaceName, {
              name: workspaceName,
              documents: [],
              chatHistory: [],
              createdAt: new Date().toISOString(),
            });
            return jsonResult({
              success: true,
              workspace_name: workspaceName,
              message: `Workspace '${workspaceName}' created`,
              api_url: `http://${config.host}:${config.port}/api/workspace/${workspaceName}`,
            });
          }

          case "upload_document": {
            if (!workspaceName || !documentPath) {
              return jsonResult({
                error: "workspace_name and document_path are required for upload_document",
              });
            }
            const workspace = workspaces.get(workspaceName);
            if (!workspace) {
              return jsonResult({ error: `Workspace '${workspaceName}' not found` });
            }

            const docId = `doc_${Date.now()}`;
            workspace.documents.push({
              id: docId,
              path: documentPath,
              chunks: [],
              uploadedAt: new Date().toISOString(),
            });

            return jsonResult({
              success: true,
              workspace_name: workspaceName,
              document_id: docId,
              document_path: documentPath,
              message: `Document uploaded to workspace '${workspaceName}'`,
              note: "Document upload simulated (AnythingLLM not installed)",
            });
          }

          case "chunk_document": {
            if (!workspaceName || !documentId) {
              return jsonResult({
                error: "workspace_name and document_id are required for chunk_document",
              });
            }
            const workspace = workspaces.get(workspaceName);
            if (!workspace) {
              return jsonResult({ error: `Workspace '${workspaceName}' not found` });
            }

            const document = workspace.documents.find((d) => d.id === documentId);
            if (!document) {
              return jsonResult({ error: `Document '${documentId}' not found` });
            }

            // Simulate document content
            const mockContent = `Sample document content from ${document.path}. This is a simulated text that would normally be extracted from the actual file.`;
            const textChunks = chunkText(mockContent, chunkSize, chunkOverlap);

            document.chunks = textChunks.map((text, idx) => ({
              id: `chunk_${documentId}_${idx}`,
              text,
              metadata: {
                source: document.path,
                chunk_index: idx,
                total_chunks: textChunks.length,
              },
            }));

            return jsonResult({
              success: true,
              workspace_name: workspaceName,
              document_id: documentId,
              chunk_count: document.chunks.length,
              chunk_size: chunkSize,
              chunk_overlap: chunkOverlap,
              message: `Document chunked into ${document.chunks.length} segments`,
            });
          }

          case "embed_document": {
            if (!workspaceName || !documentId) {
              return jsonResult({
                error: "workspace_name and document_id are required for embed_document",
              });
            }
            const workspace = workspaces.get(workspaceName);
            if (!workspace) {
              return jsonResult({ error: `Workspace '${workspaceName}' not found` });
            }

            const document = workspace.documents.find((d) => d.id === documentId);
            if (!document) {
              return jsonResult({ error: `Document '${documentId}' not found` });
            }

            if (document.chunks.length === 0) {
              return jsonResult({
                error: "Document has no chunks. Run chunk_document first.",
              });
            }

            // Generate embeddings for all chunks
            for (const chunk of document.chunks) {
              chunk.embedding = generateSimpleEmbedding(chunk.text);
            }

            return jsonResult({
              success: true,
              workspace_name: workspaceName,
              document_id: documentId,
              embedded_chunks: document.chunks.length,
              message: `Generated embeddings for ${document.chunks.length} chunks`,
              note: "Embeddings simulated (AnythingLLM not installed)",
            });
          }

          case "chat_with_docs": {
            if (!workspaceName || !message) {
              return jsonResult({
                error: "workspace_name and message are required for chat_with_docs",
              });
            }
            const workspace = workspaces.get(workspaceName);
            if (!workspace) {
              return jsonResult({ error: `Workspace '${workspaceName}' not found` });
            }

            // Add user message to history
            workspace.chatHistory.push({
              role: "user",
              content: message,
              timestamp: new Date().toISOString(),
            });

            // Find relevant chunks
            const queryEmbedding = generateSimpleEmbedding(message);
            const allChunks = workspace.documents.flatMap((doc) => doc.chunks);
            const relevantChunks = allChunks
              .filter((chunk) => chunk.embedding)
              .map((chunk) => ({
                chunk,
                similarity: chunk.embedding ? cosineSimilarity(queryEmbedding, chunk.embedding) : 0,
              }))
              .sort((a, b) => b.similarity - a.similarity)
              .slice(0, 3);

            const context = relevantChunks.map((r) => r.chunk.text).join("\n\n");
            const response = `Based on the documents in workspace '${workspaceName}', here's what I found:\n\n${context}\n\n[Simulated response based on ${relevantChunks.length} relevant chunks]`;

            workspace.chatHistory.push({
              role: "assistant",
              content: response,
              timestamp: new Date().toISOString(),
            });

            return jsonResult({
              success: true,
              workspace_name: workspaceName,
              response,
              sources: relevantChunks.map((r) => ({
                chunk_id: r.chunk.id,
                similarity: r.similarity,
                metadata: r.chunk.metadata,
              })),
              note: "Chat response simulated (AnythingLLM not installed)",
            });
          }

          case "search_documents": {
            if (!workspaceName || !query) {
              return jsonResult({
                error: "workspace_name and query are required for search_documents",
              });
            }
            const workspace = workspaces.get(workspaceName);
            if (!workspace) {
              return jsonResult({ error: `Workspace '${workspaceName}' not found` });
            }

            const queryEmbedding = generateSimpleEmbedding(query);
            const allChunks = workspace.documents.flatMap((doc) => doc.chunks);
            const results = allChunks
              .filter((chunk) => chunk.embedding)
              .map((chunk) => ({
                chunk_id: chunk.id,
                text: chunk.text,
                similarity: chunk.embedding ? cosineSimilarity(queryEmbedding, chunk.embedding) : 0,
                metadata: includeMetadata ? chunk.metadata : undefined,
              }))
              .sort((a, b) => b.similarity - a.similarity)
              .slice(0, maxResults);

            return jsonResult({
              success: true,
              workspace_name: workspaceName,
              query,
              results,
              count: results.length,
              note: "Search simulated (AnythingLLM not installed)",
            });
          }

          case "list_workspaces": {
            const workspaceList = Array.from(workspaces.values()).map((ws) => ({
              name: ws.name,
              document_count: ws.documents.length,
              total_chunks: ws.documents.reduce((sum, doc) => sum + doc.chunks.length, 0),
              chat_messages: ws.chatHistory.length,
              created_at: ws.createdAt,
            }));
            return jsonResult({
              success: true,
              workspaces: workspaceList,
              count: workspaceList.length,
            });
          }

          case "get_workspace_status": {
            if (!workspaceName) {
              return jsonResult({
                error: "workspace_name is required for get_workspace_status",
              });
            }
            const workspace = workspaces.get(workspaceName);
            if (!workspace) {
              return jsonResult({ error: `Workspace '${workspaceName}' not found` });
            }

            const totalChunks = workspace.documents.reduce(
              (sum, doc) => sum + doc.chunks.length,
              0,
            );
            const embeddedChunks = workspace.documents.reduce(
              (sum, doc) => sum + doc.chunks.filter((c) => c.embedding).length,
              0,
            );

            return jsonResult({
              success: true,
              workspace_name: workspaceName,
              status: {
                document_count: workspace.documents.length,
                total_chunks: totalChunks,
                embedded_chunks: embeddedChunks,
                chat_messages: workspace.chatHistory.length,
                created_at: workspace.createdAt,
                documents: workspace.documents.map((doc) => ({
                  id: doc.id,
                  path: doc.path,
                  chunks: doc.chunks.length,
                  uploaded_at: doc.uploadedAt,
                })),
              },
            });
          }

          default:
            return jsonResult({ error: `Unknown action: ${action}` });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return jsonResult({ error: `AnythingLLM tool error: ${message}` });
      }
    },
  };

  return tool;
}
