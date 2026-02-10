/**
 * Roo Code integration tool – Speed-focused VS Code agent (Cline fork, MIT License).
 *
 * Roo Code is a performance-optimized fork of Cline with faster response times
 * and streamlined workflows for rapid development.
 */

import { Type } from "@sinclair/typebox";
import type { OpenClawConfig } from "../../config/config.js";
import { stringEnum } from "../schema/typebox.js";
import { type AnyAgentTool, jsonResult, readStringParam } from "./common.js";

const ROO_CODE_ACTIONS = [
  "create_task",
  "set_role",
  "execute_task",
  "switch_mode",
  "list_tasks",
  "get_task_status",
  "cancel_task",
  "optimize_workflow",
  "get_performance_metrics",
  "batch_execute",
] as const;

const ROLE_TYPES = ["Architect", "Developer", "Tester"] as const;
const MODE_TYPES = ["speed", "balanced", "thorough"] as const;

const RooCodeToolSchema = Type.Object({
  action: stringEnum(ROO_CODE_ACTIONS),
  task_id: Type.Optional(Type.String({ description: "Task ID for operations." })),
  description: Type.Optional(Type.String({ description: "Task description." })),
  role: Type.Optional(stringEnum(ROLE_TYPES)),
  mode: Type.Optional(stringEnum(MODE_TYPES)),
  priority: Type.Optional(
    Type.String({ description: "Task priority: low, medium, high, critical." }),
  ),
  files: Type.Optional(
    Type.String({ description: "JSON array of files to include in task scope." }),
  ),
  batch_tasks: Type.Optional(
    Type.String({ description: "JSON array of task descriptions for batch execution." }),
  ),
});

type RooCodeConfig = {
  enabled: boolean;
  defaultRole?: string;
  updateSpeed?: string;
};

function resolveRooCodeConfig(cfg: OpenClawConfig | undefined): RooCodeConfig {
  const toolsCfg = (cfg as Record<string, unknown> | undefined)?.tools as
    | Record<string, unknown>
    | undefined;
  const rooCode = toolsCfg?.rooCode as Record<string, unknown> | undefined;

  return {
    enabled: (rooCode?.enabled as boolean) ?? true,
    defaultRole: (rooCode?.defaultRole as string) ?? "Developer",
    updateSpeed: (rooCode?.updateSpeed as string) ?? "fast",
  };
}

// In-memory stores
const tasks = new Map<string, Record<string, unknown>>();
const performanceMetrics: Array<Record<string, unknown>> = [];
let currentRole = "Developer";
let currentMode = "balanced";

export function createRooCodeTool(options?: { config?: OpenClawConfig }): AnyAgentTool {
  const tool: AnyAgentTool = {
    name: "roo_code",
    label: "Roo Code",
    description: [
      "Speed-focused VS Code agent (Cline fork, MIT License).",
      "Actions: create_task, set_role, execute_task, switch_mode, list_tasks,",
      "get_task_status, cancel_task, optimize_workflow, get_performance_metrics, batch_execute.",
      "Optimized for rapid development with role-based workflows.",
    ].join(" "),
    parameters: RooCodeToolSchema,
    execute: async (_toolCallId, params: Record<string, unknown>) => {
      const config = resolveRooCodeConfig(options?.config);

      if (!config.enabled) {
        return jsonResult({ error: "Roo Code integration is disabled in config." });
      }

      const action = readStringParam(params, "action", { required: true });
      const taskId = readStringParam(params, "task_id");
      const description = readStringParam(params, "description");
      const role = readStringParam(params, "role");
      const mode = readStringParam(params, "mode");
      const priority = readStringParam(params, "priority");
      const files = readStringParam(params, "files");
      const batchTasks = readStringParam(params, "batch_tasks");

      try {
        switch (action) {
          case "create_task": {
            if (!description) {
              return jsonResult({ error: "description is required for create_task" });
            }
            const id = `task_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            const fileList = files ? JSON.parse(files) : [];
            tasks.set(id, {
              description,
              role: currentRole,
              mode: currentMode,
              priority: priority ?? "medium",
              files: fileList,
              createdAt: new Date().toISOString(),
              status: "pending",
              estimatedDuration: Math.floor(Math.random() * 300) + 60,
            });
            return jsonResult({
              success: true,
              task_id: id,
              message: `Task created: ${description}`,
              role: currentRole,
              mode: currentMode,
            });
          }

          case "set_role": {
            if (!role) {
              return jsonResult({ error: "role is required for set_role" });
            }
            if (!ROLE_TYPES.includes(role as (typeof ROLE_TYPES)[number])) {
              return jsonResult({
                error: `Invalid role. Must be one of: ${ROLE_TYPES.join(", ")}`,
              });
            }
            currentRole = role;
            return jsonResult({
              success: true,
              message: `Role set to ${role}`,
              role,
              capabilities: {
                Architect: ["system_design", "architecture_review", "documentation"],
                Developer: ["code_generation", "refactoring", "bug_fixing"],
                Tester: ["test_generation", "test_execution", "quality_assurance"],
              }[role],
            });
          }

          case "execute_task": {
            if (!taskId) {
              return jsonResult({ error: "task_id is required for execute_task" });
            }
            const task = tasks.get(taskId);
            if (!task) {
              return jsonResult({ error: `Task ${taskId} not found` });
            }
            const startTime = Date.now();
            task.status = "executing";
            task.startedAt = new Date().toISOString();
            // Simulate execution
            task.status = "completed";
            task.completedAt = new Date().toISOString();
            const duration = Date.now() - startTime;
            performanceMetrics.push({
              taskId,
              role: task.role,
              mode: task.mode,
              duration,
              timestamp: new Date().toISOString(),
            });
            return jsonResult({
              success: true,
              task_id: taskId,
              message: "Task execution completed",
              duration_ms: duration,
              note: "Task execution simulated (Roo Code not installed)",
            });
          }

          case "switch_mode": {
            if (!mode) {
              return jsonResult({ error: "mode is required for switch_mode" });
            }
            if (!MODE_TYPES.includes(mode as (typeof MODE_TYPES)[number])) {
              return jsonResult({
                error: `Invalid mode. Must be one of: ${MODE_TYPES.join(", ")}`,
              });
            }
            currentMode = mode;
            return jsonResult({
              success: true,
              message: `Mode switched to ${mode}`,
              mode,
              characteristics: {
                speed: "Fast execution, minimal validation",
                balanced: "Optimized balance of speed and quality",
                thorough: "Comprehensive validation and testing",
              }[mode],
            });
          }

          case "list_tasks": {
            const taskList = Array.from(tasks.entries()).map(([id, task]) => ({
              id,
              description: task.description,
              status: task.status,
              role: task.role,
              mode: task.mode,
              priority: task.priority,
              createdAt: task.createdAt,
            }));
            return jsonResult({
              success: true,
              tasks: taskList,
              count: taskList.length,
            });
          }

          case "get_task_status": {
            if (!taskId) {
              return jsonResult({ error: "task_id is required for get_task_status" });
            }
            const task = tasks.get(taskId);
            if (!task) {
              return jsonResult({ error: `Task ${taskId} not found` });
            }
            return jsonResult({
              success: true,
              task_id: taskId,
              status: task.status,
              description: task.description,
              role: task.role,
              mode: task.mode,
              priority: task.priority,
              files: task.files,
              createdAt: task.createdAt,
              startedAt: task.startedAt,
              completedAt: task.completedAt,
              estimatedDuration: task.estimatedDuration,
            });
          }

          case "cancel_task": {
            if (!taskId) {
              return jsonResult({ error: "task_id is required for cancel_task" });
            }
            const task = tasks.get(taskId);
            if (!task) {
              return jsonResult({ error: `Task ${taskId} not found` });
            }
            task.status = "cancelled";
            task.cancelledAt = new Date().toISOString();
            return jsonResult({
              success: true,
              task_id: taskId,
              message: "Task cancelled",
            });
          }

          case "optimize_workflow": {
            const pendingTasks = Array.from(tasks.values()).filter((t) => t.status === "pending");
            const maxConcurrency = 3;
            const optimizations: Array<string> = [];
            if (pendingTasks.length > maxConcurrency) {
              optimizations.push(
                `Consider batching ${pendingTasks.length} pending tasks (max concurrency: ${maxConcurrency})`,
              );
            }
            if (currentMode === "thorough" && pendingTasks.length > 5) {
              optimizations.push("Switch to 'balanced' mode for faster batch processing");
            }
            return jsonResult({
              success: true,
              pending_tasks: pendingTasks.length,
              current_mode: currentMode,
              current_role: currentRole,
              optimizations,
              message:
                optimizations.length > 0
                  ? "Optimization suggestions available"
                  : "Workflow is optimized",
            });
          }

          case "get_performance_metrics": {
            const avgDuration =
              performanceMetrics.length > 0
                ? performanceMetrics.reduce((sum, m) => sum + (m.duration as number), 0) /
                  performanceMetrics.length
                : 0;
            return jsonResult({
              success: true,
              total_tasks: performanceMetrics.length,
              average_duration_ms: avgDuration,
              metrics_by_role: ROLE_TYPES.map((r) => {
                const roleTasks = performanceMetrics.filter((m) => m.role === r);
                return {
                  role: r,
                  count: roleTasks.length,
                  avg_duration_ms:
                    roleTasks.length > 0
                      ? roleTasks.reduce((sum, m) => sum + (m.duration as number), 0) /
                        roleTasks.length
                      : 0,
                };
              }),
              recent_metrics: performanceMetrics.slice(-10),
            });
          }

          case "batch_execute": {
            if (!batchTasks) {
              return jsonResult({ error: "batch_tasks is required for batch_execute" });
            }
            const taskDescriptions = JSON.parse(batchTasks) as Array<string>;
            const maxConcurrency = 3;
            if (taskDescriptions.length > maxConcurrency) {
              return jsonResult({
                error: `Batch size ${taskDescriptions.length} exceeds max concurrency ${maxConcurrency}`,
              });
            }
            const batchResults = taskDescriptions.map((desc) => {
              const id = `task_${Date.now()}_${Math.random().toString(36).slice(2)}`;
              const task = {
                description: desc,
                role: currentRole,
                mode: currentMode,
                priority: "medium",
                createdAt: new Date().toISOString(),
                status: "completed",
                completedAt: new Date().toISOString(),
              };
              tasks.set(id, task);
              return { task_id: id, description: desc, status: "completed" };
            });
            return jsonResult({
              success: true,
              message: `Batch executed ${batchResults.length} tasks`,
              results: batchResults,
              note: "Batch execution simulated (Roo Code not installed)",
            });
          }

          default:
            return jsonResult({ error: `Unknown action: ${action}` });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return jsonResult({ error: `Roo Code tool error: ${message}` });
      }
    },
  };

  return tool;
}
