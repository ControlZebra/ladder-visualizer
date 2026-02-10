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

// Matching utilities (useful for custom diffing or testing)
export { matchByKey, matchByNumericKey, diffProperties, valuesEqual } from './matching';
