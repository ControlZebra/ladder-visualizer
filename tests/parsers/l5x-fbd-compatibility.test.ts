import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import { describe, expect, it } from 'vitest';
import { L5XParser, parseDocumentString, parseString } from '../../src/parsers';
import type { L5XContent, L5XFBDContent } from '../../src/parsers/l5x';

const fixtureDirectory = join(__dirname, '../fixtures/l5x');
const read = (name: string) => readFileSync(join(fixtureDirectory, `${name}.L5X`), 'utf8');
const routinePath =
  '/RSLogix5000Content/Controller[1]/Programs[1]/Program[1]/Routines[1]/Routine[1]';
const schemaUseModes = [
  'Invalid',
  'Context',
  'Create',
  'Target',
  'Update',
  'Delete',
  'Insert',
  'Append',
  'Redefine',
  'Reference',
  'Overwrite',
] as const;

function replaceBody(...bodies: string[]): string {
  return read('fbd-v35').replace(/<FBDContent[\s\S]*<\/FBDContent>/, bodies.join(''));
}

function body(onlineEditType?: string): string {
  return `<FBDContent SheetOrientation="Landscape"${
    onlineEditType === undefined ? '' : ` OnlineEditType="${onlineEditType}"`
  }><Sheet Number="1" /></FBDContent>`;
}

function expectUnsupported(source: string, path = routinePath, states?: string) {
  for (const result of [
    new L5XParser().parse(source),
    new L5XParser().validate(source),
    parseString(source, 'l5x'),
    parseDocumentString(source, 'l5x'),
  ]) {
    expect(result).toMatchObject({
      success: false,
      status: 'failed',
      errors: [
        {
          code: 'UNSUPPORTED_FBD_ONLINE_EDIT',
          location: { path },
        },
      ],
    });
    expect(result.data).toBeUndefined();
    if (states !== undefined) expect(result.errors?.[0]?.message).toContain(states);
  }
}

describe('L5X FBD compatibility boundary', () => {
  it('types every schema-declared FBD Use mode', () => {
    const bodies: L5XFBDContent[] = schemaUseModes.map((use) => ({
      '@_Use': use,
      '@_SheetOrientation': 'Landscape',
    }));

    expect(bodies.map((candidate) => candidate['@_Use'])).toEqual(schemaUseModes);
  });

  it.each([33, 34, 35])('accepts one untagged static FBD body in v%i', (major) => {
    const source = read(`fbd-v${major}`);
    const result = parseDocumentString(source, 'l5x');

    expect(result.success).toBe(true);
    expect(result.status).toBe('partial');
    const routine = result.data?.resources.find((resource) => resource.kind === 'routine');
    expect(routine?.data).toMatchObject({ name: 'FBDLogic', type: 'FBD', rungs: [] });
    expect(result.data?.fragments).toContainEqual(
      expect.objectContaining({
        path: `${routine?.sourcePath}/FBDContent[1]`,
        reason: 'unmodeled',
      })
    );
  });

  it.each(['NoType', 'Original', 'PendingEdits', 'TestEdits', 'OrginalPending', 'LastType'])(
    'rejects the schema-declared %s edit state before normalization',
    (state) => {
      expectUnsupported(replaceBody(body(state)), routinePath, `Observed states: ${state}`);
    }
  );

  it('rejects an unknown edit state before normalization', () => {
    expectUnsupported(replaceBody(body('FutureEditState')), routinePath, 'FutureEditState');
  });

  it('rejects repeated untagged bodies as an ambiguous online-edit representation', () => {
    expectUnsupported(
      replaceBody(body(), body()),
      routinePath,
      'Observed states: untagged, untagged'
    );
  });

  it('rejects combined original and pending views without returning a partial model', () => {
    expectUnsupported(
      replaceBody(body('Original'), body('PendingEdits')),
      routinePath,
      'Observed states: Original, PendingEdits'
    );
  });

  it('applies the same pre-normalization check to AOI-owned FBD routines', () => {
    const source = `<?xml version="1.0" encoding="UTF-8"?>
<RSLogix5000Content SchemaRevision="1.0" SoftwareRevision="35.01" TargetName="FixtureAOI" TargetType="AddOnInstructionDefinition" ContainsContext="true">
  <Controller Use="Context" Name="FixtureController"><AddOnInstructionDefinitions><AddOnInstructionDefinition Use="Target" Name="FixtureAOI"><Routines><Routine Name="Logic" Type="FBD">${body('TestEdits')}</Routine></Routines></AddOnInstructionDefinition></AddOnInstructionDefinitions></Controller>
</RSLogix5000Content>`;
    expectUnsupported(
      source,
      '/RSLogix5000Content/Controller[1]/AddOnInstructionDefinitions[1]/AddOnInstructionDefinition[1]/Routines[1]/Routine[1]',
      'Observed states: TestEdits'
    );
  });

  it('models repeated raw FBD bodies exactly as fast-xml-parser emits them', () => {
    const parsed = new XMLParser({
      ignoreAttributes: false,
      parseAttributeValue: false,
      parseTagValue: false,
    }).parse(replaceBody(body(), body())) as L5XContent;
    const programs = parsed.RSLogix5000Content.Controller.Programs?.Program;
    const program = Array.isArray(programs) ? programs[0] : programs;
    const routines = program?.Routines?.Routine;
    const routine = Array.isArray(routines) ? routines[0] : routines;
    const bodies: L5XFBDContent | L5XFBDContent[] | undefined = routine?.FBDContent;

    expect(bodies).toHaveLength(2);
  });

  it.each(['33', '34', '35'])('pins the v%s schema discrepancy for Function and GSV/SSV', (major) => {
    const schemaRoot = process.env.L5X_SCHEMA_DIR ?? join(__dirname, '../../../l5x-schema/schemas');
    const schema = readFileSync(join(schemaRoot, `l5x-v${major}.xsd`), 'utf8');

    expect(schema).toMatch(/name="FBDContent" type="FBDContentType"/);
    expect(schema).toMatch(/name="OnlineEditType" type="LangContOnlineEditEnum"/);
    expect(schema).toMatch(/name="GSV" type="FBD_GSVType"/);
    expect(schema).toMatch(/name="SSV" type="FBD_SSVType"/);
    expect(schema).not.toMatch(/name="Function"/);
  });
});
