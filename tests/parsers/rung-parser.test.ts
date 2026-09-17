import { describe, it, expect } from 'vitest';
import {
  parseRung,
  parseRungDetailed,
  parseRungs,
  parseRungWithBranches,
  tokenizeRung,
} from '../../src/parsers/rung-parser';
import { isBranchGroup } from '../../src/types';

describe('parseRung', () => {
  it('should parse a simple XIC/OTE rung', () => {
    const rung = 'XIC(TagA)OTE(TagB);';
    const result = parseRung(rung);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      mnemonic: 'XIC',
      operands: ['TagA'],
      category: 'input',
    });
    expect(result[1]).toEqual({
      mnemonic: 'OTE',
      operands: ['TagB'],
      category: 'output',
    });
  });

  it('should parse a rung with multiple operands', () => {
    const rung = 'GEQ(WBGT_Fahreheit,87)XIC(Associates_Classified_as_Heavy_Duty)OTE(ThresholdLimitReachHeavy_0to25);';
    const result = parseRung(rung);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      mnemonic: 'GEQ',
      operands: ['WBGT_Fahreheit', '87'],
      category: 'compare',
    });
    expect(result[1]).toEqual({
      mnemonic: 'XIC',
      operands: ['Associates_Classified_as_Heavy_Duty'],
      category: 'input',
    });
    expect(result[2]).toEqual({
      mnemonic: 'OTE',
      operands: ['ThresholdLimitReachHeavy_0to25'],
      category: 'output',
    });
  });

  it('should parse CPT instruction with expression', () => {
    const rung = 'CPT(Tw,V5+V7-V9+(V11*V13)-4.686035);';
    const result = parseRung(rung);

    expect(result).toHaveLength(1);
    expect(result[0].mnemonic).toBe('CPT');
    expect(result[0].operands).toHaveLength(2);
    expect(result[0].operands[0]).toBe('Tw');
    expect(result[0].operands[1]).toBe('V5+V7-V9+(V11*V13)-4.686035');
    expect(result[0].category).toBe('math');
  });

  it('should parse ATN instruction', () => {
    const rung = 'ATN(V6,V7);';
    const result = parseRung(rung);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      mnemonic: 'ATN',
      operands: ['V6', 'V7'],
      category: 'math',
    });
  });

  it('should parse XPY (exponent) instruction', () => {
    const rung = 'XPY(V1,0.5,V2);';
    const result = parseRung(rung);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      mnemonic: 'XPY',
      operands: ['V1', '0.5', 'V2'],
      category: 'math',
    });
  });

  it('should parse LIM (limit) instruction', () => {
    const rung = 'LIM(78,WBGT_Fahreheit,81.99)XIC(Associates_Classified_as_Heavy_Duty)OTE(ActionLimitReached_for_HeavyWork_25to50);';
    const result = parseRung(rung);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      mnemonic: 'LIM',
      operands: ['78', 'WBGT_Fahreheit', '81.99'],
      category: 'compare',
    });
  });

  it('should handle XIO (normally closed contact)', () => {
    const rung = 'XIO(StopButton)OTE(Motor);';
    const result = parseRung(rung);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      mnemonic: 'XIO',
      operands: ['StopButton'],
      category: 'input',
    });
  });

  it('should handle OTL and OTU (latch/unlatch)', () => {
    const rung = 'XIC(Start)OTL(Latch);';
    const result = parseRung(rung);

    expect(result[1]).toEqual({
      mnemonic: 'OTL',
      operands: ['Latch'],
      category: 'output',
    });

    const rung2 = 'XIC(Stop)OTU(Latch);';
    const result2 = parseRung(rung2);

    expect(result2[1]).toEqual({
      mnemonic: 'OTU',
      operands: ['Latch'],
      category: 'output',
    });
  });

  it('should return empty array for empty rung', () => {
    const result = parseRung('');
    expect(result).toEqual([]);
  });

  it('should handle rung without trailing semicolon', () => {
    const rung = 'XIC(Tag1)OTE(Tag2)';
    const result = parseRung(rung);

    expect(result).toHaveLength(2);
  });
});

describe('parseRungs', () => {
  it('should parse multiple rungs', () => {
    const rungs = ['XIC(A)OTE(B);', 'XIC(C)OTE(D);'];
    const result = parseRungs(rungs);

    expect(result).toHaveLength(2);
    expect(result[0]).toHaveLength(2);
    expect(result[1]).toHaveLength(2);
  });
});

describe('parseRungWithBranches', () => {
  it('should parse a simple branch with two legs', () => {
    const rung = '[XIC(A),XIC(B)]OTE(Output);';
    const result = parseRungWithBranches(rung);

    expect(result).toHaveLength(2);
    
    // First element should be a branch group
    const branch = result[0];
    expect(isBranchGroup(branch)).toBe(true);
    if (isBranchGroup(branch)) {
      expect(branch.branches).toHaveLength(2);
      expect(branch.branches[0]).toHaveLength(1);
      expect(branch.branches[1]).toHaveLength(1);
      expect((branch.branches[0][0] as any).mnemonic).toBe('XIC');
      expect((branch.branches[0][0] as any).operands[0]).toBe('A');
      expect((branch.branches[1][0] as any).mnemonic).toBe('XIC');
      expect((branch.branches[1][0] as any).operands[0]).toBe('B');
    }
    
    // Second element should be OTE
    expect(isBranchGroup(result[1])).toBe(false);
    expect((result[1] as any).mnemonic).toBe('OTE');
  });

  it('should parse nested branches', () => {
    const rung = '[XIC(A),[XIC(B),XIC(C)]]GEQ(X,89)OTE(Output);';
    const result = parseRungWithBranches(rung);

    expect(result).toHaveLength(3);
    
    // First element should be a branch group
    const branch = result[0];
    expect(isBranchGroup(branch)).toBe(true);
    if (isBranchGroup(branch)) {
      expect(branch.branches).toHaveLength(2);
      
      // First leg: XIC(A)
      expect(branch.branches[0]).toHaveLength(1);
      expect((branch.branches[0][0] as any).mnemonic).toBe('XIC');
      
      // Second leg: nested branch [XIC(B),XIC(C)]
      expect(branch.branches[1]).toHaveLength(1);
      const nestedBranch = branch.branches[1][0];
      expect(isBranchGroup(nestedBranch)).toBe(true);
      if (isBranchGroup(nestedBranch)) {
        expect(nestedBranch.branches).toHaveLength(2);
        expect((nestedBranch.branches[0][0] as any).operands[0]).toBe('B');
        expect((nestedBranch.branches[1][0] as any).operands[0]).toBe('C');
      }
    }
  });

  it('should parse branch with multiple instructions per leg', () => {
    const rung = '[XIC(A)XIC(B),XIC(C)]OTE(Out);';
    const result = parseRungWithBranches(rung);

    expect(result).toHaveLength(2);
    
    const branch = result[0];
    expect(isBranchGroup(branch)).toBe(true);
    if (isBranchGroup(branch)) {
      // First leg has two instructions
      expect(branch.branches[0]).toHaveLength(2);
      expect((branch.branches[0][0] as any).operands[0]).toBe('A');
      expect((branch.branches[0][1] as any).operands[0]).toBe('B');
      
      // Second leg has one instruction
      expect(branch.branches[1]).toHaveLength(1);
    }
  });

  it('should flatten branches in parseRung for backward compatibility', () => {
    const rung = '[XIC(A),XIC(B)]OTE(Output);';
    const result = parseRung(rung);

    // Should flatten to 3 instructions: XIC(A), XIC(B), OTE(Output)
    expect(result).toHaveLength(3);
    expect(result[0].mnemonic).toBe('XIC');
    expect(result[0].operands[0]).toBe('A');
    expect(result[1].mnemonic).toBe('XIC');
    expect(result[1].operands[0]).toBe('B');
    expect(result[2].mnemonic).toBe('OTE');
  });
});

describe('parseRungDetailed grammar', () => {
  it('tokenizes identifiers, delimiters, strings, separators, and raw expressions', () => {
    expect(tokenizeRung('CPT(Dest,MAX(A,B)+1)VendorOp("A,B",Tag);').map((token) => [
      token.kind,
      token.value,
    ])).toEqual([
      ['identifier', 'CPT'],
      ['open-paren', '('],
      ['identifier', 'Dest'],
      ['comma', ','],
      ['identifier', 'MAX'],
      ['open-paren', '('],
      ['identifier', 'A'],
      ['comma', ','],
      ['identifier', 'B'],
      ['close-paren', ')'],
      ['raw', '+1'],
      ['close-paren', ')'],
      ['identifier', 'VendorOp'],
      ['open-paren', '('],
      ['string', '"A,B"'],
      ['comma', ','],
      ['identifier', 'Tag'],
      ['close-paren', ')'],
      ['semicolon', ';'],
    ]);
  });

  it('keeps nested calls and quoted delimiters inside their operands', () => {
    const rung = 'CPT(Destination,MAX(A,B)+1)VendorOp("A,B[0]",Tag);';
    const result = parseRungDetailed(rung);

    expect(result.diagnostics).toEqual([]);
    expect(result.instructions.map(({ mnemonic, operands, category }) => ({
      mnemonic,
      operands,
      category,
    }))).toEqual([
      { mnemonic: 'CPT', operands: ['Destination', 'MAX(A,B)+1'], category: 'math' },
      { mnemonic: 'VendorOp', operands: ['"A,B[0]"', 'Tag'], category: 'other' },
    ]);
    expect(result.instructions[0].source).toBe('CPT(Destination,MAX(A,B)+1)');
    expect(result.instructions[0].sourceSpan).toEqual({ start: 0, end: 27 });
    expect(result.instructions[0].operandSpans).toEqual([
      { start: 4, end: 15 },
      { start: 16, end: 26 },
    ]);
  });

  it('preserves deterministic nested branch order', () => {
    const result = parseRungDetailed('[XIC(A),[XIC(B),XIC(C)]]OTE(Output);');
    const outer = result.elements[0];

    expect(isBranchGroup(outer)).toBe(true);
    if (!isBranchGroup(outer)) return;
    expect(outer.branches).toHaveLength(2);
    expect((outer.branches[0][0] as { operands: string[] }).operands).toEqual(['A']);
    const inner = outer.branches[1][0];
    expect(isBranchGroup(inner)).toBe(true);
    if (!isBranchGroup(inner)) return;
    expect(inner.branches.map((leg) => (leg[0] as { operands: string[] }).operands[0])).toEqual([
      'B',
      'C',
    ]);
    expect(result.instructions.map((instruction) => instruction.operands[0])).toEqual([
      'A',
      'B',
      'C',
      'Output',
    ]);
  });

  it('recovers after a mismatched delimiter with a location-aware diagnostic', () => {
    const rung = 'XIC(Start]OTE(Output);';
    const result = parseRungDetailed(rung);

    expect(result.instructions.map((instruction) => instruction.mnemonic)).toEqual(['XIC', 'OTE']);
    expect(result.instructions[0].operands).toEqual(['Start']);
    expect(result.diagnostics).toContainEqual({
      code: 'RLL_MISMATCHED_DELIMITER',
      message: 'Expected ")" before "]".',
      span: { start: rung.indexOf(']'), end: rung.indexOf(']') + 1 },
    });
  });

  it('reports raw tokens instead of silently skipping them', () => {
    const rung = 'XIC(A)@OTE(B);';
    const result = parseRungDetailed(rung);

    expect(result.instructions.map((instruction) => instruction.mnemonic)).toEqual(['XIC', 'OTE']);
    expect(result.diagnostics).toContainEqual({
      code: 'RLL_UNEXPECTED_TOKEN',
      message: 'Unexpected rung token "@".',
      span: { start: rung.indexOf('@'), end: rung.indexOf('@') + 1 },
    });
  });

  it('preserves unterminated strings and branches with explicit diagnostics', () => {
    const stringResult = parseRungDetailed('VendorOp("A,B);');
    expect(stringResult.instructions[0].source).toBe('VendorOp("A,B);');
    expect(stringResult.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'RLL_UNTERMINATED_STRING',
      'RLL_UNTERMINATED_INSTRUCTION',
    ]);

    const branchResult = parseRungDetailed('[XIC(A),XIC(B)');
    expect(branchResult.instructions.map((instruction) => instruction.operands[0])).toEqual([
      'A',
      'B',
    ]);
    expect(branchResult.diagnostics).toContainEqual(expect.objectContaining({
      code: 'RLL_UNTERMINATED_BRANCH',
      span: { start: 0, end: 14 },
    }));
  });
});
