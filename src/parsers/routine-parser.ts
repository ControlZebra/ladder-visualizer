import type { Routine, ParsedRoutine, Rung } from '../types';
import { parseRung, parseRungWithBranches } from './rung-parser';

/**
 * Parse a Routine into a ParsedRoutine with instructions extracted from rungs.
 *
 * @param routine - Raw Routine from the controller export
 * @returns ParsedRoutine with instructions parsed
 */
export function parseRoutine(routine: Routine): ParsedRoutine {
  const rungs: Rung[] = routine.rungs.map((rawRung) => ({
    raw: rawRung,
    instructions: parseRung(rawRung),
    elements: parseRungWithBranches(rawRung),
  }));

  return {
    name: routine.name,
    type: routine.type,
    rungs,
  };
}

/**
 * Parse all routines in a program.
 *
 * @param routines - Array of raw Routines
 * @returns Array of ParsedRoutines
 */
export function parseRoutines(routines: Routine[]): ParsedRoutine[] {
  return routines.map(parseRoutine);
}
