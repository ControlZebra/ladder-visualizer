import type { CoilThemeProps } from '../../types/theme';

/** Coil symbol dimensions */
const COIL_CENTER_Y = 10;

/** Default colors for different states */
const DEFAULT_WIRE_COLOR = '#333333';
const DEFAULT_ENERGIZED_COLOR = '#00aa00';
const DEFAULT_ENERGIZED_FILL = '#90EE90';

export interface CoilSymbolProps extends CoilThemeProps {
  mnemonic: 'OTE' | 'OTL' | 'OTU' | string;
  energized?: boolean;
}

/**
 * React SVG component for ladder logic coils (OTE, OTL, OTU)
 * Studio 5000 style parentheses coils with energized state support
 * 
 * @param mnemonic - Coil type: 'OTE' (output energize), 'OTL' (latch), 'OTU' (unlatch)
 * @param energized - Whether the coil is energized (active)
 * @param color - Override stroke color for coil (default: #333)
 * @param energizedColor - Override energized state stroke color (default: #00aa00)
 * @param energizedFill - Override energized state fill color (default: #90EE90)
 */
export function CoilSymbol({ 
  mnemonic, 
  energized = false,
  color = DEFAULT_WIRE_COLOR,
  energizedColor = DEFAULT_ENERGIZED_COLOR,
  energizedFill = DEFAULT_ENERGIZED_FILL,
}: CoilSymbolProps) {
  const centerX = 15;
  const centerY = COIL_CENTER_Y;
  const arcHeight = 8;

  const strokeColor = energized ? energizedColor : color;
  const strokeWidth = energized ? 2 : 1.5;
  const fillColor = energized ? energizedFill : 'transparent';

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
