import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseString } from '../../src/parsers';
import {
  FBD_INSTRUCTION_METADATA,
  resolveFBDInstructionMetadata,
  type FBDInstructionMetadata,
} from '../../src/parsers/l5x';

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
    .replace('SoftwareRevision="35.01"', `SoftwareRevision="${options.softwareRevision ?? '35.01'}"`)
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

describe('version-aware FBD instruction metadata', () => {
  it('publishes explicit canonical metadata without reusing RLL labels as port IDs', () => {
    const blockEntries = FBD_INSTRUCTION_METADATA.filter((entry) => entry.forms.includes('block'));

    expect(blockEntries.map((entry) => entry.mnemonic)).toEqual([
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
    expect(blockEntries.every((entry) => entry.softwareMajorVersions.join() === '33,34,35')).toBe(
      true
    );
    expect(blockEntries.every((entry) => entry.ports.every((port) =>
      port.id.length > 0 &&
      port.label.length > 0 &&
      port.direction !== undefined &&
      port.side !== undefined &&
      Number.isInteger(port.order) &&
      typeof port.defaultVisible === 'boolean'
    ))).toBe(true);

    const add = blockEntries.find((entry) => entry.mnemonic === 'ADD');
    expect(add?.ports).toEqual([
      { id: 'SourceA', label: 'Source A', direction: 'input', side: 'left', order: 0, defaultVisible: true },
      { id: 'SourceB', label: 'Source B', direction: 'input', side: 'left', order: 1, defaultVisible: true },
      { id: 'Dest', label: 'Dest', direction: 'output', side: 'right', order: 0, defaultVisible: true },
    ]);
    expect(add?.ports.some((port) => port.id === 'Source A')).toBe(false);

    const dedt = blockEntries.find((entry) => entry.mnemonic === 'DEDT');
    expect(dedt?.arrays).toEqual([
      { id: 'StorageArray', label: 'Storage Array', order: 0, required: true },
    ]);
  });

  it.each([33, 34, 35])('resolves all level-control VisiblePins in v%i without wires', (major) => {
    const { result, routine: parsed } = routine(read(`fbd-port-metadata-v${major}`));
    const blocks = parsed?.fbd?.sheets[0]?.elements.filter((element) => element.kind === 'block');

    expect(result.status).toBe('complete');
    expect(blocks?.map((block) => block.instruction)).toEqual([
      'ADD', 'DEDT', 'HLL', 'LDLG', 'MUL', 'PIDE', 'SUB', 'D2SD', 'GRT',
    ]);
    expect(blocks?.map((block) => block.ports.map((port) => port.id))).toEqual([
      ['SourceA', 'SourceB', 'Dest'],
      ['In', 'Out'],
      ['In', 'Out', 'HighAlarm', 'LowAlarm'],
      ['In', 'Out'],
      ['SourceA', 'Dest'],
      [
        'PV', 'SPProg', 'SPCascade', 'RatioProg', 'CVProg', 'FF', 'HandFB',
        'ProgProgReq', 'ProgOperReq', 'ProgCasRatReq', 'ProgAutoReq', 'ProgManualReq',
        'ProgOverrideReq', 'ProgHandReq', 'CVEU', 'SP', 'PVHHAlarm', 'PVHAlarm',
        'PVLAlarm', 'PVLLAlarm', 'PVROCPosAlarm', 'PVROCNegAlarm', 'DevHHAlarm',
        'DevHAlarm', 'DevLAlarm', 'DevLLAlarm', 'ProgOper', 'CasRat', 'Auto', 'Manual',
        'Override', 'Hand',
      ],
      ['SourceA', 'SourceB', 'Dest'],
      [
        'ProgCommand', 'State0Perm', 'State1Perm', 'FB0', 'FB1', 'HandFB', 'ProgProgReq',
        'ProgOperReq', 'ProgOverrideReq', 'ProgHandReq', 'Out', 'Device0State',
        'Device1State', 'CommandStatus', 'FaultAlarm', 'ModeAlarm', 'ProgOper', 'Override',
        'Hand',
      ],
      ['SourceA', 'SourceB', 'Dest'],
    ]);
    expect(blocks?.every((block) => block.ports.every((port) => port.visible))).toBe(true);
    expect(blocks?.flatMap((block) => block.ports).every((port) =>
      port.direction === (port.side === 'left' ? 'input' : 'output')
    )).toBe(true);
    expect(blocks?.find((block) => block.instruction === 'DEDT')).toMatchObject({
      arrays: [{ name: 'StorageArray', operand: 'DEDT_01array' }],
      arrayRequirements: [{ id: 'StorageArray', label: 'Storage Array', order: 0, required: true }],
    });
  });

  it('keeps connected block ports canonical and independent from wire participation', () => {
    const { routine: parsed } = routine(read('fbd-canonical-v35'), 'FBDLogic');
    const add = parsed?.fbd?.sheets[1]?.elements.find(
      (element) => element.kind === 'block' && element.instruction === 'ADD'
    );

    expect(add).toMatchObject({
      ports: [
        { id: 'SourceA', direction: 'input', side: 'left', order: 0 },
        { id: 'SourceB', direction: 'input', side: 'left', order: 1 },
        { id: 'Dest', direction: 'output', side: 'right', order: 0 },
      ],
    });
  });

  it('resolves Functions from type, position, controller family, and version metadata', () => {
    const { result, routine: parsed } = functionSource({ processorType: '1756-L85E' });

    expect(result.status).toBe('complete');
    expect(parsed?.fbd?.sheets[0]?.elements).toEqual([
      expect.objectContaining({
        kind: 'function',
        instruction: 'ADD',
        id: '10',
        position: { x: '80', y: '40' },
        ports: [
          { id: 'SourceA', label: 'Source A', direction: 'input', side: 'left', order: 0, defaultVisible: true, visible: true },
          { id: 'SourceB', label: 'Source B', direction: 'input', side: 'left', order: 1, defaultVisible: true, visible: true },
          { id: 'Dest', label: 'Dest', direction: 'output', side: 'right', order: 0, defaultVisible: true, visible: true },
        ],
      }),
    ]);
  });

  it.each([
    ['1756-L75', '35.01'],
    ['1756-L85E', '32.01'],
  ])('diagnoses unsupported Function applicability for %s at v%s', (processorType, softwareRevision) => {
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
  });

  it('resolves AOI Input and Output ports in definition order while preserving InOut bindings', () => {
    const { result, routine: parsed } = routine(read('fbd-aoi-ports-v35'), 'Logic');
    const aoi = parsed?.fbd?.sheets[0]?.elements[0];

    expect(result.status).toBe('complete');
    expect(aoi).toMatchObject({
      kind: 'add-on-instruction',
      name: 'ValveAOI',
      ports: [
        { id: 'Command', label: 'Command', direction: 'input', side: 'left', order: 0, defaultVisible: true, visible: true },
        { id: 'Feedback', label: 'Feedback', direction: 'input', side: 'left', order: 1, defaultVisible: true, visible: true },
        { id: 'Running', label: 'Running', direction: 'output', side: 'right', order: 0, defaultVisible: true, visible: true },
      ],
      bindings: [{ name: 'State', argument: 'ValveState' }],
    });
    expect(aoi && 'ports' in aoi ? aoi.ports.some((port) => port.id === 'State') : true).toBe(false);
  });

  it('turns unknown or incompletely resolved source elements into diagnosed placeholders', () => {
    const source = read('fbd-v35').replace(
      /<Sheet Number="1">[\s\S]*<\/Sheet>/,
      `<Sheet Number="1">
        <Block Type="FUTURE" ID="10" X="20" Y="20" VisiblePins="Left Right" />
        <Block Type="ADD" ID="11" X="20" Y="80" VisiblePins="SourceA FuturePin Dest" />
        <Block Type="DEDT" ID="12" X="20" Y="140" VisiblePins="In Out" />
        <AddOnInstruction Name="MissingAOI" ID="13" X="20" Y="200" VisiblePins="In Out" />
      </Sheet>`
    );
    const { result, routine: parsed } = routine(source, 'FBDLogic');

    expect(result.status).toBe('partial');
    expect(parsed?.fbd?.sheets[0]?.elements).toEqual([
      expect.objectContaining({ kind: 'placeholder', sourceKind: 'Block', ports: [], reasonCodes: ['unresolved-metadata'] }),
      expect.objectContaining({ kind: 'placeholder', sourceKind: 'Block', ports: [], reasonCodes: ['unresolved-metadata'] }),
      expect.objectContaining({ kind: 'placeholder', sourceKind: 'Block', ports: [], reasonCodes: ['unresolved-metadata'] }),
      expect.objectContaining({ kind: 'placeholder', sourceKind: 'AddOnInstruction', ports: [], reasonCodes: ['unresolved-metadata'] }),
    ]);
    expect(parsed?.fbd?.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        'FBD_UNKNOWN_INSTRUCTION',
        'FBD_UNKNOWN_VISIBLE_PIN',
        'FBD_MISSING_REQUIRED_ARRAY',
        'FBD_UNKNOWN_AOI',
      ])
    );
  });

  it('rejects a required DEDT array whose binding operand is absent', () => {
    const source = read('fbd-v35').replace(
      /<Sheet Number="1">[\s\S]*<\/Sheet>/,
      `<Sheet Number="1">
        <Block Type="DEDT" ID="10" X="20" Y="20" VisiblePins="In Out">
          <Array Name="StorageArray" />
        </Block>
      </Sheet>`
    );
    const { result, routine: parsed } = routine(source, 'FBDLogic');

    expect(result.status).toBe('partial');
    expect(parsed?.fbd?.sheets[0]?.elements[0]).toMatchObject({
      kind: 'placeholder',
      sourceKind: 'Block',
      ports: [],
      reasonCodes: ['unresolved-metadata'],
    });
    expect(parsed?.fbd?.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'FBD_MISSING_REQUIRED_ARRAY',
        message: expect.stringContaining('StorageArray'),
      })
    );
  });

  it('uses port defaults only when VisiblePins is absent, not when it is explicitly empty', () => {
    const source = read('fbd-v35').replace(
      /<Sheet Number="1">[\s\S]*<\/Sheet>/,
      `<Sheet Number="1">
        <Block Type="ADD" ID="10" X="20" Y="20" />
        <Block Type="ADD" ID="11" X="20" Y="80" VisiblePins="" />
      </Sheet>`
    );
    const { result, routine: parsed } = routine(source, 'FBDLogic');
    const blocks = parsed?.fbd?.sheets[0]?.elements.filter(
      (element) => element.kind === 'block'
    );

    expect(result.status).toBe('complete');
    expect(blocks?.map((block) => block.ports.map((port) => port.id))).toEqual([
      ['SourceA', 'SourceB', 'Dest'],
      [],
    ]);
    expect(blocks?.map((block) => block.visiblePins)).toEqual([[], []]);
  });

  it('accepts complete external metadata and diagnoses duplicate or unresolved port definitions', () => {
    const complete: FBDInstructionMetadata = {
      mnemonic: 'FUTURE',
      forms: ['block'],
      softwareMajorVersions: [35],
      controllerFamilies: ['all'],
      ports: [
        { id: 'In', label: 'Input', direction: 'input', side: 'left', order: 0, defaultVisible: true },
        { id: 'Out', label: 'Output', direction: 'output', side: 'right', order: 0, defaultVisible: true },
      ],
      arrays: [],
    };
    const duplicate: FBDInstructionMetadata = {
      ...complete,
      mnemonic: 'DUPLICATE',
      ports: [complete.ports[0], { ...complete.ports[0], label: 'Duplicate' }],
    };
    const incomplete: FBDInstructionMetadata = {
      ...complete,
      mnemonic: 'INCOMPLETE',
      ports: [{ id: 'Mystery', label: 'Mystery', order: 0, defaultVisible: true }],
    };
    const context = { form: 'block' as const, softwareRevision: '35.01', processorType: '1756-L85E' };

    expect(resolveFBDInstructionMetadata([complete], { mnemonic: 'future', ...context })).toMatchObject({
      metadata: { mnemonic: 'FUTURE' },
      diagnostics: [],
    });
    expect(resolveFBDInstructionMetadata([duplicate], { mnemonic: 'DUPLICATE', ...context }).diagnostics)
      .toContainEqual(expect.objectContaining({ code: 'FBD_DUPLICATE_PORT_ID', portId: 'In' }));
    expect(resolveFBDInstructionMetadata([incomplete], { mnemonic: 'INCOMPLETE', ...context }).diagnostics)
      .toContainEqual(expect.objectContaining({ code: 'FBD_UNRESOLVED_PORT_METADATA', portId: 'Mystery' }));
    expect(resolveFBDInstructionMetadata([], { mnemonic: 'ABSENT', ...context }).diagnostics)
      .toContainEqual(expect.objectContaining({ code: 'FBD_UNKNOWN_INSTRUCTION' }));
  });
});
