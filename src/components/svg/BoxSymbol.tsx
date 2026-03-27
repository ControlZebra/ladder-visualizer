import type { ReactNode } from 'react';
import { getInstructionDisplayName, getInstructionParameterLabels } from '../../types';
import type { BoxThemeProps } from '../../types/theme';
import { DEFAULT_THEME } from '../../types/theme';

const LINE_HEIGHT = 16;
const CHAR_WIDTH = 7;
const PADDING = 10;
const CONNECTOR_LENGTH = 10;

export const BOX_LINE_HEIGHT = LINE_HEIGHT;
export const BOX_CONNECTOR_LENGTH = CONNECTOR_LENGTH;

function getTextWidth(text: string): number {
  return text.length * CHAR_WIDTH;
}

function getInstructionName(mnemonic: string): string {
  return getInstructionDisplayName(mnemonic);
}

function getParamLabels(mnemonic: string): string[] {
  return getInstructionParameterLabels(mnemonic);
}

export interface BoxDimensions {
  width: number;
  height: number;
  centerY: number;
}

export function calculateBoxDimensions(
  mnemonic: string,
  operands: string[],
  operandRowHeights?: number[],
): BoxDimensions {
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
  const contentHeight = Math.max(
    operandRowHeights?.reduce((total, rowHeight) => total + rowHeight, 0) ?? 0,
    Math.max(1, operands.length) * LINE_HEIGHT,
  ) + PADDING;
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
  operandRowHeights?: number[];
  renderOperandRow?: (args: {
    index: number;
    label: string;
    operand: string;
    rowTop: number;
    rowHeight: number;
    baselineY: number;
    labelX: number;
    valueX: number;
    fillColor: string;
  }) => ReactNode;
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
  operandRowHeights,
  renderOperandRow,
}: BoxSymbolProps) {
  const instructionName = getInstructionName(mnemonic);
  const paramLabels = getParamLabels(mnemonic);
  const rowHeights = operands.map((_, index) => operandRowHeights?.[index] ?? LINE_HEIGHT);
  const dims = calculateBoxDimensions(mnemonic, operands, rowHeights);

  const boxWidth = dims.width - CONNECTOR_LENGTH * 2;
  const boxHeight = dims.height;
  const centerY = dims.centerY;
  const separatorY = LINE_HEIGHT * 2 + 4;
  const contentTop = separatorY + 4;

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
        const rowHeight = rowHeights[index] ?? LINE_HEIGHT;
        const rowTop = contentTop + rowHeights.slice(0, index).reduce((total, current) => total + current, 0);
        const baselineY = rowTop + Math.min(rowHeight - 4, 12);

        if (renderOperandRow) {
          return (
            <g key={index}>
              {renderOperandRow({
                index,
                label,
                operand: op,
                rowTop,
                rowHeight,
                baselineY,
                labelX: CONNECTOR_LENGTH + 8,
                valueX: CONNECTOR_LENGTH + boxWidth - 8,
                fillColor,
              })}
            </g>
          );
        }

        return (
          <g key={index}>
            <text
              x={CONNECTOR_LENGTH + 8}
              y={baselineY}
              fontSize="11"
              fill={fillColor}
            >
              {label}
            </text>
            <text
              x={CONNECTOR_LENGTH + boxWidth - 8}
              y={baselineY}
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
