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
      return { fallback: { reason: 'invalid-fragment' } };
    }

    switch (rootName) {
      case 'Rung':
        return this.parseRung(source);
      case 'Tag':
        return this.parseTag(source);
      case 'Line':
        return this.parseStructuredTextLine(source);
      case 'Comment':
      case 'Text':
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

  private parseRung(source: string): ClassifiedFragment {
    const result = new L5XParser().parse(wrapRung(source));
    const rung = result.data?.programs[0]?.routines[0]?.rungs[0];
    if (!rung) {
      return { fallback: { reason: 'invalid-fragment' } };
    }

    return rung.raw.trim()
      ? { kind: 'ladder', preview: rung }
      : { fallback: { reason: 'incomplete-unit' } };
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