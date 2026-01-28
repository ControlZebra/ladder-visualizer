import type { NormalizedController } from '../../types/normalized';
import {
  BaseParser,
  type ParseResult,
  createSuccessResult,
  createFailureResult,
} from '../parser-interface';
import { createParseError, ParseErrorCodes } from '../parse-error';
import { ControllerExportSchema } from '../schemas';
import { jsonToNormalized } from './json-to-normalized';

/**
 * Parser for Rockwell Automation JSON export format.
 * This is the format produced by third-party tools that export
 * Allen-Bradley/Rockwell PLC data to JSON.
 */
export class JSONParser extends BaseParser {
  readonly id = 'rockwell-json';
  readonly name = 'Rockwell JSON Export';
  readonly supportedExtensions = ['.json'];
  readonly supportedMimeTypes = ['application/json'];

  /**
   * Check if input looks like a Rockwell JSON export
   */
  canParse(input: string | ArrayBuffer): boolean {
    const content = this.inputToString(input);
    
    // Must be valid JSON
    if (!content.trim().startsWith('{') && !content.trim().startsWith('[')) {
      return false;
    }

    try {
      const obj = JSON.parse(content);
      // Check for Rockwell-specific fields
      return (
        typeof obj === 'object' &&
        obj !== null &&
        ('serial_number' in obj || 'programs' in obj)
      );
    } catch {
      return false;
    }
  }

  /**
   * Parse JSON input into normalized controller model
   */
  parse(input: string | ArrayBuffer): ParseResult<NormalizedController> {
    return this.withTiming(() => this.doParse(input));
  }

  private doParse(input: string | ArrayBuffer): ParseResult<NormalizedController> {
    const content = this.inputToString(input);

    // Parse JSON
    let json: unknown;
    try {
      json = JSON.parse(content);
    } catch (error) {
      return createFailureResult([
        createParseError('Invalid JSON format', {
          code: ParseErrorCodes.INVALID_JSON,
          cause: error,
        }),
      ]);
    }

    // Validate against schema
    const result = ControllerExportSchema.safeParse(json);
    if (!result.success) {
      const errors = result.error.errors.map(e =>
        createParseError(`${e.path.join('.')}: ${e.message}`, {
          code: ParseErrorCodes.INVALID_FIELD_TYPE,
          location: { path: e.path.join('.') },
        })
      );
      return createFailureResult(errors);
    }

    // Transform to normalized model
    try {
      const normalized = jsonToNormalized(result.data);
      return createSuccessResult(normalized);
    } catch (error) {
      return createFailureResult([
        createParseError('Failed to normalize controller data', {
          code: ParseErrorCodes.INTERNAL_ERROR,
          cause: error,
        }),
      ]);
    }
  }

  /**
   * Validate JSON without full parsing
   */
  validate(input: string | ArrayBuffer): ParseResult<void> {
    const content = this.inputToString(input);

    try {
      const json = JSON.parse(content);
      const result = ControllerExportSchema.safeParse(json);

      if (!result.success) {
        const errors = result.error.errors.map(e =>
          createParseError(`${e.path.join('.')}: ${e.message}`, {
            code: ParseErrorCodes.INVALID_FIELD_TYPE,
            location: { path: e.path.join('.') },
          })
        );
        return createFailureResult(errors);
      }

      return createSuccessResult(undefined);
    } catch (error) {
      return createFailureResult([
        createParseError('Invalid JSON format', {
          code: ParseErrorCodes.INVALID_JSON,
          cause: error,
        }),
      ]);
    }
  }
}

/**
 * Singleton instance of the JSON parser
 */
export const jsonParser = new JSONParser();
