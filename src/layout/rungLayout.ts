import type { BranchGroup, Instruction, InstructionContext, NormalizedRung, RungElement } from '../types';
import { isBranchGroup } from '../types';
import { calculateBoxDimensions } from '../components/svg/BoxSymbol';
import type {
  BranchGroupLayout,
  Dimensions,
  ElementLine,
  ElementPartition,
  InstructionLayout,
  LineLayout,
  RungCommentLayout,
  RungElementLayout,
  RungLayout,
  RungLayoutResult,
  VerticalClearance,
} from './rungLayoutTypes';

export const RUNG_NUMBER_WIDTH = 30;
export const RAIL_VISUAL_WIDTH = 4;
export const MIN_RUNG_HEIGHT = 80;
export const RUNG_START_OFFSET = 15;
export const BRANCH_CONNECTOR_OFFSET = 10;
export const INSTRUCTION_GAP = 0;
export const BRANCH_VERTICAL_GAP = 5;
export const LINE_SPACING = 20;
export const LABEL_OFFSET = 18;
export const ADDRESS_LABEL_OFFSET = 12;
export const RUNG_PADDING = 15;
export const MIN_CONDITION_OPERATION_GAP = 40;
export const SYMBOL_WIDTH = 30;
export const SYMBOL_HEIGHT = 20;
export const CHAR_WIDTH_ESTIMATE = 7;
export const LABEL_PADDING = 10;
export const COMMENT_LINE_HEIGHT = 16;
export const COMMENT_BOTTOM_GAP = 8;

export function getRungElements(rung: NormalizedRung): RungElement[] {
  return rung.elements && rung.elements.length > 0 ? rung.elements : rung.instructions;
}

function calculateSymbolWidth(label: string): number {
  const textWidth = label.length * CHAR_WIDTH_ESTIMATE;
  return Math.max(SYMBOL_WIDTH, textWidth + LABEL_PADDING * 2);
}

function estimateTextWidth(text: string): number {
  return text.length * CHAR_WIDTH_ESTIMATE;
}

function chunkToken(token: string, maxCharsPerLine: number): string[] {
  if (maxCharsPerLine <= 0 || token.length <= maxCharsPerLine) {
    return [token];
  }

  const chunks: string[] = [];
  for (let index = 0; index < token.length; index += maxCharsPerLine) {
    chunks.push(token.slice(index, index + maxCharsPerLine));
  }

  return chunks;
}

function wrapCommentLine(line: string, maxWidth: number): string[] {
  if (line.length === 0 || maxWidth <= 0 || estimateTextWidth(line) <= maxWidth) {
    return [line];
  }

  const maxCharsPerLine = Math.max(1, Math.floor(maxWidth / CHAR_WIDTH_ESTIMATE));
  const tokens = line.match(/(\s+|\S+)/g) ?? [line];
  const wrapped: string[] = [];
  let currentLine = '';

  for (const token of tokens) {
    const candidate = `${currentLine}${token}`;
    if (currentLine.length === 0 && estimateTextWidth(token) > maxWidth) {
      const chunks = chunkToken(token, maxCharsPerLine);
      wrapped.push(...chunks.slice(0, -1));
      currentLine = chunks[chunks.length - 1] ?? '';
      continue;
    }

    if (estimateTextWidth(candidate) <= maxWidth) {
      currentLine = candidate;
      continue;
    }

    wrapped.push(currentLine);

    if (estimateTextWidth(token) > maxWidth) {
      const chunks = chunkToken(token, maxCharsPerLine);
      wrapped.push(...chunks.slice(0, -1));
      currentLine = chunks[chunks.length - 1] ?? '';
    } else {
      currentLine = token;
    }
  }

  wrapped.push(currentLine);
  return wrapped;
}

export function getRungCommentWidth(leftRailX: number, rightRailX: number): number {
  return Math.max(rightRailX - leftRailX - 2 * RUNG_START_OFFSET, 0);
}

export function wrapRungComment(comment: string, maxWidth: number): string[] {
  if (!comment) {
    return [];
  }

  return comment
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .flatMap((line) => wrapCommentLine(line, maxWidth));
}

export function calculateRungCommentLayout(
  comment: string | undefined,
  yOffset: number,
  leftRailX: number,
  rightRailX: number,
): RungCommentLayout | undefined {
  if (!comment) {
    return undefined;
  }

  const width = getRungCommentWidth(leftRailX, rightRailX);
  const lines = wrapRungComment(comment, width);
  if (lines.length === 0) {
    return undefined;
  }

  return {
    x: leftRailX + RUNG_START_OFFSET,
    y: yOffset,
    width,
    height: lines.length * COMMENT_LINE_HEIGHT,
    lineHeight: COMMENT_LINE_HEIGHT,
    lines,
  };
}

function isOperation(instruction: Instruction): boolean {
  return (
    instruction.category === 'output' ||
    instruction.category === 'math' ||
    instruction.category === 'timer' ||
    instruction.category === 'counter' ||
    instruction.category === 'aoi' ||
    instruction.category === 'other'
  );
}

function branchContainsOnlyOperations(branch: BranchGroup): boolean {
  return branch.branches.every((leg) => leg.length > 0 && leg.every((element) => elementIsOperation(element)));
}

function elementIsOperation(element: RungElement): boolean {
  if (isBranchGroup(element)) {
    return branchContainsOnlyOperations(element);
  }
  return isOperation(element);
}

function hasLabel(element: RungElement): boolean {
  if (isBranchGroup(element)) {
    return false;
  }
  return element.category === 'input' || element.category === 'output';
}

export function getInstructionLabelAndAddress(instruction: Instruction): { label?: string; address?: string } {
  if (instruction.category !== 'input' && instruction.category !== 'output') {
    return {};
  }

  const label = instruction.operands[0] || '';
  const address = label.includes(':') || label.includes('.') ? `<${label}>` : undefined;

  return {
    label,
    address,
  };
}

export function calculateElementVerticalClearance(
  element: RungElement,
  dimensions?: Dimensions,
  instructionContext?: InstructionContext,
): VerticalClearance {
  const resolvedDimensions = dimensions ?? calculateElementDimensions(element, instructionContext);
  const baseClearance = {
    aboveWire: resolvedDimensions.centerY,
    belowWire: resolvedDimensions.height - resolvedDimensions.centerY,
  };

  if (isBranchGroup(element) || !hasLabel(element)) {
    return baseClearance;
  }

  const { label } = getInstructionLabelAndAddress(element);

  return {
    aboveWire: baseClearance.aboveWire + (label ? LABEL_OFFSET : 0),
    belowWire: baseClearance.belowWire,
  };
}

export function calculateInstructionDimensions(
  instruction: Instruction,
  instructionContext?: InstructionContext,
): Dimensions {
  switch (instruction.category) {
    case 'input':
    case 'output': {
      const label = instruction.operands[0] || '';
      const width = calculateSymbolWidth(label);
      return { width, height: SYMBOL_HEIGHT, centerY: SYMBOL_HEIGHT / 2 };
    }
    default:
      return calculateBoxDimensions(instruction.mnemonic, instruction.operands, undefined, instructionContext);
  }
}

export function calculateBranchDimensions(
  branch: BranchGroup,
  instructionContext?: InstructionContext,
): Dimensions {
  if (branch.branches.length === 0) {
    return { width: 0, height: MIN_RUNG_HEIGHT, centerY: MIN_RUNG_HEIGHT / 2 };
  }

  const legDimensions: Dimensions[] = [];

  for (const leg of branch.branches) {
    let legWidth = 0;
    let maxHeightAboveWire = MIN_RUNG_HEIGHT / 2;
    let maxHeightBelowWire = MIN_RUNG_HEIGHT / 2;

    for (let index = 0; index < leg.length; index += 1) {
      const element = leg[index];
      const dimensions = isBranchGroup(element)
        ? calculateBranchDimensions(element, instructionContext)
        : calculateInstructionDimensions(element, instructionContext);

      const clearance = calculateElementVerticalClearance(element, dimensions, instructionContext);
      const heightAboveWire = clearance.aboveWire;
      const heightBelowWire = clearance.belowWire;

      maxHeightAboveWire = Math.max(maxHeightAboveWire, heightAboveWire);
      maxHeightBelowWire = Math.max(maxHeightBelowWire, heightBelowWire);

      legWidth += dimensions.width;
      if (index < leg.length - 1) {
        legWidth += INSTRUCTION_GAP;
      }
    }

    legDimensions.push({
      width: legWidth,
      height: maxHeightAboveWire + maxHeightBelowWire,
      centerY: maxHeightAboveWire,
    });
  }

  const maxLegWidth = Math.max(...legDimensions.map((dimensions) => dimensions.width));
  const branchWidth = maxLegWidth + 2 * BRANCH_CONNECTOR_OFFSET;

  let branchHeight = 0;
  for (let index = 0; index < legDimensions.length; index += 1) {
    branchHeight += legDimensions[index].height;
    if (index < legDimensions.length - 1) {
      branchHeight += BRANCH_VERTICAL_GAP;
    }
  }

  return {
    width: branchWidth,
    height: branchHeight,
    centerY: legDimensions[0].centerY,
  };
}

export function calculateElementDimensions(
  element: RungElement,
  instructionContext?: InstructionContext,
): Dimensions {
  if (isBranchGroup(element)) {
    return calculateBranchDimensions(element, instructionContext);
  }
  return calculateInstructionDimensions(element, instructionContext);
}

function separateElements(elements: RungElement[]): ElementPartition {
  const conditions: RungElement[] = [];
  const operations: RungElement[] = [];

  for (const element of elements) {
    if (elementIsOperation(element)) {
      operations.push(element);
    } else {
      conditions.push(element);
    }
  }

  return { conditions, operations };
}

function calculateTotalWidth(elements: RungElement[], instructionContext?: InstructionContext): number {
  if (elements.length === 0) {
    return 0;
  }

  let width = 0;
  for (const element of elements) {
    width += calculateElementDimensions(element, instructionContext).width;
  }

  return width + (elements.length - 1) * INSTRUCTION_GAP;
}

function splitIntoLines(
  conditions: RungElement[],
  operations: RungElement[],
  instructionContext?: InstructionContext,
): ElementLine[] {
  return [
    {
      conditions,
      operations,
      conditionsWidth: calculateTotalWidth(conditions, instructionContext),
      operationsWidth: calculateTotalWidth(operations, instructionContext),
      height: 0,
      wireY: 0,
      yOffset: 0,
      isLastLine: true,
    },
  ];
}

function calculateLineMetrics(
  lines: ElementLine[],
  rungYOffset: number,
  instructionContext?: InstructionContext,
): number {
  let currentY = rungYOffset;

  for (const line of lines) {
    let maxHeightAboveWire = MIN_RUNG_HEIGHT / 2;
    let maxHeightBelowWire = MIN_RUNG_HEIGHT / 2;

    for (const element of [...line.conditions, ...line.operations]) {
      const dimensions = calculateElementDimensions(element, instructionContext);
      const clearance = calculateElementVerticalClearance(element, dimensions, instructionContext);
      const heightAboveWire = clearance.aboveWire + RUNG_PADDING;
      const heightBelowWire = clearance.belowWire + RUNG_PADDING;

      maxHeightAboveWire = Math.max(maxHeightAboveWire, heightAboveWire);
      maxHeightBelowWire = Math.max(maxHeightBelowWire, heightBelowWire);
    }

    line.height = maxHeightAboveWire + maxHeightBelowWire;
    line.wireY = currentY + maxHeightAboveWire;
    line.yOffset = currentY - rungYOffset;

    currentY += line.height + LINE_SPACING;
  }

  return Math.max(currentY - LINE_SPACING - rungYOffset, MIN_RUNG_HEIGHT);
}

function positionInstruction(
  instruction: Instruction,
  x: number,
  wireY: number,
  instructionContext?: InstructionContext,
): InstructionLayout {
  const dimensions = calculateInstructionDimensions(instruction, instructionContext);
  const isContactOrCoil = instruction.category === 'input' || instruction.category === 'output';
  const symbolOffset = isContactOrCoil ? (dimensions.width - SYMBOL_WIDTH) / 2 : 0;
  const { label, address } = getInstructionLabelAndAddress(instruction);

  return {
    type: 'instruction',
    instruction,
    position: { x, y: wireY - dimensions.centerY },
    dimensions,
    symbolOffset,
    label: isContactOrCoil ? label : undefined,
    address: isContactOrCoil ? address : undefined,
  };
}

export function positionBranch(
  branch: BranchGroup,
  branchStartX: number,
  mainWireY: number,
  instructionContext?: InstructionContext,
): BranchGroupLayout {
  const dimensions = calculateBranchDimensions(branch, instructionContext);
  const connectorLeftX = branchStartX;
  const connectorRightX = branchStartX + dimensions.width;

  const legDimensions: Dimensions[] = branch.branches.map((leg) => {
    let legWidth = 0;
    let maxHeightAboveWire = MIN_RUNG_HEIGHT / 2;
    let maxHeightBelowWire = MIN_RUNG_HEIGHT / 2;

    for (let index = 0; index < leg.length; index += 1) {
      const element = leg[index];
      const elementDimensions = calculateElementDimensions(element, instructionContext);

      const clearance = calculateElementVerticalClearance(element, elementDimensions, instructionContext);

      maxHeightAboveWire = Math.max(maxHeightAboveWire, clearance.aboveWire);
      maxHeightBelowWire = Math.max(maxHeightBelowWire, clearance.belowWire);

      legWidth += elementDimensions.width;
      if (index < leg.length - 1) {
        legWidth += INSTRUCTION_GAP;
      }
    }

    return {
      width: legWidth,
      height: maxHeightAboveWire + maxHeightBelowWire,
      centerY: maxHeightAboveWire,
    };
  });

  const legYPositions: number[] = [];
  let currentY = mainWireY;

  for (let index = 0; index < branch.branches.length; index += 1) {
    if (index === 0) {
      legYPositions.push(mainWireY);
      continue;
    }

    const previousLeg = legDimensions[index - 1];
    const currentLeg = legDimensions[index];
    currentY += previousLeg.height - previousLeg.centerY + BRANCH_VERTICAL_GAP + currentLeg.centerY;
    legYPositions.push(currentY);
  }

  const legs = branch.branches.map((leg, index) => {
    const legWireY = legYPositions[index];
    const contentStartX = connectorLeftX + BRANCH_CONNECTOR_OFFSET;
    let legX = contentStartX;
    const elements: RungElementLayout[] = [];

    for (const element of leg) {
      const elementDimensions = calculateElementDimensions(element, instructionContext);
      elements.push(isBranchGroup(element)
        ? positionBranch(element, legX, legWireY, instructionContext)
        : positionInstruction(element, legX, legWireY, instructionContext));
      legX += elementDimensions.width + INSTRUCTION_GAP;
    }

    return {
      wireY: legWireY,
      elements,
      contentWidth: legDimensions[index].width,
      contentEndX: legX - INSTRUCTION_GAP,
    };
  });

  return {
    type: 'branch',
    branchGroup: branch,
    position: { x: branchStartX, y: mainWireY - dimensions.centerY },
    dimensions,
    legs,
    connectorLeftX,
    connectorRightX,
  };
}

function positionOperations(
  operations: RungElement[],
  rightRailX: number,
  wireY: number,
  instructionContext?: InstructionContext,
): { layouts: RungElementLayout[]; startX: number } {
  const layouts: RungElementLayout[] = [];
  let currentX = rightRailX - RUNG_START_OFFSET;

  for (let index = operations.length - 1; index >= 0; index -= 1) {
    const element = operations[index];
    const dimensions = calculateElementDimensions(element, instructionContext);
    const elementX = currentX - dimensions.width;
    layouts.unshift(isBranchGroup(element)
      ? positionBranch(element, elementX, wireY, instructionContext)
      : positionInstruction(element, elementX, wireY, instructionContext));
    currentX = elementX - INSTRUCTION_GAP;
  }

  return { layouts, startX: currentX + INSTRUCTION_GAP };
}

function positionConditions(
  conditions: RungElement[],
  leftRailX: number,
  wireY: number,
  instructionContext?: InstructionContext,
): { layouts: RungElementLayout[]; endX: number } {
  const layouts: RungElementLayout[] = [];
  let currentX = leftRailX + RUNG_START_OFFSET;

  for (const element of conditions) {
    const dimensions = calculateElementDimensions(element, instructionContext);
    layouts.push(isBranchGroup(element)
      ? positionBranch(element, currentX, wireY, instructionContext)
      : positionInstruction(element, currentX, wireY, instructionContext));
    currentX += dimensions.width + INSTRUCTION_GAP;
  }

  return { layouts, endX: currentX };
}

export function containsBranches(elements: RungElement[]): boolean {
  return elements.some((element) => isBranchGroup(element));
}

export function calculateRungContentWidth(
  elements: RungElement[],
  instructionContext?: InstructionContext,
): number {
  const { conditions, operations } = separateElements(elements);
  return calculateTotalWidth(conditions, instructionContext)
    + MIN_CONDITION_OPERATION_GAP
    + calculateTotalWidth(operations, instructionContext)
    + 2 * RUNG_START_OFFSET;
}

export function calculateRungLayoutComplete(
  rung: NormalizedRung,
  rungIndex: number,
  yOffset: number,
  leftRailX: number,
  rightRailX: number,
  instructionContext?: InstructionContext,
): RungLayoutResult {
  const elements = getRungElements(rung);
  const { conditions, operations } = separateElements(elements);
  const lines = splitIntoLines(conditions, operations, instructionContext);
  const comment = calculateRungCommentLayout(rung.comment, yOffset, leftRailX, rightRailX);
  const commentBlockHeight = comment ? comment.height + COMMENT_BOTTOM_GAP : 0;
  const rungContentYOffset = yOffset + commentBlockHeight;
  const contentHeight = calculateLineMetrics(lines, rungContentYOffset, instructionContext);
  const rungHeight = commentBlockHeight + contentHeight;

  const lineLayouts: LineLayout[] = lines.map((line, lineIndex) => {
    const { layouts: operationsLayouts, startX: operationsStartX } = line.isLastLine && line.operations.length > 0
      ? positionOperations(line.operations, rightRailX, line.wireY, instructionContext)
      : { layouts: [], startX: rightRailX };

    const { layouts: conditionLayouts } = positionConditions(
      line.conditions,
      leftRailX,
      line.wireY,
      instructionContext,
    );

    return {
      lineIndex,
      yOffset: commentBlockHeight + line.yOffset,
      height: line.height,
      wireY: line.wireY,
      conditions: conditionLayouts,
      operations: operationsLayouts,
      conditionsStartX: leftRailX + RUNG_START_OFFSET,
      operationsStartX,
      isLastLine: line.isLastLine,
    };
  });

  return {
    rungIndex,
    yOffset,
    height: rungHeight,
    comment,
    lines: lineLayouts,
    hasBranches: containsBranches(elements),
  };
}

export function calculateMinDiagramWidth(
  rungs: NormalizedRung[],
  instructionContext?: InstructionContext,
): number {
  let maxContentWidth = 0;

  for (const rung of rungs) {
    maxContentWidth = Math.max(
      maxContentWidth,
      calculateRungContentWidth(getRungElements(rung), instructionContext),
    );
  }

  return RUNG_NUMBER_WIDTH + 2 * RAIL_VISUAL_WIDTH + maxContentWidth;
}

export function calculateRungLayouts(
  rungs: NormalizedRung[],
  diagramWidth: number,
  instructionContext?: InstructionContext,
): RungLayout[] {
  const leftRailX = RUNG_NUMBER_WIDTH + RAIL_VISUAL_WIDTH;
  const rightRailX = diagramWidth - RAIL_VISUAL_WIDTH;
  const layouts: RungLayout[] = [];
  let currentOffset = 0;

  for (let index = 0; index < rungs.length; index += 1) {
    const rung = rungs[index];
    const contentWidth = calculateRungContentWidth(getRungElements(rung), instructionContext)
      + RUNG_NUMBER_WIDTH
      + 2 * RAIL_VISUAL_WIDTH;
    const rungLayout = calculateRungLayoutComplete(
      rung,
      index,
      currentOffset,
      leftRailX,
      rightRailX,
      instructionContext,
    );
    layouts.push({ height: rungLayout.height, offset: currentOffset, contentWidth });
    currentOffset += rungLayout.height;
  }

  return layouts;
}
