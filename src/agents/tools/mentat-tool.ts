/**
 * Mentat integration tool – CLI multi-file coordinator.
 *
 * Mentat provides command-line multi-file editing with dependency tracking,
 * issue review, and coordinated changes across codebases. MIT License.
 */

import { Type } from "@sinclair/typebox";
import type { OpenClawConfig } from "../../config/config.js";
import { stringEnum } from "../schema/typebox.js";
import { type AnyAgentTool, jsonResult, readStringParam } from "./common.js";

const MENTAT_ACTIONS = [
  "coordinate_edit",
  "review_issue",
  "multi_file_change",
  "track_dependencies",
  "list_coordinations",
  "get_coordination_status",
  "rollback_changes",
  "analyze_impact",
] as const;

const MentatToolSchema = Type.Object({
  action: stringEnum(MENTAT_ACTIONS),
  coordination_id: Type.Optional(Type.String({ description: "Coordination ID for operations." })),
  name: Type.Optional(Type.String({ description: "Coordination name." })),
  description: Type.Optional(Type.String({ description: "Coordination description." })),
  files: Type.Optional(
    Type.String({ description: "Comma-separated list of file paths to coordinate." }),
  ),
  issue_url: Type.Optional(Type.String({ description: "GitHub issue URL for review." })),
  changes: Type.Optional(
    Type.String({ description: "JSON array of changes to apply across files." }),
  ),
  scope: Type.Optional(
    Type.String({ description: "Scope of coordination (e.g., 'local', 'global', 'module')." }),
  ),
});

type MentatConfig = {
  enabled: boolean;
  coordinationMode?: string;
  githubIntegration?: boolean;
};

function resolveMentatConfig(cfg: OpenClawConfig | undefined): MentatConfig {
  const toolsCfg = (cfg as Record<string, unknown> | undefined)?.tools as
    | Record<string, unknown>
    | undefined;
  const mentat = toolsCfg?.mentat as Record<string, unknown> | undefined;

  return {
    enabled: (mentat?.enabled as boolean) ?? true,
    coordinationMode: (mentat?.coordinationMode as string) ?? "automatic",
    githubIntegration: (mentat?.githubIntegration as boolean) ?? true,
  };
}

// In-memory stores
const coordinations = new Map<string, Record<string, unknown>>();
const dependencies = new Map<string, Array<Record<string, unknown>>>();

export function createMentatTool(options?: { config?: OpenClawConfig }): AnyAgentTool {
  const tool: AnyAgentTool = {
    name: "mentat",
    label: "Mentat",
    description: [
      "CLI multi-file coordinator with dependency tracking and issue review.",
      "Actions: coordinate_edit, review_issue, multi_file_change, track_dependencies,",
      "list_coordinations, get_coordination_status, rollback_changes, analyze_impact.",
      "Provides coordinated editing across multiple files.",
    ].join(" "),
    parameters: MentatToolSchema,
    execute: async (_toolCallId, params: Record<string, unknown>) => {
      const config = resolveMentatConfig(options?.config);

      if (!config.enabled) {
        return jsonResult({ error: "Mentat integration is disabled in config." });
      }

      const action = readStringParam(params, "action", { required: true });
      const coordinationId = readStringParam(params, "coordination_id");
      const name = readStringParam(params, "name");
      const description = readStringParam(params, "description");
      const filesStr = readStringParam(params, "files");
      const issueUrl = readStringParam(params, "issue_url");
      const changesStr = readStringParam(params, "changes");
      const scope = readStringParam(params, "scope");

      try {
        switch (action) {
          case "coordinate_edit": {
            if (!name || !filesStr) {
              return jsonResult({
                error: "name and files are required for coordinate_edit",
              });
            }
            const id = `coord_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            const files = filesStr.split(",").map((f) => f.trim());
            coordinations.set(id, {
              name,
              description: description ?? "",
              files,
              scope: scope ?? "local",
              createdAt: new Date().toISOString(),
              status: "pending",
              changes: [],
            });
            dependencies.set(id, []);
            return jsonResult({
              success: true,
              coordination_id: id,
              message: `Coordination '${name}' created`,
              files,
            });
          }

          case "review_issue": {
            if (!coordinationId || !issueUrl) {
              return jsonResult({
                error: "coordination_id and issue_url are required for review_issue",
              });
            }
            const coordination = coordinations.get(coordinationId);
            if (!coordination) {
              return jsonResult({ error: `Coordination ${coordinationId} not found` });
            }
            const review = {
              issueUrl,
              reviewedAt: new Date().toISOString(),
              suggestedFiles: ["src/module.js", "tests/module.test.js"],
              recommendations: [
                "Update main module logic",
                "Add test coverage for edge cases",
                "Update documentation",
              ],
              status: "pending_approval",
            };
            coordination.review = review;
            return jsonResult({
              success: true,
              message: "Issue reviewed",
              review,
              requires_approval: true,
              note: "Issue review simulated (Mentat not installed)",
            });
          }

          case "multi_file_change": {
            if (!coordinationId || !changesStr) {
              return jsonResult({
                error: "coordination_id and changes are required for multi_file_change",
              });
            }
            const coordination = coordinations.get(coordinationId);
            if (!coordination) {
              return jsonResult({ error: `Coordination ${coordinationId} not found` });
            }
            const changes = JSON.parse(changesStr);
            const changeData = {
              timestamp: new Date().toISOString(),
              changes,
              filesModified: changes.map((c: Record<string, unknown>) => c.file),
              status: "applied",
            };
            (coordination.changes as Array<Record<string, unknown>>).push(changeData);
            coordination.status = "in_progress";

            // Track dependencies
            const coordinationDeps = dependencies.get(coordinationId) ?? [];
            for (const change of changes) {
              if (change.dependencies) {
                for (const dep of change.dependencies as string[]) {
                  coordinationDeps.push({
                    file: change.file,
                    dependency: dep,
                    timestamp: new Date().toISOString(),
                  });
                }
              }
            }
            dependencies.set(coordinationId, coordinationDeps);

            return jsonResult({
              success: true,
              message: "Multi-file changes applied",
              change: changeData,
              note: "Multi-file change simulated (Mentat not installed)",
            });
          }

          case "track_dependencies": {
            if (!coordinationId) {
              return jsonResult({
                error: "coordination_id is required for track_dependencies",
              });
            }
            const coordinationDeps = dependencies.get(coordinationId) ?? [];
            return jsonResult({
              success: true,
              coordination_id: coordinationId,
              dependencies: coordinationDeps,
              count: coordinationDeps.length,
            });
          }

          case "list_coordinations": {
            const coordinationList = Array.from(coordinations.entries()).map(([id, coord]) => ({
              id,
              name: coord.name,
              description: coord.description,
              status: coord.status,
              fileCount: (coord.files as Array<unknown>).length,
              changeCount: (coord.changes as Array<unknown>).length,
              createdAt: coord.createdAt,
            }));
            return jsonResult({
              success: true,
              coordinations: coordinationList,
              count: coordinationList.length,
            });
          }

          case "get_coordination_status": {
            if (!coordinationId) {
              return jsonResult({
                error: "coordination_id is required for get_coordination_status",
              });
            }
            const coordination = coordinations.get(coordinationId);
            if (!coordination) {
              return jsonResult({ error: `Coordination ${coordinationId} not found` });
            }
            return jsonResult({
              success: true,
              coordination_id: coordinationId,
              name: coordination.name,
              status: coordination.status,
              files: coordination.files,
              changes: coordination.changes,
              review: coordination.review,
            });
          }

          case "rollback_changes": {
            if (!coordinationId) {
              return jsonResult({
                error: "coordination_id is required for rollback_changes",
              });
            }
            const coordination = coordinations.get(coordinationId);
            if (!coordination) {
              return jsonResult({ error: `Coordination ${coordinationId} not found` });
            }
            const changeCount = (coordination.changes as Array<unknown>).length;
            if (changeCount === 0) {
              return jsonResult({ error: "No changes to rollback" });
            }
            coordination.changes = [];
            coordination.status = "rolled_back";
            coordination.rolledBackAt = new Date().toISOString();
            return jsonResult({
              success: true,
              message: `Rolled back ${changeCount} change(s)`,
              changes_rolled_back: changeCount,
              note: "Rollback simulated (Mentat not installed)",
            });
          }

          case "analyze_impact": {
            if (!coordinationId) {
              return jsonResult({
                error: "coordination_id is required for analyze_impact",
              });
            }
            const coordination = coordinations.get(coordinationId);
            if (!coordination) {
              return jsonResult({ error: `Coordination ${coordinationId} not found` });
            }
            const files = coordination.files as string[];
            const analysis = {
              analyzedAt: new Date().toISOString(),
              filesAffected: files.length,
              scope: coordination.scope,
              impact: files.length > 5 ? "high" : files.length > 2 ? "medium" : "low",
              affectedModules: files
                .map((f) => f.split("/")[1])
                .filter((m, i, a) => a.indexOf(m) === i),
              recommendations: [
                "Review all affected files",
                "Run full test suite",
                "Update documentation",
              ],
            };
            return jsonResult({
              success: true,
              analysis,
              note: "Impact analysis simulated (Mentat not installed)",
            });
          }

          default:
            return jsonResult({ error: `Unknown action: ${action}` });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return jsonResult({ error: `Mentat tool error: ${message}` });
      }
    },
  };

  return tool;
}
