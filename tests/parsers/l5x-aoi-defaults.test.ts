import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseDocumentString, parseString } from '../../src/parsers';
import { diffControllers } from '../../src/diff/diffControllers';

const fixture = (name: string) =>
  readFileSync(join(__dirname, `../fixtures/l5x/${name}.L5X`), 'utf8');

describe('AOI defaults', () => {
  it.each(['33', '34', '35'])('retains v%s parameter and local composite defaults', (version) => {
    const source = fixture(`normalization-coverage-v${version}`);
    const controller = parseString(source, 'l5x');
    const document = parseDocumentString(source, 'l5x');
    const aois = [controller.data?.aois[0], document.data?.resources.find((r) => r.kind === 'aoi')?.data];

    for (const aoi of aois) {
      expect(aoi?.parameters[0]).toMatchObject({
        name: 'ArrayDefault',
        dimensions: [2],
        defaultData: [{
          format: 'Decorated',
          values: [{ kind: 'array', dataType: 'DINT', dimensions: [2], radix: 'Decimal', elements: [
            { index: [0], value: '7', structures: [] },
            { index: [1], value: '9', structures: [] },
          ] }],
        }],
      });
      expect(aoi?.parameters[0].defaultValue).toBeUndefined();
      expect(aoi?.parameters[1]).toMatchObject({
        name: 'MixedDefault',
        defaultData: [{ format: 'Decorated', values: [
          { kind: 'atomic', dataType: 'DINT', value: '1' },
          { kind: 'array', dataType: 'DINT', dimensions: [2], elements: [
            { index: [1], value: '9', structures: [] },
            { index: [0], value: '7', structures: [] },
          ] },
          { kind: 'atomic', dataType: 'DINT', value: '3' },
        ] }],
      });
      expect(aoi?.parameters[1].defaultValue).toBeUndefined();
      expect(aoi?.localTags[0]).toMatchObject({
        name: 'Matrix', dimensions: [2, 3],
        defaultData: [{ format: 'Decorated', values: [{
          kind: 'array', dataType: 'DINT', dimensions: [2, 3], elements: [
            { index: [0, 0], value: '1', structures: [] },
            { index: [1, 2], value: '6', structures: [] },
          ],
        }] }],
      });
      expect(aoi?.localTags[1].defaultData?.[0].values[0]).toMatchObject({
        kind: 'structure', dataType: 'Pair', members: [
          { kind: 'atomic', name: 'Left', value: '3' },
          ...(version === '35' ? [
            { kind: 'array', name: 'Samples', dimensions: [2], elements: [
              { index: [1], value: '9' }, { index: [0], value: '7' },
            ] },
            { kind: 'structure', name: 'Meta', members: [{ kind: 'atomic', name: 'Ready', value: '1' }] },
          ] : []),
          { kind: 'atomic', name: 'Right', value: '4' },
        ],
      });
    }
    expect(controller.warnings?.filter((warning) => warning.code === 'UNNORMALIZED_L5X_AOI_DEFAULT_DATA')).toEqual([]);
    expect(document.warnings?.filter((warning) => warning.code === 'UNNORMALIZED_L5X_AOI_DEFAULT_DATA')).toEqual([]);
    expect(controller.warnings?.filter((warning) => warning.code === 'UNNORMALIZED_L5X_AOI_LOCAL_TAG_DIMENSIONS')).toEqual([]);
  });

  it('retains sanitized v17 export arrays, structures, and array elements with structures', () => {
    const source = fixture('aoi-defaults-v17');
    const controller = parseString(source, 'l5x');
    const document = parseDocumentString(source, 'l5x');
    expect(controller).toMatchObject({ success: true, status: 'partial' });
    expect(document).toMatchObject({ success: true, status: 'partial' });
    const aoi = controller.data?.aois[0];
    expect(aoi?.parameters[0]).toMatchObject({ name: 'Input', defaultValue: 5,
      defaultData: [{ format: 'L5K', text: '5', values: [] }] });
    expect(aoi?.localTags[0]).toMatchObject({ name: 'CurrentTS', dimensions: [2], defaultData: [
      { text: '00 00 00 00 00 00 00 00', values: [] },
      { format: 'Decorated', values: [{ kind: 'array', dimensions: [2], elements: [
        { index: [0], value: '0' }, { index: [1], value: '0' },
      ] }] },
    ] });
    expect(aoi?.localTags[1].defaultData?.[1].values[0]).toMatchObject({
      kind: 'structure', members: [
        { kind: 'atomic', name: 'EnableIn', value: '1' },
        { kind: 'atomic', name: 'In', value: '0.0' },
        { kind: 'atomic', name: 'InFault', value: '0' },
      ],
    });
    expect(aoi?.localTags[2].defaultData?.[1].values[0]).toMatchObject({
      kind: 'array', dimensions: [10], elements: [{ index: [0], structures: [{
        kind: 'structure', members: [
          { kind: 'atomic', name: 'FLAGS', value: '0' },
          { kind: 'atomic', name: 'EN', value: '0' },
        ],
      }] }],
    });
    expect(controller.warnings?.filter((warning) => warning.code === 'UNSUPPORTED_L5X_AOI_DEFAULT_DATA')).toHaveLength(3);
    expect(document.data?.fragments).toContainEqual(expect.objectContaining({
      path: expect.stringMatching(/\/LocalTags\[1\]$/),
      reason: 'source-representation',
      value: expect.objectContaining({ LocalTag: expect.arrayContaining([
        expect.objectContaining({ DefaultData: expect.arrayContaining(['00 00 00 00 00 00 00 00']) }),
      ]) }),
    }));
  });

  it('prefers decorated scalar values to L5K text and retains both encodings', () => {
    const source = fixture('aoi-v35')
      .replace('<![CDATA[0]]></DefaultData>', '<![CDATA[2]]></DefaultData><DefaultData Format="Decorated"><DataValue DataType="BOOL" Value="9" /></DefaultData>')
      .replace('<![CDATA[1]]></DefaultData>', '3</DefaultData><DefaultData Format="Decorated"><DataValue DataType="BOOL" Value="8" /></DefaultData>');
    const result = parseString(source, 'l5x');
    expect(result).toMatchObject({ success: true, status: 'complete' });
    expect(result.data?.aois[0].parameters.find((p) => p.name === 'In')).toMatchObject({
      defaultValue: 9, defaultData: [
        { format: 'L5K', text: '2', values: [] },
        { format: 'Decorated', values: [{ kind: 'atomic', value: '9' }] },
      ],
    });
    expect(result.data?.aois[0].localTags[0]).toMatchObject({
      defaultValue: 8, defaultData: [
        { format: 'L5K', text: '3', values: [] },
        { format: 'Decorated', values: [{ kind: 'atomic', value: '8' }] },
      ],
    });
    const tagSource = fixture('tag-values-v35').replace('<![CDATA[10]]></Data>', '<![CDATA[2]]></Data>');
    expect(parseString(tagSource, 'l5x').data?.tags.find((tag) => tag.name === 'ConstantCounter')?.value).toBe(10);
  });

  it('keeps missing defaults absent and reads String CDATA without inventing a number', () => {
    const source = fixture('aoi-v35')
      .replace('<DefaultData Format="L5K"><![CDATA[0]]></DefaultData>', '<DefaultData Format="String"><![CDATA[\'abc\']]></DefaultData>')
      .replace('<DefaultData Format="L5K"><![CDATA[1]]></DefaultData>', '<DefaultData Format="Decorated"><DataValue DataType="BOOL" Value="" /></DefaultData>');
    const result = parseString(source, 'l5x');
    expect(result).toMatchObject({ success: true, status: 'complete' });
    expect(result.data?.aois[0].parameters.find((p) => p.name === 'EnableIn')?.defaultData).toBeUndefined();
    expect(result.data?.aois[0].parameters.find((p) => p.name === 'In')).toMatchObject({
      defaultData: [{ format: 'String', text: "'abc'", values: [] }], defaultValue: "'abc'",
    });
    expect(result.data?.aois[0].localTags[0].defaultValue).toBe('');
  });

  it('reports dimensions that cannot be represented as integer extents', () => {
    const source = fixture('normalization-coverage-v35').replace('Name="Matrix" DataType="DINT" Dimensions="2,3"', 'Name="Matrix" DataType="DINT" Dimensions="2,x"');
    const result = parseString(source, 'l5x');
    expect(result).toMatchObject({ success: true, status: 'partial' });
    expect(result.data?.aois[0].localTags[0].dimensions).toEqual([]);
    expect(result.warnings).toContainEqual(expect.objectContaining({
      code: 'UNNORMALIZED_L5X_AOI_LOCAL_TAG_DIMENSIONS',
      location: { path: '/RSLogix5000Content/Controller[1]/AddOnInstructionDefinitions[1]/AddOnInstructionDefinition[1]/LocalTags[1]/LocalTag[1]/@Dimensions' },
    }));
  });

  it.each([
    {
      name: 'parameter dimensions',
      before: 'Name="ArrayDefault" TagType="Base" DataType="DINT" Dimensions="2"',
      after: 'Name="ArrayDefault" TagType="Base" DataType="DINT" Dimensions="2,x"',
      code: 'UNNORMALIZED_L5X_AOI_PARAMETER_DIMENSIONS',
      path: '/Parameters[1]/Parameter[1]/@Dimensions',
    },
    {
      name: 'decorated array dimensions',
      before: '<Array DataType="DINT" Dimensions="2" Radix="Decimal">',
      after: '<Array DataType="DINT" Dimensions="2,x" Radix="Decimal">',
      code: 'UNNORMALIZED_L5X_AOI_DEFAULT_DATA',
      path: '/Parameters[1]/Parameter[1]/DefaultData[1]/Array[1]/@Dimensions',
    },
    {
      name: 'decorated array element index',
      before: '<Element Index="[0]" Value="7" />',
      after: '<Element Index="[x]" Value="7" />',
      code: 'UNNORMALIZED_L5X_AOI_DEFAULT_DATA',
      path: '/Parameters[1]/Parameter[1]/DefaultData[1]/Array[1]/Element[1]/@Index',
    },
    {
      name: 'missing decorated array element index',
      before: '<Element Index="[0]" Value="7" />',
      after: '<Element Value="7" />',
      code: 'UNNORMALIZED_L5X_AOI_DEFAULT_DATA',
      path: '/Parameters[1]/Parameter[1]/DefaultData[1]/Array[1]/Element[1]',
    },
    {
      name: 'nested array member dimensions',
      before: '<ArrayMember Name="Samples" DataType="DINT" Dimensions="2" Radix="Decimal">',
      after: '<ArrayMember Name="Samples" DataType="DINT" Dimensions="2,x" Radix="Decimal">',
      code: 'UNNORMALIZED_L5X_AOI_DEFAULT_DATA',
      path: '/LocalTags[1]/LocalTag[2]/DefaultData[1]/Structure[1]/ArrayMember[1]/@Dimensions',
    },
    {
      name: 'nested array member element index',
      before: '<ArrayMember Name="Samples" DataType="DINT" Dimensions="2" Radix="Decimal"><Element Index="[1]"',
      after: '<ArrayMember Name="Samples" DataType="DINT" Dimensions="2" Radix="Decimal"><Element Index="[x]"',
      code: 'UNNORMALIZED_L5X_AOI_DEFAULT_DATA',
      path: '/LocalTags[1]/LocalTag[2]/DefaultData[1]/Structure[1]/ArrayMember[1]/Element[1]/@Index',
    },
  ])('reports unrepresentable $name without claiming complete coverage', ({ before, after, code, path }) => {
    const base = fixture('normalization-coverage-v35').replace(/<Programs>[\s\S]*?<\/Programs>/, '');
    expect(base).toContain(before);
    const source = base.replace(before, after);
    expect(source).toContain(after);
    const controller = parseString(source, 'l5x');
    const document = parseDocumentString(source, 'l5x');
    const aoiPath = '/RSLogix5000Content/Controller[1]/AddOnInstructionDefinitions[1]/AddOnInstructionDefinition[1]';
    const expectedPath = aoiPath + path;

    for (const result of [controller, document]) {
      expect(result).toMatchObject({ success: true, status: 'partial' });
      expect(result.warnings).toContainEqual(expect.objectContaining({
        code,
        location: { path: expectedPath },
      }));
    }
    const collectionPath = aoiPath + (path.startsWith('/Parameters') ? '/Parameters[1]' : '/LocalTags[1]');
    const original = document.data?.fragments.find(({ path: fragmentPath }) => fragmentPath === collectionPath);
    expect(original).toBeDefined();
    expect(JSON.stringify(original?.value)).toContain(
      after.includes('2,x') ? '2,x' : after.includes('[x]') ? '[x]' : '"@_Value":"7"'
    );
  });

  it('keeps raw and unsupported data inspectable with precise partial warnings', () => {
    const source = fixture('aoi-v35')
      .replace('<DefaultData Format="L5K"><![CDATA[0]]></DefaultData>', '<DefaultData Format="Opaque">hidden</DefaultData>')
      .replace('<DefaultData Format="L5K"><![CDATA[1]]></DefaultData>', '<DefaultData>00 00 00 00</DefaultData><DefaultData Format="Decorated"><AxisParameters MotionGroup="MotionGroup1" /></DefaultData>');
    const result = parseDocumentString(source, 'l5x');
    expect(result).toMatchObject({ success: true, status: 'partial' });
    const aoi = result.data?.resources.find((r) => r.kind === 'aoi')?.data;
    expect(aoi?.parameters.find((p) => p.name === 'In')?.defaultData).toMatchObject([{ format: 'Opaque', text: 'hidden', values: [] }]);
    expect(aoi?.localTags[0].defaultData).toMatchObject([
      { text: '00 00 00 00', values: [] },
      { format: 'Decorated', values: [] },
    ]);
    expect(result.warnings?.filter((warning) => warning.code === 'UNSUPPORTED_L5X_AOI_DEFAULT_DATA').map((warning) => warning.location?.path)).toEqual([
      '/RSLogix5000Content/Controller[1]/AddOnInstructionDefinitions[1]/AddOnInstructionDefinition[1]/Parameters[1]/Parameter[2]/DefaultData[1]/@Format',
      '/RSLogix5000Content/Controller[1]/AddOnInstructionDefinitions[1]/AddOnInstructionDefinition[1]/LocalTags[1]/LocalTag[1]/DefaultData[1]',
      '/RSLogix5000Content/Controller[1]/AddOnInstructionDefinitions[1]/AddOnInstructionDefinition[1]/LocalTags[1]/LocalTag[1]/DefaultData[2]/AxisParameters[1]',
    ]);
  });

  it('reports changed exported AOI parameter and local composite defaults in controller comparisons', () => {
    const oldSource = fixture('normalization-coverage-v35');
    const newSource = oldSource
      .replace('<Element Index="[1]" Value="9" /><Element Index="[0]" Value="7" />', '<Element Index="[1]" Value="10" /><Element Index="[0]" Value="7" />')
      .replace('<Element Index="[1,2]" Value="6" />', '<Element Index="[1,2]" Value="8" />');
    const oldController = parseString(oldSource, 'l5x').data;
    const newController = parseString(newSource, 'l5x').data;
    expect(oldController).toBeDefined();
    expect(newController).toBeDefined();

    const diff = diffControllers(oldController!, newController!);
    expect(diff.aois).toHaveLength(1);
    expect(diff.aois[0]).toMatchObject({
      name: 'CoverageAOI', kind: 'modified',
      parameterSummary: { added: 0, removed: 0, modified: 1 },
      localTagSummary: { added: 0, removed: 0, modified: 1 },
    });
  });
});
