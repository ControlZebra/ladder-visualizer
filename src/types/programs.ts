import { Instruction, RungElement } from './instructions';

/**
 * A single rung in a ladder logic routine
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
 */
export type RoutineType = 'RLL' | 'FBD' | 'ST' | 'SFC';

/**
 * A routine within a program (contains rungs for RLL type)
 */
export interface Routine {
  name: string;
  type: RoutineType;
  /** Raw rung strings from the export */
  rungs: string[];
}

/**
 * A parsed routine with instructions extracted
 */
export interface ParsedRoutine {
  name: string;
  type: RoutineType;
  rungs: Rung[];
}

/**
 * A program containing routines
 */
export interface Program {
  routines: Routine[];
}
