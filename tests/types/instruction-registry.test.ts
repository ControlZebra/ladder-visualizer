import { describe, it, expect, beforeEach } from 'vitest';
import {
  InstructionRegistry,
  InstructionDefinition,
  createInstructionRegistry,
  createEmptyInstructionRegistry,
  globalInstructionRegistry,
  DEFAULT_INSTRUCTIONS,
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
