import React, { useMemo } from 'react';
import type {
  NormalizedModule,
  ModulePort,
  ModuleConnection,
  EKeyState,
  PortType,
  ModuleCategory,
} from '../types';

export interface ModuleInfoTableProps {
  /** Module data */
  module: NormalizedModule;
  /** Optional CSS class name */
  className?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format EKey state for display
 */
function formatEKeyState(state: EKeyState | undefined): string {
  if (!state) return 'Not Specified';
  switch (state) {
    case 'ExactMatch':
      return 'Exact Match';
    case 'CompatibleModule':
      return 'Compatible Module';
    case 'Disabled':
      return 'Disabled';
    default:
      return state;
  }
}

/**
 * Format port type for display
 */
function formatPortType(type: PortType): string {
  switch (type) {
    case 'Ethernet':
      return 'Ethernet';
    case 'Backplane':
      return 'Backplane';
    case 'PointIO':
      return 'Point I/O';
    case 'Serial':
      return 'Serial';
    case 'USB':
      return 'USB';
    case 'ICP':
      return 'ICP (Backplane)';
    case 'Unknown':
      return 'Unknown';
    default:
      return type;
  }
}

/**
 * Format module category for display
 */
function formatModuleCategory(category: ModuleCategory | undefined): string {
  if (!category) return 'Unknown';
  switch (category) {
    case 'Processor':
      return 'Processor / Controller';
    case 'Communication':
      return 'Communication Module';
    case 'DigitalInput':
      return 'Digital Input';
    case 'DigitalOutput':
      return 'Digital Output';
    case 'DigitalCombo':
      return 'Digital I/O Combo';
    case 'AnalogInput':
      return 'Analog Input';
    case 'AnalogOutput':
      return 'Analog Output';
    case 'AnalogCombo':
      return 'Analog I/O Combo';
    case 'Motion':
      return 'Motion Controller';
    case 'Safety':
      return 'Safety Module';
    case 'Specialty':
      return 'Specialty Module';
    case 'Chassis':
      return 'Chassis';
    case 'Unknown':
      return 'Unknown';
    default:
      return category;
  }
}

/**
 * Format RPI in microseconds to a more readable format
 */
function formatRPI(rpiMicroseconds: number | undefined): string {
  if (rpiMicroseconds === undefined) return 'Not Set';
  if (rpiMicroseconds < 1000) {
    return `${rpiMicroseconds} µs`;
  } else if (rpiMicroseconds < 1000000) {
    return `${(rpiMicroseconds / 1000).toFixed(2)} ms`;
  } else {
    return `${(rpiMicroseconds / 1000000).toFixed(2)} s`;
  }
}

/**
 * Get category icon/badge color
 */
function getCategoryColor(category: ModuleCategory | undefined): string {
  switch (category) {
    case 'Processor':
      return '#4a7c59';
    case 'Communication':
      return '#2b579a';
    case 'DigitalInput':
      return '#28a745';
    case 'DigitalOutput':
      return '#dc3545';
    case 'DigitalCombo':
      return '#6f42c1';
    case 'AnalogInput':
      return '#17a2b8';
    case 'AnalogOutput':
      return '#fd7e14';
    case 'AnalogCombo':
      return '#20c997';
    case 'Motion':
      return '#6610f2';
    case 'Safety':
      return '#ffc107';
    case 'Specialty':
      return '#e83e8c';
    case 'Chassis':
      return '#6c757d';
    default:
      return '#888888';
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * React component that displays I/O module information.
 * Shows module identification, configuration, ports, and connections.
 */
export function ModuleInfoTable({ module, className = '' }: ModuleInfoTableProps) {
  const moduleInfo = useMemo(() => ({
    // Identification
    name: module.name,
    catalogNumber: module.catalogNumber || 'N/A',
    description: module.description,
    category: module.category,
    
    // Vendor/Product Info
    vendorId: module.vendorId,
    productType: module.productType,
    productCode: module.productCode,
    firmwareRevision: module.majorRevision !== undefined && module.minorRevision !== undefined
      ? `${module.majorRevision}.${module.minorRevision}`
      : undefined,
    
    // Hierarchy
    slot: module.slot,
    parentModuleName: module.parentModuleName,
    parentPortId: module.parentPortId,
    
    // Configuration
    inhibited: module.inhibited,
    majorFault: module.majorFault,
    safetyEnabled: module.safetyEnabled,
    eKeyState: module.eKeyState,
    
    // Ports and Connections
    ports: module.ports,
    connections: module.connections,
    
    // Metadata
    usage: module.usage,
  }), [module]);

  // Styles
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '16px',
    backgroundColor: '#fff',
    overflow: 'auto',
  };

  const sectionStyle: React.CSSProperties = {
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
    overflow: 'hidden',
  };

  const sectionHeaderStyle: React.CSSProperties = {
    padding: '10px 12px',
    backgroundColor: '#f5f5f5',
    borderBottom: '1px solid #e0e0e0',
    fontWeight: 600,
    fontSize: '13px',
    color: '#333',
  };

  const sectionContentStyle: React.CSSProperties = {
    padding: '12px',
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    marginBottom: '6px',
    fontSize: '13px',
    lineHeight: '1.6',
  };

  const labelStyle: React.CSSProperties = {
    minWidth: '160px',
    color: '#666',
    fontWeight: 500,
  };

  const valueStyle: React.CSSProperties = {
    color: '#000',
    flex: 1,
  };

  const badgeStyle: React.CSSProperties = {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '3px',
    fontSize: '11px',
    fontWeight: 600,
    color: '#fff',
  };

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '12px',
  };

  const thStyle: React.CSSProperties = {
    padding: '8px',
    textAlign: 'left',
    backgroundColor: '#f9f9f9',
    borderBottom: '2px solid #e0e0e0',
    fontWeight: 600,
    color: '#333',
  };

  const tdStyle: React.CSSProperties = {
    padding: '8px',
    borderBottom: '1px solid #e0e0e0',
    verticalAlign: 'top',
  };

  const Property = ({ label, value, badge }: { label: string; value: React.ReactNode; badge?: boolean }) => (
    <div style={rowStyle}>
      <span style={labelStyle}>{label}:</span>
      <span style={valueStyle}>{badge ? value : value}</span>
    </div>
  );

  const StatusBadge = ({ active, trueLabel, falseLabel }: { active: boolean; trueLabel: string; falseLabel: string }) => (
    <span style={{
      ...badgeStyle,
      backgroundColor: active ? '#28a745' : '#6c757d',
    }}>
      {active ? trueLabel : falseLabel}
    </span>
  );

  return (
    <div className={`module-info-table ${className}`} style={containerStyle}>
      {/* Module Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <div style={{
          width: '48px',
          height: '48px',
          backgroundColor: getCategoryColor(moduleInfo.category),
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <svg width="28" height="28" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="3" width="12" height="10" rx="1" fill="rgba(255,255,255,0.9)" stroke="rgba(0,0,0,0.3)" strokeWidth="0.5"/>
            <circle cx="5" cy="6" r="1" fill="#32CD32"/>
            <circle cx="8" cy="6" r="1" fill="#32CD32"/>
            <circle cx="11" cy="6" r="1" fill="#FFD700"/>
            <rect x="4" y="9" width="2" height="2" fill="#333"/>
            <rect x="7" y="9" width="2" height="2" fill="#333"/>
            <rect x="10" y="9" width="2" height="2" fill="#333"/>
          </svg>
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{moduleInfo.name}</h2>
          <div style={{ fontSize: '13px', color: '#666', marginTop: '2px' }}>
            {moduleInfo.catalogNumber}
            {moduleInfo.slot !== undefined && <span> • Slot {moduleInfo.slot}</span>}
          </div>
        </div>
        {moduleInfo.category && (
          <span style={{
            ...badgeStyle,
            backgroundColor: getCategoryColor(moduleInfo.category),
            marginLeft: 'auto',
          }}>
            {formatModuleCategory(moduleInfo.category)}
          </span>
        )}
      </div>

      {/* Module Identification */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>Module Identification</div>
        <div style={sectionContentStyle}>
          <Property label="Name" value={moduleInfo.name} />
          <Property label="Catalog Number" value={moduleInfo.catalogNumber} />
          {moduleInfo.description && <Property label="Description" value={moduleInfo.description} />}
          <Property label="Category" value={formatModuleCategory(moduleInfo.category)} />
          {moduleInfo.vendorId !== undefined && (
            <Property label="Vendor ID" value={moduleInfo.vendorId === 1 ? '1 (Rockwell Automation)' : moduleInfo.vendorId} />
          )}
          {moduleInfo.productType !== undefined && <Property label="Product Type" value={moduleInfo.productType} />}
          {moduleInfo.productCode !== undefined && <Property label="Product Code" value={moduleInfo.productCode} />}
          {moduleInfo.firmwareRevision && <Property label="Firmware Revision" value={moduleInfo.firmwareRevision} />}
        </div>
      </div>

      {/* Hierarchy */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>Hierarchy & Location</div>
        <div style={sectionContentStyle}>
          {moduleInfo.slot !== undefined && <Property label="Slot Number" value={moduleInfo.slot} />}
          {moduleInfo.parentModuleName && <Property label="Parent Module" value={moduleInfo.parentModuleName} />}
          {moduleInfo.parentPortId !== undefined && <Property label="Parent Port ID" value={moduleInfo.parentPortId} />}
          {moduleInfo.usage && <Property label="Usage" value={moduleInfo.usage} />}
        </div>
      </div>

      {/* Configuration */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>Configuration</div>
        <div style={sectionContentStyle}>
          <div style={rowStyle}>
            <span style={labelStyle}>Electronic Keying:</span>
            <span style={valueStyle}>
              <span style={{
                ...badgeStyle,
                backgroundColor: moduleInfo.eKeyState === 'Disabled' ? '#dc3545' : 
                                moduleInfo.eKeyState === 'ExactMatch' ? '#28a745' : '#ffc107',
                color: moduleInfo.eKeyState === 'CompatibleModule' ? '#000' : '#fff',
              }}>
                {formatEKeyState(moduleInfo.eKeyState)}
              </span>
            </span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Inhibited:</span>
            <span style={valueStyle}>
              <StatusBadge active={moduleInfo.inhibited} trueLabel="Yes" falseLabel="No" />
            </span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Major Fault on Failure:</span>
            <span style={valueStyle}>
              <StatusBadge active={moduleInfo.majorFault} trueLabel="Yes" falseLabel="No" />
            </span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Safety Enabled:</span>
            <span style={valueStyle}>
              <StatusBadge active={moduleInfo.safetyEnabled} trueLabel="Yes" falseLabel="No" />
            </span>
          </div>
        </div>
      </div>

      {/* Ports */}
      {moduleInfo.ports.length > 0 && (
        <div style={sectionStyle}>
          <div style={sectionHeaderStyle}>Port Configuration</div>
          <div style={sectionContentStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Port ID</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Address</th>
                  <th style={thStyle}>Direction</th>
                  <th style={thStyle}>Bus Size</th>
                </tr>
              </thead>
              <tbody>
                {moduleInfo.ports.map((port: ModulePort) => (
                  <tr key={port.id}>
                    <td style={tdStyle}>{port.id}</td>
                    <td style={tdStyle}>
                      <span style={{
                        ...badgeStyle,
                        backgroundColor: port.type === 'Ethernet' ? '#17a2b8' :
                                        port.type === 'Backplane' ? '#6c757d' :
                                        port.type === 'PointIO' ? '#28a745' :
                                        '#888888',
                        fontSize: '10px',
                        padding: '1px 6px',
                      }}>
                        {formatPortType(port.type)}
                      </span>
                    </td>
                    <td style={tdStyle}>{port.address || '—'}</td>
                    <td style={tdStyle}>{port.upstream ? 'Upstream' : 'Downstream'}</td>
                    <td style={tdStyle}>{port.busSize !== undefined ? `${port.busSize} slots` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Connections */}
      {moduleInfo.connections.length > 0 && (
        <div style={sectionStyle}>
          <div style={sectionHeaderStyle}>I/O Connections</div>
          <div style={sectionContentStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Connection Name</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>RPI</th>
                  <th style={thStyle}>Input Data Type</th>
                  <th style={thStyle}>Output Data Type</th>
                  <th style={thStyle}>Unicast</th>
                </tr>
              </thead>
              <tbody>
                {moduleInfo.connections.map((conn: ModuleConnection, index: number) => (
                  <tr key={conn.name || index}>
                    <td style={tdStyle}>{conn.name || '—'}</td>
                    <td style={tdStyle}>{conn.type || '—'}</td>
                    <td style={tdStyle}>
                      <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                        {formatRPI(conn.rpiMicroseconds)}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <code style={{ fontSize: '11px', backgroundColor: '#f5f5f5', padding: '1px 4px', borderRadius: '2px' }}>
                        {conn.inputDataType || '—'}
                      </code>
                    </td>
                    <td style={tdStyle}>
                      <code style={{ fontSize: '11px', backgroundColor: '#f5f5f5', padding: '1px 4px', borderRadius: '2px' }}>
                        {conn.outputDataType || '—'}
                      </code>
                    </td>
                    <td style={tdStyle}>{conn.unicast !== undefined ? (conn.unicast ? 'Yes' : 'No') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state for no ports/connections */}
      {moduleInfo.ports.length === 0 && moduleInfo.connections.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '20px',
          color: '#666',
          fontSize: '13px',
          backgroundColor: '#f9f9f9',
          borderRadius: '4px',
        }}>
          No port or connection configuration available for this module.
        </div>
      )}
    </div>
  );
}

export default ModuleInfoTable;
