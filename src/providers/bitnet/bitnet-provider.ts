/**
 * BitNet local model provider.
 *
 * BitNet (https://github.com/microsoft/BitNet) is a 1-bit LLM framework from
 * Microsoft Research that runs efficiently on CPUs with ternary weights.
 *
 * This module provides connection management, model discovery, and health
 * checks for a locally-running BitNet inference server that exposes an
 * OpenAI-compatible API (the default mode of `run_server.py`).
 */

/** BitNet connection configuration. */
export type BitNetConnectionConfig = {
  /** Base URL for the BitNet inference server (default: http://127.0.0.1:8080). */
  baseUrl: string;
  /** Connection timeout in ms. */
  timeoutMs: number;
};

/** Metadata for a locally available BitNet model. */
export type BitNetModelInfo = {
  /** Model identifier (e.g. "bitnet-b1.58-2B"). */
  name: string;
  /** Parameter count string (e.g. "2B", "7B"). */
  parameterSize: string;
  /** Whether the model supports 1-bit (ternary) quantization. */
  isTernary: boolean;
};

const DEFAULT_BITNET_URL = "http://127.0.0.1:8080";
const DEFAULT_TIMEOUT_MS = 10000;

/** Known BitNet model variants from microsoft/BitNet. */
const KNOWN_BITNET_MODELS: BitNetModelInfo[] = [
  { name: "BitNet-b1.58-2B-4T", parameterSize: "2B", isTernary: true },
  { name: "bitnet-b1.58-2B", parameterSize: "2B", isTernary: true },
  { name: "Llama3-8B-1.58-100B-tokens", parameterSize: "8B", isTernary: true },
];

/**
 * Create a BitNet connection configuration.
 *
 * Resolution order for baseUrl: options.baseUrl → BITNET_HOST env → default.
 */
export function createBitNetConnection(
  options?: Partial<BitNetConnectionConfig>,
): BitNetConnectionConfig {
  return {
    baseUrl: options?.baseUrl ?? process.env.BITNET_HOST ?? DEFAULT_BITNET_URL,
    timeoutMs: options?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  };
}

/**
 * Check if a BitNet inference server is reachable.
 */
export async function checkBitNetConnection(
  config: BitNetConnectionConfig,
): Promise<{ connected: boolean; models?: string[]; error?: string }> {
  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    return { connected: false, error: "Skipped in test environment" };
  }

  try {
    const response = await fetch(`${config.baseUrl}/v1/models`, {
      signal: AbortSignal.timeout(config.timeoutMs),
    });

    if (!response.ok) {
      return { connected: false, error: `HTTP ${response.status}` };
    }

    const data = (await response.json()) as { data?: Array<{ id: string }> };
    const models = data.data?.map((m) => m.id) ?? [];
    return { connected: true, models };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Discover available BitNet models from the running server.
 * Falls back to known model variants if the server is unreachable.
 */
export async function discoverBitNetModels(
  config: BitNetConnectionConfig,
): Promise<BitNetModelInfo[]> {
  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    return KNOWN_BITNET_MODELS;
  }

  try {
    const response = await fetch(`${config.baseUrl}/v1/models`, {
      signal: AbortSignal.timeout(config.timeoutMs),
    });

    if (!response.ok) {
      return KNOWN_BITNET_MODELS;
    }

    const data = (await response.json()) as { data?: Array<{ id: string; owned_by?: string }> };
    if (!data.data || data.data.length === 0) {
      return KNOWN_BITNET_MODELS;
    }

    return data.data.map((m) => {
      const known = KNOWN_BITNET_MODELS.find(
        (k) => k.name.toLowerCase() === m.id.toLowerCase(),
      );
      return {
        name: m.id,
        parameterSize: known?.parameterSize ?? "unknown",
        isTernary: known?.isTernary ?? true,
      };
    });
  } catch {
    return KNOWN_BITNET_MODELS;
  }
}

export { KNOWN_BITNET_MODELS };
