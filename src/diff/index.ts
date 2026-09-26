/**
 * L5X Diff Module — Domain-aware structured diffing for PLC controller data.
 *
 * Usage:
 * ```ts
 * import { diffControllers } from 'ladder-visualizer';
 * // or
 * import { diffControllers } from 'ladder-visualizer/diff';
 *
 * const diff = diffControllers(oldController, newController);
 * console.log(diff.summary.totalChanges);
 * ```
 */

// Core diff function
export { diffControllers } from './diffControllers';
export { diffEncodedData } from './diffEncodedData';
export type { EncodedDataChange } from './diffEncodedData';

// All diff types
export type {
  ChangeKind,
  Change,
  PropertyChange,
  ControllerInfoDiff,
  RungDiff,
  STDiff,
  RoutineDiff,
  ProgramDiff,
  TagDiff,
  DataTypeMemberDiff,
  DataTypeDiff,
  AOIDiff,
  ModuleDiff,
  L5XDiff,
  L5XDiffSummary,
} from './types';

export type {
  InlineDiffBranchLeg,
  InlineDiffBranchNode,
  InlineDiffInstructionNode,
  InlineDiffNode,
  InlineDiffRungModel,
  InlineDiffState,
  InlineInstructionRenderMetadata,
  InlineTextChange,
} from './inline';

export type {
  BuildInlineDiffModelInput,
  InlineDiffElementMatch,
  InlineDiffElementMatchKind,
  InstructionChangeClassification,
} from './inline';

export {
  buildInlineDiffModel,
  classifyInstructionChange,
  getInstructionRenderMetadata,
  matchRungElements,
} from './inline';

// Matching utilities (useful for custom diffing or testing)
export { matchByKey, matchByNumericKey, diffProperties, valuesEqual } from './matching';
