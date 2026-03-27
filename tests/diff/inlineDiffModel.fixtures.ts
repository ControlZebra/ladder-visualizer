import type { BuildInlineDiffModelInput } from '../../src/diff';
import type {
  BranchGroup,
  Instruction,
  NormalizedRung,
  RungElement,
} from '../../src/types';

export interface InlineDiffModelGoldenFixture {
  name: string;
  input: BuildInlineDiffModelInput;
  expected: unknown;
}

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

function metadata(label: string, address?: string) {
  return {
    label,
    address,
    hasLabel: true,
    hasAddress: Boolean(address),
  };
}

function addedInstructionNode(id: string, value: Instruction, renderMetadata?: ReturnType<typeof metadata>) {
  return {
    kind: 'instruction',
    id,
    state: 'added',
    instruction: value,
    newInstruction: value,
    renderMetadata: renderMetadata ?? { hasLabel: false, hasAddress: false },
    newRenderMetadata: renderMetadata ?? { hasLabel: false, hasAddress: false },
  };
}

function removedInstructionNode(id: string, value: Instruction, renderMetadata?: ReturnType<typeof metadata>) {
  return {
    kind: 'instruction',
    id,
    state: 'removed',
    instruction: value,
    oldInstruction: value,
    renderMetadata: renderMetadata ?? { hasLabel: false, hasAddress: false },
    oldRenderMetadata: renderMetadata ?? { hasLabel: false, hasAddress: false },
  };
}

function unchangedInstructionNode(id: string, oldValue: Instruction, newValue = oldValue, renderMetadata?: ReturnType<typeof metadata>) {
  return {
    kind: 'instruction',
    id,
    state: 'unchanged',
    instruction: newValue,
    oldInstruction: oldValue,
    newInstruction: newValue,
    renderMetadata: renderMetadata ?? { hasLabel: false, hasAddress: false },
    oldRenderMetadata: renderMetadata ?? { hasLabel: false, hasAddress: false },
    newRenderMetadata: renderMetadata ?? { hasLabel: false, hasAddress: false },
  };
}

function replacedInstructionNode(id: string, oldValue: Instruction, newValue: Instruction) {
  return {
    kind: 'instruction',
    id,
    state: 'replaced',
    oldInstruction: oldValue,
    newInstruction: newValue,
    oldRenderMetadata: oldValue.category === 'input' || oldValue.category === 'output'
      ? metadata(
        oldValue.operands[0] ?? '',
        oldValue.operands[0]?.includes(':') || oldValue.operands[0]?.includes('.')
          ? `<${oldValue.operands[0]}>`
          : undefined,
      )
      : { hasLabel: false, hasAddress: false },
    newRenderMetadata: newValue.category === 'input' || newValue.category === 'output'
      ? metadata(
        newValue.operands[0] ?? '',
        newValue.operands[0]?.includes(':') || newValue.operands[0]?.includes('.')
          ? `<${newValue.operands[0]}>`
          : undefined,
      )
      : { hasLabel: false, hasAddress: false },
  };
}

export const INLINE_DIFF_MODEL_GOLDEN_FIXTURES: InlineDiffModelGoldenFixture[] = [
  {
    name: 'full rung added',
    input: {
      newRung: rung(20, [
        instruction('XIC', 'input', ['StartPB']),
        instruction('OTE', 'output', ['RunMotor']),
      ]),
    },
    expected: {
      rungNumber: 20,
      rungState: 'added',
      nodes: [
        addedInstructionNode('rung:20/seq:0', instruction('XIC', 'input', ['StartPB']), metadata('StartPB')),
        addedInstructionNode('rung:20/seq:1', instruction('OTE', 'output', ['RunMotor']), metadata('RunMotor')),
      ],
      hasStructuralChanges: true,
      hasTextOnlyChanges: false,
    },
  },
  {
    name: 'full rung removed',
    input: {
      oldRung: rung(21, [
        instruction('XIC', 'input', ['Permissive']),
        instruction('OTE', 'output', ['Clamp']),
      ]),
    },
    expected: {
      rungNumber: 21,
      rungState: 'removed',
      nodes: [
        removedInstructionNode('rung:21/seq:0', instruction('XIC', 'input', ['Permissive']), metadata('Permissive')),
        removedInstructionNode('rung:21/seq:1', instruction('OTE', 'output', ['Clamp']), metadata('Clamp')),
      ],
      hasStructuralChanges: true,
      hasTextOnlyChanges: false,
    },
  },
  {
    name: 'single instruction replaced',
    input: {
      oldRung: rung(22, [
        instruction('XIC', 'input', ['StartPB']),
        instruction('OTE', 'output', ['RunMotor']),
      ]),
      newRung: rung(22, [
        instruction('XIO', 'input', ['StartPB']),
        instruction('OTE', 'output', ['RunMotor']),
      ]),
    },
    expected: {
      rungNumber: 22,
      rungState: 'modified',
      nodes: [
        replacedInstructionNode(
          'rung:22/seq:0',
          instruction('XIC', 'input', ['StartPB']),
          instruction('XIO', 'input', ['StartPB']),
        ),
        unchangedInstructionNode('rung:22/seq:1', instruction('OTE', 'output', ['RunMotor']), undefined, metadata('RunMotor')),
      ],
      hasStructuralChanges: true,
      hasTextOnlyChanges: false,
    },
  },
  {
    name: 'box operand text modified',
    input: {
      oldRung: rung(23, [instruction('MOV', 'math', ['Source_A', 'DestTag'])]),
      newRung: rung(23, [instruction('MOV', 'math', ['Source_B', 'DestTag'])]),
      maxLength: 32,
    },
    expected: {
      rungNumber: 23,
      rungState: 'modified',
      nodes: [
        {
          kind: 'instruction',
          id: 'rung:23/seq:0',
          state: 'text-modified',
          instruction: instruction('MOV', 'math', ['Source_B', 'DestTag']),
          oldInstruction: instruction('MOV', 'math', ['Source_A', 'DestTag']),
          newInstruction: instruction('MOV', 'math', ['Source_B', 'DestTag']),
          textChange: {
            oldText: 'Source_A',
            newText: 'Source_B',
            isTruncated: false,
          },
          renderMetadata: { hasLabel: false, hasAddress: false },
          oldRenderMetadata: { hasLabel: false, hasAddress: false },
          newRenderMetadata: { hasLabel: false, hasAddress: false },
        },
      ],
      hasStructuralChanges: false,
      hasTextOnlyChanges: true,
    },
  },
  {
    name: 'addressed contact label modified at top level',
    input: {
      oldRung: rung(24, [
        instruction('XIC', 'input', ['Local:1:I.Data.0']),
        instruction('OTE', 'output', ['RunMotor']),
      ]),
      newRung: rung(24, [
        instruction('XIC', 'input', ['Local:2:I.Data.1']),
        instruction('OTE', 'output', ['RunMotor']),
      ]),
    },
    expected: {
      rungNumber: 24,
      rungState: 'modified',
      nodes: [
        {
          kind: 'instruction',
          id: 'rung:24/seq:0',
          state: 'text-modified',
          instruction: instruction('XIC', 'input', ['Local:2:I.Data.1']),
          oldInstruction: instruction('XIC', 'input', ['Local:1:I.Data.0']),
          newInstruction: instruction('XIC', 'input', ['Local:2:I.Data.1']),
          labelChange: {
            oldText: 'Local:1:I.Data.0',
            newText: 'Local:2:I.Data.1',
            isTruncated: false,
          },
          renderMetadata: metadata('Local:2:I.Data.1', '<Local:2:I.Data.1>'),
          oldRenderMetadata: metadata('Local:1:I.Data.0', '<Local:1:I.Data.0>'),
          newRenderMetadata: metadata('Local:2:I.Data.1', '<Local:2:I.Data.1>'),
        },
        unchangedInstructionNode('rung:24/seq:1', instruction('OTE', 'output', ['RunMotor']), undefined, metadata('RunMotor')),
      ],
      hasStructuralChanges: false,
      hasTextOnlyChanges: true,
    },
  },
  {
    name: 'addressed coil label modified inside a branch leg',
    input: {
      oldRung: rung(25, [
        branch(
          [instruction('XIC', 'input', ['AutoMode'])],
          [instruction('OTE', 'output', ['Local:1:O.Data.0'])],
        ),
      ]),
      newRung: rung(25, [
        branch(
          [instruction('XIC', 'input', ['AutoMode'])],
          [instruction('OTE', 'output', ['Local:2:O.Data.1'])],
        ),
      ]),
    },
    expected: {
      rungNumber: 25,
      rungState: 'modified',
      nodes: [
        {
          kind: 'branch',
          id: 'rung:25/seq:0',
          state: 'text-modified',
          legs: [
            {
              id: 'rung:25/seq:0/leg:0',
              state: 'unchanged',
              isEmpty: false,
              nodes: [
                unchangedInstructionNode(
                  'rung:25/seq:0/leg:0/seq:0',
                  instruction('XIC', 'input', ['AutoMode']),
                  undefined,
                  metadata('AutoMode'),
                ),
              ],
            },
            {
              id: 'rung:25/seq:0/leg:1',
              state: 'text-modified',
              isEmpty: false,
              nodes: [
                {
                  kind: 'instruction',
                  id: 'rung:25/seq:0/leg:1/seq:0',
                  state: 'text-modified',
                  instruction: instruction('OTE', 'output', ['Local:2:O.Data.1']),
                  oldInstruction: instruction('OTE', 'output', ['Local:1:O.Data.0']),
                  newInstruction: instruction('OTE', 'output', ['Local:2:O.Data.1']),
                  labelChange: {
                    oldText: 'Local:1:O.Data.0',
                    newText: 'Local:2:O.Data.1',
                    isTruncated: false,
                  },
                  renderMetadata: metadata('Local:2:O.Data.1', '<Local:2:O.Data.1>'),
                  oldRenderMetadata: metadata('Local:1:O.Data.0', '<Local:1:O.Data.0>'),
                  newRenderMetadata: metadata('Local:2:O.Data.1', '<Local:2:O.Data.1>'),
                },
              ],
            },
          ],
        },
      ],
      hasStructuralChanges: false,
      hasTextOnlyChanges: true,
    },
  },
  {
    name: 'nested branch leg added',
    input: {
      oldRung: rung(26, [
        branch(
          [instruction('XIC', 'input', ['AutoMode'])],
          [branch([instruction('XIC', 'input', ['ManualMode'])], [instruction('XIC', 'input', ['RemoteMode'])])],
        ),
      ]),
      newRung: rung(26, [
        branch(
          [instruction('XIC', 'input', ['AutoMode'])],
          [branch([instruction('XIC', 'input', ['ManualMode'])], [instruction('XIC', 'input', ['RemoteMode'])])],
          [instruction('OTE', 'output', ['AlarmLatch'])],
        ),
      ]),
    },
    expected: {
      rungNumber: 26,
      rungState: 'modified',
      nodes: [
        {
          kind: 'branch',
          id: 'rung:26/seq:0',
          state: 'replaced',
          legs: [
            {
              id: 'rung:26/seq:0/leg:0',
              state: 'unchanged',
              isEmpty: false,
              nodes: [
                unchangedInstructionNode(
                  'rung:26/seq:0/leg:0/seq:0',
                  instruction('XIC', 'input', ['AutoMode']),
                  undefined,
                  metadata('AutoMode'),
                ),
              ],
            },
            {
              id: 'rung:26/seq:0/leg:1',
              state: 'unchanged',
              isEmpty: false,
              nodes: [
                {
                  kind: 'branch',
                  id: 'rung:26/seq:0/leg:1/seq:0',
                  state: 'unchanged',
                  legs: [
                    {
                      id: 'rung:26/seq:0/leg:1/seq:0/leg:0',
                      state: 'unchanged',
                      isEmpty: false,
                      nodes: [
                        unchangedInstructionNode(
                          'rung:26/seq:0/leg:1/seq:0/leg:0/seq:0',
                          instruction('XIC', 'input', ['ManualMode']),
                          undefined,
                          metadata('ManualMode'),
                        ),
                      ],
                    },
                    {
                      id: 'rung:26/seq:0/leg:1/seq:0/leg:1',
                      state: 'unchanged',
                      isEmpty: false,
                      nodes: [
                        unchangedInstructionNode(
                          'rung:26/seq:0/leg:1/seq:0/leg:1/seq:0',
                          instruction('XIC', 'input', ['RemoteMode']),
                          undefined,
                          metadata('RemoteMode'),
                        ),
                      ],
                    },
                  ],
                },
              ],
            },
            {
              id: 'rung:26/seq:0/leg:2',
              state: 'added',
              isEmpty: false,
              nodes: [
                addedInstructionNode(
                  'rung:26/seq:0/leg:2/seq:0',
                  instruction('OTE', 'output', ['AlarmLatch']),
                  metadata('AlarmLatch'),
                ),
              ],
            },
          ],
        },
      ],
      hasStructuralChanges: true,
      hasTextOnlyChanges: false,
    },
  },
  {
    name: 'nested branch leg removed',
    input: {
      oldRung: rung(27, [
        branch(
          [instruction('XIC', 'input', ['AutoMode'])],
          [instruction('OTE', 'output', ['AlarmLatch'])],
          [branch([instruction('XIC', 'input', ['ManualMode'])], [instruction('XIC', 'input', ['RemoteMode'])])],
        ),
      ]),
      newRung: rung(27, [
        branch(
          [instruction('XIC', 'input', ['AutoMode'])],
          [branch([instruction('XIC', 'input', ['ManualMode'])], [instruction('XIC', 'input', ['RemoteMode'])])],
        ),
      ]),
    },
    expected: {
      rungNumber: 27,
      rungState: 'modified',
      nodes: [
        {
          kind: 'branch',
          id: 'rung:27/seq:0',
          state: 'replaced',
          legs: [
            {
              id: 'rung:27/seq:0/leg:0',
              state: 'unchanged',
              isEmpty: false,
              nodes: [
                unchangedInstructionNode(
                  'rung:27/seq:0/leg:0/seq:0',
                  instruction('XIC', 'input', ['AutoMode']),
                  undefined,
                  metadata('AutoMode'),
                ),
              ],
            },
            {
              id: 'rung:27/seq:0/leg:1',
              state: 'replaced',
              isEmpty: false,
              nodes: [
                removedInstructionNode(
                  'rung:27/seq:0/leg:1/seq:0/old',
                  instruction('OTE', 'output', ['AlarmLatch']),
                  metadata('AlarmLatch'),
                ),
                {
                  kind: 'branch',
                  id: 'rung:27/seq:0/leg:1/seq:0/new',
                  state: 'added',
                  legs: [
                    {
                      id: 'rung:27/seq:0/leg:1/seq:0/new/leg:0',
                      state: 'added',
                      isEmpty: false,
                      nodes: [
                        addedInstructionNode(
                          'rung:27/seq:0/leg:1/seq:0/new/leg:0/seq:0',
                          instruction('XIC', 'input', ['ManualMode']),
                          metadata('ManualMode'),
                        ),
                      ],
                    },
                    {
                      id: 'rung:27/seq:0/leg:1/seq:0/new/leg:1',
                      state: 'added',
                      isEmpty: false,
                      nodes: [
                        addedInstructionNode(
                          'rung:27/seq:0/leg:1/seq:0/new/leg:1/seq:0',
                          instruction('XIC', 'input', ['RemoteMode']),
                          metadata('RemoteMode'),
                        ),
                      ],
                    },
                  ],
                },
              ],
            },
            {
              id: 'rung:27/seq:0/leg:2',
              state: 'removed',
              isEmpty: false,
              nodes: [
                {
                  kind: 'branch',
                  id: 'rung:27/seq:0/leg:2/seq:0',
                  state: 'removed',
                  legs: [
                    {
                      id: 'rung:27/seq:0/leg:2/seq:0/leg:0',
                      state: 'removed',
                      isEmpty: false,
                      nodes: [
                        removedInstructionNode(
                          'rung:27/seq:0/leg:2/seq:0/leg:0/seq:0',
                          instruction('XIC', 'input', ['ManualMode']),
                          metadata('ManualMode'),
                        ),
                      ],
                    },
                    {
                      id: 'rung:27/seq:0/leg:2/seq:0/leg:1',
                      state: 'removed',
                      isEmpty: false,
                      nodes: [
                        removedInstructionNode(
                          'rung:27/seq:0/leg:2/seq:0/leg:1/seq:0',
                          instruction('XIC', 'input', ['RemoteMode']),
                          metadata('RemoteMode'),
                        ),
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      hasStructuralChanges: true,
      hasTextOnlyChanges: false,
    },
  },
];