/** Coil symbol dimensions */
const COIL_CENTER_Y = 10;

/** Colors for different states */
const WIRE_COLOR = '#333';
const ENERGIZED_COLOR = '#00aa00';
const ENERGIZED_FILL = '#90EE90';

export interface CoilSymbolProps {
  mnemonic: 'OTE' | 'OTL' | 'OTU' | string;
  energized?: boolean;
}

/**
 * React SVG component for ladder logic coils (OTE, OTL, OTU)
 * Studio 5000 style parentheses coils with energized state support
 */
export function CoilSymbol({ mnemonic, energized = false }: CoilSymbolProps) {
  const centerX = 15;
  const centerY = COIL_CENTER_Y;
  const arcHeight = 8;

  const strokeColor = energized ? ENERGIZED_COLOR : WIRE_COLOR;
  const strokeWidth = energized ? 2 : 1.5;
  const fillColor = energized ? ENERGIZED_FILL : 'transparent';

  // Left arc: curved line like (
  const leftArcX = centerX - 5;
  // Right arc: curved line like )
  const rightArcX = centerX + 5;

  // Get inner text for latch/unlatch coils
  let innerText: string | undefined;
  if (mnemonic === 'OTL') innerText = 'L';
  if (mnemonic === 'OTU') innerText = 'U';

  return (
    <g className={`coil coil-${mnemonic.toLowerCase()} ${energized ? 'energized' : ''}`}>
      {/* Background for energized state */}
      {energized && (
        <rect x="5" y="0" width="20" height="20" fill={fillColor} rx="10" />
      )}
      
      {/* Left wire */}
      <line x1="0" y1={centerY} x2="6" y2={centerY} stroke={strokeColor} strokeWidth={strokeWidth} />
      
      {/* Left arc ( */}
      <path
        d={`M ${leftArcX} ${centerY - arcHeight} Q ${leftArcX - 5} ${centerY} ${leftArcX} ${centerY + arcHeight}`}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
      
      {/* Right arc ) */}
      <path
        d={`M ${rightArcX} ${centerY - arcHeight} Q ${rightArcX + 5} ${centerY} ${rightArcX} ${centerY + arcHeight}`}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
      
      {/* Inner text for OTL/OTU */}
      {innerText && (
        <text
          x={centerX}
          y={centerY + 3}
          textAnchor="middle"
          fontSize="8"
          fontWeight="bold"
          fill={strokeColor}
        >
          {innerText}
        </text>
      )}
      
      {/* Right wire */}
      <line x1="24" y1={centerY} x2="30" y2={centerY} stroke={strokeColor} strokeWidth={strokeWidth} />
    </g>
  );
}

export default CoilSymbol;
