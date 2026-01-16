import type { Instruction, Rung, RungElement, BranchGroup } from '../../types';
import { isBranchGroup } from '../../types';
import {
  SYMBOL_WIDTH,
  SYMBOL_HEIGHT,
  calculateSymbolWidth,
  getContactSymbol,
  getCoilSymbol,
  calculateBoxDimensions,
  createBoxSymbol,
  createTimerSymbol,
  createCounterSymbol,
} from './symbols';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Rung number cell width (Studio 5000 style) */
export const RUNG_NUMBER_WIDTH = 30;

/** Power rail X offset from edge */
export const RAIL_WIDTH = 8;

/** Power rail visual width */
export const RAIL_VISUAL_WIDTH = 4;

/** Minimum rung height */
export const MIN_RUNG_HEIGHT = 80;

/** Spacing between instructions */
const INSTRUCTION_GAP = 0;

/** Label offset above contacts/coils */
const LABEL_OFFSET = 18;

/** Address label offset below contacts/coils */
const ADDRESS_LABEL_OFFSET = 12;

/** Vertical padding for rungs */
const RUNG_PADDING = 15;

/** Vertical spacing between wrapped lines in a multi-line rung */
const LINE_SPACING = 20;

/** Minimum gap between conditions and operations */
const MIN_CONDITION_OPERATION_GAP = 40;

/** Vertical spacing between parallel branch legs */
const BRANCH_VERTICAL_GAP = 5;

/** Horizontal padding at branch start/end for vertical connectors */
const BRANCH_CONNECTOR_OFFSET = 10;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format a tag name as a Studio 5000-style address
 * In Studio 5000, addresses appear as <Local:1:I.Data.0> format
 */
function formatTagAsAddress(tagName: string): string {
  // If it's already in address format, return as-is
  if (tagName.includes(':') || tagName.includes('.')) {
    return `<${tagName}>`;
  }
  // For simple tag names, just show as tag reference
  return '';
}

// ============================================================================
// INSTRUCTION CLASSIFICATION
// ============================================================================

/**
 * Conditions go LEFT: contacts (XIC, XIO) and compare instructions (EQU, GRT, etc.)
 */
function isCondition(instruction: Instruction): boolean {
  return instruction.category === 'input' || instruction.category === 'compare';
}

/**
 * Operations go RIGHT: coils, math, timers, counters
 */
function isOperation(instruction: Instruction): boolean {
  return (
    instruction.category === 'output' ||
    instruction.category === 'math' ||
    instruction.category === 'timer' ||
    instruction.category === 'counter' ||
    instruction.category === 'other'
  );
}

/**
 * Check if an element (or nested branches) contains any conditions
 */
function elementContainsCondition(element: RungElement): boolean {
  if (isBranchGroup(element)) {
    return element.branches.some(branch => 
      branch.some(el => elementContainsCondition(el))
    );
  }
  return isCondition(element);
}

/**
 * Check if an element (or nested branches) contains any operations
 */
function elementContainsOperation(element: RungElement): boolean {
  if (isBranchGroup(element)) {
    return element.branches.some(branch => 
      branch.some(el => elementContainsOperation(el))
    );
  }
  return isOperation(element);
}

// ============================================================================
// DIMENSION HELPERS
// ============================================================================

interface Dimensions {
  width: number;
  height: number;
  centerY: number;
}

/**
 * Get dimensions for an instruction based on its type
 */
function getDimensions(instruction: Instruction): Dimensions {
  switch (instruction.category) {
    case 'input':
    case 'output': {
      // Calculate width based on label length
      const label = instruction.operands[0] || '';
      const width = calculateSymbolWidth(label);
      return {
        width,
        height: SYMBOL_HEIGHT,
        centerY: SYMBOL_HEIGHT / 2,
      };
    }
    default:
      // Box instructions (compare, math, timer, counter, other)
      return calculateBoxDimensions(instruction.mnemonic, instruction.operands);
  }
}

/**
 * Get the SVG symbol for an instruction
 */
function getSymbol(instruction: Instruction): string {
  switch (instruction.category) {
    case 'input':
      return getContactSymbol(instruction.mnemonic);
    case 'output':
      return getCoilSymbol(instruction.mnemonic);
    case 'timer':
      return createTimerSymbol(instruction.mnemonic, instruction.operands);
    case 'counter':
      return createCounterSymbol(instruction.mnemonic, instruction.operands);
    default:
      return createBoxSymbol(instruction.mnemonic, instruction.operands);
  }
}

// ============================================================================
// RUNG CALCULATIONS
// ============================================================================

/**
 * Calculate total width of a set of instructions
 */
function calculateTotalWidth(instructions: Instruction[]): number {
  if (instructions.length === 0) return 0;

  let width = 0;
  for (const instr of instructions) {
    width += getDimensions(instr).width;
  }
  // Add gaps between instructions (n-1 gaps for n instructions)
  width += (instructions.length - 1) * INSTRUCTION_GAP;

  return width;
}

// ============================================================================
// ELEMENT DIMENSION CALCULATIONS (for branches)
// ============================================================================

interface ElementLayout {
  width: number;
  height: number;
  centerY: number;
}

/**
 * Calculate the layout dimensions for a RungElement (instruction or branch)
 */
function calculateElementLayout(element: RungElement): ElementLayout {
  if (isBranchGroup(element)) {
    return calculateBranchGroupLayout(element);
  }
  return getDimensions(element);
}

/**
 * Calculate the total layout dimensions for a branch group
 */
function calculateBranchGroupLayout(branch: BranchGroup): ElementLayout {
  if (branch.branches.length === 0) {
    return { width: 0, height: MIN_RUNG_HEIGHT, centerY: MIN_RUNG_HEIGHT / 2 };
  }

  // Calculate dimensions for each branch leg
  const legLayouts = branch.branches.map(leg => calculateLegLayout(leg));

  // Width is the maximum of all leg widths (plus connector space)
  const maxWidth = Math.max(...legLayouts.map(l => l.width));
  const totalWidth = maxWidth + 2 * BRANCH_CONNECTOR_OFFSET;

  // Total height is sum of all leg heights plus gaps between them
  let totalHeight = 0;
  for (let i = 0; i < legLayouts.length; i++) {
    totalHeight += legLayouts[i].height;
    if (i < legLayouts.length - 1) {
      totalHeight += BRANCH_VERTICAL_GAP;
    }
  }

  // Center Y is at the midpoint of the first leg (main path)
  const centerY = legLayouts[0].height / 2;

  return { width: totalWidth, height: totalHeight, centerY };
}

/**
 * Calculate the layout for a single branch leg (array of elements)
 */
function calculateLegLayout(elements: RungElement[]): ElementLayout {
  if (elements.length === 0) {
    return { width: 0, height: MIN_RUNG_HEIGHT, centerY: MIN_RUNG_HEIGHT / 2 };
  }

  let totalWidth = 0;
  let maxHeight = MIN_RUNG_HEIGHT;

  for (let i = 0; i < elements.length; i++) {
    const layout = calculateElementLayout(elements[i]);
    totalWidth += layout.width;
    maxHeight = Math.max(maxHeight, layout.height);
    
    if (i < elements.length - 1) {
      totalWidth += INSTRUCTION_GAP;
    }
  }

  return { width: totalWidth, height: maxHeight, centerY: maxHeight / 2 };
}

/**
 * Calculate total width of elements (instructions + branches)
 */
function calculateElementsWidth(elements: RungElement[]): number {
  if (elements.length === 0) return 0;

  let width = 0;
  for (const element of elements) {
    width += calculateElementLayout(element).width;
  }
  // Add gaps between elements (n-1 gaps for n elements)
  width += (elements.length - 1) * INSTRUCTION_GAP;

  return width;
}

// ============================================================================
// MULTI-LINE LAYOUT
// ============================================================================

/**
 * Represents a single line (row) within a potentially multi-line rung
 */
interface RungLine {
  instructions: Instruction[];
  width: number;
  height: number;
  isLastLine: boolean;
  hasOperations: boolean;
}

/**
 * Split instructions into multiple lines if they exceed the available width.
 * Conditions are placed first (can span multiple lines), then operations on the last line.
 */
function splitInstructionsIntoLines(
  instructions: Instruction[],
  availableWidth: number
): RungLine[] {
  const conditions = instructions.filter(isCondition);
  const operations = instructions.filter(isOperation);
  
  const operationsWidth = calculateTotalWidth(operations);
  const lines: RungLine[] = [];
  
  // Calculate available width for conditions on a line that also has operations
  const availableForConditionsWithOps = availableWidth - operationsWidth - MIN_CONDITION_OPERATION_GAP;
  
  // First, try to fit all conditions on lines, reserving space for operations on the last line
  let currentLine: Instruction[] = [];
  let currentLineWidth = 0;
  
  for (let i = 0; i < conditions.length; i++) {
    const instr = conditions[i];
    const dims = getDimensions(instr);
    const instrWidth = dims.width + (currentLine.length > 0 ? INSTRUCTION_GAP : 0);
    
    // Check if this is potentially the last condition
    const isLastCondition = i === conditions.length - 1;
    const remainingConditionsWidth = calculateTotalWidth(conditions.slice(i));
    
    // Determine max width for this line
    // If remaining conditions + operations fit, use that limit; otherwise, use full width
    let maxWidthForLine: number;
    if (isLastCondition || remainingConditionsWidth + operationsWidth + MIN_CONDITION_OPERATION_GAP <= availableWidth - currentLineWidth) {
      // This could be the last line with operations
      maxWidthForLine = availableForConditionsWithOps;
    } else {
      // Operations will be on a later line
      maxWidthForLine = availableWidth;
    }
    
    // Check if instruction fits on current line
    if (currentLine.length > 0 && currentLineWidth + instrWidth > maxWidthForLine) {
      // Start a new line
      if (currentLine.length > 0) {
        lines.push({
          instructions: currentLine,
          width: currentLineWidth,
          height: calculateLineHeight(currentLine),
          isLastLine: false,
          hasOperations: false,
        });
      }
      currentLine = [instr];
      currentLineWidth = dims.width;
    } else {
      currentLine.push(instr);
      currentLineWidth += instrWidth;
    }
  }
  
  // Add remaining conditions with operations on the last line
  if (currentLine.length > 0 || operations.length > 0) {
    const lastLineInstructions = [...currentLine, ...operations];
    const lastLineConditionsWidth = currentLineWidth;
    const totalLastLineWidth = lastLineConditionsWidth + (lastLineConditionsWidth > 0 && operationsWidth > 0 ? MIN_CONDITION_OPERATION_GAP : 0) + operationsWidth;
    
    // Check if everything fits on the last line
    if (totalLastLineWidth <= availableWidth) {
      lines.push({
        instructions: lastLineInstructions,
        width: totalLastLineWidth,
        height: calculateLineHeight(lastLineInstructions),
        isLastLine: true,
        hasOperations: operations.length > 0,
      });
    } else {
      // Need to put conditions on one line and operations on another
      if (currentLine.length > 0) {
        lines.push({
          instructions: currentLine,
          width: currentLineWidth,
          height: calculateLineHeight(currentLine),
          isLastLine: false,
          hasOperations: false,
        });
      }
      if (operations.length > 0) {
        lines.push({
          instructions: operations,
          width: operationsWidth,
          height: calculateLineHeight(operations),
          isLastLine: true,
          hasOperations: true,
        });
      }
    }
  }
  
  // Handle edge case: only operations, no conditions
  if (lines.length === 0 && operations.length > 0) {
    lines.push({
      instructions: operations,
      width: operationsWidth,
      height: calculateLineHeight(operations),
      isLastLine: true,
      hasOperations: true,
    });
  }
  
  // Mark the actual last line
  if (lines.length > 0) {
    for (let i = 0; i < lines.length; i++) {
      lines[i].isLastLine = i === lines.length - 1;
    }
  }
  
  return lines;
}

/**
 * Calculate height for a single line of instructions
 */
function calculateLineHeight(instructions: Instruction[]): number {
  let maxHeight = MIN_RUNG_HEIGHT;

  for (const instr of instructions) {
    const dims = getDimensions(instr);
    const labelSpace =
      instr.category === 'input' || instr.category === 'output' ? LABEL_OFFSET : 0;
    const totalHeight = dims.height + labelSpace + RUNG_PADDING * 2;
    maxHeight = Math.max(maxHeight, totalHeight);
  }

  return maxHeight;
}

/**
 * Calculate total height for a multi-line rung
 */
function calculateMultiLineRungHeight(lines: RungLine[]): number {
  if (lines.length === 0) return MIN_RUNG_HEIGHT;
  
  let totalHeight = 0;
  for (let i = 0; i < lines.length; i++) {
    totalHeight += lines[i].height;
    if (i < lines.length - 1) {
      totalHeight += LINE_SPACING;
    }
  }
  
  return totalHeight;
}

// ============================================================================
// ELEMENT-BASED MULTI-LINE LAYOUT (for rungs with branches)
// ============================================================================

/**
 * Represents a single line in a multi-line rung with elements (including branches)
 */
interface ElementLine {
  elements: RungElement[];
  width: number;
  height: number;
  wireOffsetFromTop: number;
  isLastLine: boolean;
  hasOperations: boolean;
}

/**
 * Calculate height and wire offset for a line of elements
 */
function calculateElementLineHeight(elements: RungElement[]): { height: number; wireOffsetFromTop: number } {
  if (elements.length === 0) {
    return { height: MIN_RUNG_HEIGHT, wireOffsetFromTop: MIN_RUNG_HEIGHT / 2 };
  }

  let maxHeight = MIN_RUNG_HEIGHT;
  let maxWireOffset = MIN_RUNG_HEIGHT / 2;

  for (const element of elements) {
    const layout = calculateElementLayout(element);
    const labelSpace = !isBranchGroup(element) && 
      (element.category === 'input' || element.category === 'output') ? LABEL_OFFSET : 0;
    
    const wireOffset = layout.centerY + labelSpace + RUNG_PADDING;
    const totalHeight = layout.height + labelSpace + RUNG_PADDING * 2;
    
    maxHeight = Math.max(maxHeight, totalHeight);
    maxWireOffset = Math.max(maxWireOffset, wireOffset);
  }

  return { height: maxHeight, wireOffsetFromTop: maxWireOffset };
}

/**
 * Split elements into multiple lines if they exceed the available width.
 * Conditions/branches are placed first, then operations on the last line.
 */
function splitElementsIntoLines(
  elements: RungElement[],
  availableWidth: number
): ElementLine[] {
  // Separate conditions/branches and operations
  const conditionElements: RungElement[] = [];
  const operationElements: RungElement[] = [];

  for (const element of elements) {
    if (isBranchGroup(element)) {
      if (elementContainsOperation(element) && !elementContainsCondition(element)) {
        operationElements.push(element);
      } else {
        conditionElements.push(element);
      }
    } else {
      if (isOperation(element)) {
        operationElements.push(element);
      } else {
        conditionElements.push(element);
      }
    }
  }

  const operationsWidth = calculateElementsWidth(operationElements);
  const lines: ElementLine[] = [];
  
  // Calculate available width for conditions on a line that also has operations
  const availableForConditionsWithOps = availableWidth - operationsWidth - MIN_CONDITION_OPERATION_GAP;
  
  let currentLine: RungElement[] = [];
  let currentLineWidth = 0;
  
  for (let i = 0; i < conditionElements.length; i++) {
    const element = conditionElements[i];
    const layout = calculateElementLayout(element);
    const elementWidth = layout.width + (currentLine.length > 0 ? INSTRUCTION_GAP : 0);
    
    // Check if this is potentially the last condition element
    const isLastCondition = i === conditionElements.length - 1;
    const remainingConditionsWidth = calculateElementsWidth(conditionElements.slice(i));
    
    // Determine max width for this line
    let maxWidthForLine: number;
    if (isLastCondition || remainingConditionsWidth + operationsWidth + MIN_CONDITION_OPERATION_GAP <= availableWidth - currentLineWidth) {
      maxWidthForLine = availableForConditionsWithOps;
    } else {
      maxWidthForLine = availableWidth;
    }
    
    // Check if element fits on current line
    if (currentLine.length > 0 && currentLineWidth + elementWidth > maxWidthForLine) {
      // Start a new line
      if (currentLine.length > 0) {
        const lineMetrics = calculateElementLineHeight(currentLine);
        lines.push({
          elements: currentLine,
          width: currentLineWidth,
          height: lineMetrics.height,
          wireOffsetFromTop: lineMetrics.wireOffsetFromTop,
          isLastLine: false,
          hasOperations: false,
        });
      }
      currentLine = [element];
      currentLineWidth = layout.width;
    } else {
      currentLine.push(element);
      currentLineWidth += elementWidth;
    }
  }
  
  // Add remaining conditions with operations on the last line
  if (currentLine.length > 0 || operationElements.length > 0) {
    const lastLineConditionsWidth = currentLineWidth;
    const totalLastLineWidth = lastLineConditionsWidth + 
      (lastLineConditionsWidth > 0 && operationsWidth > 0 ? MIN_CONDITION_OPERATION_GAP : 0) + 
      operationsWidth;
    
    if (totalLastLineWidth <= availableWidth) {
      // Everything fits on the last line
      const lastLineElements = [...currentLine, ...operationElements];
      const lineMetrics = calculateElementLineHeight(lastLineElements);
      lines.push({
        elements: lastLineElements,
        width: totalLastLineWidth,
        height: lineMetrics.height,
        wireOffsetFromTop: lineMetrics.wireOffsetFromTop,
        isLastLine: true,
        hasOperations: operationElements.length > 0,
      });
    } else {
      // Need to put conditions on one line and operations on another
      if (currentLine.length > 0) {
        const lineMetrics = calculateElementLineHeight(currentLine);
        lines.push({
          elements: currentLine,
          width: currentLineWidth,
          height: lineMetrics.height,
          wireOffsetFromTop: lineMetrics.wireOffsetFromTop,
          isLastLine: false,
          hasOperations: false,
        });
      }
      if (operationElements.length > 0) {
        const lineMetrics = calculateElementLineHeight(operationElements);
        lines.push({
          elements: operationElements,
          width: operationsWidth,
          height: lineMetrics.height,
          wireOffsetFromTop: lineMetrics.wireOffsetFromTop,
          isLastLine: true,
          hasOperations: true,
        });
      }
    }
  }
  
  // Handle edge case: only operations, no conditions
  if (lines.length === 0 && operationElements.length > 0) {
    const lineMetrics = calculateElementLineHeight(operationElements);
    lines.push({
      elements: operationElements,
      width: operationsWidth,
      height: lineMetrics.height,
      wireOffsetFromTop: lineMetrics.wireOffsetFromTop,
      isLastLine: true,
      hasOperations: true,
    });
  }
  
  // Mark the actual last line
  if (lines.length > 0) {
    for (let i = 0; i < lines.length; i++) {
      lines[i].isLastLine = i === lines.length - 1;
    }
  }
  
  return lines;
}

/**
 * Calculate total height for multi-line element rung
 */
function calculateMultiLineElementRungHeight(lines: ElementLine[]): number {
  if (lines.length === 0) return MIN_RUNG_HEIGHT;
  
  let totalHeight = 0;
  for (let i = 0; i < lines.length; i++) {
    totalHeight += lines[i].height;
    if (i < lines.length - 1) {
      totalHeight += LINE_SPACING;
    }
  }
  
  return totalHeight;
}

// ============================================================================
// RENDERING
// ============================================================================

/**
 * Render a single instruction at the given position
 * @param instruction - The instruction to render
 * @param x - X position (left edge of instruction)
 * @param wireY - Y position of the horizontal wire
 */
function renderInstruction(instruction: Instruction, x: number, wireY: number): string {
  const dims = getDimensions(instruction);
  const symbol = getSymbol(instruction);

  // Position instruction so its center aligns with the wire
  const instrY = wireY - dims.centerY;

  let svg = '';

  // For contacts/coils, the symbol is fixed at SYMBOL_WIDTH (60px)
  // but allocated space may be larger based on label - center the symbol
  const isContactOrCoil = instruction.category === 'input' || instruction.category === 'output';
  const symbolOffset = isContactOrCoil ? (dims.width - SYMBOL_WIDTH) / 2 : 0;
  const symbolX = x + symbolOffset;

  // Add label above for contacts and coils (centered over allocated width)
  if (isContactOrCoil) {
    const label = instruction.operands[0] || '';
    const labelX = x + dims.width / 2;
    const labelY = instrY - 5;
    
    // Tag name above (Studio 5000 style)
    svg += `<text x="${labelX}" y="${labelY}" text-anchor="middle" font-size="10" fill="#333" font-weight="500" class="instruction-label">${label}</text>`;
    
    // Address below (Studio 5000 style - shows as <address>)
    // For now, show a placeholder address format
    const addressY = instrY + dims.height + ADDRESS_LABEL_OFFSET;
    const displayAddress = formatTagAsAddress(label);
    svg += `<text x="${labelX}" y="${addressY}" text-anchor="middle" font-size="8" fill="#666" class="instruction-address">${displayAddress}</text>`;

    // Add connecting wires to fill the gap from centering
    if (symbolOffset > 0) {
      svg += `<line x1="${x}" y1="${wireY}" x2="${x + symbolOffset}" y2="${wireY}" stroke="currentColor" stroke-width="1"/>`;
      svg += `<line x1="${x + symbolOffset + SYMBOL_WIDTH}" y1="${wireY}" x2="${x + dims.width}" y2="${wireY}" stroke="currentColor" stroke-width="1"/>`;
    }
  }

  // Render the instruction symbol
  svg += `
    <g class="instruction instruction-${instruction.category}" data-mnemonic="${instruction.mnemonic}" transform="translate(${symbolX}, ${instrY})">
      ${symbol}
    </g>
  `;

  return svg;
}

/**
 * Render a branch group at the given position
 * @param branch - The branch group to render
 * @param x - X position (left edge of branch)
 * @param mainWireY - Y position of the main horizontal wire (first leg)
 * @returns Object with svg string and the X position after the branch
 */
function renderBranchGroup(branch: BranchGroup, x: number, mainWireY: number): { svg: string; endX: number } {
  if (branch.branches.length === 0) {
    return { svg: '', endX: x };
  }

  const legLayouts = branch.branches.map(leg => calculateLegLayout(leg));
  const maxWidth = Math.max(...legLayouts.map(l => l.width));
  
  let svg = '';
  
  // Calculate Y positions for each branch leg
  const legYPositions: number[] = [];
  let currentY = mainWireY;
  for (let i = 0; i < legLayouts.length; i++) {
    if (i === 0) {
      // First leg is at the main wire position
      legYPositions.push(mainWireY);
    } else {
      // Subsequent legs are below
      currentY += legLayouts[i - 1].height / 2 + BRANCH_VERTICAL_GAP + legLayouts[i].height / 2;
      legYPositions.push(currentY);
    }
  }

  const branchStartX = x;
  const branchEndX = x + maxWidth + 2 * BRANCH_CONNECTOR_OFFSET;
  const contentStartX = x + BRANCH_CONNECTOR_OFFSET;

  // Draw vertical connector at branch start (left side)
  if (branch.branches.length > 1) {
    const topY = legYPositions[0];
    const bottomY = legYPositions[legYPositions.length - 1];
    svg += `<line x1="${branchStartX}" y1="${topY}" x2="${branchStartX}" y2="${bottomY}" stroke="currentColor" stroke-width="1" class="branch-connector"/>`;
  }

  // Draw vertical connector at branch end (right side)
  if (branch.branches.length > 1) {
    const topY = legYPositions[0];
    const bottomY = legYPositions[legYPositions.length - 1];
    svg += `<line x1="${branchEndX}" y1="${topY}" x2="${branchEndX}" y2="${bottomY}" stroke="currentColor" stroke-width="1" class="branch-connector"/>`;
  }

  // Render each branch leg
  for (let i = 0; i < branch.branches.length; i++) {
    const leg = branch.branches[i];
    const legY = legYPositions[i];
    const legLayout = legLayouts[i];

    // Wire from branch start to content
    svg += `<line x1="${branchStartX}" y1="${legY}" x2="${contentStartX}" y2="${legY}" stroke="currentColor" stroke-width="1"/>`;

    // Render leg contents
    let legX = contentStartX;
    for (const element of leg) {
      if (isBranchGroup(element)) {
        const result = renderBranchGroup(element, legX, legY);
        svg += result.svg;
        legX = result.endX;
      } else {
        svg += renderInstruction(element, legX, legY);
        legX += calculateElementLayout(element).width + INSTRUCTION_GAP;
      }
    }

    // Wire from content end to branch end
    const contentEndX = contentStartX + legLayout.width;
    if (contentEndX < branchEndX) {
      svg += `<line x1="${contentEndX}" y1="${legY}" x2="${branchEndX}" y2="${legY}" stroke="currentColor" stroke-width="1"/>`;
    }
  }

  return { svg, endX: branchEndX };
}

/**
 * Render a single line of a rung
 */
function renderRungLine(
  line: RungLine,
  lineIndex: number,
  wireY: number,
  diagramWidth: number,
  prevWireY: number | null,
  nextWireY: number | null
): string {
  const leftRailX = RUNG_NUMBER_WIDTH + RAIL_WIDTH + RAIL_VISUAL_WIDTH;
  const rightRailX = diagramWidth - RAIL_WIDTH - RAIL_VISUAL_WIDTH;
  const conditionsStartX = leftRailX + INSTRUCTION_GAP;

  // Separate conditions and operations for this line
  const conditions = line.instructions.filter(isCondition);
  const operations = line.instructions.filter(isOperation);

  const conditionsWidth = calculateTotalWidth(conditions);
  const operationsWidth = calculateTotalWidth(operations);

  let svg = '';

  // Wire from left rail to start of conditions
  svg += `<line x1="${leftRailX}" y1="${wireY}" x2="${conditionsStartX}" y2="${wireY}" stroke="#333" stroke-width="1"/>`;

  // Render conditions (left-aligned)
  let currentX = conditionsStartX;
  for (const instr of conditions) {
    const dims = getDimensions(instr);
    svg += renderInstruction(instr, currentX, wireY);
    currentX += dims.width + INSTRUCTION_GAP;
  }

  const conditionsEndX = conditionsStartX + conditionsWidth + (conditions.length > 0 ? INSTRUCTION_GAP : 0);

  if (line.isLastLine && operations.length > 0) {
    // Last line: right-align operations
    const operationsEndX = rightRailX - INSTRUCTION_GAP;
    const operationsStartX = operationsEndX - operationsWidth;

    // Wire between conditions and operations
    if (operationsStartX > conditionsEndX) {
      svg += `<line x1="${conditionsEndX}" y1="${wireY}" x2="${operationsStartX}" y2="${wireY}" stroke="#333" stroke-width="1"/>`;
    }

    // Render operations (right-aligned)
    currentX = operationsStartX;
    for (const instr of operations) {
      const dims = getDimensions(instr);
      svg += renderInstruction(instr, currentX, wireY);
      currentX += dims.width + INSTRUCTION_GAP;
    }

    // Wire from operations to right rail
    const operationsFinalX = operationsStartX + operationsWidth + INSTRUCTION_GAP;
    svg += `<line x1="${operationsFinalX}" y1="${wireY}" x2="${rightRailX}" y2="${wireY}" stroke="#333" stroke-width="1"/>`;
  } else {
    // Not the last line: draw continuation
    // Draw wire from end of conditions to continuation point at right
    const continuationX = rightRailX - INSTRUCTION_GAP;
    svg += `<line x1="${conditionsEndX}" y1="${wireY}" x2="${continuationX}" y2="${wireY}" stroke="#333" stroke-width="1"/>`;

    // Draw vertical connector to next line
    if (nextWireY !== null) {
      svg += `<line x1="${continuationX}" y1="${wireY}" x2="${continuationX}" y2="${nextWireY}" stroke="#333" stroke-width="1"/>`;
    }
  }

  // For lines after the first, draw vertical connector from previous line
  if (lineIndex > 0 && prevWireY !== null) {
    // Connect from left side
    svg += `<line x1="${conditionsStartX}" y1="${prevWireY}" x2="${conditionsStartX}" y2="${wireY}" stroke="#333" stroke-width="1"/>`;
  }

  return svg;
}

/**
 * Render a single line of elements (including branches)
 */
function renderElementLine(
  line: ElementLine,
  lineIndex: number,
  wireY: number,
  diagramWidth: number,
  prevWireY: number | null,
  nextWireY: number | null
): string {
  const leftRailX = RUNG_NUMBER_WIDTH + RAIL_WIDTH + RAIL_VISUAL_WIDTH;
  const rightRailX = diagramWidth - RAIL_WIDTH - RAIL_VISUAL_WIDTH;
  const conditionsStartX = leftRailX + INSTRUCTION_GAP;

  // Separate conditions and operations for this line
  const conditionElements: RungElement[] = [];
  const operationElements: RungElement[] = [];

  for (const element of line.elements) {
    if (isBranchGroup(element)) {
      if (elementContainsOperation(element) && !elementContainsCondition(element)) {
        operationElements.push(element);
      } else {
        conditionElements.push(element);
      }
    } else {
      if (isOperation(element)) {
        operationElements.push(element);
      } else {
        conditionElements.push(element);
      }
    }
  }

  const conditionsWidth = calculateElementsWidth(conditionElements);
  const operationsWidth = calculateElementsWidth(operationElements);

  let svg = '';

  // Wire from left rail to start of conditions
  svg += `<line x1="${leftRailX}" y1="${wireY}" x2="${conditionsStartX}" y2="${wireY}" stroke="#333" stroke-width="1"/>`;

  // Render conditions (left-aligned)
  let currentX = conditionsStartX;
  for (const element of conditionElements) {
    if (isBranchGroup(element)) {
      const result = renderBranchGroup(element, currentX, wireY);
      svg += result.svg;
      currentX = result.endX + INSTRUCTION_GAP;
    } else {
      svg += renderInstruction(element, currentX, wireY);
      currentX += calculateElementLayout(element).width + INSTRUCTION_GAP;
    }
  }

  const conditionsEndX = conditionsStartX + conditionsWidth + (conditionElements.length > 0 ? INSTRUCTION_GAP : 0);

  if (line.isLastLine && operationElements.length > 0) {
    // Last line: right-align operations
    const operationsEndX = rightRailX - INSTRUCTION_GAP;
    const operationsStartX = operationsEndX - operationsWidth;

    // Wire between conditions and operations
    if (operationsStartX > conditionsEndX) {
      svg += `<line x1="${conditionsEndX}" y1="${wireY}" x2="${operationsStartX}" y2="${wireY}" stroke="#333" stroke-width="1"/>`;
    }

    // Render operations (right-aligned)
    currentX = operationsStartX;
    for (const element of operationElements) {
      if (isBranchGroup(element)) {
        const result = renderBranchGroup(element, currentX, wireY);
        svg += result.svg;
        currentX = result.endX + INSTRUCTION_GAP;
      } else {
        svg += renderInstruction(element, currentX, wireY);
        currentX += calculateElementLayout(element).width + INSTRUCTION_GAP;
      }
    }

    // Wire from operations to right rail
    svg += `<line x1="${currentX}" y1="${wireY}" x2="${rightRailX}" y2="${wireY}" stroke="#333" stroke-width="1"/>`;
  } else {
    // Not the last line: draw continuation
    const continuationX = rightRailX - INSTRUCTION_GAP;
    svg += `<line x1="${conditionsEndX}" y1="${wireY}" x2="${continuationX}" y2="${wireY}" stroke="#333" stroke-width="1"/>`;

    // Draw vertical connector to next line
    if (nextWireY !== null) {
      svg += `<line x1="${continuationX}" y1="${wireY}" x2="${continuationX}" y2="${nextWireY}" stroke="#333" stroke-width="1"/>`;
    }
  }

  // For lines after the first, draw vertical connector from previous line
  if (lineIndex > 0 && prevWireY !== null) {
    svg += `<line x1="${conditionsStartX}" y1="${prevWireY}" x2="${conditionsStartX}" y2="${wireY}" stroke="#333" stroke-width="1"/>`;
  }

  return svg;
}

/**
 * Render a single rung (potentially multi-line)
 * - Conditions (contacts, compares) are left-aligned
 * - Operations (coils, math, timers, counters) are right-aligned on the last line
 * - If instructions exceed available width, wrap to multiple lines
 * - Supports branch groups with parallel paths
 */
export function renderRung(
  rung: Rung,
  rungIndex: number,
  yOffset: number,
  diagramWidth: number
): string {
  // Use elements if available, otherwise fall back to instructions
  const elements = rung.elements && rung.elements.length > 0 ? rung.elements : 
    rung.instructions.map(i => i as RungElement);

  // Check if this rung has any branches
  const hasBranches = elements.some(el => isBranchGroup(el));

  if (!hasBranches) {
    // Use the original rendering logic for non-branched rungs
    return renderRungLegacy(rung, rungIndex, yOffset, diagramWidth);
  }

  // Use multi-line layout for branched rungs
  const availableWidth = diagramWidth - RUNG_NUMBER_WIDTH - 2 * RAIL_WIDTH - 2 * INSTRUCTION_GAP;
  const lines = splitElementsIntoLines(elements, availableWidth);

  // Handle empty rung
  if (lines.length === 0) {
    const wireY = yOffset + MIN_RUNG_HEIGHT / 2;
    const leftRailX = RUNG_NUMBER_WIDTH + RAIL_WIDTH + RAIL_VISUAL_WIDTH;
    const rightRailX = diagramWidth - RAIL_WIDTH - RAIL_VISUAL_WIDTH;
    let svg = '';
    svg += `<line x1="${leftRailX}" y1="${wireY}" x2="${rightRailX}" y2="${wireY}" stroke="#333" stroke-width="1"/>`;
    return svg;
  }

  // Calculate wire Y positions for each line
  const wireYPositions: number[] = [];
  let currentY = yOffset;
  for (const line of lines) {
    wireYPositions.push(currentY + line.wireOffsetFromTop);
    currentY += line.height + LINE_SPACING;
  }

  let svg = '';

  // Render each line (rung number is now rendered separately in renderLadderDiagram)
  for (let i = 0; i < lines.length; i++) {
    const prevWireY = i > 0 ? wireYPositions[i - 1] : null;
    const nextWireY = i < lines.length - 1 ? wireYPositions[i + 1] : null;

    svg += renderElementLine(
      lines[i],
      i,
      wireYPositions[i],
      diagramWidth,
      prevWireY,
      nextWireY
    );
  }

  return svg;
}

/**
 * Legacy rendering for rungs without branches (backward compatibility)
 */
function renderRungLegacy(
  rung: Rung,
  _rungIndex: number,
  yOffset: number,
  diagramWidth: number
): string {
  const availableWidth = diagramWidth - RUNG_NUMBER_WIDTH - 2 * RAIL_WIDTH - 2 * INSTRUCTION_GAP;
  const lines = splitInstructionsIntoLines(rung.instructions, availableWidth);

  // Handle empty rung
  if (lines.length === 0) {
    const wireY = yOffset + MIN_RUNG_HEIGHT / 2;
    const leftRailX = RUNG_NUMBER_WIDTH + RAIL_WIDTH + RAIL_VISUAL_WIDTH;
    const rightRailX = diagramWidth - RAIL_WIDTH - RAIL_VISUAL_WIDTH;
    let svg = '';
    svg += `<line x1="${leftRailX}" y1="${wireY}" x2="${rightRailX}" y2="${wireY}" stroke="#333" stroke-width="1"/>`;
    return svg;
  }

  // Calculate wire Y positions for each line
  const wireYPositions: number[] = [];
  let currentY = yOffset;
  for (const line of lines) {
    wireYPositions.push(currentY + line.height / 2);
    currentY += line.height + LINE_SPACING;
  }

  let svg = '';

  // Render each line (rung number is now rendered separately in renderLadderDiagram)
  for (let i = 0; i < lines.length; i++) {
    const prevWireY = i > 0 ? wireYPositions[i - 1] : null;
    const nextWireY = i < lines.length - 1 ? wireYPositions[i + 1] : null;

    svg += renderRungLine(
      lines[i],
      i,
      wireYPositions[i],
      diagramWidth,
      prevWireY,
      nextWireY
    );
  }

  return svg;
}

// ============================================================================
// MAIN RENDER FUNCTION
// ============================================================================

/**
 * Calculate total height and offsets for all rungs, accounting for multi-line rungs and branches
 */
function calculateLayout(
  rungs: Rung[],
  diagramWidth: number
): { totalHeight: number; rungOffsets: number[]; rungHeights: number[] } {
  const availableWidth = diagramWidth - RUNG_NUMBER_WIDTH - 2 * RAIL_WIDTH - 2 * INSTRUCTION_GAP;
  let totalHeight = 0;
  const rungOffsets: number[] = [];
  const rungHeights: number[] = [];

  for (const rung of rungs) {
    rungOffsets.push(totalHeight);
    
    // Check if rung has branches
    const elements = rung.elements && rung.elements.length > 0 ? rung.elements : 
      rung.instructions.map(i => i as RungElement);
    const hasBranches = elements.some(el => isBranchGroup(el));
    
    let rungHeight: number;
    if (hasBranches) {
      // Use element-based multi-line layout for branched rungs
      const elementLines = splitElementsIntoLines(elements, availableWidth);
      rungHeight = elementLines.length > 0 ? calculateMultiLineElementRungHeight(elementLines) : MIN_RUNG_HEIGHT;
    } else {
      const lines = splitInstructionsIntoLines(rung.instructions, availableWidth);
      rungHeight = lines.length > 0 ? calculateMultiLineRungHeight(lines) : MIN_RUNG_HEIGHT;
    }
    
    rungHeights.push(rungHeight);
    totalHeight += rungHeight;
  }

  return { totalHeight, rungOffsets, rungHeights };
}

/**
 * Render Studio 5000-style rung number cell
 */
function renderRungNumberCell(
  rungIndex: number,
  yOffset: number,
  rungHeight: number,
  isSelected: boolean = false
): string {
  const bgColor = isSelected ? '#3366cc' : (rungIndex % 2 === 0 ? '#f0f0f0' : '#e8e8e8');
  const textColor = isSelected ? '#ffffff' : '#333333';
  
  let svg = '';
  
  // Rung number cell background
  svg += `<rect x="0" y="${yOffset}" width="${RUNG_NUMBER_WIDTH}" height="${rungHeight}" fill="${bgColor}" class="rung-number-cell"/>`;
  
  // Border
  svg += `<line x1="${RUNG_NUMBER_WIDTH}" y1="${yOffset}" x2="${RUNG_NUMBER_WIDTH}" y2="${yOffset + rungHeight}" stroke="#c0c0c0" stroke-width="1"/>`;
  svg += `<line x1="0" y1="${yOffset + rungHeight}" x2="${RUNG_NUMBER_WIDTH}" y2="${yOffset + rungHeight}" stroke="#c0c0c0" stroke-width="1"/>`;
  
  // Rung number text (centered in cell)
  const textY = yOffset + rungHeight / 2 + 4;
  svg += `<text x="${RUNG_NUMBER_WIDTH / 2}" y="${textY}" text-anchor="middle" font-size="11" font-weight="500" fill="${textColor}" class="rung-number">${rungIndex}</text>`;
  
  return svg;
}

/**
 * Render Studio 5000-style power rails
 */
function renderPowerRails(
  width: number,
  totalHeight: number
): string {
  let svg = '';
  
  // Left power rail (solid blue bar - Studio 5000 style)
  const leftRailX = RUNG_NUMBER_WIDTH;
  svg += `<rect x="${leftRailX}" y="0" width="${RAIL_VISUAL_WIDTH}" height="${totalHeight}" fill="#3366cc" class="power-rail left-rail"/>`;
  
  // Right power rail (solid blue bar - Studio 5000 style)
  const rightRailX = width - RAIL_VISUAL_WIDTH;
  svg += `<rect x="${rightRailX}" y="0" width="${RAIL_VISUAL_WIDTH}" height="${totalHeight}" fill="#3366cc" class="power-rail right-rail"/>`;
  
  return svg;
}

/**
 * Render complete ladder diagram SVG with Studio 5000 styling
 */
export function renderLadderDiagram(rungs: Rung[], options: { width?: number } = {}): string {
  const width = options.width || 800;
  const { totalHeight, rungOffsets, rungHeights } = calculateLayout(rungs, width);
  
  // Ensure minimum height
  const finalHeight = Math.max(totalHeight, MIN_RUNG_HEIGHT);

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${finalHeight}" viewBox="0 0 ${width} ${finalHeight}" class="ladder-diagram" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">`;
  
  // Definitions for gradients and filters
  svg += `
    <defs>
      <linearGradient id="railGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:#2255aa"/>
        <stop offset="50%" style="stop-color:#3366cc"/>
        <stop offset="100%" style="stop-color:#2255aa"/>
      </linearGradient>
      <filter id="energizedGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
  `;

  // Background
  svg += `<rect width="${width}" height="${finalHeight}" fill="#ffffff"/>`;
  
  // Render rung number cells and backgrounds
  for (let i = 0; i < rungs.length; i++) {
    const rungHeight = rungHeights[i] || MIN_RUNG_HEIGHT;
    
    // Alternating row background
    const rowBg = i % 2 === 0 ? '#ffffff' : '#fafafa';
    svg += `<rect x="${RUNG_NUMBER_WIDTH}" y="${rungOffsets[i]}" width="${width - RUNG_NUMBER_WIDTH}" height="${rungHeight}" fill="${rowBg}" class="rung-background"/>`;
    
    // Rung number cell
    svg += renderRungNumberCell(i, rungOffsets[i], rungHeight);
  }

  // Power rails
  svg += renderPowerRails(width, finalHeight);

  // Render each rung
  for (let i = 0; i < rungs.length; i++) {
    svg += renderRung(rungs[i], i, rungOffsets[i], width);
  }

  svg += '</svg>';
  return svg;
}
