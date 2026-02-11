/**
 * Faculty system types - shared interfaces for the cognitive architecture.
 *
 * Faculties are specialized subsystems that handle different aspects of agent cognition:
 * - Self-healing: Automated error fixing
 * - Council: Complex reasoning decomposition
 * - Memory: Deep code indexing and retrieval
 * - Senses: Multimodal input/output
 * - Research: Deep web research
 * - Workflow: Automation creation
 * - Privacy: PII protection
 * - Shepherd: Background code health monitoring
 * - Simulator: Scenario simulation
 * - Autodidact: Capability discovery
 */

import type { OpenClawConfig } from "../config/config.js";

/** Base result interface for all faculties. */
export type FacultyResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, unknown>;
};

/** Configuration options passed to faculties. */
export type FacultyConfig = {
  config?: OpenClawConfig;
  userId?: string;
  sessionKey?: string;
};

/** Faculty activation decision. */
export type FacultyActivation = {
  /** Which faculty should handle this request. */
  faculty:
    | "self-healing"
    | "council"
    | "memory"
    | "senses"
    | "research"
    | "workflow"
    | "privacy"
    | "shepherd"
    | "simulator"
    | "autodidact"
    | "none";
  /** Confidence score (0-1) for this decision. */
  confidence: number;
  /** Reason for selecting this faculty. */
  reason: string;
};

/** Input analysis for faculty routing. */
export type InputAnalysis = {
  /** Detected intent categories. */
  intents: string[];
  /** Is this an error or debugging request? */
  isError: boolean;
  /** Does it require complex multi-step reasoning? */
  requiresDecomposition: boolean;
  /** Does it require code search or retrieval? */
  requiresCodeSearch: boolean;
  /** Does it involve audio/video/image processing? */
  isMultimodal: boolean;
  /** Does it require web research? */
  requiresResearch: boolean;
  /** Does it involve automation or workflow creation? */
  isAutomation: boolean;
  /** Does it contain potential PII? */
  hasPII: boolean;
  /** Is it about code quality or health monitoring? */
  isCodeHealth: boolean;
  /** Does it involve what-if scenarios or simulation? */
  isSimulation: boolean;
  /** Is it about discovering new capabilities or APIs? */
  isCapabilityDiscovery: boolean;
};
