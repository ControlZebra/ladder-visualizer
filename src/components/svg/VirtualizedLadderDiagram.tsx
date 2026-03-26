import { useMemo, useCallback, useState, useRef, useEffect, createContext, useContext } from 'react';
import type { 
  BranchGroup, 
  NormalizedRung,
  NormalizedRoutine,
  LadderDiagramTheme,
} from '../../types';
import { DEFAULT_THEME, mergeTheme } from '../../types';
import type { BranchGroupLayout, InstructionLayout, RungElementLayout, RungLayout } from '../../layout';
import {
  ADDRESS_LABEL_OFFSET,
  BRANCH_CONNECTOR_OFFSET,
  INSTRUCTION_GAP,
  MIN_RUNG_HEIGHT,
  RAIL_VISUAL_WIDTH,
  RUNG_NUMBER_WIDTH,
  SYMBOL_WIDTH,
  calculateMinDiagramWidth,
  calculateRungLayoutComplete,
  calculateRungLayouts,
  positionBranch,
} from '../../layout';
import { ContactSymbol } from './ContactSymbol';
import { CoilSymbol } from './CoilSymbol';
import { BoxSymbol } from './BoxSymbol';

// ============================================================================
// THEME CONTEXT
// ============================================================================

/**
 * Context for passing theme down to nested components.
 * Avoids prop drilling for deeply nested SVG elements.
 */
const LadderThemeContext = createContext<Required<LadderDiagramTheme>>(DEFAULT_THEME);

/**
 * Hook to access the current ladder diagram theme.
 */
export function useLadderTheme(): Required<LadderDiagramTheme> {
  return useContext(LadderThemeContext);
}

// ============================================================================
// REACT SVG COMPONENTS
// ============================================================================

/**
 * Renders an instruction from its layout
 */
function InstructionLayoutRenderer({ layout }: { layout: InstructionLayout }) {
  const theme = useLadderTheme();
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
            fill={theme.labelColor}
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
              fill={theme.addressColor}
              className="instruction-address"
            >
              {address}
            </text>
          )}
          {/* Connecting wires for centering */}
          {symbolOffset > 0 && (
            <>
              <line x1={position.x} y1={wireY} x2={position.x + symbolOffset} y2={wireY} stroke={theme.wireColor} strokeWidth="1" />
              <line x1={position.x + symbolOffset + SYMBOL_WIDTH} y1={wireY} x2={position.x + dimensions.width} y2={wireY} stroke={theme.wireColor} strokeWidth="1" />
            </>
          )}
        </>
      )}

      {/* Symbol */}
      <g transform={`translate(${symbolX}, ${position.y})`}>
        {instruction.category === 'input' && (
          <ContactSymbol 
            mnemonic={instruction.mnemonic} 
            color={theme.contactColor}
            ncColor={theme.contactNCColor}
            energizedColor={theme.energizedColor}
            energizedFill={theme.energizedFill}
          />
        )}
        {instruction.category === 'output' && (
          <CoilSymbol 
            mnemonic={instruction.mnemonic}
            color={theme.coilColor}
            energizedColor={theme.energizedColor}
            energizedFill={theme.energizedFill}
          />
        )}
        {!isContactOrCoil && (
          <BoxSymbol 
            mnemonic={instruction.mnemonic} 
            operands={instruction.operands}
            borderColor={theme.boxBorderColor}
            bgColor={theme.boxBgColor}
            textColor={theme.boxTextColor}
            energizedColor={theme.energizedColor}
          />
        )}
      </g>
    </g>
  );
}

/**
 * Renders a branch group from its layout
 */
function BranchLayoutRenderer({ layout }: { layout: BranchGroupLayout }) {
  const theme = useLadderTheme();
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
          <line x1={connectorLeftX} y1={topY} x2={connectorLeftX} y2={bottomY} stroke={theme.branchConnectorColor} strokeWidth="1" className="branch-connector" />
          <line x1={connectorRightX} y1={topY} x2={connectorRightX} y2={bottomY} stroke={theme.branchConnectorColor} strokeWidth="1" className="branch-connector" />
        </>
      )}

      {/* Render each leg */}
      {legs.map((leg, i) => {
        const contentStartX = connectorLeftX + BRANCH_CONNECTOR_OFFSET;

        return (
          <g key={i} className="branch-leg">
            {/* Wire from left connector to content start */}
            <line x1={connectorLeftX} y1={leg.wireY} x2={contentStartX} y2={leg.wireY} stroke={theme.wireColor} strokeWidth="1" />

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
                stroke={theme.wireColor}
                strokeWidth="1"
              />
            )}

            {/* Wire from content area to right connector */}
            <line
              x1={connectorRightX - BRANCH_CONNECTOR_OFFSET}
              y1={leg.wireY}
              x2={connectorRightX}
              y2={leg.wireY}
              stroke={theme.wireColor}
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
  rung: NormalizedRung;
  rungIndex: number;
  yOffset: number;
  diagramWidth: number;
}

function RungRenderer({ rung, rungIndex, yOffset, diagramWidth }: RungRendererProps) {
  const theme = useLadderTheme();
  const leftRailX = RUNG_NUMBER_WIDTH + RAIL_VISUAL_WIDTH;
  const rightRailX = diagramWidth - RAIL_VISUAL_WIDTH;

  // Calculate complete layout using the new algorithm
  const rungLayout = useMemo(
    () => calculateRungLayoutComplete(rung, rungIndex, yOffset, leftRailX, rightRailX),
    [rung, rungIndex, yOffset, leftRailX, rightRailX]
  );

  if (rungLayout.lines.length === 0) {
    const wireY = yOffset + MIN_RUNG_HEIGHT / 2;
    return (
      <g className="rung">
        <line x1={leftRailX} y1={wireY} x2={rightRailX} y2={wireY} stroke={theme.wireColor} strokeWidth="1" />
      </g>
    );
  }

  return (
    <g className="rung" data-rung-index={rungIndex}>
      {rungLayout.lines.map((line, lineIndex) => {
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
            <line x1={leftRailX} y1={line.wireY} x2={line.conditionsStartX} y2={line.wireY} stroke={theme.wireColor} strokeWidth="1" />

            {/* Render condition elements */}
            {line.conditions.map((layout, idx) => (
              <ElementLayoutRenderer key={`c-${idx}`} layout={layout} />
            ))}

            {/* Wire and Operations */}
            {line.operations.length > 0 ? (
              <>
                {/* Wire between conditions and operations */}
                {line.operationsStartX > conditionsEndX && (
                  <line x1={conditionsEndX} y1={line.wireY} x2={line.operationsStartX} y2={line.wireY} stroke={theme.wireColor} strokeWidth="1" />
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
                    <line x1={operationsEndX} y1={line.wireY} x2={rightRailX} y2={line.wireY} stroke={theme.wireColor} strokeWidth="1" />
                  );
                })()}
              </>
            ) : (
              /* Wire to right rail when no operations */
              <line x1={conditionsEndX} y1={line.wireY} x2={rightRailX} y2={line.wireY} stroke={theme.wireColor} strokeWidth="1" />
            )}
          </g>
        );
      })}
    </g>
  );
}

// ============================================================================
// SCROLLABLE RUNG ROW COMPONENT
// ============================================================================

interface ScrollableRungRowProps {
  rung: NormalizedRung;
  rungIndex: number;
  layout: RungLayout;
  containerWidth: number;
  rowBg: string;
  powerRailColor: string;
  rungNumberColor: string;
  rungNumberBg: string;
  borderColor: string;
}

/**
 * Renders a single rung row with optional horizontal scrolling
 * If content fits, renders normally. If content overflows, adds scroll with indicators.
 */
function ScrollableRungRow({ 
  rung, 
  rungIndex, 
  layout, 
  containerWidth, 
  rowBg, 
  powerRailColor,
  rungNumberColor,
  rungNumberBg,
  borderColor,
}: ScrollableRungRowProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [maxScroll, setMaxScroll] = useState(0);
  
  // Drag-to-scroll state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartScrollLeft, setDragStartScrollLeft] = useState(0);

  const contentWidth = layout.contentWidth;
  const availableWidth = containerWidth;
  const needsScroll = contentWidth > availableWidth;
  const rungWidth = needsScroll ? contentWidth : availableWidth;

  // Update max scroll on mount and when dimensions change
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container && needsScroll) {
      setMaxScroll(container.scrollWidth - container.clientWidth);
    }
  }, [needsScroll, contentWidth, availableWidth]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    setScrollLeft(container.scrollLeft);
    setMaxScroll(container.scrollWidth - container.clientWidth);
  }, []);

  const handleScrollLeft = useCallback(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollBy({ left: -150, behavior: 'smooth' });
    }
  }, []);

  const handleScrollRight = useCallback(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollBy({ left: 150, behavior: 'smooth' });
    }
  }, []);

  // Drag-to-scroll handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!needsScroll) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    
    setIsDragging(true);
    setDragStartX(e.pageX);
    setDragStartScrollLeft(container.scrollLeft);
    container.style.cursor = 'grabbing';
    container.style.userSelect = 'none';
  }, [needsScroll]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    
    e.preventDefault();
    const deltaX = e.pageX - dragStartX;
    container.scrollLeft = dragStartScrollLeft - deltaX;
  }, [isDragging, dragStartX, dragStartScrollLeft]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    const container = scrollContainerRef.current;
    if (container) {
      container.style.cursor = needsScroll ? 'grab' : 'default';
      container.style.userSelect = '';
    }
    setIsDragging(false);
  }, [isDragging, needsScroll]);

  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      handleMouseUp();
    }
  }, [isDragging, handleMouseUp]);

  const showLeftIndicator = needsScroll && scrollLeft > 5;
  const showRightIndicator = needsScroll && scrollLeft < maxScroll - 5;

  return (
    <div
      style={{
        position: 'relative',
        height: layout.height,
        width: availableWidth,
        backgroundColor: rowBg,
      }}
    >
      {/* Fixed rung number cell */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: RUNG_NUMBER_WIDTH,
          height: layout.height,
          backgroundColor: rungNumberBg,
          borderRight: `1px solid ${borderColor}`,
          borderBottom: `1px solid ${borderColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 500,
          color: rungNumberColor,
          zIndex: 2,
        }}
      >
        {rungIndex}
      </div>

      {/* Scrollable content area */}
      <div
        ref={scrollContainerRef}
        onScroll={needsScroll ? handleScroll : undefined}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{
          position: 'absolute',
          left: RUNG_NUMBER_WIDTH,
          top: 0,
          right: 0,
          height: layout.height,
          overflowX: needsScroll ? 'auto' : 'hidden',
          overflowY: 'hidden',
          scrollbarWidth: 'none', // Firefox
          msOverflowStyle: 'none', // IE/Edge
          cursor: needsScroll ? 'grab' : 'default',
        }}
        className="rung-scroll-container"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={rungWidth - RUNG_NUMBER_WIDTH}
          height={layout.height}
          viewBox={`${RUNG_NUMBER_WIDTH} 0 ${rungWidth - RUNG_NUMBER_WIDTH} ${layout.height}`}
          style={{ 
            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
            display: 'block',
          }}
        >
          {/* Background */}
          <rect x={RUNG_NUMBER_WIDTH} y={0} width={rungWidth - RUNG_NUMBER_WIDTH} height={layout.height} fill={rowBg} />
          
          {/* Left power rail */}
          <rect
            x={RUNG_NUMBER_WIDTH}
            y={0}
            width={RAIL_VISUAL_WIDTH}
            height={layout.height}
            fill={powerRailColor}
          />
          
          {/* Right power rail */}
          <rect
            x={rungWidth - RAIL_VISUAL_WIDTH}
            y={0}
            width={RAIL_VISUAL_WIDTH}
            height={layout.height}
            fill={powerRailColor}
          />

          {/* Rung content */}
          <RungRenderer
            rung={rung}
            rungIndex={rungIndex}
            yOffset={0}
            diagramWidth={rungWidth}
          />
        </svg>
      </div>

      {/* Left overflow indicator */}
      {showLeftIndicator && (
        <div
          onClick={handleScrollLeft}
          style={{
            position: 'absolute',
            left: RUNG_NUMBER_WIDTH,
            top: 0,
            width: 48,
            height: layout.height,
            background: 'linear-gradient(to right, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0.03) 40%, rgba(183, 183, 183, 0) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingLeft: 6,
            cursor: 'pointer',
            zIndex: 1,
            borderLeft: '3px solid rgba(60, 60, 60, 0.7)',
            transition: 'background 0.2s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(to right, rgba(60, 60, 60, 0.45) 0%, rgba(80, 80, 80, 0.25) 40%, rgba(255, 255, 255, 0) 100%)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(to right, rgba(0, 0, 0, 0.35) 0%, rgba(0, 0, 0, 0.2) 40%, rgba(255, 255, 255, 0) 100%)'}
        >
          <svg 
            width="18" 
            height="18" 
            viewBox="0 0 16 16" 
            fill="none"
            className="pulse-arrow-left"
          >
            <path
              d="M10 12L6 8L10 4"
              stroke="#444"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}

      {/* Right overflow indicator */}
      {showRightIndicator && (
        <div
          onClick={handleScrollRight}
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: 48,
            height: layout.height,
            background: 'linear-gradient(to left, rgba(80, 80, 80, 0.35) 0%, rgba(100, 100, 100, 0.2) 40%, rgba(255, 255, 255, 0) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingRight: 6,
            cursor: 'pointer',
            zIndex: 1,
            borderRight: '3px solid rgba(60, 60, 60, 0.7)',
            transition: 'background 0.2s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(to left, rgba(60, 60, 60, 0.45) 0%, rgba(80, 80, 80, 0.25) 40%, rgba(255, 255, 255, 0) 100%)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(to left, rgba(80, 80, 80, 0.35) 0%, rgba(100, 100, 100, 0.2) 40%, rgba(255, 255, 255, 0) 100%)'}
        >
          <svg 
            width="18" 
            height="18" 
            viewBox="0 0 16 16" 
            fill="none"
            className="pulse-arrow-right"
          >
            <path
              d="M6 4L10 8L6 12"
              stroke="#444"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}

      {/* CSS to hide scrollbar and pulse animation */}
      <style>{`
        .rung-scroll-container::-webkit-scrollbar {
          display: none;
        }
        
        @keyframes pulseLeft {
          0%, 100% {
            opacity: 0.4;
            transform: translateX(0);
          }
          50% {
            opacity: 1;
            transform: translateX(-3px);
          }
        }
        
        @keyframes pulseRight {
          0%, 100% {
            opacity: 0.4;
            transform: translateX(0);
          }
          50% {
            opacity: 1;
            transform: translateX(3px);
          }
        }
        
        .pulse-arrow-left {
          animation: pulseLeft 1.5s ease-in-out infinite;
        }
        
        .pulse-arrow-right {
          animation: pulseRight 1.5s ease-in-out infinite;
        }
        
        .pulse-arrow-left:hover,
        .pulse-arrow-right:hover {
          animation: none;
          opacity: 1;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// VIRTUALIZED LADDER DIAGRAM
// ============================================================================

export interface VirtualizedLadderDiagramProps {
  /** Parsed routine to display */
  routine?: NormalizedRoutine;
  /** Array of rungs to display (alternative to routine prop) */
  rungs?: NormalizedRung[];
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
  /** Number of rungs to render above/below visible area */
  overscan?: number;
  /** 
   * Theme colors for the ladder diagram.
   * Override specific colors or pass a complete theme object.
   * If not provided, uses CSS custom properties with DEFAULT_THEME as fallback.
   */
  theme?: LadderDiagramTheme;
}

export function VirtualizedLadderDiagram({
  routine,
  rungs: rungsProp,
  width: widthProp,
  height: heightProp,
  className = '',
  style,
  overscan = 3,
  theme: themeProp,
}: VirtualizedLadderDiagramProps) {
  // Merge provided theme with defaults
  const theme = useMemo(() => mergeTheme(themeProp), [themeProp]);
  
  const rungs = useMemo<NormalizedRung[]>(() => {
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

  // Use prop height if provided, otherwise use measured container height
  const height = heightProp || containerHeight;
  
  // Use container width for layout calculations (not inflated by content)
  const displayWidth = widthProp || containerWidth;

  // Calculate layouts using the max of display width and content width for proper positioning
  const rungLayouts = useMemo(() => calculateRungLayouts(rungs, Math.max(displayWidth, calculateMinDiagramWidth(rungs))), [rungs, displayWidth]);
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
          backgroundColor: theme.bgPrimary,
          flex: 1,
          minHeight: 0,
          ...style,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 100,
            color: theme.textMuted,
            fontSize: 13,
            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          }}
        >
          No rungs to display
        </div>
      </div>
    );
  }

  return (
    <LadderThemeContext.Provider value={theme}>
      <div
        ref={containerRef}
        className={`ladder-diagram-container virtualized ${className}`}
        style={{
          overflowX: 'hidden',
          overflowY: 'auto',
          backgroundColor: theme.bgPrimary,
          flex: 1,
          minHeight: 0,
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          ...style,
        }}
        onScroll={handleScroll}
      >
        {/* Virtualized content wrapper */}
        <div
          style={{
            position: 'relative',
            height: totalHeight,
            width: displayWidth,
          }}
        >
          {/* Visible rungs */}
          {rungs.slice(visibleRange.startIndex, visibleRange.endIndex + 1).map((rung, idx) => {
            const actualIndex = visibleRange.startIndex + idx;
            const layout = rungLayouts[actualIndex];
            const rowBg = actualIndex % 2 === 0 ? theme.rowEvenBg : theme.rowOddBg;

            return (
              <div
                key={actualIndex}
                style={{
                  position: 'absolute',
                  top: layout.offset,
                  left: 0,
                  width: displayWidth,
                }}
              >
                <ScrollableRungRow
                  rung={rung}
                  rungIndex={actualIndex}
                  layout={layout}
                  containerWidth={displayWidth}
                  rowBg={rowBg}
                  powerRailColor={theme.powerRailColor}
                  rungNumberColor={theme.rungNumberColor}
                  rungNumberBg={theme.rungNumberBg}
                  borderColor={theme.borderColor}
                />
              </div>
            );
          })}
        </div>
      </div>
    </LadderThemeContext.Provider>
  );
}

export default VirtualizedLadderDiagram;
