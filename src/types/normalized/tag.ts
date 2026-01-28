/**
 * Tag type categories
 */
export type NormalizedTagType = 'Base' | 'Alias' | 'Produced' | 'Consumed' | 'Unknown';

/**
 * Tag scope
 */
export type TagScope = 'Controller' | 'Program' | 'Local';

/**
 * External access level
 */
export type ExternalAccess = 'ReadWrite' | 'ReadOnly' | 'None';

/**
 * Normalized tag definition - vendor-agnostic representation
 */
export interface NormalizedTag {
  /** Tag name */
  name: string;
  /** Tag type */
  tagType: NormalizedTagType;
  /** Data type of the tag */
  dataType: string;
  /** Display radix (Decimal, Hex, Binary, etc.) */
  radix?: string;
  /** External access level */
  externalAccess?: ExternalAccess;
  /** Tag scope */
  scope: TagScope;
  /** Owning program name (for program-scoped tags) */
  programName?: string;
  /** Description/comment for the tag */
  description?: string;
  /** Alias target (for alias tags) */
  aliasFor?: string;
  /** Initial value */
  value?: unknown;
}
