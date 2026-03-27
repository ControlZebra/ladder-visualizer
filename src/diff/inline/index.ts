export type {
  InlineDiffBranchLeg,
  InlineDiffBranchNode,
  InlineDiffInstructionNode,
  InlineDiffNode,
  InlineDiffRungModel,
  InlineDiffState,
  InlineInstructionRenderMetadata,
  InlineTextChange,
} from './types';

export { truncateTextChange } from './truncateTextChange';
export type { TruncateTextChangeOptions } from './truncateTextChange';

export { classifyInstructionChange, getInstructionRenderMetadata } from './classifyInstructionChange';
export type { InstructionChangeClassification } from './classifyInstructionChange';

export { matchRungElements } from './matchRungElements';
export type { InlineDiffElementMatch, InlineDiffElementMatchKind } from './matchRungElements';

export { buildInlineDiffModel } from './buildInlineDiffModel';
export type { BuildInlineDiffModelInput } from './buildInlineDiffModel';