import type { NormalizedController } from '../types/normalized';
import type { InstructionContext } from '../types/instruction-registry';
import type { ParseError, ParseWarning } from './parse-error';
import type { ParseOptions } from './resource-guards';

/**
 * Supported file formats
 */
export type FileFormat = 'json' | 'l5x' | 'l5k' | 'xml';

/**
 * Result of a parse operation
 */
export interface ParseResult<T> {
  /** Whether parsing was successful */
  success: boolean;
  /** Parsed data (only present if success is true) */
  data?: T;
  /** Errors that occurred during parsing */
  errors?: ParseError[];
  /** Warnings that occurred during parsing (non-fatal) */
  warnings?: ParseWarning[];
  /** Time taken to parse in milliseconds */
  parseTimeMs?: number;
  /** Controller-scoped instruction metadata for rendering AOI calls */
  context?: InstructionContext;
}

/**
 * Create a successful parse result
 */
export function createSuccessResult<T>(
  data: T,
  options?: {
    warnings?: ParseWarning[];
    parseTimeMs?: number;
    context?: InstructionContext;
  }
): ParseResult<T> {
  return {
    success: true,
    data,
    warnings: options?.warnings,
    parseTimeMs: options?.parseTimeMs,
    ...(options?.context ? { context: options.context } : {}),
  };
}

/**
 * Create a failed parse result
 */
export function createFailureResult<T>(
  errors: ParseError[],
  options?: {
    warnings?: ParseWarning[];
    parseTimeMs?: number;
  }
): ParseResult<T> {
  return {
    success: false,
    errors,
    warnings: options?.warnings,
    parseTimeMs: options?.parseTimeMs,
  };
}

/**
 * Parser interface - all format parsers must implement this
 */
export interface PLCParser {
  /** Unique identifier for this parser */
  readonly id: string;

  /** Human-readable name */
  readonly name: string;

  /** Supported file extensions (with leading dot) */
  readonly supportedExtensions: string[];

  /** Supported MIME types */
  readonly supportedMimeTypes: string[];

  /**
   * Check if this parser can handle the given input.
   * Should be fast - only check format signatures, not full validation.
   * 
   * @param input - String or binary content to check
   * @returns true if this parser can likely handle the input
   */
  canParse(input: string | ArrayBuffer): boolean;

  /**
   * Parse input into normalized controller model.
   * 
   * @param input - String or binary content to parse
   * @returns Parse result with normalized controller or errors
   */
  parse(input: string | ArrayBuffer, options?: ParseOptions): ParseResult<NormalizedController>;

  /**
   * Optionally validate input without full parsing.
   * Useful for quick validation before committing to a full parse.
   * 
   * @param input - String or binary content to validate
   * @returns Parse result (data will be undefined even on success)
   */
  validate?(input: string | ArrayBuffer, options?: ParseOptions): ParseResult<void>;
}

/**
 * Base class for parser implementations with common utilities
 */
export abstract class BaseParser implements PLCParser {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly supportedExtensions: string[];
  abstract readonly supportedMimeTypes: string[];

  abstract canParse(input: string | ArrayBuffer): boolean;
  abstract parse(input: string | ArrayBuffer, options?: ParseOptions): ParseResult<NormalizedController>;

  /**
   * Convert ArrayBuffer to string if needed
   */
  protected inputToString(input: string | ArrayBuffer): string {
    if (typeof input === 'string') {
      return input;
    }
    return new TextDecoder('utf-8').decode(input);
  }

  /**
   * Measure parse time and wrap in result
   */
  protected withTiming<T>(fn: () => ParseResult<T>): ParseResult<T> {
    const startTime = performance.now();
    const result = fn();
    result.parseTimeMs = performance.now() - startTime;
    return result;
  }
}
