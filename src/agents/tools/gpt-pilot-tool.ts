/**
 * GPT Pilot integration tool – lead developer agent for full app development.
 *
 * GPT Pilot provides iterative development workflow with project scaffolding,
 * code generation, testing, and deployment capabilities. MIT License by Pythagora-io.
 */

import { Type } from "@sinclair/typebox";
import type { OpenClawConfig } from "../../config/config.js";
import { stringEnum } from "../schema/typebox.js";
import { type AnyAgentTool, jsonResult, readStringParam } from "./common.js";

const GPT_PILOT_ACTIONS = [
  "create_project",
  "generate_app",
  "iterative_development",
  "code_review",
  "run_tests",
  "deploy_app",
  "list_projects",
  "get_project_status",
] as const;

const GPTPilotToolSchema = Type.Object({
  action: stringEnum(GPT_PILOT_ACTIONS),
  project_id: Type.Optional(Type.String({ description: "Project ID for operations." })),
  name: Type.Optional(Type.String({ description: "Project or app name." })),
  description: Type.Optional(Type.String({ description: "Project description." })),
  tech_stack: Type.Optional(
    Type.String({
      description: "Technology stack (e.g., 'node', 'python', 'react', 'django').",
    }),
  ),
  feature: Type.Optional(
    Type.String({ description: "Feature description for iterative development." }),
  ),
  test_type: Type.Optional(
    Type.String({ description: "Test type (e.g., 'unit', 'integration', 'e2e')." }),
  ),
  deployment_target: Type.Optional(
    Type.String({ description: "Deployment target (e.g., 'heroku', 'aws', 'docker')." }),
  ),
  config: Type.Optional(Type.String({ description: "JSON configuration for the project." })),
});

type GPTPilotConfig = {
  enabled: boolean;
  workingDir?: string;
  autoApprove?: boolean;
};

function resolveGPTPilotConfig(cfg: OpenClawConfig | undefined): GPTPilotConfig {
  const toolsCfg = (cfg as Record<string, unknown> | undefined)?.tools as
    | Record<string, unknown>
    | undefined;
  const gptpilot = toolsCfg?.gptpilot as Record<string, unknown> | undefined;

  return {
    enabled: (gptpilot?.enabled as boolean) ?? true,
    workingDir: (gptpilot?.workingDir as string) ?? process.env.GPT_PILOT_WORKSPACE ?? "./workspace",
    autoApprove: (gptpilot?.autoApprove as boolean) ?? false,
  };
}

// In-memory stores
const projects = new Map<string, Record<string, unknown>>();
const deployments = new Map<string, Array<Record<string, unknown>>>();

export function createGPTPilotTool(options?: { config?: OpenClawConfig }): AnyAgentTool {
  const tool: AnyAgentTool = {
    name: "gpt_pilot",
    label: "GPT Pilot",
    description: [
      "Lead developer agent for full app development lifecycle.",
      "Actions: create_project, generate_app, iterative_development, code_review,",
      "run_tests, deploy_app, list_projects, get_project_status.",
      "Provides scaffolding, code generation, and deployment automation.",
    ].join(" "),
    parameters: GPTPilotToolSchema,
    execute: async (_toolCallId, params: Record<string, unknown>) => {
      const config = resolveGPTPilotConfig(options?.config);

      if (!config.enabled) {
        return jsonResult({ error: "GPT Pilot integration is disabled in config." });
      }

      const action = readStringParam(params, "action", true);
      const projectId = readStringParam(params, "project_id");
      const name = readStringParam(params, "name");
      const description = readStringParam(params, "description");
      const techStack = readStringParam(params, "tech_stack");
      const feature = readStringParam(params, "feature");
      const testType = readStringParam(params, "test_type");
      const deploymentTarget = readStringParam(params, "deployment_target");
      const configStr = readStringParam(params, "config");

      try {
        switch (action) {
          case "create_project": {
            if (!name || !description) {
              return jsonResult({ error: "name and description are required for create_project" });
            }
            const id = `project_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            const projectConfig = configStr ? JSON.parse(configStr) : {};
            projects.set(id, {
              name,
              description,
              techStack: techStack ?? "node",
              config: projectConfig,
              createdAt: new Date().toISOString(),
              status: "created",
              features: [],
              testResults: [],
            });
            deployments.set(id, []);
            return jsonResult({
              success: true,
              project_id: id,
              message: `Project '${name}' created`,
              working_dir: `${config.workingDir}/${id}`,
            });
          }

          case "generate_app": {
            if (!projectId) {
              return jsonResult({ error: "project_id is required for generate_app" });
            }
            const project = projects.get(projectId);
            if (!project) {
              return jsonResult({ error: `Project ${projectId} not found` });
            }
            project.status = "generating";
            project.generatedAt = new Date().toISOString();
            project.generatedFiles = [
              "package.json",
              "src/index.js",
              "src/routes/api.js",
              "tests/unit.test.js",
              "README.md",
            ];
            project.status = "generated";
            return jsonResult({
              success: true,
              message: `App generated for project '${project.name}'`,
              files: project.generatedFiles,
              note: "App generation simulated (GPT Pilot not installed)",
            });
          }

          case "iterative_development": {
            if (!projectId || !feature) {
              return jsonResult({
                error: "project_id and feature are required for iterative_development",
              });
            }
            const project = projects.get(projectId);
            if (!project) {
              return jsonResult({ error: `Project ${projectId} not found` });
            }
            const featureData = {
              description: feature,
              implementedAt: new Date().toISOString(),
              status: config.autoApprove ? "implemented" : "pending_review",
              changes: ["Modified src/index.js", "Added src/features/newFeature.js"],
            };
            (project.features as Array<Record<string, unknown>>).push(featureData);
            return jsonResult({
              success: true,
              message: `Feature development ${config.autoApprove ? "completed" : "pending review"}`,
              feature: featureData,
              requires_approval: !config.autoApprove,
              note: "Feature implementation simulated (GPT Pilot not installed)",
            });
          }

          case "code_review": {
            if (!projectId) {
              return jsonResult({ error: "project_id is required for code_review" });
            }
            const project = projects.get(projectId);
            if (!project) {
              return jsonResult({ error: `Project ${projectId} not found` });
            }
            const review = {
              reviewedAt: new Date().toISOString(),
              issues: [
                { severity: "low", file: "src/index.js", line: 42, message: "Consider refactoring" },
                { severity: "medium", file: "src/routes/api.js", line: 15, message: "Add error handling" },
              ],
              rating: "good",
            };
            project.lastReview = review;
            return jsonResult({
              success: true,
              message: "Code review completed",
              review,
              note: "Code review simulated (GPT Pilot not installed)",
            });
          }

          case "run_tests": {
            if (!projectId) {
              return jsonResult({ error: "project_id is required for run_tests" });
            }
            const project = projects.get(projectId);
            if (!project) {
              return jsonResult({ error: `Project ${projectId} not found` });
            }
            const testResult = {
              runAt: new Date().toISOString(),
              type: testType ?? "all",
              passed: 24,
              failed: 1,
              skipped: 2,
              duration: "5.3s",
            };
            (project.testResults as Array<Record<string, unknown>>).push(testResult);
            return jsonResult({
              success: true,
              message: "Tests completed",
              test_result: testResult,
              note: "Test execution simulated (GPT Pilot not installed)",
            });
          }

          case "deploy_app": {
            if (!projectId) {
              return jsonResult({ error: "project_id is required for deploy_app" });
            }
            const project = projects.get(projectId);
            if (!project) {
              return jsonResult({ error: `Project ${projectId} not found` });
            }
            const deployment = {
              deployedAt: new Date().toISOString(),
              target: deploymentTarget ?? "heroku",
              status: "deployed",
              url: `https://${project.name}-${Date.now()}.herokuapp.com`,
            };
            const projectDeployments = deployments.get(projectId) ?? [];
            projectDeployments.push(deployment);
            deployments.set(projectId, projectDeployments);
            project.lastDeployment = deployment;
            return jsonResult({
              success: true,
              message: `App deployed to ${deployment.target}`,
              deployment,
              note: "Deployment simulated (GPT Pilot not installed)",
            });
          }

          case "list_projects": {
            const projectList = Array.from(projects.entries()).map(([id, project]) => ({
              id,
              name: project.name,
              description: project.description,
              status: project.status,
              techStack: project.techStack,
              featureCount: (project.features as Array<unknown>).length,
              createdAt: project.createdAt,
            }));
            return jsonResult({
              success: true,
              projects: projectList,
              count: projectList.length,
            });
          }

          case "get_project_status": {
            if (!projectId) {
              return jsonResult({ error: "project_id is required for get_project_status" });
            }
            const project = projects.get(projectId);
            if (!project) {
              return jsonResult({ error: `Project ${projectId} not found` });
            }
            return jsonResult({
              success: true,
              project_id: projectId,
              name: project.name,
              status: project.status,
              features: project.features,
              last_review: project.lastReview,
              last_deployment: project.lastDeployment,
            });
          }

          default:
            return jsonResult({ error: `Unknown action: ${action}` });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return jsonResult({ error: `GPT Pilot tool error: ${message}` });
      }
    },
  };

  return tool;
}
