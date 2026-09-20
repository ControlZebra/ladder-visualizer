import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseString } from '../../src/parsers';

const fixtureDirectory = join(__dirname, '../fixtures/l5x');
const versions = ['33', '34', '35'] as const;

describe('L5X raw-only user-defined type arrays', () => {
  it.each(versions)('preserves v%s raw data and declared packed-bit metadata', (version) => {
    const source = readFileSync(join(fixtureDirectory, `raw-udt-array-v${version}.L5X`), 'utf8');
    const result = parseString(source, 'l5x');

    expect(result).toMatchObject({ success: true, status: 'partial' });
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: 'UNSUPPORTED_L5X_TAG_ENCODING',
      })
    );

    const controller = result.data!;
    const raw = controller.programs[0].tags.find((tag) => tag.name === 'RawEvents')!;
    expect(raw).toMatchObject({
      dataType: 'SOE_Data',
      dimensions: [2],
      scope: 'Program',
      programName: 'MainProgram',
      data: [{ text: '00 00 00 00 00 00 00 00', values: [] }],
    });

    const soeData = controller.dataTypes.find((dataType) => dataType.name === 'SOE_Data')!;
    expect(soeData.members).toContainEqual(
      expect.objectContaining({
        name: 'Enabled',
        dataType: 'BIT',
        storageTarget: 'ZZZZZZZZZZSOE_Data0',
        bitNumber: 0,
      })
    );
  });

  it('accepts whitespace-separated v17 top-level dimensions evidenced by AB samples', () => {
    const source = `<?xml version="1.0" encoding="UTF-8"?>
      <RSLogix5000Content SchemaRevision="1.0" SoftwareRevision="17.00" TargetName="LegacyDimensions" TargetType="Controller" ContainsContext="false">
        <Controller Use="Target" Name="LegacyDimensions"><Tags><Tag Name="Matrix" TagType="Base" DataType="DINT" Dimensions="4 5" Radix="Decimal" /></Tags></Controller>
      </RSLogix5000Content>`;

    const result = parseString(source, 'l5x');
    expect(result).toMatchObject({ success: true });
    expect(result.data?.tags[0].dimensions).toEqual([4, 5]);
  });
});
