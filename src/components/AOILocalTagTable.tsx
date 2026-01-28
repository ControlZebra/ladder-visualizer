import type { AOILocalTag } from '../types';
import { GenericTable, type ColumnDefinition } from './table';

export interface AOILocalTagTableProps {
  /** Array of local tags to display */
  localTags: AOILocalTag[];
  /** Optional CSS class name */
  className?: string;
  /** Callback when a local tag is selected */
  onTagSelect?: (tag: AOILocalTag) => void;
}

/** Column definitions for AOILocalTagTable */
const AOI_LOCAL_TAG_COLUMNS: ColumnDefinition<AOILocalTag>[] = [
  {
    key: 'name',
    header: 'Name',
    mono: true,
  },
  {
    key: 'dataType',
    header: 'Data Type',
    mono: true,
  },
  {
    key: 'dimensions',
    header: 'Dimensions',
    render: (tag) => (tag.dimensions ? `[${tag.dimensions}]` : '-'),
  },
  {
    key: 'radix',
    header: 'Style',
    render: (tag) => tag.radix ?? '-',
  },
  {
    key: 'externalAccess',
    header: 'Access',
    render: (tag) => tag.externalAccess ?? '-',
  },
  {
    key: 'description',
    header: 'Description',
    sortable: false,
    truncate: true,
    render: (tag) => tag.description ?? '-',
  },
];

/** Fields to include in filter search */
const FILTER_FIELDS: (keyof AOILocalTag)[] = ['name', 'dataType'];

/**
 * React component that renders a sortable, filterable table of AOI local tags.
 */
export function AOILocalTagTable({
  localTags,
  className = '',
  onTagSelect,
}: AOILocalTagTableProps) {
  return (
    <GenericTable<AOILocalTag>
      data={localTags}
      columns={AOI_LOCAL_TAG_COLUMNS}
      getRowKey={(tag) => tag.name}
      filterFields={FILTER_FIELDS}
      defaultSortKey="name"
      className={className}
      onRowSelect={onTagSelect}
      filterPlaceholder="Filter local tags..."
      itemLabel="local tags"
    />
  );
}
