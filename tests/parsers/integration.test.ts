import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseFile, parseString, parserRegistry } from '../../src/parsers';
import { createTagResolver } from '../../src/parsers/tag-resolver';
import {
  clearAOIs,
  globalInstructionRegistry,
  registerAOI,
} from '../../src/types';

const l5xPath = join(__dirname, '../../examples/Cooker_1_AutoLogic_Program.L5X');
const l5xContent = readFileSync(l5xPath, 'utf-8');
const parsedExample = parseString(l5xContent, 'l5x');

if (!parsedExample.success || !parsedExample.data) {
  throw new Error(parsedExample.errors?.map((error) => error.message).join(', ') || 'Failed to parse example L5X');
}

const controller = parsedExample.data;

const minimalJsonContent = JSON.stringify({
  serial_number: 'TEST-JSON',
  comm_path: '',
  created_date: '',
  modified_date: '',
  data_types: [],
  tags: [],
  programs: [],
  aois: [],
  map_devices: [],
});

function createAOIController(parameterName: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<RSLogix5000Content SchemaRevision="1.0" SoftwareRevision="35.01" TargetName="ContextFixture" TargetType="Controller">
  <Controller Use="Target" Name="ContextFixture">
    <AddOnInstructionDefinitions>
      <AddOnInstructionDefinition Name="SharedAOI" Class="Standard" Revision="1.0">
        <Parameters>
          <Parameter Name="${parameterName}" TagType="Base" DataType="DINT" Usage="Input" Visible="true" />
        </Parameters>
      </AddOnInstructionDefinition>
    </AddOnInstructionDefinitions>
    <Programs>
      <Program Name="MainProgram">
        <Routines>
          <Routine Name="MainRoutine" Type="RLL">
            <RLLContent><Rung Number="0" Type="N"><Text><![CDATA[SharedAOI(Value);]]></Text></Rung></RLLContent>
          </Routine>
        </Routines>
      </Program>
    </Programs>
  </Controller>
</RSLogix5000Content>`;
}

describe('Integration: Real L5X Controller Export', () => {
  it('parses the restored real controller export', () => {
    expect(controller.name).toBe('PLC100_Mashing');
    expect(controller.dataTypes.length).toBeGreaterThan(0);
    expect(controller.tags.length).toBeGreaterThan(0);
    expect(controller.programs.length).toBeGreaterThan(0);
  });

  it('parses ladder instructions across real routines', () => {
    const rllRoutines = controller.programs
      .flatMap((program) => program.routines)
      .filter((routine) => routine.type === 'RLL' && routine.rungs.length > 0);

    expect(rllRoutines.length).toBeGreaterThan(0);

    for (const routine of rllRoutines) {
      for (const rung of routine.rungs) {
        if (rung.raw.trim()) {
          expect(rung.instructions.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('resolves tags used by the real controller', () => {
    const resolver = createTagResolver(controller);

    expect(resolver.getAllTags().length).toBeGreaterThan(0);
    expect(resolver.getUsedTags().length).toBeGreaterThan(0);
  });

  it('parses complex CPT expressions from the real controller', () => {
    const cptInstruction = controller.programs
      .flatMap((program) => program.routines)
      .flatMap((routine) => routine.rungs)
      .flatMap((rung) => rung.instructions)
      .find((instruction) => instruction.mnemonic === 'CPT');

    expect(cptInstruction).toBeDefined();
    expect(cptInstruction?.operands.length).toBe(2);
  });
});

describe('Integration: Unified parseString API', () => {
  it('auto-detects the restored L5X example', () => {
    const result = parseString(l5xContent);

    expect(result.success).toBe(true);
    expect(result.data?.sourceFormat).toBe('l5x');
    expect(result.data?.name).toBe('PLC100_Mashing');
    expect(result.data?.programs.length).toBeGreaterThan(0);
    expect(result.data?.dataTypes.length).toBeGreaterThan(0);
  });

  it('parses the restored L5X example with an explicit format hint', () => {
    const result = parseString(l5xContent, 'l5x');

    expect(result.success).toBe(true);
    expect(result.data?.sourceFormat).toBe('l5x');
  });

  it('still auto-detects JSON without keeping a second multi-megabyte fixture', () => {
    const result = parseString(minimalJsonContent);

    expect(result.success).toBe(true);
    expect(result.data?.sourceFormat).toBe('json');
  });

  it('still parses JSON with an explicit format hint', () => {
    const result = parseString(minimalJsonContent, 'json');

    expect(result.success).toBe(true);
    expect(result.data?.sourceFormat).toBe('json');
  });

  it('has both JSON and L5X parsers registered', () => {
    const allParsers = parserRegistry.getAllParsers();

    expect(allParsers.length).toBeGreaterThanOrEqual(2);
    expect(parserRegistry.getParser('rockwell-json')).toBeDefined();
    expect(parserRegistry.getParser('rockwell-l5x')).toBeDefined();
  });

  it('does not mutate the global AOI registry while parsing', () => {
    const sentinelMnemonic = '__PARSE_ISOLATION_SENTINEL__';
    clearAOIs(globalInstructionRegistry);
    registerAOI(globalInstructionRegistry, {
      name: sentinelMnemonic,
      parameters: [],
    });

    try {
      const result = parseString(createAOIController('ControllerInput'), 'l5x');

      expect(result.success).toBe(true);
      expect(globalInstructionRegistry.has(sentinelMnemonic)).toBe(true);
      expect(globalInstructionRegistry.has('SharedAOI')).toBe(false);
    } finally {
      clearAOIs(globalInstructionRegistry);
    }
  });

  it('does not let global instruction definitions influence parsed categories', () => {
    globalInstructionRegistry.register({
      mnemonic: 'SharedAOI',
      category: 'input',
      displayName: 'Conflicting global definition',
      parameterLabels: ['GlobalInput'],
      symbolType: 'contact',
    }, { overwrite: true });

    try {
      const result = parseString(createAOIController('ControllerInput'), 'l5x');
      const rung = result.data?.programs[0]?.routines[0]?.rungs[0];

      expect(result.success).toBe(true);
      expect(globalInstructionRegistry.getCategory('SharedAOI')).toBe('input');
      expect(rung?.instructions[0]?.category).toBe('aoi');
      expect(rung?.elements[0]).toMatchObject({
        mnemonic: 'SharedAOI',
        category: 'aoi',
      });
    } finally {
      globalInstructionRegistry.remove('SharedAOI');
    }
  });

  it('keeps AOI metadata isolated across interleaved controller results', () => {
    const first = parseString(createAOIController('FirstControllerInput'), 'l5x');
    const second = parseString(createAOIController('SecondControllerInput'), 'l5x');

    expect(first.context?.instructionRegistry).not.toBe(second.context?.instructionRegistry);
    expect(first.context?.instructionRegistry.getParameterLabels('SharedAOI')).toEqual([
      'FirstControllerInput',
    ]);
    expect(second.context?.instructionRegistry.getParameterLabels('SharedAOI')).toEqual([
      'SecondControllerInput',
    ]);
    expect(first.context?.instructionRegistry.getParameterLabels('SharedAOI')).toEqual([
      'FirstControllerInput',
    ]);
    expect(first.data?.programs[0]?.routines[0]?.rungs[0]?.instructions[0]?.category).toBe('aoi');
    expect(second.data?.programs[0]?.routines[0]?.rungs[0]?.elements[0]).toMatchObject({
      mnemonic: 'SharedAOI',
      category: 'aoi',
    });
  });

  it('keeps overlapping asynchronous file parses isolated', async () => {
    const firstContent = createAOIController('DelayedInput');
    const secondContent = createAOIController('ImmediateInput');
    let releaseFirstRead: (() => void) | undefined;
    const firstFile = {
      name: 'delayed.L5X',
      size: new TextEncoder().encode(firstContent).byteLength,
      text: () => new Promise<string>((resolve) => {
        releaseFirstRead = () => resolve(firstContent);
      }),
    } as File;
    const secondFile = {
      name: 'immediate.L5X',
      size: new TextEncoder().encode(secondContent).byteLength,
      text: async () => secondContent,
    } as File;

    const delayedParse = parseFile(firstFile);
    const immediateResult = await parseFile(secondFile);
    releaseFirstRead?.();
    const delayedResult = await delayedParse;

    expect(immediateResult.context?.instructionRegistry.getParameterLabels('SharedAOI')).toEqual([
      'ImmediateInput',
    ]);
    expect(delayedResult.context?.instructionRegistry.getParameterLabels('SharedAOI')).toEqual([
      'DelayedInput',
    ]);
  });
});
