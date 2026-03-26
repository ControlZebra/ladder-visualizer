import type { Instruction } from '../../types';

export type InlineDiffState = 'unchanged' | 'added' | 'removed' | 'replaced' | 'text-modified';

export interface InlineTextChange {
  oldText: string;
  newText: string;
  truncatedOldText?: string;
  truncatedNewText?: string;
  isTruncated: boolean;
}

export interface InlineDiffInstructionNode {
  kind: 'instruction';
  id: string;
  state: InlineDiffState;
  instruction?: Instruction;
  oldInstruction?: Instruction;
  newInstruction?: Instruction;
  textChange?: InlineTextChange;
  labelChange?: InlineTextChange;
}

export interface InlineDiffBranchNode {
  kind: 'branch';
  id: string;
  state: InlineDiffState;
  legs: InlineDiffNode[][];
}

export type InlineDiffNode = InlineDiffInstructionNode | InlineDiffBranchNode;

export interface InlineDiffRungModel {
  rungNumber: number;
  rungState: 'unchanged' | 'added' | 'removed' | 'modified';
  commentChange?: InlineTextChange;
  nodes: InlineDiffNode[];
  hasStructuralChanges: boolean;
  hasTextOnlyChanges: boolean;
}