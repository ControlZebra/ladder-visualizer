import { describe, expect, it } from 'vitest';
import {
  ADDRESS_LABEL_OFFSET,
  BRANCH_CONNECTOR_OFFSET,
  LABEL_OFFSET,
  SYMBOL_HEIGHT,
  calculateElementVerticalClearance,
  calculateMinDiagramWidth,
  calculateRungLayoutComplete,
  positionBranch,
  calculateRungLayouts,
} from '../../src/layout';
import type { InstructionLayout } from '../../src/layout';
import type { BranchGroup, Instruction, NormalizedRung, RungElement } from '../../src/types';

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

function expectInstructionLayout(element: RungElement | { type: string } | unknown): asserts element is InstructionLayout {
  expect(element).toBeTruthy();
  expect(typeof element).toBe('object');
  expect(element).toMatchObject({ type: 'instruction' });
}

describe('rungLayout', () => {
  it('centralizes vertical clearance rules for labeled and addressed contacts', () => {
    const addressedContact = instruction('XIC', 'input', ['Local:1:I.Data.0']);
    const plainContact = instruction('XIC', 'input', ['MotorStartPB']);
    const coil = instruction('OTE', 'output', ['RunCommand']);

    expect(calculateElementVerticalClearance(addressedContact)).toEqual({
      aboveWire: SYMBOL_HEIGHT / 2 + LABEL_OFFSET,
      belowWire: SYMBOL_HEIGHT / 2 + ADDRESS_LABEL_OFFSET,
    });

    expect(calculateElementVerticalClearance(plainContact)).toEqual({
      aboveWire: SYMBOL_HEIGHT / 2 + LABEL_OFFSET,
      belowWire: SYMBOL_HEIGHT / 2,
    });

    expect(calculateElementVerticalClearance(coil)).toEqual({
      aboveWire: SYMBOL_HEIGHT / 2 + LABEL_OFFSET,
      belowWire: SYMBOL_HEIGHT / 2,
    });
  });

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

  it('keeps instruction-local geometry consistent between top-level and branch-contained elements', () => {
    const addressedContact = instruction('XIC', 'input', ['Local:1:I.Data.0']);
    const plainContact = instruction('XIO', 'input', ['ManualMode']);
    const addressedCoil = instruction('OTE', 'output', ['Local:2:O.Data.1']);
    const plainCoil = instruction('OTE', 'output', ['RunCommand']);

    const topLevelContactLayout = calculateRungLayoutComplete(
      rung(2, [addressedContact, plainCoil]),
      2,
      0,
      34,
      520
    );
    const topLevelCoilLayout = calculateRungLayoutComplete(
      rung(3, [plainContact, addressedCoil]),
      3,
      0,
      34,
      520
    );

    const branchContactLayout = positionBranch(branch([addressedContact], [plainContact]), 100, 200);
    const branchCoilLayout = positionBranch(branch([addressedCoil], [plainCoil]), 300, 220);

    const topLevelAddressedContact = topLevelContactLayout.lines[0].conditions[0];
    const topLevelAddressedCoil = topLevelCoilLayout.lines[0].operations[0];
    const branchAddressedContact = branchContactLayout.legs[0].elements[0];
    const branchPlainContact = branchContactLayout.legs[1].elements[0];
    const branchAddressedCoil = branchCoilLayout.legs[0].elements[0];
    const branchPlainCoil = branchCoilLayout.legs[1].elements[0];

    expectInstructionLayout(topLevelAddressedContact);
    expectInstructionLayout(topLevelAddressedCoil);
    expectInstructionLayout(branchAddressedContact);
    expectInstructionLayout(branchPlainContact);
    expectInstructionLayout(branchAddressedCoil);
    expectInstructionLayout(branchPlainCoil);

    expect(branchAddressedContact.dimensions).toEqual(topLevelAddressedContact.dimensions);
    expect(branchAddressedContact.label).toBe(topLevelAddressedContact.label);
    expect(branchAddressedContact.address).toBe(topLevelAddressedContact.address);
    expect(branchAddressedContact.position.y - branchContactLayout.legs[0].wireY).toBe(
      topLevelAddressedContact.position.y - topLevelContactLayout.lines[0].wireY
    );

    expect(branchPlainContact.address).toBeUndefined();
    expect(branchPlainContact.position.y - branchContactLayout.legs[1].wireY).toBe(
      topLevelAddressedContact.position.y - topLevelContactLayout.lines[0].wireY
    );

    expect(branchAddressedCoil.dimensions).toEqual(topLevelAddressedCoil.dimensions);
    expect(branchAddressedCoil.label).toBe(topLevelAddressedCoil.label);
    expect(branchAddressedCoil.address).toBe(topLevelAddressedCoil.address);
    expect(branchAddressedCoil.position.y - branchCoilLayout.legs[0].wireY).toBe(
      topLevelAddressedCoil.position.y - topLevelCoilLayout.lines[0].wireY
    );

    expect(branchPlainCoil.address).toBeUndefined();
    expect(branchPlainCoil.position.y - branchCoilLayout.legs[1].wireY).toBe(
      topLevelAddressedCoil.position.y - topLevelCoilLayout.lines[0].wireY
    );
  });

  it('keeps branch connector bounds and leg wires valid with addressed labels present', () => {
    const addressedBranch = positionBranch(
      branch(
        [instruction('XIC', 'input', ['Local:1:I.Data.0'])],
        [instruction('XIO', 'input', ['ManualMode'])],
        [instruction('OTE', 'output', ['Local:2:O.Data.1'])]
      ),
      80,
      160
    );

    expect(addressedBranch.connectorRightX).toBeGreaterThan(addressedBranch.connectorLeftX);

    for (let index = 1; index < addressedBranch.legs.length; index += 1) {
      expect(addressedBranch.legs[index].wireY).toBeGreaterThan(addressedBranch.legs[index - 1].wireY);
    }

    for (const leg of addressedBranch.legs) {
      expect(leg.elements).not.toHaveLength(0);
      expect(leg.contentEndX).toBeLessThanOrEqual(addressedBranch.connectorRightX - BRANCH_CONNECTOR_OFFSET);

      const firstElement = leg.elements[0];
      expect(firstElement.position.x).toBe(addressedBranch.connectorLeftX + BRANCH_CONNECTOR_OFFSET);
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