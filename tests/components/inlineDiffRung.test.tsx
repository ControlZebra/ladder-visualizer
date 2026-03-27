import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { InlineDiffRung } from '../../src/components';
import { buildInlineDiffModel } from '../../src/diff';
import {
  BRANCH_CONNECTOR_OFFSET,
  RAIL_VISUAL_WIDTH,
  RUNG_NUMBER_WIDTH,
  buildInlineDiffRungLayout,
  calculateInlineDiffRungMinWidth,
} from '../../src/layout';
import type {
  BranchGroup,
  Instruction,
  NormalizedRung,
  RungElement,
} from '../../src/types';

function instruction(
  mnemonic: string,
  category: Instruction['category'],
  operands: string[],
): Instruction {
  return { mnemonic, category, operands };
}

function branch(...branches: BranchGroup['branches']): BranchGroup {
  return {
    type: 'branch',
    branches,
  };
}

function flattenInstructions(elements: RungElement[]): Instruction[] {
  const instructions: Instruction[] = [];

  for (const element of elements) {
    if ('type' in element && element.type === 'branch') {
      for (const leg of element.branches) {
        instructions.push(...flattenInstructions(leg));
      }
      continue;
    }

    instructions.push(element);
  }

  return instructions;
}

function rung(number: number, elements: RungElement[], comment?: string): NormalizedRung {
  return {
    number,
    raw: `rung-${number}`,
    comment,
    elements,
    instructions: flattenInstructions(elements),
  };
}

describe('InlineDiffRung', () => {
  it('renders a whole-rung wash for added rungs without invalid SVG coordinates', () => {
    const model = buildInlineDiffModel({
      newRung: rung(30, [
        instruction('XIC', 'input', ['StartPB']),
        instruction('OTE', 'output', ['MotorRun']),
      ]),
    });

    const markup = renderToStaticMarkup(<InlineDiffRung model={model} />);

    expect(markup).toContain('data-inline-diff-rung="30"');
    expect(markup).toContain('data-state="added"');
    expect(markup).toContain('class="inline-diff-rung-wash"');
    expect(markup).not.toContain('NaN');
  });

  it('renders replacement pairs in old-then-new reading order on the same rung surface', () => {
    const model = buildInlineDiffModel({
      oldRung: rung(31, [
        instruction('XIC', 'input', ['StartPB']),
        instruction('OTE', 'output', ['MotorRun']),
      ]),
      newRung: rung(31, [
        instruction('XIO', 'input', ['StartPB']),
        instruction('OTE', 'output', ['MotorRun']),
      ]),
    });

    const markup = renderToStaticMarkup(<InlineDiffRung model={model} />);
    const oldIndex = markup.indexOf('data-inline-diff-segment="old"');
    const newIndex = markup.indexOf('data-inline-diff-segment="new"');

    expect(oldIndex).toBeGreaterThanOrEqual(0);
    expect(newIndex).toBeGreaterThan(oldIndex);
    expect(markup).toContain('data-state="removed"');
    expect(markup).toContain('data-state="added"');
  });

  it('precomputes nested branch geometry so rendering does not emit NaN connector coordinates', () => {
    const model = buildInlineDiffModel({
      oldRung: rung(32, [
        branch(
          [instruction('XIC', 'input', ['AutoMode'])],
          [branch([instruction('XIC', 'input', ['ManualMode'])], [instruction('XIC', 'input', ['RemoteMode'])])],
        ),
        instruction('OTE', 'output', ['RunCommand']),
      ]),
      newRung: rung(32, [
        branch(
          [instruction('XIC', 'input', ['AutoMode'])],
          [branch([instruction('XIC', 'input', ['ManualMode'])], [instruction('XIC', 'input', ['RemoteMode'])])],
          [instruction('OTE', 'output', ['AlarmLatch'])],
        ),
        instruction('OTE', 'output', ['RunCommand']),
      ]),
    });

    const markup = renderToStaticMarkup(<InlineDiffRung model={model} />);

    expect(markup).toContain('class="branch-connector"');
    expect(markup).toContain('class="inline-diff-leg-tint"');
    expect(markup).not.toContain('NaN');
  });

  it('keeps empty added branch legs as full measured geometry in the adapter output', () => {
    const model = buildInlineDiffModel({
      oldRung: rung(33, [branch([instruction('XIC', 'input', ['AutoMode'])], [])]),
      newRung: rung(33, [branch([instruction('XIC', 'input', ['AutoMode'])], [], [])]),
    });
    const minWidth = calculateInlineDiffRungMinWidth(model);
    const layout = buildInlineDiffRungLayout(model, {
      leftRailX: RUNG_NUMBER_WIDTH + RAIL_VISUAL_WIDTH,
      rightRailX: minWidth - RAIL_VISUAL_WIDTH,
    });
    const branchLayout = layout.lines[0].conditions[0];

    expect(branchLayout.kind).toBe('branch');
    if (branchLayout.kind !== 'branch') {
      throw new Error('expected branch layout');
    }

    expect(branchLayout.legs).toHaveLength(3);
    expect(branchLayout.legs[2]).toMatchObject({
      state: 'added',
      isEmpty: true,
    });
    expect(branchLayout.legs[2].contentStartX).toBe(branchLayout.legs[2].contentEndX);
    expect(branchLayout.legs[2].height).toBeGreaterThan(0);
  });

  it('sizes branch containers from measured diff leg content for replacement pairs', () => {
    const model = buildInlineDiffModel({
      oldRung: rung(34, [
        branch(
          [instruction('XIC', 'input', ['StartPB'])],
          [instruction('XIC', 'input', ['SealIn'])],
        ),
      ]),
      newRung: rung(34, [
        branch(
          [instruction('XIO', 'input', ['StartPB'])],
          [instruction('XIC', 'input', ['SealIn'])],
        ),
      ]),
    });
    const minWidth = calculateInlineDiffRungMinWidth(model);
    const layout = buildInlineDiffRungLayout(model, {
      leftRailX: RUNG_NUMBER_WIDTH + RAIL_VISUAL_WIDTH,
      rightRailX: minWidth - RAIL_VISUAL_WIDTH,
    });
    const branchLayout = layout.lines[0].conditions[0];

    expect(branchLayout.kind).toBe('branch');
    if (branchLayout.kind !== 'branch') {
      throw new Error('expected branch layout');
    }

    const widestLeg = branchLayout.legs.reduce((widest, leg) => {
      return leg.contentWidth > widest.contentWidth ? leg : widest;
    }, branchLayout.legs[0]);

    expect(branchLayout.connectorRightX - branchLayout.connectorLeftX).toBe(
      widestLeg.contentWidth + 2 * BRANCH_CONNECTOR_OFFSET,
    );
    expect(widestLeg.contentEndX).toBe(branchLayout.connectorRightX - BRANCH_CONNECTOR_OFFSET);
    expect(branchLayout.legs[0].contentWidth).toBeGreaterThan(branchLayout.legs[1].contentWidth);
  });

  it('keeps unchanged boxed instructions on the normal box text color contract', () => {
    const model = buildInlineDiffModel({
      oldRung: rung(35, [
        instruction('EQU', 'compare', ['SourceA', 'SourceB']),
        instruction('OTE', 'output', ['RunCmd']),
      ]),
      newRung: rung(35, [
        instruction('EQU', 'compare', ['SourceA', 'SourceB']),
        instruction('OTE', 'output', ['RunCmd']),
      ]),
    });

    const markup = renderToStaticMarkup(
      <InlineDiffRung
        model={model}
        theme={{
          boxBorderColor: '#112233',
          boxTextColor: '#abcdef',
          boxBgColor: '#f5f5dc',
        }}
      />,
    );

    expect(markup).toContain('stroke="#112233"');
    expect(markup).toContain('fill="#abcdef"');
  });

  it('keeps unchanged branch leg wires on wireColor instead of branch connector color', () => {
    const model = buildInlineDiffModel({
      oldRung: rung(36, [
        branch(
          [instruction('XIC', 'input', ['AutoMode'])],
          [instruction('XIC', 'input', ['ManualMode'])],
        ),
        instruction('OTE', 'output', ['RunCommand']),
      ]),
      newRung: rung(36, [
        branch(
          [instruction('XIC', 'input', ['AutoMode'])],
          [instruction('XIC', 'input', ['ManualMode'])],
        ),
        instruction('OTE', 'output', ['RunCommand']),
      ]),
    });

    const connectorColor = '#913f7a';
    const wireColor = '#147a91';
    const markup = renderToStaticMarkup(
      <InlineDiffRung
        model={model}
        theme={{
          branchConnectorColor: connectorColor,
          wireColor,
        }}
      />,
    );

    expect(markup.match(new RegExp(`stroke="${connectorColor}"`, 'g')) ?? []).toHaveLength(2);
    expect((markup.match(new RegExp(`stroke="${wireColor}"`, 'g')) ?? []).length).toBeGreaterThan(2);
  });
});