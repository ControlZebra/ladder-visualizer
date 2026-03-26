import { afterEach, describe, expect, it } from 'vitest';
import { calculateBoxDimensions } from '../../src/components/svg/BoxSymbol';
import { globalInstructionRegistry } from '../../src/types';

const CUSTOM_MNEMONIC = '__PHASE0_INLINE_DIFF__';

afterEach(() => {
  globalInstructionRegistry.remove(CUSTOM_MNEMONIC);
});

describe('calculateBoxDimensions', () => {
  it('uses registry metadata instead of hardcoded box label maps', () => {
    const fallback = calculateBoxDimensions(CUSTOM_MNEMONIC, ['DestTag']);

    globalInstructionRegistry.register({
      mnemonic: CUSTOM_MNEMONIC,
      category: 'other',
      displayName: 'Phase Zero Inline Diff Validation Instruction',
      parameterLabels: ['Destination Register Value'],
      symbolType: 'box',
    });

    const registryBacked = calculateBoxDimensions(CUSTOM_MNEMONIC, ['DestTag']);

    expect(registryBacked.width).toBeGreaterThan(fallback.width);
  });
});