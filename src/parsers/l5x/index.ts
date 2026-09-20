/**
 * L5X Parser Module
 * 
 * Exports for the Rockwell L5X (Logix5000 XML) format parser.
 */

// Parser
export { L5XParser, l5xParser } from './l5x-parser';
export { L5XConflictVisualAdapter, l5xConflictVisualAdapter } from './l5x-conflict-visual-adapter';

// Transformation
export { l5xToNormalized } from './l5x-to-normalized';
export {
  FBD_FUNCTION_METADATA,
  FBD_INSTRUCTION_METADATA,
  resolveBuiltInFBDFunctionMetadata,
  resolveBuiltInFBDInstructionMetadata,
  resolveFBDInstructionMetadata,
} from './fbd-metadata';
export type {
  FBDInstructionForm,
  FBDPortDirection,
  FBDPortSide,
  FBDControllerFamily,
  FBDPortMetadata,
  FBDArrayRequirement,
  FBDInstructionMetadata,
  FBDMetadataDiagnosticCode,
  FBDMetadataDiagnostic,
  FBDMetadataRequest,
  FBDFunctionMetadataRequest,
  FBDMetadataResolution,
} from './fbd-metadata';

// Types
export type {
  L5XContent,
  RSLogix5000Content,
  L5XController,
  L5XTargetType,
  L5XUse,
  L5XDataTypes,
  L5XDataType,
  L5XMembers,
  L5XMember,
  L5XTags,
  L5XTag,
  L5XPrograms,
  L5XProgram,
  L5XRoutines,
  L5XRoutine,
  L5XRoutineType,
  L5XRLLContent,
  L5XRung,
  L5XRungType,
  L5XSTContent,
  L5XFBDContent,
  L5XOnlineEditType,
  L5XSheet,
  L5XFBDPositioned,
  L5XFBDReference,
  L5XFBDConnector,
  L5XFBDBlockArray,
  L5XFBDBlock,
  L5XFBDAOIBinding,
  L5XFBDAOI,
  L5XFBDObjectControl,
  L5XFBDRoutineControl,
  L5XFBDFunction,
  L5XFBDWire,
  L5XFBDText,
  L5XFBDTextBox,
  L5XFBDAttachment,
  L5XSFCContent,
  L5XAddOnInstructionDefinitions,
  L5XAddOnInstruction,
  L5XModules,
  L5XModule,
} from './l5x-types';

// Type utilities
export {
  isArray,
  ensureArray,
  extractText,
  parseBoolean,
  parseInt,
} from './l5x-types';
