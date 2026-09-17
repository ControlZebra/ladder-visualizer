import type { PlcDocument } from '../types/normalized';
import type { ParseResult, FileFormat } from './parser-interface';
import { createFailureResult } from './parser-interface';
import { parserRegistry } from './parser-registry';
import { createParseError, ParseErrorCodes } from './parse-error';
import { detectFormatFromFilename } from './format-detector';
import {
  checkParseExecution,
  createSourceSizeError,
  exceedsSourceByteLimit,
  resolveResourceLimits,
  withParseDeadline,
  type ParseOptions,
} from './resource-guards';

/** Parse a target-aware document using a registered parser's document capability. */
export function parseDocumentString(
  content: string,
  formatHint?: FileFormat,
  options?: ParseOptions
): ParseResult<PlcDocument> {
  return parseDocumentInput(content, formatHint, withParseDeadline(options));
}
export function parseDocumentBuffer(
  content: ArrayBuffer,
  formatHint?: FileFormat,
  options?: ParseOptions
): ParseResult<PlcDocument> {
  return parseDocumentInput(content, formatHint, withParseDeadline(options));
}
export async function parseDocumentFile(
  file: File,
  options?: ParseOptions
): Promise<ParseResult<PlcDocument>> {
  const executionOptions = withParseDeadline(options);
  const executionError = checkParseExecution(executionOptions);
  if (executionError) return createFailureResult([executionError]);
  const limits = resolveResourceLimits(executionOptions);
  if (file.size > limits.maxSourceBytes)
    return createFailureResult([createSourceSizeError(limits.maxSourceBytes)]);
  try {
    const content = await file.text();
    return parseDocumentInput(
      content,
      detectFormatFromFilename(file.name) ?? undefined,
      executionOptions
    );
  } catch (cause) {
    return createFailureResult([
      createParseError('Failed to read file', { code: ParseErrorCodes.FILE_READ_ERROR, cause }),
    ]);
  }
}
function parseDocumentInput(
  input: string | ArrayBuffer,
  formatHint?: FileFormat,
  options?: ParseOptions
): ParseResult<PlcDocument> {
  const executionError = checkParseExecution(options);
  if (executionError) return createFailureResult([executionError]);
  const limits = resolveResourceLimits(options);
  if (exceedsSourceByteLimit(input, limits.maxSourceBytes))
    return createFailureResult([createSourceSizeError(limits.maxSourceBytes)]);
  if (!parserRegistry.hasAnyParsers())
    return createFailureResult([
      createParseError('No parsers registered. Call registerDefaultParsers() first.', {
        code: ParseErrorCodes.INTERNAL_ERROR,
      }),
    ]);
  const parser =
    (formatHint ? parserRegistry.getParserByFormat(formatHint) : undefined) ??
    parserRegistry.detectParser(input);
  if (!parser)
    return createFailureResult([
      createParseError('Unable to detect file format. No suitable parser found.', {
        code: ParseErrorCodes.UNKNOWN_FORMAT,
      }),
    ]);
  if (!parser.parseDocument)
    return createFailureResult([
      createParseError(`Parser ${parser.id} does not support document results.`, {
        code: ParseErrorCodes.UNSUPPORTED_FORMAT,
      }),
    ]);
  return parser.parseDocument(input, options);
}
