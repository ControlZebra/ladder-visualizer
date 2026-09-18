import type {
  ExternalAccess,
  NormalizedTag,
  NormalizedTagComment,
  NormalizedTagData,
  NormalizedTagType,
} from './tag';
import type { NormalizedRoutine } from './routine';

/** Schema-backed usage/direction declared for a Logix program parameter. */
export type ProgramParameterUsage =
  | 'Normal'
  | 'Local'
  | 'Input'
  | 'Output'
  | 'InOut'
  | 'Static'
  | 'NULL';

/** A program-owned parameter. Kept separate from AOI call-signature parameters. */
export interface NormalizedProgramParameter {
  name: string;
  dataType: string;
  usage: ProgramParameterUsage;
  scope: 'Program';
  programName: string;
  tagType?: NormalizedTagType;
  uid?: string;
  parentUid?: string;
  dataTypeUid?: string;
  dimensions?: number[];
  radix?: string;
  required?: boolean;
  visible?: boolean;
  constant?: boolean;
  externalAccess?: ExternalAccess;
  verified?: boolean;
  description?: string;
  comments: NormalizedTagComment[];
  defaultData?: NormalizedTagData;
}

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
  /** Program interface parameters in source order. */
  parameters: NormalizedProgramParameter[];
  /** Description/comment for the program */
  description?: string;
  /** Main routine name (entry point) */
  mainRoutineName?: string;
  /** Equipment-phase pre-state routine entry point, when declared. */
  preStateRoutineName?: string;
  /** Fault routine name */
  faultRoutineName?: string;
  /** Source-declared executing task name. Relationship validation belongs to task parsing. */
  executingTaskName?: string;
  /** Whether online test edits are active. */
  testEdits?: boolean;
  /** Whether Studio reports the program as verified. */
  verified?: boolean;
  /** Whether pending program edits exist. */
  editsExist?: boolean;
  /** Whether the program is disabled */
  disabled?: boolean;
}
