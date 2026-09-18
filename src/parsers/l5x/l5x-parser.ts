/**
 * L5X Parser - Rockwell Logix5000 XML format parser
 * 
 * Parses L5X files exported from Studio 5000/Logix Designer software.
 */

import { XMLParser, XMLValidator } from 'fast-xml-parser';
import type { NormalizedController, PlcDocument } from '../../types/normalized';
import {
  BaseParser,
  type ParseResult,
  createSuccessResult,
  createFailureResult,
} from '../parser-interface';
import {
  createParseError,
  createParseWarning,
  ParseErrorCodes,
  type ParseError,
  type ParseWarning,
} from '../parse-error';
import {
  ensureArray,
  L5X_STRUCTURE_MEMBER_ORDER,
  type L5XContent,
  type L5XOrderedStructureMember,
  type L5XTag,
  type L5XTagStructure,
} from './l5x-types';
import { l5xToNormalized } from './l5x-to-normalized';
import { l5xToDocument, L5XDocumentError, L5X_TARGET_TYPES } from './l5x-document';
import { finalizeController } from '../aoi-registration';
import {
  checkParseExecution,
  createSourceSizeError,
  exceedsSourceByteLimit,
  inspectXmlResources,
  resolveResourceLimits,
  withParseDeadline,
  type ParseOptions,
} from '../resource-guards';

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
  
  // Only XML's built-in entities are processed. DTD declarations are rejected
  // before parsing so custom entity expansion cannot consume unbounded work.
  processEntities: true,
  
  // Handle HTML entities
  htmlEntities: false,
  
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
  private orderedXmlParser: XMLParser;

  constructor() {
    super();
    this.xmlParser = new XMLParser(XML_PARSER_OPTIONS);
    this.orderedXmlParser = new XMLParser({ ...XML_PARSER_OPTIONS, preserveOrder: true });
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
  parse(input: string | ArrayBuffer, options?: ParseOptions): ParseResult<NormalizedController> {
    const result = this.parseDocument(input, options);
    if (!result.success || !result.data) return createFailureResult(result.errors ?? [], result);
    const controller = result.data.resources.find(resource => resource.kind === 'controller');
    if (!controller || controller.kind !== 'controller') return createFailureResult([createParseError('Missing controller resource', { code: ParseErrorCodes.INTERNAL_ERROR })]);
    return createSuccessResult(controller.data, {
      warnings: result.warnings,
      parseTimeMs: result.parseTimeMs,
      context: result.context,
      status: result.status === 'partial' ? 'partial' : 'complete',
    });
  }

  /** Parse all declared targets and retain unnormalized source fragments. */
  parseDocument(input: string | ArrayBuffer, options?: ParseOptions): ParseResult<PlcDocument> {
    return this.withTiming(() => this.doParseDocument(input, withParseDeadline(options)));
  }

  private doParseDocument(input: string | ArrayBuffer, options?: ParseOptions): ParseResult<PlcDocument> {
    const limits = resolveResourceLimits(options);
    const executionError = checkParseExecution(options);
    if (executionError) {
      return createFailureResult([executionError]);
    }
    if (exceedsSourceByteLimit(input, limits.maxSourceBytes)) {
      return createFailureResult([createSourceSizeError(limits.maxSourceBytes)]);
    }
    const content = this.inputToString(input);

    const resourceError = inspectXmlResources(content, limits, options);
    if (resourceError) {
      return createFailureResult([resourceError]);
    }

    const xmlValidationError = this.validateXML(content);
    if (xmlValidationError) {
      return createFailureResult([xmlValidationError]);
    }

    // Parse XML
    let xml: L5XContent;
    try {
      xml = this.xmlParser.parse(content) as L5XContent;
      if (content.includes('<Structure')) {
        annotateStructureMemberOrder(
          xml as unknown as XmlNode,
          this.orderedXmlParser.parse(content) as OrderedXmlNode[]
        );
      }
    } catch (error) {
      return createFailureResult([
        createParseError('Invalid XML format', {
          code: ParseErrorCodes.INVALID_XML,
          cause: error,
        }),
      ]);
    }

    const parseExecutionError = checkParseExecution(options);
    if (parseExecutionError) {
      return createFailureResult([parseExecutionError]);
    }

    // Validate structure
    const validationResult = this.validateL5XStructure(xml);
    if (!validationResult.success) {
      return createFailureResult(validationResult.errors ?? []);
    }

    // Transform to normalized model
    try {
      const { controller, context } = finalizeController(l5xToNormalized(xml));
      const document = l5xToDocument(xml, controller);
      const tagWarnings = collectUnsupportedTagWarnings(xml);
      const programParameterWarnings = collectUnsupportedProgramParameterWarnings(xml);
      const hasRungDiagnostics = controller.programs.some((program) =>
        program.routines.some((routine) => routine.rungs.some((rung) => rung.diagnostics?.length))
      ) || controller.aois.some((aoi) =>
        aoi.routines.some((routine) => routine.rungs.some((rung) => rung.diagnostics?.length))
      );
      const status = hasRungDiagnostics || tagWarnings.length || programParameterWarnings.length || document.fragments.some(
        (fragment) => fragment.reason === 'unmodeled'
          || fragment.reason === 'protected'
          || isUnnormalizedTagMetadata(fragment.path, fragment.reason)
      ) ? 'partial' : 'complete';
      const warnings: ParseWarning[] = [
        ...(document.fragments.length ? [{
          code: 'PRESERVED_L5X_CONTENT',
          message: 'Source representations and vendor-specific content are retained in document fragments.',
        }] : []),
        ...tagWarnings,
        ...programParameterWarnings,
      ];
      const completionError = checkParseExecution(options);
      if (completionError) return createFailureResult([completionError]);
      return createSuccessResult(document, {
        context,
        status,
        warnings: warnings.length ? warnings : undefined,
      });
    } catch (error) {
      if (error instanceof L5XDocumentError) return createFailureResult([error.issue]);
      return createFailureResult([
        createParseError('Failed to normalize L5X data', {
          code: ParseErrorCodes.INTERNAL_ERROR,
          cause: error,
        }),
      ]);
    }
  }

  /**
   * Validate XML well-formedness before decoding it. fast-xml-parser's parser is
   * intentionally lenient unless validation is requested separately, which can
   * otherwise allow truncated or mismatched L5X documents to be normalized.
   */
  private validateXML(content: string): ParseError | undefined {
    const validationResult = XMLValidator.validate(content, {
      allowBooleanAttributes: XML_PARSER_OPTIONS.allowBooleanAttributes,
    });

    if (validationResult === true) {
      return undefined;
    }

    return createParseError(
      `The L5X file is incomplete or malformed. Re-export it from Studio 5000, then try again. ${validationResult.err.msg}`,
      {
        code: ParseErrorCodes.INVALID_XML,
        location: {
          line: validationResult.err.line,
          column: validationResult.err.col,
        },
        cause: validationResult.err,
      }
    );
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
    const validTargetTypes = L5X_TARGET_TYPES;
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
  validate(input: string | ArrayBuffer, options?: ParseOptions): ParseResult<void> {
    const executionOptions = withParseDeadline(options);
    const limits = resolveResourceLimits(executionOptions);
    const executionError = checkParseExecution(executionOptions);
    if (executionError) {
      return createFailureResult([executionError]);
    }
    if (exceedsSourceByteLimit(input, limits.maxSourceBytes)) {
      return createFailureResult([createSourceSizeError(limits.maxSourceBytes)]);
    }
    const content = this.inputToString(input);

    const resourceError = inspectXmlResources(content, limits, executionOptions);
    if (resourceError) {
      return createFailureResult([resourceError]);
    }

    const xmlValidationError = this.validateXML(content);
    if (xmlValidationError) {
      return createFailureResult([xmlValidationError]);
    }

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

const SUPPORTED_TAG_FORMATS = new Set(['L5K', 'String', 'Decorated', 'Alarm']);
const SUPPORTED_DECORATED_NODES = new Set([
  'DataValue',
  'Array',
  'Structure',
  'AlarmAnalogParameters',
  'AlarmDigitalParameters',
  'AlarmConfig',
]);

function collectUnsupportedTagWarnings(xml: L5XContent): ParseWarning[] {
  const warnings: ParseWarning[] = [];
  const root = xml.RSLogix5000Content;

  function inspectTag(tag: L5XTag, tagPath: string): void {
    ensureArray(tag.Data).forEach((data, dataIndex) => {
      const dataPath = `${tagPath}/Data[${dataIndex + 1}]`;
      const format = data['@_Format'];
      if (format === undefined || !SUPPORTED_TAG_FORMATS.has(format)) {
        warnings.push(createParseWarning(
          format === undefined
            ? `Tag ${tag['@_Name']} has data without a Format attribute. The source representation was preserved.`
            : `Tag ${tag['@_Name']} uses unsupported data encoding ${format}. The source representation was preserved.`,
          {
            code: 'UNSUPPORTED_L5X_TAG_ENCODING',
            location: { path: format === undefined ? dataPath : `${dataPath}/@Format` },
          }
        ));
        return;
      }
      if (format !== 'Decorated' && format !== 'Alarm') return;
      for (const key of Object.keys(data)) {
        if (key.startsWith('@_') || key.startsWith('#') || SUPPORTED_DECORATED_NODES.has(key)) {
          continue;
        }
        warnings.push(createParseWarning(
          `Tag ${tag['@_Name']} contains unsupported decorated data node ${key}. The source representation was preserved.`,
          {
            code: 'UNSUPPORTED_L5X_TAG_ENCODING',
            location: { path: `${dataPath}/${key}[1]` },
          }
        ));
      }
    });
  }

  ensureArray(root.Controller.Tags?.Tag).forEach((tag, tagIndex) =>
    inspectTag(tag, `/RSLogix5000Content/Controller[1]/Tags[1]/Tag[${tagIndex + 1}]`)
  );
  ensureArray(root.Controller.Programs?.Program).forEach((program, programIndex) => {
    ensureArray(program.Tags?.Tag).forEach((tag, tagIndex) =>
      inspectTag(
        tag,
        `/RSLogix5000Content/Controller[1]/Programs[1]/Program[${programIndex + 1}]/Tags[1]/Tag[${tagIndex + 1}]`
      )
    );
  });
  return warnings;
}

const SUPPORTED_PROGRAM_PARAMETER_DATA_NODES = new Set([
  'DataValue',
  'Array',
  'Structure',
  'AlarmAnalogParameters',
  'AlarmDigitalParameters',
  'AlarmConfig',
]);

function collectUnsupportedProgramParameterWarnings(xml: L5XContent): ParseWarning[] {
  const warnings: ParseWarning[] = [];
  ensureArray(xml.RSLogix5000Content.Controller.Programs?.Program).forEach(
    (program, programIndex) => {
      ensureArray(program.Parameters?.Parameter).forEach((parameter, parameterIndex) => {
        if (!parameter.DefaultData) return;
        const dataPath = `/RSLogix5000Content/Controller[1]/Programs[1]/Program[${programIndex + 1}]/Parameters[1]/Parameter[${parameterIndex + 1}]/DefaultData[1]`;
        const format = parameter.DefaultData['@_Format'];
        if (format === undefined || !SUPPORTED_TAG_FORMATS.has(format)) {
          warnings.push(createParseWarning(
            format === undefined
              ? `Program parameter ${parameter['@_Name']} has default data without a Format attribute. The source representation was preserved.`
              : `Program parameter ${parameter['@_Name']} uses unsupported default-data encoding ${format}. The source representation was preserved.`,
            {
              code: 'UNSUPPORTED_L5X_PROGRAM_PARAMETER_DATA',
              location: { path: format === undefined ? dataPath : `${dataPath}/@Format` },
            }
          ));
          return;
        }
        for (const key of Object.keys(parameter.DefaultData)) {
          if (key.startsWith('@_') || key.startsWith('#') || SUPPORTED_PROGRAM_PARAMETER_DATA_NODES.has(key)) {
            continue;
          }
          warnings.push(createParseWarning(
            `Program parameter ${parameter['@_Name']} contains unsupported default-data node ${key}. The source representation was preserved.`,
            {
              code: 'UNSUPPORTED_L5X_PROGRAM_PARAMETER_DATA',
              location: { path: `${dataPath}/${key}[1]` },
            }
          ));
        }
      });
    }
  );
  return warnings;
}

const NORMALIZED_TAG_ATTRIBUTES = new Set([
  'Name',
  'TagType',
  'DataType',
  'Radix',
  'Dimensions',
  'Constant',
  'CanForce',
  'AliasFor',
  'ExternalAccess',
]);

function isUnnormalizedTagMetadata(path: string, reason: string): boolean {
  if (reason !== 'source-representation') return false;
  const attribute = path.match(/\/Tag\[\d+\]\/@([^/]+)$/)?.[1];
  return attribute !== undefined && !NORMALIZED_TAG_ATTRIBUTES.has(attribute);
}

type XmlNode = Record<string, unknown>;
type OrderedXmlNode = Record<string, unknown>;

const STRUCTURE_MEMBER_KINDS = {
  DataValueMember: 'atomic',
  StructureMember: 'structure',
  ArrayMember: 'array',
} as const;

function isXmlNode(value: unknown): value is XmlNode {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Overlay source child order onto the grouped fast-xml-parser object tree. */
function annotateStructureMemberOrder(parsedRoot: XmlNode, orderedRoot: OrderedXmlNode[]): void {
  function visit(
    parsedParent: XmlNode,
    orderedChildren: OrderedXmlNode[],
    parentElement?: string
  ): void {
    const occurrences = new Map<string, number>();
    const members: L5XOrderedStructureMember[] = [];

    for (const orderedChild of orderedChildren) {
      const entry = Object.entries(orderedChild).find(
        ([name]) => name !== ':@' && !name.startsWith('#')
      );
      if (!entry) continue;

      const [elementName, children] = entry;
      const occurrence = occurrences.get(elementName) ?? 0;
      occurrences.set(elementName, occurrence + 1);
      const groupedChild = parsedParent[elementName];
      const parsedChild = Array.isArray(groupedChild)
        ? groupedChild[occurrence]
        : occurrence === 0
          ? groupedChild
          : undefined;

      if (parentElement === 'Structure' || parentElement === 'StructureMember') {
        const kind = STRUCTURE_MEMBER_KINDS[
          elementName as keyof typeof STRUCTURE_MEMBER_KINDS
        ];
        if (kind && isXmlNode(parsedChild)) {
          members.push({ kind, value: parsedChild } as L5XOrderedStructureMember);
        }
      }

      if (isXmlNode(parsedChild) && Array.isArray(children)) {
        visit(parsedChild, children as OrderedXmlNode[], elementName);
      }
    }

    if ((parentElement === 'Structure' || parentElement === 'StructureMember') && members.length) {
      Object.defineProperty(parsedParent as L5XTagStructure, L5X_STRUCTURE_MEMBER_ORDER, {
        value: members,
        enumerable: false,
      });
    }
  }

  visit(parsedRoot, orderedRoot);
}

/**
 * Singleton instance of the L5X parser
 */
export const l5xParser = new L5XParser();
