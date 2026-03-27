import type { LadderDiagramTheme } from '../../../types';
import { ADDRESS_LABEL_OFFSET, SYMBOL_WIDTH } from '../../../layout';
import type { InlineDiffInstructionLayout, InlineDiffInstructionSegmentLayout } from '../../../layout';
import { BoxSymbol } from '../BoxSymbol';
import { CoilSymbol } from '../CoilSymbol';
import { ContactSymbol } from '../ContactSymbol';
import { getInstructionVisualColors } from '../instructionVisuals';

export interface InlineDiffInstructionProps {
  layout: InlineDiffInstructionLayout;
  theme: Required<LadderDiagramTheme>;
}

function renderSegment(layout: InlineDiffInstructionSegmentLayout, theme: Required<LadderDiagramTheme>) {
  const { instruction, position, dimensions, symbolOffset, renderMetadata } = layout;
  const isContactOrCoil = instruction.category === 'input' || instruction.category === 'output';
  const colors = getInstructionVisualColors(layout.state, theme);
  const symbolX = position.x + symbolOffset;
  const wireY = position.y + dimensions.centerY;
  const labelX = position.x + dimensions.width / 2;
  const labelY = position.y - 5;
  const addressY = position.y + dimensions.height + ADDRESS_LABEL_OFFSET;
  const tintY = wireY - layout.clearance.aboveWire;
  const tintHeight = layout.clearance.aboveWire + layout.clearance.belowWire;

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
          stroke={colors.tintStrokeColor}
          strokeWidth={1}
          className="inline-diff-segment-tint"
        />
      )}

      {isContactOrCoil && renderMetadata?.label && (
        <>
          <text
            x={labelX}
            y={labelY}
            textAnchor="middle"
            fontSize="10"
            fill={colors.labelColor}
            fontWeight="500"
            className="instruction-label"
          >
            {renderMetadata.label}
          </text>
          {renderMetadata.address && (
            <text
              x={labelX}
              y={addressY}
              textAnchor="middle"
              fontSize="8"
              fill={colors.addressColor}
              className="instruction-address"
            >
              {renderMetadata.address}
            </text>
          )}
          {symbolOffset > 0 && (
            <>
              <line x1={position.x} y1={wireY} x2={position.x + symbolOffset} y2={wireY} stroke={colors.wireColor} strokeWidth="1" />
              <line
                x1={position.x + symbolOffset + SYMBOL_WIDTH}
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
          />
        )}
      </g>
    </g>
  );
}

export function InlineDiffInstruction({ layout, theme }: InlineDiffInstructionProps) {
  return (
    <g data-inline-diff-node="instruction" data-state={layout.state}>
      {layout.segments.map((segment) => renderSegment(segment, theme))}
    </g>
  );
}

export default InlineDiffInstruction;