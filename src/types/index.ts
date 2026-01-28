// Normalized Types (vendor-agnostic internal representation)
export type {
  NormalizedController,
  NormalizedProgram,
  NormalizedRoutine,
  NormalizedRung,
  NormalizedTag,
  NormalizedDataType,
  NormalizedDataTypeMember,
  NormalizedAOI,
  NormalizedModule,
  PLCVendor,
  SourceFormat,
  NormalizedRoutineType,
  NormalizedTagType,
  TagScope,
  ExternalAccess,
  DataTypeClass,
} from './normalized';

// Controller (legacy format-specific types)
export type { ControllerExport, AOI, SfcExecutionControl, SfcRestartPosition, SfcLastScan } from './controller';

// Data Types
export type { DataType, DataTypeMember } from './data-types';

// Tags
export type { Tag } from './tags';

// Programs & Routines
export type { Program, Routine, ParsedRoutine, Rung, RoutineType } from './programs';

// Instructions
export type {
  Instruction,
  InstructionMnemonic,
  ContactInstruction,
  CoilInstruction,
  CompareInstruction,
  MathInstruction,
  TimerInstruction,
  CounterInstruction,
  BranchGroup,
  RungElement,
} from './instructions';
export { getInstructionCategory, getInstructionDisplayName, getInstructionParameterLabels, isBranchGroup } from './instructions';

// Instruction Registry
export type {
  InstructionCategory,
  InstructionDefinition,
  RegistrationOptions,
  SymbolType,
} from './instruction-registry';
export {
  InstructionRegistry,
  globalInstructionRegistry,
  getInstructionRegistry,
  createInstructionRegistry,
  createEmptyInstructionRegistry,
  DEFAULT_INSTRUCTIONS,
  CONTACT_INSTRUCTIONS,
  COIL_INSTRUCTIONS,
  COMPARE_INSTRUCTIONS,
  MATH_INSTRUCTIONS,
  TIMER_INSTRUCTIONS,
  COUNTER_INSTRUCTIONS,
  OTHER_INSTRUCTIONS,
} from './instruction-registry';

// Devices
export type { MapDevice } from './devices';
