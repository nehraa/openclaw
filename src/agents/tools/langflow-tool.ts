/**
 * Langflow integration tool – low-code visual agent building platform.
 *
 * Langflow provides drag-and-drop interface for building agent workflows,
 * MCP server exposure, and pre-built templates for rapid development.
 */

import { Type } from "@sinclair/typebox";
import type { OpenClawConfig } from "../../config/config.js";
import { stringEnum } from "../schema/typebox.js";
import { type AnyAgentTool, jsonResult, readStringParam } from "./common.js";

const LANGFLOW_ACTIONS = [
  "create_flow",
  "add_component",
  "connect_components",
  "execute_flow",
  "list_flows",
  "get_flow",
  "export_flow",
  "import_flow",
  "create_mcp_server",
  "list_templates",
] as const;

const LangflowToolSchema = Type.Object({
  action: stringEnum(LANGFLOW_ACTIONS),
  flow_id: Type.Optional(Type.String({ description: "Flow ID for operations." })),
  name: Type.Optional(Type.String({ description: "Name for the flow or component." })),
  component_id: Type.Optional(Type.String({ description: "Component ID within the flow." })),
  component_type: Type.Optional(
    Type.String({
      description: "Component type (e.g., 'llm', 'prompt', 'chain', 'agent', 'tool', 'memory').",
    }),
  ),
  source_id: Type.Optional(Type.String({ description: "Source component ID for connection." })),
  target_id: Type.Optional(Type.String({ description: "Target component ID for connection." })),
  input: Type.Optional(Type.String({ description: "Input data for flow execution." })),
  config: Type.Optional(Type.String({ description: "JSON configuration for the component." })),
  template_name: Type.Optional(Type.String({ description: "Template name for import." })),
});

type LangflowConfig = {
  enabled: boolean;
  serverUrl?: string;
  port?: number;
};

function resolveLangflowConfig(cfg: OpenClawConfig | undefined): LangflowConfig {
  const toolsCfg = (cfg as Record<string, unknown> | undefined)?.tools as
    | Record<string, unknown>
    | undefined;
  const langflow = toolsCfg?.langflow as Record<string, unknown> | undefined;

  return {
    enabled: (langflow?.enabled as boolean) ?? true,
    serverUrl:
      (langflow?.serverUrl as string) ?? process.env.LANGFLOW_SERVER_URL ?? "http://localhost:7860",
    port: (langflow?.port as number) ?? 7860,
  };
}

// In-memory stores
const flows = new Map<string, Record<string, unknown>>();
const components = new Map<string, Map<string, Record<string, unknown>>>();
const connections = new Map<string, Array<Record<string, unknown>>>();
const templates = [
  "chatbot",
  "rag_pipeline",
  "agent_executor",
  "sequential_chain",
  "question_answering",
  "document_loader",
];

export function createLangflowTool(options?: { config?: OpenClawConfig }): AnyAgentTool {
  const tool: AnyAgentTool = {
    name: "langflow",
    label: "Langflow",
    description: [
      "Low-code visual agent building platform with drag-and-drop interface.",
      "Actions: create_flow, add_component, connect_components, execute_flow,",
      "list_flows, get_flow, export_flow, import_flow, create_mcp_server, list_templates.",
      "Build complex agent workflows visually with pre-built templates.",
    ].join(" "),
    parameters: LangflowToolSchema,
    execute: async (_toolCallId, params: Record<string, unknown>) => {
      const config = resolveLangflowConfig(options?.config);

      if (!config.enabled) {
        return jsonResult({ error: "Langflow integration is disabled in config." });
      }

      const action = readStringParam(params, "action", { required: true });
      const flowId = readStringParam(params, "flow_id");
      const name = readStringParam(params, "name");
      const componentId = readStringParam(params, "component_id");
      const componentType = readStringParam(params, "component_type");
      const sourceId = readStringParam(params, "source_id");
      const targetId = readStringParam(params, "target_id");
      const input = readStringParam(params, "input");
      const configStr = readStringParam(params, "config");
      const templateName = readStringParam(params, "template_name");

      try {
        switch (action) {
          case "create_flow": {
            if (!name) {
              return jsonResult({ error: "name is required for create_flow" });
            }
            const id = `flow_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            flows.set(id, {
              name,
              createdAt: new Date().toISOString(),
              components: [],
              connections: [],
              status: "draft",
            });
            components.set(id, new Map());
            connections.set(id, []);
            return jsonResult({
              success: true,
              flow_id: id,
              message: `Flow '${name}' created`,
            });
          }

          case "add_component": {
            if (!flowId || !componentType) {
              return jsonResult({
                error: "flow_id and component_type are required for add_component",
              });
            }
            const flow = flows.get(flowId);
            if (!flow) {
              return jsonResult({ error: `Flow ${flowId} not found` });
            }
            const flowComponents = components.get(flowId) ?? new Map();
            const id = `comp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            const componentConfig = configStr ? JSON.parse(configStr) : {};
            flowComponents.set(id, {
              id,
              type: componentType,
              name: name ?? componentType,
              config: componentConfig,
              createdAt: new Date().toISOString(),
            });
            components.set(flowId, flowComponents);
            (flow.components as string[]).push(id);
            return jsonResult({
              success: true,
              component_id: id,
              message: `Component '${componentType}' added to flow`,
            });
          }

          case "connect_components": {
            if (!flowId || !sourceId || !targetId) {
              return jsonResult({
                error: "flow_id, source_id, and target_id are required for connect_components",
              });
            }
            const flow = flows.get(flowId);
            if (!flow) {
              return jsonResult({ error: `Flow ${flowId} not found` });
            }
            const flowConnections = connections.get(flowId) ?? [];
            flowConnections.push({
              source: sourceId,
              target: targetId,
              createdAt: new Date().toISOString(),
            });
            connections.set(flowId, flowConnections);
            (flow.connections as Array<Record<string, unknown>>).push({
              source: sourceId,
              target: targetId,
            });
            return jsonResult({
              success: true,
              message: `Connected ${sourceId} -> ${targetId}`,
            });
          }

          case "execute_flow": {
            if (!flowId) {
              return jsonResult({ error: "flow_id is required for execute_flow" });
            }
            const flow = flows.get(flowId);
            if (!flow) {
              return jsonResult({ error: `Flow ${flowId} not found` });
            }
            const inputData = input ? JSON.parse(input) : {};
            flow.lastExecutedAt = new Date().toISOString();
            return jsonResult({
              success: true,
              flow_id: flowId,
              output: `Flow '${flow.name}' executed`,
              input: inputData,
              message: "Flow execution simulated (Langflow not installed)",
            });
          }

          case "list_flows": {
            const flowList = Array.from(flows.entries()).map(([id, flow]) => ({
              id,
              name: flow.name,
              componentCount: (flow.components as string[]).length,
              connectionCount: (flow.connections as Array<unknown>).length,
              status: flow.status,
              createdAt: flow.createdAt,
            }));
            return jsonResult({
              success: true,
              flows: flowList,
              count: flowList.length,
            });
          }

          case "get_flow": {
            if (!flowId) {
              return jsonResult({ error: "flow_id is required for get_flow" });
            }
            const flow = flows.get(flowId);
            if (!flow) {
              return jsonResult({ error: `Flow ${flowId} not found` });
            }
            const flowComponents = components.get(flowId);
            const flowConnections = connections.get(flowId);
            return jsonResult({
              success: true,
              flow_id: flowId,
              flow,
              components: flowComponents ? Array.from(flowComponents.values()) : [],
              connections: flowConnections ?? [],
            });
          }

          case "export_flow": {
            if (!flowId) {
              return jsonResult({ error: "flow_id is required for export_flow" });
            }
            const flow = flows.get(flowId);
            if (!flow) {
              return jsonResult({ error: `Flow ${flowId} not found` });
            }
            const flowComponents = components.get(flowId);
            const flowConnections = connections.get(flowId);
            const exportData = {
              flow,
              components: flowComponents ? Array.from(flowComponents.entries()) : [],
              connections: flowConnections ?? [],
              exportedAt: new Date().toISOString(),
            };
            return jsonResult({
              success: true,
              export: exportData,
              message: "Flow exported (as JSON structure)",
            });
          }

          case "import_flow": {
            if (!name || !configStr) {
              return jsonResult({
                error: "name and config (flow data) are required for import_flow",
              });
            }
            const flowData = JSON.parse(configStr);
            const id = `flow_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            flows.set(id, {
              name,
              ...flowData.flow,
              importedAt: new Date().toISOString(),
            });
            return jsonResult({
              success: true,
              flow_id: id,
              message: `Flow '${name}' imported`,
            });
          }

          case "create_mcp_server": {
            if (!flowId) {
              return jsonResult({ error: "flow_id is required for create_mcp_server" });
            }
            const flow = flows.get(flowId);
            if (!flow) {
              return jsonResult({ error: `Flow ${flowId} not found` });
            }
            const mcpId = `mcp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            flow.mcpServerId = mcpId;
            return jsonResult({
              success: true,
              mcp_server_id: mcpId,
              message: `MCP server created for flow ${flowId}`,
              url: `${config.serverUrl}/api/mcp/${mcpId}`,
              note: "MCP server creation simulated (Langflow not installed)",
            });
          }

          case "list_templates": {
            return jsonResult({
              success: true,
              templates: templates.map((t) => ({ name: t })),
              count: templates.length,
            });
          }

          default:
            return jsonResult({ error: `Unknown action: ${action}` });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return jsonResult({ error: `Langflow tool error: ${message}` });
      }
    },
  };

  return tool;
}
