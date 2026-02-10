/**
 * AutoGPT integration tool – autonomous task execution platform.
 *
 * AutoGPT provides low-code visual editor with block-based workflow building,
 * continuous cloud agents, and minimal technical barriers.
 */

import { Type } from "@sinclair/typebox";
import type { OpenClawConfig } from "../../config/config.js";
import { stringEnum } from "../schema/typebox.js";
import { type AnyAgentTool, jsonResult, readStringParam } from "./common.js";

const AUTOGPT_ACTIONS = [
  "create_agent",
  "add_block",
  "connect_blocks",
  "set_trigger",
  "start_agent",
  "stop_agent",
  "list_agents",
  "get_agent_status",
  "get_execution_history",
  "deploy_to_cloud",
] as const;

const AutoGPTToolSchema = Type.Object({
  action: stringEnum(AUTOGPT_ACTIONS),
  agent_id: Type.Optional(Type.String({ description: "Agent ID for operations." })),
  name: Type.Optional(Type.String({ description: "Name for the agent or block." })),
  block_id: Type.Optional(Type.String({ description: "Block ID within the agent workflow." })),
  block_type: Type.Optional(
    Type.String({
      description:
        "Block type (e.g., 'task', 'condition', 'loop', 'api_call', 'web_search').",
    }),
  ),
  source_block: Type.Optional(Type.String({ description: "Source block ID for connection." })),
  target_block: Type.Optional(Type.String({ description: "Target block ID for connection." })),
  trigger_type: Type.Optional(
    Type.String({
      description: "Trigger type (e.g., 'schedule', 'webhook', 'manual', 'event').",
    }),
  ),
  trigger_config: Type.Optional(
    Type.String({ description: "JSON configuration for the trigger." }),
  ),
  config: Type.Optional(Type.String({ description: "JSON configuration for block or agent." })),
});

type AutoGPTConfig = {
  enabled: boolean;
  cloudEndpoint?: string;
  apiKey?: string;
};

function resolveAutoGPTConfig(cfg: OpenClawConfig | undefined): AutoGPTConfig {
  const toolsCfg = (cfg as Record<string, unknown> | undefined)?.tools as
    | Record<string, unknown>
    | undefined;
  const autogpt = toolsCfg?.autogpt as Record<string, unknown> | undefined;

  return {
    enabled: (autogpt?.enabled as boolean) ?? true,
    cloudEndpoint:
      (autogpt?.cloudEndpoint as string) ??
      process.env.AUTOGPT_CLOUD_ENDPOINT ??
      "https://platform.autogpt.com",
    apiKey: (autogpt?.apiKey as string) ?? process.env.AUTOGPT_API_KEY,
  };
}

// In-memory stores
const agents = new Map<string, Record<string, unknown>>();
const blocks = new Map<string, Map<string, Record<string, unknown>>>();
const executions = new Map<string, Array<Record<string, unknown>>>();

export function createAutoGPTTool(options?: { config?: OpenClawConfig }): AnyAgentTool {
  const tool: AnyAgentTool = {
    name: "autogpt",
    label: "AutoGPT",
    description: [
      "Autonomous task execution platform with visual workflow builder.",
      "Actions: create_agent, add_block, connect_blocks, set_trigger, start_agent,",
      "stop_agent, list_agents, get_agent_status, get_execution_history, deploy_to_cloud.",
      "Build autonomous agents with block-based workflows.",
    ].join(" "),
    parameters: AutoGPTToolSchema,
    execute: async (_toolCallId, params: Record<string, unknown>) => {
      const config = resolveAutoGPTConfig(options?.config);

      if (!config.enabled) {
        return jsonResult({ error: "AutoGPT integration is disabled in config." });
      }

      const action = readStringParam(params, "action", true);
      const agentId = readStringParam(params, "agent_id");
      const name = readStringParam(params, "name");
      const blockId = readStringParam(params, "block_id");
      const blockType = readStringParam(params, "block_type");
      const sourceBlock = readStringParam(params, "source_block");
      const targetBlock = readStringParam(params, "target_block");
      const triggerType = readStringParam(params, "trigger_type");
      const triggerConfigStr = readStringParam(params, "trigger_config");
      const configStr = readStringParam(params, "config");

      try {
        switch (action) {
          case "create_agent": {
            if (!name) {
              return jsonResult({ error: "name is required for create_agent" });
            }
            const agentConfig = configStr ? JSON.parse(configStr) : {};
            const id = `agent_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            agents.set(id, {
              name,
              config: agentConfig,
              createdAt: new Date().toISOString(),
              status: "stopped",
              blocks: [],
              trigger: null,
            });
            blocks.set(id, new Map());
            executions.set(id, []);
            return jsonResult({
              success: true,
              agent_id: id,
              message: `Agent '${name}' created`,
            });
          }

          case "add_block": {
            if (!agentId || !blockType) {
              return jsonResult({
                error: "agent_id and block_type are required for add_block",
              });
            }
            const agent = agents.get(agentId);
            if (!agent) {
              return jsonResult({ error: `Agent ${agentId} not found` });
            }
            const agentBlocks = blocks.get(agentId) ?? new Map();
            const id = `block_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            const blockConfig = configStr ? JSON.parse(configStr) : {};
            agentBlocks.set(id, {
              id,
              type: blockType,
              name: name ?? blockType,
              config: blockConfig,
              createdAt: new Date().toISOString(),
            });
            blocks.set(agentId, agentBlocks);
            (agent.blocks as string[]).push(id);
            return jsonResult({
              success: true,
              block_id: id,
              message: `Block '${blockType}' added to agent`,
            });
          }

          case "connect_blocks": {
            if (!agentId || !sourceBlock || !targetBlock) {
              return jsonResult({
                error: "agent_id, source_block, and target_block are required for connect_blocks",
              });
            }
            const agent = agents.get(agentId);
            if (!agent) {
              return jsonResult({ error: `Agent ${agentId} not found` });
            }
            if (!agent.connections) {
              agent.connections = [];
            }
            (agent.connections as Array<Record<string, unknown>>).push({
              source: sourceBlock,
              target: targetBlock,
              createdAt: new Date().toISOString(),
            });
            return jsonResult({
              success: true,
              message: `Connected ${sourceBlock} -> ${targetBlock}`,
            });
          }

          case "set_trigger": {
            if (!agentId || !triggerType) {
              return jsonResult({
                error: "agent_id and trigger_type are required for set_trigger",
              });
            }
            const agent = agents.get(agentId);
            if (!agent) {
              return jsonResult({ error: `Agent ${agentId} not found` });
            }
            const triggerConfig = triggerConfigStr ? JSON.parse(triggerConfigStr) : {};
            agent.trigger = {
              type: triggerType,
              config: triggerConfig,
              setAt: new Date().toISOString(),
            };
            return jsonResult({
              success: true,
              message: `Trigger '${triggerType}' set for agent`,
            });
          }

          case "start_agent": {
            if (!agentId) {
              return jsonResult({ error: "agent_id is required for start_agent" });
            }
            const agent = agents.get(agentId);
            if (!agent) {
              return jsonResult({ error: `Agent ${agentId} not found` });
            }
            agent.status = "running";
            agent.startedAt = new Date().toISOString();
            const agentExecutions = executions.get(agentId) ?? [];
            agentExecutions.push({
              startedAt: new Date().toISOString(),
              status: "running",
            });
            executions.set(agentId, agentExecutions);
            return jsonResult({
              success: true,
              message: `Agent '${agent.name}' started`,
              note: "Agent execution simulated (AutoGPT not installed)",
            });
          }

          case "stop_agent": {
            if (!agentId) {
              return jsonResult({ error: "agent_id is required for stop_agent" });
            }
            const agent = agents.get(agentId);
            if (!agent) {
              return jsonResult({ error: `Agent ${agentId} not found` });
            }
            agent.status = "stopped";
            agent.stoppedAt = new Date().toISOString();
            return jsonResult({
              success: true,
              message: `Agent '${agent.name}' stopped`,
            });
          }

          case "list_agents": {
            const agentList = Array.from(agents.entries()).map(([id, agent]) => ({
              id,
              name: agent.name,
              status: agent.status,
              blockCount: (agent.blocks as string[]).length,
              trigger: agent.trigger,
              createdAt: agent.createdAt,
            }));
            return jsonResult({
              success: true,
              agents: agentList,
              count: agentList.length,
            });
          }

          case "get_agent_status": {
            if (!agentId) {
              return jsonResult({ error: "agent_id is required for get_agent_status" });
            }
            const agent = agents.get(agentId);
            if (!agent) {
              return jsonResult({ error: `Agent ${agentId} not found` });
            }
            return jsonResult({
              success: true,
              agent_id: agentId,
              status: agent.status,
              name: agent.name,
              startedAt: agent.startedAt,
              stoppedAt: agent.stoppedAt,
            });
          }

          case "get_execution_history": {
            if (!agentId) {
              return jsonResult({
                error: "agent_id is required for get_execution_history",
              });
            }
            const agentExecutions = executions.get(agentId) ?? [];
            return jsonResult({
              success: true,
              agent_id: agentId,
              executions: agentExecutions,
              count: agentExecutions.length,
            });
          }

          case "deploy_to_cloud": {
            if (!agentId) {
              return jsonResult({ error: "agent_id is required for deploy_to_cloud" });
            }
            const agent = agents.get(agentId);
            if (!agent) {
              return jsonResult({ error: `Agent ${agentId} not found` });
            }
            agent.cloudDeployment = {
              deployedAt: new Date().toISOString(),
              endpoint: `${config.cloudEndpoint}/agents/${agentId}`,
            };
            return jsonResult({
              success: true,
              message: `Agent deployed to cloud`,
              endpoint: `${config.cloudEndpoint}/agents/${agentId}`,
              note: "Cloud deployment simulated (AutoGPT cloud not configured)",
            });
          }

          default:
            return jsonResult({ error: `Unknown action: ${action}` });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return jsonResult({ error: `AutoGPT tool error: ${message}` });
      }
    },
  };

  return tool;
}
