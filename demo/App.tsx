import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  parseControllerExport,
  parseRoutine,
  parseFile,
  VirtualizedLadderDiagram,
  TagTable,
  ControllerInfo,
  ProgramNavigator,
} from '../src';
import type { 
  ControllerExport, 
  Routine, 
  ParsedRoutine, 
  DataType,
  NormalizedController,
  NormalizedRoutine,
  NormalizedTag,
  NormalizedDataType,
} from '../src';
import { DataTypeTable } from './DataTypeTable';

// Import the sample data
import controllerData from '../examples/controller_output.json';

// View types for main content area
type MainViewType = 'routine' | 'controller-tags' | 'program-tags' | 'controller-info' | 'data-type';

// Source type for the loaded data
type DataSource = 'demo' | 'file';

// Unified controller type that can handle both legacy and normalized data
interface UnifiedController {
  source: DataSource;
  legacy?: ControllerExport;
  normalized?: NormalizedController;
  fileName?: string;
}

/**
 * Convert NormalizedTag to legacy Tag format for TagTable compatibility
 */
function normalizedTagToLegacy(tag: NormalizedTag): { 
  name: string; 
  data_type: string; 
  tag_type: string;
  description?: string;
} {
  return {
    name: tag.name,
    data_type: tag.dataType,
    tag_type: tag.tagType,
    description: tag.description,
  };
}

/**
 * Convert NormalizedDataType to legacy DataType format for DataTypeTable compatibility
 */
function normalizedDataTypeToLegacy(dt: NormalizedDataType): DataType {
  return {
    name: dt.name,
    family: dt.family || 'NoFamily',
    cls: dt.class === 'User' ? 'User' : 'ProductDefined',
    members: (dt.members || []).map(m => ({
      name: m.name,
      data_type: m.dataType,
      dimension: m.dimension || 0,
      radix: m.radix || 'Decimal',
      hidden: m.hidden || false,
      external_access: m.externalAccess || 'ReadWrite',
    })),
  };
}

/**
 * Convert NormalizedRoutine to ParsedRoutine format for VirtualizedLadderDiagram
 */
function normalizedRoutineToParsed(routine: NormalizedRoutine): ParsedRoutine {
  return {
    name: routine.name,
    type: routine.type,
    rungs: routine.rungs.map(rung => ({
      raw: rung.raw,
      instructions: rung.instructions,
      elements: rung.elements,
    })),
  };
}

export default function App() {
  // Unified controller state that handles both legacy and normalized data
  const [unifiedController, setUnifiedController] = useState<UnifiedController | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRoutine, setSelectedRoutine] = useState<{
    programIndex: number;
    routineIndex: number;
  } | null>(null);
  const [selectedProgramIndex, setSelectedProgramIndex] = useState<number | null>(null);
  const [selectedDataType, setSelectedDataType] = useState<DataType | null>(null);
  const [mainViewType, setMainViewType] = useState<MainViewType>('routine');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load demo data on mount
  useEffect(() => {
    try {
      const parsed = parseControllerExport(controllerData);
      setUnifiedController({
        source: 'demo',
        legacy: parsed,
      });
      // Select first routine by default
      if (parsed.programs.length > 0 && parsed.programs[0].routines.length > 0) {
        setSelectedRoutine({ programIndex: 0, routineIndex: 0 });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse controller data');
    }
  }, []);

  /**
   * Handle file upload - supports both JSON and L5X formats
   */
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    
    try {
      const result = await parseFile(file);
      
      if (result.success && result.data) {
        setUnifiedController({
          source: 'file',
          normalized: result.data,
          fileName: file.name,
        });
        setSelectedDataType(null);
        setSelectedProgramIndex(null);
        setMainViewType('routine');
        
        // Select first routine by default
        if (result.data.programs.length > 0 && result.data.programs[0].routines.length > 0) {
          setSelectedRoutine({ programIndex: 0, routineIndex: 0 });
        } else {
          setSelectedRoutine(null);
        }
      } else {
        const errorMsg = result.errors?.map(e => e.message).join(', ') || 'Failed to parse file';
        setError(errorMsg);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setIsLoading(false);
      // Reset file input to allow re-uploading the same file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, []);

  /**
   * Load demo data (reset to default)
   */
  const handleLoadDemo = useCallback(() => {
    try {
      const parsed = parseControllerExport(controllerData);
      setUnifiedController({
        source: 'demo',
        legacy: parsed,
      });
      setError(null);
      setSelectedDataType(null);
      setSelectedProgramIndex(null);
      setMainViewType('routine');
      
      if (parsed.programs.length > 0 && parsed.programs[0].routines.length > 0) {
        setSelectedRoutine({ programIndex: 0, routineIndex: 0 });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load demo data');
    }
  }, []);

  // Get controller for legacy components (adapter)
  const legacyController: ControllerExport | null = useMemo(() => {
    if (!unifiedController) return null;
    
    if (unifiedController.source === 'demo' && unifiedController.legacy) {
      return unifiedController.legacy;
    }
    
    // Convert normalized to legacy format for ProgramNavigator and ControllerInfo
    if (unifiedController.source === 'file' && unifiedController.normalized) {
      const normalized = unifiedController.normalized;
      return {
        serial_number: normalized.serialNumber || '',
        comm_path: normalized.commPath || '',
        created_date: normalized.createdDate?.toISOString() || '',
        modified_date: normalized.modifiedDate?.toISOString() || '',
        sfc_execution_control: 'CurrentActive',
        sfc_restart_position: 'MostRecent',
        sfc_last_scan: 'DontScan',
        data_types: normalized.dataTypes.map(normalizedDataTypeToLegacy),
        tags: normalized.tags.map(normalizedTagToLegacy) as ControllerExport['tags'],
        aois: normalized.aois.map(aoi => ({
          name: aoi.name,
          description: aoi.description,
          revision: aoi.revision,
          vendor: aoi.vendor,
        })),
        map_devices: normalized.modules.map(mod => ({
          module_id: mod.id,
          parent_module: mod.parentId ?? 0,
          slot_no: mod.slot ?? 0,
          vendor_id: mod.vendorId ?? 0,
          product_type: mod.productType ?? 0,
          product_code: mod.productCode ?? 0,
          comments: mod.comments ?? [],
        })),
        programs: normalized.programs.map(prog => ({
          name: prog.name,
          tags: prog.tags.map(normalizedTagToLegacy) as ControllerExport['tags'],
          routines: prog.routines.map(routine => ({
            name: routine.name,
            type: routine.type,
            rungs: routine.rungs.map(r => r.raw),
          })),
        })),
      };
    }
    
    return null;
  }, [unifiedController]);

  // Parse the selected routine
  const parsedRoutine: ParsedRoutine | null = useMemo(() => {
    if (!unifiedController || !selectedRoutine) return null;
    
    if (unifiedController.source === 'demo' && unifiedController.legacy) {
      const routine = unifiedController.legacy.programs[selectedRoutine.programIndex]?.routines[selectedRoutine.routineIndex];
      if (!routine) return null;
      return parseRoutine(routine);
    }
    
    if (unifiedController.source === 'file' && unifiedController.normalized) {
      const routine = unifiedController.normalized.programs[selectedRoutine.programIndex]?.routines[selectedRoutine.routineIndex];
      if (!routine) return null;
      return normalizedRoutineToParsed(routine);
    }
    
    return null;
  }, [unifiedController, selectedRoutine]);

  // Get program tags if viewing program tags - memoized to prevent recalculation
  const programTags = useMemo(() => {
    if (selectedProgramIndex === null || !legacyController) return [];
    return legacyController.programs[selectedProgramIndex]?.tags || [];
  }, [legacyController, selectedProgramIndex]);

  // Get program name
  const programName = useMemo(() => {
    if (selectedProgramIndex === null) return '';
    return selectedProgramIndex === 0 ? 'MainProgram' : `Program_${selectedProgramIndex + 1}`;
  }, [selectedProgramIndex]);

  const handleRoutineSelect = useCallback((programIndex: number, routineIndex: number, _routine: Routine) => {
    setSelectedRoutine({ programIndex, routineIndex });
    setMainViewType('routine'); // Switch to routine view when selecting a routine
  }, []);

  const handleControllerTagsSelect = useCallback(() => {
    setMainViewType('controller-tags');
  }, []);

  const handleProgramTagsSelect = useCallback((programIndex: number) => {
    setSelectedProgramIndex(programIndex);
    setMainViewType('program-tags');
  }, []);

  const handleControllerInfoSelect = useCallback(() => {
    setMainViewType('controller-info');
  }, []);

  const handleDataTypeSelect = useCallback((dataType: DataType) => {
    setSelectedDataType(dataType);
    setMainViewType('data-type');
  }, []);

  // Render main content based on view type
  const renderMainContent = () => {
    if (!legacyController) return null;

    switch (mainViewType) {
      case 'controller-tags':
        return (
          <>
            <div style={styles.routineTitle}>
              <span style={{ fontWeight: 600 }}>Controller Tags</span>
              <span style={styles.routineCount}>{legacyController.tags.length} tags</span>
            </div>
            <div style={styles.infoPanelContent}>
              <TagTable tags={legacyController.tags} />
            </div>
          </>
        );
      case 'program-tags':
        return (
          <>
            <div style={styles.routineTitle}>
              <span style={{ fontWeight: 600 }}>{programName} Tags</span>
              <span style={styles.routineCount}>{programTags.length} tags</span>
            </div>
            <div style={styles.infoPanelContent}>
              {programTags.length > 0 ? (
                <TagTable tags={programTags} />
              ) : (
                <p style={styles.noSelection}>No program-specific tags defined</p>
              )}
            </div>
          </>
        );
      case 'controller-info':
        return (
          <>
            <div style={styles.routineTitle}>
              <span style={{ fontWeight: 600 }}>Controller Info</span>
            </div>
            <div style={styles.infoPanelContent}>
              <ControllerInfo controller={legacyController} />
            </div>
          </>
        );
      case 'data-type':
        if (selectedDataType) {
          return (
            <>
              <div style={styles.routineTitle}>
                <span style={{ fontWeight: 600 }}>Data Type: {selectedDataType.name}</span>
              </div>
              <div style={styles.infoPanelContent}>
                <DataTypeTable dataType={selectedDataType} allDataTypes={legacyController.data_types} />
              </div>
            </>
          );
        }
        return <p style={styles.noSelection}>Select a data type from the Controller Organizer</p>;
      case 'routine':
      default:
        if (parsedRoutine) {
          return (
            <>
              <div style={styles.routineTitle}>
                <span style={{ fontWeight: 600 }}>{parsedRoutine.name}</span>
                <span style={styles.routineBadge}>{parsedRoutine.type}</span>
                <span style={styles.routineCount}>{parsedRoutine.rungs.length} rungs</span>
              </div>
              <div style={styles.ladderContent}>
                <VirtualizedLadderDiagram
                  routine={parsedRoutine}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            </>
          );
        }
        return <p style={styles.noSelection}>Select a routine from the Controller Organizer</p>;
    }
  };

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <h1 style={styles.errorTitle}>Error Loading Controller Data</h1>
        <p style={styles.errorMessage}>{error}</p>
        <div style={styles.errorActions}>
          <button style={styles.button} onClick={handleLoadDemo}>
            Load Demo Data
          </button>
          <label style={styles.buttonLabel}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json,.l5x,.L5X"
              style={{ display: 'none' }}
            />
            <span style={styles.button}>Upload File</span>
          </label>
        </div>
      </div>
    );
  }

  if (!legacyController || isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <p>{isLoading ? 'Parsing file...' : 'Loading controller data...'}</p>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      {/* Header with file controls */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>Ladder Logic Visualizer</h1>
          {unifiedController?.source === 'file' && unifiedController.fileName && (
            <span style={styles.fileName}>{unifiedController.fileName}</span>
          )}
          {unifiedController?.source === 'demo' && (
            <span style={styles.fileName}>Demo Data</span>
          )}
        </div>
        <div style={styles.headerRight}>
          <button style={styles.headerButton} onClick={handleLoadDemo}>
            Load Demo
          </button>
          <label style={styles.uploadLabel}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json,.l5x,.L5X"
              style={{ display: 'none' }}
            />
            <span style={styles.headerButton}>Upload File</span>
          </label>
          <span style={styles.formatHint}>.json, .l5x</span>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        <div style={styles.ladderLayout}>
          {/* Sidebar */}
          <aside style={styles.sidebar}>
            <ProgramNavigator
              controller={legacyController}
              programs={legacyController.programs}
              selectedRoutine={selectedRoutine ?? undefined}
              onRoutineSelect={handleRoutineSelect}
              onControllerTagsSelect={handleControllerTagsSelect}
              onProgramTagsSelect={handleProgramTagsSelect}
              onControllerInfoSelect={handleControllerInfoSelect}
              onDataTypeSelect={handleDataTypeSelect}
            />
          </aside>

          {/* Main Content Area */}
          <div style={styles.diagramContainer}>
            {renderMainContent()}
          </div>
        </div>
      </main>
    </div>
  );
}

// Studio 5000-inspired color scheme
const colors = {
  primary: '#2b579a',        // Deep blue (Studio 5000 accent)
  primaryDark: '#1e3f6f',    // Darker blue for header
  secondary: '#4a7c59',      // Green accent (for controller icon)
  background: '#e8e8e8',     // Light gray background
  surface: '#ffffff',        // White surface
  border: '#c0c0c0',         // Gray border
  text: '#333333',           // Dark text
  textLight: '#666666',      // Light text
};

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    backgroundColor: colors.background,
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    backgroundColor: colors.primaryDark,
    color: 'white',
    padding: '8px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: `2px solid ${colors.primary}`,
    flexShrink: 0,
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
  },
  subtitle: {
    margin: '0 0 0 12px',
    fontSize: '12px',
    opacity: 0.8,
  },
  main: {
    flex: 1,
    padding: '8px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  ladderLayout: {
    display: 'flex',
    gap: '8px',
    flex: 1,
    overflow: 'hidden',
  },
  sidebar: {
    width: '260px',
    flexShrink: 0,
    overflow: 'auto',
  },
  diagramContainer: {
    flex: 1,
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minWidth: 0,
  },
  ladderContent: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
  },
  routineTitle: {
    margin: 0,
    padding: '8px 12px',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#f5f5f5',
    borderBottom: `1px solid ${colors.border}`,
    flexShrink: 0,
  },
  routineBadge: {
    fontSize: '10px',
    padding: '2px 6px',
    backgroundColor: colors.primary,
    color: 'white',
    borderRadius: '2px',
  },
  routineCount: {
    fontSize: '11px',
    color: colors.textLight,
    marginLeft: 'auto',
  },
  noSelection: {
    color: colors.textLight,
    textAlign: 'center',
    padding: '40px',
    fontSize: '13px',
  },
  infoPanelContent: {
    flex: 1,
    overflow: 'auto',
    padding: '12px',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    fontSize: '14px',
    color: colors.textLight,
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    padding: '24px',
  },
  errorTitle: {
    color: '#d32f2f',
    marginBottom: '16px',
  },
  errorMessage: {
    color: colors.textLight,
    maxWidth: '600px',
    textAlign: 'center',
    fontSize: '13px',
    marginBottom: '20px',
  },
  errorActions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  button: {
    padding: '8px 16px',
    backgroundColor: colors.primary,
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
  },
  buttonLabel: {
    display: 'inline-block',
    cursor: 'pointer',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  fileName: {
    fontSize: '12px',
    opacity: 0.9,
    padding: '2px 8px',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: '3px',
  },
  headerButton: {
    padding: '6px 12px',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 500,
    transition: 'background-color 0.2s',
  },
  uploadLabel: {
    display: 'inline-block',
    cursor: 'pointer',
  },
  formatHint: {
    fontSize: '11px',
    opacity: 0.7,
    marginLeft: '4px',
  },
};
