import type { NormalizedDataType } from './data-type';
import type { NormalizedTag, ExternalAccess } from './tag';
import type { NormalizedProgram } from './program';
import type { NormalizedRoutine } from './routine';

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
  /** Whether the parameter is required when calling the AOI */
  required: boolean;
  /** Whether the parameter is visible in the instruction signature */
  visible: boolean;
  /** External access level */
  externalAccess: ExternalAccess;
  /** Parameter description */
  description?: string;
  /** Default value */
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
  /** Default value */
  defaultValue?: unknown;
  /** Array dimensions (0 for scalar) */
  dimensions?: number;
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
 * Module/Device definition (normalized)
 */
export interface NormalizedModule {
  /** Module identifier */
  id: number;
  /** Parent module ID */
  parentId?: number;
  /** Slot number */
  slot?: number;
  /** Vendor ID */
  vendorId?: number;
  /** Product type */
  productType?: number;
  /** Product code */
  productCode?: number;
  /** Comments/description */
  comments?: string[];
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
  /** Date when the project was created */
  createdDate?: Date;
  /** Date when the project was last modified */
  modifiedDate?: Date;

  // ---- Core Data ----
  /** User-defined and built-in data types */
  dataTypes: NormalizedDataType[];
  /** Controller-scoped tags */
  tags: NormalizedTag[];
  /** Programs with their routines */
  programs: NormalizedProgram[];
  /** Add-On Instructions */
  aois: NormalizedAOI[];
  /** Modules and devices */
  modules: NormalizedModule[];

  // ---- Source Information ----
  /** Original vendor */
  vendor?: PLCVendor;
  /** Source file format */
  sourceFormat?: SourceFormat;
  /** Any vendor-specific metadata that doesn't fit normalized model */
  vendorMetadata?: Record<string, unknown>;
}
