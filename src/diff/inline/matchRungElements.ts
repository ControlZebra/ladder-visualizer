import type { RungElement } from '../../types';
import { isBranchGroup } from '../../types';

export type InlineDiffElementMatchKind = 'instruction' | 'branch' | 'added' | 'removed' | 'mismatch';

export interface InlineDiffElementMatch {
  id: string;
  kind: InlineDiffElementMatchKind;
  oldElement?: RungElement;
  newElement?: RungElement;
  oldIndex?: number;
  newIndex?: number;
}

function instructionsExactlyEqual(oldElement: RungElement, newElement: RungElement): boolean {
  if (isBranchGroup(oldElement) || isBranchGroup(newElement)) {
    return false;
  }

  return (
    oldElement.mnemonic === newElement.mnemonic &&
    oldElement.category === newElement.category &&
    oldElement.operands.length === newElement.operands.length &&
    oldElement.operands.every((operand, index) => operand === newElement.operands[index])
  );
}

function elementsExactlyEqual(oldElement: RungElement, newElement: RungElement): boolean {
  if (isBranchGroup(oldElement) !== isBranchGroup(newElement)) {
    return false;
  }

  if (!isBranchGroup(oldElement) && !isBranchGroup(newElement)) {
    return instructionsExactlyEqual(oldElement, newElement);
  }

  if (!isBranchGroup(oldElement) || !isBranchGroup(newElement)) {
    return false;
  }

  if (oldElement.branches.length !== newElement.branches.length) {
    return false;
  }

  return oldElement.branches.every((oldLeg, legIndex) => {
    const newLeg = newElement.branches[legIndex];
    if (!newLeg || oldLeg.length !== newLeg.length) {
      return false;
    }

    return oldLeg.every((oldLegElement, elementIndex) => elementsExactlyEqual(oldLegElement, newLeg[elementIndex]));
  });
}

function buildExactMatchAnchors(
  oldElements: RungElement[],
  newElements: RungElement[],
): Array<{ oldIndex: number; newIndex: number }> {
  const table = Array.from({ length: oldElements.length + 1 }, () => Array<number>(newElements.length + 1).fill(0));

  for (let oldIndex = oldElements.length - 1; oldIndex >= 0; oldIndex -= 1) {
    for (let newIndex = newElements.length - 1; newIndex >= 0; newIndex -= 1) {
      if (elementsExactlyEqual(oldElements[oldIndex], newElements[newIndex])) {
        table[oldIndex][newIndex] = table[oldIndex + 1][newIndex + 1] + 1;
        continue;
      }

      table[oldIndex][newIndex] = Math.max(table[oldIndex + 1][newIndex], table[oldIndex][newIndex + 1]);
    }
  }

  const anchors: Array<{ oldIndex: number; newIndex: number }> = [];
  let oldIndex = 0;
  let newIndex = 0;

  while (oldIndex < oldElements.length && newIndex < newElements.length) {
    if (elementsExactlyEqual(oldElements[oldIndex], newElements[newIndex])) {
      anchors.push({ oldIndex, newIndex });
      oldIndex += 1;
      newIndex += 1;
      continue;
    }

    if (table[oldIndex][newIndex + 1] >= table[oldIndex + 1][newIndex]) {
      newIndex += 1;
      continue;
    }

    oldIndex += 1;
  }

  return anchors;
}

function buildPairedMatch(
  id: string,
  oldElement: RungElement,
  newElement: RungElement,
  oldIndex: number,
  newIndex: number,
): InlineDiffElementMatch {
  if (isBranchGroup(oldElement) && isBranchGroup(newElement)) {
    return { id, kind: 'branch', oldElement, newElement, oldIndex, newIndex };
  }

  if (!isBranchGroup(oldElement) && !isBranchGroup(newElement)) {
    return { id, kind: 'instruction', oldElement, newElement, oldIndex, newIndex };
  }

  return { id, kind: 'mismatch', oldElement, newElement, oldIndex, newIndex };
}

function pushPositionalSpanMatches(
  matches: InlineDiffElementMatch[],
  oldElements: RungElement[],
  newElements: RungElement[],
  parentPath: string,
  startOldIndex: number,
  endOldIndex: number,
  startNewIndex: number,
  endNewIndex: number,
  sequenceIndex: number,
): number {
  const oldSpan = oldElements.slice(startOldIndex, endOldIndex);
  const newSpan = newElements.slice(startNewIndex, endNewIndex);
  const spanLength = Math.max(oldSpan.length, newSpan.length);

  for (let offset = 0; offset < spanLength; offset += 1) {
    const oldElement = oldSpan[offset];
    const newElement = newSpan[offset];
    const oldIndex = oldElement ? startOldIndex + offset : undefined;
    const newIndex = newElement ? startNewIndex + offset : undefined;
    const id = `${parentPath}/seq:${sequenceIndex}`;

    if (oldElement && newElement) {
      matches.push(buildPairedMatch(id, oldElement, newElement, oldIndex as number, newIndex as number));
      sequenceIndex += 1;
      continue;
    }

    if (oldElement) {
      matches.push({ id, kind: 'removed', oldElement, oldIndex });
      sequenceIndex += 1;
      continue;
    }

    if (newElement) {
      matches.push({ id, kind: 'added', newElement, newIndex });
      sequenceIndex += 1;
    }
  }

  return sequenceIndex;
}

export function matchRungElements(
  oldElements: RungElement[],
  newElements: RungElement[],
  parentPath = 'rung',
): InlineDiffElementMatch[] {
  const matches: InlineDiffElementMatch[] = [];
  const anchors = buildExactMatchAnchors(oldElements, newElements);
  let sequenceIndex = 0;
  let oldCursor = 0;
  let newCursor = 0;

  for (const anchor of anchors) {
    sequenceIndex = pushPositionalSpanMatches(
      matches,
      oldElements,
      newElements,
      parentPath,
      oldCursor,
      anchor.oldIndex,
      newCursor,
      anchor.newIndex,
      sequenceIndex,
    );

    const oldElement = oldElements[anchor.oldIndex];
    const newElement = newElements[anchor.newIndex];
    const id = `${parentPath}/seq:${sequenceIndex}`;
    matches.push(buildPairedMatch(id, oldElement, newElement, anchor.oldIndex, anchor.newIndex));

    sequenceIndex += 1;
    oldCursor = anchor.oldIndex + 1;
    newCursor = anchor.newIndex + 1;
  }

  pushPositionalSpanMatches(
    matches,
    oldElements,
    newElements,
    parentPath,
    oldCursor,
    oldElements.length,
    newCursor,
    newElements.length,
    sequenceIndex,
  );

  return matches;
}