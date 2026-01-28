import React, { useMemo } from 'react';
import type { NormalizedController } from '../types';

export interface ControllerInfoProps {
  /** Controller data */
  controller: NormalizedController;
  /** Optional CSS class name */
  className?: string;
}

/**
 * React component that displays controller metadata.
 */
export function ControllerInfo({ controller, className = '' }: ControllerInfoProps) {
  const info = useMemo(() => ({
    name: controller.name,
    serialNumber: controller.serialNumber || '-',
    createdDate: controller.createdDate?.toISOString().split('T')[0] || '-',
    modifiedDate: controller.modifiedDate?.toISOString().split('T')[0] || '-',
    vendor: controller.vendor,
    tagCount: controller.tags.length,
    dataTypeCount: controller.dataTypes.length,
    programCount: controller.programs.length,
    routineCount: controller.programs.reduce((sum, p) => sum + p.routines.length, 0),
    rungCount: controller.programs.reduce(
      (sum, p) => sum + p.routines.reduce((rs, r) => rs + r.rungs.length, 0),
      0
    ),
    moduleCount: controller.modules.length,
  }), [controller]);

  const cardStyle: React.CSSProperties = {
    padding: '16px',
    backgroundColor: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#666',
    marginBottom: '4px',
  };

  const valueStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 500,
    marginBottom: '12px',
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  };

  const statStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '12px',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
  };

  const statValueStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
  };

  const statLabelStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#666',
    marginTop: '4px',
  };

  return (
    <div className={`controller-info ${className}`} style={cardStyle}>
      <h2 style={{ marginTop: 0, marginBottom: '16px', fontSize: '18px' }}>
        Controller Information
      </h2>

      <div style={gridStyle}>
        <div>
          <div style={labelStyle}>Name</div>
          <div style={valueStyle}>{info.name}</div>
        </div>

        <div>
          <div style={labelStyle}>Serial Number</div>
          <div style={valueStyle}>{info.serialNumber}</div>
        </div>

        <div>
          <div style={labelStyle}>Created</div>
          <div style={valueStyle}>{info.createdDate}</div>
        </div>

        <div>
          <div style={labelStyle}>Modified</div>
          <div style={valueStyle}>{info.modifiedDate}</div>
        </div>

        <div>
          <div style={labelStyle}>Vendor</div>
          <div style={valueStyle}>{info.vendor}</div>
        </div>
      </div>

      <h3 style={{ marginTop: '24px', marginBottom: '12px', fontSize: '16px' }}>
        Statistics
      </h3>

      <div style={{ ...gridStyle, gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
        <div style={statStyle}>
          <div style={statValueStyle}>{info.tagCount}</div>
          <div style={statLabelStyle}>Tags</div>
        </div>

        <div style={statStyle}>
          <div style={statValueStyle}>{info.dataTypeCount}</div>
          <div style={statLabelStyle}>Data Types</div>
        </div>

        <div style={statStyle}>
          <div style={statValueStyle}>{info.programCount}</div>
          <div style={statLabelStyle}>Programs</div>
        </div>

        <div style={statStyle}>
          <div style={statValueStyle}>{info.routineCount}</div>
          <div style={statLabelStyle}>Routines</div>
        </div>

        <div style={statStyle}>
          <div style={statValueStyle}>{info.rungCount}</div>
          <div style={statLabelStyle}>Rungs</div>
        </div>

        <div style={statStyle}>
          <div style={statValueStyle}>{info.moduleCount}</div>
          <div style={statLabelStyle}>I/O Modules</div>
        </div>
      </div>
    </div>
  );
}

export default ControllerInfo;
