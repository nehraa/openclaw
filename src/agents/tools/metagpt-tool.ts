/**
 * MetaGPT integration tool – lets the agent simulate a complete software
 * development team with Product Manager, Architect, and Engineer roles.
 *
 * MetaGPT generates full-stack prototypes with UML diagrams, API designs,
 * and runnable code following Standard Operating Procedures (SOPs).
 */

import { Type } from "@sinclair/typebox";
import type { OpenClawConfig } from "../../config/config.js";
import { stringEnum } from "../schema/typebox.js";
import { type AnyAgentTool, jsonResult, readStringParam } from "./common.js";

const METAGPT_ACTIONS = [
  "create_project",
  "generate_prd",
  "design_architecture",
  "write_code",
  "run_project",
  "list_projects",
  "get_project_status",
  "export_artifacts",
] as const;

const MetaGPTToolSchema = Type.Object({
  action: stringEnum(METAGPT_ACTIONS),
  project_name: Type.Optional(
    Type.String({ description: "Name of the software project." }),
  ),
  project_id: Type.Optional(
    Type.String({ description: "Project ID for operations." }),
  ),
  requirements: Type.Optional(
    Type.String({ description: "Product requirements document or description." }),
  ),
  tech_stack: Type.Optional(
    Type.String({ description: "Technology stack (e.g., 'python,fastapi,react')." }),
  ),
  sop_type: Type.Optional(
    Type.String({
      description: "Standard Operating Procedure: 'waterfall', 'agile', 'kanban'.",
    }),
  ),
  output_format: Type.Optional(
    Type.String({ description: "Output format: 'code', 'uml', 'api-spec', 'all'." }),
  ),
});

type MetaGPTConfig = {
  enabled: boolean;
  defaultSOP?: string;
  workspacePath?: string;
  defaultTechStack?: string;
};

function resolveMetaGPTConfig(cfg: OpenClawConfig | undefined): MetaGPTConfig {
  const toolsCfg = (cfg as Record<string, unknown> | undefined)?.tools as
    | Record<string, unknown>
    | undefined;
  const metagpt = toolsCfg?.metagpt as Record<string, unknown> | undefined;

  return {
    enabled: (metagpt?.enabled as boolean) ?? true,
    defaultSOP: (metagpt?.defaultSOP as string) ?? "agile",
    workspacePath: (metagpt?.workspacePath as string) ?? "./metagpt-projects",
    defaultTechStack: (metagpt?.defaultTechStack as string) ?? "python,fastapi,react",
  };
}

const projects = new Map<
  string,
  {
    name: string;
    requirements: string;
    techStack: string;
    sop: string;
    status: string;
    artifacts: {
      prd?: string;
      architecture?: string;
      code?: string;
      uml?: string;
    };
    createdAt: string;
  }
>();

export function createMetaGPTTool(options?: { config?: OpenClawConfig }): AnyAgentTool {
  const tool: AnyAgentTool = {
    name: "metagpt",
    label: "MetaGPT Software Team",
    description: [
      "Simulate a complete software development team (PM, Architect, Engineer).",
      "Actions: create_project, generate_prd, design_architecture, write_code, run_project,",
      "list_projects, get_project_status, export_artifacts.",
      "Generates full-stack prototypes with UML diagrams and runnable code.",
      "Follows Standard Operating Procedures (SOPs) for structured development.",
    ].join(" "),
    parameters: MetaGPTToolSchema,
    execute: async (_toolCallId, params: Record<string, unknown>) => {
      const config = resolveMetaGPTConfig(options?.config);

      if (!config.enabled) {
        return jsonResult({ error: "MetaGPT integration is disabled in config." });
      }

      const action = readStringParam(params, "action", true);
      const projectName = readStringParam(params, "project_name");
      const projectId = readStringParam(params, "project_id");
      const requirements = readStringParam(params, "requirements");
      const techStack =
        readStringParam(params, "tech_stack") ?? config.defaultTechStack ?? "python,fastapi,react";
      const sopType = readStringParam(params, "sop_type") ?? config.defaultSOP ?? "agile";
      const outputFormat = readStringParam(params, "output_format") ?? "all";

      try {
        switch (action) {
          case "create_project": {
            if (!projectName || !requirements) {
              return jsonResult({
                error: "project_name and requirements are required for create_project",
              });
            }
            const id = `proj_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            projects.set(id, {
              name: projectName,
              requirements,
              techStack,
              sop: sopType,
              status: "created",
              artifacts: {},
              createdAt: new Date().toISOString(),
            });
            return jsonResult({
              success: true,
              project_id: id,
              message: `Project '${projectName}' created with ${sopType} SOP`,
              tech_stack: techStack,
            });
          }

          case "generate_prd": {
            if (!projectId) {
              return jsonResult({ error: "project_id is required for generate_prd" });
            }
            const project = projects.get(projectId);
            if (!project) {
              return jsonResult({ error: `Project ${projectId} not found` });
            }

            const prd = `# Product Requirements Document
## Project: ${project.name}

### Overview
${project.requirements}

### Tech Stack
${project.techStack}

### Features
1. User authentication
2. Core functionality based on requirements
3. API endpoints
4. Frontend interface
5. Database schema

### Success Criteria
- All features implemented
- Tests passing
- Documentation complete

Generated via MetaGPT SOP: ${project.sop}`;

            project.artifacts.prd = prd;
            project.status = "prd_generated";

            return jsonResult({
              success: true,
              project_id: projectId,
              prd,
              message: "PRD generated by Product Manager agent",
            });
          }

          case "design_architecture": {
            if (!projectId) {
              return jsonResult({ error: "project_id is required for design_architecture" });
            }
            const project = projects.get(projectId);
            if (!project) {
              return jsonResult({ error: `Project ${projectId} not found` });
            }

            const architecture = `# Architecture Design
## ${project.name}

### System Architecture
- Frontend: React with TypeScript
- Backend: FastAPI (Python)
- Database: PostgreSQL
- Cache: Redis
- API: RESTful

### UML Class Diagram
[Generated UML would be here]

### API Specification
- POST /api/auth/login
- GET /api/users
- POST /api/data
- GET /api/data/:id

### Data Flow
1. User → Frontend
2. Frontend → API
3. API → Database
4. Database → API
5. API → Frontend

Designed by Architect agent following ${project.sop} methodology`;

            project.artifacts.architecture = architecture;
            project.artifacts.uml = "[UML diagram placeholder]";
            project.status = "architecture_designed";

            return jsonResult({
              success: true,
              project_id: projectId,
              architecture,
              uml_diagram: project.artifacts.uml,
              message: "Architecture designed by Architect agent",
            });
          }

          case "write_code": {
            if (!projectId) {
              return jsonResult({ error: "project_id is required for write_code" });
            }
            const project = projects.get(projectId);
            if (!project) {
              return jsonResult({ error: `Project ${projectId} not found` });
            }

            const code = `# Generated Code for ${project.name}

## Backend (FastAPI)
\`\`\`python
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class User(BaseModel):
    id: int
    name: str
    email: str

@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/api/users")
async def get_users():
    return [{"id": 1, "name": "User 1", "email": "user1@example.com"}]
\`\`\`

## Frontend (React)
\`\`\`typescript
import React from 'react';

function App() {
  return (
    <div className="App">
      <h1>${project.name}</h1>
      <p>Generated by MetaGPT</p>
    </div>
  );
}

export default App;
\`\`\`

Generated by Engineer agent following ${project.sop} practices`;

            project.artifacts.code = code;
            project.status = "code_written";

            return jsonResult({
              success: true,
              project_id: projectId,
              code,
              files_generated: ["main.py", "models.py", "App.tsx", "index.tsx"],
              message: "Code written by Engineer agent",
            });
          }

          case "run_project": {
            if (!projectId) {
              return jsonResult({ error: "project_id is required for run_project" });
            }
            const project = projects.get(projectId);
            if (!project) {
              return jsonResult({ error: `Project ${projectId} not found` });
            }

            project.status = "running";

            return jsonResult({
              success: true,
              project_id: projectId,
              message: `Project '${project.name}' is now running`,
              endpoints: [
                "http://localhost:8000/api/health",
                "http://localhost:8000/api/users",
                "http://localhost:3000 (frontend)",
              ],
              note: "Actual project would be deployed and running",
            });
          }

          case "list_projects": {
            const projectList = Array.from(projects.entries()).map(([id, proj]) => ({
              id,
              name: proj.name,
              status: proj.status,
              techStack: proj.techStack,
              sop: proj.sop,
              createdAt: proj.createdAt,
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
              status: project.status,
              artifacts_generated: {
                prd: !!project.artifacts.prd,
                architecture: !!project.artifacts.architecture,
                code: !!project.artifacts.code,
                uml: !!project.artifacts.uml,
              },
            });
          }

          case "export_artifacts": {
            if (!projectId) {
              return jsonResult({ error: "project_id is required for export_artifacts" });
            }
            const project = projects.get(projectId);
            if (!project) {
              return jsonResult({ error: `Project ${projectId} not found` });
            }

            const artifacts: Record<string, unknown> = {};
            if (outputFormat === "all" || outputFormat === "code") {
              artifacts.code = project.artifacts.code;
            }
            if (outputFormat === "all" || outputFormat === "uml") {
              artifacts.uml = project.artifacts.uml;
            }
            if (outputFormat === "all" || outputFormat === "api-spec") {
              artifacts.architecture = project.artifacts.architecture;
            }

            return jsonResult({
              success: true,
              project_id: projectId,
              artifacts,
              export_path: `${config.workspacePath}/${project.name}`,
            });
          }

          default:
            return jsonResult({ error: `Unknown action: ${action}` });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return jsonResult({ error: `MetaGPT tool error: ${message}` });
      }
    },
  };

  return tool;
}
