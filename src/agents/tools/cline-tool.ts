/**
 * Cline integration tool – VS Code agent with audit trail and strict approval workflow.
 *
 * Cline provides "Plan and Act" workflow with full MCP integration,
 * standardized diff previews, and enterprise audit trail.
 */

import { Type } from "@sinclair/typebox";
import type { OpenClawConfig } from "../../config/config.js";
import { stringEnum } from "../schema/typebox.js";
import { type AnyAgentTool, jsonResult, readStringParam } from "./common.js";

const CLINE_ACTIONS = [
  "create_task",
  "plan_task",
  "execute_action",
  "preview_diff",
  "approve_action",
  "reject_action",
  "list_tasks",
  "get_audit_trail",
  "connect_mcp",
  "get_task_status",
] as const;

const ClineToolSchema = Type.Object({
  action: stringEnum(CLINE_ACTIONS),
  task_id: Type.Optional(Type.String({ description: "Task ID for operations." })),
  description: Type.Optional(Type.String({ description: "Task description." })),
  plan: Type.Optional(Type.String({ description: "Execution plan for the task." })),
  action_type: Type.Optional(
    Type.String({
      description: "Action type (e.g., 'edit_file', 'create_file', 'run_command', 'search').",
    }),
  ),
  file_path: Type.Optional(Type.String({ description: "File path for file operations." })),
  changes: Type.Optional(Type.String({ description: "Changes to apply (diff format)." })),
  command: Type.Optional(Type.String({ description: "Command to execute." })),
  mcp_server_url: Type.Optional(Type.String({ description: "MCP server URL to connect." })),
  approval_reason: Type.Optional(Type.String({ description: "Reason for approval/rejection." })),
});

type ClineConfig = {
  enabled: boolean;
  requireApproval?: boolean;
  auditEnabled?: boolean;
};

function resolveClineConfig(cfg: OpenClawConfig | undefined): ClineConfig {
  const toolsCfg = (cfg as Record<string, unknown> | undefined)?.tools as
    | Record<string, unknown>
    | undefined;
  const cline = toolsCfg?.cline as Record<string, unknown> | undefined;

  return {
    enabled: (cline?.enabled as boolean) ?? true,
    requireApproval: (cline?.requireApproval as boolean) ?? true,
    auditEnabled: (cline?.auditEnabled as boolean) ?? true,
  };
}

// In-memory stores
const tasks = new Map<string, Record<string, unknown>>();
const auditTrail: Array<Record<string, unknown>> = [];
const mcpConnections: Array<Record<string, unknown>> = [];

export function createClineTool(options?: { config?: OpenClawConfig }): AnyAgentTool {
  const tool: AnyAgentTool = {
    name: "cline",
    label: "Cline",
    description: [
      "VS Code agent with strict approval workflow and audit trail.",
      "Actions: create_task, plan_task, execute_action, preview_diff, approve_action,",
      "reject_action, list_tasks, get_audit_trail, connect_mcp, get_task_status.",
      "Provides Plan and Act workflow with MCP integration.",
    ].join(" "),
    parameters: ClineToolSchema,
    execute: async (_toolCallId, params: Record<string, unknown>) => {
      const config = resolveClineConfig(options?.config);

      if (!config.enabled) {
        return jsonResult({ error: "Cline integration is disabled in config." });
      }

      const action = readStringParam(params, "action", true);
      const taskId = readStringParam(params, "task_id");
      const description = readStringParam(params, "description");
      const plan = readStringParam(params, "plan");
      const actionType = readStringParam(params, "action_type");
      const filePath = readStringParam(params, "file_path");
      const changes = readStringParam(params, "changes");
      const command = readStringParam(params, "command");
      const mcpServerUrl = readStringParam(params, "mcp_server_url");
      const approvalReason = readStringParam(params, "approval_reason");

      try {
        switch (action) {
          case "create_task": {
            if (!description) {
              return jsonResult({ error: "description is required for create_task" });
            }
            const id = `task_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            tasks.set(id, {
              description,
              createdAt: new Date().toISOString(),
              status: "created",
              plan: null,
              actions: [],
              requiresApproval: config.requireApproval,
            });
            if (config.auditEnabled) {
              auditTrail.push({
                event: "task_created",
                taskId: id,
                description,
                timestamp: new Date().toISOString(),
              });
            }
            return jsonResult({
              success: true,
              task_id: id,
              message: `Task created: ${description}`,
            });
          }

          case "plan_task": {
            if (!taskId || !plan) {
              return jsonResult({
                error: "task_id and plan are required for plan_task",
              });
            }
            const task = tasks.get(taskId);
            if (!task) {
              return jsonResult({ error: `Task ${taskId} not found` });
            }
            task.plan = plan;
            task.status = "planned";
            task.plannedAt = new Date().toISOString();
            if (config.auditEnabled) {
              auditTrail.push({
                event: "task_planned",
                taskId,
                plan,
                timestamp: new Date().toISOString(),
              });
            }
            return jsonResult({
              success: true,
              message: "Task plan created",
              requires_approval: config.requireApproval,
            });
          }

          case "execute_action": {
            if (!taskId || !actionType) {
              return jsonResult({
                error: "task_id and action_type are required for execute_action",
              });
            }
            const task = tasks.get(taskId);
            if (!task) {
              return jsonResult({ error: `Task ${taskId} not found` });
            }
            const actionData: Record<string, unknown> = {
              type: actionType,
              timestamp: new Date().toISOString(),
              status: config.requireApproval ? "pending_approval" : "executed",
            };
            if (filePath) actionData.filePath = filePath;
            if (changes) actionData.changes = changes;
            if (command) actionData.command = command;
            (task.actions as Array<Record<string, unknown>>).push(actionData);
            if (config.auditEnabled) {
              auditTrail.push({
                event: "action_executed",
                taskId,
                actionType,
                ...actionData,
              });
            }
            return jsonResult({
              success: true,
              message: config.requireApproval
                ? "Action pending approval"
                : "Action executed",
              action: actionData,
              note: "Action execution simulated (Cline not installed)",
            });
          }

          case "preview_diff": {
            if (!taskId || !filePath) {
              return jsonResult({
                error: "task_id and file_path are required for preview_diff",
              });
            }
            const task = tasks.get(taskId);
            if (!task) {
              return jsonResult({ error: `Task ${taskId} not found` });
            }
            const diff = changes ?? `--- a/${filePath}\n+++ b/${filePath}\n@@ -1,1 +1,1 @@\n-old content\n+new content`;
            return jsonResult({
              success: true,
              file_path: filePath,
              diff,
              message: "Diff preview (simulated)",
            });
          }

          case "approve_action": {
            if (!taskId) {
              return jsonResult({ error: "task_id is required for approve_action" });
            }
            const task = tasks.get(taskId);
            if (!task) {
              return jsonResult({ error: `Task ${taskId} not found` });
            }
            const pendingActions = (task.actions as Array<Record<string, unknown>>).filter(
              (a) => a.status === "pending_approval",
            );
            for (const action of pendingActions) {
              action.status = "approved";
              action.approvedAt = new Date().toISOString();
              if (approvalReason) action.approvalReason = approvalReason;
            }
            if (config.auditEnabled) {
              auditTrail.push({
                event: "actions_approved",
                taskId,
                count: pendingActions.length,
                reason: approvalReason,
                timestamp: new Date().toISOString(),
              });
            }
            return jsonResult({
              success: true,
              message: `Approved ${pendingActions.length} action(s)`,
              approved_count: pendingActions.length,
            });
          }

          case "reject_action": {
            if (!taskId) {
              return jsonResult({ error: "task_id is required for reject_action" });
            }
            const task = tasks.get(taskId);
            if (!task) {
              return jsonResult({ error: `Task ${taskId} not found` });
            }
            const pendingActions = (task.actions as Array<Record<string, unknown>>).filter(
              (a) => a.status === "pending_approval",
            );
            for (const action of pendingActions) {
              action.status = "rejected";
              action.rejectedAt = new Date().toISOString();
              if (approvalReason) action.rejectionReason = approvalReason;
            }
            if (config.auditEnabled) {
              auditTrail.push({
                event: "actions_rejected",
                taskId,
                count: pendingActions.length,
                reason: approvalReason,
                timestamp: new Date().toISOString(),
              });
            }
            return jsonResult({
              success: true,
              message: `Rejected ${pendingActions.length} action(s)`,
              rejected_count: pendingActions.length,
            });
          }

          case "list_tasks": {
            const taskList = Array.from(tasks.entries()).map(([id, task]) => ({
              id,
              description: task.description,
              status: task.status,
              actionCount: (task.actions as Array<unknown>).length,
              createdAt: task.createdAt,
            }));
            return jsonResult({
              success: true,
              tasks: taskList,
              count: taskList.length,
            });
          }

          case "get_audit_trail": {
            if (!config.auditEnabled) {
              return jsonResult({ error: "Audit trail is disabled in config" });
            }
            const trail = taskId
              ? auditTrail.filter((entry) => entry.taskId === taskId)
              : auditTrail;
            return jsonResult({
              success: true,
              audit_trail: trail,
              count: trail.length,
            });
          }

          case "connect_mcp": {
            if (!mcpServerUrl) {
              return jsonResult({
                error: "mcp_server_url is required for connect_mcp",
              });
            }
            const connection = {
              url: mcpServerUrl,
              connectedAt: new Date().toISOString(),
              status: "connected",
            };
            mcpConnections.push(connection);
            return jsonResult({
              success: true,
              message: `Connected to MCP server: ${mcpServerUrl}`,
              connection,
              note: "MCP connection simulated (Cline not installed)",
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
              plan: task.plan,
              actions: task.actions,
            });
          }

          default:
            return jsonResult({ error: `Unknown action: ${action}` });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return jsonResult({ error: `Cline tool error: ${message}` });
      }
    },
  };

  return tool;
}
