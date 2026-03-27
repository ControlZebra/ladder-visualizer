import type { LadderDiagramTheme } from '../../types';

export type InstructionVisualState = 'unchanged' | 'added' | 'removed' | 'replaced' | 'text-modified';

export interface InstructionVisualColors {
  tintStrokeColor: string;
  tintFillColor: string;
  wireColor: string;
  labelColor: string;
  addressColor: string;
  contactColor: string;
  contactNCColor: string;
  coilColor: string;
  boxBorderColor: string;
  boxBgColor: string;
  boxTextColor: string;
}

export function getInstructionVisualColors(
  state: InstructionVisualState,
  theme: Required<LadderDiagramTheme>,
): InstructionVisualColors {
  if (state === 'added') {
    return {
      tintStrokeColor: theme.diffAddedBorderColor,
      tintFillColor: theme.diffAddedFillColor,
      wireColor: theme.diffAddedBorderColor,
      labelColor: theme.diffAddedBorderColor,
      addressColor: theme.diffAddedBorderColor,
      contactColor: theme.diffAddedBorderColor,
      contactNCColor: theme.diffAddedBorderColor,
      coilColor: theme.diffAddedBorderColor,
      boxBorderColor: theme.diffAddedBorderColor,
      boxBgColor: 'transparent',
      boxTextColor: theme.diffAddedBorderColor,
    };
  }

  if (state === 'removed') {
    return {
      tintStrokeColor: theme.diffRemovedBorderColor,
      tintFillColor: theme.diffRemovedFillColor,
      wireColor: theme.diffRemovedBorderColor,
      labelColor: theme.diffRemovedBorderColor,
      addressColor: theme.diffRemovedBorderColor,
      contactColor: theme.diffRemovedBorderColor,
      contactNCColor: theme.diffRemovedBorderColor,
      coilColor: theme.diffRemovedBorderColor,
      boxBorderColor: theme.diffRemovedBorderColor,
      boxBgColor: 'transparent',
      boxTextColor: theme.diffRemovedBorderColor,
    };
  }

  return {
    tintStrokeColor: 'transparent',
    tintFillColor: 'transparent',
    wireColor: theme.wireColor,
    labelColor: theme.labelColor,
    addressColor: theme.addressColor,
    contactColor: theme.contactColor,
    contactNCColor: theme.contactNCColor,
    coilColor: theme.coilColor,
    boxBorderColor: theme.boxBorderColor,
    boxBgColor: theme.boxBgColor,
    boxTextColor: theme.boxTextColor,
  };
}