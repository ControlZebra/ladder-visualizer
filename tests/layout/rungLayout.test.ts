import { describe, expect, it } from 'vitest';
import { calculateMinDiagramWidth, calculateRungLayoutComplete, calculateRungLayouts } from '../../src/layout';
import type { BranchGroup, Instruction, NormalizedRung } from '../../src/types';

function instruction(
  mnemonic: string,
  category: Instruction['category'],
  operands: string[]
): Instruction {
  return { mnemonic, category, operands };
}

function branch(...branches: BranchGroup['branches']): BranchGroup {
  return {
    type: 'branch',
    branches,
  };
}

function rung(number: number, elements: NormalizedRung['elements']): NormalizedRung {
  const instructions = elements.filter((element): element is Instruction => !('type' in element));

  return {
    number,
    raw: `rung-${number}`,
    elements,
    instructions,
  };
}

describe('rungLayout', () => {
  it('produces a single-line layout with separated conditions and operations', () => {
    const source = rung(0, [
      instruction('XIC', 'input', ['MotorStartPB']),
      instruction('OTE', 'output', ['MotorRun']),
    ]);

    const layout = calculateRungLayoutComplete(source, 0, 0, 34, 420);

    expect(layout.height).toBeGreaterThan(0);
    expect(layout.lines).toHaveLength(1);
    expect(layout.lines[0].conditions).toHaveLength(1);
    expect(layout.lines[0].operations).toHaveLength(1);
    expect(layout.hasBranches).toBe(false);
  });

  it('preserves branch geometry in the extracted pure layout module', () => {
    const source = rung(1, [
      branch(
        [instruction('XIC', 'input', ['AutoMode'])],
        [instruction('XIO', 'input', ['ManualLockout'])]
      ),
      instruction('OTE', 'output', ['PumpStart']),
    ]);

    const layout = calculateRungLayoutComplete(source, 1, 0, 34, 520);
    const branchLayout = layout.lines[0].conditions[0];

    expect(layout.hasBranches).toBe(true);
    expect(branchLayout.type).toBe('branch');
    if (branchLayout.type === 'branch') {
      expect(branchLayout.legs).toHaveLength(2);
      expect(branchLayout.connectorRightX).toBeGreaterThan(branchLayout.connectorLeftX);
      expect(branchLayout.legs[1].wireY).toBeGreaterThan(branchLayout.legs[0].wireY);
    }
  });

  it('calculates diagram width and cumulative rung offsets outside React', () => {
    const rungs = [
      rung(0, [instruction('XIC', 'input', ['InputOne']), instruction('OTE', 'output', ['OutputOne'])]),
      rung(1, [instruction('XIC', 'input', ['VeryLongInputTagNameForWidth']), instruction('OTE', 'output', ['Out'])]),
    ];

    const minWidth = calculateMinDiagramWidth(rungs);
    const layouts = calculateRungLayouts(rungs, minWidth);

    expect(minWidth).toBeGreaterThan(0);
    expect(layouts).toHaveLength(2);
    expect(layouts[1].offset).toBe(layouts[0].height);
    expect(layouts[1].contentWidth).toBeGreaterThanOrEqual(layouts[0].contentWidth);
  });
});