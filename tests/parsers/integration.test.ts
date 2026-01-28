import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseString, parserRegistry, jsonToNormalized } from '../../src/parsers';
import { createTagResolver } from '../../src/parsers/tag-resolver';

describe('Integration: Real Controller Export', () => {
  const jsonPath = join(__dirname, '../../examples/controller_output.json');
  const jsonData = JSON.parse(readFileSync(jsonPath, 'utf-8'));

  it('should parse the real controller export', () => {
    const controller = jsonToNormalized(jsonData);

    // Controller name is extracted from comm_path or serial_number
    expect(controller.name).toBeDefined();
    expect(controller.name.length).toBeGreaterThan(0);
    expect(controller.dataTypes.length).toBeGreaterThan(0);
    expect(controller.tags.length).toBeGreaterThan(0);
    expect(controller.programs.length).toBeGreaterThan(0);
  });

  it('should parse all routines from the real export', () => {
    const controller = jsonToNormalized(jsonData);

    for (const program of controller.programs) {
      for (const routine of program.routines) {
        expect(routine.name).toBeDefined();
        expect(routine.rungs.length).toBeGreaterThan(0);

        // Each rung should have at least some instructions
        for (const rung of routine.rungs) {
          if (rung.raw && rung.raw.length > 0) {
            expect(rung.instructions.length).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it('should resolve tags from the real export', () => {
    const controller = jsonToNormalized(jsonData);
    const resolver = createTagResolver(controller);

    // Check that we have tags
    const allTags = resolver.getAllTags();
    expect(allTags.length).toBeGreaterThan(0);

    // Check that some tags are used
    const usedTags = resolver.getUsedTags();
    expect(usedTags.length).toBeGreaterThan(0);

    // Verify a known tag from the export
    const tempTag = resolver.getTag('Ambient_Temperature');
    if (tempTag) {
      expect(tempTag.dataType).toBe('INT');
      expect(tempTag.tagType).toBe('Base');
    }
  });

  it('should parse instructions with complex expressions', () => {
    const controller = jsonToNormalized(jsonData);
    const routine = controller.programs[0].routines[0];

    // Find a CPT instruction
    const cptRung = routine.rungs.find((r) =>
      r.instructions.some((i) => i.mnemonic === 'CPT')
    );

    expect(cptRung).toBeDefined();
    if (cptRung) {
      const cptInstr = cptRung.instructions.find((i) => i.mnemonic === 'CPT');
      expect(cptInstr?.operands.length).toBe(2);
    }
  });
});

describe('Integration: Unified parseString API', () => {
  it('should parse JSON format using auto-detection', () => {
    const jsonPath = join(__dirname, '../../examples/controller_output.json');
    const jsonContent = readFileSync(jsonPath, 'utf-8');

    const result = parseString(jsonContent);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.vendor).toBe('rockwell');
    expect(result.data?.sourceFormat).toBe('json');
    expect(result.data?.programs.length).toBeGreaterThan(0);
  });

  it('should parse L5X format using auto-detection', () => {
    const l5xPath = join(__dirname, '../../examples/Cooker_1_AutoLogic_Program.L5X');
    const l5xContent = readFileSync(l5xPath, 'utf-8');

    const result = parseString(l5xContent);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.vendor).toBe('rockwell');
    expect(result.data?.sourceFormat).toBe('l5x');
    expect(result.data?.name).toBe('PLC100_Mashing');
    expect(result.data?.programs.length).toBeGreaterThan(0);
    expect(result.data?.dataTypes.length).toBeGreaterThan(0);
  });

  it('should parse JSON format with explicit format hint', () => {
    const jsonPath = join(__dirname, '../../examples/controller_output.json');
    const jsonContent = readFileSync(jsonPath, 'utf-8');

    const result = parseString(jsonContent, 'json');

    expect(result.success).toBe(true);
    expect(result.data?.sourceFormat).toBe('json');
  });

  it('should parse L5X format with explicit format hint', () => {
    const l5xPath = join(__dirname, '../../examples/Cooker_1_AutoLogic_Program.L5X');
    const l5xContent = readFileSync(l5xPath, 'utf-8');

    const result = parseString(l5xContent, 'l5x');

    expect(result.success).toBe(true);
    expect(result.data?.sourceFormat).toBe('l5x');
  });

  it('should have both JSON and L5X parsers registered', () => {
    const allParsers = parserRegistry.getAllParsers();
    
    expect(allParsers.length).toBeGreaterThanOrEqual(2);
    
    const jsonParser = parserRegistry.getParser('rockwell-json');
    expect(jsonParser).toBeDefined();
    
    const l5xParser = parserRegistry.getParser('rockwell-l5x');
    expect(l5xParser).toBeDefined();
  });
});
