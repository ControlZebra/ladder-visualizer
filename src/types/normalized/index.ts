/**
 * Normalized domain types - vendor-agnostic internal representation
 * that all format parsers produce.
 */

// Controller
export type {
  NormalizedController,
  NormalizedAOI,
  NormalizedModule,
  PLCVendor,
  SourceFormat,
  AOIParameter,
  AOILocalTag,
  AOIParameterUsage,
  AOIClass,
} from './controller';

// Program
export type { NormalizedProgram } from './program';

// Routine
export type { NormalizedRoutine, NormalizedRoutineType } from './routine';

// Rung
export type { NormalizedRung } from './rung';

// Tag
export type {
  NormalizedTag,
  NormalizedTagType,
  TagScope,
  ExternalAccess,
} from './tag';

// Data Type
export type {
  NormalizedDataType,
  NormalizedDataTypeMember,
  DataTypeClass,
} from './data-type';
