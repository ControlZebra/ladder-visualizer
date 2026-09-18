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

export interface NormalizedLocalizedText {
  language?: string;
  text: string;
}

export interface NormalizedTagComment {
  operand?: string;
  /** First direct value for callers that only render one line. */
  text?: string;
  /** Every direct text/value entry in source order. */
  values: string[];
  unused?: boolean;
  localizedTexts: NormalizedLocalizedText[];
}

export interface NormalizedTagForceData {
  format?: string;
  value?: string;
}

interface NormalizedNamedTagValue {
  name?: string;
  dataType?: string;
}

export interface NormalizedAtomicTagValue extends NormalizedNamedTagValue {
  kind: 'atomic';
  radix?: string;
  value?: string;
  forceValue?: string;
}

export interface NormalizedArrayElement {
  /** Zero-based indices in source order, without L5X brackets. */
  index: number[];
  value?: string;
  forceValue?: string;
  structures: NormalizedStructureTagValue[];
}

export interface NormalizedArrayTagValue extends NormalizedNamedTagValue {
  kind: 'array';
  dimensions: number[];
  radix?: string;
  elements: NormalizedArrayElement[];
}

export interface NormalizedStructureTagValue extends NormalizedNamedTagValue {
  kind: 'structure';
  members: NormalizedDecoratedTagValue[];
}

export interface NormalizedAlarmMessage {
  type?: string;
  id?: number;
  language?: string;
  text?: string;
}

export interface NormalizedAlarmTagValue {
  kind: 'alarm';
  alarmType: 'analog' | 'digital' | 'config';
  /** Lossless Rockwell alarm parameters keyed by their schema attribute name. */
  parameters: Record<string, string>;
  alarmClass?: string;
  hmiCommand?: string;
  messages?: NormalizedAlarmMessage[];
}

export type NormalizedDecoratedTagValue =
  | NormalizedAtomicTagValue
  | NormalizedArrayTagValue
  | NormalizedStructureTagValue
  | NormalizedAlarmTagValue;

export interface NormalizedTagData {
  /** Source representation name, such as L5K, String, or Decorated. */
  format?: string;
  /** Declared payload length for representations such as String. */
  length?: number;
  /** Textual payload for L5K, String, and preserved unsupported encodings. */
  text?: string;
  /** Typed nodes carried by a decorated representation. */
  values: NormalizedDecoratedTagValue[];
}

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
  /** Array extents in declared order; absent on legacy custom-parser tags. */
  dimensions?: number[];
  /** Whether Studio 5000 marks the tag constant. */
  constant?: boolean;
  /** Whether Studio 5000 permits the tag to be forced. */
  canForce?: boolean;
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
  /** Operand and localized tag comments. */
  comments?: NormalizedTagComment[];
  /** Tag-level force representations. */
  forceData?: NormalizedTagForceData[];
  /** All source value representations, including decorated value trees. */
  data?: NormalizedTagData[];
  /** Initial value */
  value?: unknown;
}
