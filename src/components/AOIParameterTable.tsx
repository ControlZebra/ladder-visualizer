import type { AOIParameter } from '../types';
import { GenericTable, type ColumnDefinition } from './table';

export interface AOIParameterTableProps {
  /** Array of parameters to display */
  parameters: AOIParameter[];
  /** Optional CSS class name */
  className?: string;
  /** Callback when a parameter is selected */
  onParameterSelect?: (param: AOIParameter) => void;
}

/** Windows 10 style checkbox */
function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: '13px',
        height: '13px',
        border: '1px solid #999',
        borderRadius: '2px',
        backgroundColor: checked ? '#0078d4' : '#fff',
        position: 'relative',
        verticalAlign: 'middle',
      }}
    >
      {checked && (
        <span
          style={{
            position: 'absolute',
            left: '3px',
            top: '0px',
            width: '4px',
            height: '8px',
            border: 'solid #fff',
            borderWidth: '0 2px 2px 0',
            transform: 'rotate(45deg)',
          }}
        />
      )}
    </span>
  );
}

/** Column definitions for AOIParameterTable */
const AOI_PARAMETER_COLUMNS: ColumnDefinition<AOIParameter>[] = [
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
    key: 'usage',
    header: 'Usage',
    render: (param) => param.usage,
  },
  {
    key: 'required',
    header: 'Required',
    render: (param) => <Checkbox checked={param.required} />,
  },
  {
    key: 'visible',
    header: 'Visible',
    render: (param) => <Checkbox checked={param.visible} />,
  },
  {
    key: 'externalAccess',
    header: 'Access',
    render: (param) => param.externalAccess ?? '-',
  },
  {
    key: 'description',
    header: 'Description',
    sortable: false,
    truncate: true,
    render: (param) => param.description ?? '-',
  },
];

/** Fields to include in filter search */
const FILTER_FIELDS: (keyof AOIParameter)[] = ['name', 'dataType', 'usage'];

/**
 * React component that renders a sortable, filterable table of AOI parameters.
 */
export function AOIParameterTable({
  parameters,
  className = '',
  onParameterSelect,
}: AOIParameterTableProps) {
  return (
    <GenericTable<AOIParameter>
      data={parameters}
      columns={AOI_PARAMETER_COLUMNS}
      getRowKey={(param) => param.name}
      filterFields={FILTER_FIELDS}
      defaultSortKey="name"
      className={className}
      onRowSelect={onParameterSelect}
      filterPlaceholder="Filter parameters..."
      itemLabel="parameters"
    />
  );
}
