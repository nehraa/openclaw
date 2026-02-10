/**
 * CrewAI integration tool – lets the agent create and manage multi-agent
 * teams with role-based collaboration (researcher, coder, reviewer, etc.).
 *
 * CrewAI enables hierarchical agent workflows with YAML task configurations
 * and role-driven execution patterns.
 */

import { Type } from "@sinclair/typebox";
import type { OpenClawConfig } from "../../config/config.js";
import { stringEnum } from "../schema/typebox.js";
import { type AnyAgentTool, jsonResult, readStringParam } from "./common.js";

const CREWAI_ACTIONS = [
  "create_crew",
  "create_agent",
  "create_task",
  "assign_task",
  "execute_crew",
  "list_crews",
  "list_agents",
  "list_tasks",
  "get_crew_status",
  "delete_crew",
] as const;

const CrewAIToolSchema = Type.Object({
  action: stringEnum(CREWAI_ACTIONS),
  name: Type.Optional(Type.String({ description: "Name of the crew, agent, or task to create." })),
  crew_id: Type.Optional(Type.String({ description: "Crew ID for execution or status queries." })),
  agent_id: Type.Optional(Type.String({ description: "Agent ID for task assignment." })),
  task_id: Type.Optional(Type.String({ description: "Task ID for assignment operations." })),
  role: Type.Optional(
    Type.String({
      description: "Agent role (e.g., 'researcher', 'coder', 'reviewer', 'architect', 'tester').",
    }),
  ),
  goal: Type.Optional(Type.String({ description: "Goal description for the agent or task." })),
  backstory: Type.Optional(Type.String({ description: "Backstory/context for the agent role." })),
  task_description: Type.Optional(
    Type.String({ description: "Description of the task to create or assign." }),
  ),
  config: Type.Optional(Type.String({ description: "JSON configuration for crew creation." })),
  process_type: Type.Optional(
    Type.String({
      description: "Crew process type: 'sequential' or 'hierarchical'. Default: 'sequential'.",
    }),
  ),
});

type CrewAIConfig = {
  enabled: boolean;
  defaultModel?: string;
  maxAgentsPerCrew?: number;
};

/**
 * Resolve CrewAI configuration from OpenClaw config.
 */
function resolveCrewAIConfig(cfg: OpenClawConfig | undefined): CrewAIConfig {
  const toolsCfg = (cfg as Record<string, unknown> | undefined)?.tools as
    | Record<string, unknown>
    | undefined;
  const crewai = toolsCfg?.crewai as Record<string, unknown> | undefined;

  return {
    enabled: (crewai?.enabled as boolean) ?? true,
    defaultModel: (crewai?.defaultModel as string) ?? process.env.CREWAI_MODEL ?? "gpt-4",
    maxAgentsPerCrew: (crewai?.maxAgentsPerCrew as number) ?? 10,
  };
}

// In-memory stores for crews, agents, and tasks
const crews = new Map<
  string,
  {
    name: string;
    agents: string[];
    tasks: string[];
    processType: string;
    createdAt: string;
    status: string;
    config?: Record<string, unknown>;
  }
>();

const crewAgents = new Map<
  string,
  {
    name: string;
    role: string;
    goal?: string;
    backstory?: string;
    createdAt: string;
  }
>();

const tasks = new Map<
  string,
  {
    name: string;
    description: string;
    assignedTo?: string;
    status: string;
    createdAt: string;
  }
>();

export function createCrewAITool(options?: { config?: OpenClawConfig }): AnyAgentTool {
  const tool: AnyAgentTool = {
    name: "crewai",
    label: "CrewAI Multi-Agent Teams",
    description: [
      "Create and manage multi-agent teams with role-based collaboration.",
      "Actions: create_crew, create_agent, create_task, assign_task, execute_crew,",
      "list_crews, list_agents, list_tasks, get_crew_status, delete_crew.",
      "Use create_agent with roles like 'researcher', 'coder', 'reviewer', 'architect'.",
      "Use create_crew with process_type 'sequential' or 'hierarchical'.",
    ].join(" "),
    parameters: CrewAIToolSchema,
    execute: async (_toolCallId, params: Record<string, unknown>) => {
      const config = resolveCrewAIConfig(options?.config);

      if (!config.enabled) {
        return jsonResult({ error: "CrewAI integration is disabled in config." });
      }

      const action = readStringParam(params, "action", { required: true });
      const name = readStringParam(params, "name");
      const crewId = readStringParam(params, "crew_id");
      const agentId = readStringParam(params, "agent_id");
      const taskId = readStringParam(params, "task_id");
      const role = readStringParam(params, "role");
      const goal = readStringParam(params, "goal");
      const backstory = readStringParam(params, "backstory");
      const taskDescription = readStringParam(params, "task_description");
      const configStr = readStringParam(params, "config");
      const processType = readStringParam(params, "process_type") ?? "sequential";

      try {
        switch (action) {
          case "create_crew": {
            if (!name) {
              return jsonResult({ error: "name is required for create_crew" });
            }
            const crewConfig = configStr ? JSON.parse(configStr) : {};
            const id = `crew_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            crews.set(id, {
              name,
              agents: [],
              tasks: [],
              processType,
              createdAt: new Date().toISOString(),
              status: "created",
              config: crewConfig,
            });
            return jsonResult({
              success: true,
              crew_id: id,
              message: `Crew '${name}' created with ${processType} process`,
            });
          }

          case "create_agent": {
            if (!name || !role) {
              return jsonResult({ error: "name and role are required for create_agent" });
            }
            const id = `agent_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            crewAgents.set(id, {
              name,
              role,
              goal,
              backstory,
              createdAt: new Date().toISOString(),
            });
            return jsonResult({
              success: true,
              agent_id: id,
              message: `Agent '${name}' created with role '${role}'`,
            });
          }

          case "create_task": {
            if (!name || !taskDescription) {
              return jsonResult({
                error: "name and task_description are required for create_task",
              });
            }
            const id = `task_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            tasks.set(id, {
              name,
              description: taskDescription,
              status: "pending",
              createdAt: new Date().toISOString(),
            });
            return jsonResult({
              success: true,
              task_id: id,
              message: `Task '${name}' created`,
            });
          }

          case "assign_task": {
            if (!crewId || !agentId || !taskId) {
              return jsonResult({
                error: "crew_id, agent_id, and task_id are required for assign_task",
              });
            }
            const crew = crews.get(crewId);
            if (!crew) {
              return jsonResult({ error: `Crew ${crewId} not found` });
            }
            const agent = crewAgents.get(agentId);
            if (!agent) {
              return jsonResult({ error: `Agent ${agentId} not found` });
            }
            const task = tasks.get(taskId);
            if (!task) {
              return jsonResult({ error: `Task ${taskId} not found` });
            }

            if (!crew.agents.includes(agentId)) {
              crew.agents.push(agentId);
            }
            if (!crew.tasks.includes(taskId)) {
              crew.tasks.push(taskId);
            }
            task.assignedTo = agentId;
            task.status = "assigned";

            return jsonResult({
              success: true,
              message: `Task '${task.name}' assigned to agent '${agent.name}' (${agent.role})`,
            });
          }

          case "execute_crew": {
            if (!crewId) {
              return jsonResult({ error: "crew_id is required for execute_crew" });
            }
            const crew = crews.get(crewId);
            if (!crew) {
              return jsonResult({ error: `Crew ${crewId} not found` });
            }

            crew.status = "executing";

            const agentDetails = crew.agents
              .map((aid) => {
                const agent = crewAgents.get(aid);
                return agent ? `${agent.name} (${agent.role})` : aid;
              })
              .join(", ");

            const taskDetails = crew.tasks
              .map((tid) => {
                const task = tasks.get(tid);
                return task ? task.name : tid;
              })
              .join(", ");

            crew.status = "completed";

            return jsonResult({
              success: true,
              crew_id: crewId,
              message: `Crew '${crew.name}' executed (${crew.processType} process)`,
              agents: agentDetails,
              tasks: taskDetails,
              note: "Execution simulated (CrewAI library not installed)",
            });
          }

          case "list_crews": {
            const crewList = Array.from(crews.entries()).map(([id, crew]) => ({
              id,
              name: crew.name,
              processType: crew.processType,
              agentCount: crew.agents.length,
              taskCount: crew.tasks.length,
              status: crew.status,
              createdAt: crew.createdAt,
            }));
            return jsonResult({
              success: true,
              crews: crewList,
              count: crewList.length,
            });
          }

          case "list_agents": {
            const agentList = Array.from(crewAgents.entries()).map(([id, agent]) => ({
              id,
              name: agent.name,
              role: agent.role,
              goal: agent.goal,
              createdAt: agent.createdAt,
            }));
            return jsonResult({
              success: true,
              agents: agentList,
              count: agentList.length,
            });
          }

          case "list_tasks": {
            const taskList = Array.from(tasks.entries()).map(([id, task]) => ({
              id,
              name: task.name,
              description: task.description,
              assignedTo: task.assignedTo,
              status: task.status,
              createdAt: task.createdAt,
            }));
            return jsonResult({
              success: true,
              tasks: taskList,
              count: taskList.length,
            });
          }

          case "get_crew_status": {
            if (!crewId) {
              return jsonResult({ error: "crew_id is required for get_crew_status" });
            }
            const crew = crews.get(crewId);
            if (!crew) {
              return jsonResult({ error: `Crew ${crewId} not found` });
            }
            return jsonResult({
              success: true,
              crew_id: crewId,
              status: crew.status,
              details: crew,
            });
          }

          case "delete_crew": {
            if (!crewId) {
              return jsonResult({ error: "crew_id is required for delete_crew" });
            }
            const deleted = crews.delete(crewId);
            if (!deleted) {
              return jsonResult({ error: `Crew ${crewId} not found` });
            }
            return jsonResult({
              success: true,
              message: `Crew ${crewId} deleted`,
            });
          }

          default:
            return jsonResult({ error: `Unknown action: ${action}` });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return jsonResult({ error: `CrewAI tool error: ${message}` });
      }
    },
  };

  return tool;
}
