import type { ControllerExport } from '../types';
import { ControllerExportSchema } from './schemas';

/**
 * Error thrown when parsing fails
 */
export class ControllerParseError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'ControllerParseError';
  }
}

/**
 * Parse a raw JSON object into a validated ControllerExport.
 *
 * @param json - Raw JSON data (typically from JSON.parse)
 * @returns Validated ControllerExport object
 * @throws ControllerParseError if validation fails
 */
export function parseControllerExport(json: unknown): ControllerExport {
  const result = ControllerExportSchema.safeParse(json);

  if (!result.success) {
    const errorMessages = result.error.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join('; ');
    throw new ControllerParseError(`Invalid controller export: ${errorMessages}`, result.error);
  }

  return result.data;
}

/**
 * Parse a JSON string into a validated ControllerExport.
 *
 * @param jsonString - JSON string to parse
 * @returns Validated ControllerExport object
 * @throws ControllerParseError if JSON parsing or validation fails
 */
export function parseControllerExportString(jsonString: string): ControllerExport {
  try {
    const json = JSON.parse(jsonString);
    return parseControllerExport(json);
  } catch (error) {
    if (error instanceof ControllerParseError) {
      throw error;
    }
    throw new ControllerParseError('Failed to parse JSON string', error);
  }
}
