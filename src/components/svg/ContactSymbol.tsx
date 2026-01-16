/** Colors for different states */
const WIRE_COLOR = '#333';
const ENERGIZED_COLOR = '#00aa00';
const ENERGIZED_FILL = '#90EE90';

export interface ContactSymbolProps {
  mnemonic: 'XIC' | 'XIO' | string;
  energized?: boolean;
}

/**
 * React SVG component for ladder logic contacts (XIC, XIO)
 */
export function ContactSymbol({ mnemonic, energized = false }: ContactSymbolProps) {
  const strokeColor = energized ? ENERGIZED_COLOR : WIRE_COLOR;
  const strokeWidth = energized ? 2 : 1.5;
  const fillColor = energized ? ENERGIZED_FILL : 'transparent';

  if (mnemonic === 'XIO') {
    // XIO (Normally Closed Contact) symbol: ─┤/├─
    return (
      <g className={`contact contact-xio ${energized ? 'energized' : ''}`}>
        {energized && <rect x="6" y="0" width="18" height="20" fill={fillColor} rx="2" />}
        <line x1="0" y1="10" x2="8" y2="10" stroke={strokeColor} strokeWidth={strokeWidth} />
        <line x1="8" y1="2" x2="8" y2="18" stroke={strokeColor} strokeWidth={strokeWidth} />
        <line x1="10" y1="18" x2="20" y2="2" stroke={strokeColor} strokeWidth={strokeWidth} />
        <line x1="22" y1="2" x2="22" y2="18" stroke={strokeColor} strokeWidth={strokeWidth} />
        <line x1="22" y1="10" x2="30" y2="10" stroke={strokeColor} strokeWidth={strokeWidth} />
      </g>
    );
  }

  // XIC (Normally Open Contact) symbol: ─┤ ├─ (default)
  return (
    <g className={`contact contact-xic ${energized ? 'energized' : ''}`}>
      {energized && <rect x="6" y="0" width="18" height="20" fill={fillColor} rx="2" />}
      <line x1="0" y1="10" x2="8" y2="10" stroke={strokeColor} strokeWidth={strokeWidth} />
      <line x1="8" y1="2" x2="8" y2="18" stroke={strokeColor} strokeWidth={strokeWidth} />
      <line x1="22" y1="2" x2="22" y2="18" stroke={strokeColor} strokeWidth={strokeWidth} />
      <line x1="22" y1="10" x2="30" y2="10" stroke={strokeColor} strokeWidth={strokeWidth} />
    </g>
  );
}

export default ContactSymbol;
