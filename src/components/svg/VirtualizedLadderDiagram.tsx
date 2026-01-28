import { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import type { Instruction, Rung, RungElement, BranchGroup, ParsedRoutine } from '../../types';
import { isBranchGroup } from '../../types';
import { ContactSymbol } from './ContactSymbol';
import { CoilSymbol } from './CoilSymbol';
import { BoxSymbol, calculateBoxDimensions } from './BoxSymbol';

// ============================================================================
// CONSTANTS (from RUNG_LAYOUT_ALGORITHM.md)
// ============================================================================

export const RUNG_NUMBER_WIDTH = 30;
export const RAIL_VISUAL_WIDTH = 4;
export const MIN_RUNG_HEIGHT = 80;
const RUNG_START_OFFSET = 15;         // Gap from power rail to first element
const BRANCH_CONNECTOR_OFFSET = 10;   // Gap between connector and first/last element
const INSTRUCTION_GAP = 0;            // Gap between instructions
const BRANCH_VERTICAL_GAP = 5;        // Vertical gap between branch legs
const LINE_SPACING = 20;              // Vertical gap between wrapped lines
const LABEL_OFFSET = 18;
const ADDRESS_LABEL_OFFSET = 12;
const RUNG_PADDING = 15;
const MIN_CONDITION_OPERATION_GAP = 40;
const SYMBOL_WIDTH = 30;
const SYMBOL_HEIGHT = 20;
const POWER_RAIL_COLOR = '#3366cc';
const CHAR_WIDTH_ESTIMATE = 7;
const LABEL_PADDING = 10;

// ============================================================================
// LAYOUT TYPES (from RUNG_LAYOUT_ALGORITHM.md)
// ============================================================================

interface Dimensions {
  width: number;
  height: number;
  centerY: number;
}

interface InstructionLayout {
  type: 'instruction';
  instruction: Instruction;
  position: { x: number; y: number };
  dimensions: Dimensions;
  symbolOffset: number;
  label?: string;
  address?: string;
}

interface BranchLegLayout {
  wireY: number;
  elements: RungElementLayout[];
  contentWidth: number;
  contentEndX: number;
}

interface BranchGroupLayout {
  type: 'branch';
  branchGroup: BranchGroup;
  position: { x: number; y: number };
  dimensions: Dimensions;
  legs: BranchLegLayout[];
  connectorLeftX: number;
  connectorRightX: number;
}

type RungElementLayout = InstructionLayout | BranchGroupLayout;

interface LineLayout {
  lineIndex: number;
  yOffset: number;
  height: number;
  wireY: number;
  conditions: RungElementLayout[];
  operations: RungElementLayout[];
  conditionsStartX: number;
  operationsStartX: number;
  isLastLine: boolean;
}

interface RungLayoutResult {
  rungIndex: number;
  yOffset: number;
  height: number;
  lines: LineLayout[];
  hasBranches: boolean;
}

interface RungLayout {
  height: number;
  offset: number;
}

// ============================================================================
// PHASE 1: DIMENSION CALCULATION (Bottom-Up)
// Calculate widths/heights from innermost branches first
// ============================================================================

function calculateSymbolWidth(label: string): number {
  const textWidth = label.length * CHAR_WIDTH_ESTIMATE;
  return Math.max(SYMBOL_WIDTH, textWidth + LABEL_PADDING * 2);
}

function isOperation(instruction: Instruction): boolean {
  return (
    instruction.category === 'output' ||
    instruction.category === 'math' ||
    instruction.category === 'timer' ||
    instruction.category === 'counter' ||
    instruction.category === 'other'
  );
}

function branchContainsOnlyOperations(branch: BranchGroup): boolean {
  return branch.branches.every(leg => 
    leg.length > 0 && leg.every(el => elementIsOperation(el))
  );
}

function elementIsOperation(element: RungElement): boolean {
  if (isBranchGroup(element)) {
    return branchContainsOnlyOperations(element);
  }
  return isOperation(element);
}

function hasLabel(element: RungElement): boolean {
  if (isBranchGroup(element)) return false;
  return element.category === 'input' || element.category === 'output';
}

/**
 * Step 1.1: Calculate Instruction Dimensions
 */
function calculateInstructionDimensions(instruction: Instruction): Dimensions {
  switch (instruction.category) {
    case 'input':
    case 'output': {
      const label = instruction.operands[0] || '';
      const width = calculateSymbolWidth(label);
      return { width, height: SYMBOL_HEIGHT, centerY: SYMBOL_HEIGHT / 2 };
    }
    default:
      return calculateBoxDimensions(instruction.mnemonic, instruction.operands);
  }
}

/**
 * Step 1.2: Calculate Branch Dimensions (Recursive, Inside-Out)
 * Process innermost branches before outer ones
 */
function calculateBranchDimensions(branch: BranchGroup): Dimensions {
  if (branch.branches.length === 0) {
    return { width: 0, height: MIN_RUNG_HEIGHT, centerY: MIN_RUNG_HEIGHT / 2 };
  }

  const legDimensions: Dimensions[] = [];

  for (const leg of branch.branches) {
    let legWidth = 0;
    let legHeight = MIN_RUNG_HEIGHT;

    for (let i = 0; i < leg.length; i++) {
      const element = leg[i];
      let dims: Dimensions;

      if (isBranchGroup(element)) {
        // RECURSE FIRST - calculate inner branch dimensions
        dims = calculateBranchDimensions(element);
      } else {
        dims = calculateInstructionDimensions(element);
      }

      // For contacts/coils, add label space to height consideration
      let elementHeight = dims.height;
      if (!isBranchGroup(element) && hasLabel(element)) {
        elementHeight = dims.height + LABEL_OFFSET + ADDRESS_LABEL_OFFSET;
      }

      legWidth += dims.width;
      legHeight = Math.max(legHeight, elementHeight);

      // Add gap between elements
      if (i < leg.length - 1) {
        legWidth += INSTRUCTION_GAP;
      }
    }

    legDimensions.push({ width: legWidth, height: legHeight, centerY: legHeight / 2 });
  }

  // Branch width = longest leg + 2 * connector offset
  const maxLegWidth = Math.max(...legDimensions.map(d => d.width));
  const branchWidth = maxLegWidth + 2 * BRANCH_CONNECTOR_OFFSET;

  // Branch height = sum of all leg heights + gaps
  let branchHeight = 0;
  for (let i = 0; i < legDimensions.length; i++) {
    branchHeight += legDimensions[i].height;
    if (i < legDimensions.length - 1) {
      branchHeight += BRANCH_VERTICAL_GAP;
    }
  }

  // centerY = center of first leg (main wire continues through first leg)
  const centerY = legDimensions[0].height / 2;

  return { width: branchWidth, height: branchHeight, centerY };
}

/**
 * Calculate dimensions for any element (instruction or branch)
 */
function calculateElementDimensions(element: RungElement): Dimensions {
  if (isBranchGroup(element)) {
    return calculateBranchDimensions(element);
  }
  return calculateInstructionDimensions(element);
}

/**
 * Step 1.3: Separate Conditions from Operations
 */
function separateElements(elements: RungElement[]): { conditions: RungElement[]; operations: RungElement[] } {
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

/**
 * Calculate total width of elements including gaps
 */
function calculateTotalWidth(elements: RungElement[]): number {
  if (elements.length === 0) return 0;
  let width = 0;
  for (const el of elements) {
    width += calculateElementDimensions(el).width;
  }
  width += (elements.length - 1) * INSTRUCTION_GAP;
  return width;
}

// ============================================================================
// PHASE 2: POSITION CALCULATION (Right-to-Left for operations, Left-to-Right for conditions)
// ============================================================================

interface ElementLine {
  conditions: RungElement[];
  operations: RungElement[];
  conditionsWidth: number;
  operationsWidth: number;
  height: number;
  wireY: number;
  yOffset: number;
  isLastLine: boolean;
}

/**
 * Step 2.2: Handle Line Wrapping
 * Split elements into multiple lines if content exceeds available width
 */
function splitIntoLines(
  conditions: RungElement[],
  operations: RungElement[],
  availableWidth: number
): ElementLine[] {
  const operationsWidth = calculateTotalWidth(operations);
  const lines: { conditions: RungElement[]; operations: RungElement[] }[] = [];
  let currentLine: { conditions: RungElement[]; operations: RungElement[] } = { conditions: [], operations: [] };
  let currentWidth = 0;

  // Reserve space for operations on the last line
  const lastLineReserved = operationsWidth + MIN_CONDITION_OPERATION_GAP;

  for (let i = 0; i < conditions.length; i++) {
    const condition = conditions[i];
    const dims = calculateElementDimensions(condition);
    const elementWidth = dims.width + (currentLine.conditions.length > 0 ? INSTRUCTION_GAP : 0);
    const isLastCondition = i === conditions.length - 1;

    let maxWidth: number;
    if (isLastCondition) {
      // This will be on the last line with operations
      maxWidth = availableWidth - lastLineReserved;
    } else {
      maxWidth = availableWidth;
    }

    if (currentWidth + elementWidth > maxWidth && currentLine.conditions.length > 0) {
      // Wrap to new line
      lines.push(currentLine);
      currentLine = { conditions: [], operations: [] };
      currentWidth = 0;
    }

    currentLine.conditions.push(condition);
    currentWidth += currentLine.conditions.length === 1 ? dims.width : elementWidth;
  }

  // Add operations to the last line
  currentLine.operations = operations;
  lines.push(currentLine);

  // Convert to ElementLine with calculated heights and positions
  return lines.map((line, index) => ({
    conditions: line.conditions,
    operations: line.operations,
    conditionsWidth: calculateTotalWidth(line.conditions),
    operationsWidth: index === lines.length - 1 ? operationsWidth : 0,
    height: 0, // Will be calculated in calculateLineMetrics
    wireY: 0,  // Will be calculated in calculateLineMetrics
    yOffset: 0, // Will be calculated in calculateLineMetrics
    isLastLine: index === lines.length - 1,
  }));
}

/**
 * Step 2.3: Calculate Line Heights and Wire Y Positions
 */
function calculateLineMetrics(lines: ElementLine[], rungYOffset: number): number {
  let currentY = rungYOffset;

  for (const line of lines) {
    // Find tallest element in line
    let maxHeight = MIN_RUNG_HEIGHT;
    let maxWireOffset = MIN_RUNG_HEIGHT / 2;

    const allElements = [...line.conditions, ...line.operations];
    for (const element of allElements) {
      const dims = calculateElementDimensions(element);
      const labelSpace = hasLabel(element) ? LABEL_OFFSET : 0;

      const wireOffset = dims.centerY + labelSpace + RUNG_PADDING;
      const totalHeight = dims.height + labelSpace + 2 * RUNG_PADDING;

      maxHeight = Math.max(maxHeight, totalHeight);
      maxWireOffset = Math.max(maxWireOffset, wireOffset);
    }

    line.height = maxHeight;
    line.wireY = currentY + maxWireOffset;
    line.yOffset = currentY - rungYOffset;

    currentY += maxHeight + LINE_SPACING;
  }

  // Remove trailing line spacing
  const totalRungHeight = currentY - LINE_SPACING - rungYOffset;
  return Math.max(totalRungHeight, MIN_RUNG_HEIGHT);
}

/**
 * Step 2.4: Position Operations (Right-Aligned)
 * Start from the right rail and work backwards
 */
function positionOperations(
  operations: RungElement[],
  rightRailX: number,
  wireY: number
): { layouts: RungElementLayout[]; startX: number } {
  const layouts: RungElementLayout[] = [];
  let currentX = rightRailX - RUNG_START_OFFSET;

  // Position from right to left (reverse order)
  for (let i = operations.length - 1; i >= 0; i--) {
    const element = operations[i];
    const dims = calculateElementDimensions(element);

    const elementX = currentX - dims.width;

    if (isBranchGroup(element)) {
      layouts.unshift(positionBranch(element, elementX, wireY));
    } else {
      layouts.unshift(positionInstruction(element, elementX, wireY));
    }

    currentX = elementX - INSTRUCTION_GAP;
  }

  return { layouts, startX: currentX + INSTRUCTION_GAP };
}

/**
 * Step 2.5: Position Conditions (Left-Aligned)
 * Start from the left rail
 */
function positionConditions(
  conditions: RungElement[],
  leftRailX: number,
  wireY: number
): { layouts: RungElementLayout[]; endX: number } {
  const layouts: RungElementLayout[] = [];
  let currentX = leftRailX + RUNG_START_OFFSET;

  for (const element of conditions) {
    const dims = calculateElementDimensions(element);

    if (isBranchGroup(element)) {
      layouts.push(positionBranch(element, currentX, wireY));
    } else {
      layouts.push(positionInstruction(element, currentX, wireY));
    }

    currentX += dims.width + INSTRUCTION_GAP;
  }

  return { layouts, endX: currentX };
}

/**
 * Position a single instruction
 */
function positionInstruction(instruction: Instruction, x: number, wireY: number): InstructionLayout {
  const dims = calculateInstructionDimensions(instruction);
  const isContactOrCoil = instruction.category === 'input' || instruction.category === 'output';
  const symbolOffset = isContactOrCoil ? (dims.width - SYMBOL_WIDTH) / 2 : 0;
  const label = instruction.operands[0] || '';

  return {
    type: 'instruction',
    instruction,
    position: { x, y: wireY - dims.centerY },
    dimensions: dims,
    symbolOffset,
    label: isContactOrCoil ? label : undefined,
    address: isContactOrCoil && (label.includes(':') || label.includes('.')) ? `<${label}>` : undefined,
  };
}

/**
 * Step 2.6: Position Branch Elements (The Core Algorithm)
 * Right-to-left back-calculation for branch internals
 */
function positionBranch(branch: BranchGroup, branchStartX: number, mainWireY: number): BranchGroupLayout {
  const dims = calculateBranchDimensions(branch);

  const connectorLeftX = branchStartX;
  const connectorRightX = branchStartX + dims.width;

  // Calculate leg dimensions for Y positioning
  const legDimensions: Dimensions[] = branch.branches.map(leg => {
    let legWidth = 0;
    let legHeight = MIN_RUNG_HEIGHT;

    for (let i = 0; i < leg.length; i++) {
      const element = leg[i];
      const elDims = calculateElementDimensions(element);
      let elementHeight = elDims.height;
      if (!isBranchGroup(element) && hasLabel(element)) {
        elementHeight = elDims.height + LABEL_OFFSET + ADDRESS_LABEL_OFFSET;
      }
      legWidth += elDims.width;
      legHeight = Math.max(legHeight, elementHeight);
      if (i < leg.length - 1) {
        legWidth += INSTRUCTION_GAP;
      }
    }

    return { width: legWidth, height: legHeight, centerY: legHeight / 2 };
  });

  // Calculate Y position for each leg
  const legYPositions: number[] = [];
  let currentY = mainWireY;

  for (let i = 0; i < branch.branches.length; i++) {
    if (i === 0) {
      legYPositions.push(mainWireY);
    } else {
      const prevLegDims = legDimensions[i - 1];
      const legDims = legDimensions[i];
      currentY += prevLegDims.height / 2 + BRANCH_VERTICAL_GAP + legDims.height / 2;
      legYPositions.push(currentY);
    }
  }

  // Step 2.7: Position Leg Elements
  const legs: BranchLegLayout[] = branch.branches.map((leg, i) => {
    const legWireY = legYPositions[i];
    const contentStartX = connectorLeftX + BRANCH_CONNECTOR_OFFSET;
    let legX = contentStartX;
    const elements: RungElementLayout[] = [];

    for (const element of leg) {
      const elDims = calculateElementDimensions(element);

      if (isBranchGroup(element)) {
        elements.push(positionBranch(element, legX, legWireY));
      } else {
        elements.push(positionInstruction(element, legX, legWireY));
      }

      legX += elDims.width + INSTRUCTION_GAP;
    }

    return {
      wireY: legWireY,
      elements,
      contentWidth: legDimensions[i].width,
      contentEndX: legX - INSTRUCTION_GAP,
    };
  });

  return {
    type: 'branch',
    branchGroup: branch,
    position: { x: branchStartX, y: mainWireY - dims.centerY },
    dimensions: dims,
    legs,
    connectorLeftX,
    connectorRightX,
  };
}

/**
 * Check if rung contains any branches
 */
function containsBranches(elements: RungElement[]): boolean {
  for (const element of elements) {
    if (isBranchGroup(element)) return true;
  }
  return false;
}

/**
 * Calculate complete rung layout
 */
function calculateRungLayoutComplete(
  rung: Rung,
  rungIndex: number,
  yOffset: number,
  availableWidth: number,
  leftRailX: number,
  rightRailX: number
): RungLayoutResult {
  const elements = rung.elements && rung.elements.length > 0 ? rung.elements : rung.instructions;

  // Phase 1: Separate into conditions and operations
  const { conditions, operations } = separateElements(elements);

  // Phase 2: Split into lines if needed
  const lines = splitIntoLines(conditions, operations, availableWidth);

  // Calculate line metrics (heights and wire Y positions)
  const rungHeight = calculateLineMetrics(lines, yOffset);

  // Position elements in each line
  const lineLayouts: LineLayout[] = lines.map((line, lineIndex) => {
    // Position operations from right
    const { layouts: opLayouts, startX: operationsStartX } = line.isLastLine && line.operations.length > 0
      ? positionOperations(line.operations, rightRailX, line.wireY)
      : { layouts: [], startX: rightRailX };

    // Position conditions from left
    const { layouts: condLayouts } = positionConditions(
      line.conditions,
      leftRailX,
      line.wireY
    );

    return {
      lineIndex,
      yOffset: line.yOffset,
      height: line.height,
      wireY: line.wireY,
      conditions: condLayouts,
      operations: opLayouts,
      conditionsStartX: leftRailX + RUNG_START_OFFSET,
      operationsStartX,
      isLastLine: line.isLastLine,
    };
  });

  return {
    rungIndex,
    yOffset,
    height: rungHeight,
    lines: lineLayouts,
    hasBranches: containsBranches(elements),
  };
}

// ============================================================================
// DIAGRAM LAYOUT CALCULATION
// ============================================================================

/**
 * Calculate layouts for all rungs (used for virtualization)
 */
function calculateRungLayouts(rungs: Rung[], diagramWidth: number): RungLayout[] {
  const leftRailX = RUNG_NUMBER_WIDTH + RAIL_VISUAL_WIDTH;
  const rightRailX = diagramWidth - RAIL_VISUAL_WIDTH;
  const availableWidth = diagramWidth - RUNG_NUMBER_WIDTH - 2 * RAIL_VISUAL_WIDTH - 2 * RUNG_START_OFFSET;
  const layouts: RungLayout[] = [];
  let currentOffset = 0;

  for (let i = 0; i < rungs.length; i++) {
    const rungLayout = calculateRungLayoutComplete(rungs[i], i, currentOffset, availableWidth, leftRailX, rightRailX);
    layouts.push({ height: rungLayout.height, offset: currentOffset });
    currentOffset += rungLayout.height;
  }

  return layouts;
}

// ============================================================================
// REACT SVG COMPONENTS
// ============================================================================

/**
 * Renders an instruction from its layout
 */
function InstructionLayoutRenderer({ layout }: { layout: InstructionLayout }) {
  const { instruction, position, dimensions, symbolOffset, label, address } = layout;
  const isContactOrCoil = instruction.category === 'input' || instruction.category === 'output';
  const symbolX = position.x + symbolOffset;
  const wireY = position.y + dimensions.centerY;

  const labelX = position.x + dimensions.width / 2;
  const labelY = position.y - 5;
  const addressY = position.y + dimensions.height + ADDRESS_LABEL_OFFSET;

  return (
    <g className={`instruction instruction-${instruction.category}`} data-mnemonic={instruction.mnemonic}>
      {/* Labels for contacts/coils */}
      {isContactOrCoil && label && (
        <>
          <text
            x={labelX}
            y={labelY}
            textAnchor="middle"
            fontSize="10"
            fill="#333"
            fontWeight="500"
            className="instruction-label"
          >
            {label}
          </text>
          {address && (
            <text
              x={labelX}
              y={addressY}
              textAnchor="middle"
              fontSize="8"
              fill="#666"
              className="instruction-address"
            >
              {address}
            </text>
          )}
          {/* Connecting wires for centering */}
          {symbolOffset > 0 && (
            <>
              <line x1={position.x} y1={wireY} x2={position.x + symbolOffset} y2={wireY} stroke="currentColor" strokeWidth="1" />
              <line x1={position.x + symbolOffset + SYMBOL_WIDTH} y1={wireY} x2={position.x + dimensions.width} y2={wireY} stroke="currentColor" strokeWidth="1" />
            </>
          )}
        </>
      )}

      {/* Symbol */}
      <g transform={`translate(${symbolX}, ${position.y})`}>
        {instruction.category === 'input' && (
          <ContactSymbol mnemonic={instruction.mnemonic} />
        )}
        {instruction.category === 'output' && (
          <CoilSymbol mnemonic={instruction.mnemonic} />
        )}
        {!isContactOrCoil && (
          <BoxSymbol mnemonic={instruction.mnemonic} operands={instruction.operands} />
        )}
      </g>
    </g>
  );
}

/**
 * Renders a branch group from its layout
 */
function BranchLayoutRenderer({ layout }: { layout: BranchGroupLayout }) {
  const { legs, connectorLeftX, connectorRightX } = layout;

  if (legs.length === 0) {
    return null;
  }

  const topY = legs[0].wireY;
  const bottomY = legs[legs.length - 1].wireY;

  return (
    <g className="branch-group">
      {/* Vertical connectors */}
      {legs.length > 1 && (
        <>
          <line x1={connectorLeftX} y1={topY} x2={connectorLeftX} y2={bottomY} stroke="currentColor" strokeWidth="1" className="branch-connector" />
          <line x1={connectorRightX} y1={topY} x2={connectorRightX} y2={bottomY} stroke="currentColor" strokeWidth="1" className="branch-connector" />
        </>
      )}

      {/* Render each leg */}
      {legs.map((leg, i) => {
        const contentStartX = connectorLeftX + BRANCH_CONNECTOR_OFFSET;

        return (
          <g key={i} className="branch-leg">
            {/* Wire from left connector to content start */}
            <line x1={connectorLeftX} y1={leg.wireY} x2={contentStartX} y2={leg.wireY} stroke="currentColor" strokeWidth="1" />

            {/* Leg elements */}
            {leg.elements.map((elementLayout, j) => (
              <ElementLayoutRenderer key={j} layout={elementLayout} />
            ))}

            {/* Wire from content end to right connector */}
            {leg.contentEndX < connectorRightX - BRANCH_CONNECTOR_OFFSET && (
              <line
                x1={leg.contentEndX}
                y1={leg.wireY}
                x2={connectorRightX - BRANCH_CONNECTOR_OFFSET}
                y2={leg.wireY}
                stroke="currentColor"
                strokeWidth="1"
              />
            )}

            {/* Wire from content area to right connector */}
            <line
              x1={connectorRightX - BRANCH_CONNECTOR_OFFSET}
              y1={leg.wireY}
              x2={connectorRightX}
              y2={leg.wireY}
              stroke="currentColor"
              strokeWidth="1"
            />
          </g>
        );
      })}
    </g>
  );
}

/**
 * Renders any element layout (instruction or branch)
 */
function ElementLayoutRenderer({ layout }: { layout: RungElementLayout }) {
  if (layout.type === 'instruction') {
    return <InstructionLayoutRenderer layout={layout} />;
  }
  return <BranchLayoutRenderer layout={layout} />;
}

interface BranchRendererProps {
  branch: BranchGroup;
  x: number;
  mainWireY: number;
}

/**
 * Renders a branch group (parallel paths) in ladder logic
 * Exported for use in custom implementations
 */
export function BranchRenderer({ branch, x, mainWireY }: BranchRendererProps) {
  const layout = useMemo(() => positionBranch(branch, x, mainWireY), [branch, x, mainWireY]);
  return <BranchLayoutRenderer layout={layout} />;
}

interface RungRendererProps {
  rung: Rung;
  rungIndex: number;
  yOffset: number;
  diagramWidth: number;
}

function RungRenderer({ rung, rungIndex, yOffset, diagramWidth }: RungRendererProps) {
  const leftRailX = RUNG_NUMBER_WIDTH + RAIL_VISUAL_WIDTH;
  const rightRailX = diagramWidth - RAIL_VISUAL_WIDTH;
  const availableWidth = diagramWidth - RUNG_NUMBER_WIDTH - 2 * RAIL_VISUAL_WIDTH - 2 * RUNG_START_OFFSET;

  // Calculate complete layout using the new algorithm
  const rungLayout = useMemo(
    () => calculateRungLayoutComplete(rung, rungIndex, yOffset, availableWidth, leftRailX, rightRailX),
    [rung, rungIndex, yOffset, availableWidth, leftRailX, rightRailX]
  );

  if (rungLayout.lines.length === 0) {
    const wireY = yOffset + MIN_RUNG_HEIGHT / 2;
    return (
      <g className="rung">
        <line x1={leftRailX} y1={wireY} x2={rightRailX} y2={wireY} stroke="#333" strokeWidth="1" />
      </g>
    );
  }

  return (
    <g className="rung" data-rung-index={rungIndex}>
      {rungLayout.lines.map((line, lineIndex) => {
        const prevLine = lineIndex > 0 ? rungLayout.lines[lineIndex - 1] : null;
        const nextLine = lineIndex < rungLayout.lines.length - 1 ? rungLayout.lines[lineIndex + 1] : null;

        // Calculate conditions end position
        let conditionsEndX = line.conditionsStartX;
        for (const condLayout of line.conditions) {
          conditionsEndX = condLayout.position.x + condLayout.dimensions.width;
        }
        if (line.conditions.length > 0) {
          conditionsEndX += INSTRUCTION_GAP;
        }

        return (
          <g key={lineIndex} className="rung-line">
            {/* Wire from left rail to first condition */}
            <line x1={leftRailX} y1={line.wireY} x2={line.conditionsStartX} y2={line.wireY} stroke="#333" strokeWidth="1" />

            {/* Render condition elements */}
            {line.conditions.map((layout, idx) => (
              <ElementLayoutRenderer key={`c-${idx}`} layout={layout} />
            ))}

            {/* Wire and Operations */}
            {line.isLastLine && line.operations.length > 0 ? (
              <>
                {/* Wire between conditions and operations */}
                {line.operationsStartX > conditionsEndX && (
                  <line x1={conditionsEndX} y1={line.wireY} x2={line.operationsStartX} y2={line.wireY} stroke="#333" strokeWidth="1" />
                )}

                {/* Render operation elements */}
                {line.operations.map((layout, idx) => (
                  <ElementLayoutRenderer key={`o-${idx}`} layout={layout} />
                ))}

                {/* Wire from last operation to right rail */}
                {(() => {
                  const lastOp = line.operations[line.operations.length - 1];
                  const operationsEndX = lastOp.position.x + lastOp.dimensions.width;
                  return (
                    <line x1={operationsEndX} y1={line.wireY} x2={rightRailX} y2={line.wireY} stroke="#333" strokeWidth="1" />
                  );
                })()}
              </>
            ) : (
              <>
                {/* Wire to continuation point (near right rail) */}
                <line x1={conditionsEndX} y1={line.wireY} x2={rightRailX - INSTRUCTION_GAP} y2={line.wireY} stroke="#333" strokeWidth="1" />
                
                {/* Vertical connector to next line */}
                {nextLine && (
                  <line x1={rightRailX - INSTRUCTION_GAP} y1={line.wireY} x2={rightRailX - INSTRUCTION_GAP} y2={nextLine.wireY} stroke="#333" strokeWidth="1" />
                )}
              </>
            )}

            {/* Vertical connector from previous line */}
            {prevLine && (
              <line x1={line.conditionsStartX} y1={prevLine.wireY} x2={line.conditionsStartX} y2={line.wireY} stroke="#333" strokeWidth="1" />
            )}
          </g>
        );
      })}
    </g>
  );
}

// ============================================================================
// VIRTUALIZED LADDER DIAGRAM
// ============================================================================

export interface VirtualizedLadderDiagramProps {
  routine?: ParsedRoutine;
  rungs?: Rung[];
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
  /** Number of rungs to render above/below visible area */
  overscan?: number;
}

export function VirtualizedLadderDiagram({
  routine,
  rungs: rungsProp,
  width: widthProp,
  height: heightProp,
  className = '',
  style,
  overscan = 3,
}: VirtualizedLadderDiagramProps) {
  const rungs = useMemo(() => {
    if (rungsProp) return rungsProp;
    if (routine) return routine.rungs;
    return [];
  }, [routine, rungsProp]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerWidth, setContainerWidth] = useState(widthProp || 800);
  const [containerHeight, setContainerHeight] = useState(heightProp || 600);

  // Use ResizeObserver to track container width and height
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      if (newWidth > 0) {
        setContainerWidth(newWidth);
      }
      if (newHeight > 0) {
        setContainerHeight(newHeight);
      }
    };

    // Initial measurement
    updateDimensions();

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  // Use prop width/height if provided, otherwise use measured container dimensions
  const width = widthProp || containerWidth;
  const height = heightProp || containerHeight;

  // Calculate layouts for all rungs
  const rungLayouts = useMemo(() => calculateRungLayouts(rungs, width), [rungs, width]);
  const totalHeight = useMemo(() => {
    if (rungLayouts.length === 0) return MIN_RUNG_HEIGHT;
    const lastLayout = rungLayouts[rungLayouts.length - 1];
    return lastLayout.offset + lastLayout.height;
  }, [rungLayouts]);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Determine visible rungs based on scroll position
  const visibleRange = useMemo(() => {
    const viewportTop = scrollTop;
    const viewportBottom = scrollTop + height;

    let startIndex = 0;
    let endIndex = rungs.length - 1;

    // Find first visible rung
    for (let i = 0; i < rungLayouts.length; i++) {
      const layout = rungLayouts[i];
      if (layout.offset + layout.height >= viewportTop) {
        startIndex = Math.max(0, i - overscan);
        break;
      }
    }

    // Find last visible rung
    for (let i = rungLayouts.length - 1; i >= 0; i--) {
      const layout = rungLayouts[i];
      if (layout.offset <= viewportBottom) {
        endIndex = Math.min(rungs.length - 1, i + overscan);
        break;
      }
    }

    return { startIndex, endIndex };
  }, [scrollTop, height, rungLayouts, rungs.length, overscan]);

  // Render empty state
  if (rungs.length === 0) {
    return (
      <div
        ref={containerRef}
        className={`ladder-diagram-container ${className}`}
        style={{
          overflow: 'auto',
          backgroundColor: '#fff',
          flex: 1,
          minHeight: 0,
          ...style,
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={width}
          height={100}
          style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}
        >
          <text x={width / 2} y={50} textAnchor="middle" fill="#999" fontSize="13">
            No rungs to display
          </text>
        </svg>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`ladder-diagram-container virtualized ${className}`}
      style={{
        overflow: 'auto',
        backgroundColor: '#fff',
        flex: 1,
        minHeight: 0,
        ...style,
      }}
      onScroll={handleScroll}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={width}
        height={totalHeight}
        viewBox={`0 0 ${width} ${totalHeight}`}
        className="ladder-diagram"
        style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}
      >
        {/* Definitions */}
        <defs>
          <linearGradient id="railGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2255aa" />
            <stop offset="50%" stopColor="#3366cc" />
            <stop offset="100%" stopColor="#2255aa" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width={width} height={totalHeight} fill="#ffffff" />

        {/* Visible rungs */}
        {rungs.slice(visibleRange.startIndex, visibleRange.endIndex + 1).map((rung, idx) => {
          const actualIndex = visibleRange.startIndex + idx;
          const layout = rungLayouts[actualIndex];
          const rowBg = actualIndex % 2 === 0 ? '#ffffff' : '#fafafa';
          const cellBg = actualIndex % 2 === 0 ? '#f0f0f0' : '#e8e8e8';

          return (
            <g key={actualIndex} className="rung-container">
              {/* Row background */}
              <rect
                x={RUNG_NUMBER_WIDTH}
                y={layout.offset}
                width={width - RUNG_NUMBER_WIDTH}
                height={layout.height}
                fill={rowBg}
                className="rung-background"
              />

              {/* Rung number cell */}
              <rect
                x="0"
                y={layout.offset}
                width={RUNG_NUMBER_WIDTH}
                height={layout.height}
                fill={cellBg}
                className="rung-number-cell"
              />
              <line
                x1={RUNG_NUMBER_WIDTH}
                y1={layout.offset}
                x2={RUNG_NUMBER_WIDTH}
                y2={layout.offset + layout.height}
                stroke="#c0c0c0"
                strokeWidth="1"
              />
              <line
                x1="0"
                y1={layout.offset + layout.height}
                x2={RUNG_NUMBER_WIDTH}
                y2={layout.offset + layout.height}
                stroke="#c0c0c0"
                strokeWidth="1"
              />
              <text
                x={RUNG_NUMBER_WIDTH / 2}
                y={layout.offset + layout.height / 2 + 4}
                textAnchor="middle"
                fontSize="11"
                fontWeight="500"
                fill="#333"
                className="rung-number"
              >
                {actualIndex}
              </text>

              {/* Rung content */}
              <RungRenderer
                rung={rung}
                rungIndex={actualIndex}
                yOffset={layout.offset}
                diagramWidth={width}
              />
            </g>
          );
        })}

        {/* Power Rails - rendered after rung backgrounds so they appear on top */}
        <rect
          x={RUNG_NUMBER_WIDTH}
          y={0}
          width={RAIL_VISUAL_WIDTH}
          height={totalHeight}
          fill={POWER_RAIL_COLOR}
          className="power-rail left-rail"
        />
        <rect
          x={width - RAIL_VISUAL_WIDTH}
          y={0}
          width={RAIL_VISUAL_WIDTH}
          height={totalHeight}
          fill={POWER_RAIL_COLOR}
          className="power-rail right-rail"
        />
      </svg>
    </div>
  );
}

export default VirtualizedLadderDiagram;
