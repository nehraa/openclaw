/**
 * Semantic Kernel integration tool – Microsoft's enterprise SDK for AI agents.
 *
 * Semantic Kernel is a model-agnostic SDK with enterprise observability, telemetry,
 * security hooks, and filters. Modular, lightweight, and future-proof.
 */

import { Type } from "@sinclair/typebox";
import type { OpenClawConfig } from "../../config/config.js";
import { stringEnum } from "../schema/typebox.js";
import { type AnyAgentTool, jsonResult, readStringParam } from "./common.js";

const SEMANTIC_KERNEL_ACTIONS = [
  "create_kernel",
  "register_plugin",
  "register_function",
  "invoke_function",
  "create_plan",
  "execute_plan",
  "list_kernels",
  "list_plugins",
  "list_functions",
  "add_filter",
  "get_telemetry",
] as const;

const SemanticKernelToolSchema = Type.Object({
  action: stringEnum(SEMANTIC_KERNEL_ACTIONS),
  kernel_id: Type.Optional(Type.String({ description: "Kernel ID for operations." })),
  plugin_name: Type.Optional(Type.String({ description: "Plugin name to register or use." })),
  function_name: Type.Optional(Type.String({ description: "Function name to invoke." })),
  parameters: Type.Optional(
    Type.String({ description: "JSON parameters for function invocation." }),
  ),
  plan_description: Type.Optional(
    Type.String({ description: "Description of the plan to create." }),
  ),
  plan_id: Type.Optional(Type.String({ description: "Plan ID for execution." })),
  filter_type: Type.Optional(
    Type.String({ description: "Filter type (e.g., 'prompt_filter', 'result_filter')." }),
  ),
  config: Type.Optional(
    Type.String({ description: "JSON configuration for kernel/plugin/function." }),
  ),
});

type SemanticKernelConfig = {
  enabled: boolean;
  modelProvider?: string;
  apiKey?: string;
  telemetryEnabled?: boolean;
};

function resolveSemanticKernelConfig(cfg: OpenClawConfig | undefined): SemanticKernelConfig {
  const toolsCfg = (cfg as Record<string, unknown> | undefined)?.tools as
    | Record<string, unknown>
    | undefined;
  const sk = toolsCfg?.semanticKernel as Record<string, unknown> | undefined;

  return {
    enabled: (sk?.enabled as boolean) ?? true,
    modelProvider: (sk?.modelProvider as string) ?? process.env.SK_MODEL_PROVIDER ?? "openai",
    apiKey: (sk?.apiKey as string) ?? process.env.SK_API_KEY,
    telemetryEnabled: (sk?.telemetryEnabled as boolean) ?? true,
  };
}

// In-memory stores
const kernels = new Map<string, Record<string, unknown>>();
const plugins = new Map<string, Map<string, Record<string, unknown>>>();
const plans = new Map<string, Record<string, unknown>>();
const telemetryData: Array<Record<string, unknown>> = [];

export function createSemanticKernelTool(options?: { config?: OpenClawConfig }): AnyAgentTool {
  const tool: AnyAgentTool = {
    name: "semantic_kernel",
    label: "Semantic Kernel",
    description: [
      "Microsoft's enterprise SDK for AI agents with observability and security.",
      "Actions: create_kernel, register_plugin, register_function, invoke_function,",
      "create_plan, execute_plan, list_kernels, list_plugins, list_functions,",
      "add_filter, get_telemetry.",
      "Model-agnostic with enterprise-grade features.",
    ].join(" "),
    parameters: SemanticKernelToolSchema,
    execute: async (_toolCallId, params: Record<string, unknown>) => {
      const config = resolveSemanticKernelConfig(options?.config);

      if (!config.enabled) {
        return jsonResult({ error: "Semantic Kernel integration is disabled in config." });
      }

      const action = readStringParam(params, "action", { required: true });
      const kernelId = readStringParam(params, "kernel_id");
      const pluginName = readStringParam(params, "plugin_name");
      const functionName = readStringParam(params, "function_name");
      const parametersStr = readStringParam(params, "parameters");
      const planDescription = readStringParam(params, "plan_description");
      const planId = readStringParam(params, "plan_id");
      const filterType = readStringParam(params, "filter_type");
      const configStr = readStringParam(params, "config");

      try {
        switch (action) {
          case "create_kernel": {
            const kernelConfig = configStr ? JSON.parse(configStr) : {};
            const id = `kernel_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            kernels.set(id, {
              config: kernelConfig,
              createdAt: new Date().toISOString(),
              modelProvider: config.modelProvider,
              plugins: [],
              filters: [],
            });
            plugins.set(id, new Map());
            if (config.telemetryEnabled) {
              telemetryData.push({
                event: "kernel_created",
                kernelId: id,
                timestamp: new Date().toISOString(),
              });
            }
            return jsonResult({
              success: true,
              kernel_id: id,
              message: `Kernel created with provider ${config.modelProvider}`,
            });
          }

          case "register_plugin": {
            if (!kernelId || !pluginName) {
              return jsonResult({
                error: "kernel_id and plugin_name are required for register_plugin",
              });
            }
            const kernel = kernels.get(kernelId);
            if (!kernel) {
              return jsonResult({ error: `Kernel ${kernelId} not found` });
            }
            const kernelPlugins = plugins.get(kernelId) ?? new Map();
            const pluginConfig = configStr ? JSON.parse(configStr) : {};
            kernelPlugins.set(pluginName, {
              name: pluginName,
              config: pluginConfig,
              functions: [],
              registeredAt: new Date().toISOString(),
            });
            plugins.set(kernelId, kernelPlugins);
            (kernel.plugins as string[]).push(pluginName);
            if (config.telemetryEnabled) {
              telemetryData.push({
                event: "plugin_registered",
                kernelId,
                pluginName,
                timestamp: new Date().toISOString(),
              });
            }
            return jsonResult({
              success: true,
              message: `Plugin '${pluginName}' registered in kernel ${kernelId}`,
            });
          }

          case "register_function": {
            if (!kernelId || !pluginName || !functionName) {
              return jsonResult({
                error:
                  "kernel_id, plugin_name, and function_name are required for register_function",
              });
            }
            const kernelPlugins = plugins.get(kernelId);
            if (!kernelPlugins) {
              return jsonResult({ error: `Kernel ${kernelId} not found` });
            }
            const plugin = kernelPlugins.get(pluginName);
            if (!plugin) {
              return jsonResult({ error: `Plugin ${pluginName} not found in kernel` });
            }
            const functionConfig = configStr ? JSON.parse(configStr) : {};
            (plugin.functions as Array<Record<string, unknown>>).push({
              name: functionName,
              config: functionConfig,
              registeredAt: new Date().toISOString(),
            });
            return jsonResult({
              success: true,
              message: `Function '${functionName}' registered in plugin '${pluginName}'`,
            });
          }

          case "invoke_function": {
            if (!kernelId || !pluginName || !functionName) {
              return jsonResult({
                error: "kernel_id, plugin_name, and function_name are required for invoke_function",
              });
            }
            const kernelPlugins = plugins.get(kernelId);
            if (!kernelPlugins) {
              return jsonResult({ error: `Kernel ${kernelId} not found` });
            }
            const plugin = kernelPlugins.get(pluginName);
            if (!plugin) {
              return jsonResult({ error: `Plugin ${pluginName} not found` });
            }
            const funcParams = parametersStr ? JSON.parse(parametersStr) : {};
            if (config.telemetryEnabled) {
              telemetryData.push({
                event: "function_invoked",
                kernelId,
                pluginName,
                functionName,
                timestamp: new Date().toISOString(),
              });
            }
            return jsonResult({
              success: true,
              result: `Function ${pluginName}.${functionName} invoked`,
              parameters: funcParams,
              message: "Function execution simulated (Semantic Kernel library not installed)",
            });
          }

          case "create_plan": {
            if (!planDescription) {
              return jsonResult({
                error: "plan_description is required for create_plan",
              });
            }
            const id = `plan_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            plans.set(id, {
              description: planDescription,
              createdAt: new Date().toISOString(),
              steps: [],
              status: "created",
            });
            return jsonResult({
              success: true,
              plan_id: id,
              message: `Plan created: ${planDescription}`,
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
            if (config.telemetryEnabled) {
              telemetryData.push({
                event: "plan_executed",
                planId,
                timestamp: new Date().toISOString(),
              });
            }
            return jsonResult({
              success: true,
              plan_id: planId,
              message: `Plan execution started`,
              note: "Plan execution simulated (Semantic Kernel library not installed)",
            });
          }

          case "list_kernels": {
            const kernelList = Array.from(kernels.entries()).map(([id, kernel]) => ({
              id,
              modelProvider: kernel.modelProvider,
              pluginCount: (kernel.plugins as string[]).length,
              createdAt: kernel.createdAt,
            }));
            return jsonResult({
              success: true,
              kernels: kernelList,
              count: kernelList.length,
            });
          }

          case "list_plugins": {
            if (!kernelId) {
              return jsonResult({ error: "kernel_id is required for list_plugins" });
            }
            const kernelPlugins = plugins.get(kernelId);
            if (!kernelPlugins) {
              return jsonResult({ error: `Kernel ${kernelId} not found` });
            }
            const pluginList = Array.from(kernelPlugins.entries()).map(([name, plugin]) => ({
              name,
              functionCount: (plugin.functions as Array<unknown>).length,
              registeredAt: plugin.registeredAt,
            }));
            return jsonResult({
              success: true,
              plugins: pluginList,
              count: pluginList.length,
            });
          }

          case "list_functions": {
            if (!kernelId || !pluginName) {
              return jsonResult({
                error: "kernel_id and plugin_name are required for list_functions",
              });
            }
            const kernelPlugins = plugins.get(kernelId);
            if (!kernelPlugins) {
              return jsonResult({ error: `Kernel ${kernelId} not found` });
            }
            const plugin = kernelPlugins.get(pluginName);
            if (!plugin) {
              return jsonResult({ error: `Plugin ${pluginName} not found` });
            }
            return jsonResult({
              success: true,
              functions: plugin.functions,
              count: (plugin.functions as Array<unknown>).length,
            });
          }

          case "add_filter": {
            if (!kernelId || !filterType) {
              return jsonResult({
                error: "kernel_id and filter_type are required for add_filter",
              });
            }
            const kernel = kernels.get(kernelId);
            if (!kernel) {
              return jsonResult({ error: `Kernel ${kernelId} not found` });
            }
            (kernel.filters as Array<Record<string, unknown>>).push({
              type: filterType,
              addedAt: new Date().toISOString(),
            });
            return jsonResult({
              success: true,
              message: `Filter '${filterType}' added to kernel ${kernelId}`,
            });
          }

          case "get_telemetry": {
            if (!config.telemetryEnabled) {
              return jsonResult({ error: "Telemetry is disabled in config" });
            }
            return jsonResult({
              success: true,
              telemetry: telemetryData,
              count: telemetryData.length,
            });
          }

          default:
            return jsonResult({ error: `Unknown action: ${action}` });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return jsonResult({ error: `Semantic Kernel tool error: ${message}` });
      }
    },
  };

  return tool;
}
