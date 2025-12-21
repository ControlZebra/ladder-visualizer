/**
 * PLC Tag definition
 */
export interface Tag {
  name: string;
  tag_type: 'Base' | 'Alias' | 'Produced' | 'Consumed';
  data_type: string;
  radix: string;
  external_access: 'Read/Write' | 'Read Only' | 'None';
}
