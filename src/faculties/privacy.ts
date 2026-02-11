/**
 * Privacy faculty - PII detection and protection using LiteLLM switching.
 *
 * This faculty monitors for personally identifiable information (PII) and
 * can route sensitive requests to privacy-preserving models or local inference.
 */

import { createLiteLLMTool } from "../agents/tools/litellm-tool.js";
import type { FacultyConfig, FacultyResult } from "./types.js";

export type PrivacyRequest = {
  /** Text to analyze for PII. */
  text: string;
  /** Whether to redact PII if found. */
  redact?: boolean;
  /** Whether to switch to local model if PII detected. */
  useLocalModel?: boolean;
};

export type PrivacyResult = {
  /** Whether PII was detected. */
  hasPII: boolean;
  /** Types of PII found. */
  piiTypes?: string[];
  /** Redacted text (if redact=true). */
  redactedText?: string;
  /** Recommended model for processing (local if PII detected). */
  recommendedModel?: string;
  /** Privacy risk level. */
  riskLevel?: "low" | "medium" | "high";
};

/**
 * Analyze text for PII and provide privacy-preserving recommendations.
 */
export async function protect(
  request: PrivacyRequest,
  config: FacultyConfig,
): Promise<FacultyResult<PrivacyResult>> {
  try {
    // Detect PII patterns
    const piiAnalysis = detectPII(request.text);

    // If PII detected and local model requested, switch model
    let recommendedModel: string | undefined;
    if (piiAnalysis.hasPII && request.useLocalModel) {
      const litellmTool = createLiteLLMTool({ config: config.config });

      // Set fallback chain to prefer local models
      await litellmTool.execute("set_fallback", {
        action: "set_fallback_chain",
        fallback_models: "ollama/llama3,ollama/mistral,gpt-4",
      });

      recommendedModel = "ollama/llama3";
    }

    // Redact PII if requested
    let redactedText: string | undefined;
    if (request.redact && piiAnalysis.hasPII) {
      redactedText = redactPII(request.text, piiAnalysis.piiTypes);
    }

    return {
      success: true,
      data: {
        hasPII: piiAnalysis.hasPII,
        piiTypes: piiAnalysis.piiTypes,
        redactedText,
        recommendedModel,
        riskLevel: piiAnalysis.riskLevel,
      },
      metadata: {
        piiPatternCount: piiAnalysis.piiTypes.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Detect PII in text using pattern matching.
 */
function detectPII(text: string): {
  hasPII: boolean;
  piiTypes: string[];
  riskLevel: "low" | "medium" | "high";
} {
  const piiTypes: string[] = [];

  // Email detection
  if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(text)) {
    piiTypes.push("email");
  }

  // Phone number detection (various formats)
  if (/\b(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(text)) {
    piiTypes.push("phone");
  }

  // SSN detection (US)
  if (/\b\d{3}-\d{2}-\d{4}\b/.test(text)) {
    piiTypes.push("ssn");
  }

  // Credit card detection
  if (/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/.test(text)) {
    piiTypes.push("credit_card");
  }

  // IP address detection
  if (/\b(?:\d{1,3}\.){3}\d{1,3}\b/.test(text)) {
    piiTypes.push("ip_address");
  }

  // Address patterns (basic)
  if (/\b\d+\s+[A-Za-z]+\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd)\b/i.test(text)) {
    piiTypes.push("address");
  }

  // Determine risk level
  let riskLevel: "low" | "medium" | "high" = "low";
  if (piiTypes.includes("ssn") || piiTypes.includes("credit_card")) {
    riskLevel = "high";
  } else if (piiTypes.length >= 2) {
    riskLevel = "medium";
  } else if (piiTypes.length > 0) {
    riskLevel = "low";
  }

  return {
    hasPII: piiTypes.length > 0,
    piiTypes,
    riskLevel,
  };
}

/**
 * Redact PII from text.
 */
function redactPII(text: string, piiTypes: string[]): string {
  let redacted = text;

  if (piiTypes.includes("email")) {
    redacted = redacted.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "[EMAIL_REDACTED]");
  }

  if (piiTypes.includes("phone")) {
    redacted = redacted.replace(
      /\b(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
      "[PHONE_REDACTED]",
    );
  }

  if (piiTypes.includes("ssn")) {
    redacted = redacted.replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[SSN_REDACTED]");
  }

  if (piiTypes.includes("credit_card")) {
    redacted = redacted.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, "[CARD_REDACTED]");
  }

  if (piiTypes.includes("ip_address")) {
    redacted = redacted.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "[IP_REDACTED]");
  }

  if (piiTypes.includes("address")) {
    redacted = redacted.replace(
      /\b\d+\s+[A-Za-z]+\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd)\b/gi,
      "[ADDRESS_REDACTED]",
    );
  }

  return redacted;
}

/**
 * Detect if input contains or is about PII/privacy concerns.
 */
export function detectPrivacyIntent(input: string): boolean {
  const privacyKeywords = [
    "private",
    "confidential",
    "sensitive",
    "personal",
    "secure",
    "encrypt",
    "redact",
    "anonymize",
    "pii",
    "gdpr",
    "hipaa",
  ];

  const lowerInput = input.toLowerCase();
  return privacyKeywords.some((keyword) => lowerInput.includes(keyword));
}
