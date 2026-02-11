/**
 * Council faculty - complex reasoning decomposition using multi-agent teams.
 *
 * This faculty uses CrewAI and MetaGPT to break down complex problems into
 * subtasks and coordinate multiple specialized agents to solve them.
 */

import { createCrewAITool } from "../agents/tools/crewai-tool.js";
import { createMetaGPTTool } from "../agents/tools/metagpt-tool.js";
import type { FacultyConfig, FacultyResult } from "./types.js";

export type CouncilRequest = {
  /** Complex problem to decompose and solve. */
  problem: string;
  /** Agent roles needed (e.g., researcher, coder, reviewer). */
  roles?: string[];
  /** Process type: sequential or hierarchical. */
  processType?: "sequential" | "hierarchical";
  /** Technology stack for code generation. */
  techStack?: string;
};

export type CouncilResult = {
  /** Created crew ID. */
  crewId?: string;
  /** Agent IDs created for this problem. */
  agentIds?: string[];
  /** Task breakdown. */
  tasks?: Array<{
    id: string;
    description: string;
    assignedTo: string;
    status: string;
  }>;
  /** Execution results. */
  executionResults?: string;
  /** Generated artifacts (for software projects). */
  artifacts?: {
    prd?: string;
    architecture?: string;
    code?: string;
  };
};

/**
 * Decompose a complex problem using multi-agent coordination.
 */
export async function deliberate(
  request: CouncilRequest,
  config: FacultyConfig,
): Promise<FacultyResult<CouncilResult>> {
  try {
    const crewTool = createCrewAITool({ config: config.config });
    const metagptTool = createMetaGPTTool({ config: config.config });

    // Determine if this is a software project or general reasoning task
    const isSoftwareProject = request.techStack || /build|create|develop|implement/.test(request.problem.toLowerCase());

    if (isSoftwareProject) {
      // Use MetaGPT for software development
      return await handleSoftwareProject(request, metagptTool);
    } else {
      // Use CrewAI for general multi-agent reasoning
      return await handleGeneralReasoning(request, crewTool);
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function handleSoftwareProject(
  request: CouncilRequest,
  tool: ReturnType<typeof createMetaGPTTool>,
): Promise<FacultyResult<CouncilResult>> {
  // Create project
  const projectResult = await tool.execute("create", {
    action: "create_project",
    project_name: `Council_${Date.now()}`,
    requirements: request.problem,
    tech_stack: request.techStack,
    sop_type: request.processType === "hierarchical" ? "waterfall" : "agile",
  });

  if (!projectResult.success || projectResult.error) {
    return {
      success: false,
      error: projectResult.error || "Failed to create project",
    };
  }

  const projectData = projectResult.data as Record<string, unknown>;
  const projectId = projectData.project_id as string;

  // Generate PRD
  const prdResult = await tool.execute("prd", {
    action: "generate_prd",
    project_id: projectId,
  });

  // Design architecture
  const archResult = await tool.execute("arch", {
    action: "design_architecture",
    project_id: projectId,
  });

  // Write code
  const codeResult = await tool.execute("code", {
    action: "write_code",
    project_id: projectId,
  });

  const prd = prdResult.success ? ((prdResult.data as Record<string, unknown>)?.prd as string) : undefined;
  const architecture = archResult.success
    ? ((archResult.data as Record<string, unknown>)?.architecture as string)
    : undefined;
  const code = codeResult.success ? ((codeResult.data as Record<string, unknown>)?.code as string) : undefined;

  return {
    success: true,
    data: {
      crewId: projectId,
      artifacts: {
        prd,
        architecture,
        code,
      },
    },
    metadata: {
      projectType: "software",
      sop: request.processType,
    },
  };
}

async function handleGeneralReasoning(
  request: CouncilRequest,
  tool: ReturnType<typeof createCrewAITool>,
): Promise<FacultyResult<CouncilResult>> {
  // Create crew
  const crewResult = await tool.execute("create_crew", {
    action: "create_crew",
    name: `Council_${Date.now()}`,
    process_type: request.processType ?? "sequential",
  });

  if (!crewResult.success || crewResult.error) {
    return {
      success: false,
      error: crewResult.error || "Failed to create crew",
    };
  }

  const crewData = crewResult.data as Record<string, unknown>;
  const crewId = crewData.crew_id as string;

  // Create agents based on requested roles or defaults
  const roles = request.roles ?? ["researcher", "analyst", "reviewer"];
  const agentIds: string[] = [];

  for (const role of roles) {
    const agentResult = await tool.execute("create_agent", {
      action: "create_agent",
      name: `${role}_agent`,
      role,
      goal: `Contribute to solving: ${request.problem}`,
      backstory: `Expert ${role} with deep domain knowledge`,
    });

    if (agentResult.success) {
      const agentId = (agentResult.data as Record<string, unknown>)?.agent_id as string;
      agentIds.push(agentId);
    }
  }

  // Create and assign tasks
  const taskResult = await tool.execute("create_task", {
    action: "create_task",
    name: "main_task",
    task_description: request.problem,
  });

  const taskId = taskResult.success ? ((taskResult.data as Record<string, unknown>)?.task_id as string) : undefined;

  if (taskId && agentIds.length > 0) {
    await tool.execute("assign", {
      action: "assign_task",
      crew_id: crewId,
      agent_id: agentIds[0],
      task_id: taskId,
    });
  }

  // Execute crew
  const execResult = await tool.execute("execute", {
    action: "execute_crew",
    crew_id: crewId,
  });

  return {
    success: true,
    data: {
      crewId,
      agentIds,
      tasks: taskId
        ? [
            {
              id: taskId,
              description: request.problem,
              assignedTo: agentIds[0] ?? "unassigned",
              status: "completed",
            },
          ]
        : [],
      executionResults: execResult.success
        ? ((execResult.data as Record<string, unknown>)?.message as string)
        : undefined,
    },
    metadata: {
      processType: request.processType ?? "sequential",
      agentCount: agentIds.length,
    },
  };
}

/**
 * Detect if input requires complex multi-agent reasoning.
 */
export function detectCouncilIntent(input: string): boolean {
  const complexityKeywords = [
    "plan",
    "strategy",
    "design",
    "architecture",
    "multi-step",
    "complex",
    "coordinate",
    "team",
    "collaborate",
    "research and",
    "analyze and",
  ];

  const lowerInput = input.toLowerCase();
  return complexityKeywords.some((keyword) => lowerInput.includes(keyword));
}
