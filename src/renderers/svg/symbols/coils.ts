/**
 * SVG symbol definitions for ladder logic coils (OTE, OTL, OTU)
 * Vendor-style parentheses coils like RSLogix
 */

/** Coil symbol dimensions */
export const COIL_WIDTH = 30;
export const COIL_HEIGHT = 20;
export const COIL_CENTER_Y = 10;

/**
 * Create a vendor-style coil symbol with parentheses arcs
 * The arc style matches RSLogix/Studio 5000
 */
function createCoilBase(innerText?: string): string {
  const centerX = 15;
  const centerY = COIL_CENTER_Y;
  const arcRadius = 6;
  const arcHeight = 8;
  
  // Left arc: curved line like (
  const leftArcX = centerX - 4;
  // Right arc: curved line like )
  const rightArcX = centerX + 4;
  
  let textElement = '';
  if (innerText) {
    textElement = `<text x="${centerX}" y="${centerY + 3}" text-anchor="middle" font-size="8" font-weight="bold" fill="currentColor">${innerText}</text>`;
  }
  
  return `
  <g>
    <line x1="0" y1="${centerY}" x2="7" y2="${centerY}" stroke="currentColor" stroke-width="1"/>
    <path d="M ${leftArcX} ${centerY - arcHeight} Q ${leftArcX - arcRadius} ${centerY} ${leftArcX} ${centerY + arcHeight}" fill="none" stroke="currentColor" stroke-width="1"/>
    <path d="M ${rightArcX} ${centerY - arcHeight} Q ${rightArcX + arcRadius} ${centerY} ${rightArcX} ${centerY + arcHeight}" fill="none" stroke="currentColor" stroke-width="1"/>
    ${textElement}
    <line x1="23" y1="${centerY}" x2="30" y2="${centerY}" stroke="currentColor" stroke-width="1"/>
  </g>
`;
}

/**
 * OTE (Output Energize) symbol: ─( )─
 */
export const CoilOTE = createCoilBase();

/**
 * OTL (Output Latch) symbol: ─(L)─
 */
export const CoilOTL = createCoilBase('L');

/**
 * OTU (Output Unlatch) symbol: ─(U)─
 */
export const CoilOTU = createCoilBase('U');

/**
 * Get coil symbol by mnemonic
 */
export function getCoilSymbol(mnemonic: string): string {
  switch (mnemonic) {
    case 'OTE':
      return CoilOTE;
    case 'OTL':
      return CoilOTL;
    case 'OTU':
      return CoilOTU;
    default:
      return CoilOTE;
  }
}
