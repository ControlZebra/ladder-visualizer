import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { diffControllers } from '../../src/diff/diffControllers';
import { parseDocumentString, parseString } from '../../src/parsers';

const fixture = (version: string) => readFileSync(
  join(__dirname, `../fixtures/l5x/aoi-interface-metadata-v${version}.L5X`),
  'utf8',
);

describe('AOI export interface metadata', () => {
  it.each(['33', '34', '35'])('retains v%s parameter and local-tag metadata through both public entry points', (version) => {
    const source = fixture(version);
    const controller = parseString(source, 'l5x');
    const document = parseDocumentString(source, 'l5x');
    expect(controller).toMatchObject({ success: true, status: 'complete' });
    expect(document).toMatchObject({ success: true, status: 'complete' });

    const aois = [controller.data?.aois[0], document.data?.resources.find((resource) => resource.kind === 'aoi')?.data];
    for (const aoi of aois) {
      expect(aoi?.parameters).toHaveLength(3);
      expect(aoi?.parameters[0]).toMatchObject({ name: 'RefA', constant: true });
      expect(aoi?.parameters[1]).toMatchObject({ name: 'RefB', constant: false, comments: [
        { operand: '.0', text: 'Bit zero', values: ['Bit zero'], localizedTexts: [] },
      ] });
      expect(aoi?.parameters[2].name).toBe('Plain');
      expect(aoi?.parameters[2]).not.toHaveProperty('constant');
      expect(aoi?.parameters[2]).not.toHaveProperty('comments');

      expect(aoi?.localTags[0]).toMatchObject({ name: 'Flags', comments: [
        { operand: '.0', text: 'Create', values: ['Create'], localizedTexts: [] },
        { operand: '.1', text: 'Read', values: ['Read'], localizedTexts: [] },
      ] });
      expect(aoi?.localTags[1].name).toBe('Empty');
      expect(aoi?.localTags[1]).not.toHaveProperty('comments');
    }
  });

  it('reports changes to parameter Constant and parameter/local comments in AOI comparisons', () => {
    const oldSource = fixture('35');
    const newSource = oldSource
      .replace('Name="RefA" TagType="Base" DataType="DINT" Usage="InOut" Required="true" Visible="true" Constant="true"', 'Name="RefA" TagType="Base" DataType="DINT" Usage="InOut" Required="true" Visible="true" Constant="false"')
      .replace('Bit zero', 'Bit one')
      .replace('Read', 'Write');
    const oldController = parseString(oldSource, 'l5x').data;
    const newController = parseString(newSource, 'l5x').data;
    expect(oldController).toBeDefined();
    expect(newController).toBeDefined();
    const diff = diffControllers(oldController!, newController!);
    expect(diff.aois).toMatchObject([{ name: 'InterfaceMetadata', kind: 'modified',
      parameterSummary: { added: 0, removed: 0, modified: 2 },
      localTagSummary: { added: 0, removed: 0, modified: 1 },
    }]);
  });

  it('keeps absent interface metadata absent in the v17 Studio export fixture', () => {
    const source = readFileSync(join(__dirname, '../fixtures/l5x/aoi-defaults-v17.L5X'), 'utf8');
    const aoi = parseString(source, 'l5x').data?.aois[0];
    expect(aoi?.parameters[0]).not.toHaveProperty('constant');
    expect(aoi?.parameters[0]).not.toHaveProperty('comments');
    expect(aoi?.localTags[0]).not.toHaveProperty('comments');
  });
});
