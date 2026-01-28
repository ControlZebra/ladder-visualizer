import type { PLCParser, FileFormat } from './parser-interface';

/**
 * Result of format detection
 */
export interface FormatSignature {
  /** Detected format */
  format: FileFormat;
  /** Confidence level (0-1, where 1 is certain) */
  confidence: number;
  /** Parser ID that can handle this format */
  parserId: string;
}

/**
 * Check if input looks like JSON
 */
function detectJSON(input: string): boolean {
  const trimmed = input.trim();
  return trimmed.startsWith('{') || trimmed.startsWith('[');
}

/**
 * Check if input looks like Rockwell JSON export specifically
 */
function detectRockwellJSON(input: string): boolean {
  if (!detectJSON(input)) {
    return false;
  }
  try {
    const obj = JSON.parse(input);
    // Check for Rockwell-specific fields
    return (
      typeof obj === 'object' &&
      obj !== null &&
      ('serial_number' in obj || 'programs' in obj || 'data_types' in obj)
    );
  } catch {
    return false;
  }
}

/**
 * Check if input looks like XML
 */
function detectXML(input: string): boolean {
  const trimmed = input.trim();
  return trimmed.startsWith('<?xml') || trimmed.startsWith('<');
}

/**
 * Check if input looks like L5X format specifically
 */
function detectL5X(input: string): boolean {
  return input.includes('<RSLogix5000Content') || input.includes('RSLogix5000Content');
}

/**
 * Check if input looks like L5K format (text-based export)
 */
function detectL5K(input: string): boolean {
  // L5K files typically start with comments and controller definition
  return (
    input.includes('(*') ||
    input.includes('CONTROLLER') ||
    /^[\s]*\(\*/.test(input)
  );
}

/**
 * Detect the format of the input and return all possible matches with confidence scores
 * 
 * @param input - Content to analyze (string or ArrayBuffer)
 * @param parsers - Optional list of registered parsers to consider
 * @returns Array of format signatures sorted by confidence (highest first)
 */
export function detectFormat(
  input: string | ArrayBuffer,
  parsers?: PLCParser[]
): FormatSignature[] {
  const content = typeof input === 'string' 
    ? input 
    : new TextDecoder('utf-8').decode(input);
  
  const signatures: FormatSignature[] = [];

  // If we have parsers, use their canParse methods
  if (parsers && parsers.length > 0) {
    for (const parser of parsers) {
      if (parser.canParse(content)) {
        // Determine format from parser ID or extensions
        let format: FileFormat = 'json';
        if (parser.supportedExtensions.some(ext => ext.includes('l5x'))) {
          format = 'l5x';
        } else if (parser.supportedExtensions.some(ext => ext.includes('l5k'))) {
          format = 'l5k';
        } else if (parser.supportedExtensions.some(ext => ext.includes('xml'))) {
          format = 'xml';
        }
        
        signatures.push({
          format,
          confidence: 0.9, // High confidence since parser says it can handle it
          parserId: parser.id,
        });
      }
    }
  }

  // Fall back to heuristic detection if no parsers matched
  if (signatures.length === 0) {
    // Check for L5X (most specific XML format)
    if (detectL5X(content)) {
      signatures.push({
        format: 'l5x',
        confidence: 0.95,
        parserId: 'rockwell-l5x',
      });
    }
    // Check for Rockwell JSON
    else if (detectRockwellJSON(content)) {
      signatures.push({
        format: 'json',
        confidence: 0.9,
        parserId: 'rockwell-json',
      });
    }
    // Check for generic JSON
    else if (detectJSON(content)) {
      signatures.push({
        format: 'json',
        confidence: 0.5,
        parserId: 'rockwell-json', // Default to Rockwell parser
      });
    }
    // Check for L5K text format
    else if (detectL5K(content)) {
      signatures.push({
        format: 'l5k',
        confidence: 0.8,
        parserId: 'rockwell-l5k',
      });
    }
    // Check for generic XML
    else if (detectXML(content)) {
      signatures.push({
        format: 'xml',
        confidence: 0.3,
        parserId: 'generic-xml',
      });
    }
  }

  // Sort by confidence (highest first)
  return signatures.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Detect the format from a filename extension
 * 
 * @param filename - Filename or path to check
 * @returns Detected format or null if unknown
 */
export function detectFormatFromFilename(filename: string): FileFormat | null {
  const ext = filename.toLowerCase().split('.').pop();
  
  switch (ext) {
    case 'json':
      return 'json';
    case 'l5x':
      return 'l5x';
    case 'l5k':
      return 'l5k';
    case 'xml':
      return 'xml';
    default:
      return null;
  }
}

/**
 * Get the best format detection result
 * 
 * @param input - Content to analyze
 * @param parsers - Optional list of registered parsers
 * @returns Best format signature or null if no format detected
 */
export function detectBestFormat(
  input: string | ArrayBuffer,
  parsers?: PLCParser[]
): FormatSignature | null {
  const signatures = detectFormat(input, parsers);
  return signatures.length > 0 ? signatures[0] : null;
}
