/** Half-open character offsets into the original rung text. */
export interface RungSourceSpan {
  start: number;
  end: number;
}

export type RungParseDiagnosticCode =
  | 'RLL_EXPECTED_OPEN_PAREN'
  | 'RLL_MISMATCHED_DELIMITER'
  | 'RLL_UNTERMINATED_INSTRUCTION'
  | 'RLL_UNTERMINATED_BRANCH'
  | 'RLL_UNTERMINATED_STRING'
  | 'RLL_UNEXPECTED_TOKEN';

export interface RungParseDiagnostic {
  code: RungParseDiagnosticCode;
  message: string;
  span: RungSourceSpan;
}

export type RungTokenKind =
  | 'identifier'
  | 'open-paren'
  | 'close-paren'
  | 'open-bracket'
  | 'close-bracket'
  | 'open-brace'
  | 'close-brace'
  | 'string'
  | 'comma'
  | 'semicolon'
  | 'raw';

export interface RungToken {
  kind: RungTokenKind;
  value: string;
  span: RungSourceSpan;
  terminated?: boolean;
}

/**
 * Parsed instruction from a ladder logic rung
 */
export interface Instruction {
  /** Instruction mnemonic (XIC, OTE, GEQ, CPT, etc.) */
  mnemonic: string;
  /** Raw operand strings */
  operands: string[];
  /** Exact instruction source in the rung text when detailed parsing is used. */
  source?: string;
  /** Character offsets for the full instruction source. */
  sourceSpan?: RungSourceSpan;
  /** Character offsets for each trimmed operand. */
  operandSpans?: RungSourceSpan[];
  /** Category for styling/rendering */
  category: 'input' | 'output' | 'compare' | 'math' | 'timer' | 'counter' | 'aoi' | 'other';
}

/**
 * A branch group represents parallel paths in ladder logic.
 * Each branch contains an array of RungElements (instructions or nested branches).
 */
export interface BranchGroup {
  /** Type discriminator */
  type: 'branch';
  /** Array of parallel branches, each containing rung elements */
  branches: RungElement[][];
  /** Exact branch source in the rung text when detailed parsing is used. */
  source?: string;
  /** Character offsets for the full branch source. */
  sourceSpan?: RungSourceSpan;
}

/**
 * A rung element can be either an instruction or a branch group
 */
export type RungElement = Instruction | BranchGroup;

export interface ParsedRung {
  elements: RungElement[];
  instructions: Instruction[];
  diagnostics: RungParseDiagnostic[];
}

/**
 * Type guard to check if a RungElement is a BranchGroup
 */
export function isBranchGroup(element: RungElement): element is BranchGroup {
  return (element as BranchGroup).type === 'branch';
}

/**
 * Input contact instructions
 */
export type ContactInstruction = 'XIC' | 'XIO';

/**
 * Output coil instructions
 */
export type CoilInstruction = 'OTE' | 'OTL' | 'OTU';

/**
 * Comparison instructions
 */
export type CompareInstruction = 'EQU' | 'NEQ' | 'GEQ' | 'LEQ' | 'GRT' | 'LES' | 'LIM';

/**
 * Math instructions
 */
export type MathInstruction = 'ADD' | 'SUB' | 'MUL' | 'DIV' | 'MOV' | 'CPT' | 'ATN' | 'XPY' | 'SQR';

/**
 * Timer instructions
 */
export type TimerInstruction = 'TON' | 'TOF' | 'RTO';

/**
 * Counter instructions
 */
export type CounterInstruction = 'CTU' | 'CTD' | 'RES';

/**
 * All known instruction mnemonics
 */
export type InstructionMnemonic =
  | ContactInstruction
  | CoilInstruction
  | CompareInstruction
  | MathInstruction
  | TimerInstruction
  | CounterInstruction;

import { globalInstructionRegistry, type InstructionRegistry } from './instruction-registry';

/**
 * Map instruction mnemonic to category.
 * Uses the supplied registry, or the global compatibility registry by default.
 */
export function getInstructionCategory(
  mnemonic: string,
  registry: InstructionRegistry = globalInstructionRegistry,
): Instruction['category'] {
  return registry.getCategory(mnemonic);
}

/**
 * Get the display name for an instruction mnemonic.
 * Uses the supplied registry, or the global compatibility registry by default.
 */
export function getInstructionDisplayName(
  mnemonic: string,
  registry: InstructionRegistry = globalInstructionRegistry,
): string {
  return registry.getDisplayName(mnemonic);
}

/**
 * Get the parameter labels for an instruction mnemonic.
 * Uses the supplied registry, or the global compatibility registry by default.
 */
export function getInstructionParameterLabels(
  mnemonic: string,
  registry: InstructionRegistry = globalInstructionRegistry,
): string[] {
  return registry.getParameterLabels(mnemonic);
}
