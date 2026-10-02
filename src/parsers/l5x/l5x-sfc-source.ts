import type { NormalizedRoutine, PlcDocument } from '../../types/normalized';
import { checkParseExecution, type ParseOptions } from '../resource-guards';
import type { ParseError } from '../parse-error';

interface SourceElement {
  path: string;
  start: number;
  occurrences: Map<string, number>;
}

/**
 * Parse SFC routine source ranges after the document has passed XML validation
 * and resource guards. Slice the original input: XML parser metadata indexes
 * refer to newline-normalized text and cannot preserve original CRLF offsets.
 * Match document resources by occurrence path, including program/AOI ownership.
 */
export function parseSFCRoutineSources(
  document: PlcDocument,
  source: string,
  options?: ParseOptions
): ParseError | undefined {
  const routines = new Map<string, NormalizedRoutine>();
  for (const resource of document.resources) {
    if (resource.kind === 'routine' && resource.data.type === 'SFC') {
      routines.set(resource.sourcePath, resource.data);
    }
  }
  if (!routines.size) return undefined;

  const stack: SourceElement[] = [{ path: '', start: 0, occurrences: new Map() }];
  const retain = (element: SourceElement, end: number) => {
    const routine = routines.get(element.path);
    if (routine) {
      routine.rawSource = {
        format: 'xml',
        text: source.slice(element.start, end),
        sourcePath: element.path,
        startOffset: element.start,
        endOffset: end,
      };
    }
  };

  let offset = 0;
  while ((offset = source.indexOf('<', offset)) !== -1) {
    const executionError = checkParseExecution(options);
    if (executionError) return executionError;
    // These constructs can contain literal tags, including </Routine>.
    if (source.startsWith('<!--', offset)) {
      offset = source.indexOf('-->', offset + 4) + 3;
      continue;
    }
    if (source.startsWith('<![CDATA[', offset)) {
      offset = source.indexOf(']]>', offset + 9) + 3;
      continue;
    }
    if (source.startsWith('<?', offset)) {
      offset = source.indexOf('?>', offset + 2) + 2;
      continue;
    }

    // An attribute may contain >; only an unquoted > closes the tag.
    let quote: string | undefined;
    let end = offset + 1;
    for (; end < source.length; end++) {
      const char = source[end];
      if (quote) {
        if (char === quote) quote = undefined;
      } else if (char === '"' || char === "'") {
        quote = char;
      } else if (char === '>') {
        break;
      }
    }
    if (source.startsWith('</', offset)) {
      retain(stack.pop()!, end + 1);
    } else {
      const name = source.slice(offset + 1, end).match(/^[^\s/>]+/)![0];
      const parent = stack[stack.length - 1];
      const occurrence = (parent.occurrences.get(name) ?? 0) + 1;
      parent.occurrences.set(name, occurrence);
      const element: SourceElement = {
        path: parent.path === '' && name === 'RSLogix5000Content'
          ? '/RSLogix5000Content'
          : `${parent.path}/${name}[${occurrence}]`,
        start: offset,
        occurrences: new Map(),
      };
      if (/\/\s*$/.test(source.slice(offset + 1, end))) retain(element, end + 1);
      else stack.push(element);
    }
    offset = end + 1;
  }
  return checkParseExecution(options);
}
