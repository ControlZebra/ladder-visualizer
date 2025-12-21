/**
 * Member of a PLC data type structure
 */
export interface DataTypeMember {
  name: string;
  data_type: string;
  dimension: number;
  radix: string;
  hidden: boolean;
  external_access: string;
}

/**
 * PLC Data Type definition (BOOL, INT, TIMER, custom types, etc.)
 */
export interface DataType {
  name: string;
  family: string;
  cls: 'ProductDefined' | 'User';
  members: DataTypeMember[];
}
