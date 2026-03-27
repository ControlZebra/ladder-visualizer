import { describe, expect, it } from 'vitest';
import {
  buildInlineDiffModel,
  classifyInstructionChange,
  matchRungElements,
  truncateTextChange,
} from '../../src/diff';
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

describe('truncateTextChange', () => {
  it('marks truncation while preserving full values', () => {
    const result = truncateTextChange('MotorStartPermissiveSignal', 'MotorStartPermissiveBypassSignal', {
      maxLength: 12,
    });

    expect(result.oldText).toBe('MotorStartPermissiveSignal');
    expect(result.newText).toBe('MotorStartPermissiveBypassSignal');
    expect(result.truncatedOldText).toBe('MotorStar...');
    expect(result.truncatedNewText).toBe('MotorStar...');
    expect(result.isTruncated).toBe(true);
  });
});

describe('matchRungElements', () => {
  it('matches by structural position and preserves added tail elements', () => {
    const matches = matchRungElements(
      [instruction('XIC', 'input', ['Start']), branch([instruction('XIC', 'input', ['Auto'])])],
      [
        instruction('XIC', 'input', ['Start']),
        branch([instruction('XIC', 'input', ['Auto'])]),
        instruction('OTE', 'output', ['Run']),
      ],
      'rung:4',
    );

    expect(matches.map((match) => ({ id: match.id, kind: match.kind }))).toEqual([
      { id: 'rung:4/seq:0', kind: 'instruction' },
      { id: 'rung:4/seq:1', kind: 'branch' },
      { id: 'rung:4/seq:2', kind: 'added' },
    ]);
  });
});

describe('classifyInstructionChange', () => {
  it('treats a single contact label change as text-only and reuses shared address visibility metadata', () => {
    const oldInstruction = instruction('XIC', 'input', ['Local:1:I.Data.0']);
    const newInstruction = instruction('XIC', 'input', ['Local:2:I.Data.1']);

    const result = classifyInstructionChange(oldInstruction, newInstruction);

    expect(result.state).toBe('text-modified');
    expect(result.hasStructuralChange).toBe(false);
    expect(result.hasTextOnlyChange).toBe(true);
    expect(result.labelChange).toEqual({
      oldText: 'Local:1:I.Data.0',
      newText: 'Local:2:I.Data.1',
      truncatedOldText: undefined,
      truncatedNewText: undefined,
      isTruncated: false,
    });
    expect(result.oldRenderMetadata).toEqual({
      label: 'Local:1:I.Data.0',
      address: '<Local:1:I.Data.0>',
      hasLabel: true,
      hasAddress: true,
    });
    expect(result.newRenderMetadata).toEqual({
      label: 'Local:2:I.Data.1',
      address: '<Local:2:I.Data.1>',
      hasLabel: true,
      hasAddress: true,
    });
  });

  it('falls back to replacement when mnemonic shape changes', () => {
    const result = classifyInstructionChange(
      instruction('XIC', 'input', ['Start']),
      instruction('XIO', 'input', ['Start']),
    );

    expect(result.state).toBe('replaced');
    expect(result.hasStructuralChange).toBe(true);
    expect(result.hasTextOnlyChange).toBe(false);
  });
});

describe('buildInlineDiffModel', () => {
  it('builds a text-only rung model for a top-level addressed contact change', () => {
    const model = buildInlineDiffModel({
      oldRung: rung(7, [instruction('XIC', 'input', ['Local:1:I.Data.0']), instruction('OTE', 'output', ['Run'])]),
      newRung: rung(7, [instruction('XIC', 'input', ['Local:2:I.Data.1']), instruction('OTE', 'output', ['Run'])]),
    });

    expect(model.rungState).toBe('modified');
    expect(model.hasStructuralChanges).toBe(false);
    expect(model.hasTextOnlyChanges).toBe(true);
    expect(model.nodes[0]).toMatchObject({
      kind: 'instruction',
      state: 'text-modified',
      id: 'rung:7/seq:0',
      oldRenderMetadata: {
        label: 'Local:1:I.Data.0',
        address: '<Local:1:I.Data.0>',
        hasLabel: true,
        hasAddress: true,
      },
      newRenderMetadata: {
        label: 'Local:2:I.Data.1',
        address: '<Local:2:I.Data.1>',
        hasLabel: true,
        hasAddress: true,
      },
    });
  });

  it('keeps the same label and address metadata for the same payload inside a branch leg', () => {
    const model = buildInlineDiffModel({
      oldRung: rung(8, [
        branch(
          [instruction('XIC', 'input', ['Local:1:I.Data.0'])],
          [instruction('XIC', 'input', ['ManualMode'])],
        ),
        instruction('OTE', 'output', ['Run']),
      ]),
      newRung: rung(8, [
        branch(
          [instruction('XIC', 'input', ['Local:2:I.Data.1'])],
          [instruction('XIC', 'input', ['ManualMode'])],
        ),
        instruction('OTE', 'output', ['Run']),
      ]),
    });

    expect(model.nodes[0]).toMatchObject({
      kind: 'branch',
      state: 'text-modified',
    });

    const firstBranch = model.nodes[0];
    if (firstBranch.kind !== 'branch') {
      throw new Error('expected branch node');
    }

    expect(firstBranch.legs[0]).toMatchObject({
      id: 'rung:8/seq:0/leg:0',
      state: 'text-modified',
      isEmpty: false,
    });
    expect(firstBranch.legs[0].nodes[0]).toMatchObject({
      id: 'rung:8/seq:0/leg:0/seq:0',
      state: 'text-modified',
      oldRenderMetadata: {
        label: 'Local:1:I.Data.0',
        address: '<Local:1:I.Data.0>',
        hasLabel: true,
        hasAddress: true,
      },
      newRenderMetadata: {
        label: 'Local:2:I.Data.1',
        address: '<Local:2:I.Data.1>',
        hasLabel: true,
        hasAddress: true,
      },
    });
  });

  it('preserves empty added branch legs as first-class leg metadata', () => {
    const model = buildInlineDiffModel({
      oldRung: rung(9, [branch([instruction('XIC', 'input', ['Auto'])], [])]),
      newRung: rung(9, [branch([instruction('XIC', 'input', ['Auto'])], [], [])]),
    });

    const firstBranch = model.nodes[0];
    if (firstBranch.kind !== 'branch') {
      throw new Error('expected branch node');
    }

    expect(model.hasStructuralChanges).toBe(true);
    expect(firstBranch.state).toBe('replaced');
    expect(firstBranch.legs).toHaveLength(3);
    expect(firstBranch.legs[1]).toMatchObject({
      id: 'rung:9/seq:0/leg:1',
      state: 'unchanged',
      isEmpty: true,
      nodes: [],
    });
    expect(firstBranch.legs[2]).toMatchObject({
      id: 'rung:9/seq:0/leg:2',
      state: 'added',
      isEmpty: true,
      nodes: [],
    });
  });

  it('accepts a rung diff and emits comment truncation metadata', () => {
    const model = buildInlineDiffModel({
      rungDiff: {
        rungNumber: 10,
        kind: 'modified',
        oldRung: rung(10, [instruction('XIC', 'input', ['Start'])], 'Original permissive comment'),
        newRung: rung(10, [instruction('XIC', 'input', ['Start'])], 'Updated permissive comment for operators'),
      },
      maxLength: 16,
    });

    expect(model.commentChange).toEqual({
      oldText: 'Original permissive comment',
      newText: 'Updated permissive comment for operators',
      truncatedOldText: 'Original perm...',
      truncatedNewText: 'Updated permi...',
      isTruncated: true,
    });
    expect(model.hasTextOnlyChanges).toBe(true);
  });
});