// ============================================
// Unified Parsing API
// ============================================

// Unified parsing functions
export { parseFile, parseString, parseBuffer } from './parse';

// AOI registration utilities (note: clearAOIs is exported from types/instruction-registry)
export {
  createInstructionContextFromController,
  finalizeController,
  registerAOIsFromController,
} from './aoi-registration';
export type { FinalizedController } from './aoi-registration';

// Parser interface and base class
export type { PLCParser, ParseResult, ParseStatus, FileFormat } from './parser-interface';
export { BaseParser, createSuccessResult, createFailureResult } from './parser-interface';

// Parser resource guards and orchestration options
export type { ParseOptions, ParserResourceLimits } from './resource-guards';
export { DEFAULT_PARSER_RESOURCE_LIMITS } from './resource-guards';

// Parse errors
export type { ParseError, ParseWarning, ParseLocation, ParseErrorCode } from './parse-error';
export { createParseError, createParseWarning, ParseErrorCodes } from './parse-error';

// Format detection
export type { FormatSignature } from './format-detector';
export { detectFormat, detectFormatFromFilename, detectBestFormat } from './format-detector';

// Parser registry
export { ParserRegistry, parserRegistry, createParserRegistry } from './parser-registry';

// Individual parsers
export { JSONParser, jsonParser, jsonToNormalized } from './json';
export {
  L5XParser,
  l5xParser,
  l5xToNormalized,
  L5XConflictVisualAdapter,
  l5xConflictVisualAdapter,
  FBD_INSTRUCTION_METADATA,
  resolveBuiltInFBDInstructionMetadata,
  resolveFBDInstructionMetadata,
} from './l5x';
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
  FBDMetadataResolution,
} from './l5x';

// ============================================
// Register default parsers
// ============================================

import { parserRegistry } from './parser-registry';
import { jsonParser } from './json';
import { l5xParser } from './l5x';

/**
 * Register all built-in parsers with the global registry.
 * This is called automatically when importing from this module.
 */
export function registerDefaultParsers(): void {
  if (!parserRegistry.getParser('rockwell-json')) {
    parserRegistry.register(jsonParser);
  }
  if (!parserRegistry.getParser('rockwell-l5x')) {
    parserRegistry.register(l5xParser);
  }
}

// Auto-register on module load
registerDefaultParsers();

// ============================================
// Rung/Routine Utilities
// ============================================

// Rung Parser
export {
  parseRung,
  parseRungDetailed,
  parseRungs,
  parseRungWithBranches,
  tokenizeRung,
} from './rung-parser';

// Routine Parser
export { parseRoutine, parseRoutines } from './routine-parser';

// Tag Resolver
export { TagResolver, createTagResolver, type TagUsage } from './tag-resolver';

export { parseDocumentString, parseDocumentBuffer, parseDocumentFile } from './parse-document';
