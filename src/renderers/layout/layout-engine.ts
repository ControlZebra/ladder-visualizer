/**
 * Layout Engine
 * 
 * Responsible for calculating positions and dimensions for ladder diagrams.
 * This separates layout concerns from rendering, enabling:
 * - Multiple render targets (SVG, Canvas, PDF)
 * - Layout caching and memoization
 * - Easier testing of layout logic
 */

import type { Rung, RungElement, Instruction, BranchGroup } from '../../types';
import { isBranchGroup } from '../../types';
import type {
  DiagramLayout,
  RungLayout,
  LineLayout,
  RungElementLayout,
  InstructionLayout,
  BranchGroupLayout,
  BranchLegLayout,
  ElementDimensions,
  PowerRailLayout,
  LayoutOptions,
  ResolvedLayoutOptions,
} from './types';
import {
  SYMBOL_WIDTH,
  SYMBOL_HEIGHT,
  calculateSymbolWidth,
  calculateBoxDimensions,
} from '../svg/symbols';

// ============================================================================
// DEFAULT LAYOUT CONSTANTS
// ============================================================================

const DEFAULT_OPTIONS: ResolvedLayoutOptions = {
  width: 800,
  minRungHeight: 80,
  instructionGap: 0,
  minConditionOperationGap: 40,
  lineSpacing: 20,
  branchVerticalGap: 5,
  rungNumberWidth: 30,
  railWidth: 8,
  railVisualWidth: 4,
  labelOffset: 18,
  addressLabelOffset: 12,
  rungPadding: 15,
  branchConnectorOffset: 10,
};

// ============================================================================
// LAYOUT ENGINE CLASS
// ============================================================================

/**
 * Layout engine that calculates positions and dimensions for ladder diagrams.
 * Instances are stateless and can be reused.
 */
export class LayoutEngine {
  private readonly options: ResolvedLayoutOptions;

  constructor(options: LayoutOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Calculate the complete layout for a ladder diagram
   */
  calculateDiagramLayout(rungs: Rung[]): DiagramLayout {
    const { width, rungNumberWidth, railWidth, railVisualWidth } = this.options;
    
    const contentWidth = width - rungNumberWidth - 2 * railWidth - 2 * this.options.instructionGap;
    const rungLayouts: RungLayout[] = [];
    let currentY = 0;

    for (let i = 0; i < rungs.length; i++) {
      const rungLayout = this.calculateRungLayout(rungs[i], i, currentY, contentWidth);
      rungLayouts.push(rungLayout);
      currentY += rungLayout.height;
    }

    const totalHeight = Math.max(currentY, this.options.minRungHeight);

    const powerRails: PowerRailLayout = {
      leftX: rungNumberWidth,
      rightX: width - railVisualWidth,
      width: railVisualWidth,
      height: totalHeight,
    };

    return {
      width,
      height: totalHeight,
      rungs: rungLayouts,
      powerRails,
      rungNumberWidth,
      contentWidth,
    };
  }

  /**
   * Calculate the layout for a single rung
   */
  private calculateRungLayout(
    rung: Rung,
    rungIndex: number,
    yOffset: number,
    availableWidth: number
  ): RungLayout {
    // Use elements if available, otherwise convert instructions to elements
    const elements = rung.elements && rung.elements.length > 0 
      ? rung.elements 
      : rung.instructions.map(i => i as RungElement);

    const hasBranches = elements.some(el => isBranchGroup(el));
    const lines = this.splitElementsIntoLines(elements, availableWidth);
    const rungHeight = this.calculateMultiLineHeight(lines);

    // Calculate line layouts with absolute positions
    const lineLayouts = this.calculateLineLayouts(lines, yOffset, availableWidth);

    return {
      rungIndex,
      yOffset,
      height: rungHeight,
      lines: lineLayouts,
      hasBranches,
    };
  }

  /**
   * Calculate layouts for all lines in a rung
   */
  private calculateLineLayouts(
    lines: InternalLineLayout[],
    rungYOffset: number,
    _availableWidth: number
  ): LineLayout[] {
    const { rungNumberWidth, railWidth, railVisualWidth, instructionGap } = this.options;
    const leftRailX = rungNumberWidth + railWidth + railVisualWidth;
    const rightRailX = this.options.width - railWidth - railVisualWidth;
    const conditionsStartX = leftRailX + instructionGap;

    const layouts: LineLayout[] = [];
    let currentY = rungYOffset;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const wireY = currentY + line.wireOffsetFromTop;

      // Calculate element layouts
      const conditionLayouts = this.calculateConditionLayouts(
        line.conditionElements,
        conditionsStartX,
        wireY
      );

      const conditionsEndX = conditionsStartX + line.conditionsWidth + 
        (line.conditionElements.length > 0 ? instructionGap : 0);

      // Calculate operation layouts (right-aligned on last line)
      let operationsStartX = conditionsEndX;
      const operationLayouts: RungElementLayout[] = [];

      if (line.isLastLine && line.operationElements.length > 0) {
        const operationsEndX = rightRailX - instructionGap;
        operationsStartX = operationsEndX - line.operationsWidth;

        let opX = operationsStartX;
        for (const element of line.operationElements) {
          const layout = this.calculateElementLayout(element, opX, wireY);
          operationLayouts.push(layout);
          opX += this.getElementDimensions(element).width + instructionGap;
        }
      }

      layouts.push({
        lineIndex: i,
        yOffset: currentY - rungYOffset,
        height: line.height,
        wireY,
        elements: [...conditionLayouts, ...operationLayouts],
        conditions: conditionLayouts,
        operations: operationLayouts,
        isLastLine: line.isLastLine,
        conditionsWidth: line.conditionsWidth,
        operationsWidth: line.operationsWidth,
        conditionsStartX,
        operationsStartX,
      });

      currentY += line.height + this.options.lineSpacing;
    }

    // Adjust last line - remove line spacing that was added
    if (layouts.length > 0) {
      const lastIdx = layouts.length - 1;
      for (let i = 0; i < layouts.length; i++) {
        layouts[i].isLastLine = i === lastIdx;
      }
    }

    return layouts;
  }

  /**
   * Calculate layouts for condition elements (left-aligned)
   */
  private calculateConditionLayouts(
    elements: RungElement[],
    startX: number,
    wireY: number
  ): RungElementLayout[] {
    const layouts: RungElementLayout[] = [];
    let currentX = startX;

    for (const element of elements) {
      const layout = this.calculateElementLayout(element, currentX, wireY);
      layouts.push(layout);
      currentX += this.getElementDimensions(element).width + this.options.instructionGap;
    }

    return layouts;
  }

  /**
   * Calculate layout for a single element (instruction or branch)
   */
  private calculateElementLayout(
    element: RungElement,
    x: number,
    wireY: number
  ): RungElementLayout {
    if (isBranchGroup(element)) {
      return this.calculateBranchGroupLayout(element, x, wireY);
    }
    return this.calculateInstructionLayout(element, x, wireY);
  }

  /**
   * Calculate layout for a single instruction
   */
  private calculateInstructionLayout(
    instruction: Instruction,
    x: number,
    wireY: number
  ): InstructionLayout {
    const dims = this.getInstructionDimensions(instruction);
    const isContactOrCoil = instruction.category === 'input' || instruction.category === 'output';
    const symbolOffset = isContactOrCoil ? (dims.width - SYMBOL_WIDTH) / 2 : 0;

    const instrY = wireY - dims.centerY;

    return {
      type: 'instruction',
      instruction,
      position: { x, y: instrY },
      dimensions: dims,
      symbolOffset,
      label: isContactOrCoil ? instruction.operands[0] : undefined,
      address: isContactOrCoil ? this.formatTagAsAddress(instruction.operands[0] || '') : undefined,
    };
  }

  /**
   * Calculate layout for a branch group
   */
  private calculateBranchGroupLayout(
    branch: BranchGroup,
    x: number,
    mainWireY: number
  ): BranchGroupLayout {
    if (branch.branches.length === 0) {
      return {
        type: 'branch',
        branchGroup: branch,
        position: { x, y: mainWireY - this.options.minRungHeight / 2 },
        dimensions: { width: 0, height: this.options.minRungHeight, centerY: this.options.minRungHeight / 2 },
        legs: [],
        connectorLeftX: x,
        connectorRightX: x,
      };
    }

    const legDimensions = branch.branches.map(leg => this.calculateLegDimensions(leg));
    const maxWidth = Math.max(...legDimensions.map(l => l.width));
    const totalWidth = maxWidth + 2 * this.options.branchConnectorOffset;

    // Calculate Y positions for each branch leg
    const legYPositions: number[] = [];
    let currentY = mainWireY;
    for (let i = 0; i < legDimensions.length; i++) {
      if (i === 0) {
        legYPositions.push(mainWireY);
      } else {
        currentY += legDimensions[i - 1].height / 2 + this.options.branchVerticalGap + legDimensions[i].height / 2;
        legYPositions.push(currentY);
      }
    }

    const branchStartX = x;
    const branchEndX = x + totalWidth;
    const contentStartX = x + this.options.branchConnectorOffset;

    // Calculate total height
    let totalHeight = 0;
    for (let i = 0; i < legDimensions.length; i++) {
      totalHeight += legDimensions[i].height;
      if (i < legDimensions.length - 1) {
        totalHeight += this.options.branchVerticalGap;
      }
    }

    // Build leg layouts
    const legs: BranchLegLayout[] = branch.branches.map((leg, i) => {
      const legY = legYPositions[i];
      const elements: RungElementLayout[] = [];
      let legX = contentStartX;

      for (const element of leg) {
        elements.push(this.calculateElementLayout(element, legX, legY));
        legX += this.getElementDimensions(element).width + this.options.instructionGap;
      }

      return {
        wireY: legY,
        elements,
        contentWidth: legDimensions[i].width,
      };
    });

    return {
      type: 'branch',
      branchGroup: branch,
      position: { x, y: mainWireY - legDimensions[0].height / 2 },
      dimensions: { width: totalWidth, height: totalHeight, centerY: legDimensions[0].height / 2 },
      legs,
      connectorLeftX: branchStartX,
      connectorRightX: branchEndX,
    };
  }

  // ============================================================================
  // DIMENSION CALCULATIONS
  // ============================================================================

  /**
   * Get dimensions for an instruction
   */
  private getInstructionDimensions(instruction: Instruction): ElementDimensions {
    switch (instruction.category) {
      case 'input':
      case 'output': {
        const label = instruction.operands[0] || '';
        const width = calculateSymbolWidth(label);
        return {
          width,
          height: SYMBOL_HEIGHT,
          centerY: SYMBOL_HEIGHT / 2,
        };
      }
      default:
        return calculateBoxDimensions(instruction.mnemonic, instruction.operands);
    }
  }

  /**
   * Get dimensions for any rung element
   */
  private getElementDimensions(element: RungElement): ElementDimensions {
    if (isBranchGroup(element)) {
      return this.calculateBranchDimensions(element);
    }
    return this.getInstructionDimensions(element);
  }

  /**
   * Calculate dimensions for a branch group
   */
  private calculateBranchDimensions(branch: BranchGroup): ElementDimensions {
    if (branch.branches.length === 0) {
      return { width: 0, height: this.options.minRungHeight, centerY: this.options.minRungHeight / 2 };
    }

    const legDimensions = branch.branches.map(leg => this.calculateLegDimensions(leg));
    const maxWidth = Math.max(...legDimensions.map(l => l.width));
    const totalWidth = maxWidth + 2 * this.options.branchConnectorOffset;

    let totalHeight = 0;
    for (let i = 0; i < legDimensions.length; i++) {
      totalHeight += legDimensions[i].height;
      if (i < legDimensions.length - 1) {
        totalHeight += this.options.branchVerticalGap;
      }
    }

    return {
      width: totalWidth,
      height: totalHeight,
      centerY: legDimensions[0].height / 2,
    };
  }

  /**
   * Calculate dimensions for a single branch leg
   */
  private calculateLegDimensions(elements: RungElement[]): ElementDimensions {
    if (elements.length === 0) {
      return { width: 0, height: this.options.minRungHeight, centerY: this.options.minRungHeight / 2 };
    }

    let totalWidth = 0;
    let maxHeight = this.options.minRungHeight;

    for (let i = 0; i < elements.length; i++) {
      const dims = this.getElementDimensions(elements[i]);
      totalWidth += dims.width;
      maxHeight = Math.max(maxHeight, dims.height);

      if (i < elements.length - 1) {
        totalWidth += this.options.instructionGap;
      }
    }

    return { width: totalWidth, height: maxHeight, centerY: maxHeight / 2 };
  }

  // ============================================================================
  // LINE SPLITTING LOGIC
  // ============================================================================

  /**
   * Internal line layout used during calculation
   */
  private splitElementsIntoLines(
    elements: RungElement[],
    availableWidth: number
  ): InternalLineLayout[] {
    const conditionElements: RungElement[] = [];
    const operationElements: RungElement[] = [];

    for (const element of elements) {
      if (isBranchGroup(element)) {
        if (this.elementContainsOperation(element) && !this.elementContainsCondition(element)) {
          operationElements.push(element);
        } else {
          conditionElements.push(element);
        }
      } else {
        if (this.isOperation(element)) {
          operationElements.push(element);
        } else {
          conditionElements.push(element);
        }
      }
    }

    const operationsWidth = this.calculateElementsWidth(operationElements);
    const lines: InternalLineLayout[] = [];

    const availableForConditionsWithOps = availableWidth - operationsWidth - this.options.minConditionOperationGap;

    let currentLine: RungElement[] = [];
    let currentLineWidth = 0;

    for (let i = 0; i < conditionElements.length; i++) {
      const element = conditionElements[i];
      const dims = this.getElementDimensions(element);
      const elementWidth = dims.width + (currentLine.length > 0 ? this.options.instructionGap : 0);

      const isLastCondition = i === conditionElements.length - 1;
      const remainingWidth = this.calculateElementsWidth(conditionElements.slice(i));

      let maxWidthForLine: number;
      if (isLastCondition || remainingWidth + operationsWidth + this.options.minConditionOperationGap <= availableWidth - currentLineWidth) {
        maxWidthForLine = availableForConditionsWithOps;
      } else {
        maxWidthForLine = availableWidth;
      }

      if (currentLine.length > 0 && currentLineWidth + elementWidth > maxWidthForLine) {
        if (currentLine.length > 0) {
          const lineMetrics = this.calculateLineHeight(currentLine);
          lines.push({
            conditionElements: currentLine,
            operationElements: [],
            conditionsWidth: currentLineWidth,
            operationsWidth: 0,
            height: lineMetrics.height,
            wireOffsetFromTop: lineMetrics.wireOffsetFromTop,
            isLastLine: false,
          });
        }
        currentLine = [element];
        currentLineWidth = dims.width;
      } else {
        currentLine.push(element);
        currentLineWidth += elementWidth;
      }
    }

    // Add remaining conditions with operations on the last line
    if (currentLine.length > 0 || operationElements.length > 0) {
      const lastLineConditionsWidth = currentLineWidth;
      const totalLastLineWidth = lastLineConditionsWidth +
        (lastLineConditionsWidth > 0 && operationsWidth > 0 ? this.options.minConditionOperationGap : 0) +
        operationsWidth;

      if (totalLastLineWidth <= availableWidth) {
        const lastLineElements = [...currentLine, ...operationElements];
        const lineMetrics = this.calculateLineHeight(lastLineElements);
        lines.push({
          conditionElements: currentLine,
          operationElements,
          conditionsWidth: lastLineConditionsWidth,
          operationsWidth,
          height: lineMetrics.height,
          wireOffsetFromTop: lineMetrics.wireOffsetFromTop,
          isLastLine: true,
        });
      } else {
        if (currentLine.length > 0) {
          const lineMetrics = this.calculateLineHeight(currentLine);
          lines.push({
            conditionElements: currentLine,
            operationElements: [],
            conditionsWidth: currentLineWidth,
            operationsWidth: 0,
            height: lineMetrics.height,
            wireOffsetFromTop: lineMetrics.wireOffsetFromTop,
            isLastLine: false,
          });
        }
        if (operationElements.length > 0) {
          const lineMetrics = this.calculateLineHeight(operationElements);
          lines.push({
            conditionElements: [],
            operationElements,
            conditionsWidth: 0,
            operationsWidth,
            height: lineMetrics.height,
            wireOffsetFromTop: lineMetrics.wireOffsetFromTop,
            isLastLine: true,
          });
        }
      }
    }

    // Handle edge case: only operations, no conditions
    if (lines.length === 0 && operationElements.length > 0) {
      const lineMetrics = this.calculateLineHeight(operationElements);
      lines.push({
        conditionElements: [],
        operationElements,
        conditionsWidth: 0,
        operationsWidth,
        height: lineMetrics.height,
        wireOffsetFromTop: lineMetrics.wireOffsetFromTop,
        isLastLine: true,
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
   * Calculate height and wire offset for a line of elements
   */
  private calculateLineHeight(elements: RungElement[]): { height: number; wireOffsetFromTop: number } {
    if (elements.length === 0) {
      return { height: this.options.minRungHeight, wireOffsetFromTop: this.options.minRungHeight / 2 };
    }

    let maxHeight = this.options.minRungHeight;
    let maxWireOffset = this.options.minRungHeight / 2;

    for (const element of elements) {
      const dims = this.getElementDimensions(element);
      const labelSpace = !isBranchGroup(element) &&
        (element.category === 'input' || element.category === 'output') ? this.options.labelOffset : 0;

      const wireOffset = dims.centerY + labelSpace + this.options.rungPadding;
      const totalHeight = dims.height + labelSpace + this.options.rungPadding * 2;

      maxHeight = Math.max(maxHeight, totalHeight);
      maxWireOffset = Math.max(maxWireOffset, wireOffset);
    }

    return { height: maxHeight, wireOffsetFromTop: maxWireOffset };
  }

  /**
   * Calculate total height for multiple lines
   */
  private calculateMultiLineHeight(lines: InternalLineLayout[]): number {
    if (lines.length === 0) return this.options.minRungHeight;

    let totalHeight = 0;
    for (let i = 0; i < lines.length; i++) {
      totalHeight += lines[i].height;
      if (i < lines.length - 1) {
        totalHeight += this.options.lineSpacing;
      }
    }

    return totalHeight;
  }

  /**
   * Calculate total width of elements
   */
  private calculateElementsWidth(elements: RungElement[]): number {
    if (elements.length === 0) return 0;

    let width = 0;
    for (const element of elements) {
      width += this.getElementDimensions(element).width;
    }
    width += (elements.length - 1) * this.options.instructionGap;

    return width;
  }

  // ============================================================================
  // CLASSIFICATION HELPERS
  // ============================================================================

  /**
   * Check if an instruction is a condition (input/compare)
   */
  private isCondition(instruction: Instruction): boolean {
    return instruction.category === 'input' || instruction.category === 'compare';
  }

  /**
   * Check if an instruction is an operation (output/math/timer/counter)
   */
  private isOperation(instruction: Instruction): boolean {
    return (
      instruction.category === 'output' ||
      instruction.category === 'math' ||
      instruction.category === 'timer' ||
      instruction.category === 'counter' ||
      instruction.category === 'other'
    );
  }

  /**
   * Check if an element contains any conditions
   */
  private elementContainsCondition(element: RungElement): boolean {
    if (isBranchGroup(element)) {
      return element.branches.some(branch =>
        branch.some(el => this.elementContainsCondition(el))
      );
    }
    return this.isCondition(element);
  }

  /**
   * Check if an element contains any operations
   */
  private elementContainsOperation(element: RungElement): boolean {
    if (isBranchGroup(element)) {
      return element.branches.some(branch =>
        branch.some(el => this.elementContainsOperation(el))
      );
    }
    return this.isOperation(element);
  }

  /**
   * Format a tag name as a Studio 5000-style address
   */
  private formatTagAsAddress(tagName: string): string {
    if (tagName.includes(':') || tagName.includes('.')) {
      return `<${tagName}>`;
    }
    return '';
  }
}

// ============================================================================
// INTERNAL TYPES
// ============================================================================

/**
 * Internal line layout used during calculation
 */
interface InternalLineLayout {
  conditionElements: RungElement[];
  operationElements: RungElement[];
  conditionsWidth: number;
  operationsWidth: number;
  height: number;
  wireOffsetFromTop: number;
  isLastLine: boolean;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Create a layout engine with default options
 */
export function createLayoutEngine(options?: LayoutOptions): LayoutEngine {
  return new LayoutEngine(options);
}

/**
 * Calculate diagram layout using default options
 */
export function calculateDiagramLayout(rungs: Rung[], options?: LayoutOptions): DiagramLayout {
  const engine = new LayoutEngine(options);
  return engine.calculateDiagramLayout(rungs);
}
