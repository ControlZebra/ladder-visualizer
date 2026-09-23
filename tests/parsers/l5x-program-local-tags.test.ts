import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createTagResolver, parseDocumentString, parseString } from '../../src/parsers';

const read = (name: string) => readFileSync(join(__dirname, `../fixtures/l5x/${name}.L5X`), 'utf8');
const programPath = '/RSLogix5000Content/Controller[1]/Programs[1]/Program[1]';

function programSource(localTags: string, version = '35.01') {
  return read('program-rll-v35')
    .replace('SoftwareRevision="35.01"', `SoftwareRevision="${version}"`)
    .replace('<Routines>', `${localTags}<Routines>`);
}

describe('schema-declared Program LocalTags', () => {
  it.each(['33', '34', '35'])('fully normalizes the v%s standalone Program fixture', (version) => {
    const source = read(`program-local-tags-v${version}`);
    const controller = parseString(source, 'l5x');
    const document = parseDocumentString(source, 'l5x');
    for (const result of [controller, document]) {
      expect(result).toMatchObject({ success: true, status: 'complete' });
    }
    expect(document.data?.targetIds).toContain(`${programPath}`);
    expect(controller.data?.programs[0].localTags).toEqual([
      expect.objectContaining({
        name: 'Hidden', uid: '18446744073709551615', parentUid: '4', dataTypeUid: '5',
        dataType: 'DINT', scope: 'Program', programName: 'ProgramLocals',
        externalAccess: 'ReadOnly', verified: true, description: 'Hidden local',
        defaultValue: 7, defaultData: { format: 'Decorated', values: [
          { kind: 'atomic', dataType: 'DINT', radix: 'Decimal', value: '7' },
        ] },
        comments: [expect.objectContaining({ text: 'Initial value' })],
      }),
      expect.objectContaining({ name: 'Buffer', dimensions: [2, 3], programName: 'ProgramLocals' }),
    ]);
    expect(document.data?.resources.find((resource) => resource.kind === 'program')?.data.localTags).toEqual(
      controller.data?.programs[0].localTags
    );
  });

  it.each(['33', '34', '35'])('exposes v%s locals through controller and document entry points', (version) => {
    const source = read(`normalization-coverage-v${version}`);
    const controller = parseString(source, 'l5x');
    const document = parseDocumentString(source, 'l5x');
    const expected = [
      expect.objectContaining({
        name: 'Hidden', dataType: 'DINT', scope: 'Program', programName: 'ProgramWithLocals',
        radix: 'Decimal', defaultValue: 7,
        defaultData: { format: 'Decorated', values: [
          { kind: 'atomic', dataType: 'DINT', radix: 'Decimal', value: '7' },
        ] },
      }),
      expect.objectContaining({ name: 'HiddenAgain', dataType: 'BOOL', scope: 'Program', programName: 'ProgramWithLocals' }),
    ];

    expect(controller.data?.programs[0].localTags).toEqual(expected);
    expect(document.data?.resources.find((resource) => resource.kind === 'program')?.data.localTags).toEqual(expected);
    expect(controller.data?.programs[0].tags).toEqual([]);
    expect(controller.data?.programs[0].parameters).toEqual([]);
    expect(controller.warnings?.some(({ code }) => code === 'UNNORMALIZED_L5X_PROGRAM_LOCAL_TAG')).toBe(false);
    expect(document.data?.fragments).toContainEqual(expect.objectContaining({
      path: `${programPath}/LocalTags[1]`, reason: 'source-representation',
    }));
  });

  it('handles missing, empty, singleton, and repeated collections', () => {
    const cases = [
      ['', []],
      ['<LocalTags />', []],
      ['<LocalTags><LocalTag Name="One" DataType="DINT" /></LocalTags>', ['One']],
      ['<LocalTags><LocalTag Name="One" DataType="DINT" /><LocalTag Name="Two" DataType="BOOL" /></LocalTags>', ['One', 'Two']],
    ] as const;
    for (const [source, names] of cases) {
      const result = parseString(programSource(source), 'l5x');
      expect(result).toMatchObject({ success: true, status: 'complete' });
      expect(result.data?.programs[0].localTags.map((tag) => tag.name)).toEqual(names);
    }
  });

  it('retains dimensions, metadata, comments, and a supported text default', () => {
    const source = programSource(`<LocalTags><LocalTag Name="State" UId="18446744073709551615" ParentUId="4" DataType="DINT" DataTypeUId="5" Dimensions="2 3" Radix="Decimal" ExternalAccess="Read Only" Verified="true"><Comments><Comment Operand="[0,0]"><![CDATA[First element]]></Comment></Comments><Description><![CDATA[Local state]]></Description><DefaultData Format="L5K"><![CDATA[7]]></DefaultData></LocalTag></LocalTags>`);
    const result = parseString(source, 'l5x');
    expect(result).toMatchObject({ success: true, status: 'complete' });
    expect(result.data?.programs[0].localTags[0]).toMatchObject({
      name: 'State', uid: '18446744073709551615', parentUid: '4', dataTypeUid: '5',
      dataType: 'DINT', scope: 'Program', programName: 'FixtureProgramV35',
      dimensions: [2, 3], radix: 'Decimal', externalAccess: 'ReadOnly', verified: true,
      description: 'Local state', defaultData: { format: 'L5K', text: '7', values: [] },
      defaultValue: 7,
      comments: [expect.objectContaining({ operand: '[0,0]', text: 'First element' })],
    });
  });

  it('keeps same-name program and controller declarations available without choosing one', () => {
    const source = programSource('<LocalTags><LocalTag Name="Run" DataType="DINT" /></LocalTags>')
      .replace('<Programs>', '<Tags><Tag Name="Run" TagType="Base" DataType="BOOL" /></Tags><Programs>');
    const result = parseString(source, 'l5x');
    expect(result.success).toBe(true);
    const resolver = createTagResolver(result.data!);
    expect(resolver.getProgramTagCandidates('Run', 'FixtureProgramV35')).toEqual([
      expect.objectContaining({ name: 'Run', dataType: 'BOOL', scope: 'Program' }),
      expect.objectContaining({ name: 'Run', dataType: 'DINT', scope: 'Program' }),
    ]);
    expect(resolver.getTag('Run')).toMatchObject({ name: 'Run', scope: 'Controller' });
  });

  it('preserves unsupported defaults and reports a partial result at the source node', () => {
    const source = programSource('<LocalTags><LocalTag Name="Axis" DataType="AXIS_CIP_DRIVE"><DefaultData Format="Decorated"><AxisParameters MotionGroup="MotionGroup1" /></DefaultData></LocalTag></LocalTags>');
    const result = parseDocumentString(source, 'l5x');
    expect(result).toMatchObject({ success: true, status: 'partial' });
    expect(result.warnings).toContainEqual(expect.objectContaining({
      code: 'UNSUPPORTED_L5X_PROGRAM_LOCAL_TAG_DATA',
      location: { path: `${programPath}/LocalTags[1]/LocalTag[1]/DefaultData[1]/AxisParameters[1]` },
    }));
    expect(result.data?.resources.find((resource) => resource.kind === 'program')?.data.localTags[0]).toMatchObject({
      name: 'Axis', defaultData: { format: 'Decorated', values: [] },
    });
    expect(result.data?.fragments).toContainEqual(expect.objectContaining({
      path: `${programPath}/LocalTags[1]`, reason: 'source-representation',
    }));
  });

  it.each(['17.00', '32.00'])('keeps focused v%s parsing behavior without XSD claims', (version) => {
    const result = parseString(programSource('<LocalTags><LocalTag Name="Earlier" DataType="DINT" /></LocalTags>', version), 'l5x');
    expect(result.data?.programs[0].localTags).toEqual([
      expect.objectContaining({ name: 'Earlier', dataType: 'DINT', programName: 'FixtureProgramV35' }),
    ]);
  });
});
