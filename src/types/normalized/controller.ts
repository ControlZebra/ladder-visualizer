import type { NormalizedDataType } from './data-type';
import type { NormalizedTag, NormalizedTagData, ExternalAccess } from './tag';
import type { NormalizedProgram } from './program';
import type { NormalizedRoutine } from './routine';
import type { NormalizedTask } from './task';
import type { NormalizedQuickWatchList, NormalizedTrend } from './trend';

/**
 * Supported PLC vendors
 */
export type PLCVendor = 'rockwell' | 'siemens' | 'mitsubishi' | 'omron' | 'beckhoff' | 'other';

/**
 * Source format that was used to create this normalized controller
 */
export type SourceFormat = 'json' | 'l5x' | 'l5k' | 'xml' | 'other';

/**
 * AOI Parameter usage direction
 */
export type AOIParameterUsage = 'Input' | 'Output' | 'InOut';

/**
 * AOI Parameter definition
 */
export interface AOIParameter {
  /** Parameter name */
  name: string;
  /** Tag type (Base, Alias) */
  tagType: string;
  /** Data type of the parameter */
  dataType: string;
  /** Usage direction (Input, Output, InOut) */
  usage: AOIParameterUsage;
  /** Display radix */
  radix?: string;
  /** Array extents in declared order. */
  dimensions?: number[];
  /** Whether the parameter is required when calling the AOI */
  required: boolean;
  /** Whether the parameter is visible in the instruction signature */
  visible: boolean;
  /** External access level */
  externalAccess: ExternalAccess;
  /** Parameter description */
  description?: string;
  /** Ordered source default representations, including recursive decorated values. */
  defaultData?: NormalizedTagData[];
  /** Scalar convenience value from Decorated data, then L5K/String text. */
  defaultValue?: unknown;
}

/**
 * AOI Local Tag definition (internal variables)
 */
export interface AOILocalTag {
  /** Local tag name */
  name: string;
  /** Data type */
  dataType: string;
  /** Display radix */
  radix?: string;
  /** External access level */
  externalAccess: ExternalAccess;
  /** Description */
  description?: string;
  /** Ordered source default representations, including recursive decorated values. */
  defaultData?: NormalizedTagData[];
  /** Scalar convenience value from Decorated data, then L5K/String text. */
  defaultValue?: unknown;
  /** Array extents in declared order; absent for scalar tags. */
  dimensions?: number[];
}

/**
 * AOI Class type
 */
export type AOIClass = 'Standard' | 'Safety';

/**
 * Add-On Instruction definition (normalized) - Full representation
 */
export interface NormalizedAOI {
  // ---- Identification ----
  /** AOI name (used as instruction mnemonic) */
  name: string;
  /** Description */
  description?: string;
  /** Revision string (e.g., "1.1", "4.2") */
  revision?: string;
  /** Revision extension (e.g., "Deluxe Edition") */
  revisionExtension?: string;
  /** Creator/vendor information */
  vendor?: string;
  
  // ---- Classification ----
  /** AOI class (Standard or Safety) */
  class: AOIClass;
  
  // ---- Timestamps ----
  /** Date when AOI was created */
  createdDate?: Date;
  /** User who created the AOI */
  createdBy?: string;
  /** Date when AOI was last edited */
  editedDate?: Date;
  /** User who last edited the AOI */
  editedBy?: string;
  
  // ---- Documentation ----
  /** Revision notes / change log */
  revisionNote?: string;
  /** Additional help text */
  helpText?: string;
  
  // ---- Execution Options ----
  /** Execute during prescan */
  executePrescan: boolean;
  /** Execute during postscan */
  executePostscan: boolean;
  /** Execute when EnableIn is false */
  executeEnableInFalse: boolean;
  
  // ---- Interface Definition ----
  /** Input/Output/InOut parameters */
  parameters: AOIParameter[];
  /** Internal local tags */
  localTags: AOILocalTag[];
  
  // ---- Implementation ----
  /** Internal routines (ladder logic, etc.) */
  routines: NormalizedRoutine[];
}

/**
 * Module usage type in L5X exports
 */
export type ModuleUsage = 'Target' | 'Context' | 'Reference';

/**
 * Electronic keying state for modules
 */
export type EKeyState = 'ExactMatch' | 'CompatibleModule' | 'Disabled';

/**
 * Module port type
 */
export type PortType = 'Ethernet' | 'Backplane' | 'PointIO' | 'Serial' | 'USB' | 'ICP' | 'Unknown';

/**
 * Module category based on function
 */
export type ModuleCategory = 'Processor' | 'Communication' | 'DigitalInput' | 'DigitalOutput' | 'DigitalCombo' | 'AnalogInput' | 'AnalogOutput' | 'AnalogCombo' | 'Motion' | 'Safety' | 'Specialty' | 'Chassis' | 'Unknown';

/**
 * Port configuration for a module
 */
export interface ModulePort {
  /** Port ID */
  id: number;
  /** Port type */
  type: PortType;
  /** Address (slot number, IP address, or node address) */
  address?: string;
  /** Is this an upstream port (connects to parent) */
  upstream: boolean;
  /** Bus size (for backplane ports - number of slots) */
  busSize?: number;
}

/**
 * I/O Connection configuration
 */
export interface ModuleConnection {
  /** Connection name */
  name: string;
  /** Requested Packet Interval in microseconds */
  rpiMicroseconds?: number;
  /** Connection type (e.g., "Output", "Input", "Listen Only") */
  type?: string;
  /** Input data type */
  inputDataType?: string;
  /** Output data type */
  outputDataType?: string;
  /** Is unicast connection */
  unicast?: boolean;
}

/**
 * Module/Device definition (normalized)
 */
export interface NormalizedModule {
  // ---- Identification ----
  /** Module identifier (index in the module list) */
  id: number;
  /** Module name */
  name: string;
  /** Catalog number (part number, e.g., "1756-IF16") */
  catalogNumber?: string;
  /** Module description */
  description?: string;
  
  // ---- Vendor/Product Info ----
  /** Vendor ID (1 = Rockwell Automation) */
  vendorId?: number;
  /** Product type code */
  productType?: number;
  /** Product code */
  productCode?: number;
  /** Major firmware revision */
  majorRevision?: number;
  /** Minor firmware revision */
  minorRevision?: number;
  
  // ---- Module Classification ----
  /** Module category (derived from catalog number) */
  category?: ModuleCategory;
  
  // ---- Hierarchy/Topology ----
  /** Parent module ID */
  parentId?: number;
  /** Parent module name */
  parentModuleName?: string;
  /** Port ID on parent module that this connects to */
  parentPortId?: number;
  /** Slot number (if in a chassis) */
  slot?: number;
  
  // ---- Configuration ----
  /** Is module communication inhibited */
  inhibited: boolean;
  /** Does module failure cause major fault */
  majorFault: boolean;
  /** Is safety enabled */
  safetyEnabled: boolean;
  /** Electronic keying state */
  eKeyState?: EKeyState;
  
  // ---- Ports ----
  /** Module ports (Ethernet, Backplane, etc.) */
  ports: ModulePort[];
  
  // ---- Connections/Communication ----
  /** I/O connections */
  connections: ModuleConnection[];
  
  // ---- Metadata ----
  /** Comments/documentation */
  comments?: string[];
  /**
   * Usage type of the module in L5X exports
   * - Target: Module being exported
   * - Context: Module is part of controller context
   * - Reference: Module is referenced by name only
   */
  usage?: ModuleUsage;
}

/**
 * Normalized controller model - the common internal representation
 * that all format parsers produce.
 */
export interface NormalizedController {
  // ---- Core Metadata ----
  /** Controller/project name */
  name: string;
  /** Description/comment */
  description?: string;
  /** Serial number */
  serialNumber?: string;
  /** Communication path */
  commPath?: string;
  /** Controller/processor catalog type reported by the source */
  processorType?: string;
  /** Date when the project was created */
  createdDate?: Date;
  /** Date when the project was last modified */
  modifiedDate?: Date;

  // ---- Core Data ----
  /** User-defined and built-in data types */
  dataTypes: NormalizedDataType[];
  /** Complete schema-driven catalog, including referenced and synthesized types. */
  dataTypeCatalog?: NormalizedDataType[];
  /** Controller-scoped tags */
  tags: NormalizedTag[];
  /** Programs with their routines */
  programs: NormalizedProgram[];
  /** Add-On Instructions */
  aois: NormalizedAOI[];
  /** Modules and devices */
  modules: NormalizedModule[];
  /** Controller execution tasks and their ordered program schedules */
  tasks: NormalizedTask[];
  /** Controller trends in source order */
  trends: NormalizedTrend[];
  /** Quick-watch lists in source order */
  quickWatchLists: NormalizedQuickWatchList[];

  // ---- Source Information ----
  /** Original vendor */
  vendor?: PLCVendor;
  /** Source file format */
  sourceFormat?: SourceFormat;
  /** Any vendor-specific metadata that doesn't fit normalized model */
  vendorMetadata?: Record<string, unknown>;
}
