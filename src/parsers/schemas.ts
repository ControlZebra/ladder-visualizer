import { z } from 'zod';

/**
 * Zod schema for DataTypeMember
 */
export const DataTypeMemberSchema = z.object({
  name: z.string(),
  data_type: z.string(),
  dimension: z.number(),
  radix: z.string(),
  hidden: z.boolean(),
  external_access: z.string(),
});

/**
 * Zod schema for DataType
 */
export const DataTypeSchema = z.object({
  name: z.string(),
  family: z.string(),
  cls: z.enum(['ProductDefined', 'User']),
  members: z.array(DataTypeMemberSchema),
});

/**
 * Zod schema for Tag
 */
export const TagSchema = z.object({
  name: z.string(),
  tag_type: z.enum(['Base', 'Alias', 'Produced', 'Consumed']),
  data_type: z.string(),
  radix: z.string(),
  external_access: z.enum(['Read/Write', 'Read Only', 'None']),
});

/**
 * Zod schema for Routine
 */
export const RoutineSchema = z.object({
  name: z.string(),
  type: z.enum(['RLL', 'FBD', 'ST', 'SFC']),
  rungs: z.array(z.string()),
});

/**
 * Zod schema for Program
 */
export const ProgramSchema = z.object({
  routines: z.array(RoutineSchema),
});

/**
 * Zod schema for MapDevice
 */
export const MapDeviceSchema = z.object({
  module_id: z.number(),
  parent_module: z.number(),
  slot_no: z.number(),
  vendor_id: z.number(),
  product_type: z.number(),
  product_code: z.number(),
  comments: z.array(z.string()),
});

/**
 * Zod schema for AOI (Add-On Instruction)
 */
export const AOISchema = z.object({
  name: z.string(),
}).passthrough(); // Allow additional fields

/**
 * Zod schema for the complete ControllerExport
 */
export const ControllerExportSchema = z.object({
  serial_number: z.string(),
  comm_path: z.string(),
  sfc_execution_control: z.enum(['CurrentActive', 'ExecuteUntilFalse']),
  sfc_restart_position: z.enum(['MostRecent', 'InitialStep']),
  sfc_last_scan: z.enum(['DontScan', 'ProgrammaticReset']),
  created_date: z.string(),
  modified_date: z.string(),
  data_types: z.array(DataTypeSchema),
  tags: z.array(TagSchema),
  programs: z.array(ProgramSchema),
  aois: z.array(AOISchema),
  map_devices: z.array(MapDeviceSchema),
});
