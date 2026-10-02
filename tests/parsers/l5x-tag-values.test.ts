import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseString } from '../../src/parsers';
import { L5XParser } from '../../src/parsers/l5x';

const fixtureDirectory = join(__dirname, '../fixtures/l5x');
const versions = [
  ['33', '33.00'],
  ['34', '34.01'],
  ['35', '35.01'],
] as const;

function fixture(name: string): string {
  return readFileSync(join(fixtureDirectory, name), 'utf-8');
}

describe('L5X complete tag normalization', () => {
  it.each(versions)('normalizes the v%s golden tag fixture (%s)', (version) => {
    const result = parseString(fixture(`tag-values-v${version}.L5X`), 'l5x');

    expect(result.success).toBe(true);
    expect(result.status).toBe('complete');
    expect(result.warnings?.find((warning) => warning.code === 'UNSUPPORTED_L5X_TAG_ENCODING'))
      .toBeUndefined();

    const controller = result.data!;
    const scalar = controller.tags.find((tag) => tag.name === 'ConstantCounter')!;
    expect(scalar).toMatchObject({
      tagType: 'Base',
      dataType: 'DINT',
      radix: 'Decimal',
      dimensions: [],
      constant: true,
      canForce: true,
      externalAccess: 'ReadOnly',
      scope: 'Controller',
      description: 'Constant counter',
      value: 10,
    });
    expect(scalar.comments).toEqual([
      {
        operand: '.PRE',
        text: 'Preset & comment',
        values: ['Preset & comment'],
        localizedTexts: [],
      },
      {
        operand: '.ACC',
        unused: false,
        values: [],
        localizedTexts: [{ language: 'en-US', text: 'Accumulated value' }],
      },
      {
        operand: '.Description',
        text: 'First line',
        values: ['First line', 'Second line'],
        localizedTexts: [],
      },
    ]);
    expect(scalar.forceData).toEqual([{ format: 'L5K', value: '11' }]);
    expect(scalar.data).toEqual([
      { format: 'L5K', text: '10', values: [] },
      {
        format: 'Decorated',
        values: [
          {
            kind: 'atomic',
            dataType: 'DINT',
            radix: 'Decimal',
            value: '10',
            forceValue: '11',
          },
        ],
      },
    ]);

    const stringValue = controller.tags.find((tag) => tag.name === 'StringValue')!;
    expect(stringValue.data).toEqual([
      { format: 'L5K', text: "[4,'0042']", values: [] },
      { format: 'String', length: 4, text: "'0042'", values: [] },
    ]);

    const matrix = controller.tags.find((tag) => tag.name === 'Matrix')!;
    expect(matrix.dimensions).toEqual([2, 2]);
    expect(matrix.value).toBe('[[1,2],[3,4]]');
    expect(matrix.data).toEqual([
      { format: 'L5K', text: '[[1,2],[3,4]]', values: [] },
      {
        format: 'Decorated',
        values: [
          {
            kind: 'array',
            dataType: 'DINT',
            dimensions: [2, 2],
            radix: 'Decimal',
            elements: [
              { index: [0, 0], value: '1', structures: [] },
              { index: [0, 1], value: '2', structures: [] },
              { index: [1, 0], value: '3', forceValue: '30', structures: [] },
              { index: [1, 1], value: '4', structures: [] },
            ],
          },
        ],
      },
    ]);

    const recipe = controller.tags.find((tag) => tag.name === 'Recipe')!;
    expect(recipe.value).toBe('[[[3,4],1],2]');
    expect(recipe.data?.[0]).toEqual({ format: 'L5K', text: '[[[3,4],1],2]', values: [] });
    expect(recipe.comments).toEqual([
      {
        operand: '.Count',
        text: 'Recipe count',
        values: ['Recipe count'],
        localizedTexts: [],
      },
      {
        operand: '.Nested.Enabled',
        text: 'Nested enabled flag',
        values: ['Nested enabled flag'],
        localizedTexts: [],
      },
      {
        operand: '.Nested.Steps[1]',
        text: 'Second recipe step',
        values: ['Second recipe step'],
        localizedTexts: [],
      },
    ]);
    expect(recipe.data?.[1].values).toEqual([
      {
        kind: 'structure',
        dataType: 'RecipeType',
        members: [
          {
            kind: 'structure',
            name: 'Nested',
            dataType: 'NestedType',
            members: [
              {
                kind: 'array',
                name: 'Steps',
                dataType: 'DINT',
                dimensions: [2],
                radix: 'Decimal',
                elements: [
                  { index: [0], value: '3', structures: [] },
                  { index: [1], value: '4', forceValue: '5', structures: [] },
                ],
              },
              {
                kind: 'atomic',
                name: 'Enabled',
                dataType: 'BOOL',
                radix: 'Decimal',
                value: '1',
              },
            ],
          },
          {
            kind: 'atomic',
            name: 'Count',
            dataType: 'DINT',
            radix: 'Decimal',
            value: '2',
          },
        ],
      },
    ]);

    const digitalAlarm = controller.tags.find((tag) => tag.name === 'DigitalAlarm')!;
    expect(digitalAlarm.data?.[0].format).toBe('Alarm');
    expect(digitalAlarm.data?.[0].values).toEqual([
      {
        kind: 'alarm',
        alarmType: 'digital',
        parameters: {
          EnableIn: '1',
          In: '0',
          Condition: '1',
          AckRequired: '1',
          Latched: '0',
          Severity: '750',
        },
      },
      {
        kind: 'alarm',
        alarmType: 'config',
        parameters: {},
        alarmClass: 'Process',
        hmiCommand: 'ShowAlarm',
        messages: [
          { type: 'Condition', id: 1, language: 'en-US', text: 'Motor & trip' },
        ],
      },
    ]);

    const analogAlarm = controller.tags.find((tag) => tag.name === 'AnalogAlarm')!;
    expect(analogAlarm.data?.[0].format).toBe('Alarm');
    expect(analogAlarm.data?.[0].values).toEqual([
      {
        kind: 'alarm',
        alarmType: 'analog',
        parameters: {
          EnableIn: 'true',
          In: '12.5',
          HHEnabled: '1',
          HHLimit: '100',
          HHSeverity: '900',
        },
      },
    ]);

    expect(controller.programs[0].tags[0]).toMatchObject({
      name: 'ProgramFlag',
      scope: 'Program',
      programName: 'TagProgram',
      externalAccess: 'None',
      dimensions: [],
    });
  });

  it('leaves the tag value shortcut absent for a Decorated-only array', () => {
    const source = fixture('tag-values-v35.L5X')
      .replace('<Data Format="L5K"><![CDATA[[[1,2],[3,4]]]]></Data>', '');
    const result = parseString(source, 'l5x');
    expect(result.success).toBe(true);
    const matrix = result.data?.tags.find((tag) => tag.name === 'Matrix');
    expect(matrix?.value).toBeUndefined();
    expect(matrix?.data[0].values[0]).toMatchObject({ kind: 'array', dimensions: [2, 2] });
  });

  it.each(versions)('marks schema-valid unsupported v%s tag encodings partial (%s)', (version) => {
    const source = fixture(`tag-unsupported-v${version}.L5X`);
    const result = new L5XParser().parseDocument(source);

    expect(result.success).toBe(true);
    expect(result.status).toBe('partial');
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: 'UNSUPPORTED_L5X_TAG_ENCODING',
        location: {
          path: '/RSLogix5000Content/Controller[1]/Tags[1]/Tag[1]/Data[1]/@Format',
        },
      })
    );
    expect(result.data?.fragments).toContainEqual(
      expect.objectContaining({
        path: '/RSLogix5000Content/Controller[1]/Tags[1]/Tag[1]/Data[1]',
        reason: 'source-representation',
      })
    );
    const tag = result.data?.resources.find((resource) => resource.kind === 'tag');
    expect(tag?.data.data).toEqual([
      { format: 'VendorBinary', text: 'AQIDBA==', values: [] },
    ]);
  });

  it.each(versions)('marks unnormalized standard v%s tag metadata partial (%s)', (version) => {
    const result = new L5XParser().parseDocument(fixture(`tag-metadata-v${version}.L5X`));

    expect(result.success).toBe(true);
    expect(result.status).toBe('partial');
    expect(result.data?.fragments).toContainEqual(
      expect.objectContaining({
        path: '/RSLogix5000Content/Controller[1]/Tags[1]/Tag[1]/@Class',
        reason: 'source-representation',
        value: 'Standard',
      })
    );
  });

  it('represents absent optional tag data without invented defaults', () => {
    const result = parseString(fixture('tags-v33.L5X'), 'l5x');
    const alias = result.data?.tags.find((tag) => tag.name === 'Done');

    expect(result).toMatchObject({ success: true, status: 'complete' });
    expect(alias).toMatchObject({
      name: 'Done',
      tagType: 'Alias',
      dataType: 'BOOL',
      dimensions: [],
      scope: 'Controller',
      aliasFor: 'Counter.0',
      comments: [],
      forceData: [],
      data: [],
    });
    expect(alias?.externalAccess).toBeUndefined();
    expect(alias?.constant).toBeUndefined();
    expect(alias?.canForce).toBeUndefined();
    expect(alias?.value).toBeUndefined();
  });

  it('keeps normalized tag resource ownership and scope aligned', () => {
    const result = new L5XParser().parseDocument(fixture('tag-values-v35.L5X'));
    expect(result.success).toBe(true);

    const controllerTag = result.data?.resources.find(
      (resource) => resource.kind === 'tag' && resource.data.name === 'ConstantCounter'
    );
    const programTag = result.data?.resources.find(
      (resource) => resource.kind === 'tag' && resource.data.name === 'ProgramFlag'
    );
    const program = result.data?.resources.find(
      (resource) => resource.kind === 'program' && resource.data.name === 'TagProgram'
    );

    expect(controllerTag?.data).toMatchObject({ scope: 'Controller' });
    expect(programTag?.data).toMatchObject({ scope: 'Program', programName: 'TagProgram' });
    expect(controllerTag?.ownerId).toMatch(/Controller\[1\]$/);
    expect(programTag?.ownerId).toBe(program?.id);
  });
});
