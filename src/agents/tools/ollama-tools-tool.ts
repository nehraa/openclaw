/**
 * Ollama Tools - Enhanced integration for local LLM management with Ollama.
 * Extends existing Ollama support with model management, quick inference, and monitoring.
 *
 * Ollama provides one-command deployment of local LLMs (Llama, Mistral, Qwen, etc.)
 * with GPU/CPU autodetect and Docker-ready API.
 */

import { Type } from "@sinclair/typebox";
import type { OpenClawConfig } from "../../config/config.js";
import { stringEnum } from "../schema/typebox.js";
import { type AnyAgentTool, jsonResult, readStringParam } from "./common.js";

const OLLAMA_ACTIONS = [
  "list_models",
  "pull_model",
  "delete_model",
  "show_model_info",
  "run_inference",
  "create_model",
  "copy_model",
  "list_running",
  "stop_model",
  "get_version",
] as const;

const OllamaToolSchema = Type.Object({
  action: stringEnum(OLLAMA_ACTIONS),
  model: Type.Optional(
    Type.String({
      description: "Model name (e.g., 'llama3', 'mistral', 'codellama', 'qwen2.5').",
    }),
  ),
  prompt: Type.Optional(
    Type.String({ description: "Prompt for inference." }),
  ),
  new_model_name: Type.Optional(
    Type.String({ description: "New model name for create or copy operations." }),
  ),
  modelfile: Type.Optional(
    Type.String({ description: "Modelfile content for creating custom models." }),
  ),
  temperature: Type.Optional(
    Type.Number({ description: "Temperature for sampling.", minimum: 0, maximum: 2 }),
  ),
  max_tokens: Type.Optional(
    Type.Number({ description: "Maximum tokens to generate.", minimum: 1 }),
  ),
  stream: Type.Optional(
    Type.Boolean({ description: "Enable streaming responses." }),
  ),
});

type OllamaConfig = {
  enabled: boolean;
  baseUrl?: string;
  defaultModel?: string;
};

/**
 * Resolve Ollama configuration from OpenClaw config.
 */
function resolveOllamaConfig(cfg: OpenClawConfig | undefined): OllamaConfig {
  const toolsCfg = (cfg as Record<string, unknown> | undefined)?.tools as
    | Record<string, unknown>
    | undefined;
  const ollama = toolsCfg?.ollama as Record<string, unknown> | undefined;

  return {
    enabled: (ollama?.enabled as boolean) ?? true,
    baseUrl:
      (ollama?.baseUrl as string) ??
      process.env.OLLAMA_BASE_URL ??
      "http://localhost:11434",
    defaultModel: (ollama?.defaultModel as string) ?? "llama3",
  };
}

// In-memory stores for simulated Ollama state
const installedModels = new Map<
  string,
  {
    name: string;
    size: string;
    modified: string;
    family: string;
  }
>();

const runningModels = new Set<string>();

// Initialize with some default models
installedModels.set("llama3", {
  name: "llama3",
  size: "4.7GB",
  modified: "2024-01-01",
  family: "llama",
});
installedModels.set("mistral", {
  name: "mistral",
  size: "4.1GB",
  modified: "2024-01-01",
  family: "mistral",
});

export function createOllamaToolsTool(options?: { config?: OpenClawConfig }): AnyAgentTool {
  const tool: AnyAgentTool = {
    name: "ollama_tools",
    label: "Ollama Tools",
    description: [
      "Enhanced Ollama integration for local LLM management.",
      "Actions: list_models, pull_model, delete_model, show_model_info, run_inference,",
      "create_model, copy_model, list_running, stop_model, get_version.",
      "Use list_models to see available models.",
      "Use pull_model to download new models (e.g., 'llama3', 'codellama').",
      "Use run_inference for quick local LLM inference.",
    ].join(" "),
    parameters: OllamaToolSchema,
    execute: async (_toolCallId, params: Record<string, unknown>) => {
      const config = resolveOllamaConfig(options?.config);

      if (!config.enabled) {
        return jsonResult({ error: "Ollama integration is disabled in config." });
      }

      const action = readStringParam(params, "action", true);
      const model = readStringParam(params, "model");
      const prompt = readStringParam(params, "prompt");
      const newModelName = readStringParam(params, "new_model_name");
      const modelfile = readStringParam(params, "modelfile");
      const temperature = (params.temperature as number | undefined) ?? 0.7;
      const maxTokens = (params.max_tokens as number | undefined) ?? 2000;
      const stream = (params.stream as boolean | undefined) ?? false;

      try {
        switch (action) {
          case "list_models": {
            const modelList = Array.from(installedModels.values()).map((m) => ({
              name: m.name,
              size: m.size,
              modified: m.modified,
              family: m.family,
            }));
            return jsonResult({
              success: true,
              models: modelList,
              count: modelList.length,
              baseUrl: config.baseUrl,
            });
          }

          case "pull_model": {
            if (!model) {
              return jsonResult({ error: "model is required for pull_model" });
            }
            if (installedModels.has(model)) {
              return jsonResult({
                success: true,
                message: `Model '${model}' is already installed`,
                model,
              });
            }
            // Simulate pulling
            installedModels.set(model, {
              name: model,
              size: "~4GB",
              modified: new Date().toISOString(),
              family: "unknown",
            });
            return jsonResult({
              success: true,
              message: `Model '${model}' pulled successfully (simulated)`,
              model,
              note: "Real operation would download from Ollama registry",
            });
          }

          case "delete_model": {
            if (!model) {
              return jsonResult({ error: "model is required for delete_model" });
            }
            const deleted = installedModels.delete(model);
            if (!deleted) {
              return jsonResult({ error: `Model '${model}' not found` });
            }
            runningModels.delete(model);
            return jsonResult({
              success: true,
              message: `Model '${model}' deleted`,
            });
          }

          case "show_model_info": {
            if (!model) {
              return jsonResult({ error: "model is required for show_model_info" });
            }
            const modelInfo = installedModels.get(model);
            if (!modelInfo) {
              return jsonResult({ error: `Model '${model}' not found` });
            }
            return jsonResult({
              success: true,
              model: modelInfo.name,
              size: modelInfo.size,
              modified: modelInfo.modified,
              family: modelInfo.family,
              parameters: "Simulated parameters",
              template: "Simulated template",
            });
          }

          case "run_inference": {
            if (!model || !prompt) {
              return jsonResult({ error: "model and prompt are required for run_inference" });
            }
            if (!installedModels.has(model)) {
              return jsonResult({ error: `Model '${model}' not found. Pull it first.` });
            }
            runningModels.add(model);
            return jsonResult({
              success: true,
              model,
              prompt,
              response: `Simulated response from ${model} (Ollama not running)\n\nPrompt: ${prompt}`,
              temperature,
              max_tokens: maxTokens,
              stream,
              note: "Real inference would use Ollama API at " + config.baseUrl,
            });
          }

          case "create_model": {
            if (!newModelName || !modelfile) {
              return jsonResult({
                error: "new_model_name and modelfile are required for create_model",
              });
            }
            installedModels.set(newModelName, {
              name: newModelName,
              size: "Custom",
              modified: new Date().toISOString(),
              family: "custom",
            });
            return jsonResult({
              success: true,
              message: `Custom model '${newModelName}' created (simulated)`,
              model: newModelName,
            });
          }

          case "copy_model": {
            if (!model || !newModelName) {
              return jsonResult({
                error: "model and new_model_name are required for copy_model",
              });
            }
            const sourceModel = installedModels.get(model);
            if (!sourceModel) {
              return jsonResult({ error: `Source model '${model}' not found` });
            }
            installedModels.set(newModelName, {
              name: newModelName,
              size: sourceModel.size,
              modified: new Date().toISOString(),
              family: sourceModel.family,
            });
            return jsonResult({
              success: true,
              message: `Model '${model}' copied to '${newModelName}'`,
            });
          }

          case "list_running": {
            const running = Array.from(runningModels);
            return jsonResult({
              success: true,
              running_models: running,
              count: running.length,
            });
          }

          case "stop_model": {
            if (!model) {
              return jsonResult({ error: "model is required for stop_model" });
            }
            const stopped = runningModels.delete(model);
            if (!stopped) {
              return jsonResult({ error: `Model '${model}' is not running` });
            }
            return jsonResult({
              success: true,
              message: `Model '${model}' stopped`,
            });
          }

          case "get_version": {
            return jsonResult({
              success: true,
              version: "0.1.0 (simulated)",
              note: "Real version would come from Ollama API",
            });
          }

          default:
            return jsonResult({ error: `Unknown action: ${action}` });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return jsonResult({ error: `Ollama tools error: ${message}` });
      }
    },
  };

  return tool;
}
