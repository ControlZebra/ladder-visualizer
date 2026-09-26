import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseDocumentString, parseString } from '../../src/parsers';
import type { PlcDocument } from '../../src/types';

const read = (name: string) =>
  readFileSync(join(__dirname, '../fixtures/l5x', `${name}.L5X`), 'utf8');

function document(source: string): PlcDocument {
  const result = parseDocumentString(source, 'l5x');
  expect(result.errors).toBeUndefined();
  expect(result.status).toBe('partial');
  return result.data!;
}

describe('standalone L5X EncodedData', () => {
  it.each([[33, '33.00'], [34, '34.01']] as const)(
    'v%i recognizes a schema-backed encoded AOI target without claiming export evidence',
    (major, revision) => {
      const doc = document(read(`encoded-aoi-v${major}`));
      expect(doc.source.softwareRevision).toBe(revision);
      expect(doc.encodedData).toHaveLength(1);
      expect(doc.encodedData[0].attributes.EncodedType).toBe('AddOnInstructionDefinition');
      expect(doc.encodedData[0].payload).toBe('\n  synthetic-aoi-payload');
      expect(doc.targetIds).toEqual([doc.encodedData[0].sourcePath]);
      expect(doc.resources.some((resource) => resource.kind === 'aoi')).toBe(false);
    }
  );

  it('exposes the v35 export-derived AOI wrapper as a document target', () => {
    const source = read('encoded-aoi-v35');
    const doc = document(source);
    const sourcePath = '/RSLogix5000Content/Controller[1]/AddOnInstructionDefinitions[1]/EncodedData[1]';
    expect(doc.source).toMatchObject({ softwareRevision: '35.00', targetType: 'AddOnInstructionDefinition' });
    expect(doc.targetIds).toEqual([sourcePath]);
    expect(doc.resources.some((resource) => resource.kind === 'aoi')).toBe(false);
    expect(doc.encodedData).toEqual([{
      sourcePath,
      containerPath: '/RSLogix5000Content/Controller[1]/AddOnInstructionDefinitions[1]',
      attributes: {
        EncodedType: 'AddOnInstructionDefinition',
        Name: 'FixtureEncodedAOI',
        Revision: '1.0',
        SoftwareRevision: 'v35.00',
        EncryptionConfig: '9',
      },
      payload: '\n  synthetic-aoi-payload',
      capabilities: { inspectPayload: true, decodedView: false, semanticQuery: false },
    }]);
    expect(doc.fragments).toContainEqual(expect.objectContaining({
      path: sourcePath,
      reason: 'protected',
      value: expect.objectContaining({
        Description: expect.anything(),
        Parameters: expect.anything(),
      }),
    }));
    const legacy = parseString(source, 'l5x');
    expect(legacy.status).toBe('partial');
    expect(legacy.data?.aois).toEqual([]);
  });

  it.each([33, 34, 35])('v%i keeps encoded routine targets out of ordinary routines', (major) => {
    const source = read(`document-encoded-v${major}`);
    const doc = document(source);
    expect(doc.encodedData).toHaveLength(1);
    expect(doc.encodedData[0]).toMatchObject({
      sourcePath: '/RSLogix5000Content/Controller[1]/Programs[1]/Program[1]/Routines[1]/EncodedData[1]',
      containerPath: '/RSLogix5000Content/Controller[1]/Programs[1]/Program[1]/Routines[1]',
      attributes: { EncodedType: 'Routine', Name: 'Secret', Type: 'RLL' },
      payload: 'synthetic-encoded-marker',
    });
    expect(doc.targetIds).toEqual([doc.encodedData[0].sourcePath]);
    expect(doc.resources.some((resource) => resource.kind === 'routine')).toBe(false);
    expect(parseString(source, 'l5x').data?.programs[0].routines).toEqual([]);
  });

  it('collects mixed and repeated wrappers in XML order without inventing implementations', () => {
    const source = read('encoded-mixed-v35');
    const doc = document(source);
    expect(doc.encodedData.map((item) => item.attributes.Name)).toEqual(['OpaqueAOI', 'OpaqueRLL', 'OpaqueST']);
    expect(doc.encodedData.map((item) => item.payload)).toEqual([
      'aoi-payload',
      '\nplain-routine-payload',
      'st-payload',
    ]);
    expect(doc.encodedData.map((item) => item.containerPath)).toEqual([
      '/RSLogix5000Content/Controller[1]/AddOnInstructionDefinitions[1]',
      '/RSLogix5000Content/Controller[1]/Programs[1]/Program[1]/Routines[1]',
      '/RSLogix5000Content/Controller[1]/Programs[1]/Program[1]/Routines[1]',
    ]);
    expect(doc.resources.filter((resource) => resource.kind === 'routine').map((resource) => resource.data.name)).toEqual(['Ordinary', 'Empty']);
    expect(parseString(source, 'l5x').data?.programs[0].routines.map((routine) => routine.name)).toEqual(['Ordinary', 'Empty']);
  });

  it('selects a named encoded target even when one ordinary routine is context', () => {
    const source = read('encoded-mixed-v35')
      .replace('TargetName="FixtureController" TargetType="Controller" ContainsContext="false"',
        'TargetName="OpaqueRLL" TargetType="Routine" ContainsContext="true"')
      .replace('<Routine Name="Empty" Type="RLL" />', '');
    const doc = document(source);
    expect(doc.targetIds).toEqual([doc.encodedData[1].sourcePath]);
    expect(doc.resources.filter((resource) => resource.kind === 'routine').map((resource) => resource.role)).toEqual(['context']);
  });

  it('collects unrecognized EncodedType values without decoding them', () => {
    const source = read('encoded-mixed-v35').replace(
      'EncodedType="Routine" Name="OpaqueRLL"',
      'EncodedType="FutureType" Name="OpaqueRLL"'
    );
    expect(document(source).encodedData[1].attributes.EncodedType).toBe('FutureType');
  });

  it('preserves whitespace-only CDATA and XML entity spellings as opaque text', () => {
    const source = read('encoded-mixed-v35');
    const whitespace = source.replace('<![CDATA[st-payload]]>', '<![CDATA[  \n  ]]>');
    expect(document(whitespace).encodedData[2].payload).toBe('  \n  ');
    const escaped = source.replace('<![CDATA[st-payload]]>', 'a&amp;b');
    expect(document(escaped).encodedData[2].payload).toBe('a&amp;b');
  });

  it('compares exact payload text without treating metadata changes as decoded changes', async () => {
    const { diffEncodedData } = await import('../../src/diff');
    const source = read('encoded-mixed-v35');
    const before = document(source);
    const changed = document(source.replace('st-payload', 'st-payload-changed'));
    expect(diffEncodedData(before, changed).map((change) => change.kind)).toEqual([
      'unchanged', 'unchanged', 'changed',
    ]);
    const metadataOnly = document(source.replace('Revision="1.0"', 'Revision="2.0"'));
    expect(diffEncodedData(before, metadataOnly).every((change) => change.kind === 'unchanged')).toBe(true);
    const shifted = document(source.replace(
      '<Program Name="MainProgram">',
      '<Program Name="Inserted" /><Program Name="MainProgram">'
    ));
    expect(diffEncodedData(before, shifted).every((change) => change.kind === 'unchanged')).toBe(true);
  });

  it('applies existing XML and source-size guards before exposing encoded payloads', () => {
    const source = read('encoded-aoi-v35');
    expect(parseDocumentString(source, 'l5x', { resourceLimits: { maxSourceBytes: 2 } }).errors?.[0]?.code).toBe('SOURCE_BYTE_LIMIT_EXCEEDED');
    expect(parseDocumentString(source.replace('</EncodedData>', ''), 'l5x').errors?.[0]?.code).toBe('INVALID_XML');
  });
});
