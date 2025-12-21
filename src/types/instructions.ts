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

/**
 * Map instruction mnemonic to category
 */
export function getInstructionCategory(
  mnemonic: string
): Instruction['category'] {
  const contacts: string[] = ['XIC', 'XIO'];
  const coils: string[] = ['OTE', 'OTL', 'OTU'];
  const compares: string[] = ['EQU', 'NEQ', 'GEQ', 'LEQ', 'GRT', 'LES', 'LIM'];
  const math: string[] = ['ADD', 'SUB', 'MUL', 'DIV', 'MOV', 'CPT', 'ATN', 'XPY', 'SQR'];
  const timers: string[] = ['TON', 'TOF', 'RTO'];
  const counters: string[] = ['CTU', 'CTD', 'RES'];

  if (contacts.includes(mnemonic)) return 'input';
  if (coils.includes(mnemonic)) return 'output';
  if (compares.includes(mnemonic)) return 'compare';
  if (math.includes(mnemonic)) return 'math';
  if (timers.includes(mnemonic)) return 'timer';
  if (counters.includes(mnemonic)) return 'counter';
  return 'other';
}
