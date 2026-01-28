// ============================================================================
// Normalized Types (vendor-agnostic representation)
// ============================================================================

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

// ============================================================================
// Re-export with simpler aliases for convenience
// ============================================================================

export type {
  NormalizedController as Controller,
  NormalizedProgram as Program,
  NormalizedRoutine as Routine,
  NormalizedRung as Rung,
  NormalizedTag as Tag,
  NormalizedDataType as DataType,
  NormalizedDataTypeMember as DataTypeMember,
  NormalizedAOI as AOI,
  NormalizedModule as Module,
} from './normalized';

// ============================================================================
// Instructions
// ============================================================================

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

// ============================================================================
// Instruction Registry
// ============================================================================

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
