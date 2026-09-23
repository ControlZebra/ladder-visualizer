import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildFBDSheetLayout } from '../../src/layout';
import { parseString } from '../../src/parsers';
import * as l5xPublic from '../../src/parsers/l5x';
import { FBD_INSTRUCTION_METADATA } from '../../src/parsers/l5x';

const fixtureDirectory = join(__dirname, '../fixtures/l5x');
const read = (name: string) => readFileSync(join(fixtureDirectory, `${name}.L5X`), 'utf8');

function routine(source: string, name = 'LevelControl') {
  const result = parseString(source, 'l5x');
  expect(result.success).toBe(true);
  return {
    result,
    routine: result.data?.programs[0]?.routines.find((candidate) => candidate.name === name),
  };
}

function functionSource(options: {
  processorType: string;
  softwareRevision?: string;
  mnemonic?: string;
}) {
  const source = read('fbd-v35')
    .replace(
      'SoftwareRevision="35.01"',
      `SoftwareRevision="${options.softwareRevision ?? '35.01'}"`
    )
    .replace(
      '<Controller Use="Context" Name="FixtureController">',
      `<Controller Use="Context" Name="FixtureController" ProcessorType="${options.processorType}">`
    )
    .replace(
      /<Sheet Number="1">[\s\S]*<\/Sheet>/,
      `<Sheet Number="1"><Function Type="${options.mnemonic ?? 'ADD'}" ID="10" X="80" Y="40" /></Sheet>`
    );
  return routine(source, 'FBDLogic');
}

function member(name: string | undefined, dataType = 'BOOL'): string {
  return `<DataValueMember${name === undefined ? '' : ` Name="${name}"`} DataType="${dataType}" Value="0" />`;
}

function structureTag(name: string, members: string[], dataType = 'FBD_TEST'): string {
  return `<Tag Name="${name}" TagType="Base" DataType="${dataType}"><Data Format="Decorated"><Structure DataType="${dataType}">${members.join('')}</Structure></Data></Tag>`;
}

const validMembers = [
  member('EnableIn'),
  member('InA', 'REAL'),
  member('InB', 'DINT'),
  member('EnableOut'),
  member('OutA', 'REAL'),
  member('OutB', 'DINT'),
];

const validTag = structureTag('BLOCK_01', validMembers);

function blockProgram(options: {
  blocks: string;
  programTags?: string;
  controllerTags?: string;
  softwareRevision?: string;
}): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<RSLogix5000Content SchemaRevision="1.0" SoftwareRevision="${options.softwareRevision ?? '35.01'}" TargetName="GenericBlocks" TargetType="Program" ContainsContext="true" ExportOptions="References NoRawData L5KData DecoratedData Context">
  <Controller Use="Context" Name="FixtureController" ProcessorType="1756-L85E">
    ${options.controllerTags ? `<Tags>${options.controllerTags}</Tags>` : ''}
    <Programs>
      <Program Name="GenericBlocks">
        ${options.programTags ? `<Tags>${options.programTags}</Tags>` : ''}
        <Routines><Routine Name="Logic" Type="FBD"><FBDContent SheetSize="Tabloid - 11 x 17 in" SheetOrientation="Landscape"><Sheet Number="1">${options.blocks}</Sheet></FBDContent></Routine></Routines>
      </Program>
    </Programs>
  </Controller>
</RSLogix5000Content>`;
}

function parsedElements(source: string) {
  const result = parseString(source, 'l5x');
  expect(result.success).toBe(true);
  return {
    result,
    body: result.data?.programs[0]?.routines.find((candidate) => candidate.name === 'Logic')?.fbd,
  };
}

describe('generic FBD Block port inference', () => {
  it('publishes Function-only built-in metadata while preserving the deprecated catalog alias', () => {
    const functionMetadata = Reflect.get(l5xPublic, 'FBD_FUNCTION_METADATA');
    const functionResolver = Reflect.get(l5xPublic, 'resolveBuiltInFBDFunctionMetadata');

    expect(functionMetadata).toBe(FBD_INSTRUCTION_METADATA);
    expect(typeof functionResolver).toBe('function');
    expect(FBD_INSTRUCTION_METADATA.map((entry) => [entry.mnemonic, entry.forms])).toEqual([
      ['ADD', ['function']],
      ['MUL', ['function']],
      ['SUB', ['function']],
      ['GRT', ['function']],
    ]);
  });

  it.each([33, 34, 35])(
    'infers catalog-independent Program Block ports from decorated structures in v%i',
    (major) => {
      const { result, routine: parsed } = routine(read(`fbd-port-metadata-v${major}`));
      const blocks = parsed?.fbd?.sheets[0]?.elements.filter((element) => element.kind === 'block');

      expect(result.status).toBe('complete');
      expect(blocks?.map((block) => block.instruction)).toEqual([
        'ADD',
        'DEDT',
        'HLL',
        'LDLG',
        'MUL',
        'PIDE',
        'SUB',
        'D2SD',
        'GRT',
        'BAND',
        'BOR',
        'AND',
      ]);
      expect(blocks?.map((block) => block.ports.map((port) => port.id))).toEqual([
        ['SourceA', 'SourceB', 'Dest'],
        ['In', 'Out'],
        ['In', 'Out', 'HighAlarm', 'LowAlarm'],
        ['In', 'Out'],
        ['SourceA', 'Dest'],
        [
          'PV',
          'SPProg',
          'SPCascade',
          'RatioProg',
          'CVProg',
          'FF',
          'HandFB',
          'ProgProgReq',
          'ProgOperReq',
          'ProgCasRatReq',
          'ProgAutoReq',
          'ProgManualReq',
          'ProgOverrideReq',
          'ProgHandReq',
          'CVEU',
          'SP',
          'PVHHAlarm',
          'PVHAlarm',
          'PVLAlarm',
          'PVLLAlarm',
          'PVROCPosAlarm',
          'PVROCNegAlarm',
          'DevHHAlarm',
          'DevHAlarm',
          'DevLAlarm',
          'DevLLAlarm',
          'ProgOper',
          'CasRat',
          'Auto',
          'Manual',
          'Override',
          'Hand',
        ],
        ['SourceA', 'SourceB', 'Dest'],
        [
          'ProgCommand',
          'State0Perm',
          'State1Perm',
          'FB0',
          'FB1',
          'HandFB',
          'ProgProgReq',
          'ProgOperReq',
          'ProgOverrideReq',
          'ProgHandReq',
          'Out',
          'Device0State',
          'Device1State',
          'CommandStatus',
          'FaultAlarm',
          'ModeAlarm',
          'ProgOper',
          'Override',
          'Hand',
        ],
        ['SourceA', 'SourceB', 'Dest'],
        ['In1', 'In2', 'In3', 'In4', 'Out'],
        ['In1', 'In2', 'In3', 'In4', 'Out'],
        ['SourceA', 'SourceB', 'Dest'],
      ]);
      expect(
        blocks
          ?.flatMap((block) => block.ports)
          .every(
            (port) =>
              port.label === port.id &&
              port.dataType !== undefined &&
              port.defaultVisible === undefined &&
              port.visible &&
              port.direction === (port.side === 'left' ? 'input' : 'output')
          )
      ).toBe(true);
      expect(blocks?.find((block) => block.instruction === 'DEDT')).toMatchObject({
        arrays: [{ name: 'StorageArray', operand: 'DEDT_01array' }],
        arrayRequirements: [],
      });
      expect(blocks?.find((block) => block.instruction === 'AND')?.ports).toEqual([
        expect.objectContaining({ id: 'SourceA', direction: 'input', order: 0 }),
        expect.objectContaining({ id: 'SourceB', direction: 'input', order: 1 }),
        expect.objectContaining({ id: 'Dest', direction: 'output', order: 0 }),
      ]);
    }
  );

  it('uses the same decorated-structure rule in the real-sample-compatible v17 context', () => {
    const source = read('fbd-level-control-v35')
      .replace('SoftwareRevision="35.01"', 'SoftwareRevision="17.00"')
      .replace('ProcessorType="1756-L85E"', 'ProcessorType="1756-L63"');
    const { result, routine: parsed } = routine(source, 'MainFBD');
    const sheets = parsed?.fbd?.sheets ?? [];
    const blocks = sheets
      .flatMap((sheet) => sheet.elements)
      .filter((element) => element.kind === 'block');

    expect(result.status).toBe('complete');
    expect(blocks.map((block) => block.instruction)).toEqual([
      'ADD',
      'DEDT',
      'HLL',
      'LDLG',
      'MUL',
      'PIDE',
      'SUB',
      'D2SD',
      'GRT',
    ]);
    expect(
      blocks
        .flatMap((block) => block.ports)
        .every((port) => port.label === port.id && port.dataType !== undefined)
    ).toBe(true);
    expect(sheets.map((sheet) => buildFBDSheetLayout(sheet).diagnostics)).toEqual([[], []]);
  });

  it('resolves AOI-owned Blocks from LocalTag decorated DefaultData', () => {
    const result = parseString(read('fbd-aoi-v35'), 'l5x');
    const block = result.data?.aois[0]?.routines[0]?.fbd?.sheets[0]?.elements.find(
      (element) => element.kind === 'block'
    );

    expect(result).toMatchObject({ success: true, status: 'partial' });
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: 'UNNORMALIZED_L5X_AOI_DEFAULT_DATA' })
    );
    expect(block).toMatchObject({
      kind: 'block',
      instruction: 'SRTP',
      operand: 'SRTP_01',
      ports: [
        {
          id: 'In',
          label: 'In',
          dataType: 'REAL',
          direction: 'input',
          side: 'left',
          order: 0,
          visible: true,
        },
        {
          id: 'HeatOut',
          label: 'HeatOut',
          dataType: 'BOOL',
          direction: 'output',
          side: 'right',
          order: 0,
          visible: true,
        },
        {
          id: 'CoolOut',
          label: 'CoolOut',
          dataType: 'BOOL',
          direction: 'output',
          side: 'right',
          order: 1,
          visible: true,
        },
        {
          id: 'HeatTimePercent',
          label: 'HeatTimePercent',
          dataType: 'REAL',
          direction: 'output',
          side: 'right',
          order: 2,
          visible: true,
        },
        {
          id: 'CoolTimePercent',
          label: 'CoolTimePercent',
          dataType: 'REAL',
          direction: 'output',
          side: 'right',
          order: 3,
          visible: true,
        },
      ],
    });
  });

  it('keeps connected Block ports independent from wire participation', () => {
    const { routine: parsed } = routine(read('fbd-canonical-v35'), 'FBDLogic');
    const add = parsed?.fbd?.sheets[1]?.elements.find(
      (element) => element.kind === 'block' && element.instruction === 'ADD'
    );

    expect(add).toMatchObject({
      ports: [
        {
          id: 'SourceA',
          label: 'SourceA',
          dataType: 'REAL',
          direction: 'input',
          side: 'left',
          order: 0,
        },
        {
          id: 'SourceB',
          label: 'SourceB',
          dataType: 'REAL',
          direction: 'input',
          side: 'left',
          order: 1,
        },
        {
          id: 'Dest',
          label: 'Dest',
          dataType: 'REAL',
          direction: 'output',
          side: 'right',
          order: 0,
        },
      ],
    });
  });

  it('falls back from Program tags to Controller tags without crossing unrelated scopes', () => {
    const { result, body } = parsedElements(
      blockProgram({
        controllerTags: validTag,
        blocks:
          '<Block Type="TEST" ID="1" X="20" Y="20" Operand="BLOCK_01" VisiblePins="OutB InB InA" />',
      })
    );

    expect(result.status).toBe('complete');
    expect(body?.sheets[0]?.elements[0]).toMatchObject({
      kind: 'block',
      ports: [
        { id: 'InA', direction: 'input', order: 0 },
        { id: 'InB', direction: 'input', order: 1 },
        { id: 'OutB', direction: 'output', order: 0 },
      ],
    });
  });

  it('treats structured members as direct ports without flattening their children', () => {
    const nestedTag = structureTag('BLOCK_01', [
      member('EnableIn'),
      '<StructureMember Name="Nested" DataType="INNER"><DataValueMember Name="Child" DataType="REAL" Value="0" /></StructureMember>',
      member('EnableOut'),
      member('OutA', 'REAL'),
    ]);
    const { result, body } = parsedElements(
      blockProgram({
        programTags: nestedTag,
        blocks:
          '<Block Type="TEST" ID="1" X="20" Y="20" Operand="BLOCK_01" VisiblePins="Nested OutA" />',
      })
    );

    expect(result.status).toBe('complete');
    expect(body?.sheets[0]?.elements[0]).toMatchObject({
      kind: 'block',
      ports: [
        { id: 'Nested', dataType: 'INNER', direction: 'input', order: 0 },
        { id: 'OutA', dataType: 'REAL', direction: 'output', order: 0 },
      ],
    });
  });

  it.each([17, 35])(
    'retains Function resolution through the Function-only metadata API at v%i',
    (major) => {
      const { result, routine: parsed } = functionSource({
        processorType: '1756-L85E',
        softwareRevision: `${major}.00`,
      });

      expect(result.status).toBe('complete');
      expect(parsed?.fbd?.sheets[0]?.elements).toEqual([
        expect.objectContaining({
          kind: 'function',
          instruction: 'ADD',
          id: '10',
          position: { x: '80', y: '40' },
          ports: [
            {
              id: 'SourceA',
              label: 'SourceA',
              direction: 'input',
              side: 'left',
              order: 0,
              defaultVisible: true,
              visible: true,
            },
            {
              id: 'SourceB',
              label: 'SourceB',
              direction: 'input',
              side: 'left',
              order: 1,
              defaultVisible: true,
              visible: true,
            },
            {
              id: 'Dest',
              label: 'Dest',
              direction: 'output',
              side: 'right',
              order: 0,
              defaultVisible: true,
              visible: true,
            },
          ],
        }),
      ]);
    }
  );

  it.each([
    ['1756-L75', '35.01'],
    ['1756-L85E', '16.01'],
    ['1756-L85E', '36.01'],
  ])(
    'retains Function applicability diagnostics for %s at v%s',
    (processorType, softwareRevision) => {
      const { result, routine: parsed } = functionSource({ processorType, softwareRevision });
      const element = parsed?.fbd?.sheets[0]?.elements[0];

      expect(result.status).toBe('partial');
      expect(element).toMatchObject({
        kind: 'placeholder',
        sourceKind: 'Function',
        ports: [],
        reasonCodes: ['unsupported-semantics', 'unresolved-metadata'],
      });
      expect(parsed?.fbd?.diagnostics).toContainEqual(
        expect.objectContaining({ code: 'FBD_UNSUPPORTED_INSTRUCTION_CONTEXT' })
      );
    }
  );

  it('retains AOI call-element port resolution and InOut bindings', () => {
    const { result, routine: parsed } = routine(read('fbd-aoi-ports-v35'), 'Logic');
    const aoi = parsed?.fbd?.sheets[0]?.elements[0];

    expect(result.status).toBe('complete');
    expect(aoi).toMatchObject({
      kind: 'add-on-instruction',
      name: 'ValveAOI',
      ports: [
        { id: 'Command', direction: 'input', order: 0 },
        { id: 'Feedback', direction: 'input', order: 1 },
        { id: 'Running', direction: 'output', order: 0 },
      ],
      bindings: [{ name: 'State', argument: 'ValveState' }],
    });
  });

  it('treats explicit empty VisiblePins as a valid zero-port Block and absent VisiblePins as unresolved', () => {
    const { result, body } = parsedElements(
      blockProgram({
        programTags: validTag,
        blocks: `
        <Block Type="TEST" ID="1" X="20" Y="20" Operand="BLOCK_01" />
        <Block Type="TEST" ID="2" X="20" Y="80" Operand="BLOCK_01" VisiblePins="" />`,
      })
    );

    expect(result.status).toBe('partial');
    expect(body?.sheets[0]?.elements).toEqual([
      expect.objectContaining({ kind: 'placeholder', sourceKind: 'Block' }),
      expect.objectContaining({ kind: 'block', instruction: 'TEST', visiblePins: [], ports: [] }),
    ]);
    expect(body?.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'FBD_MISSING_VISIBLE_PINS' })
    );
  });

  it('preserves declared arrays without instruction-specific required-array validation', () => {
    const { result, body } = parsedElements(
      blockProgram({
        programTags: validTag,
        blocks: `<Block Type="DEDT" ID="1" X="20" Y="20" Operand="BLOCK_01" VisiblePins="InA OutA"><Array Name="StorageArray" /></Block>`,
      })
    );
    const block = body?.sheets[0]?.elements[0];

    expect(result.status).toBe('complete');
    expect(block).toMatchObject({
      kind: 'block',
      arrays: [{ name: 'StorageArray' }],
      arrayRequirements: [],
    });
    expect(
      body?.diagnostics.some((diagnostic) => diagnostic.code === 'FBD_MISSING_REQUIRED_ARRAY')
    ).toBe(false);
  });

  it('does not borrow a decorated structure from another Tag with the same DataType', () => {
    const undecorated =
      '<Tag Name="BLOCK_02" TagType="Base" DataType="FBD_TEST"><Data Format="L5K">[0]</Data></Tag>';
    const { result, body } = parsedElements(
      blockProgram({
        programTags: `${validTag}${undecorated}`,
        blocks:
          '<Block Type="TEST" ID="1" X="20" Y="20" Operand="BLOCK_02" VisiblePins="InA OutA" />',
      })
    );

    expect(result.status).toBe('partial');
    expect(body?.sheets[0]?.elements[0]).toMatchObject({
      kind: 'placeholder',
      sourceKind: 'Block',
    });
    expect(body?.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'FBD_MISSING_DECORATED_STRUCTURE' })
    );
  });

  it.each([
    {
      name: 'missing Type',
      tags: validTag,
      block: '<Block ID="1" X="20" Y="20" Operand="BLOCK_01" VisiblePins="InA OutA" />',
      code: 'FBD_MISSING_BLOCK_TYPE',
    },
    {
      name: 'missing Operand',
      tags: validTag,
      block: '<Block Type="TEST" ID="1" X="20" Y="20" VisiblePins="InA OutA" />',
      code: 'FBD_MISSING_BLOCK_OPERAND',
    },
    {
      name: 'unresolved Operand',
      tags: '',
      block: '<Block Type="TEST" ID="1" X="20" Y="20" Operand="MISSING" VisiblePins="InA OutA" />',
      code: 'FBD_UNRESOLVED_BLOCK_OPERAND',
    },
    {
      name: 'duplicate Operand in one scope',
      tags: `${validTag}${validTag}`,
      block: '<Block Type="TEST" ID="1" X="20" Y="20" Operand="BLOCK_01" VisiblePins="InA OutA" />',
      code: 'FBD_AMBIGUOUS_BLOCK_OPERAND',
    },
    {
      name: 'multiple decorated Structures',
      tags: `<Tag Name="BLOCK_01" TagType="Base" DataType="FBD_TEST"><Data Format="Decorated"><Structure DataType="FBD_TEST">${validMembers.join('')}</Structure><Structure DataType="FBD_TEST">${validMembers.join('')}</Structure></Data></Tag>`,
      block: '<Block Type="TEST" ID="1" X="20" Y="20" Operand="BLOCK_01" VisiblePins="InA OutA" />',
      code: 'FBD_AMBIGUOUS_DECORATED_STRUCTURE',
    },
    {
      name: 'unnamed direct member',
      tags: structureTag('BLOCK_01', [
        member('EnableIn'),
        member(undefined),
        member('EnableOut'),
        member('OutA'),
      ]),
      block: '<Block Type="TEST" ID="1" X="20" Y="20" Operand="BLOCK_01" VisiblePins="OutA" />',
      code: 'FBD_UNNAMED_STRUCTURE_MEMBER',
    },
    {
      name: 'duplicate direct member',
      tags: structureTag('BLOCK_01', [
        member('EnableIn'),
        member('InA'),
        member('InA'),
        member('EnableOut'),
        member('OutA'),
      ]),
      block: '<Block Type="TEST" ID="1" X="20" Y="20" Operand="BLOCK_01" VisiblePins="InA OutA" />',
      code: 'FBD_DUPLICATE_STRUCTURE_MEMBER',
    },
    {
      name: 'missing sentinel',
      tags: structureTag('BLOCK_01', [member('EnableIn'), member('InA'), member('OutA')]),
      block: '<Block Type="TEST" ID="1" X="20" Y="20" Operand="BLOCK_01" VisiblePins="InA OutA" />',
      code: 'FBD_INVALID_BLOCK_SENTINELS',
    },
    {
      name: 'misordered sentinels',
      tags: structureTag('BLOCK_01', [
        member('EnableOut'),
        member('OutA'),
        member('EnableIn'),
        member('InA'),
      ]),
      block: '<Block Type="TEST" ID="1" X="20" Y="20" Operand="BLOCK_01" VisiblePins="InA OutA" />',
      code: 'FBD_INVALID_BLOCK_SENTINELS',
    },
    {
      name: 'duplicate VisiblePins',
      tags: validTag,
      block:
        '<Block Type="TEST" ID="1" X="20" Y="20" Operand="BLOCK_01" VisiblePins="InA InA OutA" />',
      code: 'FBD_DUPLICATE_VISIBLE_PIN',
    },
    {
      name: 'unknown VisiblePin',
      tags: validTag,
      block:
        '<Block Type="TEST" ID="1" X="20" Y="20" Operand="BLOCK_01" VisiblePins="InA FuturePin OutA" />',
      code: 'FBD_UNKNOWN_VISIBLE_PIN',
    },
  ])('retains $name as a cause-specific diagnosed placeholder', ({ tags, block, code }) => {
    const { result, body } = parsedElements(blockProgram({ programTags: tags, blocks: block }));

    expect(result.status).toBe('partial');
    expect(body?.sheets[0]?.elements[0]).toMatchObject({
      kind: 'placeholder',
      sourceKind: 'Block',
      ports: [],
      reasonCodes: ['unresolved-metadata'],
    });
    expect(body?.diagnostics).toContainEqual(expect.objectContaining({ code }));
  });
});
