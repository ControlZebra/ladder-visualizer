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
  /** Display radix (Decimal, Hex, Binary, etc.) */
  radix?: string;
  /** Whether this member is hidden in programming software */
  hidden?: boolean;
  /** External access level */
  externalAccess?: 'ReadWrite' | 'ReadOnly' | 'None';
  /** Description/comment for the member */
  description?: string;
}

/**
 * Data type class
 */
export type DataTypeClass = 'BuiltIn' | 'User' | 'AddOnDefined' | 'ModuleDefined' | 'Unknown';

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
}
