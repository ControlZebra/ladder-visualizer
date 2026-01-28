import type { NormalizedController } from '../types/normalized';
import type { PLCParser, ParseResult, FileFormat } from './parser-interface';
import { createFailureResult } from './parser-interface';
import { detectFormat, detectFormatFromFilename } from './format-detector';
import { createParseError, ParseErrorCodes } from './parse-error';

/**
 * Registry for PLC parsers.
 * Manages parser registration, discovery, and format detection.
 */
export class ParserRegistry {
  private parsers: Map<string, PLCParser> = new Map();

  /**
   * Register a parser with the registry
   * 
   * @param parser - Parser to register
   * @throws Error if a parser with the same ID is already registered
   */
  register(parser: PLCParser): void {
    if (this.parsers.has(parser.id)) {
      throw new Error(`Parser with ID "${parser.id}" is already registered`);
    }
    this.parsers.set(parser.id, parser);
  }

  /**
   * Unregister a parser from the registry
   * 
   * @param parserId - ID of the parser to unregister
   * @returns true if the parser was unregistered, false if it wasn't found
   */
  unregister(parserId: string): boolean {
    return this.parsers.delete(parserId);
  }

  /**
   * Get a parser by its ID
   * 
   * @param id - Parser ID
   * @returns The parser or undefined if not found
   */
  getParser(id: string): PLCParser | undefined {
    return this.parsers.get(id);
  }

  /**
   * Get all registered parsers
   * 
   * @returns Array of all registered parsers
   */
  getAllParsers(): PLCParser[] {
    return Array.from(this.parsers.values());
  }

  /**
   * Get parsers that support a specific file extension
   * 
   * @param extension - File extension (with or without leading dot)
   * @returns Array of parsers that support this extension
   */
  getParsersByExtension(extension: string): PLCParser[] {
    const ext = extension.startsWith('.') ? extension.toLowerCase() : `.${extension.toLowerCase()}`;
    return this.getAllParsers().filter(parser =>
      parser.supportedExtensions.some(e => e.toLowerCase() === ext)
    );
  }

  /**
   * Get parsers that support a specific MIME type
   * 
   * @param mimeType - MIME type to check
   * @returns Array of parsers that support this MIME type
   */
  getParsersByMimeType(mimeType: string): PLCParser[] {
    const mime = mimeType.toLowerCase();
    return this.getAllParsers().filter(parser =>
      parser.supportedMimeTypes.some(m => m.toLowerCase() === mime)
    );
  }

  /**
   * Get a parser by format type
   * 
   * @param format - File format
   * @returns The first parser that supports this format, or undefined
   */
  getParserByFormat(format: FileFormat): PLCParser | undefined {
    const extensionMap: Record<FileFormat, string> = {
      json: '.json',
      l5x: '.l5x',
      l5k: '.l5k',
      xml: '.xml',
    };
    const parsers = this.getParsersByExtension(extensionMap[format]);
    return parsers[0];
  }

  /**
   * Auto-detect the format and find an appropriate parser
   * 
   * @param input - Content to analyze
   * @returns The best matching parser, or null if none found
   */
  detectParser(input: string | ArrayBuffer): PLCParser | null {
    const allParsers = this.getAllParsers();
    
    // First try parsers' canParse methods
    for (const parser of allParsers) {
      if (parser.canParse(input)) {
        return parser;
      }
    }

    // Fall back to heuristic detection
    const signatures = detectFormat(input, allParsers);
    if (signatures.length > 0) {
      const bestMatch = signatures[0];
      return this.parsers.get(bestMatch.parserId) || null;
    }

    return null;
  }

  /**
   * Detect parser from filename
   * 
   * @param filename - Filename or path
   * @returns The best matching parser, or null if none found
   */
  detectParserFromFilename(filename: string): PLCParser | null {
    const format = detectFormatFromFilename(filename);
    if (format) {
      return this.getParserByFormat(format) || null;
    }
    return null;
  }

  /**
   * Parse input using auto-detection or a specified parser
   * 
   * @param input - Content to parse
   * @param parserId - Optional specific parser ID to use
   * @returns Parse result with normalized controller or errors
   */
  parse(input: string | ArrayBuffer, parserId?: string): ParseResult<NormalizedController> {
    let parser: PLCParser | undefined | null;

    if (parserId) {
      parser = this.getParser(parserId);
      if (!parser) {
        return createFailureResult([
          createParseError(`Parser with ID "${parserId}" not found`, {
            code: ParseErrorCodes.UNSUPPORTED_FORMAT,
          }),
        ]);
      }
    } else {
      parser = this.detectParser(input);
      if (!parser) {
        return createFailureResult([
          createParseError('Unable to detect file format. No suitable parser found.', {
            code: ParseErrorCodes.UNKNOWN_FORMAT,
          }),
        ]);
      }
    }

    return parser.parse(input);
  }

  /**
   * Check if the registry has any parsers registered
   */
  hasAnyParsers(): boolean {
    return this.parsers.size > 0;
  }

  /**
   * Get the number of registered parsers
   */
  get size(): number {
    return this.parsers.size;
  }

  /**
   * Clear all registered parsers
   */
  clear(): void {
    this.parsers.clear();
  }
}

/**
 * Global parser registry instance
 */
export const parserRegistry = new ParserRegistry();

/**
 * Create a new parser registry (useful for testing or isolated contexts)
 */
export function createParserRegistry(): ParserRegistry {
  return new ParserRegistry();
}
