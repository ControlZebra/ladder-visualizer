/**
 * Member of a PLC data type structure
 * @deprecated Use NormalizedDataTypeMember instead. This type will be removed in a future version.
 * @see NormalizedDataTypeMember for the new vendor-agnostic format
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
 * @deprecated Use NormalizedDataType instead. This type will be removed in a future version.
 * @see NormalizedDataType for the new vendor-agnostic format
 */
export interface DataType {
  name: string;
  family: string;
  cls: 'ProductDefined' | 'User';
  members: DataTypeMember[];
}
