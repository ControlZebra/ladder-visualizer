import type { Instruction, RungElement } from '../instructions';

/**
 * Normalized rung - vendor-agnostic representation of a ladder logic rung
 */
export interface NormalizedRung {
  /** Rung number (0-indexed) */
  number: number;
  /** Rung comment/description */
  comment?: string;
  /** Original raw text for parsing and debugging */
  raw: string;
  /** Parsed elements including branches */
  elements: RungElement[];
  /** Parsed instructions in execution order (flat list) */
  instructions: Instruction[];
  /** Rung type (Normal, Empty, etc.) */
  type?: 'Normal' | 'Empty' | 'Delete' | 'Insert' | 'InsertDirect' | 'Replace' | 'ReplaceDirect';
}
