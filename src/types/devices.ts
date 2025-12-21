/**
 * I/O Module / Map Device from PLC export
 */
export interface MapDevice {
  module_id: number;
  parent_module: number;
  slot_no: number;
  vendor_id: number;
  product_type: number;
  product_code: number;
  comments: string[];
}
