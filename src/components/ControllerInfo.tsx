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
  const info = useMemo(() => {
    const vendorMeta = controller.vendorMetadata || {};
    
    // Get main routine name from first program
    const mainRoutineName = controller.programs.length > 0
      ? controller.programs[0].mainRoutineName
      : undefined;
    
    return {
      name: controller.name,
      description: controller.description || '',
      serialNumber: controller.serialNumber || '',
      createdDate: controller.createdDate?.toLocaleString() || '',
      modifiedDate: controller.modifiedDate?.toLocaleString() || '',
      // L5X-specific attributes
      softwareRevision: (vendorMeta.softwareRevision as string) || '',
      exportDate: (vendorMeta.exportDate as string) || '',
      targetName: (vendorMeta.targetName as string) || '',
      processorType: (vendorMeta.processorType as string) || '',
      targetType: (vendorMeta.targetType as string) || '',
      targetClass: (vendorMeta.targetClass as string) || '',
      mainRoutineName: mainRoutineName || '',
      firmwareRevision: vendorMeta.majorRev && vendorMeta.minorRev
        ? `${vendorMeta.majorRev}.${vendorMeta.minorRev}`
        : '',
      // Counts
      tagCount: controller.tags.length,
      dataTypeCount: controller.dataTypes.length,
      programCount: controller.programs.length,
      routineCount: controller.programs.reduce((sum, p) => sum + p.routines.length, 0),
      aoiCount: controller.aois.length,
      moduleCount: controller.modules.length,
    };
  }, [controller]);

  const cardStyle: React.CSSProperties = {
    padding: '16px',
    backgroundColor: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    marginBottom: '4px',
    fontSize: '13px',
    lineHeight: '1.6',
  };

  const labelStyle: React.CSSProperties = {
    minWidth: '140px',
    color: '#333',
  };

  const valueStyle: React.CSSProperties = {
    color: '#000',
  };

  const Property = ({ label, value }: { label: string; value: string | number }) => (
    <div style={rowStyle}>
      <span style={labelStyle}>{label}:</span>
      <span style={valueStyle}>{value}</span>
    </div>
  );

  return (
    <div className={`controller-info ${className}`} style={cardStyle}>
      <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '14px', fontWeight: 'normal' }}>
        Project Properties
      </h3>

      <Property label="Name" value={info.name} />
      {info.description && <Property label="Description" value={info.description} />}
      <Property label="Created" value={info.createdDate} />
      <Property label="Last Modified" value={info.modifiedDate} />
      <Property label="Processor Type" value={info.processorType} />
      <Property label="Target Name" value={info.targetName} />
      <Property label="Target Type" value={info.targetType} />
      <Property label="Target Class" value={info.targetClass} />
      <Property label="Software Revision" value={info.softwareRevision} />
      {info.firmwareRevision && <Property label="Firmware Revision" value={info.firmwareRevision} />}
      <Property label="Serial Number" value={info.serialNumber} />
      <Property label="Export Date" value={info.exportDate} />
      <Property label="Main Routine" value={info.mainRoutineName} />
      <Property label="Programs" value={info.programCount} />
      <Property label="Routines" value={info.routineCount} />
      <Property label="Tags" value={info.tagCount} />
      <Property label="Data Types" value={info.dataTypeCount} />
      <Property label="AOIs" value={info.aoiCount} />
      <Property label="I/O Modules" value={info.moduleCount} />
    </div>
  );
}

export default ControllerInfo;
