import type { NormalizedRung } from './rung';

/**
 * Routine type
 */
export type NormalizedRoutineType = 'RLL' | 'FBD' | 'ST' | 'SFC';

/**
 * Normalized routine - vendor-agnostic representation
 */
export interface NormalizedRoutine {
  /** Routine name */
  name: string;
  /** Routine type (Ladder Logic, Function Block, Structured Text, etc.) */
  type: NormalizedRoutineType;
  /** Parsed rungs (for RLL type) */
  rungs: NormalizedRung[];
  /** Description/comment for the routine */
  description?: string;
}
