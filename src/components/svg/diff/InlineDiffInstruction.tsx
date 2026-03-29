import type { LadderDiagramTheme } from '../../../types';
import {
  SYMBOL_WIDTH,
} from '../../../layout';
import type { InlineDiffInstructionLayout, InlineDiffInstructionSegmentLayout } from '../../../layout';
import { BoxSymbol } from '../BoxSymbol';
import { CoilSymbol } from '../CoilSymbol';
import { ContactSymbol } from '../ContactSymbol';
import { getInstructionVisualColors } from '../instructionVisuals';

const INLINE_NATIVE_LABEL_OLD_BASELINE = -18;
const INLINE_NATIVE_LABEL_NEW_BASELINE = -7;
const INLINE_NATIVE_BOX_OLD_OFFSET = 11;
const INLINE_NATIVE_BOX_NEW_OFFSET = 24;

function renderNativeLabelDiff(
  segment: InlineDiffInstructionSegmentLayout,
  theme: Required<LadderDiagramTheme>,
  labelX: number,
  oldText: string,
  newText: string,
) {
  return (
    <g data-inline-diff-native-text="label">
      <text
        x={labelX}
        y={segment.position.y + INLINE_NATIVE_LABEL_OLD_BASELINE}
        textAnchor="middle"
        fontSize="9"
        fill={theme.diffOldTextColor}
        textDecoration="line-through"
        data-inline-diff-text-row="old"
      >
        {oldText}
      </text>
      <text
        x={labelX}
        y={segment.position.y + INLINE_NATIVE_LABEL_NEW_BASELINE}
        textAnchor="middle"
        fontSize="10"
        fontWeight="700"
        fill={theme.diffNewTextColor}
        data-inline-diff-text-row="new"
      >
        {newText}
      </text>
    </g>
  );
}

function renderInstructionLabel(
  layout: InlineDiffInstructionSegmentLayout,
  theme: Required<LadderDiagramTheme>,
  labelX: number,
  labelY: number,
  labelChange: InlineDiffInstructionLayout['labelChange'],
) {
  if (labelChange && layout.state === 'text-modified') {
    return renderNativeLabelDiff(
      layout,
      theme,
      labelX,
      labelChange.oldText,
      labelChange.newText,
    );
  }

  if (!layout.renderMetadata?.label) {
    return null;
  }

  return (
    <text
      x={labelX}
      y={labelY}
      textAnchor="middle"
      fontSize="10"
      fill={getInstructionVisualColors(layout.state, theme).labelColor}
      fontWeight="500"
      className="instruction-label"
    >
      {layout.renderMetadata.label}
    </text>
  );
}

export interface InlineDiffInstructionProps {
  layout: InlineDiffInstructionLayout;
  theme: Required<LadderDiagramTheme>;
}

function renderSegment(
  layout: InlineDiffInstructionSegmentLayout,
  theme: Required<LadderDiagramTheme>,
  labelChange?: InlineDiffInstructionLayout['labelChange'],
  textChange?: InlineDiffInstructionLayout['textChange'],
  changedOperandIndex?: number,
  operandTextChanges?: InlineDiffInstructionLayout['operandTextChanges'],
) {
  const { instruction, position, dimensions, intrinsicDimensions, symbolOffset, renderMetadata } = layout;
  const isContactOrCoil = instruction.category === 'input' || instruction.category === 'output';
  const colors = getInstructionVisualColors(layout.state, theme);
  const contentOffset = isContactOrCoil ? symbolOffset : Math.max((dimensions.width - intrinsicDimensions.width) / 2, 0);
  const symbolX = position.x + contentOffset;
  const wireY = position.y + dimensions.centerY;
  const labelX = position.x + dimensions.width / 2;
  const labelY = position.y - 5;
  const tintY = wireY - layout.clearance.aboveWire;
  const tintHeight = layout.clearance.aboveWire + layout.clearance.belowWire;
  const effectiveOperandTextChanges = operandTextChanges && operandTextChanges.length > 0
    ? operandTextChanges
    : changedOperandIndex !== undefined && textChange
      ? [{ operandIndex: changedOperandIndex, change: textChange }]
      : [];

  return (
    <g key={layout.id} data-inline-diff-segment={layout.role} data-state={layout.state}>
      {(layout.state === 'added' || layout.state === 'removed') && (
        <rect
          x={position.x}
          y={tintY}
          width={dimensions.width}
          height={tintHeight}
          rx={4}
          fill={colors.tintFillColor}
          className="inline-diff-segment-tint"
        />
      )}

      {isContactOrCoil && renderMetadata?.label && (
        <>
          {renderInstructionLabel(layout, theme, labelX, labelY, labelChange)}
          {contentOffset > 0 && (
            <>
              <line x1={position.x} y1={wireY} x2={position.x + contentOffset} y2={wireY} stroke={colors.wireColor} strokeWidth="1" />
              <line
                x1={position.x + contentOffset + SYMBOL_WIDTH}
                y1={wireY}
                x2={position.x + dimensions.width}
                y2={wireY}
                stroke={colors.wireColor}
                strokeWidth="1"
              />
            </>
          )}
        </>
      )}

      {!isContactOrCoil && contentOffset > 0 && (
        <>
          <line x1={position.x} y1={wireY} x2={position.x + contentOffset} y2={wireY} stroke={colors.wireColor} strokeWidth="1" />
          <line
            x1={position.x + contentOffset + intrinsicDimensions.width}
            y1={wireY}
            x2={position.x + dimensions.width}
            y2={wireY}
            stroke={colors.wireColor}
            strokeWidth="1"
          />
        </>
      )}

      <g transform={`translate(${symbolX}, ${position.y})`}>
        {instruction.category === 'input' && (
          <ContactSymbol
            mnemonic={instruction.mnemonic}
            color={colors.contactColor}
            ncColor={colors.contactNCColor}
            energizedColor={theme.energizedColor}
            energizedFill={theme.energizedFill}
          />
        )}
        {instruction.category === 'output' && (
          <CoilSymbol
            mnemonic={instruction.mnemonic}
            color={colors.coilColor}
            energizedColor={theme.energizedColor}
            energizedFill={theme.energizedFill}
          />
        )}
        {!isContactOrCoil && (
          <BoxSymbol
            mnemonic={instruction.mnemonic}
            operands={instruction.operands}
            borderColor={colors.boxBorderColor}
            bgColor={colors.boxBgColor}
            textColor={colors.boxTextColor}
            energizedColor={theme.energizedColor}
            operandRowHeights={layout.state === 'text-modified' && effectiveOperandTextChanges.length > 0
              ? instruction.operands.map((_, index) => (
                  effectiveOperandTextChanges.some((operandTextChange) => operandTextChange.operandIndex === index)
                    ? 30
                    : 16
                ))
              : undefined}
            renderOperandRow={layout.state === 'text-modified' && effectiveOperandTextChanges.length > 0
              ? ({ index, label, operand, rowTop, baselineY, labelX: operandLabelX, valueX, fillColor }) => {
                  const operandTextChange = effectiveOperandTextChanges.find(
                    (candidate) => candidate.operandIndex === index,
                  );

                  if (!operandTextChange) {
                    return (
                      <>
                        <text x={operandLabelX} y={baselineY} fontSize="11" fill={fillColor}>
                          {label}
                        </text>
                        <text x={valueX} y={baselineY} textAnchor="end" fontSize="11" fill={fillColor}>
                          {operand}
                        </text>
                      </>
                    );
                  }

                  return (
                    <g data-inline-diff-native-text="operand" data-inline-diff-operand-index={index}>
                      <text x={operandLabelX} y={baselineY} fontSize="11" fill={fillColor}>
                        {label}
                      </text>
                      <text
                        x={valueX}
                        y={rowTop + INLINE_NATIVE_BOX_OLD_OFFSET}
                        textAnchor="end"
                        fontSize="9"
                        fill={theme.diffOldTextColor}
                        textDecoration="line-through"
                        data-inline-diff-text-row="old"
                      >
                        {operandTextChange.change.oldText}
                      </text>
                      <text
                        x={valueX}
                        y={rowTop + INLINE_NATIVE_BOX_NEW_OFFSET}
                        textAnchor="end"
                        fontSize="10"
                        fontWeight="700"
                        fill={theme.diffNewTextColor}
                        data-inline-diff-text-row="new"
                      >
                        {operandTextChange.change.newText}
                      </text>
                    </g>
                  );
                }
              : undefined}
          />
        )}
      </g>
    </g>
  );
}

export function InlineDiffInstruction({ layout, theme }: InlineDiffInstructionProps) {
  return (
    <g data-inline-diff-node="instruction" data-state={layout.state}>
      {layout.segments.map((segment) => renderSegment(
        segment,
        theme,
        layout.labelChange,
        layout.textChange,
        layout.changedOperandIndex,
        layout.operandTextChanges,
      ))}
    </g>
  );
}

export default InlineDiffInstruction;