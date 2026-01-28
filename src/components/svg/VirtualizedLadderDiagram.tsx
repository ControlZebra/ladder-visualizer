import { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import type { Instruction, Rung, RungElement, BranchGroup, ParsedRoutine } from '../../types';
import { isBranchGroup } from '../../types';
import { ContactSymbol } from './ContactSymbol';
import { CoilSymbol } from './CoilSymbol';
import { BoxSymbol, calculateBoxDimensions } from './BoxSymbol';

// ============================================================================
// CONSTANTS (matching ladder-renderer.ts)
// ============================================================================

export const RUNG_NUMBER_WIDTH = 30;
export const RAIL_WIDTH = 8;
export const RAIL_VISUAL_WIDTH = 4;
export const MIN_RUNG_HEIGHT = 80;
const INSTRUCTION_GAP = 0;
const LABEL_OFFSET = 18;
const ADDRESS_LABEL_OFFSET = 12;
const RUNG_PADDING = 15;
const LINE_SPACING = 20;
const MIN_CONDITION_OPERATION_GAP = 40;
const BRANCH_VERTICAL_GAP = 15;
const BRANCH_CONNECTOR_OFFSET = 10;
const SYMBOL_WIDTH = 30;
const SYMBOL_HEIGHT = 20;
const POWER_RAIL_COLOR = '#3366cc';
const CHAR_WIDTH_ESTIMATE = 7;
const LABEL_PADDING = 10;

// ============================================================================
// LAYOUT TYPES
// ============================================================================

interface Dimensions {
  width: number;
  height: number;
  centerY: number;
}

interface ElementLayout {
  width: number;
  height: number;
  centerY: number;
}

interface RungLayout {
  height: number;
  offset: number;
}

// ============================================================================
// HELPER FUNCTIONS
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

function elementIsOperation(element: RungElement): boolean {
  if (isBranchGroup(element)) {
    // A branch is an operation only if ALL legs contain only operations
    return element.branches.every(leg => leg.length > 0 && leg.every(el => elementIsOperation(el)));
  }
  return isOperation(element);
}

function getDimensions(instruction: Instruction): Dimensions {
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

function calculateElementLayout(element: RungElement): ElementLayout {
  if (isBranchGroup(element)) {
    return calculateBranchGroupLayout(element);
  }
  return getDimensions(element);
}

function calculateBranchGroupLayout(branch: BranchGroup): ElementLayout {
  if (branch.branches.length === 0) {
    return { width: 0, height: MIN_RUNG_HEIGHT, centerY: MIN_RUNG_HEIGHT / 2 };
  }

  const legLayouts = branch.branches.map(leg => calculateLegLayout(leg));
  const maxWidth = Math.max(...legLayouts.map(l => l.width));
  // 4 offsets: before left connector, after left connector (content start), before right connector (content end), after right connector
  const totalWidth = maxWidth + 4 * BRANCH_CONNECTOR_OFFSET;

  let totalHeight = 0;
  for (let i = 0; i < legLayouts.length; i++) {
    totalHeight += legLayouts[i].height;
    if (i < legLayouts.length - 1) {
      totalHeight += BRANCH_VERTICAL_GAP;
    }
  }

  const centerY = legLayouts[0].height / 2;
  return { width: totalWidth, height: totalHeight, centerY };
}

function calculateLegLayout(elements: RungElement[]): ElementLayout {
  if (elements.length === 0) {
    return { width: 0, height: MIN_RUNG_HEIGHT, centerY: MIN_RUNG_HEIGHT / 2 };
  }

  let totalWidth = 0;
  let maxHeight = MIN_RUNG_HEIGHT;

  for (let i = 0; i < elements.length; i++) {
    const layout = calculateElementLayout(elements[i]);
    // For contacts/coils, add label space to the height
    let elementHeight = layout.height;
    if (!isBranchGroup(elements[i])) {
      const el = elements[i] as Instruction;
      if (el.category === 'input' || el.category === 'output') {
        // Add space for label above and address below
        elementHeight = layout.height + LABEL_OFFSET + ADDRESS_LABEL_OFFSET;
      }
    }
    totalWidth += layout.width;
    maxHeight = Math.max(maxHeight, elementHeight);
    if (i < elements.length - 1) {
      totalWidth += INSTRUCTION_GAP;
    }
  }

  return { width: totalWidth, height: maxHeight, centerY: maxHeight / 2 };
}

function calculateElementsWidth(elements: RungElement[]): number {
  if (elements.length === 0) return 0;
  let width = 0;
  for (const el of elements) {
    width += calculateElementLayout(el).width;
  }
  width += (elements.length - 1) * INSTRUCTION_GAP;
  return width;
}

// ============================================================================
// LAYOUT CALCULATION FOR VIRTUALIZATION
// ============================================================================

interface ElementLine {
  conditionElements: RungElement[];
  operationElements: RungElement[];
  conditionsWidth: number;
  operationsWidth: number;
  height: number;
  isLastLine: boolean;
}

function calculateElementLineHeight(elements: RungElement[]): number {
  let maxHeight = MIN_RUNG_HEIGHT;
  for (const el of elements) {
    const layout = calculateElementLayout(el);
    let labelSpace = 0;
    if (!isBranchGroup(el)) {
      labelSpace = el.category === 'input' || el.category === 'output' ? LABEL_OFFSET + ADDRESS_LABEL_OFFSET : 0;
    }
    // For branches, the layout.height already includes all leg heights
    // Add padding for the overall rung
    const totalHeight = layout.height + labelSpace + RUNG_PADDING * 2;
    maxHeight = Math.max(maxHeight, totalHeight);
  }
  return maxHeight;
}

function splitElementsIntoLines(elements: RungElement[], availableWidth: number): ElementLine[] {
  const conditionElements: RungElement[] = [];
  const operationElements: RungElement[] = [];

  for (const element of elements) {
    if (elementIsOperation(element)) {
      operationElements.push(element);
    } else {
      conditionElements.push(element);
    }
  }

  const operationsWidth = calculateElementsWidth(operationElements);
  const lines: ElementLine[] = [];
  const availableForConditionsWithOps = availableWidth - operationsWidth - MIN_CONDITION_OPERATION_GAP;

  let currentLine: RungElement[] = [];
  let currentLineWidth = 0;

  for (let i = 0; i < conditionElements.length; i++) {
    const element = conditionElements[i];
    const layout = calculateElementLayout(element);
    const elementWidth = layout.width + (currentLine.length > 0 ? INSTRUCTION_GAP : 0);
    const isLastCondition = i === conditionElements.length - 1;
    const remainingWidth = calculateElementsWidth(conditionElements.slice(i));

    let maxWidthForLine: number;
    if (isLastCondition || remainingWidth + operationsWidth + MIN_CONDITION_OPERATION_GAP <= availableWidth - currentLineWidth) {
      maxWidthForLine = availableForConditionsWithOps;
    } else {
      maxWidthForLine = availableWidth;
    }

    if (currentLine.length > 0 && currentLineWidth + elementWidth > maxWidthForLine) {
      if (currentLine.length > 0) {
        lines.push({
          conditionElements: currentLine,
          operationElements: [],
          conditionsWidth: currentLineWidth,
          operationsWidth: 0,
          height: calculateElementLineHeight(currentLine),
          isLastLine: false,
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
      const allElements = [...currentLine, ...operationElements];
      lines.push({
        conditionElements: currentLine,
        operationElements,
        conditionsWidth: lastLineConditionsWidth,
        operationsWidth,
        height: calculateElementLineHeight(allElements),
        isLastLine: true,
      });
    } else {
      if (currentLine.length > 0) {
        lines.push({
          conditionElements: currentLine,
          operationElements: [],
          conditionsWidth: currentLineWidth,
          operationsWidth: 0,
          height: calculateElementLineHeight(currentLine),
          isLastLine: false,
        });
      }
      if (operationElements.length > 0) {
        lines.push({
          conditionElements: [],
          operationElements,
          conditionsWidth: 0,
          operationsWidth,
          height: calculateElementLineHeight(operationElements),
          isLastLine: true,
        });
      }
    }
  }

  // Ensure isLastLine is correct
  if (lines.length > 0) {
    for (let i = 0; i < lines.length; i++) {
      lines[i].isLastLine = i === lines.length - 1;
    }
  }

  return lines;
}

function calculateElementLinesHeight(lines: ElementLine[]): number {
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

function calculateRungLayouts(rungs: Rung[], diagramWidth: number): RungLayout[] {
  const availableWidth = diagramWidth - RUNG_NUMBER_WIDTH - 2 * RAIL_VISUAL_WIDTH - 2 * INSTRUCTION_GAP;
  const layouts: RungLayout[] = [];
  let currentOffset = 0;

  for (const rung of rungs) {
    // Use elements if available (preserves branch structure), otherwise fall back to instructions
    const elements = rung.elements && rung.elements.length > 0 ? rung.elements : rung.instructions;
    const lines = splitElementsIntoLines(elements, availableWidth);
    const height = lines.length > 0 ? calculateElementLinesHeight(lines) : MIN_RUNG_HEIGHT;
    layouts.push({ height, offset: currentOffset });
    currentOffset += height;
  }

  return layouts;
}

// ============================================================================
// REACT SVG COMPONENTS
// ============================================================================

interface InstructionRendererProps {
  instruction: Instruction;
  x: number;
  wireY: number;
}

function InstructionRenderer({ instruction, x, wireY }: InstructionRendererProps) {
  const dims = getDimensions(instruction);
  const instrY = wireY - dims.centerY;

  const isContactOrCoil = instruction.category === 'input' || instruction.category === 'output';
  const symbolOffset = isContactOrCoil ? (dims.width - SYMBOL_WIDTH) / 2 : 0;
  const symbolX = x + symbolOffset;

  const label = instruction.operands[0] || '';
  const labelX = x + dims.width / 2;
  const labelY = instrY - 5;
  const addressY = instrY + dims.height + ADDRESS_LABEL_OFFSET;

  return (
    <g className={`instruction instruction-${instruction.category}`} data-mnemonic={instruction.mnemonic}>
      {/* Labels for contacts/coils */}
      {isContactOrCoil && (
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
          {(label.includes(':') || label.includes('.')) && (
            <text
              x={labelX}
              y={addressY}
              textAnchor="middle"
              fontSize="8"
              fill="#666"
              className="instruction-address"
            >
              {`<${label}>`}
            </text>
          )}
          {/* Connecting wires for centering */}
          {symbolOffset > 0 && (
            <>
              <line x1={x} y1={wireY} x2={x + symbolOffset} y2={wireY} stroke="currentColor" strokeWidth="1" />
              <line x1={x + symbolOffset + SYMBOL_WIDTH} y1={wireY} x2={x + dims.width} y2={wireY} stroke="currentColor" strokeWidth="1" />
            </>
          )}
        </>
      )}

      {/* Symbol */}
      <g transform={`translate(${symbolX}, ${instrY})`}>
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
  if (branch.branches.length === 0) {
    return null;
  }

  const legLayouts = branch.branches.map(leg => calculateLegLayout(leg));
  const maxWidth = Math.max(...legLayouts.map(l => l.width));

  const legYPositions: number[] = [];
  let currentY = mainWireY;
  for (let i = 0; i < legLayouts.length; i++) {
    if (i === 0) {
      legYPositions.push(mainWireY);
    } else {
      currentY += legLayouts[i - 1].height / 2 + BRANCH_VERTICAL_GAP + legLayouts[i].height / 2;
      legYPositions.push(currentY);
    }
  }

  // Calculate total width (same formula as calculateBranchGroupLayout)
  const totalWidth = maxWidth + 4 * BRANCH_CONNECTOR_OFFSET;
  
  // Add offset before the vertical connector starts (wire from x to branchStartX)
  const branchStartX = x + BRANCH_CONNECTOR_OFFSET;
  const branchEndX = x + totalWidth - BRANCH_CONNECTOR_OFFSET;
  const contentStartX = branchStartX + BRANCH_CONNECTOR_OFFSET;

  const topY = legYPositions[0];
  const bottomY = legYPositions[legYPositions.length - 1];

  return (
    <g className="branch-group">
      {/* Horizontal wire leading into the branch */}
      <line x1={x} y1={mainWireY} x2={branchStartX} y2={mainWireY} stroke="currentColor" strokeWidth="1" />
      
      {/* Vertical connectors */}
      {branch.branches.length > 1 && (
        <>
          <line x1={branchStartX} y1={topY} x2={branchStartX} y2={bottomY} stroke="currentColor" strokeWidth="1" className="branch-connector" />
          <line x1={branchEndX} y1={topY} x2={branchEndX} y2={bottomY} stroke="currentColor" strokeWidth="1" className="branch-connector" />
        </>
      )}

      {/* Render each leg */}
      {branch.branches.map((leg, i) => {
        const legY = legYPositions[i];
        const legLayout = legLayouts[i];

        return (
          <g key={i} className="branch-leg">
            {/* Wire from branch start to content */}
            <line x1={branchStartX} y1={legY} x2={contentStartX} y2={legY} stroke="currentColor" strokeWidth="1" />

            {/* Leg contents */}
            {(() => {
              let legX = contentStartX;
              return leg.map((element, j) => {
                const elementX = legX;
                const layout = calculateElementLayout(element);
                legX += layout.width + INSTRUCTION_GAP;

                if (isBranchGroup(element)) {
                  return <BranchRenderer key={j} branch={element} x={elementX} mainWireY={legY} />;
                }
                return <InstructionRenderer key={j} instruction={element} x={elementX} wireY={legY} />;
              });
            })()}

            {/* Wire from content end to branch end */}
            {contentStartX + legLayout.width < branchEndX && (
              <line
                x1={contentStartX + legLayout.width}
                y1={legY}
                x2={branchEndX}
                y2={legY}
                stroke="currentColor"
                strokeWidth="1"
              />
            )}
          </g>
        );
      })}
    </g>
  );
}

interface RungRendererProps {
  rung: Rung;
  rungIndex: number;
  yOffset: number;
  diagramWidth: number;
}

/**
 * Helper component to render a single element (instruction or branch)
 */
function ElementRenderer({ element, x, wireY }: { element: RungElement; x: number; wireY: number }) {
  if (isBranchGroup(element)) {
    return <BranchRenderer branch={element} x={x} mainWireY={wireY} />;
  }
  return <InstructionRenderer instruction={element} x={x} wireY={wireY} />;
}

function RungRenderer({ rung, rungIndex, yOffset, diagramWidth }: RungRendererProps) {
  // Connect wires directly to the power rails (no gap)
  const leftRailX = RUNG_NUMBER_WIDTH + RAIL_VISUAL_WIDTH;
  const rightRailX = diagramWidth - RAIL_VISUAL_WIDTH;
  const availableWidth = diagramWidth - RUNG_NUMBER_WIDTH - 2 * RAIL_VISUAL_WIDTH - 2 * INSTRUCTION_GAP;

  // Use elements if available (preserves branch structure), otherwise fall back to instructions
  const elements = rung.elements && rung.elements.length > 0 ? rung.elements : rung.instructions;
  const lines = splitElementsIntoLines(elements, availableWidth);

  const wireYPositions: number[] = [];
  let currentY = yOffset;
  for (const line of lines) {
    wireYPositions.push(currentY + line.height / 2);
    currentY += line.height + LINE_SPACING;
  }

  if (lines.length === 0) {
    const wireY = yOffset + MIN_RUNG_HEIGHT / 2;
    return (
      <g className="rung">
        <line x1={leftRailX} y1={wireY} x2={rightRailX} y2={wireY} stroke="#333" strokeWidth="1" />
      </g>
    );
  }

  return (
    <g className="rung" data-rung-index={rungIndex}>
      {lines.map((line, lineIndex) => {
        const wireY = wireYPositions[lineIndex];
        const prevWireY = lineIndex > 0 ? wireYPositions[lineIndex - 1] : null;
        const nextWireY = lineIndex < lines.length - 1 ? wireYPositions[lineIndex + 1] : null;

        const conditionsStartX = leftRailX + INSTRUCTION_GAP;

        return (
          <g key={lineIndex} className="rung-line">
            {/* Wire from left rail */}
            <line x1={leftRailX} y1={wireY} x2={conditionsStartX} y2={wireY} stroke="#333" strokeWidth="1" />

            {/* Condition elements */}
            {(() => {
              let currentX = conditionsStartX;
              return line.conditionElements.map((element, idx) => {
                const elementX = currentX;
                const layout = calculateElementLayout(element);
                currentX += layout.width + INSTRUCTION_GAP;
                return <ElementRenderer key={`c-${idx}`} element={element} x={elementX} wireY={wireY} />;
              });
            })()}

            {/* Wire and Operations */}
            {line.isLastLine && line.operationElements.length > 0 ? (
              (() => {
                const conditionsEndX = conditionsStartX + line.conditionsWidth + (line.conditionElements.length > 0 ? INSTRUCTION_GAP : 0);
                const operationsEndX = rightRailX - INSTRUCTION_GAP;
                const operationsStartX = operationsEndX - line.operationsWidth;

                return (
                  <>
                    {/* Wire between conditions and operations */}
                    {operationsStartX > conditionsEndX && (
                      <line x1={conditionsEndX} y1={wireY} x2={operationsStartX} y2={wireY} stroke="#333" strokeWidth="1" />
                    )}

                    {/* Operation elements */}
                    {(() => {
                      let currentX = operationsStartX;
                      return line.operationElements.map((element, idx) => {
                        const elementX = currentX;
                        const layout = calculateElementLayout(element);
                        currentX += layout.width + INSTRUCTION_GAP;
                        return <ElementRenderer key={`o-${idx}`} element={element} x={elementX} wireY={wireY} />;
                      });
                    })()}

                    {/* Wire to right rail */}
                    <line x1={operationsStartX + line.operationsWidth + INSTRUCTION_GAP} y1={wireY} x2={rightRailX} y2={wireY} stroke="#333" strokeWidth="1" />
                  </>
                );
              })()
            ) : (
              (() => {
                const conditionsEndX = conditionsStartX + line.conditionsWidth + (line.conditionElements.length > 0 ? INSTRUCTION_GAP : 0);
                const continuationX = rightRailX - INSTRUCTION_GAP;
                return (
                  <>
                    <line x1={conditionsEndX} y1={wireY} x2={continuationX} y2={wireY} stroke="#333" strokeWidth="1" />
                    {nextWireY !== null && (
                      <line x1={continuationX} y1={wireY} x2={continuationX} y2={nextWireY} stroke="#333" strokeWidth="1" />
                    )}
                  </>
                );
              })()
            )}

            {/* Vertical connector from previous line */}
            {lineIndex > 0 && prevWireY !== null && (
              <line x1={conditionsStartX} y1={prevWireY} x2={conditionsStartX} y2={wireY} stroke="#333" strokeWidth="1" />
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
