import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  parseFile,
  VirtualizedLadderDiagram,
  TagTable,
  ControllerInfo,
  ProgramNavigator,
  jsonToNormalized,
  AOIParameterTable,
  AOILocalTagTable,
  StructuredTextViewer,
} from '../src';
import type { 
  NormalizedController,
  NormalizedRoutine,
  NormalizedDataType,
  NormalizedAOI,
} from '../src';
import { DataTypeTable } from './DataTypeTable';

// Import the sample data
import controllerData from '../examples/controller_output.json';

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

// View types for main content area
type MainViewType = 'routine' | 'controller-tags' | 'program-tags' | 'controller-info' | 'data-type' | 'aoi-parameters' | 'aoi-local-tags' | 'aoi-routine';

export default function App() {
  const [controller, setController] = useState<NormalizedController | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedRoutine, setSelectedRoutine] = useState<{
    programIndex: number;
    routineIndex: number;
  } | null>(null);
  const [selectedProgramIndex, setSelectedProgramIndex] = useState<number | null>(null);
  const [selectedDataType, setSelectedDataType] = useState<NormalizedDataType | null>(null);
  const [selectedAOI, setSelectedAOI] = useState<NormalizedAOI | null>(null);
  const [selectedAOIRoutine, setSelectedAOIRoutine] = useState<{
    aoiName: string;
    routineIndex: number;
  } | null>(null);
  const [mainViewType, setMainViewType] = useState<MainViewType>('routine');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load demo data on mount
  useEffect(() => {
    try {
      const normalized = jsonToNormalized(controllerData);
      setController(normalized);
      setFileName(null);
      // Select first routine by default
      if (normalized.programs.length > 0 && normalized.programs[0].routines.length > 0) {
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
        setController(result.data);
        setFileName(file.name);
        setSelectedDataType(null);
        setSelectedProgramIndex(null);
        setSelectedAOI(null);
        setSelectedAOIRoutine(null);
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
      const normalized = jsonToNormalized(controllerData);
      setController(normalized);
      setFileName(null);
      setError(null);
      setSelectedDataType(null);
      setSelectedProgramIndex(null);
      setSelectedAOI(null);
      setSelectedAOIRoutine(null);
      setMainViewType('routine');
      
      if (normalized.programs.length > 0 && normalized.programs[0].routines.length > 0) {
        setSelectedRoutine({ programIndex: 0, routineIndex: 0 });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load demo data');
    }
  }, []);

  // Get the selected routine
  const parsedRoutine: NormalizedRoutine | null = useMemo(() => {
    if (!controller || !selectedRoutine) return null;
    const routine = controller.programs[selectedRoutine.programIndex]?.routines[selectedRoutine.routineIndex];
    return routine || null;
  }, [controller, selectedRoutine]);

  // Get program tags if viewing program tags
  const programTags = useMemo(() => {
    if (selectedProgramIndex === null || !controller) return [];
    const program = controller.programs[selectedProgramIndex];
    return program?.tags ?? [];
  }, [controller, selectedProgramIndex]);

  // Get program name
  const programName = useMemo(() => {
    if (selectedProgramIndex === null || !controller) return '';
    return controller.programs[selectedProgramIndex]?.name ?? '';
  }, [controller, selectedProgramIndex]);

  const handleRoutineSelect = useCallback((programIndex: number, routineIndex: number, _routine: NormalizedRoutine) => {
    setSelectedRoutine({ programIndex, routineIndex });
    setMainViewType('routine');
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

  const handleDataTypeSelect = useCallback((dataType: NormalizedDataType) => {
    setSelectedDataType(dataType);
    setMainViewType('data-type');
  }, []);

  const handleAOIParametersSelect = useCallback((aoi: NormalizedAOI) => {
    setSelectedAOI(aoi);
    setMainViewType('aoi-parameters');
  }, []);

  const handleAOILocalTagsSelect = useCallback((aoi: NormalizedAOI) => {
    setSelectedAOI(aoi);
    setMainViewType('aoi-local-tags');
  }, []);

  const handleAOIRoutineSelect = useCallback((aoi: NormalizedAOI, routineIndex: number, _routine: NormalizedRoutine) => {
    setSelectedAOI(aoi);
    setSelectedAOIRoutine({ aoiName: aoi.name, routineIndex });
    setMainViewType('aoi-routine');
  }, []);

  // Get the selected AOI routine
  const selectedAOIRoutineData: NormalizedRoutine | null = useMemo(() => {
    if (!selectedAOI || !selectedAOIRoutine) return null;
    return selectedAOI.routines[selectedAOIRoutine.routineIndex] || null;
  }, [selectedAOI, selectedAOIRoutine]);

  // Get all data types for DataTypeTable
  const allDataTypes = useMemo(() => {
    if (!controller) return [];
    return controller.dataTypes;
  }, [controller]);

  // Render main content based on view type
  const renderMainContent = () => {
    if (!controller) return null;

    switch (mainViewType) {
      case 'controller-tags':
        return (
          <>
            <div style={styles.routineTitle}>
              <span style={{ fontWeight: 600 }}>Controller Tags</span>
              <span style={styles.routineCount}>{controller.tags.length} tags</span>
            </div>
            <div style={styles.infoPanelContent}>
              <TagTable tags={controller.tags} />
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
              <ControllerInfo controller={controller} />
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
                <DataTypeTable dataType={selectedDataType} allDataTypes={allDataTypes} />
              </div>
            </>
          );
        }
        return <p style={styles.noSelection}>Select a data type from the Controller Organizer</p>;
      case 'aoi-parameters':
        if (selectedAOI) {
          return (
            <>
              <div style={styles.routineTitle}>
                <span style={{ fontWeight: 600 }}>{selectedAOI.name} Parameters</span>
                <span style={styles.routineBadge}>AOI</span>
                <span style={styles.routineCount}>{selectedAOI.parameters.length} parameters</span>
              </div>
              <div style={styles.infoPanelContent}>
                <AOIParameterTable parameters={selectedAOI.parameters} />
              </div>
            </>
          );
        }
        return <p style={styles.noSelection}>Select an AOI from the Controller Organizer</p>;
      case 'aoi-local-tags':
        if (selectedAOI) {
          return (
            <>
              <div style={styles.routineTitle}>
                <span style={{ fontWeight: 600 }}>{selectedAOI.name} Local Tags</span>
                <span style={styles.routineBadge}>AOI</span>
                <span style={styles.routineCount}>{selectedAOI.localTags.length} tags</span>
              </div>
              <div style={styles.infoPanelContent}>
                <AOILocalTagTable localTags={selectedAOI.localTags} />
              </div>
            </>
          );
        }
        return <p style={styles.noSelection}>Select an AOI from the Controller Organizer</p>;
      case 'aoi-routine':
        if (selectedAOI && selectedAOIRoutineData) {
          const isAOISTRoutine = selectedAOIRoutineData.type === 'ST';
          return (
            <>
              <div style={styles.routineTitle}>
                <span style={{ fontWeight: 600 }}>{selectedAOI.name} / {selectedAOIRoutineData.name}</span>
                <span style={styles.routineBadge}>AOI Routine ({selectedAOIRoutineData.type})</span>
                <span style={styles.routineCount}>
                  {isAOISTRoutine
                    ? `${selectedAOIRoutineData.stContent?.length || 0} lines`
                    : `${selectedAOIRoutineData.rungs.length} rungs`
                  }
                </span>
              </div>
              <div style={styles.ladderContent}>
                {isAOISTRoutine ? (
                  <StructuredTextViewer
                    routine={selectedAOIRoutineData}
                    style={{ width: '100%', height: '100%' }}
                  />
                ) : (
                  <VirtualizedLadderDiagram
                    routine={selectedAOIRoutineData}
                    style={{ width: '100%', height: '100%' }}
                  />
                )}
              </div>
            </>
          );
        }
        return <p style={styles.noSelection}>Select an AOI routine from the Controller Organizer</p>;
      case 'routine':
      default:
        if (parsedRoutine) {
          // Render different viewers based on routine type
          const isSTRoutine = parsedRoutine.type === 'ST';
          return (
            <>
              <div style={styles.routineTitle}>
                <span style={{ fontWeight: 600 }}>{parsedRoutine.name}</span>
                <span style={styles.routineBadge}>{parsedRoutine.type}</span>
                <span style={styles.routineCount}>
                  {isSTRoutine 
                    ? `${parsedRoutine.stContent?.length || 0} lines`
                    : `${parsedRoutine.rungs.length} rungs`
                  }
                </span>
              </div>
              <div style={styles.ladderContent}>
                {isSTRoutine ? (
                  <StructuredTextViewer
                    routine={parsedRoutine}
                    style={{ width: '100%', height: '100%' }}
                  />
                ) : (
                  <VirtualizedLadderDiagram
                    routine={parsedRoutine}
                    style={{ width: '100%', height: '100%' }}
                  />
                )}
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

  if (!controller || isLoading) {
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
          {fileName ? (
            <span style={styles.fileName}>{fileName}</span>
          ) : (
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
              controller={controller}
              programs={controller.programs}
              selectedRoutine={selectedRoutine ?? undefined}
              selectedAOIRoutine={selectedAOIRoutine ?? undefined}
              onRoutineSelect={handleRoutineSelect}
              onControllerTagsSelect={handleControllerTagsSelect}
              onProgramTagsSelect={handleProgramTagsSelect}
              onControllerInfoSelect={handleControllerInfoSelect}
              onDataTypeSelect={handleDataTypeSelect}
              onAOIParametersSelect={handleAOIParametersSelect}
              onAOILocalTagsSelect={handleAOILocalTagsSelect}
              onAOIRoutineSelect={handleAOIRoutineSelect}
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
  primary: '#2b579a',
  primaryDark: '#1e3f6f',
  secondary: '#4a7c59',
  background: '#e8e8e8',
  surface: '#ffffff',
  border: '#c0c0c0',
  text: '#333333',
  textLight: '#666666',
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
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
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
};
