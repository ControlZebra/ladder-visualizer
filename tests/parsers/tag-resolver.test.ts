import { describe, it, expect } from 'vitest';
import { createTagResolver } from '../../src/parsers/tag-resolver';
import { jsonToNormalized } from '../../src/parsers';
import type { NormalizedController } from '../../src/types';

const createTestController = (): NormalizedController => {
  // Create a mock JSON structure that matches the expected format
  const mockJson = {
    serial_number: 'test',
    comm_path: '',
    sfc_execution_control: 'CurrentActive',
    sfc_restart_position: 'MostRecent',
    sfc_last_scan: 'DontScan',
    created_date: '',
    modified_date: '',
    data_types: [
      { name: 'BOOL', family: 'NoFamily', cls: 'ProductDefined', members: [] },
      { name: 'INT', family: 'NoFamily', cls: 'ProductDefined', members: [] },
      { name: 'REAL', family: 'NoFamily', cls: 'ProductDefined', members: [] },
    ],
    tags: [
      { name: 'InputTag', tag_type: 'Base', data_type: 'BOOL', radix: 'Decimal', external_access: 'Read/Write' },
      { name: 'OutputTag', tag_type: 'Base', data_type: 'BOOL', radix: 'Decimal', external_access: 'Read/Write' },
      { name: 'UnusedTag', tag_type: 'Base', data_type: 'INT', radix: 'Decimal', external_access: 'Read/Write' },
      { name: 'Temperature', tag_type: 'Base', data_type: 'REAL', radix: 'Float', external_access: 'Read/Write' },
    ],
    programs: [
      {
        routines: [
          {
            name: 'MainRoutine',
            type: 'RLL',
            rungs: [
              'XIC(InputTag)OTE(OutputTag);',
              'GEQ(Temperature,100)OTE(OutputTag);',
            ],
          },
        ],
      },
    ],
    aois: [],
    map_devices: [],
  };
  return jsonToNormalized(mockJson);
};

describe('TagResolver', () => {
  it('should get tag by name', () => {
    const controller = createTestController();
    const resolver = createTagResolver(controller);

    const tag = resolver.getTag('InputTag');
    expect(tag).toBeDefined();
    expect(tag?.name).toBe('InputTag');
    expect(tag?.dataType).toBe('BOOL');
  });

  it('should return undefined for unknown tag', () => {
    const controller = createTestController();
    const resolver = createTagResolver(controller);

    const tag = resolver.getTag('NonExistent');
    expect(tag).toBeUndefined();
  });

  it('should get all tags', () => {
    const controller = createTestController();
    const resolver = createTagResolver(controller);

    const tags = resolver.getAllTags();
    expect(tags).toHaveLength(4);
  });

  it('should get data type by name', () => {
    const controller = createTestController();
    const resolver = createTagResolver(controller);

    const dataType = resolver.getDataType('BOOL');
    expect(dataType).toBeDefined();
    expect(dataType?.name).toBe('BOOL');
  });

  it('should get data type for a tag', () => {
    const controller = createTestController();
    const resolver = createTagResolver(controller);

    const tag = resolver.getTag('Temperature')!;
    const dataType = resolver.getTagDataType(tag);

    expect(dataType).toBeDefined();
    expect(dataType?.name).toBe('REAL');
  });

  it('should track tag usages across rungs', () => {
    const controller = createTestController();
    const resolver = createTagResolver(controller);

    const inputUsage = resolver.getTagUsages('InputTag');
    expect(inputUsage?.usages).toHaveLength(1);
    expect(inputUsage?.usages[0]).toEqual({
      programIndex: 0,
      routineIndex: 0,
      rungIndex: 0,
    });

    const outputUsage = resolver.getTagUsages('OutputTag');
    expect(outputUsage?.usages).toHaveLength(2); // Used in both rungs
  });

  it('should identify used tags', () => {
    const controller = createTestController();
    const resolver = createTagResolver(controller);

    const usedTags = resolver.getUsedTags();
    const usedNames = usedTags.map((t) => t.name);

    expect(usedNames).toContain('InputTag');
    expect(usedNames).toContain('OutputTag');
    expect(usedNames).toContain('Temperature');
    expect(usedNames).not.toContain('UnusedTag');
  });

  it('should identify unused tags', () => {
    const controller = createTestController();
    const resolver = createTagResolver(controller);

    const unusedTags = resolver.getUnusedTags();
    const unusedNames = unusedTags.map((t) => t.name);

    expect(unusedNames).toContain('UnusedTag');
    expect(unusedNames).not.toContain('InputTag');
  });
});
