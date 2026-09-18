import type {
  ExternalAccess,
  NormalizedTag,
  NormalizedTagComment,
  NormalizedTagData,
  NormalizedTagType,
} from './tag';
import type { NormalizedRoutine } from './routine';

export type NormalizedProgramType = 'Typeless' | 'Normal' | 'EquipmentPhase' | 'LastProgramType';

export type NormalizedProgramInitialState =
  | 'NullState'
  | 'Idle'
  | 'Aborted'
  | 'Stopped'
  | 'Complete'
  | 'LastState';

export type NormalizedProgramNotImplementedAction =
  | 'NoAction'
  | 'StateComplete'
  | 'NotImplPhaseFailure'
  | 'LastNotImplAction';

export type NormalizedProgramLossOfCommunicationCommand =
  | 'None'
  | 'Abort'
  | 'Hold'
  | 'Stop'
  | 'LastCommLossAction';

export type NormalizedProgramExternalRequestAction =
  | 'None'
  | 'Clear'
  | 'LastExternalRequestAction';

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
  /** Schema-declared program identity. Kept as a string to preserve unsigned-long precision. */
  uid?: string;
  /** Schema-declared parent program identity. */
  parentUid?: string;
  /** Whether Studio presents this program as a hierarchy folder. */
  useAsFolder?: boolean;
  /** Program-scoped tags */
  tags: NormalizedTag[];
  /** Routines within this program */
  routines: NormalizedRoutine[];
  /** Program interface parameters in source order. */
  parameters: NormalizedProgramParameter[];
  /** Schema-declared program kind. */
  programType?: NormalizedProgramType;
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
  /** Initial Equipment Phase step index. */
  initialStepIndex?: number;
  /** Initial Equipment Phase execution state. */
  initialState?: NormalizedProgramInitialState;
  /** Action when an Equipment Phase state is not implemented. */
  completeStateIfNotImplemented?: NormalizedProgramNotImplementedAction;
  /** Action taken when communication is lost. */
  lossOfCommunicationCommand?: NormalizedProgramLossOfCommunicationCommand;
  /** Action taken for an external request. */
  externalRequestAction?: NormalizedProgramExternalRequestAction;
  /** Equipment Phase identifier, when representable as a safe integer. */
  equipmentId?: number;
  /** Opaque schema-declared recipe phase names; no sequence relationship is inferred. */
  recipePhaseNames?: string;
  /** Last recorded program scan time in source units. */
  lastScanTime?: number;
  /** Maximum recorded program scan time in source units. */
  maxScanTime?: number;
  /** Whether redundancy data is synchronized after execution. */
  synchronizeRedundancyDataAfterExecution?: boolean;
}
