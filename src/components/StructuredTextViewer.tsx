import { useMemo, CSSProperties } from 'react';
import type { NormalizedRoutine } from '../types/normalized';
import { structuredTextDefaults, uiDefaults } from '../styles/cssDefaults';

// ============================================================================
// TYPES
// ============================================================================

export interface StructuredTextViewerProps {
  /** The routine containing ST content */
  routine: NormalizedRoutine;
  /** Custom styles for the container */
  style?: CSSProperties;
  /** Custom class name */
  className?: string;
  /** Show line numbers (default: true) */
  showLineNumbers?: boolean;
  /** Font size in pixels (default: 14) */
  fontSize?: number;
}

/**
 * Structured Text (ST) code viewer with syntax highlighting.
 * 
 * Supports theming via CSS custom properties:
 * - `--st-bg`: Background color
 * - `--st-text`: Default text color
 * - `--st-line-number-color`: Line number color
 * - `--st-line-number-border`: Line number border color
 * - `--st-empty-state-color`: Empty state message color
 * - `--st-keyword-color`: Keyword color (IF, THEN, ELSE, etc.)
 * - `--st-type-color`: Type color (BOOL, INT, REAL, etc.)
 * - `--st-function-color`: Function color (TON, MOV, ADD, etc.)
 * - `--st-string-color`: String literal color
 * - `--st-number-color`: Number literal color
 * - `--st-comment-color`: Comment color
 * - `--st-operator-color`: Operator color
 * - `--st-identifier-color`: Identifier/variable color
 * - `--lv-font-mono`: Monospace font family
 */

// ============================================================================
// ST SYNTAX HIGHLIGHTING PATTERNS
// ============================================================================

// IEC 61131-3 Structured Text keywords
const ST_KEYWORDS = new Set([
  // Control flow
  'IF', 'THEN', 'ELSE', 'ELSIF', 'END_IF',
  'CASE', 'OF', 'END_CASE',
  'FOR', 'TO', 'BY', 'DO', 'END_FOR',
  'WHILE', 'END_WHILE',
  'REPEAT', 'UNTIL', 'END_REPEAT',
  'EXIT', 'RETURN',
  // Variable declarations
  'VAR', 'VAR_INPUT', 'VAR_OUTPUT', 'VAR_IN_OUT', 'VAR_TEMP', 'VAR_GLOBAL', 'END_VAR',
  'CONSTANT', 'RETAIN', 'AT',
  // Program structure
  'PROGRAM', 'END_PROGRAM',
  'FUNCTION', 'END_FUNCTION',
  'FUNCTION_BLOCK', 'END_FUNCTION_BLOCK',
  // Types
  'TYPE', 'END_TYPE', 'STRUCT', 'END_STRUCT', 'ARRAY', 'OF', 'STRING',
  // Boolean operators
  'AND', 'OR', 'XOR', 'NOT', 'MOD',
  // Other
  'TRUE', 'FALSE', 'NULL',
]);

// IEC 61131-3 data types
const ST_TYPES = new Set([
  'BOOL', 'BYTE', 'WORD', 'DWORD', 'LWORD',
  'SINT', 'INT', 'DINT', 'LINT',
  'USINT', 'UINT', 'UDINT', 'ULINT',
  'REAL', 'LREAL',
  'TIME', 'DATE', 'TIME_OF_DAY', 'TOD', 'DATE_AND_TIME', 'DT',
  'STRING', 'WSTRING', 'CHAR', 'WCHAR',
]);

// Common PLC function names (Rockwell/Allen-Bradley)
const ST_FUNCTIONS = new Set([
  // Math
  'ABS', 'SQRT', 'LN', 'LOG', 'EXP', 'SIN', 'COS', 'TAN', 'ASIN', 'ACOS', 'ATAN',
  'ADD', 'SUB', 'MUL', 'DIV', 'NEG',
  // Comparison
  'EQU', 'NEQ', 'GRT', 'GEQ', 'LES', 'LEQ', 'CMP',
  // Bit operations
  'AND', 'OR', 'XOR', 'NOT', 'BTD', 'BTDT',
  // Timers/Counters
  'TON', 'TOF', 'RTO', 'CTU', 'CTD', 'CTUD', 'RES',
  // Move/Copy
  'MOV', 'MVM', 'MVMT', 'BTD', 'CLR', 'SWPB', 'COP', 'CPS', 'FLL',
  // Array
  'FAL', 'FSC', 'COP', 'FLL', 'AVE', 'SRT', 'STD', 'SIZE',
  // File/Shift
  'BSL', 'BSR', 'FFL', 'FFU', 'LFL', 'LFU',
  // Sequencer
  'SQI', 'SQO', 'SQL',
  // PID
  'PID', 'PIDE',
  // Program control
  'JSR', 'RET', 'SBR', 'JMP', 'LBL', 'MCR', 'AFI', 'NOP', 'EOT', 'TND',
  // I/O
  'MSG', 'GSV', 'SSV', 'IOT',
  // Type conversion
  'TRUNC', 'FRD', 'TOD', 'DEG', 'RAD',
]);

// ============================================================================
// SYNTAX HIGHLIGHTER
// ============================================================================

interface TokenSpan {
  text: string;
  className: string;
}

interface HighlightedLine {
  spans: TokenSpan[];
  inBlockComment: boolean;
}

/**
 * Tokenize and highlight a line of Structured Text while carrying multiline
 * block-comment state from the preceding source line.
 */
function highlightLine(line: string, initialInBlockComment = false): HighlightedLine {
  const spans: TokenSpan[] = [];
  let inBlockComment = initialInBlockComment;
  let i = 0;

  while (i < line.length) {
    if (inBlockComment) {
      const endIdx = line.indexOf('*)', i);
      if (endIdx === -1) {
        spans.push({ text: line.slice(i), className: 'st-comment' });
        i = line.length;
      } else {
        spans.push({ text: line.slice(i, endIdx + 2), className: 'st-comment' });
        i = endIdx + 2;
        inBlockComment = false;
      }
      continue;
    }

    // Skip whitespace
    if (/\s/.test(line[i])) {
      let ws = '';
      while (i < line.length && /\s/.test(line[i])) {
        ws += line[i];
        i++;
      }
      spans.push({ text: ws, className: '' });
      continue;
    }

    // Single-line comment
    if (line.slice(i, i + 2) === '//') {
      spans.push({ text: line.slice(i), className: 'st-comment' });
      break;
    }

    // Block comment start
    if (line.slice(i, i + 2) === '(*') {
      inBlockComment = true;
      continue;
    }

    // String literal
    if (line[i] === "'" || line[i] === '"') {
      const quote = line[i];
      let str = quote;
      i++;
      while (i < line.length && line[i] !== quote) {
        if (line[i] === '\\' && i + 1 < line.length) {
          str += line[i] + line[i + 1];
          i += 2;
        } else {
          str += line[i];
          i++;
        }
      }
      if (i < line.length) {
        str += line[i];
        i++;
      }
      spans.push({ text: str, className: 'st-string' });
      continue;
    }

    // Number (including hex, binary, time literals)
    if (/[0-9]/.test(line[i]) || (line[i] === '#' && i + 1 < line.length)) {
      let num = '';
      // Handle time literals like T#5s, PT#100ms
      if (line[i] === '#' || (i > 0 && /[A-Z]/.test(line[i - 1]))) {
        // Already captured the prefix
      }
      // Check for hex (16#), binary (2#), etc.
      while (i < line.length && /[0-9A-Fa-f#_.]/.test(line[i])) {
        num += line[i];
        i++;
      }
      // Include time suffixes
      while (i < line.length && /[smhd]/.test(line[i].toLowerCase())) {
        num += line[i];
        i++;
      }
      spans.push({ text: num, className: 'st-number' });
      continue;
    }

    // Identifier or keyword
    if (/[A-Za-z_]/.test(line[i])) {
      let ident = '';
      while (i < line.length && /[A-Za-z0-9_]/.test(line[i])) {
        ident += line[i];
        i++;
      }
      const upper = ident.toUpperCase();
      if (ST_KEYWORDS.has(upper)) {
        spans.push({ text: ident, className: 'st-keyword' });
      } else if (ST_TYPES.has(upper)) {
        spans.push({ text: ident, className: 'st-type' });
      } else if (ST_FUNCTIONS.has(upper)) {
        spans.push({ text: ident, className: 'st-function' });
      } else {
        spans.push({ text: ident, className: 'st-identifier' });
      }
      continue;
    }

    // Operators and punctuation
    const operators = [':=', '<=', '>=', '<>', '**', '..', '=>'];
    let matched = false;
    for (const op of operators) {
      if (line.slice(i, i + op.length) === op) {
        spans.push({ text: op, className: 'st-operator' });
        i += op.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // Single character operators/punctuation
    if (/[+\-*/=<>()[\]{};:,.]/.test(line[i])) {
      spans.push({ text: line[i], className: 'st-operator' });
      i++;
      continue;
    }

    // Fallback: single character
    spans.push({ text: line[i], className: '' });
    i++;
  }

  return { spans, inBlockComment };
}

// ============================================================================
// STYLES
// ============================================================================

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    overflow: 'hidden',
    backgroundColor: `var(--st-bg, ${structuredTextDefaults.bg})`,
    fontFamily: `var(--lv-font-mono, ${uiDefaults.fontMono})`,
  },
  scrollContainer: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'auto',
    padding: '16px',
  },
  codeContainer: {
    display: 'table',
    width: '100%',
    borderCollapse: 'collapse',
  },
  line: {
    display: 'table-row',
  },
  lineNumber: {
    display: 'table-cell',
    textAlign: 'right',
    paddingRight: '16px',
    paddingLeft: '8px',
    userSelect: 'none',
    color: `var(--st-line-number-color, ${structuredTextDefaults.lineNumberColor})`,
    borderRight: `1px solid var(--st-line-number-border, ${structuredTextDefaults.lineNumberBorder})`,
    width: '1%',
    whiteSpace: 'nowrap',
  },
  lineContent: {
    display: 'table-cell',
    paddingLeft: '16px',
    whiteSpace: 'pre',
    color: `var(--st-text, ${structuredTextDefaults.text})`,
  },
  emptyState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: `var(--st-empty-state-color, ${structuredTextDefaults.emptyStateColor})`,
    fontSize: '14px',
  },
};

// Syntax highlighting CSS classes using CSS variables
const syntaxStyles: Record<string, CSSProperties> = {
  'st-keyword': { color: `var(--st-keyword-color, ${structuredTextDefaults.keywordColor})`, fontWeight: 'bold' },
  'st-type': { color: `var(--st-type-color, ${structuredTextDefaults.typeColor})` },
  'st-function': { color: `var(--st-function-color, ${structuredTextDefaults.functionColor})` },
  'st-string': { color: `var(--st-string-color, ${structuredTextDefaults.stringColor})` },
  'st-number': { color: `var(--st-number-color, ${structuredTextDefaults.numberColor})` },
  'st-comment': { color: `var(--st-comment-color, ${structuredTextDefaults.commentColor})`, fontStyle: 'italic' },
  'st-operator': { color: `var(--st-operator-color, ${structuredTextDefaults.operatorColor})` },
  'st-identifier': { color: `var(--st-identifier-color, ${structuredTextDefaults.identifierColor})` },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function StructuredTextViewer({
  routine,
  style,
  className,
  showLineNumbers = true,
  fontSize = 14,
}: StructuredTextViewerProps) {
  // Get ST content or empty array
  const stLines = useMemo(() => {
    return routine.stContent || [];
  }, [routine.stContent]);

  // Build the full text with line numbers for display
  const highlightedLines = useMemo(() => {
    // Sort lines by number
    const sortedLines = [...stLines].sort((a, b) => a.number - b.number);
    let inBlockComment = false;

    return sortedLines.map(line => {
      const highlighted = highlightLine(line.text, inBlockComment);
      inBlockComment = highlighted.inBlockComment;
      return {
        number: line.number,
        spans: highlighted.spans,
      };
    });
  }, [stLines]);

  if (routine.type !== 'ST') {
    return (
      <div style={{ ...styles.container, ...style }} className={className}>
        <div style={styles.emptyState}>
          This viewer only supports Structured Text (ST) routines.
          <br />
          Current routine type: {routine.type}
        </div>
      </div>
    );
  }

  if (stLines.length === 0) {
    return (
      <div style={{ ...styles.container, ...style }} className={className}>
        <div style={styles.emptyState}>
          No Structured Text content in this routine.
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...styles.container, ...style }} className={className}>
      <div style={styles.scrollContainer}>
        <div style={{ ...styles.codeContainer, fontSize }}>
          {highlightedLines.map((line, index) => (
            <div key={index} style={styles.line}>
              {showLineNumbers && (
                <span style={{ ...styles.lineNumber, fontSize }}>
                  {line.number}
                </span>
              )}
              <span style={{ ...styles.lineContent, fontSize }}>
                {line.spans.map((span, spanIndex) => (
                  <span
                    key={spanIndex}
                    style={span.className ? syntaxStyles[span.className] : undefined}
                  >
                    {span.text}
                  </span>
                ))}
                {line.spans.length === 0 && '\u00A0'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default StructuredTextViewer;
