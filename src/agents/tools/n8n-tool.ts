/**
 * n8n automation tool – lets the agent create, list, run, and manage
 * n8n workflows.  Communicates with a running n8n instance via its REST API.
 *
 * The n8n base URL and API key are read from `config.tools.n8n`.
 */

import { Type } from "@sinclair/typebox";
import type { OpenClawConfig } from "../../config/config.js";
import { stringEnum } from "../schema/typebox.js";
import { type AnyAgentTool, jsonResult, readStringParam } from "./common.js";

const N8N_ACTIONS = [
  "list_workflows",
  "get_workflow",
  "create_workflow",
  "activate_workflow",
  "deactivate_workflow",
  "execute_workflow",
  "delete_workflow",
  "list_executions",
  "list_templates",
] as const;

const N8nToolSchema = Type.Object({
  action: stringEnum(N8N_ACTIONS),
  workflow_id: Type.Optional(Type.String({ description: "Workflow ID (for get/activate/deactivate/execute/delete)." })),
  workflow_json: Type.Optional(
    Type.String({
      description:
        "Full n8n workflow JSON as a string. Used by create_workflow to define the workflow.",
    }),
  ),
  name: Type.Optional(Type.String({ description: "Filter or name for the workflow." })),
  limit: Type.Optional(Type.Number({ description: "Max number of results to return.", minimum: 1, maximum: 100 })),
});

type N8nConfig = {
  baseUrl: string;
  apiKey: string;
};

function resolveN8nConfig(cfg: OpenClawConfig | undefined): N8nConfig | undefined {
  const n8nCfg = (cfg as any)?.tools?.n8n;
  if (!n8nCfg?.baseUrl || !n8nCfg?.apiKey) {
    return undefined;
  }
  return { baseUrl: n8nCfg.baseUrl.replace(/\/+$/, ""), apiKey: n8nCfg.apiKey };
}

async function n8nFetch(
  cfg: N8nConfig,
  path: string,
  opts?: { method?: string; body?: unknown },
): Promise<unknown> {
  const url = `${cfg.baseUrl}/api/v1${path}`;
  const res = await fetch(url, {
    method: opts?.method ?? "GET",
    headers: {
      "X-N8N-API-KEY": cfg.apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`n8n API ${res.status}: ${text}`);
  }
  return res.json();
}

/** Built-in n8n workflow templates the agent can reference. */
const BUILTIN_TEMPLATES: Array<{ name: string; description: string; category: string }> = [
  {
    name: "Slack Notification on GitHub Push",
    description: "Triggers a Slack message whenever a push is made to a GitHub repository.",
    category: "devops",
  },
  {
    name: "Email Digest from RSS",
    description: "Aggregates RSS feed entries and sends a daily email digest.",
    category: "productivity",
  },
  {
    name: "Webhook to Google Sheets",
    description: "Receives a webhook payload and appends the data to a Google Sheets spreadsheet.",
    category: "data",
  },
  {
    name: "Scheduled Database Backup",
    description: "Runs a database backup command on a cron schedule and stores the result.",
    category: "devops",
  },
  {
    name: "AI Chatbot Webhook",
    description: "Accepts chat messages via webhook, processes them with an AI node, and returns a response.",
    category: "ai",
  },
  {
    name: "Form Submission to CRM",
    description: "Receives form data via webhook and creates a contact in a CRM system.",
    category: "sales",
  },
  {
    name: "Error Alert Pipeline",
    description: "Monitors an error tracking webhook and sends alerts to Slack/email when critical errors occur.",
    category: "monitoring",
  },
  {
    name: "Social Media Auto-Post",
    description: "Posts scheduled content to multiple social media platforms via their APIs.",
    category: "marketing",
  },
];

export function createN8nTool(options?: { config?: OpenClawConfig }): AnyAgentTool {
  const tool: AnyAgentTool = {
    name: "n8n",
    description: [
      "Create, manage, and execute n8n automation workflows.",
      "Actions: list_workflows, get_workflow, create_workflow, activate_workflow,",
      "deactivate_workflow, execute_workflow, delete_workflow, list_executions,",
      "list_templates.",
      "Use create_workflow with a workflow_json string to build a new automation.",
      "Use list_templates to see built-in starter templates.",
    ].join(" "),
    parameters: N8nToolSchema,
    execute: async (params: Record<string, unknown>) => {
      const action = readStringParam(params, "action", { required: true }) as (typeof N8N_ACTIONS)[number];

      // list_templates doesn't require n8n connectivity
      if (action === "list_templates") {
        return jsonResult({ templates: BUILTIN_TEMPLATES });
      }

      const cfg = resolveN8nConfig(options?.config);
      if (!cfg) {
        return jsonResult({
          error: "n8n is not configured. Set tools.n8n.baseUrl and tools.n8n.apiKey in config.",
        });
      }

      try {
        switch (action) {
          case "list_workflows": {
            const limit = (params.limit as number) ?? 20;
            const data = await n8nFetch(cfg, `/workflows?limit=${limit}`);
            return jsonResult(data);
          }
          case "get_workflow": {
            const id = readStringParam(params, "workflow_id", { required: true });
            const data = await n8nFetch(cfg, `/workflows/${encodeURIComponent(id)}`);
            return jsonResult(data);
          }
          case "create_workflow": {
            const jsonStr = readStringParam(params, "workflow_json", { required: true });
            let body: unknown;
            try {
              body = JSON.parse(jsonStr);
            } catch {
              return jsonResult({ error: "workflow_json is not valid JSON." });
            }
            const data = await n8nFetch(cfg, "/workflows", { method: "POST", body });
            return jsonResult(data);
          }
          case "activate_workflow": {
            const id = readStringParam(params, "workflow_id", { required: true });
            const data = await n8nFetch(cfg, `/workflows/${encodeURIComponent(id)}/activate`, {
              method: "POST",
            });
            return jsonResult(data);
          }
          case "deactivate_workflow": {
            const id = readStringParam(params, "workflow_id", { required: true });
            const data = await n8nFetch(cfg, `/workflows/${encodeURIComponent(id)}/deactivate`, {
              method: "POST",
            });
            return jsonResult(data);
          }
          case "execute_workflow": {
            const id = readStringParam(params, "workflow_id", { required: true });
            const data = await n8nFetch(cfg, `/workflows/${encodeURIComponent(id)}/run`, {
              method: "POST",
            });
            return jsonResult(data);
          }
          case "delete_workflow": {
            const id = readStringParam(params, "workflow_id", { required: true });
            const data = await n8nFetch(cfg, `/workflows/${encodeURIComponent(id)}`, {
              method: "DELETE",
            });
            return jsonResult(data);
          }
          case "list_executions": {
            const limit = (params.limit as number) ?? 20;
            const workflowId = params.workflow_id as string | undefined;
            const query = workflowId
              ? `?limit=${limit}&workflowId=${encodeURIComponent(workflowId)}`
              : `?limit=${limit}`;
            const data = await n8nFetch(cfg, `/executions${query}`);
            return jsonResult(data);
          }
          default:
            return jsonResult({ error: `Unknown action: ${action}` });
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
