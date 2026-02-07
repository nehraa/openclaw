export {
  approveProposal,
  clearAllProposals,
  configureSelfUpdate,
  discoverUpdate,
  getProposal,
  getSelfUpdateConfig,
  listProposals,
  rejectProposal,
  runSafetyCheck,
  updateProposalStatus,
} from "./update-monitor.js";
export type {
  SafetyCheck,
  SelfUpdateConfig,
  TestResult,
  UpdateCategory,
  UpdateProposal,
  UpdateStatus,
} from "./types.js";
