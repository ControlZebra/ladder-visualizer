import type { NormalizedRung } from './rung';

/**
 * Routine type
 */
export type NormalizedRoutineType = 'RLL' | 'FBD' | 'ST' | 'SFC' | 'Typeless' | 'External' | 'Encrypted';

/**
 * Structured Text line
 */
export interface STLine {
  /** Line number (0-indexed from L5X) */
  number: number;
  /** Line content/text */
  text: string;
}

export type NormalizedFBDOrientation = 'Landscape' | 'Portrait';
export type NormalizedFBDMetadataSource = 'declared' | 'fallback';

/** A canonical value that records whether it came from the source or a fallback. */
export interface NormalizedFBDMetadataValue<T> {
  value: T;
  source: NormalizedFBDMetadataSource;
}

export interface NormalizedFBDPosition {
  /** Exact xs:unsignedLong source value. */
  x?: string;
  /** Exact xs:unsignedLong source value. */
  y?: string;
}

export type NormalizedFBDPlaceholderReason =
  | 'unsupported-kind'
  | 'unsupported-semantics'
  | 'unknown-kind'
  | 'missing-id'
  | 'invalid-id'
  | 'missing-position'
  | 'invalid-position'
  | 'unresolved-metadata';

export type NormalizedFBDDiagnosticCode =
  | 'FBD_MISSING_SHEET_SIZE'
  | 'FBD_MISSING_SHEET_ORIENTATION'
  | 'FBD_INVALID_SHEET_ORIENTATION'
  | 'FBD_MISSING_SHEET_NUMBER'
  | 'FBD_INVALID_SHEET_NUMBER'
  | 'FBD_MISSING_SHEET_NAME'
  | 'FBD_PLACEHOLDER_ELEMENT'
  | 'FBD_UNKNOWN_INSTRUCTION'
  | 'FBD_UNSUPPORTED_INSTRUCTION_CONTEXT'
  | 'FBD_DUPLICATE_PORT_ID'
  | 'FBD_UNRESOLVED_PORT_METADATA'
  | 'FBD_UNKNOWN_VISIBLE_PIN'
  | 'FBD_MISSING_REQUIRED_ARRAY'
  | 'FBD_UNKNOWN_AOI';

export interface NormalizedFBDDiagnostic {
  code: NormalizedFBDDiagnosticCode;
  message: string;
  severity: 'info' | 'warning';
  sheetIndex?: number;
  sourceKind?: string;
}

interface NormalizedFBDPositionedElement {
  /** Exact xs:unsignedLong source value. */
  id: string;
  position: Required<NormalizedFBDPosition>;
  verified?: boolean;
}

export interface NormalizedFBDReference extends NormalizedFBDPositionedElement {
  kind: 'reference';
  referenceType: 'input' | 'output';
  operand?: string;
  hideDescription?: boolean;
  /** IRef and ORef expose one implicit canonical terminal. */
  ports: ['value'];
}

export interface NormalizedFBDConnector extends NormalizedFBDPositionedElement {
  kind: 'connector';
  connectorType: 'input' | 'output';
  name?: string;
  /** ICon and OCon expose one implicit canonical terminal. */
  ports: ['value'];
}

export interface NormalizedFBDBlockArray {
  name?: string;
  operand?: string;
}

export interface NormalizedFBDPort {
  /** Exact wire-facing source identifier. */
  id: string;
  /** Human-readable label, which may differ from the source identifier. */
  label: string;
  direction: 'input' | 'output';
  side: 'left' | 'right';
  /** Zero-based top-to-bottom order on this side of the element. */
  order: number;
  defaultVisible: boolean;
  /** Whether this port was selected by the source or by metadata defaults. */
  visible: boolean;
}

export interface NormalizedFBDArrayRequirement {
  id: string;
  label: string;
  order: number;
  required: boolean;
}

export interface NormalizedFBDBlock extends NormalizedFBDPositionedElement {
  kind: 'block';
  instruction?: string;
  operand?: string;
  visiblePins: string[];
  ports: NormalizedFBDPort[];
  arrays: NormalizedFBDBlockArray[];
  arrayRequirements: NormalizedFBDArrayRequirement[];
  hideDescription?: boolean;
  autotuneTag?: string;
}

export interface NormalizedFBDAOIBinding {
  name?: string;
  argument?: string;
}

export interface NormalizedFBDAOI extends NormalizedFBDPositionedElement {
  kind: 'add-on-instruction';
  name?: string;
  operand?: string;
  visiblePins: string[];
  ports: NormalizedFBDPort[];
  bindings: NormalizedFBDAOIBinding[];
}

export interface NormalizedFBDFunction extends NormalizedFBDPositionedElement {
  kind: 'function';
  instruction: string;
  ports: NormalizedFBDPort[];
}

export interface NormalizedFBDRoutineControl extends NormalizedFBDPositionedElement {
  kind: 'routine-control';
  operation: 'JSR' | 'SBR' | 'RET';
  routine?: string;
  inputParameters: string[];
  returnParameters: string[];
}

export interface NormalizedFBDTextBox extends NormalizedFBDPositionedElement {
  kind: 'text-box';
  width?: string;
  text?: string;
}

export interface NormalizedFBDPlaceholder {
  kind: 'placeholder';
  sourceKind: string;
  id?: string;
  position?: NormalizedFBDPosition;
  ports: NormalizedFBDPort[];
  /** AOI InOut bindings remain source-visible even when wireable metadata is unresolved. */
  bindings?: NormalizedFBDAOIBinding[];
  reasonCodes: NormalizedFBDPlaceholderReason[];
}

export type NormalizedFBDElement =
  | NormalizedFBDReference
  | NormalizedFBDConnector
  | NormalizedFBDBlock
  | NormalizedFBDAOI
  | NormalizedFBDFunction
  | NormalizedFBDRoutineControl
  | NormalizedFBDTextBox
  | NormalizedFBDPlaceholder;

export interface NormalizedFBDConnectionEndpoint {
  elementId: string;
  port?: string;
}

export interface NormalizedFBDConnection {
  kind: 'wire' | 'feedback-wire';
  from: NormalizedFBDConnectionEndpoint;
  to: NormalizedFBDConnectionEndpoint;
  verified?: boolean;
}

export interface NormalizedFBDAttachment {
  fromElementId: string;
  toElementId: string;
  verified?: boolean;
}

export interface NormalizedFBDSheet {
  number: NormalizedFBDMetadataValue<string>;
  name: NormalizedFBDMetadataValue<string>;
  descriptions: string[];
  elements: NormalizedFBDElement[];
  connections: NormalizedFBDConnection[];
  attachments: NormalizedFBDAttachment[];
}

export interface NormalizedFBDBody {
  sheetSize: NormalizedFBDMetadataValue<string>;
  orientation: NormalizedFBDMetadataValue<NormalizedFBDOrientation>;
  sheets: NormalizedFBDSheet[];
  diagnostics: NormalizedFBDDiagnostic[];
}

/**
 * Normalized routine - vendor-agnostic representation
 */
export interface NormalizedRoutine {
  /** Routine name */
  name: string;
  /** Routine type (Ladder Logic, Function Block, Structured Text, etc.) */
  type: NormalizedRoutineType;
  /** Parsed rungs (for RLL type) */
  rungs: NormalizedRung[];
  /** Structured Text content (for ST type) */
  stContent?: STLine[];
  /** Canonical Function Block Diagram content (for FBD type). */
  fbd?: NormalizedFBDBody;
  /** Description/comment for the routine */
  description?: string;
}
