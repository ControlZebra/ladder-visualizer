import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseDocumentString, parseString } from '../../src/parsers';

const read = (name: string) => readFileSync(join(__dirname, `../fixtures/l5x/${name}.L5X`), 'utf8');
const fixture = (version: string) => read(`normalization-coverage-v${version}`);

const controllerPath = '/RSLogix5000Content/Controller[1]';
const aoiPath = `${controllerPath}/AddOnInstructionDefinitions[1]/AddOnInstructionDefinition[1]`;
const programPath = `${controllerPath}/Programs[1]/Program[1]`;

describe('L5X normalization completeness', () => {
  it.each(['17', '33', '34', '35'])(
    'retains v%s scalar defaults and localized revision notes',
    (version) => {
      const source = read(`aoi-v${version === '17' ? '35' : version}`).replace(
        /SoftwareRevision="[^"]+"/,
        `SoftwareRevision="${version}.00"`
      );
      for (const content of ['0', '-42', '1.25', "'text'"]) {
        for (const encoded of [content, `<![CDATA[${content}]]>`]) {
          const xml = source.replace('<![CDATA[0]]>', encoded).replace('<![CDATA[1]]>', encoded);
          const result = parseDocumentString(xml, 'l5x');
          const controller = parseString(xml, 'l5x');
          expect(result).toMatchObject({ success: true, status: 'complete' });
          expect(controller).toMatchObject({ success: true, status: 'complete' });
          const expected = content === "'text'" ? content : Number(content);
          for (const aoi of [
            result.data?.resources.find((r) => r.kind === 'aoi')?.data,
            controller.data?.aois[0],
          ]) {
            expect(aoi).toMatchObject({
              revisionNote: 'Localized revision note',
              parameters: expect.arrayContaining([
                expect.objectContaining({ name: 'In', defaultValue: expected }),
              ]),
              localTags: [expect.objectContaining({ name: 'State', defaultValue: expected })],
            });
          }
          expect(result.data?.mappings).toContainEqual(
            expect.objectContaining({
              sourcePath: `${aoiPath}/RevisionNote[1]/LocalizedRevisionNote[1]/Value[1]`,
              field: 'revisionNote',
            })
          );
          expect(result.data?.fragments).toContainEqual(
            expect.objectContaining({
              path: `${aoiPath}/RevisionNote[1]/LocalizedRevisionNote[2]/#cdata`,
              value: 'Weitere Notiz',
              reason: 'source-representation',
            })
          );
        }
      }
    }
  );

  it.each(['', '   '])('does not fabricate a zero from empty L5K CDATA %j', (content) => {
    for (const decorated of [
      '',
      '<DefaultData Format="Decorated"><DataValue DataType="BOOL" Radix="Decimal" Value="1" /></DefaultData>',
    ]) {
      const source = read('aoi-v35').replace(
        /<DefaultData Format="L5K">.*?<\/DefaultData>/g,
        `<DefaultData Format="L5K"><![CDATA[${content}]]></DefaultData>${decorated}`
      );
      const result = parseString(source, 'l5x');
      expect(result.success).toBe(true);
      expect(result.data?.aois[0].parameters.find((p) => p.name === 'In')?.defaultValue).toBe(
        decorated ? 1 : undefined
      );
      expect(result.data?.aois[0].localTags[0].defaultValue).toBe(decorated ? 1 : undefined);
    }
  });

  it.each(['33', '34', '35'])('extracts CDATA Value wrappers in v%s revision notes', (version) => {
    for (const localized of [false, true]) {
      const value = '<Value><![CDATA[Wrapped note]]></Value>';
      const body = localized
        ? `<LocalizedRevisionNote Lang="en-US">${value}</LocalizedRevisionNote>`
        : value;
      const source = read(`aoi-v${version}`).replace(
        /<RevisionNote>.*?<\/RevisionNote>/,
        `<RevisionNote>${body}</RevisionNote>`
      );
      const result = parseDocumentString(source, 'l5x');
      expect(result.status).toBe('complete');
      expect(result.data?.resources.find((r) => r.kind === 'aoi')?.data).toHaveProperty(
        'revisionNote',
        'Wrapped note'
      );
      expect(parseString(source, 'l5x').data?.aois[0].revisionNote).toBe('Wrapped note');
      expect(result.data?.mappings).toContainEqual(
        expect.objectContaining({
          sourcePath: `${aoiPath}/RevisionNote[1]/${localized ? 'LocalizedRevisionNote[1]/' : ''}Value[1]/#cdata`,
          field: 'revisionNote',
        })
      );
    }
  });

  it.each([
    ['', undefined],
    ['<RevisionNote />', ''],
    [
      '<RevisionNote><LocalizedRevisionNote Lang="en-US"><![CDATA[Note]]></LocalizedRevisionNote></RevisionNote>',
      'Note',
    ],
    [
      '<RevisionNote><LocalizedRevisionNote Lang="en-US">Note</LocalizedRevisionNote></RevisionNote>',
      'Note',
    ],
    [
      '<RevisionNote><Value>Direct</Value><LocalizedRevisionNote Lang="en-US"><Value>Other</Value></LocalizedRevisionNote></RevisionNote>',
      'Direct',
    ],
  ])('handles optional and alternative revision notes: %s', (replacement, expected) => {
    const source = read('aoi-v35').replace(
      /<RevisionNote>.*?<\/RevisionNote>/,
      replacement as string
    );
    const result = parseDocumentString(source, 'l5x');
    expect(result.status).toBe('complete');
    expect(result.data?.resources.find((r) => r.kind === 'aoi')?.data).toHaveProperty(
      'revisionNote',
      expected
    );
  });

  it.each(['33', '34', '35'])(
    'marks preserved-only v%s constructs partial with precise diagnostics',
    (version) => {
      const source = fixture(version);
      const documentResult = parseDocumentString(source, 'l5x');
      const controllerResult = parseString(source, 'l5x');

      for (const result of [documentResult, controllerResult]) {
        expect(result).toMatchObject({ success: true, status: 'partial' });
        expect(result.errors).toBeUndefined();
      }

      expect(documentResult.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'UNNORMALIZED_L5X_PROGRAM_LOCAL_TAG',
            location: { path: `${programPath}/LocalTags[1]/LocalTag[1]` },
          }),
          expect.objectContaining({
            code: 'UNNORMALIZED_L5X_PROGRAM_LOCAL_TAG',
            location: { path: `${programPath}/LocalTags[1]/LocalTag[2]` },
          }),
          expect.objectContaining({
            code: 'UNNORMALIZED_L5X_AOI_DEFAULT_DATA',
            location: { path: `${aoiPath}/Parameters[1]/Parameter[1]/DefaultData[1]` },
          }),
          expect.objectContaining({
            code: 'UNNORMALIZED_L5X_AOI_LOCAL_TAG_DIMENSIONS',
            location: { path: `${aoiPath}/LocalTags[1]/LocalTag[1]/@Dimensions` },
          }),
          expect.objectContaining({
            code: 'UNNORMALIZED_L5X_AOI_DEFAULT_DATA',
            location: { path: `${aoiPath}/LocalTags[1]/LocalTag[1]/DefaultData[1]` },
          }),
          expect.objectContaining({
            code: 'UNNORMALIZED_L5X_AOI_DEFAULT_DATA',
            location: { path: `${aoiPath}/LocalTags[1]/LocalTag[2]/DefaultData[1]` },
          }),
        ])
      );

      expect(
        documentResult.warnings?.filter(({ code }) => code?.startsWith('UNNORMALIZED_L5X_'))
      ).toHaveLength(6);
      expect(
        controllerResult.warnings?.filter(({ code }) => code?.startsWith('UNNORMALIZED_L5X_'))
      ).toEqual(
        documentResult.warnings?.filter(({ code }) => code?.startsWith('UNNORMALIZED_L5X_'))
      );
    }
  );

  it.each(['33', '34', '35'])(
    'does not mark supported v%s AOI source representations partial',
    (version) => {
      const result = parseDocumentString(read(`aoi-v${version}`), 'l5x');

      expect(result).toMatchObject({ success: true, status: 'complete' });
      expect(result.warnings).toContainEqual(
        expect.objectContaining({ code: 'PRESERVED_L5X_CONTENT' })
      );
      expect(result.warnings?.some(({ code }) => code?.startsWith('UNNORMALIZED_L5X_'))).toBe(
        false
      );
      expect(result.data?.fragments).toContainEqual(
        expect.objectContaining({
          path: expect.stringMatching(/\/LocalTags\[1\]$/),
          reason: 'source-representation',
        })
      );
    }
  );

  it.each(['33', '34', '35'])(
    'distinguishes normalized v%s AOI documentation from preserved-only defaults',
    (version) => {
      const result = parseDocumentString(fixture(version), 'l5x');
      const aoi = result.data?.resources.find((resource) => resource.kind === 'aoi');
      const program = result.data?.resources.find((resource) => resource.kind === 'program');

      expect(aoi?.data).toMatchObject({
        revisionNote: 'Normalized revision note',
        helpText: 'Normalized help text',
      });
      expect(program?.data).not.toHaveProperty('localTags');
      expect(
        result.data?.fragments.filter(
          ({ path, reason }) =>
            reason === 'unmodeled' &&
            (path.startsWith(`${aoiPath}/RevisionNote`) ||
              path.startsWith(`${aoiPath}/AdditionalHelpText`))
        )
      ).toEqual([]);
      expect(result.data?.fragments).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: `${programPath}/LocalTags[1]`,
            reason: 'source-representation',
          }),
          expect.objectContaining({
            path: `${aoiPath}/Parameters[1]`,
            reason: 'source-representation',
          }),
          expect.objectContaining({
            path: `${aoiPath}/LocalTags[1]`,
            reason: 'source-representation',
          }),
        ])
      );
    }
  );
});
