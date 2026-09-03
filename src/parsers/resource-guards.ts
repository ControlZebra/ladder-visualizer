import { createParseError, ParseErrorCodes, type ParseError } from './parse-error';

/**
 * Resource limits applied to parser input. The defaults allow typical controller
 * exports while bounding memory and CPU work in browser and service processes.
 */
export interface ParserResourceLimits {
  /** Maximum UTF-8 source size accepted before decoding. */
  maxSourceBytes: number;
  /** Maximum XML element count accepted by the L5X parser. */
  maxXmlNodes: number;
  /** Maximum XML element nesting depth accepted by the L5X parser. */
  maxXmlDepth: number;
}

/**
 * Production-safe defaults. Ten MiB accommodates sizeable controller exports;
 * one hundred thousand elements and 64 levels exceed normal L5X structure
 * without allowing unbounded XML traversal.
 */
export const DEFAULT_PARSER_RESOURCE_LIMITS: Readonly<ParserResourceLimits> = {
  maxSourceBytes: 10 * 1024 * 1024,
  maxXmlNodes: 100_000,
  maxXmlDepth: 64,
};

/** Controls a single parse operation. */
export interface ParseOptions {
  /** Abort before or between parser phases using a standard AbortSignal. */
  signal?: AbortSignal;
  /** Maximum elapsed parser time in milliseconds. */
  timeoutMs?: number;
  /** Controlled overrides for the production-safe resource defaults. */
  resourceLimits?: Partial<ParserResourceLimits>;
  /** @internal Absolute monotonic deadline propagated by async entry points. */
  deadlineMs?: number;
}

export function resolveResourceLimits(options?: ParseOptions): ParserResourceLimits {
  return {
    ...DEFAULT_PARSER_RESOURCE_LIMITS,
    ...options?.resourceLimits,
  };
}

/**
 * Check source size without allocating an encoded copy for a string that is
 * already too long. UTF-8 is never shorter than the original UTF-16 string,
 * so String.length is a safe first rejection test.
 */
export function exceedsSourceByteLimit(input: string | ArrayBuffer, maxBytes: number): boolean {
  if (typeof input !== 'string') {
    return input.byteLength > maxBytes;
  }

  return input.length > maxBytes || new TextEncoder().encode(input).byteLength > maxBytes;
}

export function createSourceSizeError(maxBytes: number): ParseError {
  return createParseError(
    `Input is larger than the ${formatByteLimit(maxBytes)} source limit. Export a smaller controller scope, or increase maxSourceBytes only for trusted input.`,
    { code: ParseErrorCodes.SOURCE_BYTE_LIMIT_EXCEEDED }
  );
}

export function checkParseExecution(options?: ParseOptions): ParseError | undefined {
  if (options?.signal?.aborted) {
    return createParseError('Parsing was cancelled.', {
      code: ParseErrorCodes.PARSE_CANCELLED,
    });
  }

  const deadlineMs = options?.deadlineMs ?? timeoutDeadline(options?.timeoutMs);
  if (deadlineMs !== undefined && performance.now() >= deadlineMs) {
    return createParseError('Parsing exceeded the configured timeout.', {
      code: ParseErrorCodes.PARSE_TIMEOUT,
    });
  }

  return undefined;
}

export function withParseDeadline(options?: ParseOptions): ParseOptions | undefined {
  if (!options) {
    return undefined;
  }

  return {
    ...options,
    deadlineMs: options.deadlineMs ?? timeoutDeadline(options.timeoutMs),
  };
}

/**
 * Performs a lightweight XML scan before the XML parser allocates a document
 * tree. DTDs are rejected outright: L5X does not require them, and allowing
 * custom entities reintroduces entity-expansion risk.
 */
export function inspectXmlResources(
  source: string,
  limits: ParserResourceLimits,
  options?: ParseOptions
): ParseError | undefined {
  let depth = 0;
  let nodes = 0;

  for (let offset = 0; offset < source.length; offset += 1) {
    if ((offset & 0x3ff) === 0) {
      const executionError = checkParseExecution(options);
      if (executionError) {
        return executionError;
      }
    }

    if (source[offset] !== '<') {
      continue;
    }

    if (source.startsWith('<!--', offset)) {
      offset = skipTo(source, '-->', offset + 4);
      continue;
    }
    if (source.startsWith('<![CDATA[', offset)) {
      offset = skipTo(source, ']]>', offset + 9);
      continue;
    }
    if (source.startsWith('<?', offset)) {
      offset = skipTo(source, '?>', offset + 2);
      continue;
    }
    if (/^<!DOCTYPE\b/i.test(source.slice(offset, offset + 10))) {
      return createParseError(
        'L5X input must not contain a DOCTYPE or custom XML entity declarations.',
        {
          code: ParseErrorCodes.UNSAFE_XML_ENTITY,
          location: { offset },
        }
      );
    }
    if (source.startsWith('</', offset)) {
      depth = Math.max(0, depth - 1);
      offset = skipTag(source, offset + 2);
      continue;
    }
    if (source.startsWith('<!', offset)) {
      offset = skipTag(source, offset + 2);
      continue;
    }

    const tagEnd = findTagEnd(source, offset + 1);
    if (tagEnd === -1) {
      // XMLValidator provides the user-facing malformed-document diagnostic.
      break;
    }

    nodes += 1;
    if (nodes > limits.maxXmlNodes) {
      return createParseError(
        `The L5X document has more than ${limits.maxXmlNodes.toLocaleString()} XML elements. Export a smaller controller scope, or increase maxXmlNodes only for trusted input.`,
        {
          code: ParseErrorCodes.XML_NODE_LIMIT_EXCEEDED,
          location: { offset },
        }
      );
    }

    const selfClosing = /\/\s*$/.test(source.slice(offset + 1, tagEnd));
    if (!selfClosing) {
      depth += 1;
      if (depth > limits.maxXmlDepth) {
        return createParseError(
          `The L5X document is nested more than ${limits.maxXmlDepth} levels deep. Export a smaller controller scope, or increase maxXmlDepth only for trusted input.`,
          {
            code: ParseErrorCodes.XML_DEPTH_LIMIT_EXCEEDED,
            location: { offset },
          }
        );
      }
    }
    offset = tagEnd;
  }

  return checkParseExecution(options);
}

function timeoutDeadline(timeoutMs: number | undefined): number | undefined {
  return timeoutMs === undefined ? undefined : performance.now() + Math.max(0, timeoutMs);
}

function formatByteLimit(bytes: number): string {
  const mebibyte = 1024 * 1024;
  return bytes > 0 && bytes % mebibyte === 0 ? `${bytes / mebibyte} MiB` : `${bytes} bytes`;
}

function skipTo(source: string, token: string, from: number): number {
  const end = source.indexOf(token, from);
  return end === -1 ? source.length : end + token.length - 1;
}

function skipTag(source: string, from: number): number {
  const end = findTagEnd(source, from);
  return end === -1 ? source.length : end;
}

function findTagEnd(source: string, from: number): number {
  let quote: '"' | "'" | undefined;
  for (let index = from; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (char === quote) {
        quote = undefined;
      }
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '>') {
      return index;
    }
  }
  return -1;
}
