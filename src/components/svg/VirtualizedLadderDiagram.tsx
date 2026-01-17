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
const BRANCH_VERTICAL_GAP = 5;
const BRANCH_CONNECTOR_OFFSET = 10;
const SYMBOL_WIDTH = 30;
const SYMBOL_HEIGHT = 20;
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

function isCondition(instruction: Instruction): boolean {
  return instruction.category === 'input' || instruction.category === 'compare';
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
  const totalWidth = maxWidth + 2 * BRANCH_CONNECTOR_OFFSET;

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
    totalWidth += layout.width;
    maxHeight = Math.max(maxHeight, layout.height);
    if (i < elements.length - 1) {
      totalWidth += INSTRUCTION_GAP;
    }
  }

  return { width: totalWidth, height: maxHeight, centerY: maxHeight / 2 };
}

function calculateTotalWidth(instructions: Instruction[]): number {
  if (instructions.length === 0) return 0;
  let width = 0;
  for (const instr of instructions) {
    width += getDimensions(instr).width;
  }
  width += (instructions.length - 1) * INSTRUCTION_GAP;
  return width;
}

// ============================================================================
// LAYOUT CALCULATION FOR VIRTUALIZATION
// ============================================================================

interface RungLine {
  instructions: Instruction[];
  width: number;
  height: number;
  isLastLine: boolean;
  hasOperations: boolean;
}

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

function splitInstructionsIntoLines(instructions: Instruction[], availableWidth: number): RungLine[] {
  const conditions = instructions.filter(isCondition);
  const operations = instructions.filter(isOperation);
  const operationsWidth = calculateTotalWidth(operations);
  const lines: RungLine[] = [];
  const availableForConditionsWithOps = availableWidth - operationsWidth - MIN_CONDITION_OPERATION_GAP;

  let currentLine: Instruction[] = [];
  let currentLineWidth = 0;

  for (let i = 0; i < conditions.length; i++) {
    const instr = conditions[i];
    const dims = getDimensions(instr);
    const instrWidth = dims.width + (currentLine.length > 0 ? INSTRUCTION_GAP : 0);
    const isLastCondition = i === conditions.length - 1;
    const remainingConditionsWidth = calculateTotalWidth(conditions.slice(i));

    let maxWidthForLine: number;
    if (isLastCondition || remainingConditionsWidth + operationsWidth + MIN_CONDITION_OPERATION_GAP <= availableWidth - currentLineWidth) {
      maxWidthForLine = availableForConditionsWithOps;
    } else {
      maxWidthForLine = availableWidth;
    }

    if (currentLine.length > 0 && currentLineWidth + instrWidth > maxWidthForLine) {
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

  if (currentLine.length > 0 || operations.length > 0) {
    const lastLineInstructions = [...currentLine, ...operations];
    const lastLineConditionsWidth = currentLineWidth;
    const totalLastLineWidth = lastLineConditionsWidth + (lastLineConditionsWidth > 0 && operationsWidth > 0 ? MIN_CONDITION_OPERATION_GAP : 0) + operationsWidth;

    if (totalLastLineWidth <= availableWidth) {
      lines.push({
        instructions: lastLineInstructions,
        width: totalLastLineWidth,
        height: calculateLineHeight(lastLineInstructions),
        isLastLine: true,
        hasOperations: operations.length > 0,
      });
    } else {
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

  if (lines.length === 0 && operations.length > 0) {
    lines.push({
      instructions: operations,
      width: operationsWidth,
      height: calculateLineHeight(operations),
      isLastLine: true,
      hasOperations: true,
    });
  }

  if (lines.length > 0) {
    for (let i = 0; i < lines.length; i++) {
      lines[i].isLastLine = i === lines.length - 1;
    }
  }

  return lines;
}

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

function calculateRungLayouts(rungs: Rung[], diagramWidth: number): RungLayout[] {
  const availableWidth = diagramWidth - RUNG_NUMBER_WIDTH - 2 * RAIL_WIDTH - 2 * INSTRUCTION_GAP;
  const layouts: RungLayout[] = [];
  let currentOffset = 0;

  for (const rung of rungs) {
    const lines = splitInstructionsIntoLines(rung.instructions, availableWidth);
    const height = lines.length > 0 ? calculateMultiLineRungHeight(lines) : MIN_RUNG_HEIGHT;
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

  const branchStartX = x;
  const branchEndX = x + maxWidth + 2 * BRANCH_CONNECTOR_OFFSET;
  const contentStartX = x + BRANCH_CONNECTOR_OFFSET;

  const topY = legYPositions[0];
  const bottomY = legYPositions[legYPositions.length - 1];

  return (
    <g className="branch-group">
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

function RungRenderer({ rung, rungIndex, yOffset, diagramWidth }: RungRendererProps) {
  const leftRailX = RUNG_NUMBER_WIDTH + RAIL_WIDTH + RAIL_VISUAL_WIDTH;
  const rightRailX = diagramWidth - RAIL_WIDTH - RAIL_VISUAL_WIDTH;
  const availableWidth = diagramWidth - RUNG_NUMBER_WIDTH - 2 * RAIL_WIDTH - 2 * INSTRUCTION_GAP;

  const lines = splitInstructionsIntoLines(rung.instructions, availableWidth);

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

        const conditions = line.instructions.filter(isCondition);
        const operations = line.instructions.filter(isOperation);
        const conditionsWidth = calculateTotalWidth(conditions);
        const operationsWidth = calculateTotalWidth(operations);
        const conditionsStartX = leftRailX + INSTRUCTION_GAP;

        return (
          <g key={lineIndex} className="rung-line">
            {/* Wire from left rail */}
            <line x1={leftRailX} y1={wireY} x2={conditionsStartX} y2={wireY} stroke="#333" strokeWidth="1" />

            {/* Conditions */}
            {(() => {
              let currentX = conditionsStartX;
              return conditions.map((instr, idx) => {
                const instrX = currentX;
                currentX += getDimensions(instr).width + INSTRUCTION_GAP;
                return <InstructionRenderer key={`c-${idx}`} instruction={instr} x={instrX} wireY={wireY} />;
              });
            })()}

            {/* Wire and Operations */}
            {line.isLastLine && operations.length > 0 ? (
              (() => {
                const conditionsEndX = conditionsStartX + conditionsWidth + (conditions.length > 0 ? INSTRUCTION_GAP : 0);
                const operationsEndX = rightRailX - INSTRUCTION_GAP;
                const operationsStartX = operationsEndX - operationsWidth;

                return (
                  <>
                    {/* Wire between conditions and operations */}
                    {operationsStartX > conditionsEndX && (
                      <line x1={conditionsEndX} y1={wireY} x2={operationsStartX} y2={wireY} stroke="#333" strokeWidth="1" />
                    )}

                    {/* Operations */}
                    {(() => {
                      let currentX = operationsStartX;
                      return operations.map((instr, idx) => {
                        const instrX = currentX;
                        currentX += getDimensions(instr).width + INSTRUCTION_GAP;
                        return <InstructionRenderer key={`o-${idx}`} instruction={instr} x={instrX} wireY={wireY} />;
                      });
                    })()}

                    {/* Wire to right rail */}
                    <line x1={operationsStartX + operationsWidth + INSTRUCTION_GAP} y1={wireY} x2={rightRailX} y2={wireY} stroke="#333" strokeWidth="1" />
                  </>
                );
              })()
            ) : (
              (() => {
                const conditionsEndX = conditionsStartX + conditionsWidth + (conditions.length > 0 ? INSTRUCTION_GAP : 0);
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
  height = 600,
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

  // Use ResizeObserver to track container width
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateWidth = () => {
      const newWidth = container.clientWidth;
      if (newWidth > 0) {
        setContainerWidth(newWidth);
      }
    };

    // Initial measurement
    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  // Use prop width if provided, otherwise use measured container width
  const width = widthProp || containerWidth;

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
        className={`ladder-diagram-container ${className}`}
        style={{
          overflow: 'auto',
          backgroundColor: '#fff',
          height,
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
        height,
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

        {/* Left power rail */}
        <rect x={RUNG_NUMBER_WIDTH} y="0" width={RAIL_VISUAL_WIDTH} height={totalHeight} fill="#3366cc" className="power-rail left-rail" />

        {/* Right power rail */}
        <rect x={width - RAIL_VISUAL_WIDTH} y="0" width={RAIL_VISUAL_WIDTH} height={totalHeight} fill="#3366cc" className="power-rail right-rail" />

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
      </svg>
    </div>
  );
}

export default VirtualizedLadderDiagram;
