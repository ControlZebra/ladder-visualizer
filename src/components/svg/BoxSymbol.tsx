import { globalInstructionRegistry } from '../../types/instruction-registry';
import type { BoxThemeProps } from '../../types/theme';
import { DEFAULT_THEME } from '../../types/theme';

const LINE_HEIGHT = 16;
const CHAR_WIDTH = 7;
const PADDING = 10;
const CONNECTOR_LENGTH = 10;

/** Full instruction names mapping */
const INSTRUCTION_NAMES: Record<string, string> = {
  // Compare
  'EQU': 'Equal',
  'NEQ': 'Not Equal',
  'GEQ': 'Greater Than or Eql (A>=B)',
  'LEQ': 'Less Than or Eql (A<=B)',
  'GRT': 'Greater Than (A>B)',
  'LES': 'Less Than (A<B)',
  'LIM': 'Limit',
  // Math
  'ADD': 'Add',
  'SUB': 'Subtract',
  'MUL': 'Multiply',
  'DIV': 'Divide',
  'MOV': 'Move',
  'CPT': 'Compute',
  'ATN': 'Arc Tangent',
  'XPY': 'X To Power of Y',
  'SQR': 'Square Root',
  // Timer
  'TON': 'Timer On Delay',
  'TOF': 'Timer Off Delay',
  'RTO': 'Retentive Timer On',
  // Counter
  'CTU': 'Count Up',
  'CTD': 'Count Down',
  'RES': 'Reset',
  // Other
  'NOP': 'No Operation',
  'ONS': 'One Shot',
  'JSR': 'Jump to Subroutine',
  'RET': 'Return',
  'AFI': 'Always False',
};

/** Parameter labels for different instruction types */
const PARAM_LABELS: Record<string, string[]> = {
  // Compare instructions
  'EQU': ['Source A', 'Source B'],
  'NEQ': ['Source A', 'Source B'],
  'GEQ': ['Source A', 'Source B'],
  'LEQ': ['Source A', 'Source B'],
  'GRT': ['Source A', 'Source B'],
  'LES': ['Source A', 'Source B'],
  'LIM': ['Low Limit', 'Test', 'High Limit'],
  // Math instructions
  'ADD': ['Source A', 'Source B', 'Dest'],
  'SUB': ['Source A', 'Source B', 'Dest'],
  'MUL': ['Source A', 'Source B', 'Dest'],
  'DIV': ['Source A', 'Source B', 'Dest'],
  'MOV': ['Source', 'Dest'],
  'CPT': ['Dest', 'Expression'],
  'ATN': ['Source', 'Dest'],
  'XPY': ['Source A', 'Source B', 'Dest'],
  'SQR': ['Source', 'Dest'],
  // Timer instructions
  'TON': ['Timer', 'Preset', 'Accum'],
  'TOF': ['Timer', 'Preset', 'Accum'],
  'RTO': ['Timer', 'Preset', 'Accum'],
  // Counter instructions
  'CTU': ['Counter', 'Preset', 'Accum'],
  'CTD': ['Counter', 'Preset', 'Accum'],
  'RES': ['Structure'],
};

function getTextWidth(text: string): number {
  return text.length * CHAR_WIDTH;
}

function getInstructionName(mnemonic: string): string {
  // First check hardcoded map
  if (INSTRUCTION_NAMES[mnemonic]) {
    return INSTRUCTION_NAMES[mnemonic];
  }
  // Then check the instruction registry (for AOIs and dynamically registered instructions)
  const registryName = globalInstructionRegistry.getDisplayName(mnemonic);
  return registryName || mnemonic;
}

function getParamLabels(mnemonic: string): string[] {
  // First check hardcoded map
  if (PARAM_LABELS[mnemonic]) {
    return PARAM_LABELS[mnemonic];
  }
  // Then check the instruction registry (for AOIs and dynamically registered instructions)
  const registryLabels = globalInstructionRegistry.getParameterLabels(mnemonic);
  return registryLabels.length > 0 ? registryLabels : [];
  return PARAM_LABELS[mnemonic] || [];
}

export interface BoxDimensions {
  width: number;
  height: number;
  centerY: number;
}

export function calculateBoxDimensions(mnemonic: string, operands: string[]): BoxDimensions {
  const instructionName = getInstructionName(mnemonic);
  const paramLabels = getParamLabels(mnemonic);

  let maxContentWidth = getTextWidth(instructionName);
  maxContentWidth = Math.max(maxContentWidth, getTextWidth(mnemonic) + 20);

  operands.forEach((op, i) => {
    const label = paramLabels[i] || `Param ${i + 1}`;
    const lineWidth = getTextWidth(label) + 20 + getTextWidth(op);
    maxContentWidth = Math.max(maxContentWidth, lineWidth);
  });

  const boxWidth = Math.max(120, maxContentWidth + PADDING * 2);
  const headerHeight = LINE_HEIGHT * 2 + 8;
  const contentHeight = Math.max(1, operands.length) * LINE_HEIGHT + PADDING;
  const boxHeight = headerHeight + contentHeight;

  return {
    width: boxWidth + CONNECTOR_LENGTH * 2,
    height: boxHeight,
    centerY: boxHeight / 2,
  };
}

export interface BoxSymbolProps extends BoxThemeProps {
  mnemonic: string;
  operands: string[];
  energized?: boolean;
}

/**
 * React SVG component for boxed instructions (timers, counters, math, compare)
 * 
 * @param mnemonic - Instruction mnemonic (e.g., 'TON', 'ADD', 'EQU')
 * @param operands - Array of operand values
 * @param energized - Whether the instruction is energized (active)
 * @param borderColor - Override border/stroke color (default: currentColor)
 * @param bgColor - Override background fill color (default: none)
 * @param textColor - Override text color (default: inherits from borderColor)
 * @param energizedColor - Override energized state stroke color (default: DEFAULT_THEME.energizedColor)
 */
export function BoxSymbol({ 
  mnemonic, 
  operands = [], 
  energized = false,
  borderColor = 'currentColor',
  bgColor,
  textColor,
  energizedColor = DEFAULT_THEME.energizedColor,
}: BoxSymbolProps) {
  const instructionName = getInstructionName(mnemonic);
  const paramLabels = getParamLabels(mnemonic);
  const dims = calculateBoxDimensions(mnemonic, operands);

  const boxWidth = dims.width - CONNECTOR_LENGTH * 2;
  const boxHeight = dims.height;
  const centerY = dims.centerY;
  const separatorY = LINE_HEIGHT * 2 + 4;
  const paramStartY = LINE_HEIGHT * 2 + 16;

  const strokeColor = energized ? energizedColor : borderColor;
  const fillColor = textColor || strokeColor;

  return (
    <g className={`box-instruction box-${mnemonic.toLowerCase()} ${energized ? 'energized' : ''}`}>
      {/* Left connector */}
      <line
        x1="0"
        y1={centerY}
        x2={CONNECTOR_LENGTH}
        y2={centerY}
        stroke={strokeColor}
        strokeWidth="1"
      />

      {/* Box outline */}
      <rect
        x={CONNECTOR_LENGTH}
        y="0"
        width={boxWidth}
        height={boxHeight}
        fill={bgColor || 'none'}
        stroke={strokeColor}
        strokeWidth="1"
      />

      {/* Instruction name */}
      <text
        x={CONNECTOR_LENGTH + boxWidth / 2}
        y={LINE_HEIGHT}
        textAnchor="middle"
        fontSize="11"
        fill={fillColor}
      >
        {instructionName}
      </text>

      {/* Mnemonic */}
      <text
        x={CONNECTOR_LENGTH + boxWidth / 2}
        y={LINE_HEIGHT * 2}
        textAnchor="middle"
        fontSize="12"
        fontWeight="bold"
        fill={fillColor}
      >
        {mnemonic}
      </text>

      {/* Separator line */}
      <line
        x1={CONNECTOR_LENGTH + 2}
        y1={separatorY}
        x2={CONNECTOR_LENGTH + boxWidth - 2}
        y2={separatorY}
        stroke={strokeColor}
        strokeWidth="1"
      />

      {/* Parameter lines */}
      {operands.map((op, index) => {
        const label = paramLabels[index] || `Param ${index + 1}`;
        const y = paramStartY + index * LINE_HEIGHT;
        return (
          <g key={index}>
            <text
              x={CONNECTOR_LENGTH + 8}
              y={y}
              fontSize="11"
              fill={fillColor}
            >
              {label}
            </text>
            <text
              x={CONNECTOR_LENGTH + boxWidth - 8}
              y={y}
              textAnchor="end"
              fontSize="11"
              fill={fillColor}
            >
              {op}
            </text>
          </g>
        );
      })}

      {/* Right connector */}
      <line
        x1={CONNECTOR_LENGTH + boxWidth}
        y1={centerY}
        x2={dims.width}
        y2={centerY}
        stroke={strokeColor}
        strokeWidth="1"
      />
    </g>
  );
}

export default BoxSymbol;
