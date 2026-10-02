import { useMemo, type CSSProperties } from 'react';
import type { NormalizedRoutine } from '../types/normalized';
import { structuredTextDefaults, uiDefaults } from '../styles/cssDefaults';

export interface RawRoutineViewerProps {
  routine: NormalizedRoutine;
  className?: string;
  style?: CSSProperties;
  showLineNumbers?: boolean;
  fontSize?: number;
}

/** Read-only original routine XML. Source is rendered as text, never HTML. */
export function RawRoutineViewer({
  routine,
  className,
  style,
  showLineNumbers = true,
  fontSize = 14,
}: RawRoutineViewerProps) {
  const text = routine.rawSource?.text;
  const lineNumbers = useMemo(() => text === undefined ? '' :
    text.split(/\r\n|\r|\n/).map((_, index) => index + 1).join('\n'), [text]);
  const codeStyle: CSSProperties = {
    margin: 0,
    fontFamily: `var(--lv-font-mono, ${uiDefaults.fontMono})`,
    fontSize,
    lineHeight: '1.6',
    whiteSpace: 'pre',
    tabSize: 2,
  };

  return (
    <div className={className} style={{
      height: '100%', minHeight: 0, minWidth: 0, overflow: 'auto',
      backgroundColor: `var(--st-bg, ${structuredTextDefaults.bg})`,
      color: `var(--st-text, ${structuredTextDefaults.text})`,
      ...style,
    }} role="region" aria-label={`${routine.name} XML source`} tabIndex={0}>
      {text === undefined ? (
        <p style={{ padding: 16 }}>Original XML source is unavailable for this routine.</p>
      ) : (
        <div style={{ display: 'flex', width: 'max-content', minWidth: '100%', padding: '8px 0' }}>
          {showLineNumbers && (
            <pre aria-hidden="true" style={{
              ...codeStyle, padding: '0 12px', textAlign: 'right', userSelect: 'none',
              color: `var(--st-line-number-color, ${structuredTextDefaults.lineNumberColor})`,
              borderRight: `1px solid var(--st-line-number-border, ${structuredTextDefaults.lineNumberBorder})`,
            }}>{lineNumbers}</pre>
          )}
          <pre style={{ ...codeStyle, padding: '0 16px' }}><code style={{ font: 'inherit' }}>{text}</code></pre>
        </div>
      )}
    </div>
  );
}
