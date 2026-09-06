import { afterEach, describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BoxSymbol, calculateBoxDimensions } from '../../src/components/svg/BoxSymbol';
import {
  createInstructionRegistry,
  globalInstructionRegistry,
  registerAOI,
} from '../../src/types';

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

  it('renders AOI labels from an explicit controller context', () => {
    const instructionRegistry = createInstructionRegistry();
    registerAOI(instructionRegistry, {
      name: CUSTOM_MNEMONIC,
      parameters: [{ name: 'Controller Input', usage: 'Input', visible: true }],
    });

    const markup = renderToStaticMarkup(createElement(BoxSymbol, {
      mnemonic: CUSTOM_MNEMONIC,
      operands: ['InputTag'],
      instructionContext: { instructionRegistry },
    }));

    expect(markup).toContain('Controller Input');
    expect(globalInstructionRegistry.has(CUSTOM_MNEMONIC)).toBe(false);
  });
});
