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
export type DataTypeClass = 'BuiltIn' | 'User' | 'AddOnDefined' | 'Unknown';

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
}
