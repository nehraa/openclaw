import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveImplicitProviders } from "./models-config.providers.js";

describe("BitNet provider", () => {
  it("should not include bitnet when no API key is configured", async () => {
    const previousKey = process.env.BITNET_API_KEY;
    delete process.env.BITNET_API_KEY;
    try {
      const agentDir = mkdtempSync(join(tmpdir(), "openclaw-test-"));
      const providers = await resolveImplicitProviders({ agentDir });
      expect(providers?.bitnet).toBeUndefined();
    } finally {
      if (previousKey !== undefined) {
        process.env.BITNET_API_KEY = previousKey;
      }
    }
  });

  it("should include bitnet when BITNET_API_KEY is set", async () => {
    const previousKey = process.env.BITNET_API_KEY;
    process.env.BITNET_API_KEY = "test-key";
    try {
      const agentDir = mkdtempSync(join(tmpdir(), "openclaw-test-"));
      const providers = await resolveImplicitProviders({ agentDir });
      expect(providers?.bitnet).toBeDefined();
      expect(providers?.bitnet?.apiKey).toBe("BITNET_API_KEY");
    } finally {
      if (previousKey === undefined) {
        delete process.env.BITNET_API_KEY;
      } else {
        process.env.BITNET_API_KEY = previousKey;
      }
    }
  });
});
