import { describe, it, expect } from 'vitest';
import { parseControllerExport, ControllerParseError } from '../../src/parsers/controller-parser';

describe('parseControllerExport', () => {
  const validController = {
    serial_number: '16#0000_0000',
    comm_path: '',
    sfc_execution_control: 'CurrentActive',
    sfc_restart_position: 'MostRecent',
    sfc_last_scan: 'DontScan',
    created_date: 'Wed Oct 20 18:17:01 2021',
    modified_date: 'Sat Apr 30 14:24:50 2022',
    data_types: [
      {
        name: 'BOOL',
        family: 'NoFamily',
        cls: 'ProductDefined',
        members: [],
      },
    ],
    tags: [
      {
        name: 'TestTag',
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
            rungs: ['XIC(TestTag)OTE(Output);'],
          },
        ],
      },
    ],
    aois: [],
    map_devices: [
      {
        module_id: 0,
        parent_module: 1,
        slot_no: 1,
        vendor_id: 1,
        product_type: 10,
        product_code: 35,
        comments: [],
      },
    ],
  };

  it('should parse a valid controller export', () => {
    const result = parseControllerExport(validController);

    expect(result.serial_number).toBe('16#0000_0000');
    expect(result.data_types).toHaveLength(1);
    expect(result.tags).toHaveLength(1);
    expect(result.programs).toHaveLength(1);
    expect(result.map_devices).toHaveLength(1);
  });

  it('should throw ControllerParseError for invalid data', () => {
    const invalid = { ...validController, serial_number: 123 }; // should be string

    expect(() => parseControllerExport(invalid)).toThrow(ControllerParseError);
  });

  it('should throw ControllerParseError for missing required fields', () => {
    const invalid = { serial_number: 'test' }; // missing many fields

    expect(() => parseControllerExport(invalid)).toThrow(ControllerParseError);
  });

  it('should validate tag_type enum', () => {
    const invalid = {
      ...validController,
      tags: [
        {
          name: 'Test',
          tag_type: 'Invalid', // not a valid enum value
          data_type: 'BOOL',
          radix: 'Decimal',
          external_access: 'Read/Write',
        },
      ],
    };

    expect(() => parseControllerExport(invalid)).toThrow(ControllerParseError);
  });

  it('should validate data type cls enum', () => {
    const invalid = {
      ...validController,
      data_types: [
        {
          name: 'Test',
          family: 'NoFamily',
          cls: 'Invalid', // not a valid enum value
          members: [],
        },
      ],
    };

    expect(() => parseControllerExport(invalid)).toThrow(ControllerParseError);
  });
});
