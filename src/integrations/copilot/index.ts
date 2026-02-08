export {
  buildCodeCompletionPrompt,
  buildCodeGenerationPrompt,
  buildCodeReviewPrompt,
  buildRefactoringPrompt,
  buildTestGenerationPrompt,
  checkCopilotStatus,
  extractPrimaryCode,
  parseCodeSuggestions,
} from "./copilot-assist.js";
export type { CodeSuggestion, CopilotAssistConfig, CopilotStatus } from "./copilot-assist.js";
