import { describe, expect, it } from "vitest";
import {
  createBitNetConnection,
  discoverBitNetModels,
  checkBitNetConnection,
  KNOWN_BITNET_MODELS,
} from "./bitnet-provider.js";

describe("bitnet-provider", () => {
  it("creates default connection config", () => {
    const config = createBitNetConnection();
    expect(config.baseUrl).toBe("http://127.0.0.1:8080");
    expect(config.timeoutMs).toBe(10000);
  });

  it("respects custom connection options", () => {
    const config = createBitNetConnection({
      baseUrl: "http://custom:9090",
      timeoutMs: 5000,
    });
    expect(config.baseUrl).toBe("http://custom:9090");
    expect(config.timeoutMs).toBe(5000);
  });

  it("discovers known models in test environment", async () => {
    const config = createBitNetConnection();
    const models = await discoverBitNetModels(config);
    expect(models).toEqual(KNOWN_BITNET_MODELS);
    expect(models.length).toBeGreaterThan(0);
    expect(models[0].name).toContain("BitNet");
    expect(models[0].isTernary).toBe(true);
  });

  it("check connection returns skipped in test env", async () => {
    const config = createBitNetConnection();
    const result = await checkBitNetConnection(config);
    expect(result.connected).toBe(false);
    expect(result.error).toContain("test");
  });

  it("exports known models with expected structure", () => {
    for (const model of KNOWN_BITNET_MODELS) {
      expect(model).toHaveProperty("name");
      expect(model).toHaveProperty("parameterSize");
      expect(model).toHaveProperty("isTernary");
    }
  });
});
