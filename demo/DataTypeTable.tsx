import React from 'react';
import type { DataType, DataTypeMember } from '../src/types';
import { GenericTable, type ColumnDefinition } from '../src/components/table/GenericTable';

export interface DataTypeTableProps {
  /** The data type to display */
  dataType: DataType;
  /** All data types for resolving nested types */
  allDataTypes: DataType[];
}

/**
 * Rockwell-style data type table component.
 * Displays data type members in Studio 5000's table format using GenericTable.
 */
export function DataTypeTable({ dataType }: DataTypeTableProps) {
  const columns: ColumnDefinition<DataTypeMember>[] = [
    {
      key: 'name',
      header: 'Name',
      sortKey: 'name',
      mono: true,
      render: (member) => member.name,
    },
    {
      key: 'dataType',
      header: 'Data Type',
      sortKey: 'dataType',
      mono: true,
      render: (member) => member.dataType,
    },
    {
      key: 'dimension',
      header: 'Dim',
      sortKey: 'dimension',
      mono: true,
      cellStyle: { textAlign: 'center' },
      render: (member) => (member.dimension > 0 ? `[${member.dimension}]` : ''),
    },
    {
      key: 'radix',
      header: 'Style',
      sortKey: 'radix',
      render: (member) => member.radix || '-',
    },
    {
      key: 'externalAccess',
      header: 'External Access',
      sortKey: 'externalAccess',
      render: (member) => member.externalAccess || '-',
    },
    {
      key: 'hidden',
      header: 'Hidden',
      sortable: false,
      cellStyle: { textAlign: 'center' },
      render: (member) => (member.hidden ? 'Yes' : ''),
    },
  ];

  return (
    <div style={styles.container}>
      {/* Members Table */}
      {dataType.members.length > 0 ? (
        <GenericTable<DataTypeMember>
          data={dataType.members}
          columns={columns}
          getRowKey={(member) => member.name}
          filterFields={['name', 'dataType', 'radix', 'externalAccess']}
          defaultSortKey="name"
          filterPlaceholder="Filter members..."
          itemLabel="members"
        />
      ) : (
        <div style={styles.noMembers}>
          <p>This is a primitive data type with no member structure.</p>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    fontSize: '13px',
  },
  noMembers: {
    padding: '24px',
    textAlign: 'center',
    color: '#666',
    backgroundColor: '#fafafa',
    borderTop: '1px solid #eee',
  },
};

export default DataTypeTable;
