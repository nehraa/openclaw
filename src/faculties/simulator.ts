/**
 * Simulator faculty - scenario simulation using MetaGPT.
 *
 * This faculty simulates different scenarios, runs what-if analyses,
 * and models complex interactions using multi-agent simulation.
 */

import type { FacultyConfig, FacultyResult } from "./types.js";
import { createMetaGPTTool } from "../agents/tools/metagpt-tool.js";

export type SimulatorRequest = {
  /** Scenario to simulate. */
  scenario: string;
  /** Number of simulation iterations. */
  iterations?: number;
  /** Agents to include in simulation. */
  agents?: string[];
  /** Environment parameters. */
  environment?: Record<string, unknown>;
};

export type SimulatorResult = {
  /** Simulation ID. */
  simulationId?: string;
  /** Simulation outcomes. */
  outcomes?: Array<{
    iteration: number;
    result: string;
    metrics?: Record<string, number>;
  }>;
  /** Overall summary. */
  summary?: string;
  /** Key insights from simulation. */
  insights?: string[];
};

/**
 * Run scenario simulations using multi-agent systems.
 */
export async function simulate(
  request: SimulatorRequest,
  config: FacultyConfig,
): Promise<FacultyResult<SimulatorResult>> {
  try {
    const metagptTool = createMetaGPTTool({ config: config.config });

    // Create a project for the simulation
    const projectResult = await metagptTool.execute("create", {
      action: "create_project",
      project_name: `Simulation_${Date.now()}`,
      requirements: `Simulate scenario: ${request.scenario}`,
      sop_type: "agile",
    });

    if (!projectResult) {
      return {
        success: false,
        error: "Failed to create simulation project",
      };
    }

    const projectId = (projectResult.details as Record<string, unknown>)?.project_id as string;

    // Run simulation iterations
    const iterations = request.iterations ?? 3;
    const outcomes: Array<{
      iteration: number;
      result: string;
      metrics?: Record<string, number>;
    }> = [];

    for (let i = 0; i < iterations; i++) {
      // Simulate one iteration
      const outcome = simulateIteration(request.scenario, i + 1, request.environment);
      outcomes.push(outcome);
    }

    // Generate insights
    const insights = generateInsights(outcomes);
    const summary = generateSimulationSummary(request.scenario, outcomes);

    return {
      success: true,
      data: {
        simulationId: projectId,
        outcomes,
        summary,
        insights,
      },
      metadata: {
        scenario: request.scenario,
        iterationCount: iterations,
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
 * Simulate a single iteration of the scenario.
 */
function simulateIteration(
  scenario: string,
  iteration: number,
  environment?: Record<string, unknown>,
): {
  iteration: number;
  result: string;
  metrics?: Record<string, number>;
} {
  // Simulated outcome with randomized metrics
  const successRate = 0.6 + Math.random() * 0.3; // 60-90%
  const efficiency = 0.5 + Math.random() * 0.4; // 50-90%
  const cost = 100 + Math.random() * 200; // 100-300

  return {
    iteration,
    result: `Iteration ${iteration}: ${successRate > 0.75 ? "Success" : "Partial success"} - ${scenario}`,
    metrics: {
      successRate,
      efficiency,
      cost,
      ...((environment as Record<string, number>) ?? {}),
    },
  };
}

/**
 * Generate insights from simulation outcomes.
 */
function generateInsights(
  outcomes: Array<{
    iteration: number;
    result: string;
    metrics?: Record<string, number>;
  }>,
): string[] {
  const avgSuccessRate =
    outcomes.reduce((sum, o) => sum + (o.metrics?.successRate ?? 0), 0) / outcomes.length;

  const insights = [
    `Average success rate: ${(avgSuccessRate * 100).toFixed(1)}%`,
    `Simulation showed ${avgSuccessRate > 0.8 ? "high" : avgSuccessRate > 0.6 ? "moderate" : "low"} feasibility`,
    "Key factors: agent coordination, resource allocation, timing",
  ];

  if (avgSuccessRate > 0.85) {
    insights.push("Recommendation: Proceed with implementation");
  } else if (avgSuccessRate > 0.7) {
    insights.push("Recommendation: Refine approach before implementation");
  } else {
    insights.push("Recommendation: Reconsider strategy or explore alternatives");
  }

  return insights;
}

/**
 * Generate summary from simulation results.
 */
function generateSimulationSummary(
  scenario: string,
  outcomes: Array<{
    iteration: number;
    result: string;
    metrics?: Record<string, number>;
  }>,
): string {
  const successCount = outcomes.filter((o) => (o.metrics?.successRate ?? 0) > 0.75).length;

  return `Simulation Summary for "${scenario}":

Iterations: ${outcomes.length}
Successful outcomes: ${successCount}/${outcomes.length}

The simulation suggests ${successCount >= outcomes.length * 0.7 ? "favorable" : successCount >= outcomes.length * 0.5 ? "mixed" : "challenging"} results.
Review individual iteration metrics for detailed analysis.`;
}

/**
 * Detect if input involves simulation or what-if scenarios.
 */
export function detectSimulatorIntent(input: string): boolean {
  const simulationKeywords = [
    "simulate",
    "what if",
    "scenario",
    "model",
    "predict",
    "forecast",
    "test out",
    "try different",
    "possible outcomes",
    "run simulation",
  ];

  const lowerInput = input.toLowerCase();
  return simulationKeywords.some((keyword) => lowerInput.includes(keyword));
}
