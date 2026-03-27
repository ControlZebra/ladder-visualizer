import type { Instruction } from '../../types';
import { getInstructionLabelAndAddress } from '../../layout/rungLayout';
import { truncateTextChange, type TruncateTextChangeOptions } from './truncateTextChange';
import type {
  InlineDiffState,
  InlineInstructionRenderMetadata,
  InlineOperandTextChange,
  InlineTextChange,
} from './types';

export interface InstructionChangeClassification {
  state: InlineDiffState;
  instruction?: Instruction;
  oldInstruction?: Instruction;
  newInstruction?: Instruction;
  textChange?: InlineTextChange;
  changedOperandIndex?: number;
  operandTextChanges?: InlineOperandTextChange[];
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

function isContactOrCoil(instruction: Instruction): boolean {
  return instruction.category === 'input' || instruction.category === 'output';
}

function hasReorderedOrAmbiguousOperandMapping(
  oldInstruction: Instruction,
  newInstruction: Instruction,
  changedOperandIndexes: number[],
): boolean {
  if (changedOperandIndexes.length <= 1) {
    return false;
  }

  const oldChangedOperands = new Set(
    changedOperandIndexes.map((index) => oldInstruction.operands[index] ?? ''),
  );

  return changedOperandIndexes.some((index) => oldChangedOperands.has(newInstruction.operands[index] ?? ''));
}

function buildOperandTextChanges(
  oldInstruction: Instruction,
  newInstruction: Instruction,
  changedOperandIndexes: number[],
  options: TruncateTextChangeOptions,
): InlineOperandTextChange[] {
  return changedOperandIndexes.map((operandIndex) => ({
    operandIndex,
    change: truncateTextChange(
      oldInstruction.operands[operandIndex] ?? '',
      newInstruction.operands[operandIndex] ?? '',
      options,
    ),
  }));
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

  if (changedOperandIndexes.length === 0) {
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

  if (
    !isContactOrCoil(newInstruction) &&
    !hasReorderedOrAmbiguousOperandMapping(oldInstruction, newInstruction, changedOperandIndexes)
  ) {
    const operandTextChanges = buildOperandTextChanges(
      oldInstruction,
      newInstruction,
      changedOperandIndexes,
      options,
    );
    const changedOperandIndex = changedOperandIndexes.length === 1 ? changedOperandIndexes[0] : undefined;

    return {
      state: 'text-modified',
      instruction: newInstruction,
      oldInstruction,
      newInstruction,
      textChange: changedOperandIndex === undefined ? undefined : operandTextChanges[0]?.change,
      changedOperandIndex,
      operandTextChanges,
      renderMetadata: newRenderMetadata,
      oldRenderMetadata,
      newRenderMetadata,
      hasStructuralChange: false,
      hasTextOnlyChange: true,
    };
  }

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
    isContactOrCoil(newInstruction) &&
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
    changedOperandIndex,
    operandTextChanges: buildOperandTextChanges(oldInstruction, newInstruction, [changedOperandIndex], options),
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