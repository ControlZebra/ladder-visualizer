/**
 * Transform L5X parsed content to normalized controller model
 */

import type {
  L5XContent,
  L5XController,
  L5XDataType,
  L5XDataTypes,
  L5XMember,
  L5XTag,
  L5XProgram,
  L5XRoutine,
  L5XRung,
  L5XAddOnInstruction,
  L5XModule,
  L5XModules,
  L5XRungType,
  L5XParameter,
  L5XLocalTag,
  L5XLine,
} from './l5x-types';
import {
  ensureArray,
  extractText,
  parseBoolean,
  parseInt,
} from './l5x-types';
import type {
  NormalizedController,
  NormalizedDataType,
  NormalizedDataTypeMember,
  NormalizedTag,
  NormalizedProgram,
  NormalizedRoutine,
  NormalizedRung,
  NormalizedRoutineType,
  NormalizedAOI,
  NormalizedModule,
  NormalizedTagType,
  TagScope,
  ExternalAccess,
  DataTypeClass,
  DataTypeUsage,
  ModuleUsage,
  ModulePort,
  ModuleConnection,
  ModuleCategory,
  PortType,
  AOIParameter,
  AOILocalTag,
  AOIClass,
  AOIParameterUsage,
  STLine,
} from '../../types/normalized';
import { parseRung, parseRungWithBranches } from '../rung-parser';

/**
 * Convert L5X content to NormalizedController
 */
export function l5xToNormalized(content: L5XContent): NormalizedController {
  const root = content.RSLogix5000Content;
  const controller = root.Controller;
  const targetType = root['@_TargetType'];

  return {
    // Core metadata
    name: extractControllerName(root),
    description: extractText(controller.Description),
    serialNumber: controller['@_ProjectSN'],
    commPath: undefined, // Not available in L5X
    createdDate: parseDate(controller['@_ProjectCreationDate']),
    modifiedDate: parseDate(controller['@_LastModifiedDate']),

    // Core data
    dataTypes: normalizeDataTypes(controller.DataTypes),
    tags: normalizeControllerTags(controller.Tags?.Tag),
    programs: normalizePrograms(controller.Programs?.Program, targetType, root['@_TargetName']),
    aois: normalizeAOIs(controller.AddOnInstructionDefinitions?.AddOnInstructionDefinition),
    modules: normalizeModules(controller.Modules),

    // Source information
    vendor: 'rockwell',
    sourceFormat: 'l5x',
    vendorMetadata: {
      schemaRevision: root['@_SchemaRevision'],
      softwareRevision: root['@_SoftwareRevision'],
      targetType: targetType,
      targetName: root['@_TargetName'],
      targetClass: root['@_TargetClass'],
      exportDate: root['@_ExportDate'],
      exportOptions: root['@_ExportOptions'],
      processorType: controller['@_ProcessorType'],
      majorRev: controller['@_MajorRev'],
      minorRev: controller['@_MinorRev'],
      sfcExecutionControl: controller['@_SFCExecutionControl'],
      sfcRestartPosition: controller['@_SFCRestartPosition'],
      sfcLastScan: controller['@_SFCLastScan'],
      // Store controller name separately for when target type is Program
      controllerName: controller['@_Name'],
    },
  };
}

/**
 * Extract controller name from L5X content
 */
function extractControllerName(root: { '@_TargetName': string; Controller: L5XController }): string {
  // For Program exports, use the target name as it's more descriptive
  // For Controller exports, use the controller name
  return root.Controller['@_Name'] || root['@_TargetName'];
}

/**
 * Parse date string to Date object
 * L5X dates can be in ISO format or other formats
 */
function parseDate(dateString: string | undefined): Date | undefined {
  if (!dateString) return undefined;
  
  // Try parsing as ISO date
  const parsed = new Date(dateString);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  
  return undefined;
}

// ============================================
// Data Types
// ============================================

function normalizeDataTypes(dataTypes: L5XDataTypes | undefined): NormalizedDataType[] {
  if (!dataTypes) return [];
  
  const types = ensureArray(dataTypes.DataType);
  const usage = dataTypes['@_Use'] as DataTypeUsage | undefined;
  
  return types.map(dt => normalizeDataType(dt, usage));
}

function normalizeDataType(dt: L5XDataType, usage?: DataTypeUsage): NormalizedDataType {
  const classMap: Record<string, DataTypeClass> = {
    'User': 'User',
    'ProductDefined': 'BuiltIn',
    'Standard': 'BuiltIn',
  };
  
  // Use the data type's class attribute - context/module-defined info is in the usage field
  const dataTypeClass = classMap[dt['@_Class']] || 'Unknown';

  return {
    name: dt['@_Name'],
    family: dt['@_Family'] !== 'NoFamily' ? dt['@_Family'] : undefined,
    class: dataTypeClass,
    members: normalizeMembers(dt.Members?.Member),
    description: extractText(dt.Description),
    usage: usage,
  };
}

function normalizeMembers(members: L5XMember | L5XMember[] | undefined): NormalizedDataTypeMember[] {
  const memberArray = ensureArray(members);
  return memberArray.map(normalizeMember);
}

function normalizeMember(m: L5XMember): NormalizedDataTypeMember {
  return {
    name: m['@_Name'],
    dataType: m['@_DataType'],
    dimension: parseInt(m['@_Dimension'], 0),
    radix: m['@_Radix'] !== 'NullType' ? m['@_Radix'] : undefined,
    hidden: parseBoolean(m['@_Hidden']),
    externalAccess: normalizeExternalAccess(m['@_ExternalAccess']),
    description: extractText(m.Description),
  };
}

// ============================================
// Tags
// ============================================

function normalizeControllerTags(tags: L5XTag | L5XTag[] | undefined): NormalizedTag[] {
  const tagArray = ensureArray(tags);
  return tagArray.map(tag => normalizeTag(tag, 'Controller'));
}

function normalizeProgramTags(tags: L5XTag | L5XTag[] | undefined, programName: string): NormalizedTag[] {
  const tagArray = ensureArray(tags);
  return tagArray.map(tag => normalizeTag(tag, 'Program', programName));
}

function normalizeTag(tag: L5XTag, scope: TagScope, programName?: string): NormalizedTag {
  const tagTypeMap: Record<string, NormalizedTagType> = {
    'Base': 'Base',
    'Alias': 'Alias',
    'Produced': 'Produced',
    'Consumed': 'Consumed',
  };

  return {
    name: tag['@_Name'],
    tagType: tagTypeMap[tag['@_TagType']] || 'Unknown',
    dataType: tag['@_DataType'],
    radix: tag['@_Radix'],
    externalAccess: normalizeExternalAccess(tag['@_ExternalAccess']),
    scope,
    programName,
    description: extractText(tag.Description),
    aliasFor: tag['@_AliasFor'],
    value: extractTagValue(tag),
  };
}

function normalizeExternalAccess(access: string | undefined): ExternalAccess {
  switch (access) {
    case 'Read/Write':
      return 'ReadWrite';
    case 'Read Only':
      return 'ReadOnly';
    case 'None':
      return 'None';
    default:
      return 'ReadWrite'; // Default
  }
}

function extractTagValue(tag: L5XTag): unknown {
  // For simple tags, try to extract the value from L5K format data
  const dataArray = ensureArray(tag.Data);
  const l5kData = dataArray.find(d => d['@_Format'] === 'L5K');
  if (l5kData && l5kData['#text']) {
    const text = l5kData['#text'].trim();
    // Try to parse as number
    const num = Number(text);
    if (!isNaN(num)) return num;
    // Return as string
    return text;
  }
  return undefined;
}

// ============================================
// Programs
// ============================================

function normalizePrograms(
  programs: L5XProgram | L5XProgram[] | undefined,
  targetType: string,
  targetName: string
): NormalizedProgram[] {
  const programArray = ensureArray(programs);
  
  // If this is a Program export with Use="Target", that's the main program
  const normalized = programArray.map((prog, index) => normalizeProgram(prog, index));
  
  // If no programs found but we have routines in AOIs (for Program exports)
  // the program should still be created
  if (normalized.length === 0 && targetType === 'Program') {
    return [{
      name: targetName,
      tags: [],
      routines: [],
      description: undefined,
      mainRoutineName: undefined,
      faultRoutineName: undefined,
      disabled: false,
    }];
  }
  
  return normalized;
}

function normalizeProgram(program: L5XProgram, index: number): NormalizedProgram {
  const programName = program['@_Name'] || `Program_${index}`;
  
  return {
    name: programName,
    tags: normalizeProgramTags(program.Tags?.Tag, programName),
    routines: normalizeRoutines(program.Routines?.Routine),
    description: extractText(program.Description),
    mainRoutineName: program['@_MainRoutineName'],
    faultRoutineName: program['@_FaultRoutineName'],
    disabled: parseBoolean(program['@_Disabled']),
  };
}

// ============================================
// Routines
// ============================================

function normalizeRoutines(routines: L5XRoutine | L5XRoutine[] | undefined): NormalizedRoutine[] {
  const routineArray = ensureArray(routines);
  return routineArray.map(normalizeRoutine);
}

function normalizeRoutine(routine: L5XRoutine): NormalizedRoutine {
  const type = routine['@_Type'] as NormalizedRoutineType;
  
  return {
    name: routine['@_Name'],
    type,
    rungs: type === 'RLL' ? normalizeRungs(routine.RLLContent?.Rung) : [],
    stContent: type === 'ST' ? normalizeSTContent(routine.STContent?.Line) : undefined,
    description: extractText(routine.Description),
  };
}

/**
 * Normalize Structured Text content
 */
function normalizeSTContent(lines: L5XLine | L5XLine[] | undefined): STLine[] {
  const lineArray = ensureArray(lines);
  return lineArray.map(line => ({
    number: parseInt(line['@_Number'], 0),
    text: line['#text'] || '',
  }));
}

function normalizeRungs(rungs: L5XRung | L5XRung[] | undefined): NormalizedRung[] {
  const rungArray = ensureArray(rungs);
  return rungArray.map(normalizeRung);
}

function normalizeRung(rung: L5XRung): NormalizedRung {
  // Extract the raw rung text from the Text element
  // L5X stores rung text in CDATA sections
  const rawText = extractRungText(rung.Text);
  const comment = extractText(rung.Comment);
  const rungNumber = parseInt(rung['@_Number'], 0);
  const rungType = mapRungType(rung['@_Type']);

  // Parse the rung text using the existing parser
  // The rung text format is identical between JSON and L5X exports
  let elements: NormalizedRung['elements'] = [];
  let instructions: NormalizedRung['instructions'] = [];

  if (rawText && rawText.trim()) {
    try {
      // parseRungWithBranches returns RungElement[] which preserves branch structure
      elements = parseRungWithBranches(rawText);
      // parseRung returns a flat array of Instructions
      instructions = parseRung(rawText);
    } catch {
      // If parsing fails, keep empty arrays
      // This can happen with malformed rung text
    }
  }

  return {
    number: rungNumber,
    comment,
    raw: rawText,
    elements,
    instructions,
    type: rungType,
  };
}

/**
 * Extract rung text from L5X Text element
 * Handles CDATA and various text formats
 */
function extractRungText(text: { '#text'?: string; '#cdata'?: string } | string | undefined): string {
  if (text === undefined) return '';
  if (typeof text === 'string') return text;
  // Check for CDATA content first (most L5X files use CDATA for rung text)
  if (text['#cdata']) return text['#cdata'];
  // Then check for regular text
  if (text['#text']) return text['#text'];
  return '';
}

/**
 * Map L5X rung types to normalized types
 */
function mapRungType(type: L5XRungType): NormalizedRung['type'] {
  const typeMap: Record<L5XRungType, NormalizedRung['type']> = {
    'N': 'Normal',
    'E': 'Empty',
    'D': 'Delete',
    'I': 'Insert',
    'ID': 'InsertDirect',
    'R': 'Replace',
    'RD': 'ReplaceDirect',
  };
  return typeMap[type] || 'Normal';
}

// ============================================
// Add-On Instructions
// ============================================

function normalizeAOIs(aois: L5XAddOnInstruction | L5XAddOnInstruction[] | undefined): NormalizedAOI[] {
  const aoiArray = ensureArray(aois);
  return aoiArray.map(normalizeAOI);
}

function normalizeAOI(aoi: L5XAddOnInstruction): NormalizedAOI {
  const classMap: Record<string, AOIClass> = {
    'Standard': 'Standard',
    'Safety': 'Safety',
  };

  return {
    // Identification
    name: aoi['@_Name'],
    description: extractText(aoi.Description),
    revision: aoi['@_Revision'],
    revisionExtension: aoi['@_RevisionExtension'],
    vendor: aoi['@_Vendor'] || aoi['@_CreatedBy'],
    
    // Classification
    class: classMap[aoi['@_Class'] || 'Standard'] || 'Standard',
    
    // Timestamps
    createdDate: parseDate(aoi['@_CreatedDate']),
    createdBy: aoi['@_CreatedBy'],
    editedDate: parseDate(aoi['@_EditedDate']),
    editedBy: aoi['@_EditedBy'],
    
    // Documentation
    revisionNote: extractText(aoi.RevisionNote),
    helpText: extractText(aoi.AdditionalHelpText),
    
    // Execution options
    executePrescan: parseBoolean(aoi['@_ExecutePrescan']),
    executePostscan: parseBoolean(aoi['@_ExecutePostscan']),
    executeEnableInFalse: parseBoolean(aoi['@_ExecuteEnableInFalse']),
    
    // Interface definition
    parameters: normalizeAOIParameters(aoi.Parameters?.Parameter),
    localTags: normalizeAOILocalTags(aoi.LocalTags?.LocalTag),
    
    // Implementation
    routines: normalizeRoutines(aoi.Routines?.Routine),
  };
}

function normalizeAOIParameters(params: L5XParameter | L5XParameter[] | undefined): AOIParameter[] {
  const paramArray = ensureArray(params);
  return paramArray.map(normalizeAOIParameter);
}

function normalizeAOIParameter(param: L5XParameter): AOIParameter {
  const usageMap: Record<string, AOIParameterUsage> = {
    'Input': 'Input',
    'Output': 'Output',
    'InOut': 'InOut',
  };

  return {
    name: param['@_Name'],
    tagType: param['@_TagType'] || 'Base',
    dataType: param['@_DataType'],
    usage: usageMap[param['@_Usage']] || 'Input',
    radix: param['@_Radix'],
    required: parseBoolean(param['@_Required']),
    visible: parseBoolean(param['@_Visible']),
    externalAccess: normalizeExternalAccess(param['@_ExternalAccess']),
    description: extractText(param.Description),
    defaultValue: extractDefaultValue(param.DefaultData),
  };
}

function normalizeAOILocalTags(tags: L5XLocalTag | L5XLocalTag[] | undefined): AOILocalTag[] {
  const tagArray = ensureArray(tags);
  return tagArray.map(normalizeAOILocalTag);
}

function normalizeAOILocalTag(tag: L5XLocalTag): AOILocalTag {
  return {
    name: tag['@_Name'],
    dataType: tag['@_DataType'],
    radix: tag['@_Radix'],
    externalAccess: normalizeExternalAccess(tag['@_ExternalAccess']),
    description: extractText(tag.Description),
    defaultValue: extractDefaultValue(tag.DefaultData),
    dimensions: tag['@_Dimensions'] ? parseInt(tag['@_Dimensions'], 0) : 0,
  };
}

function extractDefaultValue(defaultData: L5XParameter['DefaultData']): unknown {
  if (!defaultData) return undefined;
  
  // Handle array of DefaultData
  const dataArray = ensureArray(defaultData);
  const l5kData = dataArray.find((d: { '@_Format'?: string }) => d['@_Format'] === 'L5K');
  if (l5kData && '#text' in l5kData && l5kData['#text']) {
    const text = (l5kData['#text'] as string).trim();
    // Try to parse as number
    const num = Number(text);
    if (!isNaN(num)) return num;
    return text;
  }
  
  // Try decorated format
  const decoratedData = dataArray.find((d: { '@_Format'?: string }) => d['@_Format'] === 'Decorated');
  if (decoratedData && 'DataValue' in decoratedData && decoratedData.DataValue) {
    const dataValue = decoratedData.DataValue as { '@_Value'?: string };
    if (dataValue['@_Value']) {
      const val = dataValue['@_Value'];
      const num = Number(val);
      if (!isNaN(num)) return num;
      return val;
    }
  }
  
  return undefined;
}

// ============================================
// Modules
// ============================================

function normalizeModules(modules: L5XModules | undefined): NormalizedModule[] {
  if (!modules) return [];
  
  const moduleArray = ensureArray(modules.Module);
  const containerUsage = modules['@_Use'] as ModuleUsage | undefined;
  
  return moduleArray.map((mod, index) => normalizeModule(mod, index, containerUsage));
}

function normalizeModule(module: L5XModule, index: number, containerUsage?: ModuleUsage): NormalizedModule {
  // Module's own usage takes precedence over container usage
  const moduleUsage = (module['@_Use'] as ModuleUsage | undefined) || containerUsage;
  const catalogNumber = module['@_CatalogNumber'];
  
  return {
    // Identification
    id: index,
    name: module['@_Name'],
    catalogNumber,
    description: extractText(module.Description),
    
    // Vendor/Product Info
    vendorId: module['@_Vendor'] ? parseInt(module['@_Vendor'], undefined) : undefined,
    productType: module['@_ProductType'] ? parseInt(module['@_ProductType'], undefined) : undefined,
    productCode: module['@_ProductCode'] ? parseInt(module['@_ProductCode'], undefined) : undefined,
    majorRevision: module['@_Major'] ? parseInt(module['@_Major'], undefined) : undefined,
    minorRevision: module['@_Minor'] ? parseInt(module['@_Minor'], undefined) : undefined,
    
    // Classification
    category: deriveModuleCategory(catalogNumber),
    
    // Hierarchy
    parentId: undefined, // Would need to resolve from ParentModule name in a second pass
    parentModuleName: module['@_ParentModule'],
    parentPortId: module['@_ParentModPortId'] ? parseInt(module['@_ParentModPortId'], undefined) : undefined,
    slot: extractSlotFromPorts(module.Ports),
    
    // Configuration
    inhibited: parseBoolean(module['@_Inhibited']),
    majorFault: parseBoolean(module['@_MajorFault']),
    safetyEnabled: parseBoolean(module['@_SafetyEnabled']),
    eKeyState: normalizeEKeyState(module.EKey),
    
    // Ports
    ports: normalizePorts(module.Ports),
    
    // Connections
    connections: normalizeConnections(module.Communications),
    
    // Metadata
    comments: catalogNumber ? [catalogNumber] : undefined,
    usage: moduleUsage,
  };
}

/**
 * Normalize electronic keying state
 */
function normalizeEKeyState(ekey: L5XModule['EKey']): NormalizedModule['eKeyState'] {
  if (!ekey) return undefined;
  
  const state = ekey['@_State'];
  if (state === 'ExactMatch' || state === 'CompatibleModule' || state === 'Disabled') {
    return state;
  }
  return undefined;
}

/**
 * Normalize module ports
 */
function normalizePorts(ports: L5XModule['Ports']): ModulePort[] {
  if (!ports) return [];
  
  const portArray = ensureArray(ports.Port);
  return portArray.map(port => ({
    id: parseInt(port['@_Id'], 0),
    type: mapPortType(port['@_Type']),
    address: port['@_Address'],
    upstream: parseBoolean(port['@_Upstream']),
    busSize: port.Bus?.['@_Size'] ? parseInt(port.Bus['@_Size'], undefined) : undefined,
  }));
}

/**
 * Map L5X port type to normalized port type
 */
function mapPortType(type: string | undefined): PortType {
  if (!type) return 'Unknown';
  
  const typeUpper = type.toUpperCase();
  if (typeUpper.includes('ETHERNET') || typeUpper === 'ENET') return 'Ethernet';
  if (typeUpper.includes('BACKPLANE') || typeUpper === 'ICP') return 'Backplane';
  if (typeUpper.includes('POINTIO') || typeUpper === 'COMPACT') return 'PointIO';
  if (typeUpper.includes('SERIAL') || typeUpper === 'RS232') return 'Serial';
  if (typeUpper.includes('USB')) return 'USB';
  
  return 'Unknown';
}

/**
 * Extract slot number from port configurations
 * Typically the slot is the address of a backplane/ICP port
 */
function extractSlotFromPorts(ports: L5XModule['Ports']): number | undefined {
  if (!ports) return undefined;
  
  const portArray = ensureArray(ports.Port);
  
  // Look for backplane/ICP port with an address
  for (const port of portArray) {
    const type = port['@_Type']?.toUpperCase() || '';
    if ((type.includes('BACKPLANE') || type === 'ICP') && port['@_Address']) {
      const slot = parseInt(port['@_Address'], undefined);
      if (!isNaN(slot)) return slot;
    }
  }
  
  return undefined;
}

/**
 * Normalize module connections
 */
function normalizeConnections(communications: L5XModule['Communications']): ModuleConnection[] {
  if (!communications?.Connections) return [];
  
  const connectionArray = ensureArray(communications.Connections.Connection);
  return connectionArray.map(conn => ({
    name: conn['@_Name'],
    rpiMicroseconds: conn['@_RPI'] ? parseInt(conn['@_RPI'], undefined) : undefined,
    type: conn['@_Type'],
    inputDataType: conn.InputTag?.['@_DataType'],
    outputDataType: conn.OutputTag?.['@_DataType'],
    unicast: conn['@_Unicast'] ? parseBoolean(conn['@_Unicast']) : undefined,
  }));
}

/**
 * Derive module category from catalog number
 * Uses Rockwell naming conventions to classify modules
 */
function deriveModuleCategory(catalogNumber: string | undefined): ModuleCategory {
  if (!catalogNumber) return 'Unknown';
  
  const cat = catalogNumber.toUpperCase();
  
  // ControlLogix/CompactLogix processors
  if (cat.includes('-L') && (cat.includes('55') || cat.includes('61') || cat.includes('62') || 
      cat.includes('63') || cat.includes('64') || cat.includes('71') || cat.includes('72') ||
      cat.includes('73') || cat.includes('74') || cat.includes('75') || cat.includes('80') ||
      cat.includes('81') || cat.includes('82') || cat.includes('83') || cat.includes('85'))) {
    return 'Processor';
  }
  
  // Communication modules
  if (cat.includes('-EN') || cat.includes('-CN') || cat.includes('-DN') || 
      cat.includes('-DHRIO') || cat.includes('-RIO') || cat.includes('-NET')) {
    return 'Communication';
  }
  
  // Safety modules
  if (cat.includes('/A') || cat.includes('/B') || cat.includes('SAFETY') || 
      cat.includes('-S') && !cat.includes('-SC')) {
    return 'Safety';
  }
  
  // Motion modules
  if (cat.includes('-M0') || cat.includes('-M1') || cat.includes('-M2') || cat.includes('-HM')) {
    return 'Motion';
  }
  
  // Digital I/O
  if (cat.includes('-IB') || cat.includes('-IA') || cat.includes('-IG')) {
    return 'DigitalInput';
  }
  if (cat.includes('-OB') || cat.includes('-OA') || cat.includes('-OW') || cat.includes('-OG')) {
    return 'DigitalOutput';
  }
  if (cat.includes('-IQ') && cat.includes('O')) {
    return 'DigitalCombo';
  }
  if (cat.includes('-IQ') || cat.includes('-IV')) {
    return 'DigitalInput';
  }
  if (cat.includes('-OQ') || cat.includes('-OV')) {
    return 'DigitalOutput';
  }
  
  // Analog I/O
  if (cat.includes('-IF') || cat.includes('-IR') || cat.includes('-IT') || cat.includes('-IH')) {
    return 'AnalogInput';
  }
  if (cat.includes('-OF') || cat.includes('-OE')) {
    return 'AnalogOutput';
  }
  if (cat.includes('-COMBO')) {
    return 'AnalogCombo';
  }
  
  // Chassis
  if (cat.includes('-A') && (cat.includes('4') || cat.includes('7') || cat.includes('10') || 
      cat.includes('13') || cat.includes('17'))) {
    return 'Chassis';
  }
  
  // Specialty (thermocouple, RTD, weighing, etc.)
  if (cat.includes('-TC') || cat.includes('-RTB') || cat.includes('-WS')) {
    return 'Specialty';
  }
  
  return 'Unknown';
}
