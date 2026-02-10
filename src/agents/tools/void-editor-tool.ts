/**
 * Void Editor integration tool – Privacy-focused Cursor alternative (MIT License).
 *
 * Void Editor provides AI-powered code editing with strong privacy guarantees,
 * local model support, and no telemetry.
 */

import { Type } from "@sinclair/typebox";
import type { OpenClawConfig } from "../../config/config.js";
import { stringEnum } from "../schema/typebox.js";
import { type AnyAgentTool, jsonResult, readStringParam } from "./common.js";

const VOID_EDITOR_ACTIONS = [
  "open_project",
  "ai_chat",
  "code_complete",
  "refactor",
  "list_sessions",
  "get_session",
  "apply_suggestion",
  "configure_privacy",
  "switch_model",
  "export_chat",
] as const;

const PRIVACY_LEVELS = ["maximum", "high", "balanced", "standard"] as const;

const VoidEditorToolSchema = Type.Object({
  action: stringEnum(VOID_EDITOR_ACTIONS),
  project_path: Type.Optional(Type.String({ description: "Path to project directory." })),
  session_id: Type.Optional(Type.String({ description: "Session ID for operations." })),
  message: Type.Optional(Type.String({ description: "Message for AI chat." })),
  code: Type.Optional(Type.String({ description: "Code snippet for completion or refactoring." })),
  file_path: Type.Optional(Type.String({ description: "File path for operations." })),
  refactor_type: Type.Optional(
    Type.String({
      description: "Refactor type: rename, extract, inline, move, optimize.",
    }),
  ),
  suggestion_id: Type.Optional(Type.String({ description: "Suggestion ID to apply." })),
  privacy_level: Type.Optional(stringEnum(PRIVACY_LEVELS)),
  model_name: Type.Optional(Type.String({ description: "Model name to use (local or remote)." })),
  export_format: Type.Optional(Type.String({ description: "Export format: markdown, json, txt." })),
});

type VoidEditorConfig = {
  enabled: boolean;
  defaultModel?: string;
  privacyLevel?: string;
  localModelsOnly?: boolean;
  telemetryEnabled?: boolean;
};

function resolveVoidEditorConfig(cfg: OpenClawConfig | undefined): VoidEditorConfig {
  const toolsCfg = (cfg as Record<string, unknown> | undefined)?.tools as
    | Record<string, unknown>
    | undefined;
  const voidEditor = toolsCfg?.voidEditor as Record<string, unknown> | undefined;

  return {
    enabled: (voidEditor?.enabled as boolean) ?? true,
    defaultModel: (voidEditor?.defaultModel as string) ?? "local-codellama",
    privacyLevel: (voidEditor?.privacyLevel as string) ?? "maximum",
    localModelsOnly: (voidEditor?.localModelsOnly as boolean) ?? true,
    telemetryEnabled: (voidEditor?.telemetryEnabled as boolean) ?? false,
  };
}

// In-memory stores
const sessions = new Map<string, Record<string, unknown>>();
const projects = new Map<string, Record<string, unknown>>();
const suggestions = new Map<string, Record<string, unknown>>();
let currentPrivacyLevel = "maximum";
let currentModel = "local-codellama";

export function createVoidEditorTool(options?: { config?: OpenClawConfig }): AnyAgentTool {
  const tool: AnyAgentTool = {
    name: "void_editor",
    label: "Void Editor",
    description: [
      "Privacy-focused Cursor alternative (MIT License).",
      "Actions: open_project, ai_chat, code_complete, refactor, list_sessions,",
      "get_session, apply_suggestion, configure_privacy, switch_model, export_chat.",
      "Emphasizes privacy with local models and no telemetry.",
    ].join(" "),
    parameters: VoidEditorToolSchema,
    execute: async (_toolCallId, params: Record<string, unknown>) => {
      const config = resolveVoidEditorConfig(options?.config);

      if (!config.enabled) {
        return jsonResult({ error: "Void Editor integration is disabled in config." });
      }

      const action = readStringParam(params, "action", { required: true });
      const projectPath = readStringParam(params, "project_path");
      const sessionId = readStringParam(params, "session_id");
      const message = readStringParam(params, "message");
      const code = readStringParam(params, "code");
      const filePath = readStringParam(params, "file_path");
      const refactorType = readStringParam(params, "refactor_type");
      const suggestionId = readStringParam(params, "suggestion_id");
      const privacyLevel = readStringParam(params, "privacy_level");
      const modelName = readStringParam(params, "model_name");
      const exportFormat = readStringParam(params, "export_format");

      try {
        switch (action) {
          case "open_project": {
            if (!projectPath) {
              return jsonResult({ error: "project_path is required for open_project" });
            }
            const projectId = `project_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            projects.set(projectId, {
              path: projectPath,
              openedAt: new Date().toISOString(),
              privacyLevel: currentPrivacyLevel,
              telemetryEnabled: config.telemetryEnabled,
              model: currentModel,
            });
            return jsonResult({
              success: true,
              project_id: projectId,
              project_path: projectPath,
              message: `Project opened with ${currentPrivacyLevel} privacy`,
              privacy_guarantees: {
                no_telemetry: !config.telemetryEnabled,
                local_models: config.localModelsOnly,
                data_retention: "none",
              },
            });
          }

          case "ai_chat": {
            if (!message) {
              return jsonResult({ error: "message is required for ai_chat" });
            }
            const id = sessionId ?? `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            let session = sessions.get(id);
            if (!session) {
              session = {
                id,
                createdAt: new Date().toISOString(),
                messages: [],
                model: currentModel,
                privacyLevel: currentPrivacyLevel,
              };
              sessions.set(id, session);
            }
            const userMsg = {
              role: "user",
              content: message,
              timestamp: new Date().toISOString(),
            };
            const aiMsg = {
              role: "assistant",
              content: `AI response to: ${message}`,
              timestamp: new Date().toISOString(),
              model: currentModel,
            };
            (session.messages as Array<Record<string, unknown>>).push(userMsg, aiMsg);
            return jsonResult({
              success: true,
              session_id: id,
              response: aiMsg.content,
              privacy_mode: currentPrivacyLevel,
              note: "Chat response simulated (Void Editor not installed)",
            });
          }

          case "code_complete": {
            if (!code) {
              return jsonResult({ error: "code is required for code_complete" });
            }
            const completion = {
              original: code,
              completed: `${code}\n  // AI-generated completion`,
              suggestions: [
                { text: "Suggestion 1: optimize loop", confidence: 0.85 },
                { text: "Suggestion 2: add error handling", confidence: 0.78 },
                { text: "Suggestion 3: improve naming", confidence: 0.72 },
              ],
              model: currentModel,
              timestamp: new Date().toISOString(),
            };
            return jsonResult({
              success: true,
              completion,
              message: "Code completion generated",
              note: "Completion simulated (Void Editor not installed)",
            });
          }

          case "refactor": {
            if (!code || !refactorType) {
              return jsonResult({
                error: "code and refactor_type are required for refactor",
              });
            }
            const refactored = {
              original: code,
              refactored: `// Refactored (${refactorType})\n${code}`,
              type: refactorType,
              changes: [
                "Improved variable naming",
                "Extracted helper function",
                "Added type annotations",
              ],
              filePath,
              timestamp: new Date().toISOString(),
            };
            const suggId = `suggestion_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            suggestions.set(suggId, refactored);
            return jsonResult({
              success: true,
              suggestion_id: suggId,
              refactoring: refactored,
              message: `Refactoring suggestion created (${refactorType})`,
              note: "Refactoring simulated (Void Editor not installed)",
            });
          }

          case "list_sessions": {
            const sessionList = Array.from(sessions.entries()).map(([id, s]) => ({
              id,
              messageCount: (s.messages as Array<unknown>).length,
              model: s.model,
              privacyLevel: s.privacyLevel,
              createdAt: s.createdAt,
            }));
            return jsonResult({
              success: true,
              sessions: sessionList,
              count: sessionList.length,
            });
          }

          case "get_session": {
            if (!sessionId) {
              return jsonResult({ error: "session_id is required for get_session" });
            }
            const session = sessions.get(sessionId);
            if (!session) {
              return jsonResult({ error: `Session ${sessionId} not found` });
            }
            return jsonResult({
              success: true,
              session_id: sessionId,
              session,
            });
          }

          case "apply_suggestion": {
            if (!suggestionId) {
              return jsonResult({
                error: "suggestion_id is required for apply_suggestion",
              });
            }
            const suggestion = suggestions.get(suggestionId);
            if (!suggestion) {
              return jsonResult({ error: `Suggestion ${suggestionId} not found` });
            }
            suggestion.applied = true;
            suggestion.appliedAt = new Date().toISOString();
            return jsonResult({
              success: true,
              suggestion_id: suggestionId,
              message: "Suggestion applied",
              note: "Application simulated (Void Editor not installed)",
            });
          }

          case "configure_privacy": {
            if (!privacyLevel) {
              return jsonResult({
                error: "privacy_level is required for configure_privacy",
              });
            }
            if (!PRIVACY_LEVELS.includes(privacyLevel as (typeof PRIVACY_LEVELS)[number])) {
              return jsonResult({
                error: `Invalid privacy level. Must be one of: ${PRIVACY_LEVELS.join(", ")}`,
              });
            }
            currentPrivacyLevel = privacyLevel;
            const privacySettings = {
              maximum: {
                telemetry: false,
                localModels: true,
                dataRetention: "none",
                networkAccess: "blocked",
              },
              high: {
                telemetry: false,
                localModels: true,
                dataRetention: "session",
                networkAccess: "restricted",
              },
              balanced: {
                telemetry: false,
                localModels: false,
                dataRetention: "7days",
                networkAccess: "allowed",
              },
              standard: {
                telemetry: true,
                localModels: false,
                dataRetention: "30days",
                networkAccess: "allowed",
              },
            }[privacyLevel];
            return jsonResult({
              success: true,
              privacy_level: privacyLevel,
              settings: privacySettings,
              message: `Privacy level set to ${privacyLevel}`,
            });
          }

          case "switch_model": {
            if (!modelName) {
              return jsonResult({ error: "model_name is required for switch_model" });
            }
            if (config.localModelsOnly && !modelName.startsWith("local-")) {
              return jsonResult({
                error: "Only local models allowed in current privacy configuration",
              });
            }
            currentModel = modelName;
            return jsonResult({
              success: true,
              model_name: modelName,
              message: `Switched to model ${modelName}`,
              is_local: modelName.startsWith("local-"),
            });
          }

          case "export_chat": {
            if (!sessionId) {
              return jsonResult({ error: "session_id is required for export_chat" });
            }
            const session = sessions.get(sessionId);
            if (!session) {
              return jsonResult({ error: `Session ${sessionId} not found` });
            }
            const format = exportFormat ?? "markdown";
            const exportData = {
              sessionId,
              format,
              messages: session.messages,
              exportedAt: new Date().toISOString(),
              privacyNote: "No user data retained after export",
            };
            return jsonResult({
              success: true,
              export: exportData,
              message: `Chat exported in ${format} format`,
              note: "Export simulated (Void Editor not installed)",
            });
          }

          default:
            return jsonResult({ error: `Unknown action: ${action}` });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return jsonResult({ error: `Void Editor tool error: ${message}` });
      }
    },
  };

  return tool;
}
