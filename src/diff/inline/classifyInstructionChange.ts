import type { Instruction } from '../../types';
import { getInstructionLabelAndAddress } from '../../layout';
import { truncateTextChange, type TruncateTextChangeOptions } from './truncateTextChange';
import type {
  InlineDiffState,
  InlineInstructionRenderMetadata,
  InlineTextChange,
} from './types';

export interface InstructionChangeClassification {
  state: InlineDiffState;
  instruction?: Instruction;
  oldInstruction?: Instruction;
  newInstruction?: Instruction;
  textChange?: InlineTextChange;
  labelChange?: InlineTextChange;
  renderMetadata?: InlineInstructionRenderMetadata;
  oldRenderMetadata?: InlineInstructionRenderMetadata;
  newRenderMetadata?: InlineInstructionRenderMetadata;
  hasStructuralChange: boolean;
  hasTextOnlyChange: boolean;
}

export function getInstructionRenderMetadata(instruction: Instruction): InlineInstructionRenderMetadata {
  const { label, address } = getInstructionLabelAndAddress(instruction);

  return {
    label,
    address,
    hasLabel: Boolean(label),
    hasAddress: Boolean(address),
  };
}

function instructionsEqual(oldInstruction: Instruction, newInstruction: Instruction): boolean {
  if (oldInstruction.mnemonic !== newInstruction.mnemonic) {
    return false;
  }

  if (oldInstruction.operands.length !== newInstruction.operands.length) {
    return false;
  }

  return oldInstruction.operands.every((operand, index) => operand === newInstruction.operands[index]);
}

export function classifyInstructionChange(
  oldInstruction: Instruction,
  newInstruction: Instruction,
  options: TruncateTextChangeOptions = {},
): InstructionChangeClassification {
  const oldRenderMetadata = getInstructionRenderMetadata(oldInstruction);
  const newRenderMetadata = getInstructionRenderMetadata(newInstruction);

  if (instructionsEqual(oldInstruction, newInstruction)) {
    return {
      state: 'unchanged',
      instruction: newInstruction,
      oldInstruction,
      newInstruction,
      renderMetadata: newRenderMetadata,
      oldRenderMetadata,
      newRenderMetadata,
      hasStructuralChange: false,
      hasTextOnlyChange: false,
    };
  }

  if (oldInstruction.mnemonic !== newInstruction.mnemonic || oldInstruction.operands.length !== newInstruction.operands.length) {
    return {
      state: 'replaced',
      oldInstruction,
      newInstruction,
      oldRenderMetadata,
      newRenderMetadata,
      hasStructuralChange: true,
      hasTextOnlyChange: false,
    };
  }

  const changedOperandIndexes = oldInstruction.operands.reduce<number[]>((indexes, operand, index) => {
    if (operand !== newInstruction.operands[index]) {
      indexes.push(index);
    }
    return indexes;
  }, []);

  if (changedOperandIndexes.length !== 1) {
    return {
      state: 'replaced',
      oldInstruction,
      newInstruction,
      oldRenderMetadata,
      newRenderMetadata,
      hasStructuralChange: true,
      hasTextOnlyChange: false,
    };
  }

  const changedOperandIndex = changedOperandIndexes[0];

  if (
    (newInstruction.category === 'input' || newInstruction.category === 'output') &&
    changedOperandIndex === 0
  ) {
    return {
      state: 'text-modified',
      instruction: newInstruction,
      oldInstruction,
      newInstruction,
      labelChange: truncateTextChange(
        oldRenderMetadata.label ?? oldInstruction.operands[0] ?? '',
        newRenderMetadata.label ?? newInstruction.operands[0] ?? '',
        options,
      ),
      renderMetadata: newRenderMetadata,
      oldRenderMetadata,
      newRenderMetadata,
      hasStructuralChange: false,
      hasTextOnlyChange: true,
    };
  }

  return {
    state: 'text-modified',
    instruction: newInstruction,
    oldInstruction,
    newInstruction,
    textChange: truncateTextChange(
      oldInstruction.operands[changedOperandIndex] ?? '',
      newInstruction.operands[changedOperandIndex] ?? '',
      options,
    ),
    renderMetadata: newRenderMetadata,
    oldRenderMetadata,
    newRenderMetadata,
    hasStructuralChange: false,
    hasTextOnlyChange: true,
  };
}