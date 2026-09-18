import type { NormalizedTag } from './tag';
import type { NormalizedRoutine } from './routine';

/**
 * Normalized program - vendor-agnostic representation
 */
export interface NormalizedProgram {
  /** Program name */
  name: string;
  /** Program-scoped tags */
  tags: NormalizedTag[];
  /** Routines within this program */
  routines: NormalizedRoutine[];
  /** Description/comment for the program */
  description?: string;
  /** Main routine name (entry point) */
  mainRoutineName?: string;
  /** Fault routine name */
  faultRoutineName?: string;
  /** Whether the program is disabled */
  disabled?: boolean;
  /** Controller task declared by the source as this program's executor */
  executingTaskName?: string;
}
