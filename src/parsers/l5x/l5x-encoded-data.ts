import type { PlcEncodedData } from '../../types/normalized';

type OrderedNode = Record<string, unknown>;

/** Read opaque wrappers from the ordered XML tree so text and source order survive grouping. */
export function collectEncodedData(orderedRoot: OrderedNode[]): PlcEncodedData[] {
  const items: PlcEncodedData[] = [];

  function visit(children: OrderedNode[], parentPath: string): void {
    const occurrences = new Map<string, number>();
    for (const child of children) {
      const entry = Object.entries(child).find(([key]) => key !== ':@' && !key.startsWith('#'));
      if (!entry || !Array.isArray(entry[1])) continue;
      const [name, descendants] = entry as [string, OrderedNode[]];
      const occurrence = (occurrences.get(name) ?? 0) + 1;
      occurrences.set(name, occurrence);
      const path = parentPath === '' && name === 'RSLogix5000Content'
        ? '/RSLogix5000Content'
        : `${parentPath}/${name}[${occurrence}]`;
      if (name === 'EncodedData') {
        const attributes = Object.fromEntries(
          Object.entries((child[':@'] ?? {}) as Record<string, unknown>)
            .filter(([key, value]) => key.startsWith('@_') && typeof value === 'string')
            .map(([key, value]) => [key.slice(2), value as string])
        );
        const textSegments = descendants.flatMap((part) => {
          if (typeof part['#text'] === 'string') return [{ value: part['#text'], cdata: false }];
          if (Array.isArray(part['#cdata'])) {
            return (part['#cdata'] as OrderedNode[])
              .map((text) => text['#text'])
              .filter((text): text is string => typeof text === 'string')
              .map((value) => ({ value, cdata: true }));
          }
          return [];
        });
        // Formatting around metadata children is not payload. Start at the first
        // substantive direct text segment, then preserve every byte through the last.
        const first = textSegments.findIndex((segment) => segment.cdata || segment.value.trim().length > 0);
        const hasMetadataChildren = descendants.some((part) =>
          Object.keys(part).some((key) => key !== ':@' && !key.startsWith('#'))
        );
        const payload = first < 0
          ? (hasMetadataChildren ? '' : textSegments.map((segment) => segment.value).join(''))
          : textSegments.slice(first).map((segment) => segment.value).join('');
        items.push({
          sourcePath: path,
          containerPath: parentPath,
          attributes,
          payload,
          capabilities: { inspectPayload: true, decodedView: false, semanticQuery: false },
        });
      }
      visit(descendants, path);
    }
  }

  visit(orderedRoot, '');
  return items;
}
