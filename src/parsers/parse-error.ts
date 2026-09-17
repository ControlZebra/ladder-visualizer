/**
 * Severity level for parse issues
 */
export type ParseIssueSeverity = 'error' | 'warning' | 'info';

/**
 * Location within the source file where an issue occurred
 */
export interface ParseLocation {
  /** Line number (1-indexed) */
  line?: number;
  /** Column number (1-indexed) */
  column?: number;
  /** Character offset from start of file */
  offset?: number;
  /** Path within the document structure (e.g., "programs[0].routines[1].rungs[5]") */
  path?: string;
}

/**
 * An error that occurred during parsing
 */
export interface ParseError {
  /** Error message */
  message: string;
  /** Error code for programmatic handling */
  code?: string;
  /** Location where the error occurred */
  location?: ParseLocation;
  /** Original error that caused this issue */
  cause?: unknown;
}

/**
 * A warning that occurred during parsing (non-fatal)
 */
export interface ParseWarning {
  /** Warning message */
  message: string;
  /** Warning code for programmatic handling */
  code?: string;
  /** Location where the warning occurred */
  location?: ParseLocation;
}

/**
 * Create a parse error with optional location and code
 */
export function createParseError(
  message: string,
  options?: {
    code?: string;
    location?: ParseLocation;
    cause?: unknown;
  }
): ParseError {
  return {
    message,
    code: options?.code,
    location: options?.location,
    cause: options?.cause,
  };
}

/**
 * Create a parse warning with optional location and code
 */
export function createParseWarning(
  message: string,
  options?: {
    code?: string;
    location?: ParseLocation;
  }
): ParseWarning {
  return {
    message,
    code: options?.code,
    location: options?.location,
  };
}

/**
 * Error codes for common parse errors
 */
export const ParseErrorCodes = {
  // Format detection errors
  UNKNOWN_FORMAT: 'UNKNOWN_FORMAT',
  UNSUPPORTED_FORMAT: 'UNSUPPORTED_FORMAT',
  
  // JSON errors
  INVALID_JSON: 'INVALID_JSON',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FIELD_TYPE: 'INVALID_FIELD_TYPE',
  
  // XML/L5X errors
  INVALID_XML: 'INVALID_XML',
  MISSING_L5X_TARGET: 'MISSING_L5X_TARGET',
  AMBIGUOUS_L5X_TARGET: 'AMBIGUOUS_L5X_TARGET',
  MISSING_ROOT_ELEMENT: 'MISSING_ROOT_ELEMENT',
  UNSUPPORTED_SCHEMA_VERSION: 'UNSUPPORTED_SCHEMA_VERSION',
  SOURCE_BYTE_LIMIT_EXCEEDED: 'SOURCE_BYTE_LIMIT_EXCEEDED',
  XML_NODE_LIMIT_EXCEEDED: 'XML_NODE_LIMIT_EXCEEDED',
  XML_DEPTH_LIMIT_EXCEEDED: 'XML_DEPTH_LIMIT_EXCEEDED',
  UNSAFE_XML_ENTITY: 'UNSAFE_XML_ENTITY',
  PARSE_CANCELLED: 'PARSE_CANCELLED',
  PARSE_TIMEOUT: 'PARSE_TIMEOUT',
  
  // Rung parsing errors
  INVALID_RUNG_SYNTAX: 'INVALID_RUNG_SYNTAX',
  UNKNOWN_INSTRUCTION: 'UNKNOWN_INSTRUCTION',
  MISMATCHED_BRACKETS: 'MISMATCHED_BRACKETS',
  
  // General errors
  FILE_READ_ERROR: 'FILE_READ_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ParseErrorCode = typeof ParseErrorCodes[keyof typeof ParseErrorCodes];
