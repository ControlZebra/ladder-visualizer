import type { NormalizedRoutine, NormalizedRung, NormalizedRoutineType } from '../types';
import { parseRung, parseRungWithBranches } from './rung-parser';

/**
 * A routine with raw rung strings (for parsing)
 */
interface RawRoutine {
  name: string;
  type: string;
  rungs: string[];
}

/**
 * Parse a raw routine (with string rungs) into a NormalizedRoutine with instructions.
 *
 * @param routine - Raw routine with string rungs
 * @returns NormalizedRoutine with parsed instructions
 */
export function parseRoutine(routine: RawRoutine): NormalizedRoutine {
  const rungs: NormalizedRung[] = routine.rungs.map((rawRung, index) => ({
    number: index,
    raw: rawRung,
    instructions: parseRung(rawRung),
    elements: parseRungWithBranches(rawRung),
    comment: undefined,
  }));

  return {
    name: routine.name,
    type: routine.type as NormalizedRoutineType,
    rungs,
    description: undefined,
  };
}

/**
 * Parse all routines.
 *
 * @param routines - Array of raw routines
 * @returns Array of NormalizedRoutines
 */
export function parseRoutines(routines: RawRoutine[]): NormalizedRoutine[] {
  return routines.map(parseRoutine);
}
