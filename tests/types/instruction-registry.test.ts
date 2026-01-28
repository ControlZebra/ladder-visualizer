import { describe, it, expect, beforeEach } from 'vitest';
import {
  InstructionRegistry,
  InstructionDefinition,
  createInstructionRegistry,
  createEmptyInstructionRegistry,
  globalInstructionRegistry,
  DEFAULT_INSTRUCTIONS,
  registerAOI,
  registerAOIs,
  clearAOIs,
  isAOI,
  AOIRegistrationInfo,
} from '../../src/types/instruction-registry';
import { getInstructionCategory, getInstructionDisplayName, getInstructionParameterLabels } from '../../src/types/instructions';

describe('InstructionRegistry', () => {
  let registry: InstructionRegistry;

  beforeEach(() => {
    registry = createEmptyInstructionRegistry();
  });

  describe('register', () => {
    it('should register a new instruction definition', () => {
      const definition: InstructionDefinition = {
        mnemonic: 'TEST',
        category: 'other',
        displayName: 'Test Instruction',
        parameterLabels: ['Param1', 'Param2'],
        symbolType: 'box',
      };

      registry.register(definition);

      expect(registry.has('TEST')).toBe(true);
      expect(registry.get('TEST')).toEqual(definition);
    });

    it('should throw error when registering duplicate without overwrite', () => {
      const definition: InstructionDefinition = {
        mnemonic: 'TEST',
        category: 'other',
        displayName: 'Test',
        parameterLabels: [],
        symbolType: 'box',
      };

      registry.register(definition);
      expect(() => registry.register(definition)).toThrow("Instruction 'TEST' is already registered");
    });

    it('should allow overwriting with option', () => {
      const definition1: InstructionDefinition = {
        mnemonic: 'TEST',
        category: 'other',
        displayName: 'Original',
        parameterLabels: [],
        symbolType: 'box',
      };
      const definition2: InstructionDefinition = {
        mnemonic: 'TEST',
        category: 'math',
        displayName: 'Updated',
        parameterLabels: ['A'],
        symbolType: 'box',
      };

      registry.register(definition1);
      registry.register(definition2, { overwrite: true });

      expect(registry.get('TEST')?.displayName).toBe('Updated');
      expect(registry.getCategory('TEST')).toBe('math');
    });
  });

  describe('getCategory', () => {
    it('should return correct category for registered instruction', () => {
      registry.register({
        mnemonic: 'XIC',
        category: 'input',
        displayName: 'Examine If Closed',
        parameterLabels: ['Bit'],
        symbolType: 'contact',
      });

      expect(registry.getCategory('XIC')).toBe('input');
    });

    it('should return "other" for unknown instruction', () => {
      expect(registry.getCategory('UNKNOWN')).toBe('other');
    });
  });

  describe('getDisplayName', () => {
    it('should return display name for registered instruction', () => {
      registry.register({
        mnemonic: 'TON',
        category: 'timer',
        displayName: 'Timer On Delay',
        parameterLabels: ['Timer', 'Preset', 'Accum'],
        symbolType: 'box',
      });

      expect(registry.getDisplayName('TON')).toBe('Timer On Delay');
    });

    it('should return mnemonic for unknown instruction', () => {
      expect(registry.getDisplayName('CUSTOM')).toBe('CUSTOM');
    });
  });

  describe('getParameterLabels', () => {
    it('should return parameter labels for registered instruction', () => {
      registry.register({
        mnemonic: 'ADD',
        category: 'math',
        displayName: 'Add',
        parameterLabels: ['Source A', 'Source B', 'Dest'],
        symbolType: 'box',
      });

      expect(registry.getParameterLabels('ADD')).toEqual(['Source A', 'Source B', 'Dest']);
    });

    it('should return empty array for unknown instruction', () => {
      expect(registry.getParameterLabels('UNKNOWN')).toEqual([]);
    });
  });

  describe('getMnemonicsByCategory', () => {
    it('should return all mnemonics in a category', () => {
      registry.register({
        mnemonic: 'XIC',
        category: 'input',
        displayName: 'XIC',
        parameterLabels: [],
        symbolType: 'contact',
      });
      registry.register({
        mnemonic: 'XIO',
        category: 'input',
        displayName: 'XIO',
        parameterLabels: [],
        symbolType: 'contact',
      });
      registry.register({
        mnemonic: 'OTE',
        category: 'output',
        displayName: 'OTE',
        parameterLabels: [],
        symbolType: 'coil',
      });

      const inputs = registry.getMnemonicsByCategory('input');
      expect(inputs).toContain('XIC');
      expect(inputs).toContain('XIO');
      expect(inputs).not.toContain('OTE');
    });
  });

  describe('clone', () => {
    it('should create independent copy of registry', () => {
      registry.register({
        mnemonic: 'TEST',
        category: 'other',
        displayName: 'Test',
        parameterLabels: [],
        symbolType: 'box',
      });

      const clone = registry.clone();
      registry.clear();

      expect(registry.has('TEST')).toBe(false);
      expect(clone.has('TEST')).toBe(true);
    });
  });
});

describe('globalInstructionRegistry', () => {
  it('should have all default instructions registered', () => {
    expect(globalInstructionRegistry.getAllMnemonics().length).toBeGreaterThanOrEqual(DEFAULT_INSTRUCTIONS.length);
  });

  it('should have contact instructions', () => {
    expect(globalInstructionRegistry.getCategory('XIC')).toBe('input');
    expect(globalInstructionRegistry.getCategory('XIO')).toBe('input');
  });

  it('should have coil instructions', () => {
    expect(globalInstructionRegistry.getCategory('OTE')).toBe('output');
    expect(globalInstructionRegistry.getCategory('OTL')).toBe('output');
    expect(globalInstructionRegistry.getCategory('OTU')).toBe('output');
  });

  it('should have compare instructions', () => {
    expect(globalInstructionRegistry.getCategory('EQU')).toBe('compare');
    expect(globalInstructionRegistry.getCategory('NEQ')).toBe('compare');
    expect(globalInstructionRegistry.getCategory('GEQ')).toBe('compare');
  });

  it('should have timer instructions', () => {
    expect(globalInstructionRegistry.getCategory('TON')).toBe('timer');
    expect(globalInstructionRegistry.getCategory('TOF')).toBe('timer');
    expect(globalInstructionRegistry.getCategory('RTO')).toBe('timer');
  });

  it('should have counter instructions', () => {
    expect(globalInstructionRegistry.getCategory('CTU')).toBe('counter');
    expect(globalInstructionRegistry.getCategory('CTD')).toBe('counter');
    expect(globalInstructionRegistry.getCategory('RES')).toBe('counter');
  });
});

describe('getInstructionCategory (using registry)', () => {
  it('should return input for contact instructions', () => {
    expect(getInstructionCategory('XIC')).toBe('input');
    expect(getInstructionCategory('XIO')).toBe('input');
  });

  it('should return output for coil instructions', () => {
    expect(getInstructionCategory('OTE')).toBe('output');
    expect(getInstructionCategory('OTL')).toBe('output');
    expect(getInstructionCategory('OTU')).toBe('output');
  });

  it('should return compare for comparison instructions', () => {
    expect(getInstructionCategory('EQU')).toBe('compare');
    expect(getInstructionCategory('GRT')).toBe('compare');
    expect(getInstructionCategory('LIM')).toBe('compare');
  });

  it('should return math for math instructions', () => {
    expect(getInstructionCategory('ADD')).toBe('math');
    expect(getInstructionCategory('MOV')).toBe('math');
    expect(getInstructionCategory('CPT')).toBe('math');
  });

  it('should return timer for timer instructions', () => {
    expect(getInstructionCategory('TON')).toBe('timer');
    expect(getInstructionCategory('TOF')).toBe('timer');
  });

  it('should return counter for counter instructions', () => {
    expect(getInstructionCategory('CTU')).toBe('counter');
    expect(getInstructionCategory('CTD')).toBe('counter');
  });

  it('should return other for unknown instructions', () => {
    expect(getInstructionCategory('UNKNOWN_INST')).toBe('other');
  });
});

describe('getInstructionDisplayName (using registry)', () => {
  it('should return display name for known instructions', () => {
    expect(getInstructionDisplayName('XIC')).toBe('Examine If Closed');
    expect(getInstructionDisplayName('TON')).toBe('Timer On Delay');
    expect(getInstructionDisplayName('ADD')).toBe('Add');
  });

  it('should return mnemonic for unknown instructions', () => {
    expect(getInstructionDisplayName('CUSTOM')).toBe('CUSTOM');
  });
});

describe('getInstructionParameterLabels (using registry)', () => {
  it('should return parameter labels for known instructions', () => {
    expect(getInstructionParameterLabels('ADD')).toEqual(['Source A', 'Source B', 'Dest']);
    expect(getInstructionParameterLabels('TON')).toEqual(['Timer', 'Preset', 'Accum']);
    expect(getInstructionParameterLabels('XIC')).toEqual(['Bit']);
  });

  it('should return empty array for unknown instructions', () => {
    expect(getInstructionParameterLabels('UNKNOWN')).toEqual([]);
  });
});

describe('Custom instruction registration', () => {
  it('should allow registering custom Add-On Instructions (AOIs)', () => {
    const aoiDefinition: InstructionDefinition = {
      mnemonic: 'MyCustomAOI',
      category: 'other',
      displayName: 'My Custom Add-On Instruction',
      parameterLabels: ['Input1', 'Input2', 'Output'],
      symbolType: 'box',
      description: 'A custom AOI for specialized logic',
    };

    globalInstructionRegistry.register(aoiDefinition);

    expect(getInstructionCategory('MyCustomAOI')).toBe('other');
    expect(getInstructionDisplayName('MyCustomAOI')).toBe('My Custom Add-On Instruction');
    expect(getInstructionParameterLabels('MyCustomAOI')).toEqual(['Input1', 'Input2', 'Output']);
  });
});

describe('AOI Registration Utilities', () => {
  let registry: InstructionRegistry;

  beforeEach(() => {
    registry = createEmptyInstructionRegistry();
  });

  describe('registerAOI', () => {
    it('should register an AOI as an instruction with category "aoi"', () => {
      const aoiInfo: AOIRegistrationInfo = {
        name: 'Analog_Input',
        description: 'AOI for analog input scaling and alarming',
        parameters: [
          { name: 'EnableIn', usage: 'Input', visible: false },
          { name: 'EnableOut', usage: 'Output', visible: false },
          { name: 'In_Raw', usage: 'Input', visible: true },
          { name: 'Out_PV', usage: 'Output', visible: true },
        ],
      };

      registerAOI(registry, aoiInfo);

      expect(registry.has('Analog_Input')).toBe(true);
      expect(registry.getCategory('Analog_Input')).toBe('aoi');
      expect(registry.getDisplayName('Analog_Input')).toBe('Analog_Input');
      expect(registry.getSymbolType('Analog_Input')).toBe('box');
    });

    it('should only include visible parameters in parameter labels', () => {
      const aoiInfo: AOIRegistrationInfo = {
        name: 'Discrete_Valve',
        parameters: [
          { name: 'EnableIn', usage: 'Input', visible: false },
          { name: 'EnableOut', usage: 'Output', visible: false },
          { name: 'Command', usage: 'Input', visible: true },
          { name: 'Feedback', usage: 'Input', visible: true },
          { name: 'Output', usage: 'Output', visible: true },
        ],
      };

      registerAOI(registry, aoiInfo);

      const labels = registry.getParameterLabels('Discrete_Valve');
      expect(labels).toEqual(['Command', 'Feedback', 'Output']);
      expect(labels).not.toContain('EnableIn');
      expect(labels).not.toContain('EnableOut');
    });
  });

  describe('registerAOIs', () => {
    it('should register multiple AOIs at once', () => {
      const aois: AOIRegistrationInfo[] = [
        {
          name: 'Analog_Input',
          parameters: [{ name: 'In_Raw', usage: 'Input', visible: true }],
        },
        {
          name: 'Discrete_Valve',
          parameters: [{ name: 'Command', usage: 'Input', visible: true }],
        },
        {
          name: 'PF525_VFD_E_ENET',
          description: 'VFD Motor Control',
          parameters: [
            { name: 'PF525_In', usage: 'InOut', visible: true },
            { name: 'PF525_Out', usage: 'InOut', visible: true },
          ],
        },
      ];

      registerAOIs(registry, aois);

      expect(registry.has('Analog_Input')).toBe(true);
      expect(registry.has('Discrete_Valve')).toBe(true);
      expect(registry.has('PF525_VFD_E_ENET')).toBe(true);
      expect(registry.getMnemonicsByCategory('aoi')).toHaveLength(3);
    });
  });

  describe('clearAOIs', () => {
    it('should remove all AOI registrations', () => {
      // Register some AOIs
      const aois: AOIRegistrationInfo[] = [
        { name: 'AOI1', parameters: [] },
        { name: 'AOI2', parameters: [] },
      ];
      registerAOIs(registry, aois);

      // Also register a non-AOI instruction
      registry.register({
        mnemonic: 'CUSTOM',
        category: 'other',
        displayName: 'Custom',
        parameterLabels: [],
        symbolType: 'box',
      });

      expect(registry.has('AOI1')).toBe(true);
      expect(registry.has('AOI2')).toBe(true);
      expect(registry.has('CUSTOM')).toBe(true);

      // Clear only AOIs
      const removedCount = clearAOIs(registry);

      expect(removedCount).toBe(2);
      expect(registry.has('AOI1')).toBe(false);
      expect(registry.has('AOI2')).toBe(false);
      expect(registry.has('CUSTOM')).toBe(true); // Non-AOI should remain
    });
  });

  describe('isAOI', () => {
    it('should return true for registered AOIs', () => {
      registerAOI(registry, {
        name: 'TestAOI',
        parameters: [],
      });

      expect(isAOI('TestAOI', registry)).toBe(true);
    });

    it('should return false for non-AOI instructions', () => {
      registry.register({
        mnemonic: 'TON',
        category: 'timer',
        displayName: 'Timer',
        parameterLabels: [],
        symbolType: 'box',
      });

      expect(isAOI('TON', registry)).toBe(false);
    });

    it('should return false for unknown instructions', () => {
      expect(isAOI('UNKNOWN', registry)).toBe(false);
    });
  });

  describe('removeByCategory', () => {
    it('should remove all instructions in a category', () => {
      // Register instructions in different categories
      registry.register({
        mnemonic: 'AOI1',
        category: 'aoi',
        displayName: 'AOI 1',
        parameterLabels: [],
        symbolType: 'box',
      });
      registry.register({
        mnemonic: 'AOI2',
        category: 'aoi',
        displayName: 'AOI 2',
        parameterLabels: [],
        symbolType: 'box',
      });
      registry.register({
        mnemonic: 'TON',
        category: 'timer',
        displayName: 'Timer',
        parameterLabels: [],
        symbolType: 'box',
      });

      const removedCount = registry.removeByCategory('aoi');

      expect(removedCount).toBe(2);
      expect(registry.has('AOI1')).toBe(false);
      expect(registry.has('AOI2')).toBe(false);
      expect(registry.has('TON')).toBe(true);
      expect(registry.getMnemonicsByCategory('aoi')).toHaveLength(0);
    });
  });

  describe('remove', () => {
    it('should remove a single instruction', () => {
      registry.register({
        mnemonic: 'TEST',
        category: 'other',
        displayName: 'Test',
        parameterLabels: [],
        symbolType: 'box',
      });

      expect(registry.has('TEST')).toBe(true);

      const removed = registry.remove('TEST');

      expect(removed).toBe(true);
      expect(registry.has('TEST')).toBe(false);
    });

    it('should return false when removing non-existent instruction', () => {
      const removed = registry.remove('NONEXISTENT');
      expect(removed).toBe(false);
    });
  });
});