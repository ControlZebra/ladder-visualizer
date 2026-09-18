/**
 * Normalized domain types - vendor-agnostic internal representation
 * that all format parsers produce.
 */

// Controller
export type {
  NormalizedController,
  NormalizedAOI,
  NormalizedModule,
  ModuleUsage,
  ModuleCategory,
  ModulePort,
  ModuleConnection,
  EKeyState,
  PortType,
  PLCVendor,
  SourceFormat,
  AOIParameter,
  AOILocalTag,
  AOIParameterUsage,
  AOIClass,
} from './controller';

// Program
export type {
  NormalizedProgram,
  NormalizedProgramParameter,
  ProgramParameterUsage,
  NormalizedProgramType,
  NormalizedProgramInitialState,
  NormalizedProgramNotImplementedAction,
  NormalizedProgramLossOfCommunicationCommand,
  NormalizedProgramExternalRequestAction,
} from './program';

// Task
export type {
  NormalizedTask,
  NormalizedTaskType,
  NormalizedTaskClass,
  NormalizedTaskEvent,
} from './task';

// Routine
export type { NormalizedRoutine, NormalizedRoutineType, STLine } from './routine';

// Rung
export type { NormalizedRung } from './rung';

// Tag
export type {
  NormalizedTag,
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
} from './tag';

// Data Type
export type {
  NormalizedDataType,
  NormalizedDataTypeMember,
  DataTypeClass,
  DataTypeUsage,
} from './data-type';

export type {
  PlcDocument, PlcResource, PlcResourceData, PlcResourceRole, PlcExportTarget,
  PlcVendorFragment, PlcSourceMapping, ParsedXmlValue,
} from './document';
