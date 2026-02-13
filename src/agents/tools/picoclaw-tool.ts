import { Type } from "@sinclair/typebox";
import { spawn } from "node:child_process";
import type { OpenClawConfig } from "../../config/config.js";
import type { AnyAgentTool } from "./common.js";
import { killProcessTree, sanitizeBinaryOutput } from "../shell-utils.js";
import { jsonResult, readNumberParam, readStringParam } from "./common.js";

const PicoclawToolSchema = Type.Object({
  message: Type.String({
    description: "Prompt to send to a PicoClaw helper.",
  }),
  helper: Type.Optional(
    Type.String({
      description: "Helper id from tools.picoclaw.helpers to target.",
    }),
  ),
  session: Type.Optional(
    Type.String({
      description: "Override the PicoClaw session key for this request.",
    }),
  ),
  timeoutSeconds: Type.Optional(
    Type.Number({
      minimum: 1,
      description: "Timeout override in seconds.",
    }),
  ),
});

const DEFAULT_TIMEOUT_SECONDS = 180;
const PICOCLAW_AGENT_COMMAND = "agent";

type PicoclawHelperConfig = {
  id: string;
  binPath?: string;
  homeDir?: string;
  session?: string;
  timeoutSeconds?: number;
};

type PicoclawToolConfig = {
  binPath?: string;
  defaultHelper?: string;
  timeoutSeconds?: number;
  helpers?: PicoclawHelperConfig[];
};

type PicoclawRunParams = {
  argv: string[];
  env: NodeJS.ProcessEnv;
  timeoutMs: number;
};

type PicoclawRunResult = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
};

type PicoclawRunner = (params: PicoclawRunParams) => Promise<PicoclawRunResult>;

function readConfigString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function readConfigNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function resolvePicoclawConfig(cfg?: OpenClawConfig): PicoclawToolConfig | undefined {
  const tools = (cfg as Record<string, unknown> | undefined)?.tools as
    | Record<string, unknown>
    | undefined;
  const picoclaw = tools?.picoclaw as Record<string, unknown> | undefined;
  if (!picoclaw) {
    return undefined;
  }
  const helpers = Array.isArray(picoclaw.helpers)
    ? picoclaw.helpers
        .map((entry) => {
          if (!entry || typeof entry !== "object") {
            return null;
          }
          const record = entry as Record<string, unknown>;
          const id = readConfigString(record.id);
          if (!id) {
            return null;
          }
          return {
            id,
            binPath: readConfigString(record.binPath),
            homeDir: readConfigString(record.homeDir),
            session: readConfigString(record.session),
            timeoutSeconds: readConfigNumber(record.timeoutSeconds),
          } satisfies PicoclawHelperConfig;
        })
        .filter((entry): entry is PicoclawHelperConfig => Boolean(entry))
    : undefined;
  const config: PicoclawToolConfig = {
    binPath: readConfigString(picoclaw.binPath),
    defaultHelper: readConfigString(picoclaw.defaultHelper),
    timeoutSeconds: readConfigNumber(picoclaw.timeoutSeconds),
    helpers,
  };
  if (
    !config.binPath &&
    !config.defaultHelper &&
    !config.timeoutSeconds &&
    (!config.helpers || config.helpers.length === 0)
  ) {
    return undefined;
  }
  return config;
}

function resolveHelper(
  config: PicoclawToolConfig | undefined,
  helperId?: string,
): { helper?: PicoclawHelperConfig; error?: string } {
  const helpers = config?.helpers ?? [];
  if (helperId) {
    const helper = helpers.find((entry) => entry.id === helperId);
    if (!helper) {
      return { error: `Unknown PicoClaw helper "${helperId}".` };
    }
    return { helper };
  }
  if (helpers.length === 0) {
    return {};
  }
  if (config?.defaultHelper) {
    const helper = helpers.find((entry) => entry.id === config.defaultHelper);
    if (!helper) {
      return { error: `Default PicoClaw helper "${config.defaultHelper}" was not found.` };
    }
    return { helper };
  }
  if (helpers.length === 1) {
    return { helper: helpers[0] };
  }
  return { error: "Multiple PicoClaw helpers configured; specify helper." };
}

function buildHelperEnv(homeDir?: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  if (homeDir) {
    env.HOME = homeDir;
    env.USERPROFILE = homeDir;
    env.PICOCLAW_HOME = homeDir;
  }
  return env;
}

function normalizePicoclawOutput(stdout: string): { output: string; raw: string } {
  const raw = stdout.trim();
  if (!raw) {
    return { output: "", raw: "" };
  }
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const responseLine = [...lines].reverse().find((line) => line.startsWith("🦞"));
  if (responseLine) {
    return { output: responseLine.replace(/^🦞\s*/u, ""), raw };
  }
  return { output: raw, raw };
}

async function runPicoclawCommand(params: PicoclawRunParams): Promise<PicoclawRunResult> {
  const child = spawn(params.argv[0], params.argv.slice(1), {
    env: params.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout?.on("data", (chunk) => {
    stdout += chunk.toString("utf8");
  });
  child.stderr?.on("data", (chunk) => {
    stderr += chunk.toString("utf8");
  });
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    if (child.pid) {
      killProcessTree(child.pid);
    }
  }, params.timeoutMs);

  try {
    const { code, signal } = await new Promise<{
      code: number | null;
      signal: NodeJS.Signals | null;
    }>((resolve, reject) => {
      child.once("error", reject);
      child.once("close", (exitCode, exitSignal) => {
        resolve({ code: exitCode, signal: exitSignal });
      });
    });
    return {
      stdout: sanitizeBinaryOutput(stdout),
      stderr: sanitizeBinaryOutput(stderr),
      exitCode: code,
      signal,
      timedOut,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function createPicoclawTool(options?: {
  config?: OpenClawConfig;
  run?: PicoclawRunner;
}): AnyAgentTool {
  return {
    name: "picoclaw",
    label: "PicoClaw Helpers",
    description: [
      "Call a PicoClaw helper via the picoclaw CLI.",
      "Requires the picoclaw binary and a configured ~/.picoclaw/config.json.",
      "Use helper to select configured helpers (tools.picoclaw.helpers).",
    ].join(" "),
    parameters: PicoclawToolSchema,
    execute: async (_toolCallId, params: Record<string, unknown>) => {
      try {
        const message = readStringParam(params, "message", { required: true });
        const helperId = readStringParam(params, "helper");
        const sessionOverride = readStringParam(params, "session");
        const timeoutOverride = readNumberParam(params, "timeoutSeconds", { integer: true });

        const config = resolvePicoclawConfig(options?.config);
        const { helper, error } = resolveHelper(config, helperId);
        if (error) {
          return jsonResult({ error });
        }

        const binPath =
          helper?.binPath ?? config?.binPath ?? process.env.PICOCLAW_BIN ?? "picoclaw";
        const session = sessionOverride ?? helper?.session;
        const rawTimeoutSeconds =
          timeoutOverride ??
          helper?.timeoutSeconds ??
          config?.timeoutSeconds ??
          DEFAULT_TIMEOUT_SECONDS;
        const timeoutSeconds = Number.isFinite(rawTimeoutSeconds)
          ? Math.max(1, Math.trunc(rawTimeoutSeconds))
          : DEFAULT_TIMEOUT_SECONDS;
        const env = buildHelperEnv(helper?.homeDir);
        const argv = [PICOCLAW_AGENT_COMMAND, "-m", message, ...(session ? ["-s", session] : [])];

        const runner = options?.run ?? runPicoclawCommand;
        const result = await runner({
          argv: [binPath, ...argv],
          env,
          timeoutMs: timeoutSeconds * 1000,
        });

        const { output, raw } = normalizePicoclawOutput(result.stdout);
        if (result.timedOut) {
          return jsonResult({
            error: `PicoClaw timed out after ${timeoutSeconds} seconds.`,
            helper: helper?.id ?? helperId ?? "default",
            session,
            output,
            stderr: result.stderr.trim() || undefined,
          });
        }

        const payload: Record<string, unknown> = {
          helper: helper?.id ?? helperId ?? "default",
          session,
          output,
        };
        if (raw && raw !== output) {
          payload.rawOutput = raw;
        }
        if (result.stderr.trim()) {
          payload.stderr = result.stderr.trim();
        }
        if (result.exitCode !== 0) {
          payload.exitCode = result.exitCode;
        }
        if (result.signal) {
          payload.signal = result.signal;
        }
        return jsonResult(payload);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return jsonResult({
          error: `PicoClaw helper failed: ${message}`,
        });
      }
    },
  };
}
