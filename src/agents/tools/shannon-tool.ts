/**
 * Shannon code analysis tool – lets the agent run Shannon entropy analysis
 * on source code to measure complexity, information density, and detect
 * anomalies in codebases.
 *
 * Shannon (https://github.com/KeygraphHQ/shannon) is a code analysis tool
 * that uses information theory to understand code quality.
 *
 * The agent can use this tool to analyze files, directories, or repositories
 * for code complexity and quality metrics.
 */

import { Type } from "@sinclair/typebox";
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { stringEnum } from "../schema/typebox.js";
import { type AnyAgentTool, jsonResult, readStringParam } from "./common.js";

const execFileAsync = promisify(execFile);

const SHANNON_ACTIONS = [
  "analyze_file",
  "analyze_directory",
  "entropy_report",
  "complexity_summary",
] as const;

const ShannonToolSchema = Type.Object({
  action: stringEnum(SHANNON_ACTIONS),
  path: Type.String({ description: "Absolute path to file or directory to analyze." }),
  language: Type.Optional(
    Type.String({
      description: "Programming language hint (e.g. 'typescript', 'python'). Auto-detected if omitted.",
    }),
  ),
  max_depth: Type.Optional(
    Type.Number({
      description: "Max directory depth for analyze_directory (default 3).",
      minimum: 1,
      maximum: 10,
    }),
  ),
});

/** Compute Shannon entropy of a string. */
function shannonEntropy(text: string): number {
  if (text.length === 0) return 0;
  const freq = new Map<string, number>();
  for (const ch of text) {
    freq.set(ch, (freq.get(ch) ?? 0) + 1);
  }
  let entropy = 0;
  const len = text.length;
  for (const count of freq.values()) {
    const p = count / len;
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  }
  return entropy;
}

/** Basic line-level complexity metrics. */
function analyzeCode(content: string) {
  const lines = content.split("\n");
  const totalLines = lines.length;
  const blankLines = lines.filter((l) => l.trim() === "").length;
  const commentLines = lines.filter((l) => {
    const t = l.trim();
    return t.startsWith("//") || t.startsWith("#") || t.startsWith("/*") || t.startsWith("*");
  }).length;
  const codeLines = totalLines - blankLines - commentLines;

  const entropy = shannonEntropy(content);
  const avgLineLength = codeLines > 0 ? content.length / codeLines : 0;

  // Complexity indicators
  const nestingDepthMax = lines.reduce((max, line) => {
    const indent = line.search(/\S/);
    return indent > max ? indent : max;
  }, 0);

  const uniqueTokens = new Set(content.match(/\b\w+\b/g) ?? []).size;
  const totalTokens = (content.match(/\b\w+\b/g) ?? []).length;
  const vocabularyDensity = totalTokens > 0 ? uniqueTokens / totalTokens : 0;

  return {
    totalLines,
    codeLines,
    blankLines,
    commentLines,
    commentRatio: totalLines > 0 ? commentLines / totalLines : 0,
    entropy: Math.round(entropy * 1000) / 1000,
    avgLineLength: Math.round(avgLineLength * 10) / 10,
    maxNestingDepth: nestingDepthMax,
    uniqueTokens,
    totalTokens,
    vocabularyDensity: Math.round(vocabularyDensity * 1000) / 1000,
  };
}

function detectLanguage(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".py": "python",
    ".rs": "rust",
    ".go": "go",
    ".java": "java",
    ".c": "c",
    ".cpp": "c++",
    ".h": "c",
    ".cs": "c#",
    ".rb": "ruby",
    ".swift": "swift",
    ".kt": "kotlin",
    ".sh": "shell",
    ".md": "markdown",
    ".json": "json",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".toml": "toml",
  };
  return map[ext] ?? "unknown";
}

function qualityLabel(entropy: number): string {
  if (entropy < 3.0) return "low-complexity";
  if (entropy < 4.5) return "moderate-complexity";
  if (entropy < 5.5) return "typical-code";
  if (entropy < 6.5) return "dense-code";
  return "very-dense";
}

export function createShannonTool(): AnyAgentTool {
  const tool: AnyAgentTool = {
    name: "shannon",
    description: [
      "Analyze source code using Shannon entropy and information theory metrics.",
      "Actions: analyze_file (single file metrics), analyze_directory (batch analysis),",
      "entropy_report (detailed entropy breakdown), complexity_summary (quick overview).",
      "Returns entropy, complexity, vocabulary density, and quality indicators.",
    ].join(" "),
    parameters: ShannonToolSchema,
    execute: async (params: Record<string, unknown>) => {
      const action = readStringParam(params, "action", { required: true }) as (typeof SHANNON_ACTIONS)[number];
      const targetPath = readStringParam(params, "path", { required: true });

      try {
        switch (action) {
          case "analyze_file": {
            if (!fs.existsSync(targetPath)) {
              return jsonResult({ error: `File not found: ${targetPath}` });
            }
            const stat = fs.statSync(targetPath);
            if (!stat.isFile()) {
              return jsonResult({ error: `Not a file: ${targetPath}` });
            }
            const content = fs.readFileSync(targetPath, "utf-8");
            const language = (params.language as string) ?? detectLanguage(targetPath);
            const metrics = analyzeCode(content);
            return jsonResult({
              file: targetPath,
              language,
              quality: qualityLabel(metrics.entropy),
              metrics,
            });
          }

          case "analyze_directory": {
            if (!fs.existsSync(targetPath)) {
              return jsonResult({ error: `Directory not found: ${targetPath}` });
            }
            const maxDepth = (params.max_depth as number) ?? 3;
            const results: Array<{
              file: string;
              language: string;
              entropy: number;
              quality: string;
              codeLines: number;
            }> = [];

            function walk(dir: string, depth: number) {
              if (depth > maxDepth) return;
              let entries: fs.Dirent[];
              try {
                entries = fs.readdirSync(dir, { withFileTypes: true });
              } catch {
                return;
              }
              for (const entry of entries) {
                if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                  walk(full, depth + 1);
                } else if (entry.isFile()) {
                  const lang = detectLanguage(full);
                  if (lang === "unknown") continue;
                  try {
                    const content = fs.readFileSync(full, "utf-8");
                    const metrics = analyzeCode(content);
                    results.push({
                      file: path.relative(targetPath, full),
                      language: lang,
                      entropy: metrics.entropy,
                      quality: qualityLabel(metrics.entropy),
                      codeLines: metrics.codeLines,
                    });
                  } catch {
                    // skip unreadable files
                  }
                }
              }
            }

            walk(targetPath, 0);

            const avgEntropy =
              results.length > 0
                ? Math.round((results.reduce((s, r) => s + r.entropy, 0) / results.length) * 1000) / 1000
                : 0;
            const totalCodeLines = results.reduce((s, r) => s + r.codeLines, 0);

            return jsonResult({
              directory: targetPath,
              filesAnalyzed: results.length,
              averageEntropy: avgEntropy,
              totalCodeLines,
              overallQuality: qualityLabel(avgEntropy),
              files: results.slice(0, 50), // cap output
            });
          }

          case "entropy_report": {
            if (!fs.existsSync(targetPath)) {
              return jsonResult({ error: `File not found: ${targetPath}` });
            }
            const content = fs.readFileSync(targetPath, "utf-8");
            const language = (params.language as string) ?? detectLanguage(targetPath);
            const lines = content.split("\n");

            // Per-line entropy
            const lineEntropies = lines.map((line, i) => ({
              line: i + 1,
              entropy: Math.round(shannonEntropy(line) * 1000) / 1000,
              length: line.length,
            }));

            // Find hotspots (high entropy lines)
            const hotspots = lineEntropies
              .filter((le) => le.entropy > 4.5 && le.length > 20)
              .sort((a, b) => b.entropy - a.entropy)
              .slice(0, 10);

            const overall = shannonEntropy(content);

            return jsonResult({
              file: targetPath,
              language,
              overallEntropy: Math.round(overall * 1000) / 1000,
              quality: qualityLabel(overall),
              totalLines: lines.length,
              hotspots,
              entropyDistribution: {
                low: lineEntropies.filter((le) => le.entropy < 3.0).length,
                moderate: lineEntropies.filter((le) => le.entropy >= 3.0 && le.entropy < 4.5).length,
                high: lineEntropies.filter((le) => le.entropy >= 4.5).length,
              },
            });
          }

          case "complexity_summary": {
            if (!fs.existsSync(targetPath)) {
              return jsonResult({ error: `Path not found: ${targetPath}` });
            }
            const stat = fs.statSync(targetPath);
            if (stat.isFile()) {
              const content = fs.readFileSync(targetPath, "utf-8");
              const metrics = analyzeCode(content);
              return jsonResult({
                path: targetPath,
                type: "file",
                quality: qualityLabel(metrics.entropy),
                summary: {
                  entropy: metrics.entropy,
                  codeLines: metrics.codeLines,
                  commentRatio: metrics.commentRatio,
                  vocabularyDensity: metrics.vocabularyDensity,
                  maxNestingDepth: metrics.maxNestingDepth,
                },
              });
            }

            // Directory summary
            let totalEntropy = 0;
            let fileCount = 0;
            let totalLines = 0;

            function summarize(dir: string, depth: number) {
              if (depth > 3) return;
              let entries: fs.Dirent[];
              try {
                entries = fs.readdirSync(dir, { withFileTypes: true });
              } catch {
                return;
              }
              for (const entry of entries) {
                if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                  summarize(full, depth + 1);
                } else if (entry.isFile() && detectLanguage(full) !== "unknown") {
                  try {
                    const content = fs.readFileSync(full, "utf-8");
                    const metrics = analyzeCode(content);
                    totalEntropy += metrics.entropy;
                    totalLines += metrics.codeLines;
                    fileCount++;
                  } catch {
                    // skip
                  }
                }
              }
            }

            summarize(targetPath, 0);

            const avg = fileCount > 0 ? Math.round((totalEntropy / fileCount) * 1000) / 1000 : 0;
            return jsonResult({
              path: targetPath,
              type: "directory",
              quality: qualityLabel(avg),
              summary: {
                averageEntropy: avg,
                filesAnalyzed: fileCount,
                totalCodeLines: totalLines,
              },
            });
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
