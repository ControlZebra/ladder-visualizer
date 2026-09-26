import type { PlcEncodedData } from '../../types/normalized';

type OrderedNode = Record<string, unknown>;

/** Shield raw text line endings from the XML parser's required newline normalization. */
export function preserveEncodedLineEndings(source: string): {
  xml: string;
  restore: (value: string) => string;
} {
  if (!source.includes('\r')) return { xml: source, restore: (value) => value };

  let nonce = 0;
  let crlfToken: string;
  let crToken: string;
  do {
    crlfToken = `__L5X_CRLF_${nonce}__`;
    crToken = `__L5X_CR_${nonce}__`;
    nonce++;
  } while (source.includes(crlfToken) || source.includes(crToken));

  const shield = (value: string) => value.replace(/\r\n/g, crlfToken).replace(/\r/g, crToken);
  const restore = (value: string) => value.split(crlfToken).join('\r\n').split(crToken).join('\r');
  let xml = '';
  let offset = 0;
  while (offset < source.length) {
    if (source.startsWith('<![CDATA[', offset)) {
      const end = source.indexOf(']]>', offset + 9);
      xml += '<![CDATA[' + shield(source.slice(offset + 9, end)) + ']]>';
      offset = end + 3;
    } else if (source.startsWith('<!--', offset)) {
      const end = source.indexOf('-->', offset + 4) + 3;
      xml += source.slice(offset, end);
      offset = end;
    } else if (source[offset] === '<') {
      let end = offset + 1;
      let quote: '"' | "'" | undefined;
      for (; end < source.length; end++) {
        const character = source[end];
        if (quote) {
          if (character === quote) quote = undefined;
        } else if (character === '"' || character === "'") {
          quote = character;
        } else if (character === '>') {
          break;
        }
      }
      xml += source.slice(offset, end + 1);
      offset = end + 1;
    } else {
      const nextTag = source.indexOf('<', offset);
      const end = nextTag < 0 ? source.length : nextTag;
      xml += shield(source.slice(offset, end));
      offset = end;
    }
  }
  return { xml, restore };
}

/** Read opaque wrappers from the ordered XML tree so text and source order survive grouping. */
export function collectEncodedData(
  orderedRoot: OrderedNode[],
  restore: (value: string) => string = (value) => value
): PlcEncodedData[] {
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
            .map(([key, value]) => [key.slice(2), restore(value as string)])
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
        }).map((segment) => ({ ...segment, value: restore(segment.value) }));
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
