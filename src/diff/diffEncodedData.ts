import type { PlcDocument, PlcEncodedData } from '../types/normalized';

export interface EncodedDataChange {
  kind: 'added' | 'removed' | 'changed' | 'unchanged';
  before?: PlcEncodedData;
  after?: PlcEncodedData;
}

/** Compare opaque payload text exactly, without assigning meaning to encoded bytes. */
export function diffEncodedData(before: PlcDocument, after: PlcDocument): EncodedDataChange[] {
  const remaining = new Map<string, PlcEncodedData[]>();
  for (const item of before.encodedData) {
    const key = identity(before, item);
    const items = remaining.get(key) ?? [];
    items.push(item);
    remaining.set(key, items);
  }

  const changes: EncodedDataChange[] = [];
  for (const item of after.encodedData) {
    const previous = remaining.get(identity(after, item))?.shift();
    changes.push(previous
      ? { kind: previous.payload === item.payload ? 'unchanged' : 'changed', before: previous, after: item }
      : { kind: 'added', after: item });
  }
  for (const items of remaining.values()) {
    for (const item of items) changes.push({ kind: 'removed', before: item });
  }
  return changes;
}

function identity(document: PlcDocument, item: PlcEncodedData): string {
  // XML occurrence indices change when an earlier sibling is inserted. Match
  // within the nearest named owner instead of using those document-local paths.
  const owner = document.resources
    .filter((resource) => item.containerPath.startsWith(`${resource.sourcePath}/`))
    .sort((left, right) => right.sourcePath.length - left.sourcePath.length)[0];
  const ownerName = owner?.data && 'name' in owner.data ? owner.data.name : '';
  const scope = owner?.kind === 'controller'
    ? 'controller'
    : owner ? `${owner.kind}\0${ownerName}` : item.containerPath;
  return `${scope}\0${item.attributes.EncodedType ?? ''}\0${item.attributes.Name ?? ''}`;
}
