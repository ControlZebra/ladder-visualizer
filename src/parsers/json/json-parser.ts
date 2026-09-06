import type { NormalizedController } from '../../types/normalized';
import {
  BaseParser,
  type ParseResult,
  createSuccessResult,
  createFailureResult,
} from '../parser-interface';
import { createParseError, ParseErrorCodes } from '../parse-error';
import { jsonToNormalized, type RawControllerExport } from './json-to-normalized';
import {
  applyInstructionContextToController,
  createInstructionContextFromController,
} from '../aoi-registration';

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

    // Basic validation - check for required fields
    const missingFields = this.validateControllerExport(json);
    if (missingFields.length > 0) {
      return createFailureResult([
        createParseError(
          `Invalid controller export format - missing required fields: ${missingFields.join(', ')}`,
          { code: ParseErrorCodes.MISSING_REQUIRED_FIELD }
        ),
      ]);
    }

    // Transform to normalized model
    try {
      const normalized = jsonToNormalized(json as RawControllerExport);
      const context = createInstructionContextFromController(normalized);
      applyInstructionContextToController(normalized, context);
      return createSuccessResult(normalized, { context });
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
   * Basic runtime check for controller export format.
   * Returns an array of missing field names, or empty array if valid.
   */
  private validateControllerExport(json: unknown): string[] {
    const missingFields: string[] = [];
    
    if (typeof json !== 'object' || json === null) {
      return ['root object'];
    }
    
    const obj = json as Record<string, unknown>;
    
    if (typeof obj.serial_number !== 'string') {
      missingFields.push('serial_number');
    }
    if (!Array.isArray(obj.programs)) {
      missingFields.push('programs');
    }
    if (!Array.isArray(obj.tags)) {
      missingFields.push('tags');
    }
    if (!Array.isArray(obj.data_types)) {
      missingFields.push('data_types');
    }
    
    return missingFields;
  }

  /**
   * Validate JSON without full parsing
   */
  validate(input: string | ArrayBuffer): ParseResult<void> {
    const content = this.inputToString(input);

    try {
      const json = JSON.parse(content);
      const missingFields = this.validateControllerExport(json);
      if (missingFields.length > 0) {
        return createFailureResult([
          createParseError(
            `Invalid controller export format - missing required fields: ${missingFields.join(', ')}`,
            { code: ParseErrorCodes.MISSING_REQUIRED_FIELD }
          ),
        ]);
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
