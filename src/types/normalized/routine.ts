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
  | 'invalid-position';

export type NormalizedFBDDiagnosticCode =
  | 'FBD_MISSING_SHEET_SIZE'
  | 'FBD_MISSING_SHEET_ORIENTATION'
  | 'FBD_INVALID_SHEET_ORIENTATION'
  | 'FBD_MISSING_SHEET_NUMBER'
  | 'FBD_INVALID_SHEET_NUMBER'
  | 'FBD_MISSING_SHEET_NAME'
  | 'FBD_PLACEHOLDER_ELEMENT';

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

export interface NormalizedFBDBlock extends NormalizedFBDPositionedElement {
  kind: 'block';
  instruction?: string;
  operand?: string;
  visiblePins: string[];
  arrays: NormalizedFBDBlockArray[];
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
  bindings: NormalizedFBDAOIBinding[];
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
  ports: string[];
  reasonCodes: NormalizedFBDPlaceholderReason[];
}

export type NormalizedFBDElement =
  | NormalizedFBDReference
  | NormalizedFBDConnector
  | NormalizedFBDBlock
  | NormalizedFBDAOI
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
