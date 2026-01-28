/**
 * PLC Tag definition
 * @deprecated Use NormalizedTag instead. This type will be removed in a future version.
 * @see NormalizedTag for the new vendor-agnostic format
 */
export interface Tag {
  name: string;
  tag_type: 'Base' | 'Alias' | 'Produced' | 'Consumed';
  data_type: string;
  radix: string;
  external_access: 'Read/Write' | 'Read Only' | 'None';
}
