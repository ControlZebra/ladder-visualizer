/**
 * Normalized data type member - vendor-agnostic representation
 */
export interface NormalizedDataTypeMember {
  /** Member name */
  name: string;
  /** Data type of the member */
  dataType: string;
  /** Array dimension (0 for scalar) */
  dimension: number;
  /** Complete array extents in source order (empty for a scalar). */
  dimensions?: number[];
  /** Display radix (Decimal, Hex, Binary, etc.) */
  radix?: string;
  /** Whether this member is hidden in programming software */
  hidden?: boolean;
  /** Backing storage member for a packed BIT member. */
  storageTarget?: string;
  /** Zero-based bit position within the packed storage member. */
  bitNumber?: number;
  /** External access level */
  externalAccess?: 'ReadWrite' | 'ReadOnly' | 'None';
  /** Description/comment for the member */
  description?: string;
  /** AOI parameter direction for Add-On Defined data types. */
  usage?: 'Input' | 'Output' | 'InOut';
  /** AOI parameter tag type. */
  tagType?: string;
  /** Whether an AOI parameter is required at the call site. */
  required?: boolean;
  /** Whether an AOI parameter is visible in the instruction signature. */
  visible?: boolean;
  /** AOI parameter default value when one is present in the export. */
  defaultValue?: unknown;
}

/**
 * Data type class
 */
export type DataTypeClass = 'BuiltIn' | 'User' | 'AddOnDefined' | 'ModuleDefined' | 'Unknown';

/** Studio 5000 navigator category for a normalized data type. */
export type DataTypeCategory =
  | 'UserDefined'
  | 'String'
  | 'AddOnDefined'
  | 'Predefined'
  | 'ModuleDefined';

/** How much structural information the source export supplied. */
export type DataTypeResolution = 'Declared' | 'Inferred' | 'Atomic' | 'Unresolved' | 'Conflict';

/**
 * Data type usage/source in L5X exports
 * - Target: The data type is being exported
 * - Context: The data type is referenced from the controller/module context
 */
export type DataTypeUsage = 'Target' | 'Context';

/**
 * Normalized data type definition - vendor-agnostic representation
 */
export interface NormalizedDataType {
  /** Data type name */
  name: string;
  /** Data type family/group */
  family?: string;
  /** Class of data type */
  class: DataTypeClass;
  /** Schema-driven Studio 5000 navigator category. */
  category?: DataTypeCategory;
  /** Whether the member schema was declared, inferred, atomic, or unavailable. */
  resolution?: DataTypeResolution;
  /** Members for structured types */
  members: NormalizedDataTypeMember[];
  /** Description/comment for the data type */
  description?: string;
  /** 
   * Usage/source of the data type (for L5X exports)
   * - Target: Data type is being exported
   * - Context: Data type is referenced from controller context (module-defined)
   */
  usage?: DataTypeUsage;
  /** Source locations that contributed this definition. */
  provenance?: string[];
}
