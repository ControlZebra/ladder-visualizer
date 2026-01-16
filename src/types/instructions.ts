/**
 * Parsed instruction from a ladder logic rung
 */
export interface Instruction {
  /** Instruction mnemonic (XIC, OTE, GEQ, CPT, etc.) */
  mnemonic: string;
  /** Raw operand strings */
  operands: string[];
  /** Category for styling/rendering */
  category: 'input' | 'output' | 'compare' | 'math' | 'timer' | 'counter' | 'other';
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
}

/**
 * A rung element can be either an instruction or a branch group
 */
export type RungElement = Instruction | BranchGroup;

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

import { globalInstructionRegistry } from './instruction-registry';

/**
 * Map instruction mnemonic to category.
 * Uses the global instruction registry for extensible lookups.
 */
export function getInstructionCategory(
  mnemonic: string
): Instruction['category'] {
  return globalInstructionRegistry.getCategory(mnemonic);
}

/**
 * Get the display name for an instruction mnemonic.
 * Uses the global instruction registry.
 */
export function getInstructionDisplayName(mnemonic: string): string {
  return globalInstructionRegistry.getDisplayName(mnemonic);
}

/**
 * Get the parameter labels for an instruction mnemonic.
 * Uses the global instruction registry.
 */
export function getInstructionParameterLabels(mnemonic: string): string[] {
  return globalInstructionRegistry.getParameterLabels(mnemonic);
}
