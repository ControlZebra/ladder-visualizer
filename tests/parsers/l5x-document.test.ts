import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { XMLParser } from 'fast-xml-parser';
import {
  L5XParser,
  parseDocumentString,
  parseDocumentBuffer,
  parseDocumentFile,
  parseString,
  parseBuffer,
  parseFile,
} from '../../src/parsers';
import type { PlcDocument, PlcResource } from '../../src/types';
import { L5X_FIXTURES } from '../fixtures/l5x/manifest';

const read = (name: string) =>
  readFileSync(join(__dirname, '../fixtures/l5x', `${name}.L5X`), 'utf8');
const buffer = (source: string) => new TextEncoder().encode(source).buffer;
const file = (source: string): File =>
  ({ name: 'fixture.L5X', size: buffer(source).byteLength, text: async () => source }) as File;
const cp = '/RSLogix5000Content/Controller[1]';
const kinds: Record<string, PlcResource['kind']> = {
  Controller: 'controller',
  Program: 'program',
  Routine: 'routine',
  Rung: 'rung',
  Tag: 'tag',
  DataType: 'dataType',
  AddOnInstructionDefinition: 'aoi',
  Module: 'module',
};
function document(source: string): PlcDocument {
  const result = parseDocumentString(source, 'l5x');
  expect(result.errors).toBeUndefined();
  expect(result.success).toBe(true);
  expect(result.data).toBeDefined();
  return result.data!;
}
function targets(doc: PlcDocument) {
  return doc.resources.filter((resource) => doc.targetIds.includes(resource.id));
}

// Enumerate parsed leaves independently of the production preservation walker.
function leaves(value: unknown, path: string): [string, unknown][] {
  if (typeof value !== 'object' || value === null) return [[path, value]];
  return Object.entries(value).flatMap(([key, child]) => {
    if (key.startsWith('@_')) return [[`${path}/@${key.slice(2)}`, child] as [string, unknown]];
    if (key.startsWith('#')) return [[`${path}/${key}`, child] as [string, unknown]];
    return (Array.isArray(child) ? child : [child]).flatMap((item, index) =>
      leaves(item, `${path}/${key}[${index + 1}]`)
    );
  });
}

const validFixtures = L5X_FIXTURES.filter(
  (f) => !['malformed-input', 'adversarial-input'].includes(f.artifactKind)
);
describe('L5X target-aware document contract', () => {
  it.each(validFixtures)(
    '$id exposes the declared targets with owned typed resources',
    (fixture) => {
      const source = read(fixture.id);
      const doc = document(source);
      expect(doc.source).toMatchObject({
        format: 'l5x',
        schemaRevision: '1.0',
        softwareRevision: fixture.studio5000Version,
        targetType: fixture.targetType,
      });
      expect(targets(doc).length).toBeGreaterThan(0);
      expect(
        targets(doc).every(
          (resource) => resource.kind === kinds[fixture.targetType] && resource.role === 'target'
        )
      ).toBe(true);
      expect(new Set(doc.resources.map((resource) => resource.id)).size).toBe(doc.resources.length);
      for (const resource of doc.resources) {
        expect(resource.sourcePath).toBe(resource.id);
        expect(['target', 'context', 'reference']).toContain(resource.role);
        if (resource.kind !== 'controller')
          expect(doc.resources.some((owner) => owner.id === resource.ownerId)).toBe(true);
      }
      const legacy = parseString(source, 'l5x');
      expect(legacy.success).toBe(true);
      expect(doc.resources.find((resource) => resource.kind === 'controller')?.data).toEqual(
        legacy.data
      );
    }
  );

  it.each([33, 34, 35])(
    'v%i preserves target selection, scopes, role overrides and repeated bodies',
    (major) => {
      const doc = document(read(`document-envelope-v${major}`));
      const main = targets(doc)[0];
      expect(main).toMatchObject({
        kind: 'routine',
        role: 'target',
        ownerId: `${cp}/Programs[1]/Program[1]`,
        data: { name: 'Main' },
      });
      expect(doc.resources.find((r) => r.kind === 'controller')?.role).toBe('context');
      expect(doc.resources.filter((r) => r.kind === 'dataType').map((r) => r.role)).toEqual([
        'context',
        'reference',
      ]);
      expect(doc.resources.filter((r) => r.kind === 'tag').map((r) => r.data)).toMatchObject([
        {
          name: 'Shared',
          scope: 'Controller',
          constant: true,
          data: [{ format: 'Decorated', values: [{ kind: 'atomic', value: '0007' }] }],
        },
        { name: 'Shared', scope: 'Program', programName: 'First', aliasFor: 'Shared.0' },
      ]);
      expect(
        doc.resources
          .filter((r) => r.kind === 'rung')
          .map((r) => ({ role: r.role, owner: r.ownerId, data: r.data }))
      ).toMatchObject([
        {
          role: 'target',
          owner: main.id,
          data: { number: 4, comment: 'A & B', raw: 'XIC(A)OTE(B);' },
        },
        { role: 'target', owner: main.id, data: { number: 9, raw: 'OTE(C);' } },
      ]);
      const routines = doc.resources.filter((r) => r.kind === 'routine');
      expect(routines[1].data).toMatchObject({ name: 'Empty', rungs: [] });
      expect(routines[2].data).toMatchObject({
        name: 'Other',
        stContent: [
          { number: 0, text: 'A := 1;' },
          { number: 1, text: 'B := 2;' },
        ],
      });
      expect(doc.fragments).toContainEqual(
        expect.objectContaining({ path: '/RSLogix5000Content/@Owner', value: 'FixtureOwner' })
      );
      expect(doc.mappings).toContainEqual(
        expect.objectContaining({
          sourcePath: `${cp}/Tags[1]/Tag[1]/@Constant`,
          field: 'constant',
        })
      );
      expect(doc.fragments).toContainEqual(
        expect.objectContaining({
          path: `${cp}/Tags[1]/Tag[1]/Data[1]`,
          reason: 'source-representation',
          value: {
            '@_Format': 'Decorated',
            DataValue: { '@_DataType': 'DINT', '@_Radix': 'Decimal', '@_Value': '0007' },
          },
        })
      );
      expect(doc.resources.find((resource) => resource.kind === 'controller')?.data).toMatchObject({
        tasks: [
          {
            name: 'Periodic',
            type: 'Periodic',
            rate: 10000,
            priority: 10,
            scheduledProgramNames: ['First'],
          },
        ],
      });
      expect(doc.mappings).toContainEqual(
        expect.objectContaining({
          sourcePath: `${cp}/Tasks[1]/Task[1]/ScheduledPrograms[1]/ScheduledProgram[1]/@Name`,
          field: 'tasks.0.scheduledProgramNames.0',
        })
      );
      expect(doc.fragments).not.toContainEqual(
        expect.objectContaining({ path: `${cp}/Tasks[1]`, reason: 'unmodeled' })
      );
    }
  );

  it.each([33, 34, 35])('v%i exposes exact standalone tag, UDT, module and rung data', (major) => {
    const tags = targets(document(read(`tags-v${major}`)));
    expect(tags.map((r) => r.data)).toMatchObject([
      { name: major === 34 ? 'FixtureCounter' : 'Counter', scope: 'Controller', dataType: 'DINT' },
      {
        name: major === 34 ? 'FixtureCounterDone' : 'Done',
        aliasFor: major === 34 ? 'FixtureCounter.0' : 'Counter.0',
      },
    ]);
    const datatype = targets(document(read(`datatype-v${major}`)))[0];
    expect(datatype.data).toMatchObject(
      major === 35
        ? {
            name: 'FixtureType',
            members: [
              { name: 'Enabled', dataType: 'BOOL' },
              { name: 'Setpoint', dataType: 'REAL' },
            ],
          }
        : { name: `FixtureTypeV${major}`, members: [{ name: 'Value', dataType: 'DINT' }] }
    );
    expect(targets(document(read(`module-v${major}`)))[0].data).toMatchObject({
      name: major === 35 ? 'FixtureModule' : `FixtureModuleV${major}`,
      catalogNumber: '1756-IB16',
      ports: [{ id: 1, address: '1' }],
    });
    expect(targets(document(read(`rung-rll-v${major}`)))[0].data).toMatchObject({
      number: 0,
      raw: '[XIC(A),[XIC(B),XIC(C)]]CPT(Destination,MAX(A,B)+1)VendorOp("A,B[0]",Tag)OTE(Output);',
    });
  });

  it.each([33, 34, 35])(
    'v%i retains unsupported, protected and version-specific source values',
    (major) => {
      const result = parseDocumentString(read(`full-project-v${major}`), 'l5x');
      expect(result.success).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({ code: 'PRESERVED_L5X_CONTENT' })
      );
      const fragments = result.data!.fragments;
      const program = `${cp}/Programs[1]/Program[1]`;
      expect(fragments).toContainEqual(
        expect.objectContaining({
          path: `${program}/Routines[1]/Routine[3]/FBDContent[1]`,
          reason: 'unmodeled',
        })
      );
      expect(fragments).toContainEqual(
        expect.objectContaining({
          path: `${program}/Routines[1]/Routine[4]/SFCContent[1]`,
          reason: 'unmodeled',
        })
      );
      expect(fragments).toContainEqual(
        expect.objectContaining({
          path: `${program}/Routines[1]/Routine[5]/ExternalContent[1]`,
          reason: 'protected',
          value: { ExternalRoutineXml: { '#cdata': 'synthetic-protected-content-marker' } },
        })
      );
      expect(fragments).toContainEqual(
        expect.objectContaining({
          path: `${cp}/Modules[1]/Module[1]/Communications[1]/Connections[1]/Connection[1]/@MaxObservedNetworkDelay`,
          value: major === 33 ? '12' : '12.5',
        })
      );
    }
  );

  it.each(validFixtures)(
    '$id accounts for every parsed leaf through a field mapping or preserved fragment',
    (fixture) => {
      const source = read(fixture.id);
      const doc = document(source);
      const root = new XMLParser({
        ignoreAttributes: false,
        parseTagValue: false,
        parseAttributeValue: false,
        cdataPropName: '#cdata',
      }).parse(source).RSLogix5000Content;
      const mapped = new Set(doc.mappings.map((m) => m.sourcePath));
      for (const [path, value] of leaves(root, '/RSLogix5000Content')) {
        const fragment = doc.fragments.find(
          (f) => path === f.path || path.startsWith(`${f.path}/`)
        );
        if (fragment) {
          expect(leaves(fragment.value, fragment.path)).toContainEqual([path, value]);
        } else {
          expect(mapped.has(path), `Unaccounted source: ${path}`).toBe(true);
        }
      }
      for (const mapping of doc.mappings) {
        const resource = mapping.resourceId
          ? doc.resources.find((r) => r.id === mapping.resourceId)
          : undefined;
        const target = resource?.data ?? doc.source;
        const resolved = mapping.field
          .split('.')
          .reduce<unknown>(
            (value, key) => (value == null ? undefined : (value as Record<string, unknown>)[key]),
            target
          );
        expect(resolved, `Missing normalized field: ${mapping.field}`).not.toBeUndefined();
      }
    }
  );

  it.each([33, 34, 35])(
    'v%i preserves explicit multi-target order and reference dependencies',
    (major) => {
      const doc = document(read(`document-targets-v${major}`));
      expect(targets(doc).map((r) => r.data)).toMatchObject([
        { name: 'First' },
        { name: 'Second' },
      ]);
      expect(doc.resources.filter((r) => r.kind === 'dataType').map((r) => r.role)).toEqual([
        'target',
        'reference',
        'target',
      ]);
    }
  );

  it.each([33, 34, 35])(
    'v%i returns encoded routine targets with an inspectable protected body',
    (major) => {
      const doc = document(read(`document-encoded-v${major}`));
      const target = targets(doc)[0];
      expect(target).toMatchObject({
        kind: 'routine',
        data: { name: 'Secret', type: 'RLL', rungs: [] },
      });
      expect(doc.fragments).toContainEqual({
        path: target.sourcePath,
        reason: 'protected',
        value: {
          '@_Name': 'Secret',
          '@_Type': 'RLL',
          '@_EncodedType': 'Routine',
          '#cdata': 'synthetic-encoded-marker',
        },
      });
    }
  );

  it('rejects ambiguous targets instead of choosing the first same-name routine', () => {
    const source = read('document-envelope-v35').replace('Name="Other"', 'Name="Main"');
    for (const result of [parseDocumentString(source, 'l5x'), parseString(source, 'l5x')]) {
      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.errors?.[0]).toMatchObject({
        code: 'AMBIGUOUS_L5X_TARGET',
        location: { path: '/RSLogix5000Content/@TargetName' },
      });
    }
  });

  it('selects the entire context-free export set even when TargetName names its first member', () => {
    const source = read('tags-v35').replace('TargetName="FixtureTagsV35"', 'TargetName="Counter"');
    expect(targets(document(source)).map((resource) => resource.data)).toMatchObject([
      { name: 'Counter' },
      { name: 'Done' },
    ]);
  });

  it('rejects an inconsistent declared target count', () => {
    const source = read('tags-v35').replace('TargetCount="2"', 'TargetCount="3"');
    expect(parseDocumentString(source, 'l5x').errors?.[0]?.code).toBe('INVALID_FIELD_TYPE');
  });

  it('rejects absent targets in document and controller-shaped APIs', () => {
    const source =
      '<RSLogix5000Content TargetName="Missing" TargetType="Program"><Controller Name="Context"/></RSLogix5000Content>';
    expect(parseDocumentString(source, 'l5x').errors?.[0]?.code).toBe('MISSING_L5X_TARGET');
    expect(parseString(source, 'l5x').errors?.[0]?.code).toBe('MISSING_L5X_TARGET');
  });

  it('rejects unsupported export families explicitly', () => {
    expect(
      parseDocumentString(read('tags-v35').replace('TargetType="Tag"', 'TargetType="Task"'), 'l5x')
        .errors?.[0]?.code
    ).toBe('INVALID_FIELD_TYPE');
  });

  it('preserves unknown nested extensions without losing repeated subtrees', () => {
    const source = read('controller-rll-v33').replace(
      '</Controller>',
      '<FutureExtension Flag="0001"><Item>one</Item><Item>two</Item></FutureExtension></Controller>'
    );
    expect(document(source).fragments).toContainEqual({
      path: `${cp}/FutureExtension[1]`,
      reason: 'unmodeled',
      value: { '@_Flag': '0001', Item: ['one', 'two'] },
    });
  });

  it('keeps document results and AOI context isolated', () => {
    const first = parseDocumentString(read('aoi-v35'), 'l5x');
    const second = parseDocumentString(
      read('aoi-v35').replace('Name="In"', 'Name="OtherInput"'),
      'l5x'
    );
    expect(first.context?.instructionRegistry).not.toBe(second.context?.instructionRegistry);
    expect(first.context?.instructionRegistry.getParameterLabels('FixtureAOI')).toEqual([
      'In',
      'Out',
    ]);
    expect(second.context?.instructionRegistry.getParameterLabels('FixtureAOI')).toEqual([
      'OtherInput',
      'Out',
    ]);
    expect(first.data).not.toBe(second.data);
  });

  it('supports direct parser, buffer and asynchronous file entry points', async () => {
    const source = read('tags-v35');
    const expected = document(source);
    expect(new L5XParser().parseDocument(source).data).toEqual(expected);
    expect(parseDocumentBuffer(buffer(source)).data).toEqual(expected);
    expect((await parseDocumentFile(file(source))).data).toEqual(expected);
    expect(parseBuffer(buffer(source)).success).toBe(true);
    expect((await parseFile(file(source))).success).toBe(true);
  });

  it('preserves malformed XML, cancellation, timeout, entity and byte/node/depth guards', async () => {
    expect(parseDocumentString(read('malformed-truncated-v35'), 'l5x').errors?.[0]?.code).toBe(
      'INVALID_XML'
    );
    expect(parseDocumentString(read('adversarial-doctype-v35'), 'l5x').errors?.[0]?.code).toBe(
      'UNSAFE_XML_ENTITY'
    );
    const source = read('controller-rll-v33');
    const abort = new AbortController();
    abort.abort();
    expect(parseDocumentString(source, 'l5x', { signal: abort.signal }).errors?.[0]?.code).toBe(
      'PARSE_CANCELLED'
    );
    expect(parseDocumentString(source, 'l5x', { timeoutMs: 0 }).errors?.[0]?.code).toBe(
      'PARSE_TIMEOUT'
    );
    expect(
      parseDocumentBuffer(buffer(source), 'l5x', { resourceLimits: { maxSourceBytes: 2 } })
        .errors?.[0]?.code
    ).toBe('SOURCE_BYTE_LIMIT_EXCEEDED');
    expect(
      parseDocumentString(source, 'l5x', { resourceLimits: { maxXmlNodes: 2 } }).errors?.[0]?.code
    ).toBe('XML_NODE_LIMIT_EXCEEDED');
    expect(
      parseDocumentString(source, 'l5x', { resourceLimits: { maxXmlDepth: 2 } }).errors?.[0]?.code
    ).toBe('XML_DEPTH_LIMIT_EXCEEDED');
    const unread = {
      name: 'huge.L5X',
      size: 100,
      text: () => {
        throw new Error('must not read');
      },
    } as unknown as File;
    expect(
      (await parseDocumentFile(unread, { resourceLimits: { maxSourceBytes: 2 } })).errors?.[0]?.code
    ).toBe('SOURCE_BYTE_LIMIT_EXCEEDED');
    expect((await parseDocumentFile({ ...unread, size: 1 } as File)).errors?.[0]?.code).toBe(
      'FILE_READ_ERROR'
    );
  });

  it('preserves existing JSON parsing and explicitly limits document parsing to capable parsers', () => {
    const source = JSON.stringify({
      serial_number: 'test',
      comm_path: '',
      created_date: '',
      modified_date: '',
      data_types: [],
      tags: [],
      programs: [],
      aois: [],
      map_devices: [],
    });
    expect(parseString(source).success).toBe(true);
    expect(parseDocumentString(source).errors?.[0]?.code).toBe('UNSUPPORTED_FORMAT');
  });

  it('parses the existing real export through the public document API', () => {
    const source = readFileSync(
      join(__dirname, '../../examples/Cooker_1_AutoLogic_Program.L5X'),
      'utf8'
    );
    const result = document(source);
    expect(targets(result)[0]).toMatchObject({
      kind: 'program',
      data: { name: 'Cooker_1_AutoLogic' },
    });
    expect(result.resources.some((r) => r.role === 'reference')).toBe(true);
  });
});
