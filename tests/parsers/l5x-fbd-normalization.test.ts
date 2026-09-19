import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseDocumentString, parseString } from '../../src/parsers';
import type { L5XFBDContent } from '../../src/parsers/l5x';

const fixtureDirectory = join(__dirname, '../fixtures/l5x');
const read = (name: string) => readFileSync(join(fixtureDirectory, `${name}.L5X`), 'utf8');

function programRoutine(source: string, name = 'FBDLogic') {
  const result = parseString(source, 'l5x');
  expect(result.success).toBe(true);
  return { result, routine: result.data?.programs[0]?.routines.find((item) => item.name === name) };
}

function replaceBody(body: string): string {
  return read('fbd-v35').replace(/<FBDContent[\s\S]*<\/FBDContent>/, body);
}

describe('L5X canonical FBD normalization', () => {
  it.each([33, 34, 35])('normalizes a complete static program FBD body in v%i', (major) => {
    const { result, routine } = programRoutine(read(`fbd-v${major}`));

    expect(result.status).toBe('complete');
    expect(routine?.fbd).toMatchObject({
      sheetSize: { value: 'Tabloid - 11 x 17 in', source: 'declared' },
      orientation: { value: 'Landscape', source: 'declared' },
      sheets: [
        {
          number: { value: '1', source: 'declared' },
          name: { value: 'Sheet 1', source: 'fallback' },
          descriptions: [],
          elements: [
            { kind: 'reference', referenceType: 'input', id: '1', ports: ['value'] },
            { kind: 'reference', referenceType: 'output', id: '2', ports: ['value'] },
          ],
          connections: [
            {
              kind: 'wire',
              from: { elementId: '1', port: 'value' },
              to: { elementId: '2', port: 'value' },
            },
          ],
          attachments: [],
        },
      ],
    });
  });

  it('preserves absent, singleton, and repeated FBD collections in source order', () => {
    const { result, routine } = programRoutine(read('fbd-canonical-v35'));
    const fbd = routine?.fbd;

    expect(result.status).toBe('partial');
    expect(fbd?.sheets.map((sheet) => sheet.number)).toEqual([
      { value: '1', source: 'fallback' },
      { value: '7', source: 'declared' },
      { value: '9', source: 'declared' },
    ]);
    expect(fbd?.sheets.map((sheet) => sheet.descriptions)).toEqual([
      [],
      ['Singleton sheet'],
      ['First description', 'Second description'],
    ]);

    const singleton = fbd?.sheets[1];
    expect(singleton?.elements.map((element) => element.kind)).toEqual([
      'reference',
      'reference',
      'connector',
      'connector',
      'block',
      'add-on-instruction',
      'placeholder',
      'placeholder',
      'routine-control',
      'routine-control',
      'routine-control',
      'text-box',
    ]);
    expect(singleton?.connections).toEqual([
      {
        kind: 'wire',
        from: { elementId: '1', port: 'value' },
        to: { elementId: '2', port: 'value' },
      },
      {
        kind: 'feedback-wire',
        from: { elementId: '3', port: 'value' },
        to: { elementId: '4', port: 'value' },
      },
    ]);
    expect(singleton?.attachments).toEqual([{ fromElementId: '12', toElementId: '5' }]);

    const repeated = fbd?.sheets[2];
    const blocks = repeated?.elements.filter((element) => element.kind === 'block');
    expect(blocks).toEqual([
      expect.objectContaining({
        instruction: 'MUL',
        visiblePins: ['SourceA', 'Dest'],
        arrays: [
          { name: 'First', operand: 'ArrayA' },
          { name: 'Second', operand: 'ArrayB' },
        ],
      }),
      expect.objectContaining({ instruction: 'SUB', arrays: [] }),
    ]);
    const aois = repeated?.elements.filter((element) => element.kind === 'add-on-instruction');
    expect(aois).toEqual([
      expect.objectContaining({
        bindings: [
          { name: 'First', argument: 'ArgumentA' },
          { name: 'Second', argument: 'ArgumentB' },
        ],
      }),
      expect.objectContaining({ bindings: [] }),
    ]);
    expect(
      repeated?.elements.find(
        (element) => element.kind === 'routine-control' && element.operation === 'JSR'
      )
    ).toMatchObject({ inputParameters: ['One', 'Two'], returnParameters: ['Three', 'Four'] });
    expect(
      repeated?.elements.find(
        (element) => element.kind === 'routine-control' && element.operation === 'SBR'
      )
    ).toMatchObject({ inputParameters: ['One', 'Two'], returnParameters: [] });
    expect(
      repeated?.elements.find(
        (element) => element.kind === 'routine-control' && element.operation === 'RET'
      )
    ).toMatchObject({ inputParameters: [], returnParameters: ['One', 'Two'] });
    expect(repeated?.connections).toHaveLength(4);
    expect(repeated?.attachments).toHaveLength(2);
  });

  it('attaches the same canonical body to an AOI-owned routine', () => {
    const result = parseString(read('fbd-aoi-v35'), 'l5x');
    const routine = result.data?.aois[0]?.routines[0];

    expect(result).toMatchObject({ success: true, status: 'complete' });
    expect(routine).toMatchObject({
      name: 'Logic',
      type: 'FBD',
      fbd: {
        sheets: [
          {
            elements: [
              { kind: 'reference', id: '1' },
              { kind: 'reference', id: '2' },
            ],
          },
        ],
      },
    });
  });

  it('uses explicit metadata fallbacks while recording that source values were absent', () => {
    const { result, routine } = programRoutine(replaceBody('<FBDContent><Sheet /></FBDContent>'));

    expect(result.status).toBe('complete');
    expect(routine?.fbd).toMatchObject({
      sheetSize: { value: 'Unspecified', source: 'fallback' },
      orientation: { value: 'Landscape', source: 'fallback' },
      sheets: [
        {
          number: { value: '1', source: 'fallback' },
          name: { value: 'Sheet 1', source: 'fallback' },
          elements: [],
          connections: [],
          attachments: [],
        },
      ],
    });
    expect(routine?.fbd?.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'FBD_MISSING_SHEET_SIZE',
      'FBD_MISSING_SHEET_ORIENTATION',
      'FBD_MISSING_SHEET_NUMBER',
      'FBD_MISSING_SHEET_NAME',
    ]);
  });

  it('exposes and recovers missing or unknown raw sheet orientations', () => {
    const rawBodies: L5XFBDContent[] = [{}, { '@_SheetOrientation': 'Diagonal' }];
    const { result, routine } = programRoutine(
      replaceBody('<FBDContent SheetOrientation="Diagonal"><Sheet /></FBDContent>')
    );

    expect(rawBodies.map((body) => body['@_SheetOrientation'])).toEqual([undefined, 'Diagonal']);
    expect(result.status).toBe('complete');
    expect(routine?.fbd?.orientation).toEqual({ value: 'Landscape', source: 'fallback' });
    expect(routine?.fbd?.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'FBD_INVALID_SHEET_ORIENTATION', severity: 'info' })
    );
  });

  it('recovers malformed and unknown FBD elements as canonical placeholders', () => {
    const source = replaceBody(`<FBDContent SheetOrientation="Landscape"><Sheet Number="1">
      <IRef ID="1" X="10" Y="10" Operand="Input" />
      <Block Type="ADD" ID="bad" X="40" />
      <Function ID="3" X="80" Y="20" Name="ABS" VisiblePins="In Out" />
      <FutureBlock ID="4" X="120" Y="20" VisiblePins="Left Right" />
      <Mystery />
      <Wire FromID="1" ToID="4" />
    </Sheet></FBDContent>`);
    const { result, routine } = programRoutine(source);
    const placeholders = routine?.fbd?.sheets[0]?.elements.filter(
      (element) => element.kind === 'placeholder'
    );

    expect(result.status).toBe('partial');
    expect(placeholders).toEqual([
      expect.objectContaining({
        sourceKind: 'Block',
        id: 'bad',
        position: { x: '40' },
        reasonCodes: ['invalid-id', 'missing-position'],
      }),
      expect.objectContaining({
        sourceKind: 'Function',
        id: '3',
        position: { x: '80', y: '20' },
        ports: [],
        reasonCodes: ['unsupported-semantics', 'unresolved-metadata'],
      }),
      expect.objectContaining({
        sourceKind: 'FutureBlock',
        id: '4',
        position: { x: '120', y: '20' },
        ports: [],
        reasonCodes: ['unknown-kind', 'unresolved-metadata'],
      }),
      expect.objectContaining({
        sourceKind: 'Mystery',
        reasonCodes: ['unknown-kind', 'unresolved-metadata', 'missing-id', 'missing-position'],
      }),
    ]);
  });

  it('accounts normalized FBD source separately without an unmodeled body fragment', () => {
    const result = parseDocumentString(read('fbd-v35'), 'l5x');
    const fragments = result.data?.fragments ?? [];

    expect(result.status).toBe('complete');
    expect(fragments).not.toContainEqual(
      expect.objectContaining({ reason: 'unmodeled', path: expect.stringContaining('/FBDContent') })
    );
    expect(fragments).toContainEqual(
      expect.objectContaining({
        reason: 'source-representation',
        path: expect.stringContaining('/FBDContent[1]'),
      })
    );
  });

  it('serializes canonical FBD bodies deterministically', () => {
    const first = programRoutine(read('fbd-canonical-v35')).routine?.fbd;
    const second = programRoutine(read('fbd-canonical-v35')).routine?.fbd;

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });
});
