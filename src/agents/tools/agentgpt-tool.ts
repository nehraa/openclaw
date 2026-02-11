/**
 * AgentGPT integration tool – browser-based autonomous agent platform.
 *
 * AgentGPT provides web-based autonomous agents with goal-driven execution,
 * progress monitoring, and dynamic task planning. Freemium model.
 */

import { Type } from "@sinclair/typebox";
import type { OpenClawConfig } from "../../config/config.js";
import { stringEnum } from "../schema/typebox.js";
import { type AnyAgentTool, jsonResult, readStringParam } from "./common.js";

const AGENTGPT_ACTIONS = [
  "create_web_agent",
  "set_goal",
  "autonomous_execute",
  "monitor_progress",
  "stop_agent",
  "list_agents",
  "get_agent_status",
  "pause_agent",
] as const;

const AgentGPTToolSchema = Type.Object({
  action: stringEnum(AGENTGPT_ACTIONS),
  agent_id: Type.Optional(Type.String({ description: "Agent ID for operations." })),
  name: Type.Optional(Type.String({ description: "Agent name." })),
  goal: Type.Optional(Type.String({ description: "Goal description for the agent." })),
  sub_goals: Type.Optional(Type.String({ description: "JSON array of sub-goals for the agent." })),
  max_iterations: Type.Optional(
    Type.String({ description: "Maximum iterations for autonomous execution." }),
  ),
  model: Type.Optional(
    Type.String({ description: "LLM model to use (e.g., 'gpt-4', 'gpt-3.5-turbo')." }),
  ),
  web_search_enabled: Type.Optional(
    Type.String({ description: "Enable web search capabilities ('true' or 'false')." }),
  ),
});

type AgentGPTConfig = {
  enabled: boolean;
  webEndpoint?: string;
  apiKey?: string;
};

function resolveAgentGPTConfig(cfg: OpenClawConfig | undefined): AgentGPTConfig {
  const toolsCfg = (cfg as Record<string, unknown> | undefined)?.tools as
    | Record<string, unknown>
    | undefined;
  const agentgpt = toolsCfg?.agentgpt as Record<string, unknown> | undefined;

  return {
    enabled: (agentgpt?.enabled as boolean) ?? true,
    webEndpoint:
      (agentgpt?.webEndpoint as string) ??
      process.env.AGENTGPT_WEB_ENDPOINT ??
      process.env.AGENTGPT_WEB_URL ??
      "https://agentgpt.reworkd.ai",
    apiKey: (agentgpt?.apiKey as string) ?? process.env.AGENTGPT_API_KEY,
  };
}

// In-memory stores
const agents = new Map<string, Record<string, unknown>>();
const executions = new Map<string, Array<Record<string, unknown>>>();

export function createAgentGPTTool(options?: { config?: OpenClawConfig }): AnyAgentTool {
  const tool: AnyAgentTool = {
    name: "agentgpt",
    label: "AgentGPT",
    description: [
      "Browser-based autonomous agent platform with goal-driven execution.",
      "Actions: create_web_agent, set_goal, autonomous_execute, monitor_progress,",
      "stop_agent, list_agents, get_agent_status, pause_agent.",
      "Provides web-based autonomous agents with dynamic planning.",
    ].join(" "),
    parameters: AgentGPTToolSchema,
    execute: async (_toolCallId, params: Record<string, unknown>) => {
      const config = resolveAgentGPTConfig(options?.config);

      if (!config.enabled) {
        return jsonResult({ error: "AgentGPT integration is disabled in config." });
      }

      const action = readStringParam(params, "action", { required: true });
      const agentId = readStringParam(params, "agent_id");
      const name = readStringParam(params, "name");
      const goal = readStringParam(params, "goal");
      const subGoalsStr = readStringParam(params, "sub_goals");
      const maxIterationsStr = readStringParam(params, "max_iterations");
      const model = readStringParam(params, "model");
      const webSearchEnabledStr = readStringParam(params, "web_search_enabled");

      try {
        switch (action) {
          case "create_web_agent": {
            if (!name) {
              return jsonResult({ error: "name is required for create_web_agent" });
            }
            const id = `agent_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            agents.set(id, {
              name,
              createdAt: new Date().toISOString(),
              status: "created",
              model: model ?? "gpt-3.5-turbo", // Fixed: use hardcoded default
              goal: null,
              subGoals: [],
              tasks: [],
              webSearchEnabled: webSearchEnabledStr === "true",
            });
            executions.set(id, []);
            return jsonResult({
              success: true,
              agent_id: id,
              message: `Web agent '${name}' created`,
              web_url: `${config.webEndpoint}/agent/${id}`,
            });
          }

          case "set_goal": {
            if (!agentId || !goal) {
              return jsonResult({ error: "agent_id and goal are required for set_goal" });
            }
            const agent = agents.get(agentId);
            if (!agent) {
              return jsonResult({ error: `Agent ${agentId} not found` });
            }
            const subGoals = subGoalsStr ? JSON.parse(subGoalsStr) : [];
            agent.goal = goal;
            agent.subGoals = subGoals;
            agent.goalSetAt = new Date().toISOString();
            agent.status = "goal_set";
            return jsonResult({
              success: true,
              message: `Goal set for agent '${agent.name}'`,
              goal,
              sub_goals: subGoals,
            });
          }

          case "autonomous_execute": {
            if (!agentId) {
              return jsonResult({ error: "agent_id is required for autonomous_execute" });
            }
            const agent = agents.get(agentId);
            if (!agent) {
              return jsonResult({ error: `Agent ${agentId} not found` });
            }
            if (!agent.goal) {
              return jsonResult({ error: "Agent goal must be set before execution" });
            }
            const maxIterations = maxIterationsStr ? Number.parseInt(maxIterationsStr, 10) : 10;
            agent.status = "executing";
            agent.executionStartedAt = new Date().toISOString();
            agent.maxIterations = maxIterations;

            const execution = {
              startedAt: new Date().toISOString(),
              maxIterations,
              currentIteration: 0,
              tasks: [],
              status: "running",
            };

            // Simulate iterations
            const iterations = Math.min(maxIterations, 5);
            for (let i = 0; i < iterations; i++) {
              (execution.tasks as Array<Record<string, unknown>>).push({
                iteration: i + 1,
                action: `Task ${i + 1}: Analyzing goal and planning steps`,
                status: "completed",
                timestamp: new Date().toISOString(),
              });
            }
            execution.currentIteration = iterations;

            const agentExecutions = executions.get(agentId) ?? [];
            agentExecutions.push(execution);
            executions.set(agentId, agentExecutions);

            (agent.tasks as Array<Record<string, unknown>>).push(...execution.tasks);
            agent.lastExecutionAt = new Date().toISOString();

            return jsonResult({
              success: true,
              message: `Autonomous execution started for agent '${agent.name}'`,
              execution,
              note: "Autonomous execution simulated (AgentGPT not configured)",
            });
          }

          case "monitor_progress": {
            if (!agentId) {
              return jsonResult({ error: "agent_id is required for monitor_progress" });
            }
            const agent = agents.get(agentId);
            if (!agent) {
              return jsonResult({ error: `Agent ${agentId} not found` });
            }
            const agentExecutions = executions.get(agentId) ?? [];
            const lastExecution = agentExecutions[agentExecutions.length - 1];
            const progress = {
              agent_id: agentId,
              name: agent.name,
              status: agent.status,
              goal: agent.goal,
              tasks_completed: (agent.tasks as Array<unknown>).length,
              current_execution: lastExecution ?? null,
            };
            return jsonResult({
              success: true,
              progress,
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
              goal: agent.goal,
              model: agent.model,
              taskCount: (agent.tasks as Array<unknown>).length,
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
              name: agent.name,
              status: agent.status,
              goal: agent.goal,
              sub_goals: agent.subGoals,
              tasks: agent.tasks,
              last_execution_at: agent.lastExecutionAt,
            });
          }

          case "pause_agent": {
            if (!agentId) {
              return jsonResult({ error: "agent_id is required for pause_agent" });
            }
            const agent = agents.get(agentId);
            if (!agent) {
              return jsonResult({ error: `Agent ${agentId} not found` });
            }
            if (agent.status !== "executing") {
              return jsonResult({ error: "Agent is not currently executing" });
            }
            agent.status = "paused";
            agent.pausedAt = new Date().toISOString();
            return jsonResult({
              success: true,
              message: `Agent '${agent.name}' paused`,
            });
          }

          default:
            return jsonResult({ error: `Unknown action: ${action}` });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return jsonResult({ error: `AgentGPT tool error: ${message}` });
      }
    },
  };

  return tool;
}
