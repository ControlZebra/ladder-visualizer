/**
 * SVG symbol definitions for ladder logic coils (OTE, OTL, OTU)
 * Studio 5000 style parentheses coils with energized state support
 */

/** Coil symbol dimensions */
export const COIL_WIDTH = 30;
export const COIL_HEIGHT = 20;
export const COIL_CENTER_Y = 10;

/** Colors for different states */
const WIRE_COLOR = '#333';
const ENERGIZED_COLOR = '#00aa00';
const ENERGIZED_FILL = '#90EE90';

/**
 * Create a Studio 5000-style coil symbol with parentheses arcs
 * The arc style matches RSLogix/Studio 5000
 */
function createCoilBase(innerText?: string, energized: boolean = false): string {
  const centerX = 15;
  const centerY = COIL_CENTER_Y;
  const arcHeight = 8;
  
  const strokeColor = energized ? ENERGIZED_COLOR : WIRE_COLOR;
  const strokeWidth = energized ? '2' : '1.5';
  const fillColor = energized ? ENERGIZED_FILL : 'transparent';
  
  // Left arc: curved line like (
  const leftArcX = centerX - 5;
  // Right arc: curved line like )
  const rightArcX = centerX + 5;
  
  let textElement = '';
  if (innerText) {
    textElement = `<text x="${centerX}" y="${centerY + 3}" text-anchor="middle" font-size="8" font-weight="bold" fill="${strokeColor}">${innerText}</text>`;
  }
  
  // Background rect for energized state
  const bgRect = energized ? 
    `<rect x="5" y="0" width="20" height="20" fill="${fillColor}" rx="10"/>` : '';
  
  return `
  <g class="coil ${energized ? 'energized' : ''}">
    ${bgRect}
    <line x1="0" y1="${centerY}" x2="6" y2="${centerY}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>
    <path d="M ${leftArcX} ${centerY - arcHeight} Q ${leftArcX - 5} ${centerY} ${leftArcX} ${centerY + arcHeight}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>
    <path d="M ${rightArcX} ${centerY - arcHeight} Q ${rightArcX + 5} ${centerY} ${rightArcX} ${centerY + arcHeight}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>
    ${textElement}
    <line x1="24" y1="${centerY}" x2="30" y2="${centerY}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>
  </g>
`;
}

/**
 * OTE (Output Energize) symbol: ─( )─
 */
export const CoilOTE = createCoilBase();

/**
 * OTE Energized
 */
export const CoilOTEEnergized = createCoilBase(undefined, true);

/**
 * OTL (Output Latch) symbol: ─(L)─
 */
export const CoilOTL = createCoilBase('L');

/**
 * OTL Energized
 */
export const CoilOTLEnergized = createCoilBase('L', true);

/**
 * OTU (Output Unlatch) symbol: ─(U)─
 */
export const CoilOTU = createCoilBase('U');

/**
 * OTU Energized
 */
export const CoilOTUEnergized = createCoilBase('U', true);

/**
 * Get coil symbol by mnemonic
 * @param mnemonic - The instruction mnemonic (OTE, OTL, OTU)
 * @param energized - Whether the coil is in energized state
 */
export function getCoilSymbol(mnemonic: string, energized: boolean = false): string {
  switch (mnemonic) {
    case 'OTE':
      return energized ? CoilOTEEnergized : CoilOTE;
    case 'OTL':
      return energized ? CoilOTLEnergized : CoilOTL;
    case 'OTU':
      return energized ? CoilOTUEnergized : CoilOTU;
    default:
      return energized ? CoilOTEEnergized : CoilOTE;
  }
}
