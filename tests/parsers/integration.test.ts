import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseString, parserRegistry } from '../../src/parsers';
import { createTagResolver } from '../../src/parsers/tag-resolver';

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
});
