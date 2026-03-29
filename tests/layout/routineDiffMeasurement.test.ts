import { describe, expect, it } from 'vitest';
import { buildInlineDiffModel } from '../../src/diff';
import {
  RAIL_VISUAL_WIDTH,
  RUNG_NUMBER_WIDTH,
  buildInlineDiffRungLayout,
  calculateInlineDiffRungMinWidth,
  calculateMinDiagramWidth,
  calculateRungLayouts,
  measureRoutineDiffRowHeight,
} from '../../src/layout';
import type { Instruction, NormalizedRung } from '../../src/types';

function instruction(
  mnemonic: string,
  category: Instruction['category'],
  operands: string[],
): Instruction {
  return { mnemonic, category, operands };
}

function rung(number: number, instructions: Instruction[], comment?: string): NormalizedRung {
  return {
    number,
    raw: `rung-${number}`,
    comment,
    elements: instructions,
    instructions,
  };
}

describe('measureRoutineDiffRowHeight', () => {
  it('matches the single-rung layout height for added rows', () => {
    const addedRung = rung(10, [
      instruction('XIC', 'input', ['VeryLongMotorStartPermissive']),
      instruction('OTE', 'output', ['MotorRun']),
    ]);

    const diagramWidth = calculateMinDiagramWidth([addedRung]);
    const expectedHeight = calculateRungLayouts([addedRung], diagramWidth)[0]?.height;

    expect(measureRoutineDiffRowHeight({ state: 'added', rung: addedRung })).toBe(expectedHeight);
  });

  it('matches the inline diff layout height for modified rows', () => {
    const oldRung = rung(11, [
      instruction('XIC', 'input', ['StartPB']),
      instruction('MOV', 'math', ['Source_A', 'DestTag']),
    ], 'Original comment');
    const newRung = rung(11, [
      instruction('XIC', 'input', ['UpdatedMotorStartPermissive']),
      instruction('MOV', 'math', ['MuchLongerSource_B', 'DestTag']),
    ], 'Updated operator-facing comment');
    const model = buildInlineDiffModel({ oldRung, newRung, rungNumber: 11 });
    const minWidth = calculateInlineDiffRungMinWidth(model);
    const expectedHeight = buildInlineDiffRungLayout(model, {
      leftRailX: RUNG_NUMBER_WIDTH + RAIL_VISUAL_WIDTH,
      rightRailX: minWidth - RAIL_VISUAL_WIDTH,
    }).height;

    expect(measureRoutineDiffRowHeight({ state: 'modified', inlineDiffModel: model })).toBe(expectedHeight);
  });

  it('matches the single-rung layout height for removed rows', () => {
    const removedRung = rung(12, [
      instruction('XIC', 'input', ['ManualMode']),
      instruction('OTU', 'output', ['AlarmLatch']),
    ]);

    const diagramWidth = calculateMinDiagramWidth([removedRung]);
    const expectedHeight = calculateRungLayouts([removedRung], diagramWidth)[0]?.height;

    expect(measureRoutineDiffRowHeight({ state: 'removed', rung: removedRung })).toBe(expectedHeight);
  });
});