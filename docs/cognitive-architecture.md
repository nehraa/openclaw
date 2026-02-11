# Cognitive Architecture - Faculty System

The OpenClaw orchestrator has been transformed from a simple pipeline into a cognitive architecture with embedded "faculties" - specialized subsystems that provide advanced capabilities.

## Overview

The cognitive architecture consists of 10 specialized faculties that handle different aspects of agent cognition:

1. **Self-Healing** - Automated error fixing
2. **Council** - Complex reasoning decomposition
3. **Memory** - Deep code indexing and retrieval
4. **Senses** - Multimodal input/output
5. **Research** - Deep web research
6. **Workflow** - Automation creation
7. **Privacy** - PII protection
8. **Shepherd** - Background code health monitoring
9. **Simulator** - Scenario simulation
10. **Autodidact** - Capability discovery

## Architecture

### Input Analysis

When a message is received, the orchestrator performs input analysis to detect:

- Error messages or debugging requests
- Complex multi-step reasoning needs
- Code search requirements
- Multimodal processing needs
- Research requirements
- Automation requests
- PII/sensitive data
- Code health concerns
- Simulation scenarios
- Capability discovery requests

### Faculty Selection

Faculties are selected based on a priority system:

1. **Error Detection** (90% confidence) → Self-Healing
2. **PII Detection** (85% confidence) → Privacy
3. **Complex Reasoning** (80% confidence) → Council
4. **Multimodal** (85% confidence) → Senses
5. **Research** (75% confidence) → Research
6. **Code Search** (80% confidence) → Memory
7. **Automation** (75% confidence) → Workflow
8. **Code Health** (70% confidence) → Shepherd
9. **Simulation** (70% confidence) → Simulator
10. **Capability Discovery** (70% confidence) → Autodidact

### Integration with Existing Features

The faculty system seamlessly integrates with existing orchestrator features:

- **Emotional Context** - Enriches response strategy
- **Learning** - Logs interactions and updates preferences
- **Proactive** - Checks for content recommendations
- **Model Selection** - Adapts based on task complexity

## Faculty Details

### 1. Self-Healing Faculty

**Purpose:** Automatically fix runtime errors using SWE-agent

**Tools Used:** `swe-agent-tool.ts`

**Capabilities:**
- Error analysis
- Automated fix generation
- Test execution
- PR creation

**Example:**
```typescript
const result = await processMessage("Fix the null pointer error in validator.ts", {
  userId: "user123",
  sessionKey: "session456"
});

if (result.facultyResult?.success) {
  const healing = result.facultyResult.data as SelfHealingResult;
  console.log("Fix ID:", healing.fixId);
  console.log("Tests pass:", healing.testsPass);
  console.log("PR URL:", healing.prUrl);
}
```

### 2. Council Faculty

**Purpose:** Break down complex problems using multi-agent teams

**Tools Used:** `crewai-tool.ts`, `metagpt-tool.ts`

**Capabilities:**
- Software project generation (MetaGPT)
- Multi-agent reasoning (CrewAI)
- Hierarchical/sequential workflows
- PRD, architecture, and code generation

**Example:**
```typescript
const result = await processMessage(
  "Design a microservices architecture for a social media platform",
  config
);
```

### 3. Memory Faculty

**Purpose:** Deep code indexing and semantic search

**Tools Used:** `llamaindex-tool.ts`, `qdrant-tool.ts`

**Capabilities:**
- Document ingestion
- Vector embeddings
- Semantic search
- RAG (Retrieval-Augmented Generation)

**Example:**
```typescript
const result = await processMessage("Search for all authentication endpoints", config);
```

### 4. Senses Faculty

**Purpose:** Multimodal input/output processing

**Tools Used:** `whisper-tool.ts`, `diffusers-tool.ts`, `piper-tts-tool.ts`

**Capabilities:**
- Speech-to-text (Whisper)
- Image generation (Stable Diffusion)
- Video generation
- Text-to-speech (Piper)

**Example:**
```typescript
const result = await processMessage("Transcribe the meeting recording", config);
const result2 = await processMessage("Generate an image of a sunset over mountains", config);
```

### 5. Research Faculty

**Purpose:** Deep web research and analysis

**Tools Used:** `haystack-tool.ts`

**Capabilities:**
- Hybrid retrieval (BM25 + embeddings)
- Document analysis
- Research summaries
- Knowledge aggregation

**Example:**
```typescript
const result = await processMessage("Research the latest LLM architectures", config);
```

### 6. Workflow Faculty

**Purpose:** Automation creation and management

**Tools Used:** `n8n-tool.ts`

**Capabilities:**
- Workflow creation
- Execution and activation
- Template library
- Integration management

**Example:**
```typescript
const result = await processMessage("Create a workflow to send daily reports", config);
```

### 7. Privacy Faculty

**Purpose:** PII detection and protection

**Tools Used:** `litellm-tool.ts`

**Capabilities:**
- PII detection (email, phone, SSN, credit cards, etc.)
- Automatic redaction
- Local model switching for sensitive data
- Risk level assessment

**Example:**
```typescript
const result = await processMessage(
  "My email is john@example.com and SSN is 123-45-6789",
  config
);
// Faculty automatically detects PII and routes to local model
```

### 8. Shepherd Faculty

**Purpose:** Background code health monitoring

**Tools Used:** `swe-agent-tool.ts`

**Capabilities:**
- Health scoring
- Issue detection
- Improvement suggestions
- Security scanning

**Example:**
```typescript
const result = await processMessage("Check code health of the repository", config);
```

### 9. Simulator Faculty

**Purpose:** Scenario simulation and what-if analysis

**Tools Used:** `metagpt-tool.ts`

**Capabilities:**
- Multi-iteration simulation
- Outcome analysis
- Insight generation
- Metric tracking

**Example:**
```typescript
const result = await processMessage(
  "Simulate what happens if we migrate to microservices",
  config
);
```

### 10. Autodidact Faculty

**Purpose:** Capability discovery via public APIs

**Tools Used:** `public-apis-tool.ts`

**Capabilities:**
- API search and discovery
- Setup instructions
- Integration examples
- Categorized browsing

**Example:**
```typescript
const result = await processMessage("Find APIs for weather data", config);
```

## Usage

### Basic Usage

```typescript
import { processMessage } from "./integrations/orchestrator.js";

const result = await processMessage("Your message here", {
  userId: "user123",
  sessionKey: "session456",
  openClawConfig: config, // Optional: for tool configuration
  ollamaModels: models,   // Optional: for model selection
  contentCatalog: catalog, // Optional: for recommendations
});

// Check if a faculty was activated
if (result.facultyActivation?.faculty !== "none") {
  console.log("Faculty activated:", result.facultyActivation.faculty);
  console.log("Confidence:", result.facultyActivation.confidence);
  console.log("Reason:", result.facultyActivation.reason);
  
  if (result.facultyResult?.success) {
    console.log("Faculty result:", result.facultyResult.data);
  }
}

// Access existing features
console.log("Emotion:", result.emotion.dominant);
console.log("Task complexity:", result.taskComplexity);
console.log("Response hints:", result.responseHints);
```

### Faculty Result Types

Each faculty returns a specific result type:

```typescript
type FacultyResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, unknown>;
};
```

Where `T` can be:
- `SelfHealingResult`
- `CouncilResult`
- `MemoryResult`
- `SensesResult`
- `ResearchResult`
- `WorkflowResult`
- `PrivacyResult`
- `ShepherdResult`
- `SimulatorResult`
- `AutodidactResult`

## Testing

Tests for the cognitive architecture are in `src/integrations/orchestrator.test.ts`:

```bash
# Run tests
npm test src/integrations/orchestrator.test.ts

# Or with coverage
npm test -- --coverage src/integrations/orchestrator.test.ts
```

## Extending the System

### Adding a New Faculty

1. Create a new file in `src/faculties/` (e.g., `new-faculty.ts`)
2. Implement the faculty function and detection function
3. Add types to `src/faculties/types.ts`
4. Export from `src/faculties/index.ts`
5. Import in `src/integrations/orchestrator.ts`
6. Add to `analyzeInput()` function
7. Add to `selectFaculty()` priority system
8. Add to `activateFaculty()` switch statement
9. Add tests to `orchestrator.test.ts`

### Example New Faculty Template

```typescript
// src/faculties/example-faculty.ts
import { createExampleTool } from "../agents/tools/example-tool.js";
import type { FacultyConfig, FacultyResult } from "./types.js";

export type ExampleRequest = {
  query: string;
};

export type ExampleResult = {
  data: string;
};

export async function processExample(
  request: ExampleRequest,
  config: FacultyConfig,
): Promise<FacultyResult<ExampleResult>> {
  try {
    const tool = createExampleTool({ config: config.config });
    const result = await tool.execute("action", {
      action: "process",
      query: request.query,
    });
    
    return {
      success: true,
      data: { data: result.data as string },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function detectExampleIntent(input: string): boolean {
  const keywords = ["example", "demo", "test"];
  return keywords.some(k => input.toLowerCase().includes(k));
}
```

## Performance Considerations

- Faculties are only activated when confidence threshold is met
- Each faculty call is async and doesn't block the main pipeline
- Failed faculty calls don't crash the orchestrator
- Faculty results are optional - existing features always run

## Best Practices

1. **Faculty Selection** - Use the most specific faculty for the task
2. **Error Handling** - Always check `facultyResult.success`
3. **Confidence Thresholds** - Adjust based on use case
4. **Backward Compatibility** - Existing features work without faculties
5. **Testing** - Test both with and without faculty activation

## Future Enhancements

Potential additions to the cognitive architecture:

- **Planner Faculty** - Long-term goal planning
- **Critic Faculty** - Self-evaluation and improvement
- **Translator Faculty** - Multi-language support
- **Optimizer Faculty** - Code optimization suggestions
- **Debugger Faculty** - Interactive debugging sessions
- **Teacher Faculty** - Educational content generation
- **Curator Faculty** - Content curation and summarization

## Contributing

When contributing to the faculty system:

1. Follow existing patterns in faculty modules
2. Use the tool wrappers from `src/agents/tools/`
3. Add comprehensive tests
4. Update this documentation
5. Ensure backward compatibility
