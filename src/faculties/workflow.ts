/**
 * Workflow faculty - automation creation and management using n8n.
 *
 * This faculty helps create, deploy, and manage automated workflows
 * for recurring tasks and integrations.
 */

import { createN8nTool } from "../agents/tools/n8n-tool.js";
import type { FacultyConfig, FacultyResult } from "./types.js";

export type WorkflowRequest = {
  /** Action to perform. */
  action: "create" | "list" | "execute" | "activate" | "get_templates";
  /** Workflow description for creation. */
  description?: string;
  /** Workflow ID for execution/activation. */
  workflowId?: string;
  /** Workflow JSON definition. */
  workflowJson?: string;
};

export type WorkflowResult = {
  /** Created/executed workflow ID. */
  workflowId?: string;
  /** Workflow execution result. */
  executionResult?: Record<string, unknown>;
  /** List of workflows. */
  workflows?: Array<{
    id: string;
    name: string;
    active: boolean;
  }>;
  /** Available templates. */
  templates?: Array<{
    name: string;
    description: string;
    category: string;
  }>;
};

/**
 * Create and manage automated workflows.
 */
export async function automate(
  request: WorkflowRequest,
  config: FacultyConfig,
): Promise<FacultyResult<WorkflowResult>> {
  try {
    const n8nTool = createN8nTool({ config: config.config });

    switch (request.action) {
      case "create":
        return await createWorkflow(request, n8nTool);
      case "list":
        return await listWorkflows(n8nTool);
      case "execute":
        return await executeWorkflow(request, n8nTool);
      case "activate":
        return await activateWorkflow(request, n8nTool);
      case "get_templates":
        return await getTemplates(n8nTool);
      default:
        return {
          success: false,
          error: `Unknown action: ${request.action}`,
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function createWorkflow(
  request: WorkflowRequest,
  tool: ReturnType<typeof createN8nTool>,
): Promise<FacultyResult<WorkflowResult>> {
  if (!request.workflowJson && !request.description) {
    return {
      success: false,
      error: "workflowJson or description is required to create a workflow",
    };
  }

  // If only description is provided, generate a simple workflow structure
  const workflowDef =
    request.workflowJson ??
    JSON.stringify({
      name: request.description ?? "Automated Workflow",
      nodes: [
        {
          type: "n8n-nodes-base.webhook",
          name: "Webhook",
          position: [250, 300],
        },
        {
          type: "n8n-nodes-base.code",
          name: "Process",
          position: [450, 300],
        },
      ],
      connections: {},
    });

  const result = await tool.execute("create", {
    action: "create_workflow",
    workflow_json: workflowDef,
  });

  if (!result.success || result.error) {
    return {
      success: false,
      error: result.error || "Failed to create workflow",
    };
  }

  const workflowId = (result.data as Record<string, unknown>)?.id as string | undefined;

  return {
    success: true,
    data: {
      workflowId,
    },
    metadata: {
      description: request.description,
    },
  };
}

async function listWorkflows(tool: ReturnType<typeof createN8nTool>): Promise<FacultyResult<WorkflowResult>> {
  const result = await tool.execute("list", {
    action: "list_workflows",
    limit: 50,
  });

  if (!result.success || result.error) {
    return {
      success: false,
      error: result.error || "Failed to list workflows",
    };
  }

  const data = result.data as Record<string, unknown>;
  const workflows = (data.data as Array<Record<string, unknown>> | undefined) ?? [];

  return {
    success: true,
    data: {
      workflows: workflows.map((w) => ({
        id: (w.id as string) ?? "",
        name: (w.name as string) ?? "",
        active: (w.active as boolean) ?? false,
      })),
    },
  };
}

async function executeWorkflow(
  request: WorkflowRequest,
  tool: ReturnType<typeof createN8nTool>,
): Promise<FacultyResult<WorkflowResult>> {
  if (!request.workflowId) {
    return {
      success: false,
      error: "workflowId is required to execute a workflow",
    };
  }

  const result = await tool.execute("execute", {
    action: "execute_workflow",
    workflow_id: request.workflowId,
  });

  if (!result.success || result.error) {
    return {
      success: false,
      error: result.error || "Failed to execute workflow",
    };
  }

  return {
    success: true,
    data: {
      workflowId: request.workflowId,
      executionResult: result.data as Record<string, unknown>,
    },
  };
}

async function activateWorkflow(
  request: WorkflowRequest,
  tool: ReturnType<typeof createN8nTool>,
): Promise<FacultyResult<WorkflowResult>> {
  if (!request.workflowId) {
    return {
      success: false,
      error: "workflowId is required to activate a workflow",
    };
  }

  const result = await tool.execute("activate", {
    action: "activate_workflow",
    workflow_id: request.workflowId,
  });

  if (!result.success || result.error) {
    return {
      success: false,
      error: result.error || "Failed to activate workflow",
    };
  }

  return {
    success: true,
    data: {
      workflowId: request.workflowId,
    },
  };
}

async function getTemplates(tool: ReturnType<typeof createN8nTool>): Promise<FacultyResult<WorkflowResult>> {
  const result = await tool.execute("templates", {
    action: "list_templates",
  });

  if (!result.success || result.error) {
    return {
      success: false,
      error: result.error || "Failed to get templates",
    };
  }

  const templates = (result.data as Record<string, unknown>)?.templates as
    | Array<Record<string, unknown>>
    | undefined;

  return {
    success: true,
    data: {
      templates: templates?.map((t) => ({
        name: (t.name as string) ?? "",
        description: (t.description as string) ?? "",
        category: (t.category as string) ?? "",
      })),
    },
  };
}

/**
 * Detect if input involves automation or workflow creation.
 */
export function detectWorkflowIntent(input: string): boolean {
  const workflowKeywords = [
    "automate",
    "workflow",
    "schedule",
    "recurring",
    "integration",
    "connect",
    "trigger when",
    "every day",
    "every hour",
    "webhook",
    "api integration",
  ];

  const lowerInput = input.toLowerCase();
  return workflowKeywords.some((keyword) => lowerInput.includes(keyword));
}
