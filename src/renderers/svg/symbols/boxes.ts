/**
 * SVG symbol definitions for boxed instructions (timers, counters, math, compare)
 */

import { globalInstructionRegistry } from '../../../types/instruction-registry';

const LINE_HEIGHT = 16;
const CHAR_WIDTH = 7; // Approximate character width for monospace-like fonts
const PADDING = 10;
const CONNECTOR_LENGTH = 10;

/**
 * Get full instruction name from registry
 */
function getInstructionName(mnemonic: string): string {
  return globalInstructionRegistry.getDisplayName(mnemonic);
}

/**
 * Get parameter labels for an instruction from registry
 */
function getParamLabels(mnemonic: string): string[] {
  return globalInstructionRegistry.getParameterLabels(mnemonic);
}

/**
 * Calculate the width needed to display text
 */
function getTextWidth(text: string): number {
  return text.length * CHAR_WIDTH;
}

export interface BoxDimensions {
  width: number;
  height: number;
  centerY: number;
}

/**
 * Calculate box dimensions based on instruction content
 */
export function calculateBoxDimensions(mnemonic: string, operands: string[]): BoxDimensions {
  const instructionName = getInstructionName(mnemonic);
  const paramLabels = getParamLabels(mnemonic);
  
  // Calculate required width based on longest content
  let maxContentWidth = getTextWidth(instructionName); // Title
  maxContentWidth = Math.max(maxContentWidth, getTextWidth(mnemonic) + 20); // Mnemonic with some padding
  
  // Check each parameter line: "Label    Value"
  operands.forEach((op, i) => {
    const label = paramLabels[i] || `Param ${i + 1}`;
    const lineWidth = getTextWidth(label) + 20 + getTextWidth(op); // label + gap + value
    maxContentWidth = Math.max(maxContentWidth, lineWidth);
  });
  
  const boxWidth = Math.max(120, maxContentWidth + PADDING * 2);
  
  // Calculate height: title + mnemonic + separator + parameters
  const headerHeight = LINE_HEIGHT * 2 + 8; // Title + mnemonic + some padding
  const contentHeight = Math.max(1, operands.length) * LINE_HEIGHT + PADDING;
  const boxHeight = headerHeight + contentHeight;
  
  return {
    width: boxWidth + CONNECTOR_LENGTH * 2, // Include connectors
    height: boxHeight,
    centerY: boxHeight / 2,
  };
}

/**
 * Generate a boxed instruction SVG matching the reference style
 * - Full instruction name at top
 * - Mnemonic below the name
 * - Separator line
 * - Parameter labels with values
 */
export function createBoxSymbol(mnemonic: string, operands: string[] = []): string {
  const instructionName = getInstructionName(mnemonic);
  const paramLabels = getParamLabels(mnemonic);
  const dims = calculateBoxDimensions(mnemonic, operands);
  
  const boxWidth = dims.width - CONNECTOR_LENGTH * 2;
  const boxHeight = dims.height;
  const centerY = dims.centerY;
  
  // Build parameter lines with labels and values
  let paramLines = '';
  const paramStartY = LINE_HEIGHT * 2 + 16; // After title, mnemonic, and separator
  
  operands.forEach((op, index) => {
    const label = paramLabels[index] || `Param ${index + 1}`;
    const y = paramStartY + index * LINE_HEIGHT;
    // Label on left
    paramLines += `<text x="${CONNECTOR_LENGTH + 8}" y="${y}" font-size="11" fill="currentColor">${label}</text>`;
    // Value on right
    paramLines += `<text x="${CONNECTOR_LENGTH + boxWidth - 8}" y="${y}" text-anchor="end" font-size="11" fill="currentColor">${op}</text>`;
  });

  const separatorY = LINE_HEIGHT * 2 + 4;

  return `
    <g>
      <line x1="0" y1="${centerY}" x2="${CONNECTOR_LENGTH}" y2="${centerY}" stroke="currentColor" stroke-width="1"/>
      <rect x="${CONNECTOR_LENGTH}" y="0" width="${boxWidth}" height="${boxHeight}" fill="none" stroke="currentColor" stroke-width="1"/>
      <text x="${CONNECTOR_LENGTH + boxWidth / 2}" y="${LINE_HEIGHT}" text-anchor="middle" font-size="11" fill="currentColor">${instructionName}</text>
      <text x="${CONNECTOR_LENGTH + boxWidth / 2}" y="${LINE_HEIGHT * 2}" text-anchor="middle" font-size="12" font-weight="bold" fill="currentColor">${mnemonic}</text>
      <line x1="${CONNECTOR_LENGTH + 2}" y1="${separatorY}" x2="${CONNECTOR_LENGTH + boxWidth - 2}" y2="${separatorY}" stroke="currentColor" stroke-width="1"/>
      ${paramLines}
      <line x1="${CONNECTOR_LENGTH + boxWidth}" y1="${centerY}" x2="${dims.width}" y2="${centerY}" stroke="currentColor" stroke-width="1"/>
    </g>
  `;
}

// Legacy exports for compatibility
export const BOX_WIDTH = 140;
export const BOX_HEIGHT = 80;

/**
 * Timer instructions (TON, TOF, RTO)
 */
export function createTimerSymbol(mnemonic: string, operands: string[] = []): string {
  return createBoxSymbol(mnemonic, operands);
}

/**
 * Counter instructions (CTU, CTD)
 */
export function createCounterSymbol(mnemonic: string, operands: string[] = []): string {
  return createBoxSymbol(mnemonic, operands);
}

/**
 * Math instructions (ADD, SUB, MUL, DIV, CPT, etc.)
 */
export function createMathSymbol(mnemonic: string, operands: string[] = []): string {
  return createBoxSymbol(mnemonic, operands);
}

/**
 * Compare instructions (EQU, NEQ, GEQ, etc.)
 */
export function createCompareSymbol(mnemonic: string, operands: string[] = []): string {
  return createBoxSymbol(mnemonic, operands);
}
