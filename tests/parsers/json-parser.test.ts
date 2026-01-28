import { describe, it, expect } from 'vitest';
import { JSONParser, jsonParser } from '../../src/parsers/json';
import { jsonToNormalized } from '../../src/parsers/json/json-to-normalized';

describe('JSONParser', () => {
  const validJson = {
    serial_number: '12345',
    comm_path: 'path/to/controller',
    sfc_execution_control: 'CurrentActive',
    sfc_restart_position: 'MostRecent',
    sfc_last_scan: 'DontScan',
    created_date: '2024-01-01T00:00:00Z',
    modified_date: '2024-01-02T00:00:00Z',
    data_types: [
      {
        name: 'MyType',
        family: 'NoFamily',
        cls: 'User',
        members: [
          {
            name: 'value',
            data_type: 'DINT',
            dimension: 0,
            radix: 'Decimal',
            hidden: false,
            external_access: 'Read/Write',
          },
        ],
      },
    ],
    tags: [
      {
        name: 'MyTag',
        tag_type: 'Base',
        data_type: 'BOOL',
        radix: 'Decimal',
        external_access: 'Read/Write',
      },
    ],
    programs: [
      {
        routines: [
          {
            name: 'MainRoutine',
            type: 'RLL',
            rungs: ['XIC(MyTag)OTE(Output);'],
          },
        ],
      },
    ],
    aois: [],
    map_devices: [],
  };

  describe('canParse', () => {
    it('should return true for valid Rockwell JSON', () => {
      const content = JSON.stringify(validJson);
      expect(jsonParser.canParse(content)).toBe(true);
    });

    it('should return false for non-JSON content', () => {
      expect(jsonParser.canParse('<xml>content</xml>')).toBe(false);
      expect(jsonParser.canParse('random text')).toBe(false);
    });

    it('should return false for generic JSON without Rockwell fields', () => {
      expect(jsonParser.canParse(JSON.stringify({ key: 'value' }))).toBe(false);
    });

    it('should handle ArrayBuffer input', () => {
      const content = JSON.stringify(validJson);
      const buffer = new TextEncoder().encode(content).buffer;
      expect(jsonParser.canParse(buffer)).toBe(true);
    });
  });

  describe('parse', () => {
    it('should parse valid JSON successfully', () => {
      const content = JSON.stringify(validJson);
      const result = jsonParser.parse(content);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.serialNumber).toBe('12345');
      expect(result.data?.vendor).toBe('rockwell');
      expect(result.data?.sourceFormat).toBe('json');
    });

    it('should normalize data types', () => {
      const content = JSON.stringify(validJson);
      const result = jsonParser.parse(content);

      expect(result.data?.dataTypes).toHaveLength(1);
      expect(result.data?.dataTypes[0].name).toBe('MyType');
      expect(result.data?.dataTypes[0].class).toBe('User');
    });

    it('should normalize tags', () => {
      const content = JSON.stringify(validJson);
      const result = jsonParser.parse(content);

      expect(result.data?.tags).toHaveLength(1);
      expect(result.data?.tags[0].name).toBe('MyTag');
      expect(result.data?.tags[0].scope).toBe('Controller');
    });

    it('should normalize programs and routines', () => {
      const content = JSON.stringify(validJson);
      const result = jsonParser.parse(content);

      expect(result.data?.programs).toHaveLength(1);
      expect(result.data?.programs[0].routines).toHaveLength(1);
      expect(result.data?.programs[0].routines[0].rungs).toHaveLength(1);
    });

    it('should parse rungs into elements and instructions', () => {
      const content = JSON.stringify(validJson);
      const result = jsonParser.parse(content);

      const rung = result.data?.programs[0].routines[0].rungs[0];
      expect(rung?.raw).toBe('XIC(MyTag)OTE(Output);');
      expect(rung?.instructions).toHaveLength(2);
      expect(rung?.elements).toHaveLength(2);
    });

    it('should return error for invalid JSON', () => {
      const result = jsonParser.parse('not valid json');

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.some(e => e.code === 'INVALID_JSON')).toBe(true);
    });

    it('should return error for missing required fields', () => {
      const invalidJson = { serial_number: '123' }; // Missing other required fields
      const result = jsonParser.parse(JSON.stringify(invalidJson));

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should include parse time', () => {
      const content = JSON.stringify(validJson);
      const result = jsonParser.parse(content);

      expect(result.parseTimeMs).toBeDefined();
      expect(result.parseTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('validate', () => {
    it('should validate correct JSON', () => {
      const content = JSON.stringify(validJson);
      const result = jsonParser.validate!(content);

      expect(result.success).toBe(true);
    });

    it('should reject invalid JSON', () => {
      const result = jsonParser.validate!('not valid json');

      expect(result.success).toBe(false);
    });
  });
});

describe('jsonToNormalized', () => {
  it('should convert external access formats', () => {
    const data = {
      serial_number: '123',
      comm_path: 'path',
      sfc_execution_control: 'CurrentActive',
      sfc_restart_position: 'MostRecent',
      sfc_last_scan: 'DontScan',
      created_date: '',
      modified_date: '',
      data_types: [],
      tags: [
        {
          name: 'Tag1',
          tag_type: 'Base',
          data_type: 'BOOL',
          radix: 'Decimal',
          external_access: 'Read/Write',
        },
        {
          name: 'Tag2',
          tag_type: 'Base',
          data_type: 'BOOL',
          radix: 'Decimal',
          external_access: 'Read Only',
        },
        {
          name: 'Tag3',
          tag_type: 'Base',
          data_type: 'BOOL',
          radix: 'Decimal',
          external_access: 'None',
        },
      ],
      programs: [],
      aois: [],
      map_devices: [],
    };

    const normalized = jsonToNormalized(data);

    expect(normalized.tags[0].externalAccess).toBe('ReadWrite');
    expect(normalized.tags[1].externalAccess).toBe('ReadOnly');
    expect(normalized.tags[2].externalAccess).toBe('None');
  });

  it('should parse dates correctly', () => {
    const data = {
      serial_number: '123',
      comm_path: 'path',
      sfc_execution_control: 'CurrentActive',
      sfc_restart_position: 'MostRecent',
      sfc_last_scan: 'DontScan',
      created_date: '2024-06-15T10:30:00Z',
      modified_date: '2024-06-16T14:00:00Z',
      data_types: [],
      tags: [],
      programs: [],
      aois: [],
      map_devices: [],
    };

    const normalized = jsonToNormalized(data);

    expect(normalized.createdDate).toBeInstanceOf(Date);
    expect(normalized.modifiedDate).toBeInstanceOf(Date);
  });

  it('should store vendor metadata', () => {
    const data = {
      serial_number: '123',
      comm_path: 'path',
      sfc_execution_control: 'ExecuteUntilFalse',
      sfc_restart_position: 'InitialStep',
      sfc_last_scan: 'ProgrammaticReset',
      created_date: '',
      modified_date: '',
      data_types: [],
      tags: [],
      programs: [],
      aois: [],
      map_devices: [],
    };

    const normalized = jsonToNormalized(data);

    expect(normalized.vendorMetadata?.sfc_execution_control).toBe('ExecuteUntilFalse');
    expect(normalized.vendorMetadata?.sfc_restart_position).toBe('InitialStep');
    expect(normalized.vendorMetadata?.sfc_last_scan).toBe('ProgrammaticReset');
  });
});
