import { XMLParser, XMLValidator } from 'fast-xml-parser';
import type { ConflictVisualAdapter, ValidationResult, VisualConflictFallback, VisualConflictKind, VisualConflictRegion } from '../../conflict';
import type { NormalizedRung, NormalizedTag, STLine } from '../../types/normalized';
import { L5XParser } from './l5x-parser';

type FragmentPreview = NormalizedRung | NormalizedTag | STLine;

interface ClassifiedFragment {
  kind?: VisualConflictKind;
  preview?: FragmentPreview;
  fallback?: VisualConflictFallback;
}

const fragmentParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  trimValues: true,
});

export class L5XConflictVisualAdapter implements ConflictVisualAdapter {
  readonly format = 'l5x';

  classifyRegion(currentSource: string, incomingSource: string): VisualConflictRegion | VisualConflictFallback {
    const current = this.classifyFragment(currentSource);
    const incoming = this.classifyFragment(incomingSource);

    if (!current.kind || !incoming.kind) {
      return current.fallback ?? incoming.fallback ?? { reason: 'invalid-fragment' };
    }

    if (current.kind !== incoming.kind) {
      return { reason: 'mixed-unit-kind' };
    }

    return {
      kind: current.kind,
      current: current.preview as FragmentPreview,
      incoming: incoming.preview as FragmentPreview,
    };
  }

  validateComposedDocument(source: string): ValidationResult {
    return { valid: new L5XParser().validate(source).success };
  }

  private classifyFragment(source: string): ClassifiedFragment {
    const rootName = this.getSingleRootName(source);
    if (!rootName) {
      if (SINGLE_CDATA_PATTERN.test(source)) {
        return { fallback: { reason: 'incomplete-unit' } };
      }
      return { fallback: { reason: 'invalid-fragment' } };
    }

    switch (rootName) {
      case 'Rung':
        return this.parseSyntheticRung(source, true);
      case 'Tag':
        return this.parseTag(source);
      case 'Line':
        return this.parseStructuredTextLine(source);
      case 'Text': {
        const cdata = extractElementCdata(source, 'Text');
        return cdata !== null
          ? this.parseSyntheticRung(syntheticRungWithText(cdata), false)
          : { fallback: { reason: 'incomplete-unit' } };
      }
      case 'Comment': {
        const cdata = extractElementCdata(source, 'Comment');
        return cdata !== null
          ? this.parseSyntheticRung(syntheticRungWithComment(cdata), false)
          : { fallback: { reason: 'incomplete-unit' } };
      }
      case 'STContent':
        return { fallback: { reason: 'incomplete-unit' } };
      default:
        return { fallback: { reason: 'unsupported-unit' } };
    }
  }

  private getSingleRootName(source: string): string | null {
    const wrappedSource = `<Fragment>${source}</Fragment>`;
    if (XMLValidator.validate(wrappedSource) !== true) {
      return null;
    }

    try {
      const fragment = fragmentParser.parse(wrappedSource).Fragment;
      if (!fragment || typeof fragment !== 'object' || Array.isArray(fragment)) {
        return null;
      }

      const hasNonWhitespaceText = Object.entries(fragment).some(([name, value]) =>
        name.startsWith('#') && typeof value === 'string' && value.trim().length > 0,
      );
      if (hasNonWhitespaceText) {
        return null;
      }

      const elementNames = Object.keys(fragment).filter((name) => !name.startsWith('#') && name !== ':@');
      return elementNames.length === 1 && !Array.isArray(fragment[elementNames[0]]) ? elementNames[0] : null;
    } catch {
      return null;
    }
  }

  private parseSyntheticRung(rungSource: string, requireRaw: boolean): ClassifiedFragment {
    const result = new L5XParser().parse(wrapRung(rungSource));
    const rung = result.data?.programs[0]?.routines[0]?.rungs[0];
    if (!rung) {
      return { fallback: { reason: 'invalid-fragment' } };
    }
    if (requireRaw && !rung.raw.trim()) {
      return { fallback: { reason: 'incomplete-unit' } };
    }
    return { kind: 'ladder', preview: rung };
  }

  private parseTag(source: string): ClassifiedFragment {
    const result = new L5XParser().parse(wrapTag(source));
    const tag = result.data?.tags[0];
    return tag ? { kind: 'tag', preview: tag } : { fallback: { reason: 'invalid-fragment' } };
  }

  private parseStructuredTextLine(source: string): ClassifiedFragment {
    const result = new L5XParser().parse(wrapStructuredTextLine(source));
    const line = result.data?.programs[0]?.routines[0]?.stContent?.[0];
    return line ? { kind: 'structured-text', preview: line } : { fallback: { reason: 'invalid-fragment' } };
  }
}

export const l5xConflictVisualAdapter = new L5XConflictVisualAdapter();

const SINGLE_CDATA_PATTERN = /^\s*<!\[CDATA\[[\s\S]*?\]\]>\s*$/;

function extractElementCdata(source: string, tagName: string): string | null {
  const pattern = new RegExp(
    `^\\s*<${tagName}(?:\\s[^>]*)?>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tagName}>\\s*$`,
  );
  const match = source.match(pattern);
  return match ? match[1] : null;
}

function syntheticRungWithText(cdata: string): string {
  return `<Rung Number="0" Type="N"><Text><![CDATA[${cdata}]]></Text></Rung>`;
}

function syntheticRungWithComment(cdata: string): string {
  return `<Rung Number="0" Type="N"><Comment><![CDATA[${cdata}]]></Comment><Text><![CDATA[]]></Text></Rung>`;
}

function wrapRung(source: string): string {
  return wrapInRoutine('RLL', `<RLLContent>${source}</RLLContent>`);
}

function wrapStructuredTextLine(source: string): string {
  return wrapInRoutine('ST', `<STContent>${source}</STContent>`);
}

function wrapInRoutine(type: 'RLL' | 'ST', content: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<RSLogix5000Content SchemaRevision="1.0" SoftwareRevision="35.01" TargetName="Preview" TargetType="Program">
  <Controller Name="Preview">
    <Programs><Program Name="Preview"><Routines><Routine Name="Preview" Type="${type}">${content}</Routine></Routines></Program></Programs>
  </Controller>
</RSLogix5000Content>`;
}

function wrapTag(source: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<RSLogix5000Content SchemaRevision="1.0" SoftwareRevision="35.01" TargetName="Preview" TargetType="Controller">
  <Controller Name="Preview"><Tags>${source}</Tags></Controller>
</RSLogix5000Content>`;
}
