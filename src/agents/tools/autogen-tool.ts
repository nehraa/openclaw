/**
 * AutoGen integration tool – lets the agent create and manage conversational
 * multi-agent systems with group chat orchestration and human-in-the-loop.
 *
 * AutoGen (Microsoft) enables group chat with 10+ agent swarms, human intervention,
 * and code execution sandboxes.
 */

import { Type } from "@sinclair/typebox";
import type { OpenClawConfig } from "../../config/config.js";
import { stringEnum } from "../schema/typebox.js";
import { type AnyAgentTool, jsonResult, readStringParam } from "./common.js";

const AUTOGEN_ACTIONS = [
  "create_agent",
  "create_group_chat",
  "add_agent_to_chat",
  "send_message",
  "execute_code",
  "list_agents",
  "list_chats",
  "get_chat_history",
  "set_human_input_mode",
  "approve_action",
  "reject_action",
] as const;

const AutoGenToolSchema = Type.Object({
  action: stringEnum(AUTOGEN_ACTIONS),
  name: Type.Optional(
    Type.String({ description: "Name of the agent or group chat to create." }),
  ),
  agent_id: Type.Optional(
    Type.String({ description: "Agent ID for operations." }),
  ),
  chat_id: Type.Optional(
    Type.String({ description: "Group chat ID for operations." }),
  ),
  role: Type.Optional(
    Type.String({
      description:
        "Agent role: 'assistant', 'user_proxy', 'code_executor', or 'function_executor'.",
    }),
  ),
  system_message: Type.Optional(
    Type.String({ description: "System message/prompt for the agent." }),
  ),
  message: Type.Optional(
    Type.String({ description: "Message to send to the group chat." }),
  ),
  code: Type.Optional(
    Type.String({ description: "Code to execute in sandbox." }),
  ),
  language: Type.Optional(
    Type.String({ description: "Programming language for code execution (default: 'python')." }),
  ),
  human_input_mode: Type.Optional(
    Type.String({
      description: "Human input mode: 'ALWAYS', 'NEVER', or 'TERMINATE' (default).",
    }),
  ),
  action_id: Type.Optional(
    Type.String({ description: "Action ID for approval/rejection." }),
  ),
  max_consecutive_auto_reply: Type.Optional(
    Type.Number({ description: "Max auto-replies before requiring human input.", minimum: 1 }),
  ),
});

type AutoGenConfig = {
  enabled: boolean;
  defaultModel?: string;
  maxAgentsPerChat?: number;
  enableCodeExecution?: boolean;
};

/**
 * Resolve AutoGen configuration from OpenClaw config.
 */
function resolveAutoGenConfig(cfg: OpenClawConfig | undefined): AutoGenConfig {
  const toolsCfg = (cfg as Record<string, unknown> | undefined)?.tools as
    | Record<string, unknown>
    | undefined;
  const autogen = toolsCfg?.autogen as Record<string, unknown> | undefined;

  return {
    enabled: (autogen?.enabled as boolean) ?? true,
    defaultModel: (autogen?.defaultModel as string) ?? process.env.AUTOGEN_MODEL ?? "gpt-4",
    maxAgentsPerChat: (autogen?.maxAgentsPerChat as number) ?? 10,
    enableCodeExecution: (autogen?.enableCodeExecution as boolean) ?? false,
  };
}

// In-memory stores
const agents = new Map<
  string,
  {
    name: string;
    role: string;
    systemMessage?: string;
    model?: string;
    humanInputMode: string;
    maxConsecutiveAutoReply: number;
    createdAt: string;
  }
>();

const groupChats = new Map<
  string,
  {
    name: string;
    agents: string[];
    messages: Array<{ sender: string; content: string; timestamp: string }>;
    createdAt: string;
  }
>();

const pendingActions = new Map<
  string,
  {
    type: string;
    data: unknown;
    status: "pending" | "approved" | "rejected";
    createdAt: string;
  }
>();

export function createAutoGenTool(options?: { config?: OpenClawConfig }): AnyAgentTool {
  const tool: AnyAgentTool = {
    name: "autogen",
    label: "AutoGen Group Chat",
    description: [
      "Create and manage conversational multi-agent systems with group chat orchestration.",
      "Actions: create_agent, create_group_chat, add_agent_to_chat, send_message, execute_code,",
      "list_agents, list_chats, get_chat_history, set_human_input_mode, approve_action, reject_action.",
      "Use create_agent with roles like 'assistant', 'user_proxy', 'code_executor'.",
      "Use create_group_chat to build agent swarms with up to 10+ agents.",
    ].join(" "),
    parameters: AutoGenToolSchema,
    execute: async (_toolCallId, params: Record<string, unknown>) => {
      const config = resolveAutoGenConfig(options?.config);

      if (!config.enabled) {
        return jsonResult({ error: "AutoGen integration is disabled in config." });
      }

      const action = readStringParam(params, "action", true);
      const name = readStringParam(params, "name");
      const agentId = readStringParam(params, "agent_id");
      const chatId = readStringParam(params, "chat_id");
      const role = readStringParam(params, "role");
      const systemMessage = readStringParam(params, "system_message");
      const message = readStringParam(params, "message");
      const code = readStringParam(params, "code");
      const language = readStringParam(params, "language") ?? "python";
      const humanInputMode = readStringParam(params, "human_input_mode") ?? "TERMINATE";
      const actionId = readStringParam(params, "action_id");
      const maxConsecutiveAutoReply =
        (params.max_consecutive_auto_reply as number | undefined) ?? 10;

      try {
        switch (action) {
          case "create_agent": {
            if (!name || !role) {
              return jsonResult({ error: "name and role are required for create_agent" });
            }
            const id = `agent_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            agents.set(id, {
              name,
              role,
              systemMessage,
              model: config.defaultModel,
              humanInputMode,
              maxConsecutiveAutoReply,
              createdAt: new Date().toISOString(),
            });
            return jsonResult({
              success: true,
              agent_id: id,
              message: `Agent '${name}' created with role '${role}'`,
            });
          }

          case "create_group_chat": {
            if (!name) {
              return jsonResult({ error: "name is required for create_group_chat" });
            }
            const id = `chat_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            groupChats.set(id, {
              name,
              agents: [],
              messages: [],
              createdAt: new Date().toISOString(),
            });
            return jsonResult({
              success: true,
              chat_id: id,
              message: `Group chat '${name}' created`,
            });
          }

          case "add_agent_to_chat": {
            if (!chatId || !agentId) {
              return jsonResult({
                error: "chat_id and agent_id are required for add_agent_to_chat",
              });
            }
            const chat = groupChats.get(chatId);
            if (!chat) {
              return jsonResult({ error: `Chat ${chatId} not found` });
            }
            const agent = agents.get(agentId);
            if (!agent) {
              return jsonResult({ error: `Agent ${agentId} not found` });
            }
            if (chat.agents.length >= config.maxAgentsPerChat!) {
              return jsonResult({
                error: `Chat has reached max agents limit (${config.maxAgentsPerChat})`,
              });
            }
            if (!chat.agents.includes(agentId)) {
              chat.agents.push(agentId);
            }
            return jsonResult({
              success: true,
              message: `Agent '${agent.name}' added to chat '${chat.name}'`,
            });
          }

          case "send_message": {
            if (!chatId || !message) {
              return jsonResult({ error: "chat_id and message are required for send_message" });
            }
            const chat = groupChats.get(chatId);
            if (!chat) {
              return jsonResult({ error: `Chat ${chatId} not found` });
            }
            chat.messages.push({
              sender: agentId ?? "user",
              content: message,
              timestamp: new Date().toISOString(),
            });
            return jsonResult({
              success: true,
              chat_id: chatId,
              message: "Message sent to group chat",
              note: "Agent responses simulated (AutoGen library not installed)",
            });
          }

          case "execute_code": {
            if (!code) {
              return jsonResult({ error: "code is required for execute_code" });
            }
            if (!config.enableCodeExecution) {
              return jsonResult({ error: "Code execution is disabled in config" });
            }
            const executionId = `exec_${Date.now()}`;
            return jsonResult({
              success: true,
              execution_id: executionId,
              language,
              output: "Code execution simulated (AutoGen library not installed)",
              note: "Real execution would run in sandboxed environment",
            });
          }

          case "list_agents": {
            const agentList = Array.from(agents.entries()).map(([id, agent]) => ({
              id,
              name: agent.name,
              role: agent.role,
              humanInputMode: agent.humanInputMode,
              createdAt: agent.createdAt,
            }));
            return jsonResult({
              success: true,
              agents: agentList,
              count: agentList.length,
            });
          }

          case "list_chats": {
            const chatList = Array.from(groupChats.entries()).map(([id, chat]) => ({
              id,
              name: chat.name,
              agentCount: chat.agents.length,
              messageCount: chat.messages.length,
              createdAt: chat.createdAt,
            }));
            return jsonResult({
              success: true,
              chats: chatList,
              count: chatList.length,
            });
          }

          case "get_chat_history": {
            if (!chatId) {
              return jsonResult({ error: "chat_id is required for get_chat_history" });
            }
            const chat = groupChats.get(chatId);
            if (!chat) {
              return jsonResult({ error: `Chat ${chatId} not found` });
            }
            return jsonResult({
              success: true,
              chat_id: chatId,
              history: chat.messages,
              count: chat.messages.length,
            });
          }

          case "set_human_input_mode": {
            if (!agentId || !humanInputMode) {
              return jsonResult({
                error: "agent_id and human_input_mode are required for set_human_input_mode",
              });
            }
            const agent = agents.get(agentId);
            if (!agent) {
              return jsonResult({ error: `Agent ${agentId} not found` });
            }
            agent.humanInputMode = humanInputMode;
            return jsonResult({
              success: true,
              message: `Human input mode set to '${humanInputMode}' for agent '${agent.name}'`,
            });
          }

          case "approve_action": {
            if (!actionId) {
              return jsonResult({ error: "action_id is required for approve_action" });
            }
            const pendingAction = pendingActions.get(actionId);
            if (!pendingAction) {
              return jsonResult({ error: `Action ${actionId} not found` });
            }
            pendingAction.status = "approved";
            return jsonResult({
              success: true,
              action_id: actionId,
              message: "Action approved",
            });
          }

          case "reject_action": {
            if (!actionId) {
              return jsonResult({ error: "action_id is required for reject_action" });
            }
            const pendingAction = pendingActions.get(actionId);
            if (!pendingAction) {
              return jsonResult({ error: `Action ${actionId} not found` });
            }
            pendingAction.status = "rejected";
            return jsonResult({
              success: true,
              action_id: actionId,
              message: "Action rejected",
            });
          }

          default:
            return jsonResult({ error: `Unknown action: ${action}` });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return jsonResult({ error: `AutoGen tool error: ${message}` });
      }
    },
  };

  return tool;
}
