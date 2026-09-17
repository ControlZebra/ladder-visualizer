import type {
  NormalizedController,
  NormalizedProgram,
  NormalizedRoutine,
  NormalizedRoutineType,
  NormalizedRung,
  NormalizedTag,
  NormalizedDataType,
  NormalizedDataTypeMember,
  NormalizedAOI,
  NormalizedModule,
  DataTypeClass,
  NormalizedTagType,
  TagScope,
  ExternalAccess,
} from '../../types/normalized';
import { parseRungDetailed } from '../rung-parser';

/**
 * Raw JSON format from Rockwell controller exports
 */
export interface RawControllerExport {
  serial_number: string;
  comm_path: string;
  created_date: string;
  modified_date: string;
  sfc_execution_control?: string;
  sfc_restart_position?: string;
  sfc_last_scan?: string;
  data_types: Array<{
    name: string;
    family: string;
    cls: string;
    members: Array<{
      name: string;
      data_type: string;
      dimension: number;
      radix: string;
      hidden: boolean;
      external_access: string;
    }>;
  }>;
  tags: Array<{
    name: string;
    tag_type: string;
    data_type: string;
    radix: string;
    external_access: string;
  }>;
  programs: Array<{
    name?: string;
    tags?: Array<{
      name: string;
      tag_type: string;
      data_type: string;
      radix: string;
      external_access: string;
    }>;
    routines: Array<{
      name: string;
      type: string;
      rungs: string[];
    }>;
  }>;
  aois: Array<{ name: string }>;
  map_devices: Array<{
    module_id: number;
    parent_module: number;
    slot_no: number;
    vendor_id: number;
    product_type: number;
    product_code: number;
    comments: string[];
  }>;
}

/**
 * Convert JSON ControllerExport to NormalizedController
 */
export function jsonToNormalized(data: RawControllerExport): NormalizedController {
  return {
    // Core metadata
    name: extractControllerName(data),
    serialNumber: data.serial_number,
    commPath: data.comm_path,
    createdDate: parseDate(data.created_date),
    modifiedDate: parseDate(data.modified_date),

    // Core data
    dataTypes: data.data_types.map(normalizeDataType),
    tags: data.tags.map(tag => normalizeTag(tag, 'Controller')),
    programs: data.programs.map(normalizeProgram),
    aois: data.aois.map(normalizeAOI),
    modules: data.map_devices.map(normalizeModule),

    // Source information
    vendor: 'rockwell',
    sourceFormat: 'json',
    vendorMetadata: {
      sfc_execution_control: data.sfc_execution_control,
      sfc_restart_position: data.sfc_restart_position,
      sfc_last_scan: data.sfc_last_scan,
    },
  };
}

/**
 * Extract controller name from serial number or path
 */
function extractControllerName(data: RawControllerExport): string {
  // Try to extract from comm_path or use serial number
  const pathParts = data.comm_path.split('/');
  if (pathParts.length > 0) {
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart && lastPart !== '') {
      return lastPart;
    }
  }
  return data.serial_number || 'Unknown Controller';
}

/**
 * Parse date string to Date object
 */
function parseDate(dateString: string): Date | undefined {
  if (!dateString) return undefined;
  const parsed = new Date(dateString);
  return isNaN(parsed.getTime()) ? undefined : parsed;
}

/**
 * Normalize a data type
 */
function normalizeDataType(dt: {
  name: string;
  family: string;
  cls: string;
  members: Array<{
    name: string;
    data_type: string;
    dimension: number;
    radix: string;
    hidden: boolean;
    external_access: string;
  }>;
}): NormalizedDataType {
  const classMap: Record<string, DataTypeClass> = {
    ProductDefined: 'BuiltIn',
    User: 'User',
  };

  return {
    name: dt.name,
    family: dt.family,
    class: classMap[dt.cls] || 'Unknown',
    members: dt.members.map(normalizeMember),
  };
}

/**
 * Normalize a data type member
 */
function normalizeMember(m: {
  name: string;
  data_type: string;
  dimension: number;
  radix: string;
  hidden: boolean;
  external_access: string;
}): NormalizedDataTypeMember {
  return {
    name: m.name,
    dataType: m.data_type,
    dimension: m.dimension,
    radix: m.radix,
    hidden: m.hidden,
    externalAccess: normalizeExternalAccess(m.external_access),
  };
}

/**
 * Normalize external access string
 */
function normalizeExternalAccess(access: string): ExternalAccess {
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

/**
 * Normalize a tag
 */
function normalizeTag(
  tag: {
    name: string;
    tag_type: string;
    data_type: string;
    radix: string;
    external_access: string;
  },
  scope: TagScope,
  programName?: string
): NormalizedTag {
  const tagTypeMap: Record<string, NormalizedTagType> = {
    Base: 'Base',
    Alias: 'Alias',
    Produced: 'Produced',
    Consumed: 'Consumed',
  };

  return {
    name: tag.name,
    tagType: tagTypeMap[tag.tag_type] || 'Unknown',
    dataType: tag.data_type,
    radix: tag.radix,
    externalAccess: normalizeExternalAccess(tag.external_access),
    scope,
    programName,
  };
}

/**
 * Normalize a program
 */
function normalizeProgram(
  program: {
    name?: string;
    tags?: Array<{
      name: string;
      tag_type: string;
      data_type: string;
      radix: string;
      external_access: string;
    }>;
    routines: Array<{
      name: string;
      type: string;
      rungs: string[];
    }>;
  },
  index: number
): NormalizedProgram {
  const programName = program.name || `Program_${index}`;

  return {
    name: programName,
    tags: (program.tags || []).map(tag => normalizeTag(tag, 'Program', programName)),
    routines: program.routines.map(normalizeRoutine),
  };
}

/**
 * Normalize a routine
 */
function normalizeRoutine(routine: {
  name: string;
  type: string;
  rungs: string[];
}): NormalizedRoutine {
  const routineType = ['RLL', 'FBD', 'ST', 'SFC'].includes(routine.type) 
    ? routine.type as NormalizedRoutineType 
    : 'RLL';
    
  return {
    name: routine.name,
    type: routineType,
    rungs: routine.rungs.map((raw, index) => normalizeRung(raw, index)),
  };
}

/**
 * Normalize a rung
 */
function normalizeRung(raw: string, number: number): NormalizedRung {
  const parsed = parseRungDetailed(raw);
  
  return {
    number,
    raw,
    elements: parsed.elements,
    instructions: parsed.instructions,
    diagnostics: parsed.diagnostics,
    type: 'Normal',
  };
}

/**
 * Normalize an AOI
 * Note: JSON format has limited AOI information, so we provide sensible defaults
 */
function normalizeAOI(aoi: { name: string }): NormalizedAOI {
  return {
    name: aoi.name,
    // Classification with defaults
    class: 'Standard',
    // Execution options with defaults
    executePrescan: false,
    executePostscan: false,
    executeEnableInFalse: false,
    // Empty arrays for interface/implementation
    parameters: [],
    localTags: [],
    routines: [],
  };
}

/**
 * Normalize a module/device
 */
function normalizeModule(device: {
  module_id: number;
  parent_module: number;
  slot_no: number;
  vendor_id: number;
  product_type: number;
  product_code: number;
  comments: string[];
  name?: string;
}): NormalizedModule {
  return {
    id: device.module_id,
    name: device.name || `Module_${device.module_id}`,
    parentId: device.parent_module,
    slot: device.slot_no,
    vendorId: device.vendor_id,
    productType: device.product_type,
    productCode: device.product_code,
    comments: device.comments,
    // Default values for fields not available in JSON format
    inhibited: false,
    majorFault: false,
    safetyEnabled: false,
    ports: [],
    connections: [],
  };
}
