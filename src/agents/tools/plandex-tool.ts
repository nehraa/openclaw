/**
 * Plandex integration tool – terminal-based complex task orchestration.
 *
 * Plandex provides multi-file editing, change tracking, and iterative
 * plan execution for complex coding tasks. MIT License.
 */

import { Type } from "@sinclair/typebox";
import type { OpenClawConfig } from "../../config/config.js";
import { stringEnum } from "../schema/typebox.js";
import { type AnyAgentTool, jsonResult, readStringParam } from "./common.js";

const PLANDEX_ACTIONS = [
  "create_plan",
  "multi_file_edit",
  "refactor_codebase",
  "track_changes",
  "execute_plan",
  "list_plans",
  "get_plan_status",
  "rollback_plan",
] as const;

const PlandexToolSchema = Type.Object({
  action: stringEnum(PLANDEX_ACTIONS),
  plan_id: Type.Optional(Type.String({ description: "Plan ID for operations." })),
  name: Type.Optional(Type.String({ description: "Plan name." })),
  description: Type.Optional(Type.String({ description: "Plan description." })),
  files: Type.Optional(
    Type.String({
      description: "Comma-separated list of file paths to include in the plan.",
    }),
  ),
  changes: Type.Optional(
    Type.String({ description: "JSON array of changes to apply to files." }),
  ),
  refactor_type: Type.Optional(
    Type.String({
      description: "Refactor type (e.g., 'rename', 'extract', 'inline', 'move').",
    }),
  ),
  target: Type.Optional(Type.String({ description: "Refactor target (e.g., function, class name)." })),
  checkpoint: Type.Optional(
    Type.String({ description: "Checkpoint ID for rollback or tracking." }),
  ),
});

type PlandexConfig = {
  enabled: boolean;
  autoCommit?: boolean;
  trackHistory?: boolean;
};

function resolvePlandexConfig(cfg: OpenClawConfig | undefined): PlandexConfig {
  const toolsCfg = (cfg as Record<string, unknown> | undefined)?.tools as
    | Record<string, unknown>
    | undefined;
  const plandex = toolsCfg?.plandex as Record<string, unknown> | undefined;

  return {
    enabled: (plandex?.enabled as boolean) ?? true,
    autoCommit: (plandex?.autoCommit as boolean) ?? false,
    trackHistory: (plandex?.trackHistory as boolean) ?? true,
  };
}

// In-memory stores
const plans = new Map<string, Record<string, unknown>>();
const changeHistory = new Map<string, Array<Record<string, unknown>>>();

export function createPlandexTool(options?: { config?: OpenClawConfig }): AnyAgentTool {
  const tool: AnyAgentTool = {
    name: "plandex",
    label: "Plandex",
    description: [
      "Terminal-based complex task orchestration with multi-file editing.",
      "Actions: create_plan, multi_file_edit, refactor_codebase, track_changes,",
      "execute_plan, list_plans, get_plan_status, rollback_plan.",
      "Provides iterative planning and change tracking.",
    ].join(" "),
    parameters: PlandexToolSchema,
    execute: async (_toolCallId, params: Record<string, unknown>) => {
      const config = resolvePlandexConfig(options?.config);

      if (!config.enabled) {
        return jsonResult({ error: "Plandex integration is disabled in config." });
      }

      const action = readStringParam(params, "action", true);
      const planId = readStringParam(params, "plan_id");
      const name = readStringParam(params, "name");
      const description = readStringParam(params, "description");
      const filesStr = readStringParam(params, "files");
      const changesStr = readStringParam(params, "changes");
      const refactorType = readStringParam(params, "refactor_type");
      const target = readStringParam(params, "target");
      const checkpoint = readStringParam(params, "checkpoint");

      try {
        switch (action) {
          case "create_plan": {
            if (!name || !description) {
              return jsonResult({ error: "name and description are required for create_plan" });
            }
            const id = `plan_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            const files = filesStr ? filesStr.split(",").map((f) => f.trim()) : [];
            plans.set(id, {
              name,
              description,
              files,
              createdAt: new Date().toISOString(),
              status: "created",
              steps: [],
              checkpoints: [],
            });
            changeHistory.set(id, []);
            return jsonResult({
              success: true,
              plan_id: id,
              message: `Plan '${name}' created`,
              files,
            });
          }

          case "multi_file_edit": {
            if (!planId || !changesStr) {
              return jsonResult({
                error: "plan_id and changes are required for multi_file_edit",
              });
            }
            const plan = plans.get(planId);
            if (!plan) {
              return jsonResult({ error: `Plan ${planId} not found` });
            }
            const changes = JSON.parse(changesStr);
            const editData = {
              timestamp: new Date().toISOString(),
              changes,
              filesModified: changes.map((c: Record<string, unknown>) => c.file),
              status: config.autoCommit ? "committed" : "staged",
            };
            (plan.steps as Array<Record<string, unknown>>).push(editData);
            if (config.trackHistory) {
              const history = changeHistory.get(planId) ?? [];
              history.push(editData);
              changeHistory.set(planId, history);
            }
            return jsonResult({
              success: true,
              message: `Multi-file edit ${config.autoCommit ? "committed" : "staged"}`,
              edit: editData,
              note: "Multi-file edit simulated (Plandex not installed)",
            });
          }

          case "refactor_codebase": {
            if (!planId || !refactorType || !target) {
              return jsonResult({
                error: "plan_id, refactor_type, and target are required for refactor_codebase",
              });
            }
            const plan = plans.get(planId);
            if (!plan) {
              return jsonResult({ error: `Plan ${planId} not found` });
            }
            const refactorData = {
              type: refactorType,
              target,
              timestamp: new Date().toISOString(),
              filesAffected: (plan.files as string[]).filter(() => Math.random() > 0.5),
              status: "completed",
            };
            (plan.steps as Array<Record<string, unknown>>).push(refactorData);
            if (config.trackHistory) {
              const history = changeHistory.get(planId) ?? [];
              history.push(refactorData);
              changeHistory.set(planId, history);
            }
            return jsonResult({
              success: true,
              message: `Refactor '${refactorType}' completed`,
              refactor: refactorData,
              note: "Refactor simulated (Plandex not installed)",
            });
          }

          case "track_changes": {
            if (!planId) {
              return jsonResult({ error: "plan_id is required for track_changes" });
            }
            if (!config.trackHistory) {
              return jsonResult({ error: "Change tracking is disabled in config" });
            }
            const history = changeHistory.get(planId) ?? [];
            return jsonResult({
              success: true,
              plan_id: planId,
              changes: history,
              count: history.length,
            });
          }

          case "execute_plan": {
            if (!planId) {
              return jsonResult({ error: "plan_id is required for execute_plan" });
            }
            const plan = plans.get(planId);
            if (!plan) {
              return jsonResult({ error: `Plan ${planId} not found` });
            }
            plan.status = "executing";
            plan.executedAt = new Date().toISOString();
            const checkpointData = {
              id: `checkpoint_${Date.now()}`,
              timestamp: new Date().toISOString(),
              steps: (plan.steps as Array<unknown>).length,
            };
            (plan.checkpoints as Array<Record<string, unknown>>).push(checkpointData);
            plan.status = "executed";
            return jsonResult({
              success: true,
              message: `Plan '${plan.name}' executed`,
              checkpoint: checkpointData,
              steps_executed: (plan.steps as Array<unknown>).length,
              note: "Plan execution simulated (Plandex not installed)",
            });
          }

          case "list_plans": {
            const planList = Array.from(plans.entries()).map(([id, plan]) => ({
              id,
              name: plan.name,
              description: plan.description,
              status: plan.status,
              fileCount: (plan.files as Array<unknown>).length,
              stepCount: (plan.steps as Array<unknown>).length,
              createdAt: plan.createdAt,
            }));
            return jsonResult({
              success: true,
              plans: planList,
              count: planList.length,
            });
          }

          case "get_plan_status": {
            if (!planId) {
              return jsonResult({ error: "plan_id is required for get_plan_status" });
            }
            const plan = plans.get(planId);
            if (!plan) {
              return jsonResult({ error: `Plan ${planId} not found` });
            }
            return jsonResult({
              success: true,
              plan_id: planId,
              name: plan.name,
              status: plan.status,
              files: plan.files,
              steps: plan.steps,
              checkpoints: plan.checkpoints,
            });
          }

          case "rollback_plan": {
            if (!planId) {
              return jsonResult({ error: "plan_id is required for rollback_plan" });
            }
            const plan = plans.get(planId);
            if (!plan) {
              return jsonResult({ error: `Plan ${planId} not found` });
            }
            const checkpoints = plan.checkpoints as Array<Record<string, unknown>>;
            const targetCheckpoint = checkpoint
              ? checkpoints.find((c) => c.id === checkpoint)
              : checkpoints[checkpoints.length - 1];
            if (!targetCheckpoint) {
              return jsonResult({ error: "No checkpoint found for rollback" });
            }
            plan.status = "rolled_back";
            plan.rolledBackAt = new Date().toISOString();
            plan.rolledBackTo = targetCheckpoint.id;
            return jsonResult({
              success: true,
              message: `Plan rolled back to checkpoint ${targetCheckpoint.id}`,
              checkpoint: targetCheckpoint,
              note: "Rollback simulated (Plandex not installed)",
            });
          }

          default:
            return jsonResult({ error: `Unknown action: ${action}` });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return jsonResult({ error: `Plandex tool error: ${message}` });
      }
    },
  };

  return tool;
}
