import { afterEach, describe, expect, it } from 'vitest';
import { finalizeController } from '../../src/parsers/aoi-registration';
import {
  clearAOIs,
  globalInstructionRegistry,
  type Instruction,
  type NormalizedController,
} from '../../src/types';

function createController(): {
  controller: NormalizedController;
  flatInstruction: Instruction;
  elementInstruction: Instruction;
} {
  const flatInstruction: Instruction = {
    mnemonic: 'ControllerAOI',
    operands: ['InputTag'],
    category: 'other',
  };
  const elementInstruction: Instruction = {
    mnemonic: 'ControllerAOI',
    operands: ['InputTag'],
    category: 'other',
  };

  return {
    flatInstruction,
    elementInstruction,
    controller: {
      name: 'FinalizerFixture',
      dataTypes: [],
      tags: [],
      modules: [],
      aois: [{
        name: 'ControllerAOI',
        class: 'Standard',
        executePrescan: false,
        executePostscan: false,
        executeEnableInFalse: false,
        parameters: [{
          name: 'ControllerInput',
          tagType: 'Base',
          dataType: 'DINT',
          usage: 'Input',
          required: true,
          visible: true,
          externalAccess: 'ReadWrite',
        }],
        localTags: [],
        routines: [],
      }],
      programs: [{
        name: 'MainProgram',
        tags: [],
        routines: [{
          name: 'MainRoutine',
          type: 'RLL',
          rungs: [{
            number: 0,
            raw: 'ControllerAOI(InputTag);',
            instructions: [flatInstruction],
            elements: [elementInstruction],
          }],
        }],
      }],
    },
  };
}

describe('finalizeController', () => {
  afterEach(() => {
    clearAOIs(globalInstructionRegistry);
  });

  it('returns one isolated context and classifies both public rung collections', () => {
    const { controller, flatInstruction, elementInstruction } = createController();

    expect(flatInstruction).not.toBe(elementInstruction);

    const result = finalizeController(controller);

    expect(result.controller).toBe(controller);
    expect(result.context.instructionRegistry).not.toBe(globalInstructionRegistry);
    expect(result.context.instructionRegistry.getParameterLabels('ControllerAOI')).toEqual([
      'ControllerInput',
    ]);
    expect(flatInstruction.category).toBe('aoi');
    expect(elementInstruction.category).toBe('aoi');
    expect(globalInstructionRegistry.has('ControllerAOI')).toBe(false);
  });

  it('creates independent contexts for separate controllers', () => {
    const first = finalizeController(createController().controller);
    const second = finalizeController(createController().controller);

    expect(first.context.instructionRegistry).not.toBe(second.context.instructionRegistry);
  });
});
