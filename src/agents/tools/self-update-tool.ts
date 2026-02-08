/**
 * Self-update tool – lets the agent discover, track, and manage
 * potential improvement proposals through the self-update system.
 *
 * Exposes the proposal lifecycle: discover → analyze → test →
 * approve/reject → apply, with safety checks at each stage.
 */

import { Type } from "@sinclair/typebox";
import {
  approveProposal,
  discoverUpdate,
  getProposal,
  getSelfUpdateConfig,
  listProposals,
  rejectProposal,
  runSafetyCheck,
  updateProposalStatus,
} from "../../self-update/update-monitor.js";
import { stringEnum, optionalStringEnum } from "../schema/typebox.js";
import { type AnyAgentTool, jsonResult, readStringParam } from "./common.js";

const SELF_UPDATE_ACTIONS = [
  "status",
  "discover",
  "list",
  "get",
  "safety_check",
  "approve",
  "reject",
  "update_status",
] as const;

const UPDATE_CATEGORIES = [
  "model",
  "performance",
  "security",
  "feature",
  "bugfix",
  "dependency",
] as const;

const UPDATE_STATUSES = [
  "discovered",
  "analyzing",
  "testing",
  "awaiting_approval",
  "approved",
  "rejected",
  "applied",
  "failed",
] as const;

const SelfUpdateToolSchema = Type.Object({
  action: stringEnum(SELF_UPDATE_ACTIONS),
  proposal_id: Type.Optional(
    Type.String({
      description: "Proposal ID (for get/safety_check/approve/reject/update_status).",
    }),
  ),
  title: Type.Optional(Type.String({ description: "Title for a new update proposal." })),
  description: Type.Optional(Type.String({ description: "Description of the proposed update." })),
  category: optionalStringEnum(UPDATE_CATEGORIES),
  source: Type.Optional(
    Type.String({ description: "Source where the improvement was discovered." }),
  ),
  impact: optionalStringEnum(["low", "medium", "high"]),
  risk: optionalStringEnum(["low", "medium", "high"]),
  new_status: optionalStringEnum(UPDATE_STATUSES),
  reason: Type.Optional(Type.String({ description: "Reason for rejection." })),
  filter_status: optionalStringEnum(UPDATE_STATUSES),
  filter_category: optionalStringEnum(UPDATE_CATEGORIES),
});

export function createSelfUpdateTool(): AnyAgentTool {
  const tool: AnyAgentTool = {
    name: "self_update",
    label: "Self-Update",
    description: [
      "Manage self-improvement proposals through a structured workflow.",
      "Actions: status (show config), discover (register new improvement),",
      "list (show proposals), get (details), safety_check (run checks),",
      "approve, reject, update_status.",
      "Proposals flow: discovered → analyzing → testing → awaiting_approval → approved → applied.",
    ].join(" "),
    parameters: SelfUpdateToolSchema,
    execute: async (_toolCallId, params: Record<string, unknown>) => {
      const action = readStringParam(params, "action", {
        required: true,
      }) as (typeof SELF_UPDATE_ACTIONS)[number];

      try {
        switch (action) {
          case "status": {
            return jsonResult({ config: getSelfUpdateConfig() });
          }

          case "discover": {
            const title = readStringParam(params, "title", { required: true });
            const description = readStringParam(params, "description", { required: true });
            const category = (params.category as string) ?? "feature";
            const source = (params.source as string) ?? "agent-discovery";
            const impact = (params.impact as string) ?? "low";
            const risk = (params.risk as string) ?? "low";
            const proposal = discoverUpdate({
              title,
              description,
              category: category as (typeof UPDATE_CATEGORIES)[number],
              source,
              impact: impact as "low" | "medium" | "high",
              risk: risk as "low" | "medium" | "high",
            });
            if (!proposal) {
              return jsonResult({
                error: "Failed to register proposal (system may be disabled or at capacity).",
              });
            }
            return jsonResult({ proposal });
          }

          case "list": {
            const status = params.filter_status as string | undefined;
            const category = params.filter_category as string | undefined;
            const proposals = listProposals({
              status: status as (typeof UPDATE_STATUSES)[number] | undefined,
              category: category as (typeof UPDATE_CATEGORIES)[number] | undefined,
            });
            return jsonResult({ count: proposals.length, proposals });
          }

          case "get": {
            const id = readStringParam(params, "proposal_id", { required: true });
            const proposal = getProposal(id);
            if (!proposal) {
              return jsonResult({ error: `Proposal not found: ${id}` });
            }
            return jsonResult({ proposal });
          }

          case "safety_check": {
            const id = readStringParam(params, "proposal_id", { required: true });
            const result = runSafetyCheck(id);
            if (!result) {
              return jsonResult({ error: `Proposal not found: ${id}` });
            }
            return jsonResult({ safetyCheck: result });
          }

          case "approve": {
            const id = readStringParam(params, "proposal_id", { required: true });
            const proposal = approveProposal(id);
            if (!proposal) {
              return jsonResult({
                error: `Cannot approve proposal: ${id} (not in awaiting_approval status)`,
              });
            }
            return jsonResult({ proposal });
          }

          case "reject": {
            const id = readStringParam(params, "proposal_id", { required: true });
            const reason = readStringParam(params, "reason", { required: true });
            const proposal = rejectProposal(id, reason);
            if (!proposal) {
              return jsonResult({ error: `Proposal not found: ${id}` });
            }
            return jsonResult({ proposal });
          }

          case "update_status": {
            const id = readStringParam(params, "proposal_id", { required: true });
            const newStatus = readStringParam(params, "new_status", { required: true });
            const proposal = updateProposalStatus(
              id,
              newStatus as (typeof UPDATE_STATUSES)[number],
            );
            if (!proposal) {
              return jsonResult({ error: `Proposal not found: ${id}` });
            }
            return jsonResult({ proposal });
          }

          default:
            return jsonResult({ error: `Unknown action: ${String(action)}` });
        }
      } catch (err) {
        return jsonResult({
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
  };
  return tool;
}
