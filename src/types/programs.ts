import { Instruction, RungElement } from './instructions';
import { Tag } from './tags';

/**
 * A single rung in a ladder logic routine
 * @deprecated Use NormalizedRung instead. This type will be removed in a future version.
 * @see NormalizedRung for the new vendor-agnostic format
 */
export interface Rung {
  /** Original raw rung string from the export */
  raw: string;
  /** Parsed instructions in execution order (legacy, flat list) */
  instructions: Instruction[];
  /** Parsed elements including branches (new structure) */
  elements: RungElement[];
}

/**
 * Routine type
 * @deprecated Use NormalizedRoutineType instead.
 */
export type RoutineType = 'RLL' | 'FBD' | 'ST' | 'SFC';

/**
 * A routine within a program (contains rungs for RLL type)
 * @deprecated Use NormalizedRoutine instead. This type will be removed in a future version.
 * @see NormalizedRoutine for the new vendor-agnostic format
 */
export interface Routine {
  name: string;
  type: RoutineType;
  /** Raw rung strings from the export */
  rungs: string[];
}

/**
 * A parsed routine with instructions extracted
 * @deprecated Use NormalizedRoutine instead. This type will be removed in a future version.
 * @see NormalizedRoutine for the new vendor-agnostic format
 */
export interface ParsedRoutine {
  name: string;
  type: RoutineType;
  rungs: Rung[];
}

/**
 * A program containing routines
 * @deprecated Use NormalizedProgram instead. This type will be removed in a future version.
 * @see NormalizedProgram for the new vendor-agnostic format
 */
export interface Program {
  /** Program name (optional in some exports) */
  name?: string;
  /** Program-scoped tags */
  tags?: Tag[];
  /** Routines in this program */
  routines: Routine[];
}
