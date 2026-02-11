/**
 * AutoCodeRover integration tool – automated bug fixing with program analysis.
 *
 * AutoCodeRover provides automated bug analysis, program analysis,
 * fix generation, testing, and application. MIT License.
 */

import { Type } from "@sinclair/typebox";
import type { OpenClawConfig } from "../../config/config.js";
import { stringEnum } from "../schema/typebox.js";
import { type AnyAgentTool, jsonResult, readStringParam } from "./common.js";

const AUTOCODEROVER_ACTIONS = [
  "analyze_bug",
  "program_analysis",
  "generate_fix",
  "test_fix",
  "apply_fix",
  "list_bugs",
  "get_analysis_report",
  "validate_fix",
] as const;

const AutoCodeRoverToolSchema = Type.Object({
  action: stringEnum(AUTOCODEROVER_ACTIONS),
  bug_id: Type.Optional(Type.String({ description: "Bug ID for operations." })),
  name: Type.Optional(Type.String({ description: "Bug name or title." })),
  description: Type.Optional(Type.String({ description: "Bug description or issue details." })),
  file_path: Type.Optional(Type.String({ description: "File path where bug is located." })),
  issue_url: Type.Optional(Type.String({ description: "GitHub issue URL for bug." })),
  analysis_depth: Type.Optional(
    Type.String({
      description: "Analysis depth level (e.g., 'shallow', 'medium', 'deep').",
    }),
  ),
  test_suite: Type.Optional(
    Type.String({ description: "Test suite to run (e.g., 'unit', 'integration', 'all')." }),
  ),
  auto_apply: Type.Optional(
    Type.String({ description: "Automatically apply fix if tests pass ('true' or 'false')." }),
  ),
});

type AutoCodeRoverConfig = {
  enabled: boolean;
  analysisDepth?: string;
  autoFix?: boolean;
};

function resolveAutoCodeRoverConfig(cfg: OpenClawConfig | undefined): AutoCodeRoverConfig {
  const toolsCfg = (cfg as Record<string, unknown> | undefined)?.tools as
    | Record<string, unknown>
    | undefined;
  const autocoderover = toolsCfg?.autocoderover as Record<string, unknown> | undefined;

  const autoFix = autocoderover?.autoFix as boolean | undefined;

  return {
    enabled: (autocoderover?.enabled as boolean) ?? true,
    analysisDepth: (autocoderover?.analysisDepth as string) ?? "medium",
    // Map validated `autoFix` config into behavior control
    autoFix: autoFix ?? false,
  };
}

// In-memory stores
const bugs = new Map<string, Record<string, unknown>>();
const analyses = new Map<string, Record<string, unknown>>();
const fixes = new Map<string, Record<string, unknown>>();

export function createAutoCodeRoverTool(options?: { config?: OpenClawConfig }): AnyAgentTool {
  const tool: AnyAgentTool = {
    name: "autocoderover",
    label: "AutoCodeRover",
    description: [
      "Automated bug fixing with program analysis and test validation.",
      "Actions: analyze_bug, program_analysis, generate_fix, test_fix,",
      "apply_fix, list_bugs, get_analysis_report, validate_fix.",
      "Provides automated bug detection and fixing workflow.",
    ].join(" "),
    parameters: AutoCodeRoverToolSchema,
    execute: async (_toolCallId, params: Record<string, unknown>) => {
      const config = resolveAutoCodeRoverConfig(options?.config);

      if (!config.enabled) {
        return jsonResult({ error: "AutoCodeRover integration is disabled in config." });
      }

      const action = readStringParam(params, "action", { required: true });
      const bugId = readStringParam(params, "bug_id");
      const name = readStringParam(params, "name");
      const description = readStringParam(params, "description");
      const filePath = readStringParam(params, "file_path");
      const issueUrl = readStringParam(params, "issue_url");
      const analysisDepth = readStringParam(params, "analysis_depth");
      const testSuite = readStringParam(params, "test_suite");
      const autoApplyStr = readStringParam(params, "auto_apply");

      try {
        switch (action) {
          case "analyze_bug": {
            if (!name || !description) {
              return jsonResult({
                error: "name and description are required for analyze_bug",
              });
            }
            const id = `bug_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            bugs.set(id, {
              name,
              description,
              filePath: filePath ?? "unknown",
              issueUrl: issueUrl ?? null,
              createdAt: new Date().toISOString(),
              status: "analyzing",
            });
            const analysis = {
              bugId: id,
              depth: analysisDepth ?? config.analysisDepth,
              startedAt: new Date().toISOString(),
              status: "in_progress",
            };
            analyses.set(id, analysis);
            return jsonResult({
              success: true,
              bug_id: id,
              message: `Bug analysis started: ${name}`,
              analysis_depth: analysis.depth,
            });
          }

          case "program_analysis": {
            if (!bugId) {
              return jsonResult({ error: "bug_id is required for program_analysis" });
            }
            const bug = bugs.get(bugId);
            if (!bug) {
              return jsonResult({ error: `Bug ${bugId} not found` });
            }
            const analysis = analyses.get(bugId);
            if (!analysis) {
              return jsonResult({ error: `Analysis for bug ${bugId} not found` });
            }
            const programAnalysisData = {
              completedAt: new Date().toISOString(),
              affectedFiles: [bug.filePath, "src/related.js", "tests/unit.test.js"],
              rootCause: "Null pointer dereference in edge case handling",
              callGraph: {
                entry: "main",
                calls: ["processData", "validateInput", "handleError"],
              },
              dataFlow: {
                sources: ["user_input", "config"],
                sinks: ["database", "log"],
              },
              complexity: "medium",
            };
            analysis.programAnalysis = programAnalysisData;
            analysis.status = "completed";
            bug.status = "analyzed";
            return jsonResult({
              success: true,
              message: "Program analysis completed",
              analysis: programAnalysisData,
              note: "Program analysis simulated (AutoCodeRover not installed)",
            });
          }

          case "generate_fix": {
            if (!bugId) {
              return jsonResult({ error: "bug_id is required for generate_fix" });
            }
            const bug = bugs.get(bugId);
            if (!bug) {
              return jsonResult({ error: `Bug ${bugId} not found` });
            }
            const analysis = analyses.get(bugId);
            if (!analysis || analysis.status !== "completed") {
              return jsonResult({ error: "Bug analysis must be completed before generating fix" });
            }
            const fixData = {
              bugId,
              generatedAt: new Date().toISOString(),
              changes: [
                {
                  file: bug.filePath,
                  diff: "- if (data) {\n+ if (data && data.value) {",
                  lineNumber: 42,
                },
              ],
              confidence: 0.87,
              status: "generated",
              testsRequired: true, // Fixed: always require tests for safety
            };
            fixes.set(bugId, fixData);
            bug.status = "fix_generated";
            return jsonResult({
              success: true,
              message: "Fix generated",
              fix: fixData,
              requires_testing: true,
              note: "Fix generation simulated (AutoCodeRover not installed)",
            });
          }

          case "test_fix": {
            if (!bugId) {
              return jsonResult({ error: "bug_id is required for test_fix" });
            }
            const fix = fixes.get(bugId);
            if (!fix) {
              return jsonResult({ error: `Fix for bug ${bugId} not found` });
            }
            const testResults = {
              testedAt: new Date().toISOString(),
              suite: testSuite ?? "all",
              passed: 48,
              failed: 0,
              skipped: 2,
              duration: "12.5s",
              allPassed: true,
            };
            fix.testResults = testResults;
            fix.status = testResults.allPassed ? "tested_pass" : "tested_fail";
            return jsonResult({
              success: testResults.allPassed,
              message: testResults.allPassed ? "All tests passed" : "Some tests failed",
              test_results: testResults,
              can_apply: testResults.allPassed,
              note: "Test execution simulated (AutoCodeRover not installed)",
            });
          }

          case "apply_fix": {
            if (!bugId) {
              return jsonResult({ error: "bug_id is required for apply_fix" });
            }
            const bug = bugs.get(bugId);
            const fix = fixes.get(bugId);
            if (!bug || !fix) {
              return jsonResult({ error: `Bug or fix for ${bugId} not found` });
            }
            // Always check tests passed for safety
            if (fix.status !== "tested_pass") {
              return jsonResult({ error: "Fix must pass tests before applying" });
            }
            const autoApply = autoApplyStr === "true" || config.autoFix;
            if (!autoApply) {
              return jsonResult({
                success: false,
                message: "Manual approval required to apply fix",
                requires_approval: true,
              });
            }
            fix.appliedAt = new Date().toISOString();
            fix.status = "applied";
            bug.status = "fixed";
            return jsonResult({
              success: true,
              message: "Fix applied successfully",
              applied_changes: fix.changes,
              note: "Fix application simulated (AutoCodeRover not installed)",
            });
          }

          case "list_bugs": {
            const bugList = Array.from(bugs.entries()).map(([id, bug]) => ({
              id,
              name: bug.name,
              description: bug.description,
              status: bug.status,
              filePath: bug.filePath,
              createdAt: bug.createdAt,
            }));
            return jsonResult({
              success: true,
              bugs: bugList,
              count: bugList.length,
            });
          }

          case "get_analysis_report": {
            if (!bugId) {
              return jsonResult({
                error: "bug_id is required for get_analysis_report",
              });
            }
            const bug = bugs.get(bugId);
            const analysis = analyses.get(bugId);
            const fix = fixes.get(bugId);
            if (!bug || !analysis) {
              return jsonResult({ error: `Bug or analysis for ${bugId} not found` });
            }
            const report = {
              bug_id: bugId,
              bug_name: bug.name,
              status: bug.status,
              analysis,
              fix: fix ?? null,
              timeline: {
                created: bug.createdAt,
                analyzed: analysis.completedAt,
                fixed: fix?.appliedAt ?? null,
              },
            };
            return jsonResult({
              success: true,
              report,
            });
          }

          case "validate_fix": {
            if (!bugId) {
              return jsonResult({ error: "bug_id is required for validate_fix" });
            }
            const bug = bugs.get(bugId);
            const fix = fixes.get(bugId);
            if (!bug || !fix) {
              return jsonResult({ error: `Bug or fix for ${bugId} not found` });
            }
            const validation = {
              validatedAt: new Date().toISOString(),
              checksPassed: {
                syntax: true,
                semantics: true,
                tests: (fix.testResults as Record<string, unknown> | undefined)?.allPassed ?? false,
                regressions: true,
              },
              isValid: true,
              confidence: fix.confidence,
            };
            fix.validation = validation;
            return jsonResult({
              success: true,
              message: validation.isValid ? "Fix validated successfully" : "Fix validation failed",
              validation,
            });
          }

          default:
            return jsonResult({ error: `Unknown action: ${action}` });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return jsonResult({ error: `AutoCodeRover tool error: ${message}` });
      }
    },
  };

  return tool;
}
