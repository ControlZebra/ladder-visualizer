import type { NormalizedDataType } from './data-type';
import type { NormalizedTag } from './tag';
import type { NormalizedProgram } from './program';

/**
 * Supported PLC vendors
 */
export type PLCVendor = 'rockwell' | 'siemens' | 'mitsubishi' | 'omron' | 'beckhoff' | 'other';

/**
 * Source format that was used to create this normalized controller
 */
export type SourceFormat = 'json' | 'l5x' | 'l5k' | 'xml' | 'other';

/**
 * Add-On Instruction definition (normalized)
 */
export interface NormalizedAOI {
  /** AOI name */
  name: string;
  /** Description */
  description?: string;
  /** Revision information */
  revision?: string;
  /** Vendor information */
  vendor?: string;
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
