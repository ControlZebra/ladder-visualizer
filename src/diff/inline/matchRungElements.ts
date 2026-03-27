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

export function matchRungElements(
  oldElements: RungElement[],
  newElements: RungElement[],
  parentPath = 'rung',
): InlineDiffElementMatch[] {
  const matches: InlineDiffElementMatch[] = [];
  const elementCount = Math.max(oldElements.length, newElements.length);

  for (let index = 0; index < elementCount; index += 1) {
    const oldElement = oldElements[index];
    const newElement = newElements[index];
    const id = `${parentPath}/seq:${index}`;

    if (oldElement && newElement) {
      if (isBranchGroup(oldElement) && isBranchGroup(newElement)) {
        matches.push({ id, kind: 'branch', oldElement, newElement, oldIndex: index, newIndex: index });
        continue;
      }

      if (!isBranchGroup(oldElement) && !isBranchGroup(newElement)) {
        matches.push({ id, kind: 'instruction', oldElement, newElement, oldIndex: index, newIndex: index });
        continue;
      }

      matches.push({ id, kind: 'mismatch', oldElement, newElement, oldIndex: index, newIndex: index });
      continue;
    }

    if (oldElement) {
      matches.push({ id, kind: 'removed', oldElement, oldIndex: index });
      continue;
    }

    if (newElement) {
      matches.push({ id, kind: 'added', newElement, newIndex: index });
    }
  }

  return matches;
}