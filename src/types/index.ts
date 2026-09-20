// ============================================================================
// Normalized Types (vendor-agnostic representation)
// ============================================================================

export type {
  NormalizedController,
  NormalizedProgram,
  NormalizedProgramParameter,
  ProgramParameterUsage,
  NormalizedProgramType,
  NormalizedProgramInitialState,
  NormalizedProgramNotImplementedAction,
  NormalizedProgramLossOfCommunicationCommand,
  NormalizedProgramExternalRequestAction,
  NormalizedRoutine,
  NormalizedRung,
  NormalizedTag,
  NormalizedDataType,
  NormalizedDataTypeMember,
  DataTypeCategory,
  DataTypeResolution,
  NormalizedAOI,
  NormalizedModule,
  NormalizedTask,
  PLCVendor,
  SourceFormat,
  NormalizedRoutineType,
  NormalizedTagType,
  TagScope,
  ExternalAccess,
  NormalizedLocalizedText,
  NormalizedTagComment,
  NormalizedTagForceData,
  NormalizedAtomicTagValue,
  NormalizedArrayElement,
  NormalizedArrayTagValue,
  NormalizedStructureTagValue,
  NormalizedAlarmMessage,
  NormalizedAlarmTagValue,
  NormalizedDecoratedTagValue,
  NormalizedTagData,
  DataTypeClass,
  AOIParameter,
  AOILocalTag,
  AOIParameterUsage,
  AOIClass,
  STLine,
  NormalizedFBDOrientation,
  NormalizedFBDMetadataSource,
  NormalizedFBDMetadataValue,
  NormalizedFBDPosition,
  NormalizedFBDPlaceholderReason,
  NormalizedFBDDiagnosticCode,
  NormalizedFBDDiagnostic,
  NormalizedFBDReference,
  NormalizedFBDConnector,
  NormalizedFBDBlockArray,
  NormalizedFBDPort,
  NormalizedFBDArrayRequirement,
  NormalizedFBDBlock,
  NormalizedFBDAOIBinding,
  NormalizedFBDAOI,
  NormalizedFBDFunction,
  NormalizedFBDRoutineControl,
  NormalizedFBDTextBox,
  NormalizedFBDPlaceholder,
  NormalizedFBDElement,
  NormalizedFBDConnectionEndpoint,
  NormalizedFBDConnection,
  NormalizedFBDAttachment,
  NormalizedFBDSheet,
  NormalizedFBDBody,
  // Module-related types
  ModuleUsage,
  ModuleCategory,
  ModulePort,
  ModuleConnection,
  EKeyState,
  PortType,
  NormalizedTaskType,
  NormalizedTaskClass,
  NormalizedTaskEvent,
  NormalizedTrend,
  NormalizedTrendPen,
  NormalizedTrendCaptureSizeType,
  NormalizedTrendTriggerType,
  NormalizedTrendTriggerTargetType,
  NormalizedTrendSampleType,
  NormalizedTrendLogicalOperation,
  NormalizedTrendPenType,
  NormalizedQuickWatchList,
  NormalizedWatchTag,
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
  ParsedRung,
  RungSourceSpan,
  RungParseDiagnostic,
  RungParseDiagnosticCode,
  RungToken,
  RungTokenKind,
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
  AOIRegistrationInfo,
  InstructionContext,
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
  // AOI registration utilities
  registerAOI,
  registerAOIs,
  registerAOIsGlobally,
  clearAOIs,
  isAOI,
} from './instruction-registry';

// ============================================================================
// Theme Types
// ============================================================================

export type {
  LadderDiagramTheme,
  ContactThemeProps,
  CoilThemeProps,
  BoxThemeProps,
} from './theme';

export {
  DEFAULT_THEME,
  DARK_THEME,
  mergeTheme,
} from './theme';
