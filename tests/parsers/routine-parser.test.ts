import { describe, it, expect } from 'vitest';
import { parseRoutine } from '../../src/parsers/routine-parser';
import type { Routine } from '../../src/types';

describe('parseRoutine', () => {
  it('should parse a routine with multiple rungs', () => {
    const routine: Routine = {
      name: 'MainRoutine',
      type: 'RLL',
      rungs: [
        'GEQ(WBGT_Fahreheit,87)XIC(Heavy_Duty)OTE(Threshold);',
        'ATN(V6,V7);',
        'CPT(Tw,V5+V7-V9);',
      ],
    };

    const result = parseRoutine(routine);

    expect(result.name).toBe('MainRoutine');
    expect(result.type).toBe('RLL');
    expect(result.rungs).toHaveLength(3);

    // First rung
    expect(result.rungs[0].raw).toBe(routine.rungs[0]);
    expect(result.rungs[0].instructions).toHaveLength(3);
    expect(result.rungs[0].instructions[0].mnemonic).toBe('GEQ');

    // Second rung
    expect(result.rungs[1].instructions).toHaveLength(1);
    expect(result.rungs[1].instructions[0].mnemonic).toBe('ATN');

    // Third rung
    expect(result.rungs[2].instructions).toHaveLength(1);
    expect(result.rungs[2].instructions[0].mnemonic).toBe('CPT');
  });

  it('should preserve the raw rung string', () => {
    const routine: Routine = {
      name: 'Test',
      type: 'RLL',
      rungs: ['XIC(Input)OTE(Output);'],
    };

    const result = parseRoutine(routine);

    expect(result.rungs[0].raw).toBe('XIC(Input)OTE(Output);');
  });

  it('should handle empty routine', () => {
    const routine: Routine = {
      name: 'EmptyRoutine',
      type: 'RLL',
      rungs: [],
    };

    const result = parseRoutine(routine);

    expect(result.rungs).toHaveLength(0);
  });
});
