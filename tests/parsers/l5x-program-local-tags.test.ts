import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createTagResolver, parseDocumentString, parseString } from '../../src/parsers';
import {
  diffControllers,
  parseString as parsePublicString,
  parseDocumentString as parsePublicDocumentString,
} from '../../src';

const read = (name: string) => readFileSync(join(__dirname, `../fixtures/l5x/${name}.L5X`), 'utf8');
const programPath = '/RSLogix5000Content/Controller[1]/Programs[1]/Program[1]';

function programSource(localTags: string, version = '35.01') {
  return read('program-rll-v35')
    .replace('SoftwareRevision="35.01"', `SoftwareRevision="${version}"`)
    .replace('<Routines>', `${localTags}<Routines>`);
}

describe('schema-declared Program LocalTags', () => {
  it.each(['33', '34', '35'])('preserves v%s atomic text defaults and detects value edits', (version) => {
    for (const content of ['42', '<![CDATA[42]]>', '4<![CDATA[2]]>', '<![CDATA[4]]><![CDATA[2]]>']) {
      const source = read(`program-local-tags-v${version}`).replace(/<LocalTags>[\s\S]*?<\/LocalTags>/,
        `<LocalTags><LocalTag Name="X" DataType="DINT"><DefaultData Format="Decorated"><DataValue>${content}</DataValue></DefaultData></LocalTag></LocalTags>`);
      const before = parsePublicString(source, 'l5x');
      const document = parsePublicDocumentString(source, 'l5x');
      const after = parsePublicString(source.replace(content, content.replace('2', '3')), 'l5x');
      expect(before.status).toBe('complete');
      expect(document.status).toBe('complete');
      expect(after.status).toBe('complete');
      expect(before.data?.programs[0].localTags[0].defaultData?.[0].values).toEqual([{ kind: 'atomic', value: '42' }]);
      expect(document.data?.resources.find((resource) => resource.kind === 'program')?.data.localTags[0].defaultData?.[0].values)
        .toEqual([{ kind: 'atomic', value: '42' }]);
      expect(after.data?.programs[0].localTags[0].defaultData?.[0].values).toEqual([{ kind: 'atomic', value: '43' }]);
      const diff = diffControllers(before.data!, after.data!);
      expect(diff.summary.tags.modified).toBe(1);
      expect(diff.programs[0].localTagDiffs?.[0].propertyChanges).toContainEqual(
        expect.objectContaining({ property: 'defaultData' }),
      );
    }
  });

  it('preserves decoded text, keeps attribute precedence, and leaves empty values empty', () => {
    const source = programSource('<LocalTags><LocalTag Name="Text" DataType="STRING"><DefaultData Format="Decorated"><DataValue>A &amp; B</DataValue><DataValue Value="attribute">text</DataValue><DataValue /></DefaultData></LocalTag></LocalTags>');
    const result = parsePublicString(source, 'l5x');
    expect(result.status).toBe('complete');
    expect(result.data?.programs[0].localTags[0].defaultData?.[0].values).toEqual([
      { kind: 'atomic', value: 'A & B' }, { kind: 'atomic', value: 'attribute' }, { kind: 'atomic' },
    ]);
  });

  it.each(['33', '34', '35'])('retains text-only v%s decorated siblings in tags and local defaults', (version) => {
    const values = '<DataValue>42</DataValue><Array DataType="DINT" Dimensions="1"><Element Index="[0]" Value="1" /></Array>';
    const source = `<RSLogix5000Content SchemaRevision="1.0" SoftwareRevision="${version}.01" TargetName="Test" TargetType="Controller" ContainsContext="false"><Controller Use="Target" Name="Test"><Tags><Tag Name="X" TagType="Base" DataType="DINT"><Data Format="Decorated">${values}</Data></Tag></Tags><Programs><Program Name="P"><LocalTags><LocalTag Name="X" DataType="DINT"><DefaultData Format="Decorated">${values}</DefaultData></LocalTag></LocalTags></Program></Programs></Controller></RSLogix5000Content>`;
    const result = parsePublicString(source, 'l5x');
    const document = parsePublicDocumentString(source, 'l5x');
    expect(result.status).toBe('complete');
    expect(document.status).toBe('complete');
    const expected = [
      { kind: 'atomic', value: '42' },
      { kind: 'array', dataType: 'DINT', dimensions: [1], elements: [{ index: [0], value: '1', structures: [] }] },
    ];
    expect(result.data?.tags[0].data?.[0].values).toEqual(expected);
    expect(result.data?.programs[0].localTags[0].defaultData?.[0].values).toEqual(expected);
    expect(document.data?.resources.find((resource) => resource.kind === 'program')?.data.localTags[0].defaultData?.[0].values)
      .toEqual(expected);
    const removed = parsePublicString(source.replaceAll('<DataValue>42</DataValue>', ''), 'l5x');
    expect(removed.status).toBe('complete');
    expect(diffControllers(result.data!, removed.data!).summary.tags.modified).toBe(2);
    const changed = parsePublicString(source.replaceAll('>42<', '>43<'), 'l5x');
    expect(diffControllers(result.data!, changed.data!).summary.tags.modified).toBe(2);
  });

  it.each(['33', '34', '35'])('retains v%s local default order without any Structure node', (version) => {
    const array = '<Array DataType="DINT" Dimensions="1"><Element Index="[0]" Value="2" /></Array>';
    const atomic = '<DataValue DataType="DINT" Value="1" />';
    const source = read(`program-local-tags-v${version}`).replace(/<LocalTags>[\s\S]*?<\/LocalTags>/,
      `<LocalTags><LocalTag Name="X" DataType="DINT"><DefaultData Format="Decorated">${array}${atomic}</DefaultData></LocalTag></LocalTags>`);
    expect(source).not.toContain('<Structure');
    const before = parsePublicString(source, 'l5x');
    const document = parsePublicDocumentString(source, 'l5x');
    const after = parsePublicString(source.replace(array + atomic, atomic + array), 'l5x');
    expect(before.status).toBe('complete');
    expect(document.status).toBe('complete');
    expect(after.status).toBe('complete');
    const values = [
      { kind: 'array', dataType: 'DINT', dimensions: [1], elements: [{ index: [0], value: '2', structures: [] }] },
      { kind: 'atomic', dataType: 'DINT', value: '1' },
    ];
    expect(before.data?.programs[0].localTags[0].defaultData?.[0].values).toEqual(values);
    expect(document.data?.resources.find((resource) => resource.kind === 'program')?.data.localTags[0].defaultData?.[0].values)
      .toEqual(values);
    expect(diffControllers(before.data!, after.data!).summary.tags.modified).toBe(1);
  });

  it.each(['33', '34', '35'])('retains interleaved v%s local default values and detects order edits', (version) => {
    const array = '<Array DataType="DINT" Dimensions="1"><Element Index="[0]" Value="2" /></Array>';
    const atomic = '<DataValue DataType="DINT" Value="1" />';
    const source = read(`program-local-tags-v${version}`).replace(/<LocalTags>[\s\S]*?<\/LocalTags>/,
      `<LocalTags><LocalTag Name="X" DataType="DINT"><DefaultData Format="Decorated">${array}${atomic}<DataValue />${array}<Structure /><AlarmAnalogParameters /><AlarmDigitalParameters /><AlarmConfig /></DefaultData></LocalTag></LocalTags>`);
    const controller = parsePublicString(source, 'l5x');
    const document = parsePublicDocumentString(source, 'l5x');
    expect(controller.status).toBe('complete');
    expect(document.status).toBe('complete');
    const local = controller.data!.programs[0].localTags[0];
    const expectedArray = { kind: 'array', dataType: 'DINT', dimensions: [1], elements: [{ index: [0], value: '2', structures: [] }] };
    expect(local.defaultData?.[0].values).toEqual([
      expectedArray, { kind: 'atomic', dataType: 'DINT', value: '1' }, { kind: 'atomic' }, expectedArray,
      { kind: 'structure', members: [] }, { kind: 'alarm', alarmType: 'analog', parameters: {} },
      { kind: 'alarm', alarmType: 'digital', parameters: {} }, { kind: 'alarm', alarmType: 'config', parameters: {} },
    ]);
    expect(document.data?.resources.find((resource) => resource.kind === 'program')?.data.localTags[0]).toEqual(local);
    const changed = parsePublicString(source.replace(array + atomic, atomic + array), 'l5x');
    expect(changed.status).toBe('complete');
    const diff = diffControllers(controller.data!, changed.data!);
    expect(diff.summary.tags.modified).toBe(1);
    expect(diff.programs[0].localTagDiffs?.[0].propertyChanges).toEqual([
      expect.objectContaining({ property: 'defaultData' }),
    ]);
  });

  it.each(['33', '34', '35'])('preserves repeated v%s metadata containers and detects edits', (version) => {
    const source = read(`program-local-tags-v${version}`)
      .replace('</Comments>', '</Comments><Comments /><Comments><Comment Operand="[0]"><![CDATA[Second comment]]></Comment><Comment Operand="[1]"><![CDATA[Third comment]]></Comment></Comments>')
      .replace('</Description>', '</Description><Description><![CDATA[Second description]]></Description>');
    const controller = parsePublicString(source, 'l5x');
    const document = parsePublicDocumentString(source, 'l5x');
    expect(controller.status).toBe('complete');
    expect(document.status).toBe('complete');
    const local = controller.data?.programs[0].localTags[0];
    expect(local?.description).toBe('Hidden local\nSecond description');
    expect(local?.comments?.map((comment) => comment.text)).toEqual([
      'Initial value', 'Second comment', 'Third comment',
    ]);
    expect(document.data?.resources.find((resource) => resource.kind === 'program')?.data.localTags[0])
      .toEqual(local);
    for (const [text, property] of [
      ['Second comment', 'comments'], ['Third comment', 'comments'], ['Second description', 'description'],
    ]) {
      const changed = parsePublicString(source.replace(text, 'Updated metadata'), 'l5x');
      expect(changed.status).toBe('complete');
      const diff = diffControllers(controller.data!, changed.data!);
      expect(diff.programs[0].localTagDiffs?.[0].propertyChanges).toContainEqual(
        expect.objectContaining({ property }),
      );
      expect(diff.summary.tags.modified).toBe(1);
    }
  });

  it.each(['33', '34', '35'])('preserves exact v%s LINT defaults through both public APIs', (version) => {
    const source = read(`program-local-tags-v${version}`)
      .replace('DataType="DINT"', 'DataType="LINT"')
      .replace('<![CDATA[7]]>', '<![CDATA[9007199254740993]]>')
      .replace('DataType="DINT" Radix="Decimal" Value="7"',
        'DataType="LINT" Radix="Decimal" Value="9007199254740993"');
    const controller = parsePublicString(source, 'l5x');
    const document = parsePublicDocumentString(source, 'l5x');
    expect(controller.status).toBe('complete');
    expect(document.status).toBe('complete');
    expect(controller.data?.programs[0].localTags[0].defaultValue).toBe('9007199254740993');
    expect(document.data?.resources.find((resource) => resource.kind === 'program')?.data.localTags[0].defaultValue)
      .toBe('9007199254740993');
  });

  it.each([
    ['9007199254740991', 9007199254740991, 'LINT'],
    ['-9007199254740991', -9007199254740991, 'LINT'],
    ['9223372036854775807', '9223372036854775807', 'LINT'],
    ['-9223372036854775808', '-9223372036854775808', 'LINT'],
    ['12.5', 12.5, 'REAL'],
  ] as const)('keeps scalar %s exact in either default representation', (value, expected, dataType) => {
    for (const defaults of [
      `<DefaultData Format="L5K"><![CDATA[${value}]]></DefaultData>`,
      `<DefaultData Format="Decorated"><DataValue DataType="${dataType}" Value="${value}" /></DefaultData>`,
    ]) {
      const result = parsePublicString(programSource(
        `<LocalTags><LocalTag Name="Counter" DataType="${dataType}">${defaults}</LocalTag></LocalTags>`
      ), 'l5x');
      expect(result.status).toBe('complete');
      expect(result.data?.programs[0].localTags[0].defaultValue).toBe(expected);
    }
  });

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
        defaultValue: 7, defaultData: [
          { format: 'L5K', text: '7', values: [] },
          { format: 'Decorated', values: [
            { kind: 'atomic', dataType: 'DINT', radix: 'Decimal', value: '7' },
          ] },
        ],
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
        defaultData: [{ format: 'Decorated', values: [
          { kind: 'atomic', dataType: 'DINT', radix: 'Decimal', value: '7' },
        ] }],
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
      description: 'Local state', defaultData: [{ format: 'L5K', text: '7', values: [] }],
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
    const source = programSource('<LocalTags><LocalTag Name="Axis" DataType="AXIS_CIP_DRIVE"><DefaultData Format="L5K"><![CDATA[0]]></DefaultData><DefaultData Format="Decorated"><AxisParameters MotionGroup="MotionGroup1" /></DefaultData></LocalTag></LocalTags>');
    const result = parseDocumentString(source, 'l5x');
    expect(result).toMatchObject({ success: true, status: 'partial' });
    expect(result.warnings).toContainEqual(expect.objectContaining({
      code: 'UNSUPPORTED_L5X_PROGRAM_LOCAL_TAG_DATA',
      location: { path: `${programPath}/LocalTags[1]/LocalTag[1]/DefaultData[2]/AxisParameters[1]` },
    }));
    expect(result.data?.resources.find((resource) => resource.kind === 'program')?.data.localTags[0]).toMatchObject({
      name: 'Axis', defaultValue: 0, defaultData: [
        { format: 'L5K', text: '0', values: [] },
        { format: 'Decorated', values: [] },
      ],
    });
    expect(result.data?.fragments).toContainEqual(expect.objectContaining({
      path: `${programPath}/LocalTags[1]`, reason: 'source-representation',
    }));
  });

  it.each(['', '-1', '9007199254740993'])(
    'reports unrepresentable LocalTag Dimensions %j without silently manufacturing dimensions',
    (dimensions) => {
      const source = programSource(`<LocalTags><LocalTag Name="Buffer" DataType="DINT" Dimensions="${dimensions}" /></LocalTags>`);
      const result = parseDocumentString(source, 'l5x');
      expect(result).toMatchObject({ success: true, status: 'partial' });
      expect(result.warnings).toContainEqual(expect.objectContaining({
        code: 'UNSUPPORTED_L5X_PROGRAM_LOCAL_TAG_DIMENSIONS',
        location: { path: `${programPath}/LocalTags[1]/LocalTag[1]/@Dimensions` },
      }));
      const local = result.data?.resources.find((resource) => resource.kind === 'program')?.data.localTags[0];
      expect(local).not.toHaveProperty('dimensions');
      expect(result.data?.fragments).toContainEqual(expect.objectContaining({
        path: `${programPath}/LocalTags[1]`, reason: 'source-representation',
      }));
    }
  );

  it.each(['17.00', '32.00'])('keeps focused v%s parsing behavior without XSD claims', (version) => {
    const result = parseString(programSource('<LocalTags><LocalTag Name="Earlier" DataType="DINT" /></LocalTags>', version), 'l5x');
    expect(result.data?.programs[0].localTags).toEqual([
      expect.objectContaining({ name: 'Earlier', dataType: 'DINT', programName: 'FixtureProgramV35' }),
    ]);
  });
});
