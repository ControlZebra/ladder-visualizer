// ============================================
// New Unified API (Phase 1)
// ============================================

// Unified parsing functions
export { parseFile, parseString, parseBuffer } from './parse';

// Parser interface and base class
export type { PLCParser, ParseResult, FileFormat } from './parser-interface';
export { BaseParser, createSuccessResult, createFailureResult } from './parser-interface';

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
export { L5XParser, l5xParser, l5xToNormalized } from './l5x';

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
// Legacy API (maintained for backwards compatibility)
// ============================================

// Controller Parser
export { parseControllerExport, parseControllerExportString, ControllerParseError } from './controller-parser';

// Rung Parser
export { parseRung, parseRungs, parseRungWithBranches } from './rung-parser';

// Routine Parser
export { parseRoutine, parseRoutines } from './routine-parser';

// Tag Resolver
export { TagResolver, createTagResolver, type TagUsage } from './tag-resolver';

// Schemas (for advanced use)
export * from './schemas';
