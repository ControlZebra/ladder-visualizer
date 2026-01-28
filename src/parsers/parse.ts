import type { NormalizedController } from '../types/normalized';
import type { ParseResult, FileFormat } from './parser-interface';
import { createFailureResult } from './parser-interface';
import { createParseError, ParseErrorCodes } from './parse-error';
import { parserRegistry } from './parser-registry';
import { detectFormatFromFilename } from './format-detector';

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
export async function parseFile(file: File): Promise<ParseResult<NormalizedController>> {
  try {
    const content = await file.text();
    
    // Try to use filename for format hint
    const formatHint = detectFormatFromFilename(file.name);
    
    return parseString(content, formatHint || undefined);
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
  formatHint?: FileFormat
): ParseResult<NormalizedController> {
  // Ensure parsers are registered
  if (!parserRegistry.hasAnyParsers()) {
    return createFailureResult([
      createParseError('No parsers registered. Call registerDefaultParsers() first.', {
        code: ParseErrorCodes.INTERNAL_ERROR,
      }),
    ]);
  }

  // Use format hint to find parser, or auto-detect
  if (formatHint) {
    const parser = parserRegistry.getParserByFormat(formatHint);
    if (parser) {
      return parser.parse(content);
    }
    // Fall back to auto-detection if hint didn't match
  }

  return parserRegistry.parse(content);
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
  formatHint?: FileFormat
): ParseResult<NormalizedController> {
  const content = new TextDecoder('utf-8').decode(buffer);
  return parseString(content, formatHint);
}
