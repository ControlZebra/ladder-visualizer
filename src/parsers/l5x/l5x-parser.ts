/**
 * L5X Parser - Rockwell Logix5000 XML format parser
 * 
 * Parses L5X files exported from Studio 5000/Logix Designer software.
 */

import { XMLParser } from 'fast-xml-parser';
import type { NormalizedController } from '../../types/normalized';
import {
  BaseParser,
  type ParseResult,
  createSuccessResult,
  createFailureResult,
} from '../parser-interface';
import { createParseError, ParseErrorCodes } from '../parse-error';
import type { L5XContent } from './l5x-types';
import { l5xToNormalized } from './l5x-to-normalized';

/**
 * XML Parser configuration options for L5X files
 */
const XML_PARSER_OPTIONS = {
  // Preserve attributes with @ prefix
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  
  // Handle CDATA sections (rung text, comments, descriptions)
  // We want to treat CDATA content the same as regular text
  cdataPropName: '#cdata',
  
  // Preserve text content
  textNodeName: '#text',
  
  // Trim whitespace from text content
  trimValues: true,
  
  // Parse attribute values appropriately
  parseAttributeValue: false,
  
  // Parse tag values appropriately
  parseTagValue: false,
  
  // Handle numeric strings as strings (preserve leading zeros, etc.)
  numberParseOptions: {
    leadingZeros: false,
    hex: false,
    skipLike: /.*/,
  },
  
  // Process tag names (keep as-is)
  transformTagName: undefined,
  
  // Don't remove namespace prefixes
  removeNSPrefix: false,
  
  // Allow boolean attributes
  allowBooleanAttributes: true,
  
  // Comments are not processed (use false, not boolean)
  commentPropName: false as const,
  
  // Process entities
  processEntities: true,
  
  // Handle HTML entities
  htmlEntities: true,
  
  // Also parse CDATA as text nodes (important for L5X)
  alwaysCreateTextNode: false,
};

/**
 * Parser for Rockwell L5X (Logix5000 XML) export format.
 * This is the native export format from Studio 5000/Logix Designer.
 */
export class L5XParser extends BaseParser {
  readonly id = 'rockwell-l5x';
  readonly name = 'Rockwell L5X Export';
  readonly supportedExtensions = ['.l5x', '.L5X'];
  readonly supportedMimeTypes = ['application/xml', 'text/xml', 'application/l5x'];

  private xmlParser: XMLParser;

  constructor() {
    super();
    this.xmlParser = new XMLParser(XML_PARSER_OPTIONS);
  }

  /**
   * Check if input looks like an L5X file
   */
  canParse(input: string | ArrayBuffer): boolean {
    const content = this.inputToString(input);
    
    // Quick checks for L5X signature
    // Must be XML and contain RSLogix5000Content element
    const trimmed = content.trim();
    
    // Must start with XML declaration or root element
    if (!trimmed.startsWith('<?xml') && !trimmed.startsWith('<RSLogix5000Content')) {
      return false;
    }
    
    // Must contain the L5X root element
    return content.includes('<RSLogix5000Content') && content.includes('</RSLogix5000Content>');
  }

  /**
   * Parse L5X input into normalized controller model
   */
  parse(input: string | ArrayBuffer): ParseResult<NormalizedController> {
    return this.withTiming(() => this.doParse(input));
  }

  private doParse(input: string | ArrayBuffer): ParseResult<NormalizedController> {
    const content = this.inputToString(input);

    // Parse XML
    let xml: L5XContent;
    try {
      xml = this.xmlParser.parse(content) as L5XContent;
    } catch (error) {
      return createFailureResult([
        createParseError('Invalid XML format', {
          code: ParseErrorCodes.INVALID_XML,
          cause: error,
        }),
      ]);
    }

    // Validate structure
    const validationResult = this.validateL5XStructure(xml);
    if (!validationResult.success) {
      return validationResult;
    }

    // Transform to normalized model
    try {
      const normalized = l5xToNormalized(xml);
      return createSuccessResult(normalized);
    } catch (error) {
      return createFailureResult([
        createParseError('Failed to normalize L5X data', {
          code: ParseErrorCodes.INTERNAL_ERROR,
          cause: error,
        }),
      ]);
    }
  }

  /**
   * Validate the basic L5X structure
   */
  private validateL5XStructure(xml: L5XContent): ParseResult<NormalizedController> {
    // Check for root element
    if (!xml.RSLogix5000Content) {
      return createFailureResult([
        createParseError('Missing RSLogix5000Content root element', {
          code: ParseErrorCodes.MISSING_REQUIRED_FIELD,
          location: { path: 'RSLogix5000Content' },
        }),
      ]);
    }

    const root = xml.RSLogix5000Content;

    // Check for required attributes
    if (!root['@_TargetName']) {
      return createFailureResult([
        createParseError('Missing TargetName attribute', {
          code: ParseErrorCodes.MISSING_REQUIRED_FIELD,
          location: { path: 'RSLogix5000Content.@TargetName' },
        }),
      ]);
    }

    if (!root['@_TargetType']) {
      return createFailureResult([
        createParseError('Missing TargetType attribute', {
          code: ParseErrorCodes.MISSING_REQUIRED_FIELD,
          location: { path: 'RSLogix5000Content.@TargetType' },
        }),
      ]);
    }

    // Check for Controller element
    if (!root.Controller) {
      return createFailureResult([
        createParseError('Missing Controller element', {
          code: ParseErrorCodes.MISSING_REQUIRED_FIELD,
          location: { path: 'RSLogix5000Content.Controller' },
        }),
      ]);
    }

    // Validate target type
    const validTargetTypes = ['Controller', 'Program', 'Routine', 'AddOnInstructionDefinition'];
    if (!validTargetTypes.includes(root['@_TargetType'])) {
      return createFailureResult([
        createParseError(`Invalid TargetType: ${root['@_TargetType']}. Expected one of: ${validTargetTypes.join(', ')}`, {
          code: ParseErrorCodes.INVALID_FIELD_TYPE,
          location: { path: 'RSLogix5000Content.@TargetType' },
        }),
      ]);
    }

    // Structure is valid
    return createSuccessResult({} as NormalizedController);
  }

  /**
   * Validate L5X without full parsing
   */
  validate(input: string | ArrayBuffer): ParseResult<void> {
    const content = this.inputToString(input);

    // Parse XML
    let xml: L5XContent;
    try {
      xml = this.xmlParser.parse(content) as L5XContent;
    } catch (error) {
      return createFailureResult([
        createParseError('Invalid XML format', {
          code: ParseErrorCodes.INVALID_XML,
          cause: error,
        }),
      ]);
    }

    // Validate structure
    const structureResult = this.validateL5XStructure(xml);
    if (!structureResult.success) {
      return createFailureResult(structureResult.errors || []);
    }

    return createSuccessResult(undefined);
  }
}

/**
 * Singleton instance of the L5X parser
 */
export const l5xParser = new L5XParser();
