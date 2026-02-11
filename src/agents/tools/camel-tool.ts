/**
 * CAMEL AI integration tool – multi-agent communication and negotiation framework.
 *
 * CAMEL (Communicative Agents for "Mind" Exploration of Large Language Model Society)
 * enables agent-to-agent negotiation, natural language reasoning, and collaborative
 * task solving with small footprint and minimal infrastructure.
 */

import { Type } from "@sinclair/typebox";
import type { OpenClawConfig } from "../../config/config.js";
import { stringEnum } from "../schema/typebox.js";
import { type AnyAgentTool, jsonResult, readStringParam } from "./common.js";

const CAMEL_ACTIONS = [
  "create_society",
  "create_agent",
  "initiate_communication",
  "negotiate",
  "generate_data",
  "list_societies",
  "list_agents",
  "get_conversation_history",
  "stop_communication",
] as const;

const CamelToolSchema = Type.Object({
  action: stringEnum(CAMEL_ACTIONS),
  society_id: Type.Optional(
    Type.String({ description: "Society ID for multi-agent collaboration." }),
  ),
  agent_id: Type.Optional(Type.String({ description: "Agent ID within the society." })),
  role: Type.Optional(
    Type.String({
      description: "Agent role (e.g., 'task_specifier', 'ai_user', 'ai_assistant').",
    }),
  ),
  task: Type.Optional(Type.String({ description: "Task description for the agents." })),
  message: Type.Optional(Type.String({ description: "Message for agent communication." })),
  max_turns: Type.Optional(
    Type.Number({ description: "Maximum conversation turns for negotiation." }),
  ),
  config: Type.Optional(
    Type.String({ description: "JSON configuration for society or agent creation." }),
  ),
});

type CamelConfig = {
  enabled: boolean;
  modelName?: string;
  temperature?: number;
  maxTokens?: number;
};

function resolveCamelConfig(cfg: OpenClawConfig | undefined): CamelConfig {
  const toolsCfg = (cfg as Record<string, unknown> | undefined)?.tools as
    | Record<string, unknown>
    | undefined;
  const camel = toolsCfg?.camel as Record<string, unknown> | undefined;

  return {
    enabled: (camel?.enabled as boolean) ?? true,
    modelName: (camel?.modelName as string) ?? process.env.CAMEL_MODEL ?? "gpt-4",
    temperature: (camel?.temperature as number) ?? 0.7,
    maxTokens: (camel?.maxTokens as number) ?? 2048,
  };
}

// In-memory stores
const societies = new Map<string, Record<string, unknown>>();
const agentsMap = new Map<string, Record<string, unknown>>();
const conversations = new Map<string, Array<Record<string, unknown>>>();

export function createCamelTool(options?: { config?: OpenClawConfig }): AnyAgentTool {
  const tool: AnyAgentTool = {
    name: "camel",
    label: "CAMEL AI",
    description: [
      "Multi-agent communication and negotiation framework.",
      "Actions: create_society, create_agent, initiate_communication, negotiate,",
      "generate_data, list_societies, list_agents, get_conversation_history, stop_communication.",
      "Enables agent-to-agent negotiation and collaborative problem solving.",
    ].join(" "),
    parameters: CamelToolSchema,
    execute: async (_toolCallId, params: Record<string, unknown>) => {
      const config = resolveCamelConfig(options?.config);

      if (!config.enabled) {
        return jsonResult({ error: "CAMEL AI integration is disabled in config." });
      }

      const action = readStringParam(params, "action", { required: true });
      const societyId = readStringParam(params, "society_id");
      const role = readStringParam(params, "role");
      const task = readStringParam(params, "task");
      const message = readStringParam(params, "message");
      const maxTurns = (params.max_turns as number) ?? 10;
      const configStr = readStringParam(params, "config");

      try {
        switch (action) {
          case "create_society": {
            if (!task) {
              return jsonResult({ error: "task is required for create_society" });
            }
            const societyConfig = configStr ? JSON.parse(configStr) : {};
            const id = `society_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            societies.set(id, {
              task,
              config: societyConfig,
              createdAt: new Date().toISOString(),
              agents: [],
              status: "active",
            });
            conversations.set(id, []);
            return jsonResult({
              success: true,
              society_id: id,
              message: `Society created for task: ${task}`,
            });
          }

          case "create_agent": {
            if (!societyId || !role) {
              return jsonResult({
                error: "society_id and role are required for create_agent",
              });
            }
            const society = societies.get(societyId);
            if (!society) {
              return jsonResult({ error: `Society ${societyId} not found` });
            }
            const id = `agent_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            const agent = {
              id,
              role,
              societyId,
              createdAt: new Date().toISOString(),
              model: config.modelName,
            };
            agentsMap.set(id, agent);
            (society.agents as string[]).push(id);
            return jsonResult({
              success: true,
              agent_id: id,
              message: `Agent with role '${role}' created in society ${societyId}`,
            });
          }

          case "initiate_communication": {
            if (!societyId || !message) {
              return jsonResult({
                error: "society_id and message are required for initiate_communication",
              });
            }
            const society = societies.get(societyId);
            if (!society) {
              return jsonResult({ error: `Society ${societyId} not found` });
            }
            const conv = conversations.get(societyId) ?? [];
            conv.push({
              timestamp: new Date().toISOString(),
              type: "initiation",
              message,
              speaker: "system",
            });
            conversations.set(societyId, conv);
            return jsonResult({
              success: true,
              message: "Communication initiated",
              conversation_length: conv.length,
            });
          }

          case "negotiate": {
            if (!societyId || !task) {
              return jsonResult({
                error: "society_id and task are required for negotiate",
              });
            }
            const society = societies.get(societyId);
            if (!society) {
              return jsonResult({ error: `Society ${societyId} not found` });
            }
            const conv = conversations.get(societyId) ?? [];
            // Simulate negotiation turns
            for (let i = 0; i < Math.min(maxTurns, 5); i++) {
              conv.push({
                timestamp: new Date().toISOString(),
                turn: i + 1,
                speaker: i % 2 === 0 ? "ai_user" : "ai_assistant",
                message: `Negotiation turn ${i + 1} for: ${task}`,
              });
            }
            conversations.set(societyId, conv);
            return jsonResult({
              success: true,
              message: `Negotiation completed with ${Math.min(maxTurns, 5)} turns`,
              conversation_length: conv.length,
              note: "Negotiation simulated (CAMEL library not installed)",
            });
          }

          case "generate_data": {
            if (!task) {
              return jsonResult({ error: "task is required for generate_data" });
            }
            const dataPoints = [];
            for (let i = 0; i < 5; i++) {
              dataPoints.push({
                id: i + 1,
                task,
                generated: `Sample data point ${i + 1} for ${task}`,
                timestamp: new Date().toISOString(),
              });
            }
            return jsonResult({
              success: true,
              data_points: dataPoints,
              count: dataPoints.length,
              message: "Data generation simulated (CAMEL library not installed)",
            });
          }

          case "list_societies": {
            const societyList = Array.from(societies.entries()).map(([id, society]) => ({
              id,
              task: society.task,
              status: society.status,
              agentCount: (society.agents as string[]).length,
              createdAt: society.createdAt,
            }));
            return jsonResult({
              success: true,
              societies: societyList,
              count: societyList.length,
            });
          }

          case "list_agents": {
            let agentList;
            if (societyId) {
              const society = societies.get(societyId);
              if (!society) {
                return jsonResult({ error: `Society ${societyId} not found` });
              }
              agentList = (society.agents as string[])
                .map((id) => {
                  const agent = agentsMap.get(id);
                  return agent
                    ? { id, role: agent.role, model: agent.model, createdAt: agent.createdAt }
                    : null;
                })
                .filter(Boolean);
            } else {
              agentList = Array.from(agentsMap.values()).map((agent) => ({
                id: agent.id,
                role: agent.role,
                societyId: agent.societyId,
                model: agent.model,
                createdAt: agent.createdAt,
              }));
            }
            return jsonResult({
              success: true,
              agents: agentList,
              count: agentList.length,
            });
          }

          case "get_conversation_history": {
            if (!societyId) {
              return jsonResult({
                error: "society_id is required for get_conversation_history",
              });
            }
            const conv = conversations.get(societyId) ?? [];
            return jsonResult({
              success: true,
              society_id: societyId,
              conversation: conv,
              length: conv.length,
            });
          }

          case "stop_communication": {
            if (!societyId) {
              return jsonResult({
                error: "society_id is required for stop_communication",
              });
            }
            const society = societies.get(societyId);
            if (!society) {
              return jsonResult({ error: `Society ${societyId} not found` });
            }
            society.status = "stopped";
            return jsonResult({
              success: true,
              message: `Communication stopped for society ${societyId}`,
            });
          }

          default:
            return jsonResult({ error: `Unknown action: ${action}` });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return jsonResult({ error: `CAMEL tool error: ${message}` });
      }
    },
  };

  return tool;
}
