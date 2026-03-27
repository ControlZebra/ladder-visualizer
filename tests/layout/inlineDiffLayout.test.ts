import { describe, expect, it } from 'vitest';
import { buildInlineDiffModel } from '../../src/diff';
import {
  RAIL_VISUAL_WIDTH,
  RUNG_NUMBER_WIDTH,
  buildInlineDiffRungLayout,
  calculateElementVerticalClearance,
  calculateInlineDiffRungMinWidth,
  calculateInstructionDimensions,
} from '../../src/layout';
import type { BranchGroup, Instruction, NormalizedRung, RungElement } from '../../src/types';

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

function buildLayout(model: ReturnType<typeof buildInlineDiffModel>) {
  const minWidth = calculateInlineDiffRungMinWidth(model);

  return buildInlineDiffRungLayout(model, {
    leftRailX: RUNG_NUMBER_WIDTH + RAIL_VISUAL_WIDTH,
    rightRailX: minWidth - RAIL_VISUAL_WIDTH,
  });
}

describe('inline diff layout adapter', () => {
  it('grows the native label region for long contact label diffs without shifting the wire centerline', () => {
    const updatedInstruction = instruction('XIC', 'input', ['VeryLongUpdatedMotorStartPermissiveSignal']);
    const model = buildInlineDiffModel({
      oldRung: rung(50, [instruction('XIC', 'input', ['ShortStart']), instruction('OTE', 'output', ['RunCmd'])]),
      newRung: rung(50, [updatedInstruction, instruction('OTE', 'output', ['RunCmd'])]),
    });

    const layout = buildLayout(model);
    const instructionLayout = layout.lines[0].conditions[0];

    expect(instructionLayout.kind).toBe('instruction');
    if (instructionLayout.kind !== 'instruction') {
      throw new Error('expected instruction layout');
    }

    const normalClearance = calculateElementVerticalClearance(updatedInstruction, calculateInstructionDimensions(updatedInstruction));

    expect(instructionLayout.state).toBe('text-modified');
    expect(instructionLayout.clearance.aboveWire).toBeGreaterThan(normalClearance.aboveWire);
    expect(instructionLayout.position.y + instructionLayout.dimensions.centerY).toBe(layout.lines[0].wireY);
    expect(instructionLayout.dimensions.width).toBeGreaterThanOrEqual(calculateInstructionDimensions(updatedInstruction).width);
  });

  it('keeps branch-contained coil label diffs measured as native instruction nodes', () => {
    const updatedCoil = instruction('OTE', 'output', ['Local:99:O.Data.123456']);
    const model = buildInlineDiffModel({
      oldRung: rung(51, [
        branch(
          [instruction('OTE', 'output', ['Local:1:O.Data.0'])],
          [instruction('OTE', 'output', ['RunCmd'])],
        ),
      ]),
      newRung: rung(51, [
        branch(
          [updatedCoil],
          [instruction('OTE', 'output', ['RunCmd'])],
        ),
      ]),
    });

    const layout = buildLayout(model);
    const branchLayout = layout.lines[0].operations[0];

    expect(branchLayout.kind).toBe('branch');
    if (branchLayout.kind !== 'branch') {
      throw new Error('expected branch layout');
    }

    const coilLayout = branchLayout.legs[0].nodes[0];
    expect(coilLayout.kind).toBe('instruction');
    if (coilLayout.kind !== 'instruction') {
      throw new Error('expected instruction layout');
    }

    const normalClearance = calculateElementVerticalClearance(updatedCoil, calculateInstructionDimensions(updatedCoil));

    expect(coilLayout.state).toBe('text-modified');
    expect(coilLayout.clearance.aboveWire).toBeGreaterThan(normalClearance.aboveWire);
    expect(coilLayout.position.y + coilLayout.dimensions.centerY).toBe(branchLayout.legs[0].wireY);
  });

  it('expands a changed box operand row in place while keeping the box aligned to the wire centerline', () => {
    const updatedInstruction = instruction('MOV', 'math', ['MuchLongerMotorStartPermissiveBypassSignal', 'DestTag']);
    const model = buildInlineDiffModel({
      oldRung: rung(52, [instruction('MOV', 'math', ['SourceTag', 'DestTag'])]),
      newRung: rung(52, [updatedInstruction]),
    });

    const layout = buildLayout(model);
    const instructionLayout = layout.lines[0].operations[0];

    expect(instructionLayout.kind).toBe('instruction');
    if (instructionLayout.kind !== 'instruction') {
      throw new Error('expected instruction layout');
    }

    const normalDimensions = calculateInstructionDimensions(updatedInstruction);

    expect(instructionLayout.state).toBe('text-modified');
    expect(instructionLayout.dimensions.height).toBeGreaterThan(normalDimensions.height);
    expect(instructionLayout.dimensions.width).toBeGreaterThanOrEqual(normalDimensions.width);
    expect(instructionLayout.position.y + instructionLayout.dimensions.centerY).toBe(layout.lines[0].wireY);
    expect(instructionLayout.changedOperandIndex).toBe(0);
  });
});