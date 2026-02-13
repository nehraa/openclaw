import { describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../../config/config.js";
import { createPicoclawTool } from "./picoclaw-tool.js";

describe("picoclaw-tool", () => {
  it("creates a tool with correct name and label", () => {
    const tool = createPicoclawTool();
    expect(tool.name).toBe("picoclaw");
    expect(tool.label).toBe("PicoClaw Helpers");
  });

  it("returns error when helper id is unknown", async () => {
    const config = {
      tools: {
        picoclaw: {
          helpers: [{ id: "nano" }],
        },
      },
    } as OpenClawConfig;
    const tool = createPicoclawTool({ config });
    const result = await tool.execute("test-call-id", {
      message: "hello",
      helper: "missing",
    });
    const parsed = JSON.parse((result.content[0] as { text: string }).text);
    expect(parsed.error).toContain("Unknown PicoClaw helper");
  });

  it("runs helper with resolved config", async () => {
    const run = vi.fn(async () => ({
      stdout: "🦞 ok",
      stderr: "",
      exitCode: 0,
      signal: null,
      timedOut: false,
    }));
    const config = {
      tools: {
        picoclaw: {
          binPath: "/usr/bin/picoclaw",
          helpers: [
            {
              id: "nano",
              homeDir: "/srv/picoclaw-nano",
              session: "cli:nano",
              timeoutSeconds: 5,
            },
          ],
        },
      },
    } as OpenClawConfig;
    const tool = createPicoclawTool({ config, run });
    const result = await tool.execute("test-call-id", {
      message: "hi",
    });
    const parsed = JSON.parse((result.content[0] as { text: string }).text);
    expect(run).toHaveBeenCalledTimes(1);
    const call = run.mock.calls[0][0];
    expect(call.argv).toEqual(["/usr/bin/picoclaw", "agent", "-m", "hi", "-s", "cli:nano"]);
    expect(call.env.HOME).toBe("/srv/picoclaw-nano");
    expect(call.timeoutMs).toBe(5000);
    expect(parsed.output).toBe("ok");
    expect(parsed.helper).toBe("nano");
  });
});
