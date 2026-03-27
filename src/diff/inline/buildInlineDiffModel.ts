import type { RungDiff } from '../types';
import type { NormalizedRung, RungElement, BranchGroup, Instruction } from '../../types';
import { isBranchGroup } from '../../types';
import { matchRungElements } from './matchRungElements';
import { classifyInstructionChange, getInstructionRenderMetadata } from './classifyInstructionChange';
import { truncateTextChange, type TruncateTextChangeOptions } from './truncateTextChange';
import type {
  InlineDiffBranchLeg,
  InlineDiffBranchNode,
  InlineDiffInstructionNode,
  InlineDiffNode,
  InlineDiffRungModel,
  InlineDiffState,
} from './types';

export type BuildInlineDiffModelInput =
  | ({ rungDiff: RungDiff } & TruncateTextChangeOptions)
  | ({ oldRung?: NormalizedRung; newRung?: NormalizedRung; rungNumber?: number } & TruncateTextChangeOptions);

interface BuildNodeResult {
  nodes: InlineDiffNode[];
  hasStructuralChanges: boolean;
  hasTextOnlyChanges: boolean;
}

function buildInstructionNode(
  instruction: Instruction,
  id: string,
  state: 'added' | 'removed',
): InlineDiffInstructionNode {
  const renderMetadata = getInstructionRenderMetadata(instruction);

  return {
    kind: 'instruction',
    id,
    state,
    instruction,
    oldInstruction: state === 'removed' ? instruction : undefined,
    newInstruction: state === 'added' ? instruction : undefined,
    renderMetadata,
    oldRenderMetadata: state === 'removed' ? renderMetadata : undefined,
    newRenderMetadata: state === 'added' ? renderMetadata : undefined,
  };
}

function buildBranchLeg(
  branchElements: RungElement[],
  id: string,
  state: 'added' | 'removed',
  options: TruncateTextChangeOptions,
): InlineDiffBranchLeg {
  const result = buildSingleSidedNodes(branchElements, id, state, options);

  return {
    id,
    state,
    nodes: result.nodes,
    isEmpty: branchElements.length === 0,
  };
}

function buildSingleSidedNodes(
  elements: RungElement[],
  parentPath: string,
  state: 'added' | 'removed',
  options: TruncateTextChangeOptions,
): BuildNodeResult {
  const nodes: InlineDiffNode[] = elements.map((element, index) => {
    const id = `${parentPath}/seq:${index}`;
    if (isBranchGroup(element)) {
      return buildBranchNode(element, undefined, id, options, state);
    }

    return buildInstructionNode(element, id, state);
  });

  return {
    nodes,
    hasStructuralChanges: nodes.length > 0,
    hasTextOnlyChanges: false,
  };
}

function deriveBranchState(legs: InlineDiffBranchLeg[]): InlineDiffState {
  if (legs.some((leg) => leg.state === 'added' || leg.state === 'removed' || leg.state === 'replaced')) {
    return 'replaced';
  }

  if (legs.some((leg) => leg.state === 'text-modified')) {
    return 'text-modified';
  }

  return 'unchanged';
}

function buildBranchNode(
  oldBranch: BranchGroup | undefined,
  newBranch: BranchGroup | undefined,
  id: string,
  options: TruncateTextChangeOptions,
  forcedState?: 'added' | 'removed',
): InlineDiffBranchNode {
  if (!oldBranch && !newBranch) {
    return {
      kind: 'branch',
      id,
      state: 'unchanged',
      legs: [],
    };
  }

  if (forcedState === 'added' && newBranch) {
    return {
      kind: 'branch',
      id,
      state: 'added',
      legs: newBranch.branches.map((leg, index) => buildBranchLeg(leg, `${id}/leg:${index}`, 'added', options)),
    };
  }

  if (forcedState === 'removed' && oldBranch) {
    return {
      kind: 'branch',
      id,
      state: 'removed',
      legs: oldBranch.branches.map((leg, index) => buildBranchLeg(leg, `${id}/leg:${index}`, 'removed', options)),
    };
  }

  const safeOldBranch = oldBranch ?? { type: 'branch', branches: [] };
  const safeNewBranch = newBranch ?? { type: 'branch', branches: [] };
  const legCount = Math.max(safeOldBranch.branches.length, safeNewBranch.branches.length);
  const legs: InlineDiffBranchLeg[] = [];

  for (let index = 0; index < legCount; index += 1) {
    const oldLeg = safeOldBranch.branches[index];
    const newLeg = safeNewBranch.branches[index];
    const legId = `${id}/leg:${index}`;

    if (oldLeg && newLeg) {
      const result = buildNodes(oldLeg, newLeg, legId, options);
      let state: InlineDiffState = 'unchanged';
      if (result.hasStructuralChanges) {
        state = 'replaced';
      } else if (result.hasTextOnlyChanges) {
        state = 'text-modified';
      }

      legs.push({
        id: legId,
        state,
        nodes: result.nodes,
        isEmpty: oldLeg.length === 0 && newLeg.length === 0,
      });
      continue;
    }

    if (oldLeg) {
      legs.push(buildBranchLeg(oldLeg, legId, 'removed', options));
      continue;
    }

    if (newLeg) {
      legs.push(buildBranchLeg(newLeg, legId, 'added', options));
    }
  }

  return {
    kind: 'branch',
    id,
    state: deriveBranchState(legs),
    legs,
  };
}

function buildNodes(
  oldElements: RungElement[],
  newElements: RungElement[],
  parentPath: string,
  options: TruncateTextChangeOptions,
): BuildNodeResult {
  const matches = matchRungElements(oldElements, newElements, parentPath);
  const nodes: InlineDiffNode[] = [];
  let hasStructuralChanges = false;
  let hasTextOnlyChanges = false;

  for (const match of matches) {
    switch (match.kind) {
      case 'instruction': {
        const result = classifyInstructionChange(
          match.oldElement as Instruction,
          match.newElement as Instruction,
          options,
        );

        nodes.push({
          kind: 'instruction',
          id: match.id,
          state: result.state,
          instruction: result.instruction,
          oldInstruction: result.oldInstruction,
          newInstruction: result.newInstruction,
          textChange: result.textChange,
          labelChange: result.labelChange,
          renderMetadata: result.renderMetadata,
          oldRenderMetadata: result.oldRenderMetadata,
          newRenderMetadata: result.newRenderMetadata,
        });
        hasStructuralChanges ||= result.hasStructuralChange;
        hasTextOnlyChanges ||= result.hasTextOnlyChange;
        break;
      }
      case 'branch': {
        const node = buildBranchNode(match.oldElement as BranchGroup, match.newElement as BranchGroup, match.id, options);
        nodes.push(node);
        hasStructuralChanges ||= node.state === 'replaced' || node.state === 'added' || node.state === 'removed';
        hasTextOnlyChanges ||= node.state === 'text-modified';
        break;
      }
      case 'added': {
        const newElement = match.newElement as RungElement;
        const node = isBranchGroup(newElement)
          ? buildBranchNode(undefined, newElement, match.id, options, 'added')
          : buildInstructionNode(newElement, match.id, 'added');
        nodes.push(node);
        hasStructuralChanges = true;
        break;
      }
      case 'removed': {
        const oldElement = match.oldElement as RungElement;
        const node = isBranchGroup(oldElement)
          ? buildBranchNode(oldElement, undefined, match.id, options, 'removed')
          : buildInstructionNode(oldElement, match.id, 'removed');
        nodes.push(node);
        hasStructuralChanges = true;
        break;
      }
      case 'mismatch': {
        const oldElement = match.oldElement as RungElement;
        const newElement = match.newElement as RungElement;
        nodes.push(
          isBranchGroup(oldElement)
            ? buildBranchNode(oldElement, undefined, `${match.id}/old`, options, 'removed')
            : buildInstructionNode(oldElement, `${match.id}/old`, 'removed'),
        );
        nodes.push(
          isBranchGroup(newElement)
            ? buildBranchNode(undefined, newElement, `${match.id}/new`, options, 'added')
            : buildInstructionNode(newElement, `${match.id}/new`, 'added'),
        );
        hasStructuralChanges = true;
        break;
      }
    }
  }

  return {
    nodes,
    hasStructuralChanges,
    hasTextOnlyChanges,
  };
}

function normalizeInput(input: BuildInlineDiffModelInput): {
  oldRung?: NormalizedRung;
  newRung?: NormalizedRung;
  rungNumber: number;
  options: TruncateTextChangeOptions;
} {
  if ('rungDiff' in input) {
    return {
      oldRung: input.rungDiff.oldRung,
      newRung: input.rungDiff.newRung,
      rungNumber: input.rungDiff.rungNumber,
      options: {
        maxLength: input.maxLength,
        ellipsis: input.ellipsis,
      },
    };
  }

  return {
    oldRung: input.oldRung,
    newRung: input.newRung,
    rungNumber: input.rungNumber ?? input.newRung?.number ?? input.oldRung?.number ?? 0,
    options: {
      maxLength: input.maxLength,
      ellipsis: input.ellipsis,
    },
  };
}

export function buildInlineDiffModel(input: BuildInlineDiffModelInput): InlineDiffRungModel {
  const { oldRung, newRung, rungNumber, options } = normalizeInput(input);
  const oldElements = oldRung?.elements ?? [];
  const newElements = newRung?.elements ?? [];
  const result = buildNodes(oldElements, newElements, `rung:${rungNumber}`, options);

  const oldComment = oldRung?.comment ?? '';
  const newComment = newRung?.comment ?? '';
  const commentChange = oldComment !== newComment
    ? truncateTextChange(oldComment, newComment, options)
    : undefined;

  let rungState: InlineDiffRungModel['rungState'] = 'unchanged';
  if (!oldRung && newRung) {
    rungState = 'added';
  } else if (oldRung && !newRung) {
    rungState = 'removed';
  } else if (result.hasStructuralChanges || result.hasTextOnlyChanges || commentChange) {
    rungState = 'modified';
  }

  return {
    rungNumber,
    rungState,
    commentChange,
    nodes: result.nodes,
    hasStructuralChanges: rungState === 'added' || rungState === 'removed' || result.hasStructuralChanges,
    hasTextOnlyChanges: result.hasTextOnlyChanges || Boolean(commentChange),
  };
}