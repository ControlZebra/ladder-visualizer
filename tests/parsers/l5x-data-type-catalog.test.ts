import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseString } from '../../src/parsers';

const source = readFileSync(
  join(__dirname, '../fixtures/l5x/data-type-catalog-v35.L5X'),
  'utf8'
);

function parseCatalog() {
  const result = parseString(source, 'l5x');
  expect(result.success).toBe(true);
  expect(result.data).toBeDefined();
  return result.data!;
}

describe('L5X data type catalog', () => {
  it('uses Family to place declared data types without changing the explicit declaration list', () => {
    const controller = parseCatalog();
    expect(controller.dataTypes.map((type) => type.name)).toEqual(['PumpState', 'STRING_12']);

    const pumpState = controller.dataTypeCatalog?.find((type) => type.name === 'PumpState');
    expect(pumpState).toMatchObject({
      family: 'NoFamily',
      category: 'UserDefined',
      resolution: 'Declared',
    });
    expect(pumpState?.members.map((member) => member.name)).toEqual(['Mode', 'History']);
    expect(pumpState?.members[1].dimensions).toEqual([4]);

    const stringType = controller.dataTypeCatalog?.find((type) => type.name === 'STRING_12');
    expect(stringType).toMatchObject({
      family: 'StringFamily',
      category: 'String',
      resolution: 'Declared',
    });
    expect(stringType?.members.map((member) => member.name)).toEqual(['LEN', 'DATA']);
  });

  it('creates one Add-On Defined data type whose ordered members are every AOI parameter', () => {
    const controller = parseCatalog();
    const aoiType = controller.dataTypeCatalog?.find((type) => type.name === 'ValveControl');

    expect(aoiType).toMatchObject({
      class: 'AddOnDefined',
      category: 'AddOnDefined',
      resolution: 'Declared',
      description: 'Controls one valve.',
    });
    expect(aoiType?.members.map((member) => member.name)).toEqual([
      'EnableIn',
      'Command',
      'Status',
      'Samples',
      'EnableOut',
    ]);
    expect(aoiType?.members[0]).toMatchObject({ usage: 'Input', required: false, visible: false });
    expect(aoiType?.members[1]).toMatchObject({
      usage: 'Input',
      required: true,
      visible: true,
      description: 'Requested valve state.',
    });
    expect(aoiType?.members[3]).toMatchObject({
      usage: 'InOut',
      dimensions: [2, 3],
      dimension: 2,
    });
    expect(aoiType?.members.some((member) => member.name === 'Scratch')).toBe(false);
  });

  it('discovers atomic, unresolved, inferred, string, and module-defined references', () => {
    const controller = parseCatalog();
    const catalog = controller.dataTypeCatalog ?? [];

    expect(catalog.find((type) => type.name === 'DINT')).toMatchObject({
      category: 'Predefined',
      resolution: 'Atomic',
    });
    expect(catalog.find((type) => type.name === 'MESSAGE')).toMatchObject({
      category: 'Predefined',
      resolution: 'Unresolved',
    });
    expect(catalog.find((type) => type.name === 'STRING')).toMatchObject({
      category: 'String',
      family: 'StringFamily',
    });

    const timer = catalog.find((type) => type.name === 'TIMER');
    expect(timer).toMatchObject({ category: 'Predefined', resolution: 'Inferred' });
    expect(timer?.members.map((member) => member.name)).toEqual(['PRE', 'ACC', 'EN']);

    const moduleType = catalog.find((type) => type.name === 'AB:1756_SOE_FIFO:I:0');
    expect(moduleType).toMatchObject({ category: 'ModuleDefined', resolution: 'Inferred' });
    expect(moduleType?.members.map((member) => member.name)).toEqual([
      'Fault',
      'CSTTimestamp',
      'EventData',
    ]);
    expect(moduleType?.members[1]).toMatchObject({ dimensions: [2], dimension: 2 });
  });
});
