import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseControllerExport } from '../../src/parsers/controller-parser';
import { parseRoutine } from '../../src/parsers/routine-parser';
import { createTagResolver } from '../../src/parsers/tag-resolver';

describe('Integration: Real Controller Export', () => {
  const jsonPath = join(__dirname, '../../examples/controller_output.json');
  const jsonData = JSON.parse(readFileSync(jsonPath, 'utf-8'));

  it('should parse the real controller export', () => {
    const controller = parseControllerExport(jsonData);

    expect(controller.serial_number).toBe('16#0000_0000');
    expect(controller.data_types.length).toBeGreaterThan(0);
    expect(controller.tags.length).toBeGreaterThan(0);
    expect(controller.programs.length).toBeGreaterThan(0);
  });

  it('should parse all routines from the real export', () => {
    const controller = parseControllerExport(jsonData);

    for (const program of controller.programs) {
      for (const routine of program.routines) {
        const parsed = parseRoutine(routine);

        expect(parsed.name).toBe(routine.name);
        expect(parsed.rungs.length).toBe(routine.rungs.length);

        // Each rung should have at least some instructions
        for (const rung of parsed.rungs) {
          if (rung.raw.length > 0) {
            expect(rung.instructions.length).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it('should resolve tags from the real export', () => {
    const controller = parseControllerExport(jsonData);
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
      expect(tempTag.data_type).toBe('INT');
      expect(tempTag.tag_type).toBe('Base');
    }
  });

  it('should parse instructions with complex expressions', () => {
    const controller = parseControllerExport(jsonData);
    const routine = controller.programs[0].routines[0];
    const parsed = parseRoutine(routine);

    // Find a CPT instruction
    const cptRung = parsed.rungs.find((r) =>
      r.instructions.some((i) => i.mnemonic === 'CPT')
    );

    expect(cptRung).toBeDefined();
    if (cptRung) {
      const cptInstr = cptRung.instructions.find((i) => i.mnemonic === 'CPT');
      expect(cptInstr?.operands.length).toBe(2);
    }
  });
});
