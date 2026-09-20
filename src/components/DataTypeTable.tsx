import React from 'react';
import type {
  DataTypeCategory,
  NormalizedDataType,
  NormalizedDataTypeMember,
} from '../types';
import { tableStyles } from './table/tableStyles';

export interface DataTypeTableProps {
  dataType: NormalizedDataType;
  allDataTypes?: NormalizedDataType[];
  onDataTypeSelect?: (dataType: NormalizedDataType) => void;
  className?: string;
}

const CATEGORY_LABELS: Record<DataTypeCategory, string> = {
  UserDefined: 'User Defined',
  String: 'String',
  AddOnDefined: 'Add-On Defined',
  Predefined: 'Predefined',
  ModuleDefined: 'Module Defined',
};

export function DataTypeTable({
  dataType,
  allDataTypes = [],
  onDataTypeSelect,
  className = '',
}: DataTypeTableProps) {
  const hasAOIMetadata = dataType.members.some(
    (member) => member.usage !== undefined || member.required !== undefined || member.visible !== undefined
  );
  const category = dataType.category ?? inferCategory(dataType);

  const renderTypeReference = (member: NormalizedDataTypeMember): React.ReactNode => {
    const target = allDataTypes.find(
      (candidate) => candidate.name === member.dataType && candidate.name !== dataType.name
    );
    if (!target || !onDataTypeSelect) return member.dataType;
    return (
      <button
        type="button"
        onClick={() => onDataTypeSelect(target)}
        style={styles.typeLink}
        title={`Open ${target.name}`}
      >
        {member.dataType}
      </button>
    );
  };

  return (
    <div className={className} style={styles.container}>
      <div style={styles.summary}>
        <div style={styles.titleRow}>
          <h2 style={styles.title}>{dataType.name}</h2>
          <span style={styles.category}>{CATEGORY_LABELS[category]}</span>
        </div>
        {dataType.description ? <p style={styles.description}>{dataType.description}</p> : null}
        <dl style={styles.metadata}>
          <Metadata label="Class" value={dataType.class} />
          <Metadata label="Family" value={dataType.family ?? '—'} />
          <Metadata label="Structure" value={formatResolution(dataType)} />
          {dataType.provenance?.length ? (
            <Metadata label="Source" value={dataType.provenance.join(', ')} />
          ) : null}
        </dl>
      </div>

      {dataType.members.length ? (
        <div style={tableStyles.tableContainer}>
          <table style={tableStyles.table}>
            <thead style={tableStyles.stickyThead}>
              <tr>
                <Header>Name</Header>
                <Header>Data Type</Header>
                <Header>Dimensions</Header>
                <Header>Style</Header>
                <Header>External Access</Header>
                <Header>Hidden</Header>
                {hasAOIMetadata ? <Header>Usage</Header> : null}
                {hasAOIMetadata ? <Header>Required</Header> : null}
                {hasAOIMetadata ? <Header>Visible</Header> : null}
                {hasAOIMetadata ? <Header>Default</Header> : null}
                <Header>Description</Header>
              </tr>
            </thead>
            <tbody>
              {dataType.members.map((member, index) => (
                <tr key={`${member.name}-${index}`}>
                  <Cell mono>{member.name}</Cell>
                  <Cell mono>{renderTypeReference(member)}</Cell>
                  <Cell mono>{formatDimensions(member)}</Cell>
                  <Cell>{member.radix ?? '—'}</Cell>
                  <Cell>{member.externalAccess ?? '—'}</Cell>
                  <Cell>{formatBoolean(member.hidden)}</Cell>
                  {hasAOIMetadata ? <Cell>{member.usage ?? '—'}</Cell> : null}
                  {hasAOIMetadata ? <Cell>{formatBoolean(member.required)}</Cell> : null}
                  {hasAOIMetadata ? <Cell>{formatBoolean(member.visible)}</Cell> : null}
                  {hasAOIMetadata ? <Cell>{formatDefaultValue(member.defaultValue)}</Cell> : null}
                  <Cell>{member.description ?? '—'}</Cell>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={styles.emptyState}>{emptyStateText(dataType)}</div>
      )}
    </div>
  );
}

function Metadata({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.metadataItem}>
      <dt style={styles.metadataLabel}>{label}</dt>
      <dd style={styles.metadataValue}>{value}</dd>
    </div>
  );
}

function Header({ children }: { children: React.ReactNode }) {
  return <th style={{ ...tableStyles.header, ...tableStyles.stickyHeader }}>{children}</th>;
}

function Cell({ children, mono = false }: { children: React.ReactNode; mono?: boolean }) {
  return <td style={{ ...tableStyles.cell, ...(mono ? tableStyles.monoCell : {}) }}>{children}</td>;
}

function inferCategory(dataType: NormalizedDataType): DataTypeCategory {
  if (dataType.family === 'StringFamily') return 'String';
  if (dataType.class === 'AddOnDefined') return 'AddOnDefined';
  if (dataType.class === 'ModuleDefined') return 'ModuleDefined';
  if (dataType.class === 'User') return 'UserDefined';
  return 'Predefined';
}

function formatDimensions(member: NormalizedDataTypeMember): string {
  const dimensions = member.dimensions?.length
    ? member.dimensions
    : member.dimension > 0
      ? [member.dimension]
      : [];
  return dimensions.length ? `[${dimensions.join(',')}]` : '—';
}

function formatBoolean(value: boolean | undefined): string {
  if (value === undefined) return '—';
  return value ? 'Yes' : 'No';
}

function formatDefaultValue(value: unknown): string {
  if (value === undefined) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return 'Available';
  }
}

function formatResolution(dataType: NormalizedDataType): string {
  switch (dataType.resolution) {
    case 'Declared':
      return 'Declared in L5X';
    case 'Inferred':
      return 'Inferred from decorated data';
    case 'Atomic':
      return 'Atomic';
    case 'Conflict':
      return 'Inferred with conflicting observations';
    case 'Unresolved':
      return 'Referenced; structure unavailable';
    default:
      return dataType.members.length ? 'Available' : 'Unavailable';
  }
}

function emptyStateText(dataType: NormalizedDataType): string {
  if (dataType.resolution === 'Atomic') return 'This is an atomic data type with no member structure.';
  if (dataType.resolution === 'Unresolved') {
    return 'This data type is referenced by the project, but its member structure is not included in the L5X export.';
  }
  return 'No members are defined for this data type.';
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    height: '100%',
    gap: '12px',
    color: 'var(--lv-text-primary, #1e1e1e)',
    fontFamily: 'var(--lv-font-family, "Segoe UI", sans-serif)',
  },
  summary: {
    flexShrink: 0,
    padding: '12px',
    border: '1px solid var(--lv-border-default, #e0e0e0)',
    background: 'var(--lv-bg-secondary, #f5f5f5)',
  },
  titleRow: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' },
  title: { margin: 0, fontSize: '16px', fontWeight: 600 },
  category: {
    padding: '2px 7px',
    border: '1px solid var(--lv-border-strong, #c0c0c0)',
    borderRadius: '2px',
    fontSize: '11px',
    color: 'var(--lv-text-secondary, #666666)',
  },
  description: { margin: '8px 0 0', color: 'var(--lv-text-secondary, #666666)' },
  metadata: { display: 'flex', flexWrap: 'wrap', gap: '8px 20px', margin: '10px 0 0' },
  metadataItem: { display: 'flex', gap: '6px', minWidth: '160px' },
  metadataLabel: { fontWeight: 600, color: 'var(--lv-text-secondary, #666666)' },
  metadataValue: { margin: 0, overflowWrap: 'anywhere' },
  typeLink: {
    padding: 0,
    border: 0,
    background: 'transparent',
    color: 'var(--ladder-power-rail-color, #3366cc)',
    cursor: 'pointer',
    font: 'inherit',
    textDecoration: 'underline',
  },
  emptyState: {
    padding: '24px',
    textAlign: 'center',
    color: 'var(--lv-text-secondary, #666666)',
    border: '1px solid var(--lv-border-default, #e0e0e0)',
    background: 'var(--lv-bg-secondary, #f5f5f5)',
  },
};

export default DataTypeTable;
