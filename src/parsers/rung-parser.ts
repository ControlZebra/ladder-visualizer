import type { Instruction, RungElement, BranchGroup } from '../types';
import { getInstructionCategory } from '../types';

/**
 * Parse a single instruction match into an Instruction object.
 *
 * @param mnemonic - The instruction mnemonic (e.g., "XIC", "OTE", "GEQ")
 * @param operandsStr - The comma-separated operands string
 * @returns Parsed Instruction object
 */
function parseInstruction(mnemonic: string, operandsStr: string): Instruction {
  // Split operands by comma, handling nested expressions if needed
  const operands = operandsStr
    .split(',')
    .map((op) => op.trim())
    .filter((op) => op.length > 0);

  return {
    mnemonic,
    operands,
    category: getInstructionCategory(mnemonic),
  };
}

/**
 * Find the matching closing parenthesis, accounting for nesting.
 */
function findMatchingParen(str: string, startIndex: number): number {
  let depth = 1;
  for (let i = startIndex; i < str.length; i++) {
    if (str[i] === '(') depth++;
    if (str[i] === ')') depth--;
    if (depth === 0) return i;
  }
  return -1;
}

/**
 * Find the matching closing bracket, accounting for nesting.
 */
function findMatchingBracket(str: string, startIndex: number): number {
  let depth = 1;
  for (let i = startIndex; i < str.length; i++) {
    if (str[i] === '[') depth++;
    if (str[i] === ']') depth--;
    if (depth === 0) return i;
  }
  return -1;
}

/**
 * Split a branch content string by comma at the top level (not inside nested brackets/parens).
 * For example: "XIC(A),[XIC(B),XIC(C)]" -> ["XIC(A)", "[XIC(B),XIC(C)]"]
 */
function splitBranchLegs(content: string): string[] {
  const legs: string[] = [];
  let depth = 0;
  let currentLeg = '';
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '[' || char === '(') {
      depth++;
      currentLeg += char;
    } else if (char === ']' || char === ')') {
      depth--;
      currentLeg += char;
    } else if (char === ',' && depth === 0) {
      if (currentLeg.trim()) {
        legs.push(currentLeg.trim());
      }
      currentLeg = '';
    } else {
      currentLeg += char;
    }
  }
  
  if (currentLeg.trim()) {
    legs.push(currentLeg.trim());
  }
  
  return legs;
}

/**
 * Parse rung elements from a string, supporting branches.
 * This handles both simple instructions and nested branch structures.
 */
function parseRungElements(rungString: string): RungElement[] {
  const elements: RungElement[] = [];
  let i = 0;
  
  while (i < rungString.length) {
    // Skip whitespace
    while (i < rungString.length && /\s/.test(rungString[i])) {
      i++;
    }
    
    if (i >= rungString.length) break;
    
    // Check for branch start
    if (rungString[i] === '[') {
      const closeIndex = findMatchingBracket(rungString, i + 1);
      if (closeIndex === -1) {
        // Malformed branch, skip to end
        break;
      }
      
      const branchContent = rungString.substring(i + 1, closeIndex);
      const legs = splitBranchLegs(branchContent);
      
      const branchGroup: BranchGroup = {
        type: 'branch',
        branches: legs.map(leg => parseRungElements(leg)),
      };
      
      elements.push(branchGroup);
      i = closeIndex + 1;
    }
    // Check for instruction (starts with letter)
    else if (/[A-Z_]/i.test(rungString[i])) {
      // Find the mnemonic
      let mnemonicEnd = i;
      while (mnemonicEnd < rungString.length && /[A-Z0-9_]/i.test(rungString[mnemonicEnd])) {
        mnemonicEnd++;
      }
      
      const mnemonic = rungString.substring(i, mnemonicEnd);
      
      // Check for opening paren
      if (mnemonicEnd < rungString.length && rungString[mnemonicEnd] === '(') {
        const closeParenIndex = findMatchingParen(rungString, mnemonicEnd + 1);
        if (closeParenIndex === -1) {
          // Malformed instruction, skip
          i = mnemonicEnd;
          continue;
        }
        
        const operandsStr = rungString.substring(mnemonicEnd + 1, closeParenIndex);
        elements.push(parseInstruction(mnemonic, operandsStr));
        i = closeParenIndex + 1;
      } else {
        // Mnemonic without parens (shouldn't happen in valid ladder logic)
        i = mnemonicEnd;
      }
    }
    // Skip other characters
    else {
      i++;
    }
  }
  
  return elements;
}

/**
 * Flatten RungElements to just Instructions (for backward compatibility).
 * This loses branch structure information.
 */
function flattenElements(elements: RungElement[]): Instruction[] {
  const instructions: Instruction[] = [];
  
  for (const element of elements) {
    if ('type' in element && element.type === 'branch') {
      // Recursively flatten all branches
      for (const branch of element.branches) {
        instructions.push(...flattenElements(branch));
      }
    } else {
      instructions.push(element as Instruction);
    }
  }
  
  return instructions;
}

/**
 * Parse a raw rung string into an array of Instructions.
 *
 * @param rungString - Raw rung string from the PLC export
 *                     Example: "GEQ(WBGT_Fahreheit,87)XIC(Tag)OTE(Output);"
 * @returns Array of parsed Instructions in execution order
 */
export function parseRung(rungString: string): Instruction[] {
  // Remove trailing semicolon if present
  const cleanedRung = rungString.replace(/;$/, '');
  const elements = parseRungElements(cleanedRung);
  return flattenElements(elements);
}

/**
 * Parse a raw rung string into RungElements (preserving branch structure).
 *
 * @param rungString - Raw rung string from the PLC export
 *                     Example: "[XIC(A),[XIC(B),XIC(C)]]GEQ(X,Y)OTE(Output);"
 * @returns Array of RungElements preserving branch structure
 */
export function parseRungWithBranches(rungString: string): RungElement[] {
  // Remove trailing semicolon if present
  const cleanedRung = rungString.replace(/;$/, '');
  return parseRungElements(cleanedRung);
}

/**
 * Parse multiple rung strings into an array of Instruction arrays.
 *
 * @param rungs - Array of raw rung strings
 * @returns Array of parsed Instruction arrays
 */
export function parseRungs(rungs: string[]): Instruction[][] {
  return rungs.map(parseRung);
}
