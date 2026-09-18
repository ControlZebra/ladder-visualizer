import type { NormalizedController } from '../types/normalized';
import type { ParseResult, FileFormat } from './parser-interface';
import { createFailureResult } from './parser-interface';
import { createParseError, ParseErrorCodes } from './parse-error';
import { parserRegistry } from './parser-registry';
import { detectFormatFromFilename } from './format-detector';
import {
  checkParseExecution,
  createSourceSizeError,
  exceedsSourceByteLimit,
  resolveResourceLimits,
  withParseDeadline,
  type ParseOptions,
} from './resource-guards';

/**
 * Parse a File object into a normalized controller model.
 * Automatically detects the file format based on content and filename.
 * 
 * @param file - File object to parse
 * @returns Promise resolving to parse result with normalized controller or errors
 * 
 * @example
 * ```typescript
 * const result = await parseFile(file);
 * if (result.success) {
 *   console.log('Controller:', result.data.name);
 * } else {
 *   console.error('Parse errors:', result.errors);
 * }
 * ```
 */
export async function parseFile(
  file: File,
  options?: ParseOptions
): Promise<ParseResult<NormalizedController>> {
  const executionOptions = withParseDeadline(options);
  const executionError = checkParseExecution(executionOptions);
  if (executionError) {
    return createFailureResult([executionError]);
  }

  const limits = resolveResourceLimits(executionOptions);
  if (file.size > limits.maxSourceBytes) {
    return createFailureResult([createSourceSizeError(limits.maxSourceBytes)]);
  }

  try {
    const content = await file.text();
    
    // Try to use filename for format hint
    const formatHint = detectFormatFromFilename(file.name);
    
    return parseInput(content, formatHint || undefined, executionOptions);
  } catch (error) {
    return createFailureResult([
      createParseError('Failed to read file', {
        code: ParseErrorCodes.FILE_READ_ERROR,
        cause: error,
      }),
    ]);
  }
}

/**
 * Parse a string into a normalized controller model.
 * Automatically detects the format unless a format hint is provided.
 * 
 * @param content - String content to parse
 * @param formatHint - Optional format hint to skip auto-detection
 * @returns Parse result with normalized controller or errors
 * 
 * @example
 * ```typescript
 * const result = parseString(jsonContent);
 * if (result.success) {
 *   console.log('Programs:', result.data.programs.length);
 * }
 * ```
 */
export function parseString(
  content: string,
  formatHint?: FileFormat,
  options?: ParseOptions
): ParseResult<NormalizedController> {
  return parseInput(content, formatHint, withParseDeadline(options));
}

function parseInput(
  input: string | ArrayBuffer,
  formatHint: FileFormat | undefined,
  options: ParseOptions | undefined
): ParseResult<NormalizedController> {
  const executionError = checkParseExecution(options);
  if (executionError) {
    return createFailureResult([executionError]);
  }

  const limits = resolveResourceLimits(options);
  if (exceedsSourceByteLimit(input, limits.maxSourceBytes)) {
    return createFailureResult([createSourceSizeError(limits.maxSourceBytes)]);
  }

  // Ensure parsers are registered
  if (!parserRegistry.hasAnyParsers()) {
    return createFailureResult([
      createParseError('No parsers registered. Call registerDefaultParsers() first.', {
        code: ParseErrorCodes.INTERNAL_ERROR,
      }),
    ]);
  }

  let result: ParseResult<NormalizedController>;

  // Use format hint to find parser, or auto-detect
  if (formatHint) {
    const parser = parserRegistry.getParserByFormat(formatHint);
    if (parser) {
      result = parserRegistry.parse(input, parser.id, options);
    } else {
      // Fall back to auto-detection if hint didn't match
      result = parserRegistry.parse(input, undefined, options);
    }
  } else {
    result = parserRegistry.parse(input, undefined, options);
  }

  return result;
}

/**
 * Parse an ArrayBuffer into a normalized controller model.
 * Useful for binary file handling or when working with fetch responses.
 * 
 * @param buffer - ArrayBuffer to parse
 * @param formatHint - Optional format hint
 * @returns Parse result with normalized controller or errors
 */
export function parseBuffer(
  buffer: ArrayBuffer,
  formatHint?: FileFormat,
  options?: ParseOptions
): ParseResult<NormalizedController> {
  return parseInput(buffer, formatHint, withParseDeadline(options));
}
