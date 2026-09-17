import type { NormalizedRung } from './rung';

/**
 * Routine type
 */
export type NormalizedRoutineType = 'RLL' | 'FBD' | 'ST' | 'SFC' | 'Typeless' | 'External' | 'Encrypted';

/**
 * Structured Text line
 */
export interface STLine {
  /** Line number (0-indexed from L5X) */
  number: number;
  /** Line content/text */
  text: string;
}

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
  /** Structured Text content (for ST type) */
  stContent?: STLine[];
  /** Description/comment for the routine */
  description?: string;
}
