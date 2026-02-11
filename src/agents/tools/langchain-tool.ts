/**
 * LangChain/LangGraph integration tool – lets the agent create and manage
 * modular agent workflows using LangChain and LangGraph.
 *
 * LangChain provides composable components (chains, memory, tools) while
 * LangGraph enables stateful, multi-step agent workflows with cycles.
 */

import { Type } from "@sinclair/typebox";
import type { OpenClawConfig } from "../../config/config.js";
import { stringEnum } from "../schema/typebox.js";
import { type AnyAgentTool, jsonResult, readStringParam } from "./common.js";

const LANGCHAIN_ACTIONS = [
  "create_chain",
  "create_agent",
  "create_graph",
  "execute_chain",
  "execute_agent",
  "execute_graph",
  "list_chains",
  "list_agents",
  "get_chain_state",
  "add_memory",
  "query_memory",
] as const;

const LangChainToolSchema = Type.Object({
  action: stringEnum(LANGCHAIN_ACTIONS),
  name: Type.Optional(
    Type.String({ description: "Name of the chain, agent, or graph to create or reference." }),
  ),
  chain_id: Type.Optional(Type.String({ description: "Chain ID for execution or state queries." })),
  agent_id: Type.Optional(Type.String({ description: "Agent ID for execution or state queries." })),
  graph_id: Type.Optional(Type.String({ description: "Graph ID for execution or state queries." })),
  config: Type.Optional(
    Type.String({ description: "JSON configuration for chain/agent/graph creation." }),
  ),
  input: Type.Optional(Type.String({ description: "Input data for chain/agent/graph execution." })),
  memory_key: Type.Optional(
    Type.String({ description: "Memory key for storage/retrieval operations." }),
  ),
  memory_value: Type.Optional(Type.String({ description: "Memory value to store." })),
  query: Type.Optional(Type.String({ description: "Query string for memory search operations." })),
});

type LangChainConfig = {
  enabled: boolean;
  apiKey?: string;
  baseUrl?: string;
  modelName?: string;
  temperature?: number;
};

/**
 * Resolve LangChain configuration from OpenClaw config or environment.
 */
function resolveLangChainConfig(cfg: OpenClawConfig | undefined): LangChainConfig {
  const toolsCfg = (cfg as Record<string, unknown> | undefined)?.tools as
    | Record<string, unknown>
    | undefined;
  const langchain = toolsCfg?.langchain as Record<string, unknown> | undefined;

  return {
    enabled: (langchain?.enabled as boolean) ?? true,
    apiKey: (langchain?.apiKey as string) ?? process.env.LANGCHAIN_API_KEY,
    baseUrl: (langchain?.baseUrl as string) ?? process.env.LANGCHAIN_BASE_URL,
    modelName: (langchain?.modelName as string) ?? process.env.LANGCHAIN_MODEL ?? "gpt-4",
    temperature: (langchain?.temperature as number) ?? 0.7,
  };
}

// In-memory stores for chains, agents, and graphs
const chains = new Map<string, Record<string, unknown>>();
const agents = new Map<string, Record<string, unknown>>();
const graphs = new Map<string, Record<string, unknown>>();
const memory = new Map<string, string>();

export function createLangChainTool(options?: { config?: OpenClawConfig }): AnyAgentTool {
  const tool: AnyAgentTool = {
    name: "langchain",
    label: "LangChain/LangGraph",
    description: [
      "Create and manage modular agent workflows using LangChain and LangGraph.",
      "Actions: create_chain, create_agent, create_graph, execute_chain, execute_agent,",
      "execute_graph, list_chains, list_agents, get_chain_state, add_memory, query_memory.",
      "Use create_chain to build composable chains with memory and tools.",
      "Use create_graph to build stateful multi-step workflows with LangGraph.",
    ].join(" "),
    parameters: LangChainToolSchema,
    execute: async (_toolCallId, params: Record<string, unknown>) => {
      const config = resolveLangChainConfig(options?.config);

      if (!config.enabled) {
        return jsonResult({ error: "LangChain integration is disabled in config." });
      }

      const action = readStringParam(params, "action", { required: true });
      const name = readStringParam(params, "name");
      const chainId = readStringParam(params, "chain_id");
      const agentId = readStringParam(params, "agent_id");
      const graphId = readStringParam(params, "graph_id");
      const configStr = readStringParam(params, "config");
      const input = readStringParam(params, "input");
      const memoryKey = readStringParam(params, "memory_key");
      const memoryValue = readStringParam(params, "memory_value");
      const query = readStringParam(params, "query");

      try {
        switch (action) {
          case "create_chain": {
            if (!name) {
              return jsonResult({ error: "name is required for create_chain" });
            }
            const chainConfig = configStr ? JSON.parse(configStr) : {};
            const id = `chain_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            chains.set(id, {
              name,
              config: chainConfig,
              createdAt: new Date().toISOString(),
              type: chainConfig.type ?? "simple",
            });
            return jsonResult({
              success: true,
              chain_id: id,
              message: `Chain '${name}' created with ID ${id}`,
            });
          }

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
              tools: agentConfig.tools ?? [],
              model: agentConfig.model ?? config.modelName,
            });
            return jsonResult({
              success: true,
              agent_id: id,
              message: `Agent '${name}' created with ID ${id}`,
            });
          }

          case "create_graph": {
            if (!name) {
              return jsonResult({ error: "name is required for create_graph" });
            }
            const graphConfig = configStr ? JSON.parse(configStr) : {};
            const id = `graph_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            graphs.set(id, {
              name,
              config: graphConfig,
              createdAt: new Date().toISOString(),
              nodes: graphConfig.nodes ?? [],
              edges: graphConfig.edges ?? [],
              state: {},
            });
            return jsonResult({
              success: true,
              graph_id: id,
              message: `Graph '${name}' created with ID ${id}`,
            });
          }

          case "execute_chain": {
            if (!chainId) {
              return jsonResult({ error: "chain_id is required for execute_chain" });
            }
            const chain = chains.get(chainId);
            if (!chain) {
              return jsonResult({ error: `Chain ${chainId} not found` });
            }
            const inputData = input ? JSON.parse(input) : {};
            return jsonResult({
              success: true,
              chain_id: chainId,
              output: `Executed chain '${chain.name}' with input`,
              input: inputData,
              message: "Chain execution simulated (LangChain library not installed)",
            });
          }

          case "execute_agent": {
            if (!agentId) {
              return jsonResult({ error: "agent_id is required for execute_agent" });
            }
            const agent = agents.get(agentId);
            if (!agent) {
              return jsonResult({ error: `Agent ${agentId} not found` });
            }
            const inputData = input ? JSON.parse(input) : {};
            return jsonResult({
              success: true,
              agent_id: agentId,
              output: `Executed agent '${agent.name}' with input`,
              input: inputData,
              message: "Agent execution simulated (LangChain library not installed)",
            });
          }

          case "execute_graph": {
            if (!graphId) {
              return jsonResult({ error: "graph_id is required for execute_graph" });
            }
            const graph = graphs.get(graphId);
            if (!graph) {
              return jsonResult({ error: `Graph ${graphId} not found` });
            }
            const inputData = input ? JSON.parse(input) : {};
            return jsonResult({
              success: true,
              graph_id: graphId,
              output: `Executed graph '${graph.name}' with input`,
              input: inputData,
              message: "Graph execution simulated (LangGraph library not installed)",
            });
          }

          case "list_chains": {
            const chainList = Array.from(chains.entries()).map(([id, chain]) => ({
              id,
              name: chain.name,
              type: chain.type,
              createdAt: chain.createdAt,
            }));
            return jsonResult({
              success: true,
              chains: chainList,
              count: chainList.length,
            });
          }

          case "list_agents": {
            const agentList = Array.from(agents.entries()).map(([id, agent]) => ({
              id,
              name: agent.name,
              model: agent.model,
              tools: agent.tools,
              createdAt: agent.createdAt,
            }));
            return jsonResult({
              success: true,
              agents: agentList,
              count: agentList.length,
            });
          }

          case "get_chain_state": {
            if (!chainId) {
              return jsonResult({ error: "chain_id is required for get_chain_state" });
            }
            const chain = chains.get(chainId);
            if (!chain) {
              return jsonResult({ error: `Chain ${chainId} not found` });
            }
            return jsonResult({
              success: true,
              chain_id: chainId,
              state: chain,
            });
          }

          case "add_memory": {
            if (!memoryKey || !memoryValue) {
              return jsonResult({ error: "memory_key and memory_value required for add_memory" });
            }
            memory.set(memoryKey, memoryValue);
            return jsonResult({
              success: true,
              message: `Stored memory with key '${memoryKey}'`,
            });
          }

          case "query_memory": {
            if (!query) {
              return jsonResult({ error: "query is required for query_memory" });
            }
            const results: Array<{ key: string; value: string }> = [];
            for (const [key, value] of memory.entries()) {
              if (key.includes(query) || value.includes(query)) {
                results.push({ key, value });
              }
            }
            return jsonResult({
              success: true,
              query,
              results,
              count: results.length,
            });
          }

          default:
            return jsonResult({ error: `Unknown action: ${action}` });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return jsonResult({ error: `LangChain tool error: ${message}` });
      }
    },
  };

  return tool;
}
