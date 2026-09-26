/**
 * L5X Parser - Rockwell Logix5000 XML format parser
 * 
 * Parses L5X files exported from Studio 5000/Logix Designer software.
 */

import { XMLParser, XMLValidator } from 'fast-xml-parser';
import type { NormalizedController, NormalizedFBDBody, PlcDocument } from '../../types/normalized';
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
  L5X_TAG_DATA_VALUE_ORDER,
  type L5XContent,
  type L5XOrderedStructureMember,
  type L5XOrderedTagDataValue,
  type L5XRoutines,
  type L5XTag,
  type L5XTagData,
  type L5XTagStructure,
  type L5XArray,
  type L5XArrayMember,
} from './l5x-types';
import { l5xToNormalized } from './l5x-to-normalized';
import { l5xToDocument, L5XDocumentError, L5X_TARGET_TYPES } from './l5x-document';
import { collectEncodedData } from './l5x-encoded-data';
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
    this.orderedXmlParser = new XMLParser({
      ...XML_PARSER_OPTIONS,
      preserveOrder: true,
      trimValues: false,
      processEntities: false,
    });
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
    let encodedData: ReturnType<typeof collectEncodedData> = [];
    try {
      xml = this.xmlParser.parse(content) as L5XContent;
      const hasDecoratedData = /<(?:Structure|DefaultData|Data)(?=[\s>])/.test(content);
      const hasEncodedData = /<EncodedData(?=[\s>])/.test(content);
      if (hasDecoratedData || hasEncodedData) {
        const ordered = this.orderedXmlParser.parse(content) as OrderedXmlNode[];
        if (hasDecoratedData) annotateDecoratedChildOrder(xml as unknown as XmlNode, ordered);
        if (hasEncodedData) encodedData = collectEncodedData(ordered);
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

    const fbdCompatibilityErrors = collectUnsupportedFBDOnlineEditErrors(xml);
    if (fbdCompatibilityErrors.length) {
      return createFailureResult(fbdCompatibilityErrors);
    }

    // Transform to normalized model
    try {
      const { controller, context } = finalizeController(l5xToNormalized(xml));
      const document = l5xToDocument(xml, controller, encodedData);
      const tagWarnings = collectUnsupportedTagWarnings(xml);
      const taskWarnings = collectTaskWarnings(xml, controller);
      const programNumericWarnings = collectUnsupportedProgramNumericWarnings(xml);
      const programParameterWarnings = collectUnsupportedProgramParameterWarnings(xml);
      const programHierarchyWarnings = collectProgramHierarchyWarnings(xml, controller);
      const equipmentSequenceWarnings = collectUnsupportedEquipmentSequenceWarnings(xml);
      const trendNumericWarnings = collectUnsupportedTrendNumericWarnings(xml);
      const controllerConfigurationWarnings = collectPreservedControllerConfigurationWarnings(xml);
      const normalizationCoverageWarnings = collectNormalizationCoverageWarnings(xml);
      const fbdWarnings = collectFBDNormalizationWarnings(controller);
      const hasRungDiagnostics = controller.programs.some((program) =>
        program.routines.some((routine) => routine.rungs.some((rung) => rung.diagnostics?.length))
      ) || controller.aois.some((aoi) =>
        aoi.routines.some((routine) => routine.rungs.some((rung) => rung.diagnostics?.length))
      );
      const status =
        hasRungDiagnostics ||
        tagWarnings.length ||
        taskWarnings.length ||
        programNumericWarnings.length ||
        programParameterWarnings.length ||
        programHierarchyWarnings.length ||
        equipmentSequenceWarnings.length ||
        trendNumericWarnings.length ||
        controllerConfigurationWarnings.length ||
        normalizationCoverageWarnings.length ||
        fbdWarnings.length ||
        document.fragments.some(
          (fragment) =>
            fragment.reason === 'unmodeled' ||
            fragment.reason === 'protected' ||
            isUnnormalizedTagMetadata(fragment.path, fragment.reason)
        )
          ? 'partial'
          : 'complete';
      const warnings: ParseWarning[] = [
        ...(document.fragments.length ? [{
          code: 'PRESERVED_L5X_CONTENT',
          message: 'Source representations and vendor-specific content are retained in document fragments.',
        }] : []),
        ...tagWarnings,
        ...taskWarnings,
        ...programNumericWarnings,
        ...programParameterWarnings,
        ...programHierarchyWarnings,
        ...equipmentSequenceWarnings,
        ...trendNumericWarnings,
        ...controllerConfigurationWarnings,
        ...normalizationCoverageWarnings,
        ...fbdWarnings,
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

    const fbdCompatibilityErrors = collectUnsupportedFBDOnlineEditErrors(xml);
    if (fbdCompatibilityErrors.length) {
      return createFailureResult(fbdCompatibilityErrors);
    }

    return createSuccessResult(undefined);
  }
}

/**
 * FBD online edits can encode multiple competing views of one routine. Until
 * the parser can model and select those views explicitly, accept only one
 * untagged body and fail before constructing any normalized controller data.
 */
function collectUnsupportedFBDOnlineEditErrors(xml: L5XContent): ParseError[] {
  const errors: ParseError[] = [];

  function inspectRoutines(
    routines: L5XRoutines | undefined,
    collectionPath: string
  ): void {
    ensureArray(routines?.Routine).forEach((routine, routineIndex) => {
      const bodies = ensureArray(routine.FBDContent);
      if (!bodies.length) return;
      const observedStates = bodies.map((body) => body['@_OnlineEditType'] ?? 'untagged');
      if (bodies.length === 1 && observedStates[0] === 'untagged') return;

      errors.push(
        createParseError(
          `Routine ${routine['@_Name'] ?? '(unnamed)'} contains an unsupported FBD online-edit representation. Expected exactly one untagged static body. Observed states: ${observedStates.join(', ')}.`,
          {
            code: ParseErrorCodes.UNSUPPORTED_FBD_ONLINE_EDIT,
            location: { path: `${collectionPath}/Routine[${routineIndex + 1}]` },
          }
        )
      );
    });
  }

  const controllerPath = '/RSLogix5000Content/Controller[1]';
  ensureArray(xml.RSLogix5000Content.Controller.Programs?.Program).forEach(
    (program, programIndex) => {
      inspectRoutines(
        program.Routines,
        `${controllerPath}/Programs[1]/Program[${programIndex + 1}]/Routines[1]`
      );
    }
  );
  ensureArray(
    xml.RSLogix5000Content.Controller.AddOnInstructionDefinitions?.AddOnInstructionDefinition
  ).forEach((aoi, aoiIndex) => {
    inspectRoutines(
      aoi.Routines,
      `${controllerPath}/AddOnInstructionDefinitions[1]/AddOnInstructionDefinition[${aoiIndex + 1}]/Routines[1]`
    );
  });

  return errors;
}

function collectFBDNormalizationWarnings(controller: NormalizedController): ParseWarning[] {
  const warnings: ParseWarning[] = [];
  const collect = (owner: string, routineName: string, fbd: NormalizedFBDBody | undefined) => {
    if (!fbd) return;
    for (const diagnostic of fbd.diagnostics) {
      if (diagnostic.severity !== 'warning') continue;
      warnings.push(
        createParseWarning(`${owner} routine ${routineName}: ${diagnostic.message}`, {
          code: 'RECOVERED_L5X_FBD_ELEMENT',
        })
      );
    }
  };
  for (const program of controller.programs) {
    for (const routine of program.routines) {
      collect(`Program ${program.name}`, routine.name, routine.fbd);
    }
  }
  for (const aoi of controller.aois) {
    for (const routine of aoi.routines) {
      collect(`AOI ${aoi.name}`, routine.name, routine.fbd);
    }
  }
  return warnings;
}

const ACCOUNTED_CONTROLLER_ATTRIBUTES = new Set([
  'Use',
  'Name',
  'ProcessorType',
  'MajorRev',
  'MinorRev',
  'ProjectCreationDate',
  'LastModifiedDate',
  'SFCExecutionControl',
  'SFCRestartPosition',
  'SFCLastScan',
  'CommPath',
  'ProjectSN',
]);

const PRESERVED_CONTROLLER_FAMILIES = [
  ['RedundancyInfo', 'PRESERVED_L5X_REDUNDANCY_CONFIGURATION', 'redundancy'],
  ['Security', 'PRESERVED_L5X_SECURITY_CONFIGURATION', 'security'],
  ['SafetyInfo', 'PRESERVED_L5X_SAFETY_CONFIGURATION', 'safety'],
  ['CommPorts', 'PRESERVED_L5X_COMM_PORT_CONFIGURATION', 'communication-port'],
  ['CST', 'PRESERVED_L5X_CST_CONFIGURATION', 'coordinated-system-time'],
  ['WallClockTime', 'PRESERVED_L5X_WALL_CLOCK_CONFIGURATION', 'wall-clock'],
  ['DataLogs', 'PRESERVED_L5X_DATA_LOG_CONFIGURATION', 'data-log'],
  [
    'TimeSynchronize',
    'PRESERVED_L5X_TIME_SYNCHRONIZATION_CONFIGURATION',
    'time-synchronization',
  ],
  [
    'InternetProtocol',
    'PRESERVED_L5X_INTERNET_PROTOCOL_CONFIGURATION',
    'Internet Protocol',
  ],
  ['EthernetPorts', 'PRESERVED_L5X_ETHERNET_PORT_CONFIGURATION', 'Ethernet-port'],
  ['EthernetNetwork', 'PRESERVED_L5X_ETHERNET_NETWORK_CONFIGURATION', 'Ethernet-network'],
] as const;

function collectPreservedControllerConfigurationWarnings(xml: L5XContent): ParseWarning[] {
  const warnings: ParseWarning[] = [];
  const controller = xml.RSLogix5000Content.Controller;
  const controllerPath = '/RSLogix5000Content/Controller[1]';
  const preservedAttributes = Object.keys(controller)
    .filter((key) => key.startsWith('@_'))
    .map((key) => key.slice(2))
    .filter((attribute) => !ACCOUNTED_CONTROLLER_ATTRIBUTES.has(attribute));

  if (preservedAttributes.length) {
    warnings.push(createParseWarning(
      `Rockwell controller attributes ${preservedAttributes.join(', ')} are preserved without inventing portable controller semantics.`,
      {
        code: 'PRESERVED_L5X_CONTROLLER_ATTRIBUTES',
        location: { path: controllerPath },
      }
    ));
  }

  const source = controller as unknown as Record<string, unknown>;
  PRESERVED_CONTROLLER_FAMILIES.forEach(([element, code, label]) => {
    if (source[element] === undefined) return;
    warnings.push(createParseWarning(
      `Rockwell ${label} configuration is preserved as a complete document fragment.`,
      { code, location: { path: `${controllerPath}/${element}[1]` } }
    ));
  });
  return warnings;
}

function collectNormalizationCoverageWarnings(xml: L5XContent): ParseWarning[] {
  const warnings: ParseWarning[] = [];
  const controller = xml.RSLogix5000Content.Controller;
  const controllerPath = '/RSLogix5000Content/Controller[1]';

  ensureArray(controller.Programs?.Program).forEach((program, programIndex) => {
    const localTagsPath = `${controllerPath}/Programs[1]/Program[${programIndex + 1}]/LocalTags[1]`;
    ensureArray(program.LocalTags?.LocalTag).forEach((tag, tagIndex) => {
      warnings.push(
        createParseWarning(
          `Program local tag ${tag['@_Name'] ?? tagIndex + 1} is preserved but is not exposed by the normalized program model.`,
          {
            code: 'UNNORMALIZED_L5X_PROGRAM_LOCAL_TAG',
            location: { path: `${localTagsPath}/LocalTag[${tagIndex + 1}]` },
          }
        )
      );
    });
  });

  ensureArray(controller.AddOnInstructionDefinitions?.AddOnInstructionDefinition).forEach(
    (aoi, aoiIndex) => {
      const aoiPath = `${controllerPath}/AddOnInstructionDefinitions[1]/AddOnInstructionDefinition[${aoiIndex + 1}]`;

      ensureArray(aoi.Parameters?.Parameter).forEach((parameter, parameterIndex) => {
        const parameterPath = `${aoiPath}/Parameters[1]/Parameter[${parameterIndex + 1}]`;
        const dimensions = parameter['@_Dimensions'];
        if (dimensions !== undefined && !isFaithfullyNormalizedIntegerList(dimensions)) {
          warnings.push(createParseWarning(
            `AOI parameter ${parameter['@_Name'] ?? parameterIndex + 1} has dimensions that cannot be represented as safe integer extents.`,
            {
              code: 'UNNORMALIZED_L5X_AOI_PARAMETER_DIMENSIONS',
              location: { path: `${parameterPath}/@Dimensions` },
            }
          ));
        }
        collectUnsupportedAOIDefaultWarnings(
          parameter.DefaultData,
          parameter['@_Name'] ?? String(parameterIndex + 1),
          `${parameterPath}/DefaultData`,
          warnings
        );
      });

      ensureArray(aoi.LocalTags?.LocalTag).forEach((tag, tagIndex) => {
        const tagPath = `${aoiPath}/LocalTags[1]/LocalTag[${tagIndex + 1}]`;
        const dimensions = tag['@_Dimensions'];
        if (dimensions !== undefined && !isFaithfullyNormalizedIntegerList(dimensions)) {
          warnings.push(
            createParseWarning(
              `AOI local tag ${tag['@_Name'] ?? tagIndex + 1} has dimensions that cannot be represented as safe integer extents.`,
              {
                code: 'UNNORMALIZED_L5X_AOI_LOCAL_TAG_DIMENSIONS',
                location: { path: `${tagPath}/@Dimensions` },
              }
            )
          );
        }
        collectUnsupportedAOIDefaultWarnings(
          tag.DefaultData,
          tag['@_Name'] ?? String(tagIndex + 1),
          `${tagPath}/DefaultData`,
          warnings
        );
      });
    }
  );

  return warnings;
}

function collectUnsupportedAOIDefaultWarnings(
  defaultData: L5XTagData | string | (L5XTagData | string)[] | undefined,
  ownerName: string,
  path: string,
  warnings: ParseWarning[]
): void {
  ensureArray(defaultData).forEach((data, dataIndex) => {
    const dataPath = `${path}[${dataIndex + 1}]`;
    const format = typeof data === 'string' ? undefined : data['@_Format'];
    if (format === undefined || !SUPPORTED_TAG_FORMATS.has(format)) {
      warnings.push(createParseWarning(
        format === undefined
          ? `AOI value ${ownerName} has raw default data without a Format attribute. Its source text is retained but not decoded.`
          : `AOI value ${ownerName} uses unsupported default-data encoding ${format}. Its source is retained.`,
        {
          code: 'UNSUPPORTED_L5X_AOI_DEFAULT_DATA',
          location: { path: format === undefined ? dataPath : `${dataPath}/@Format` },
        }
      ));
      return;
    }
    const supportedNodes = format === 'Decorated' || format === 'Alarm'
      ? SUPPORTED_DECORATED_NODES
      : new Set<string>();
    for (const key of Object.keys(data)) {
      if (key.startsWith('@_') || key.startsWith('#') || supportedNodes.has(key)) continue;
      warnings.push(createParseWarning(
        `AOI value ${ownerName} contains unsupported ${format} default-data node ${key}. Its source is retained.`,
        {
          code: 'UNSUPPORTED_L5X_AOI_DEFAULT_DATA',
          location: { path: `${dataPath}/${key}[1]` },
        }
      ));
    }
    if (format === 'Decorated' || format === 'Alarm') {
      if (typeof data === 'string') return;
      ensureArray(data.Array).forEach((array, index) =>
        collectUnnormalizedAOIArrayWarnings(array, `${dataPath}/Array[${index + 1}]`, ownerName, warnings)
      );
      ensureArray(data.Structure).forEach((structure, index) =>
        collectUnnormalizedAOIStructureWarnings(structure, `${dataPath}/Structure[${index + 1}]`, ownerName, warnings)
      );
    }
  });
}

function collectUnnormalizedAOIArrayWarnings(
  array: L5XArray | L5XArrayMember,
  path: string,
  ownerName: string,
  warnings: ParseWarning[]
): void {
  const dimensions = array['@_Dimensions'];
  if (dimensions !== undefined && !isFaithfullyNormalizedIntegerList(dimensions)) {
    warnings.push(createParseWarning(
      `AOI value ${ownerName} has array dimensions that cannot be represented as safe integer extents.`,
      { code: 'UNNORMALIZED_L5X_AOI_DEFAULT_DATA', location: { path: `${path}/@Dimensions` } }
    ));
  }
  ensureArray(array.Element).forEach((element, index) => {
    const elementPath = `${path}/Element[${index + 1}]`;
    const sourceIndex = element['@_Index'];
    if (sourceIndex === undefined || !isFaithfullyNormalizedIntegerList(sourceIndex)) {
      warnings.push(createParseWarning(
        `AOI value ${ownerName} has a missing or unrepresentable array element index.`,
        {
          code: 'UNNORMALIZED_L5X_AOI_DEFAULT_DATA',
          location: { path: sourceIndex === undefined ? elementPath : `${elementPath}/@Index` },
        }
      ));
    }
    ensureArray(element.Structure).forEach((structure, structureIndex) =>
      collectUnnormalizedAOIStructureWarnings(
        structure,
        `${elementPath}/Structure[${structureIndex + 1}]`,
        ownerName,
        warnings
      )
    );
  });
}

function collectUnnormalizedAOIStructureWarnings(
  structure: L5XTagStructure,
  path: string,
  ownerName: string,
  warnings: ParseWarning[]
): void {
  ensureArray(structure.ArrayMember).forEach((array, index) =>
    collectUnnormalizedAOIArrayWarnings(array, `${path}/ArrayMember[${index + 1}]`, ownerName, warnings)
  );
  ensureArray(structure.StructureMember).forEach((member, index) =>
    collectUnnormalizedAOIStructureWarnings(member, `${path}/StructureMember[${index + 1}]`, ownerName, warnings)
  );
}

function isFaithfullyNormalizedIntegerList(value: string): boolean {
  const trimmed = value.trim();
  const unwrapped = trimmed.startsWith('[') && trimmed.endsWith(']')
    ? trimmed.slice(1, -1)
    : trimmed;
  if (!/^\d+(?:[\s,]+\d+)*$/.test(unwrapped)) return false;
  return unwrapped.split(/[\s,]+/).every((part) => Number.isSafeInteger(Number(part)));
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

function collectTaskWarnings(
  xml: L5XContent,
  controller: NormalizedController
): ParseWarning[] {
  const warnings: ParseWarning[] = [];
  const rawTasks = ensureArray(xml.RSLogix5000Content.Controller.Tasks?.Task);
  const rawPrograms = ensureArray(xml.RSLogix5000Content.Controller.Programs?.Program);
  const programsByName = new Map(controller.programs.map((program) => [program.name, program]));
  const taskNames = new Set(controller.tasks.map((task) => task.name));
  const scheduledByTask = new Map<string, Set<string>>();
  const schedulingTaskByProgram = new Map<string, string>();
  const taskSideContradictions = new Set<string>();

  rawTasks.forEach((task, taskIndex) => {
    const taskName = task['@_Name'];
    const taskPath = `/RSLogix5000Content/Controller[1]/Tasks[1]/Task[${taskIndex + 1}]`;
    const numericAttributes = [
      ['Rate', task['@_Rate']],
      ['Watchdog', task['@_Watchdog']],
    ] as const;
    numericAttributes.forEach(([attribute, value]) => {
      if (value !== undefined && !Number.isSafeInteger(Number(value))) {
        warnings.push(createParseWarning(
          `Task ${taskName} has ${attribute} outside the normalized safe-integer range. The source representation was preserved.`,
          {
            code: 'UNSUPPORTED_L5X_TASK_NUMERIC_VALUE',
            location: { path: `${taskPath}/@${attribute}` },
          }
        ));
      }
    });
    const scheduled = ensureArray(task.ScheduledPrograms?.ScheduledProgram);
    const seen = new Set<string>();
    const scheduledNames = new Set<string>();
    scheduledByTask.set(taskName, scheduledNames);

    scheduled.forEach((reference, referenceIndex) => {
      const programName = reference['@_Name'];
      const path = `/RSLogix5000Content/Controller[1]/Tasks[1]/Task[${taskIndex + 1}]/ScheduledPrograms[1]/ScheduledProgram[${referenceIndex + 1}]/@Name`;
      if (seen.has(programName)) {
        warnings.push(createParseWarning(
          `Task ${taskName} schedules program ${programName} more than once.`,
          { code: 'DUPLICATE_TASK_PROGRAM_REFERENCE', location: { path } }
        ));
        return;
      }
      seen.add(programName);
      scheduledNames.add(programName);

      const priorTaskName = schedulingTaskByProgram.get(programName);
      if (priorTaskName !== undefined && priorTaskName !== taskName) {
        warnings.push(createParseWarning(
          `Program ${programName} is scheduled by both task ${priorTaskName} and task ${taskName}.`,
          { code: 'DUPLICATE_TASK_PROGRAM_REFERENCE', location: { path } }
        ));
      } else if (priorTaskName === undefined) {
        schedulingTaskByProgram.set(programName, taskName);
      }

      const program = programsByName.get(programName);
      if (!program) {
        warnings.push(createParseWarning(
          `Task ${taskName} schedules missing program ${programName}.`,
          { code: 'MISSING_TASK_PROGRAM', location: { path } }
        ));
        return;
      }
      if (program.executingTaskName && program.executingTaskName !== taskName) {
        warnings.push(createParseWarning(
          `Task ${taskName} schedules program ${programName}, but the program declares ${program.executingTaskName} as its executing task.`,
          { code: 'CONTRADICTORY_TASK_PROGRAM_RELATIONSHIP', location: { path } }
        ));
        taskSideContradictions.add(programName);
      }
    });
  });

  if (xml.RSLogix5000Content.Controller.Tasks === undefined) return warnings;

  rawPrograms.forEach((_rawProgram, programIndex) => {
    const program = controller.programs[programIndex];
    if (!program?.executingTaskName) return;
    const path = `/RSLogix5000Content/Controller[1]/Programs[1]/Program[${programIndex + 1}]/@ExecutingTaskName`;
    if (!taskNames.has(program.executingTaskName)) {
      warnings.push(createParseWarning(
        `Program ${program.name} declares missing executing task ${program.executingTaskName}.`,
        { code: 'MISSING_EXECUTING_TASK', location: { path } }
      ));
      return;
    }
    if (
      !taskSideContradictions.has(program.name) &&
      !scheduledByTask.get(program.executingTaskName)?.has(program.name)
    ) {
      warnings.push(createParseWarning(
        `Program ${program.name} declares executing task ${program.executingTaskName}, but that task does not schedule the program.`,
        { code: 'CONTRADICTORY_TASK_PROGRAM_RELATIONSHIP', location: { path } }
      ));
    }
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

function collectUnsupportedProgramNumericWarnings(xml: L5XContent): ParseWarning[] {
  const warnings: ParseWarning[] = [];
  ensureArray(xml.RSLogix5000Content.Controller.Programs?.Program).forEach(
    (program, programIndex) => {
      const programPath = `/RSLogix5000Content/Controller[1]/Programs[1]/Program[${programIndex + 1}]`;
      const numericAttributes = [
        ['InitialStepIndex', program['@_InitialStepIndex']],
        ['EquipmentId', program['@_EquipmentId']],
        ['LastScanTime', program['@_LastScanTime']],
        ['MaxScanTime', program['@_MaxScanTime']],
      ] as const;
      numericAttributes.forEach(([attribute, value]) => {
        if (value !== undefined && !Number.isSafeInteger(Number(value))) {
          warnings.push(createParseWarning(
            `Program ${program['@_Name']} has ${attribute} outside the normalized safe-integer range. The source representation was preserved.`,
            {
              code: 'UNSUPPORTED_L5X_PROGRAM_NUMERIC_VALUE',
              location: { path: `${programPath}/@${attribute}` },
            }
          ));
        }
      });
    }
  );
  return warnings;
}

function collectProgramHierarchyWarnings(
  xml: L5XContent,
  controller: NormalizedController
): ParseWarning[] {
  const warnings: ParseWarning[] = [];
  const root = xml.RSLogix5000Content;
  const rawPrograms = ensureArray(root.Controller.Programs?.Program);
  const hasCompleteProgramSet =
    root['@_TargetType'] === 'Controller' && root['@_ContainsContext'] !== 'true';
  const entries = rawPrograms.map((source, index) => ({
    source,
    normalized: controller.programs[index],
    index,
    path: `/RSLogix5000Content/Controller[1]/Programs[1]/Program[${index + 1}]`,
  }));
  const byUid = new Map<string, typeof entries>();

  for (const entry of entries) {
    const uid = entry.source['@_UId'];
    if (uid === undefined) continue;
    const matches = byUid.get(uid) ?? [];
    matches.push(entry);
    byUid.set(uid, matches);
  }

  for (const [uid, matches] of byUid) {
    for (const duplicate of matches.slice(1)) {
      warnings.push(createParseWarning(
        `Program ${duplicate.normalized?.name ?? duplicate.source['@_Name']} duplicates program UId ${uid}.`,
        {
          code: 'DUPLICATE_PROGRAM_UID',
          location: { path: `${duplicate.path}/@UId` },
        }
      ));
    }
  }

  for (const entry of entries) {
    const parentUid = entry.source['@_ParentUId'];
    if (hasCompleteProgramSet && parentUid !== undefined && !byUid.has(parentUid)) {
      warnings.push(createParseWarning(
        `Program ${entry.normalized?.name ?? entry.source['@_Name']} references missing parent UId ${parentUid}.`,
        {
          code: 'MISSING_PROGRAM_PARENT',
          location: { path: `${entry.path}/@ParentUId` },
        }
      ));
    }
  }

  const uniqueByUid = new Map(
    [...byUid].flatMap(([uid, matches]) => matches.length === 1 ? [[uid, matches[0]] as const] : [])
  );
  const state = new Map<number, 'visiting' | 'visited'>();
  const stack: typeof entries = [];
  const reportedCycles = new Set<string>();

  function visit(entry: (typeof entries)[number]): void {
    state.set(entry.index, 'visiting');
    stack.push(entry);
    const parentUid = entry.source['@_ParentUId'];
    const parent = parentUid === undefined ? undefined : uniqueByUid.get(parentUid);
    if (parent) {
      const parentState = state.get(parent.index);
      if (parentState === undefined) {
        visit(parent);
      } else if (parentState === 'visiting') {
        const cycleStart = stack.findIndex((candidate) => candidate.index === parent.index);
        const cycle = stack.slice(cycleStart);
        const cycleKey = cycle.map((candidate) => candidate.index).sort((a, b) => a - b).join(',');
        if (!reportedCycles.has(cycleKey)) {
          reportedCycles.add(cycleKey);
          const canonical = [...cycle].sort((a, b) => a.index - b.index)[0];
          warnings.push(createParseWarning(
            `Program hierarchy contains a cycle involving ${cycle.map((candidate) => candidate.normalized?.name ?? candidate.source['@_Name']).join(', ')}.`,
            {
              code: 'CYCLIC_PROGRAM_HIERARCHY',
              location: { path: `${canonical.path}/@ParentUId` },
            }
          ));
        }
      }
    }
    stack.pop();
    state.set(entry.index, 'visited');
  }

  for (const entry of uniqueByUid.values()) {
    if (state.get(entry.index) === undefined) visit(entry);
  }

  for (const entry of entries) {
    const parentUid = entry.source['@_ParentUId'];
    if (parentUid === undefined) continue;
    const parents = byUid.get(parentUid);
    if (parents?.length === 1 && parents[0].normalized?.useAsFolder === false) {
      warnings.push(createParseWarning(
        `Program ${entry.normalized?.name ?? entry.source['@_Name']} declares ${parents[0].normalized.name} as its parent, but that program has UseAsFolder=false.`,
        {
          code: 'CONTRADICTORY_PROGRAM_HIERARCHY',
          location: { path: `${entry.path}/@ParentUId` },
        }
      ));
    }
  }

  return warnings;
}

function collectUnsupportedEquipmentSequenceWarnings(xml: L5XContent): ParseWarning[] {
  const warnings: ParseWarning[] = [];

  function containsPhaseCommand(value: unknown): boolean {
    if (typeof value === 'string') return /\bPCMD\s*\(/i.test(value);
    if (Array.isArray(value)) return value.some(containsPhaseCommand);
    if (typeof value !== 'object' || value === null) return false;
    return Object.values(value).some(containsPhaseCommand);
  }

  ensureArray(xml.RSLogix5000Content.Controller.Programs?.Program).forEach(
    (program, programIndex) => {
      ensureArray(program.Routines?.Routine).forEach((routine, routineIndex) => {
        ensureArray(routine.SFCContent).forEach((content, contentIndex) => {
          if (!containsPhaseCommand(content)) return;
          warnings.push(createParseWarning(
            `Routine ${routine['@_Name']} contains SFC-based PCMD equipment sequencing. The source was preserved without inventing a canonical equipment-sequence entity.`,
            {
              code: 'UNSUPPORTED_L5X_EQUIPMENT_SEQUENCE',
              location: {
                path: `/RSLogix5000Content/Controller[1]/Programs[1]/Program[${programIndex + 1}]/Routines[1]/Routine[${routineIndex + 1}]/SFCContent[${contentIndex + 1}]`,
              },
            }
          ));
        });
      });
    }
  );

  return warnings;
}

function collectUnsupportedProgramParameterWarnings(xml: L5XContent): ParseWarning[] {
  const warnings: ParseWarning[] = [];
  ensureArray(xml.RSLogix5000Content.Controller.Programs?.Program).forEach(
    (program, programIndex) => {
      ensureArray(program.Parameters?.Parameter).forEach((parameter, parameterIndex) => {
        if (!parameter.DefaultData) return;
        const dataPath = `/RSLogix5000Content/Controller[1]/Programs[1]/Program[${programIndex + 1}]/Parameters[1]/Parameter[${parameterIndex + 1}]/DefaultData[1]`;
        const data = ensureArray(parameter.DefaultData)[0];
        const format = typeof data === 'string' ? undefined : data['@_Format'];
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
        for (const key of Object.keys(data)) {
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

function collectUnsupportedTrendNumericWarnings(xml: L5XContent): ParseWarning[] {
  const warnings: ParseWarning[] = [];
  ensureArray(xml.RSLogix5000Content.Controller.Trends?.Trend).forEach((trend, trendIndex) => {
    const trendPath = `/RSLogix5000Content/Controller[1]/Trends[1]/Trend[${trendIndex + 1}]`;
    const trendIntegers = [
      ['SamplePeriod', trend['@_SamplePeriod']],
      ['NumberOfCaptures', trend['@_NumberOfCaptures']],
      ['CaptureSize', trend['@_CaptureSize']],
      ['StartTriggerOperation1', trend['@_StartTriggerOperation1']],
      ['StartTriggerOperation2', trend['@_StartTriggerOperation2']],
      ['PreSamples', trend['@_PreSamples']],
      ['StopTriggerOperation1', trend['@_StopTriggerOperation1']],
      ['StopTriggerOperation2', trend['@_StopTriggerOperation2']],
      ['PostSamples', trend['@_PostSamples']],
    ] as const;
    trendIntegers.forEach(([attribute, value]) => {
      if (value !== undefined && !Number.isSafeInteger(Number(value))) {
        warnings.push(createParseWarning(
          `Trend ${trend['@_Name'] ?? trendIndex + 1} has ${attribute} outside the normalized safe-integer range. The source representation was preserved.`,
          {
            code: 'UNSUPPORTED_L5X_TREND_NUMERIC_VALUE',
            location: { path: `${trendPath}/@${attribute}` },
          }
        ));
      }
    });
    ensureArray(trend.Pens?.Pen).forEach((pen, penIndex) => {
      const penPath = `${trendPath}/Pens[1]/Pen[${penIndex + 1}]`;
      const penIntegers = [
        ['Width', pen['@_Width']],
        ['Style', pen['@_Style']],
        ['Marker', pen['@_Marker']],
      ] as const;
      penIntegers.forEach(([attribute, value]) => {
        if (value !== undefined && !Number.isSafeInteger(Number(value))) {
          warnings.push(createParseWarning(
            `Trend pen ${pen['@_Name'] ?? penIndex + 1} has ${attribute} outside the normalized safe-integer range. The source representation was preserved.`,
            {
              code: 'UNSUPPORTED_L5X_TREND_NUMERIC_VALUE',
              location: { path: `${penPath}/@${attribute}` },
            }
          ));
        }
      });
    });
  });
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

const TAG_DATA_VALUE_KINDS = {
  DataValue: 'atomic',
  Array: 'array',
  Structure: 'structure',
  AlarmDigitalParameters: 'alarmDigital',
  AlarmAnalogParameters: 'alarmAnalog',
  AlarmConfig: 'alarmConfig',
} as const;

function isXmlNode(value: unknown): value is XmlNode {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Overlay source child order onto the grouped fast-xml-parser object tree. */
function annotateDecoratedChildOrder(parsedRoot: XmlNode, orderedRoot: OrderedXmlNode[]): void {
  function visit(
    parsedParent: XmlNode,
    orderedChildren: OrderedXmlNode[],
    parentElement?: string
  ): void {
    const occurrences = new Map<string, number>();
    const members: L5XOrderedStructureMember[] = [];
    const dataValues: L5XOrderedTagDataValue[] = [];

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

      if (parentElement === 'Data' || parentElement === 'DefaultData') {
        const kind = TAG_DATA_VALUE_KINDS[
          elementName as keyof typeof TAG_DATA_VALUE_KINDS
        ];
        if (kind && isXmlNode(parsedChild)) {
          dataValues.push({ kind, value: parsedChild } as L5XOrderedTagDataValue);
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
    if ((parentElement === 'Data' || parentElement === 'DefaultData') && dataValues.length) {
      Object.defineProperty(parsedParent as L5XTagData, L5X_TAG_DATA_VALUE_ORDER, {
        value: dataValues,
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
