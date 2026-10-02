import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  parseFile,
  parseString,
  VirtualizedLadderDiagram,
  FBDDiagram,
  InlineDiffRung,
  TagTable,
  ControllerInfo,
  ProgramNavigator,
  AOIParameterTable,
  AOILocalTagTable,
  StructuredTextViewer,
  ModuleInfoTable,
  DataTypeTable,
  buildInlineDiffModel,
} from '../src';
import type { 
  NormalizedController,
  NormalizedRoutine,
  NormalizedRung,
  NormalizedDataType,
  NormalizedAOI,
  NormalizedModule,
  Instruction,
  RungElement,
  BranchGroup,
} from '../src';
import { TabBar, TabData } from './TabBar';
import { useTabs } from './useTabs';

// Import the sanitized example as source text so the demo exercises the same
// public L5X parsing path as uploaded files.
import controllerSource from '../examples/ACDTestsWithAOI.L5X?raw';

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

interface InlineDiffDemoScenario {
  oldRung: NormalizedRung;
  newRung: NormalizedRung;
  model: ReturnType<typeof buildInlineDiffModel>;
  highlights: string[];
}

interface InlineDiffDemoScenarioOption {
  id: string;
  label: string;
  description: string;
  scenario: InlineDiffDemoScenario;
}

function isBranchGroupElement(element: RungElement): element is BranchGroup {
  return 'type' in element && element.type === 'branch';
}

function cloneInstruction(instruction: Instruction): Instruction {
  return {
    ...instruction,
    operands: [...instruction.operands],
  };
}

function cloneRungElement(element: RungElement): RungElement {
  if (isBranchGroupElement(element)) {
    return {
      type: 'branch',
      branches: element.branches.map((leg) => leg.map(cloneRungElement)),
    };
  }

  return cloneInstruction(element);
}

function flattenInstructions(elements: RungElement[]): Instruction[] {
  const instructions: Instruction[] = [];

  for (const element of elements) {
    if (isBranchGroupElement(element)) {
      for (const leg of element.branches) {
        instructions.push(...flattenInstructions(leg));
      }
      continue;
    }

    instructions.push(element);
  }

  return instructions;
}

function createInstruction(
  mnemonic: string,
  category: Instruction['category'],
  operands: string[],
): Instruction {
  return {
    mnemonic,
    category,
    operands,
  };
}

function createBranch(...branches: BranchGroup['branches']): BranchGroup {
  return {
    type: 'branch',
    branches,
  };
}

function createDemoRung(number: number, elements: RungElement[], comment?: string): NormalizedRung {
  return {
    number,
    raw: `rung-${number}`,
    comment,
    elements,
    instructions: flattenInstructions(elements),
  };
}

function cloneRung(rung: NormalizedRung): NormalizedRung {
  const elements = rung.elements.map(cloneRungElement);

  return {
    ...rung,
    elements,
    instructions: flattenInstructions(elements),
  };
}

function hasBranchGroup(elements: RungElement[]): boolean {
  return elements.some((element) => {
    if (!isBranchGroupElement(element)) {
      return false;
    }

    return true;
  }) || elements.some((element) => {
    if (!isBranchGroupElement(element)) {
      return false;
    }

    return element.branches.some((leg) => hasBranchGroup(leg));
  });
}

function findDefaultInlineDiffRungIndex(routine: NormalizedRoutine): number {
  const branchIndex = routine.rungs.findIndex((rung) => hasBranchGroup(rung.elements));
  if (branchIndex >= 0) {
    return branchIndex;
  }

  return 0;
}

function getDemoOperandVariant(operand: string): string {
  if (/^[0-9.+-]+$/.test(operand)) {
    return `${operand}_REV`;
  }

  return `${operand}_REV`;
}

function getDemoMnemonicReplacement(instruction: Instruction): string | undefined {
  switch (instruction.category) {
    case 'input':
      return instruction.mnemonic === 'XIO' ? 'XIC' : 'XIO';
    case 'output':
      if (instruction.mnemonic === 'OTL') {
        return 'OTU';
      }
      return 'OTL';
    case 'compare':
      if (instruction.mnemonic === 'EQU') {
        return 'NEQ';
      }
      if (instruction.mnemonic === 'GEQ') {
        return 'GRT';
      }
      if (instruction.mnemonic === 'LES') {
        return 'LEQ';
      }
      return undefined;
    default:
      return undefined;
  }
}

function updateFirstInstruction(
  elements: RungElement[],
  updater: (instruction: Instruction) => void,
): boolean {
  for (const element of elements) {
    if (isBranchGroupElement(element)) {
      for (const leg of element.branches) {
        if (updateFirstInstruction(leg, updater)) {
          return true;
        }
      }
      continue;
    }

    updater(element);
    return true;
  }

  return false;
}

function createDemoContact(tagName: string): Instruction {
  return {
    mnemonic: 'XIC',
    category: 'input',
    operands: [tagName],
  };
}

function appendDemoBranchLeg(elements: RungElement[]): boolean {
  for (const element of elements) {
    if (isBranchGroupElement(element)) {
      element.branches.push([createDemoContact('DemoInlineDiffBranch')]);
      return true;
    }
  }

  for (const element of elements) {
    if (!isBranchGroupElement(element)) {
      continue;
    }

    for (const leg of element.branches) {
      if (appendDemoBranchLeg(leg)) {
        return true;
      }
    }
  }

  return false;
}

function appendDemoSeriesContact(elements: RungElement[]): void {
  const demoContact = createDemoContact('DemoInlineDiffSeries');
  const lastElement = elements[elements.length - 1];

  if (lastElement && !isBranchGroupElement(lastElement) && lastElement.category === 'output') {
    elements.splice(Math.max(elements.length - 1, 0), 0, demoContact);
    return;
  }

  elements.push(demoContact);
}

function describeRung(rung: NormalizedRung): string {
  const mnemonics = rung.instructions.slice(0, 3).map((instruction) => instruction.mnemonic).join(' -> ');
  return mnemonics ? `${mnemonics}${rung.instructions.length > 3 ? '...' : ''}` : 'Empty rung';
}

function createInlineDiffDemoScenario(rung: NormalizedRung): InlineDiffDemoScenario {
  const newRung = cloneRung(rung);
  const highlights: string[] = [];

  const updatedFirstInstruction = updateFirstInstruction(newRung.elements, (instruction) => {
    const previousMnemonic = instruction.mnemonic;
    const replacementMnemonic = getDemoMnemonicReplacement(instruction);
    const [firstOperand, ...restOperands] = instruction.operands;

    if (replacementMnemonic && replacementMnemonic !== instruction.mnemonic) {
      instruction.mnemonic = replacementMnemonic;
      highlights.push(`Swapped ${previousMnemonic} for ${replacementMnemonic}`);
    }

    if (firstOperand) {
      instruction.operands = [getDemoOperandVariant(firstOperand), ...restOperands];
      highlights.push('Edited the first operand');
    }
  });

  if (!updatedFirstInstruction) {
    appendDemoSeriesContact(newRung.elements);
    highlights.push('Inserted a demo contact to create a visible change');
  }

  if (appendDemoBranchLeg(newRung.elements)) {
    highlights.push('Added a parallel branch leg');
  } else {
    appendDemoSeriesContact(newRung.elements);
    highlights.push('Inserted an extra series contact');
  }

  newRung.comment = rung.comment
    ? `${rung.comment} (inline diff demo)`
    : 'Demo note: previewing a one-rung inline diff';
  highlights.push('Updated the rung comment');
  newRung.raw = `${rung.raw} // inline diff demo`;
  newRung.instructions = flattenInstructions(newRung.elements);

  return {
    oldRung: rung,
    newRung,
    model: buildInlineDiffModel({
      oldRung: rung,
      newRung,
    }),
    highlights,
  };
}

function createContactTextOnlyDemoScenario(): InlineDiffDemoScenario {
  const oldRung = createDemoRung(37, [
    createInstruction('XIC', 'input', ['Local:1:I.Data.0']),
    createInstruction('OTE', 'output', ['RunCmd']),
  ]);
  const newRung = createDemoRung(37, [
    createInstruction('XIC', 'input', ['Local:2:I.Data.1']),
    createInstruction('OTE', 'output', ['RunCmd']),
  ]);

  return {
    oldRung,
    newRung,
    model: buildInlineDiffModel({
      oldRung,
      newRung,
    }),
    highlights: [
      'Rung 37',
      'Text-only contact label change',
      'No mnemonic swap or structural insertion',
    ],
  };
}

function createCoilTextOnlyDemoScenario(): InlineDiffDemoScenario {
  const oldRung = createDemoRung(40, [
    createBranch(
      [createInstruction('OTE', 'output', ['Local:3:O.Data.0'])],
      [createInstruction('OTE', 'output', ['RunCmd'])],
    ),
  ]);
  const newRung = createDemoRung(40, [
    createBranch(
      [createInstruction('OTE', 'output', ['Local:4:O.Data.1'])],
      [createInstruction('OTE', 'output', ['RunCmd'])],
    ),
  ]);

  return {
    oldRung,
    newRung,
    model: buildInlineDiffModel({
      oldRung,
      newRung,
    }),
    highlights: [
      'Rung 40',
      'Text-only coil label change',
      'Branch-contained label diff without structural replacement',
    ],
  };
}

function createSingleOperandBoxTextOnlyDemoScenario(): InlineDiffDemoScenario {
  const oldRung = createDemoRung(41, [
    createInstruction('MOV', 'math', ['MotorStartPermissiveSignal', 'DestTag']),
  ]);
  const newRung = createDemoRung(41, [
    createInstruction('MOV', 'math', ['MotorStartPermissiveBypassSignal', 'DestTag']),
  ]);

  return {
    oldRung,
    newRung,
    model: buildInlineDiffModel({
      oldRung,
      newRung,
    }),
    highlights: [
      'Rung 41',
      'Single-row box operand text change',
      'One changed operand stays inside the existing box row',
    ],
  };
}

function createMultiOperandBoxTextOnlyDemoScenario(): InlineDiffDemoScenario {
  const oldRung = createDemoRung(42, [
    createInstruction('CPT', 'math', ['MotorSpeedSource', 'ScaleFactorA', 'DestTag']),
  ]);
  const newRung = createDemoRung(42, [
    createInstruction('CPT', 'math', ['MotorSpeedFallback', 'ScaleFactorB', 'DestTag']),
  ]);

  return {
    oldRung,
    newRung,
    model: buildInlineDiffModel({
      oldRung,
      newRung,
    }),
    highlights: [
      'Rung 42',
      'Stable multi-row box operand diff',
      'Two changed operands render in place inside one CPT box',
    ],
  };
}

function createReorderedBoxOperandsDemoScenario(): InlineDiffDemoScenario {
  const oldRung = createDemoRung(43, [
    createInstruction('MOV', 'math', ['Source_A', 'Dest_A']),
  ]);
  const newRung = createDemoRung(43, [
    createInstruction('MOV', 'math', ['Dest_A', 'Source_A']),
  ]);

  return {
    oldRung,
    newRung,
    model: buildInlineDiffModel({
      oldRung,
      newRung,
    }),
    highlights: [
      'Rung 43',
      'Reordered box operands stay structural',
      'Expected old/new replacement pair because operand mapping is ambiguous',
    ],
  };
}

function InlineDiffDemoPanel({ routine, programLabel }: { routine: NormalizedRoutine; programLabel: string }) {
  const [selectedRungIndex, setSelectedRungIndex] = useState(() => findDefaultInlineDiffRungIndex(routine));
  const [selectedScenarioId, setSelectedScenarioId] = useState('synthetic-routine');

  useEffect(() => {
    setSelectedRungIndex(findDefaultInlineDiffRungIndex(routine));
  }, [routine]);

  const selectedRung = routine.rungs[selectedRungIndex] ?? null;
  const selectId = `inline-diff-rung-select-${programLabel.replace(/\s+/g, '-').toLowerCase()}-${routine.name.replace(/\s+/g, '-').toLowerCase()}`;
  const scenarioSelectId = `inline-diff-scenario-select-${programLabel.replace(/\s+/g, '-').toLowerCase()}-${routine.name.replace(/\s+/g, '-').toLowerCase()}`;
  const routineScenario = useMemo(() => {
    if (!selectedRung) {
      return null;
    }

    return createInlineDiffDemoScenario(selectedRung);
  }, [selectedRung]);
  const scenarioOptions = useMemo<InlineDiffDemoScenarioOption[]>(() => {
    const options: InlineDiffDemoScenarioOption[] = [];

    if (routineScenario) {
      options.push({
        id: 'synthetic-routine',
        label: `Routine-based synthetic diff (Rung ${selectedRung?.number ?? 'n/a'})`,
        description: 'Mixed diff generated from the selected routine rung with structural and comment changes.',
        scenario: routineScenario,
      });
    }

    options.push(
      {
        id: 'text-only-contact',
        label: 'Text-only contact label diff (Rung 37)',
        description: 'Top-level contact label change rendered in the native contact label slot.',
        scenario: createContactTextOnlyDemoScenario(),
      },
      {
        id: 'text-only-coil',
        label: 'Text-only coil label diff (Rung 40)',
        description: 'Branch-contained coil label change rendered in the native coil label slot.',
        scenario: createCoilTextOnlyDemoScenario(),
      },
      {
        id: 'text-only-box-single-operand',
        label: 'Single-row box operand diff (Rung 41)',
        description: 'Baseline box case where one operand changes and the diff stays inside one MOV operand row.',
        scenario: createSingleOperandBoxTextOnlyDemoScenario(),
      },
      {
        id: 'text-only-box-multi-operand',
        label: 'Multi-row box operand diff (Rung 42)',
        description: 'Two fixed-position operand edits stay text-only and render as stacked old/new values inside one CPT box.',
        scenario: createMultiOperandBoxTextOnlyDemoScenario(),
      },
      {
        id: 'box-reordered-operands-structural',
        label: 'Reordered box operands fallback (Rung 43)',
        description: 'Operand reordering remains structural, so the demo should show separate old and new MOV segments.',
        scenario: createReorderedBoxOperandsDemoScenario(),
      },
    );

    return options;
  }, [routineScenario, selectedRung]);
  const selectedScenario = scenarioOptions.find((option) => option.id === selectedScenarioId) ?? scenarioOptions[0] ?? null;
  const scenario = selectedScenario?.scenario ?? null;

  const selectedRungHasBranch = useMemo(
    () => (selectedRung ? hasBranchGroup(selectedRung.elements) : false),
    [selectedRung],
  );

  if (routine.rungs.length === 0) {
    return (
      <div style={styles.emptyState}>
        <p style={styles.emptyStateTitle}>No Rungs Available</p>
        <p style={styles.emptyStateText}>This routine does not contain ladder rungs to compare.</p>
      </div>
    );
  }

  if (!scenario) {
    return (
      <div style={styles.emptyState}>
        <p style={styles.emptyStateTitle}>Unable To Build Demo Diff</p>
        <p style={styles.emptyStateText}>The selected rung could not be converted into an inline diff preview.</p>
      </div>
    );
  }

  const diffWidth = Math.max(1200, scenario.newRung.instructions.length * 150);

  return (
    <div style={styles.inlineDiffDemoPanel}>
      <div style={styles.inlineDiffDemoHeader}>
        <div>
          <h2 style={styles.inlineDiffDemoTitle}>One-Rung Inline Diff</h2>
          <p style={styles.inlineDiffDemoDescription}>
            Review preview for {programLabel} / {routine.name}. Choose between the routine-based synthetic diff and targeted contact, coil, and box instruction examples.
          </p>
        </div>
        <div style={styles.inlineDiffDemoControls}>
          <label style={styles.inlineDiffDemoLabel} htmlFor={scenarioSelectId}>
            Scenario
          </label>
          <select
            id={scenarioSelectId}
            value={selectedScenario?.id ?? ''}
            onChange={(event) => setSelectedScenarioId(event.target.value)}
            style={styles.inlineDiffDemoSelect}
          >
            {scenarioOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          {selectedScenario?.id === 'synthetic-routine' && (
            <>
          <label style={styles.inlineDiffDemoLabel} htmlFor={selectId}>
            Demo rung
          </label>
          <select
            id={selectId}
            value={selectedRungIndex}
            onChange={(event) => setSelectedRungIndex(Number(event.target.value))}
            style={styles.inlineDiffDemoSelect}
          >
            {routine.rungs.map((rung, index) => (
              <option key={`${routine.name}-${rung.number}-${index}`} value={index}>
                {`Rung ${rung.number} - ${describeRung(rung)}`}
              </option>
            ))}
          </select>
            </>
          )}
        </div>
      </div>

      <p style={styles.inlineDiffDemoScenarioDescription}>{selectedScenario?.description}</p>

      <div style={styles.inlineDiffDemoMetaRow}>
        <div style={styles.inlineDiffDemoMetaCard}>
          <span style={styles.inlineDiffDemoMetaLabel}>Scenario</span>
          <strong style={styles.inlineDiffDemoMetaValue}>{selectedScenario?.label ?? 'Unavailable'}</strong>
        </div>
        <div style={styles.inlineDiffDemoMetaCard}>
          <span style={styles.inlineDiffDemoMetaLabel}>Preview state</span>
          <strong style={styles.inlineDiffDemoMetaValue}>{scenario.model.rungState}</strong>
        </div>
        <div style={styles.inlineDiffDemoMetaCard}>
          <span style={styles.inlineDiffDemoMetaLabel}>Structural changes</span>
          <strong style={styles.inlineDiffDemoMetaValue}>{scenario.model.hasStructuralChanges ? 'Yes' : 'No'}</strong>
        </div>
        <div style={styles.inlineDiffDemoMetaCard}>
          <span style={styles.inlineDiffDemoMetaLabel}>Branch coverage</span>
          <strong style={styles.inlineDiffDemoMetaValue}>
            {selectedScenario?.id === 'synthetic-routine'
              ? selectedRungHasBranch
                ? 'Selected rung includes branches'
                : 'Series-only fallback'
              : scenario.model.nodes.some((node) => node.kind === 'branch')
                ? 'Scenario includes branches'
                : 'Series-only scenario'}
          </strong>
        </div>
      </div>

      <div style={styles.inlineDiffDemoHighlights}>
        {scenario.highlights.map((highlight) => (
          <span key={highlight} style={styles.inlineDiffDemoHighlightPill}>
            {highlight}
          </span>
        ))}
      </div>

      <div style={styles.inlineDiffDemoCanvas}>
        <div style={styles.inlineDiffDemoCanvasInner}>
          <InlineDiffRung model={scenario.model} width={diffWidth} />
        </div>
      </div>

      <div style={styles.inlineDiffDemoRawGrid}>
        <section style={styles.inlineDiffDemoRawCard}>
          <div style={styles.inlineDiffDemoRawHeader}>Original rung</div>
          <pre style={styles.inlineDiffDemoRawText}>{scenario.oldRung.raw}</pre>
        </section>
        <section style={styles.inlineDiffDemoRawCard}>
          <div style={styles.inlineDiffDemoRawHeader}>Demo-updated rung</div>
          <pre style={styles.inlineDiffDemoRawText}>{scenario.newRung.raw}</pre>
        </section>
      </div>
    </div>
  );
}

export default function App() {
  const [controller, setController] = useState<NormalizedController | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Tab management
  const { tabs, activeTabId, openTab, closeTab, selectTab, closeAllTabs } = useTabs();

  // Load demo data on mount
  useEffect(() => {
    try {
      const result = parseString(controllerSource, 'l5x');
      if (!result.success || !result.data) {
        throw new Error(result.errors?.map((parseError) => parseError.message).join(', ') || 'Failed to parse demo L5X');
      }
      setController(result.data);
      setFileName(null);
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
        closeAllTabs();
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
  }, [closeAllTabs, openTab]);

  /**
   * Load demo data (reset to default)
   */
  const handleLoadDemo = useCallback(() => {
    try {
      const result = parseString(controllerSource, 'l5x');
      if (!result.success || !result.data) {
        throw new Error(result.errors?.map((parseError) => parseError.message).join(', ') || 'Failed to parse demo L5X');
      }
      setController(result.data);
      setFileName(null);
      setError(null);
      closeAllTabs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load demo data');
    }
  }, [closeAllTabs, openTab]);

  // Get active tab data for navigator highlight
  const activeTabData = useMemo(() => {
    if (!activeTabId) return null;
    const tab = tabs.find(t => t.id === activeTabId);
    return tab?.data || null;
  }, [activeTabId, tabs]);

  // Derive selected routine from active tab for navigator
  const selectedRoutine = useMemo(() => {
    if (activeTabData?.type === 'routine') {
      return { programIndex: activeTabData.programIndex, routineIndex: activeTabData.routineIndex };
    }
    return null;
  }, [activeTabData]);

  // Derive selected AOI routine from active tab for navigator
  const selectedAOIRoutine = useMemo(() => {
    if (activeTabData?.type === 'aoi-routine') {
      return { aoiName: activeTabData.aoiName, routineIndex: activeTabData.routineIndex };
    }
    return null;
  }, [activeTabData]);

  const selectedNavigatorItemId = useMemo(() => {
    if (activeTabData?.type === 'data-type') {
      return `dt-${activeTabData.dataTypeName}`;
    }
    return undefined;
  }, [activeTabData]);

  // Get all data types for DataTypeTable
  const allDataTypes = useMemo(() => {
    if (!controller) return [];
    return controller.dataTypeCatalog ?? controller.dataTypes;
  }, [controller]);

  /**
   * Render content for a specific tab
   */
  const renderTabContent = useCallback((tabData: TabData, isActive: boolean) => {
    if (!controller) return null;

    // Use visibility to keep inactive tabs mounted but hidden
    const containerStyle: React.CSSProperties = {
      display: isActive ? 'flex' : 'none',
      flex: 1,
      flexDirection: 'column',
      overflow: 'hidden',
      height: '100%',
    };

    switch (tabData.type) {
      case 'controller-tags':
        return (
          <div key="controller-tags" style={containerStyle}>
            <div style={styles.infoPanelContent}>
              <TagTable tags={controller.tags} dataTypes={allDataTypes} />
            </div>
          </div>
        );
      case 'program-tags': {
        const program = controller.programs[tabData.programIndex];
        const tags = program?.tags ?? [];
        return (
          <div key={`program-tags-${tabData.programIndex}`} style={containerStyle}>
            <div style={styles.infoPanelContent}>
              {tags.length > 0 ? (
                <TagTable tags={tags} dataTypes={allDataTypes} />
              ) : (
                <p style={styles.noSelection}>No program-specific tags defined</p>
              )}
            </div>
          </div>
        );
      }
      case 'controller-info':
        return (
          <div key="controller-info" style={containerStyle}>
            <div style={styles.infoPanelContent}>
              <ControllerInfo controller={controller} />
            </div>
          </div>
        );
      case 'data-type': {
        const dataType = (controller.dataTypeCatalog ?? controller.dataTypes)
          .find(dt => dt.name === tabData.dataTypeName);
        if (dataType) {
          return (
            <div key={`data-type-${tabData.dataTypeName}`} style={containerStyle}>
              <div style={styles.infoPanelContent}>
                <DataTypeTable
                  dataType={dataType}
                  allDataTypes={allDataTypes}
                  onDataTypeSelect={(target) => openTab(
                    { type: 'data-type', dataTypeName: target.name },
                    target.name,
                  )}
                />
              </div>
            </div>
          );
        }
        return (
          <div key={`data-type-${tabData.dataTypeName}`} style={containerStyle}>
            <p style={styles.noSelection}>Data type not found</p>
          </div>
        );
      }
      case 'aoi-parameters': {
        const aoi = controller.aois.find(a => a.name === tabData.aoiName);
        if (aoi) {
          return (
            <div key={`aoi-parameters-${tabData.aoiName}`} style={containerStyle}>
              <div style={styles.infoPanelContent}>
                <AOIParameterTable parameters={aoi.parameters} />
              </div>
            </div>
          );
        }
        return (
          <div key={`aoi-parameters-${tabData.aoiName}`} style={containerStyle}>
            <p style={styles.noSelection}>AOI not found</p>
          </div>
        );
      }
      case 'aoi-local-tags': {
        const aoi = controller.aois.find(a => a.name === tabData.aoiName);
        if (aoi) {
          return (
            <div key={`aoi-local-tags-${tabData.aoiName}`} style={containerStyle}>
              <div style={styles.infoPanelContent}>
                <AOILocalTagTable localTags={aoi.localTags} />
              </div>
            </div>
          );
        }
        return (
          <div key={`aoi-local-tags-${tabData.aoiName}`} style={containerStyle}>
            <p style={styles.noSelection}>AOI not found</p>
          </div>
        );
      }
      case 'aoi-routine': {
        const aoi = controller.aois.find(a => a.name === tabData.aoiName);
        const routine = aoi?.routines[tabData.routineIndex];
        if (aoi && routine) {
          const isSTRoutine = routine.type === 'ST';
          const isRLLRoutine = routine.type === 'RLL';
          const isFBDRoutine = routine.type === 'FBD' && Boolean(routine.fbd);
          
          if (!isSTRoutine && !isRLLRoutine && !isFBDRoutine) {
            return (
              <div key={`aoi-routine-${tabData.aoiName}-${tabData.routineIndex}`} style={containerStyle}>
                <div style={styles.emptyState}>
                  <p style={styles.emptyStateTitle}>{routine.type} Visualization Not Supported</p>
                  <p style={styles.emptyStateText}>
                    {routine.type === 'SFC'
                        ? 'Sequential Function Chart (SFC) visualization is not yet supported'
                        : `${routine.type} routine visualization is not yet supported`
                    }
                  </p>
                </div>
              </div>
            );
          }
          
          return (
            <div key={`aoi-routine-${tabData.aoiName}-${tabData.routineIndex}`} style={containerStyle}>
              <div style={styles.ladderContent}>
                {isSTRoutine ? (
                  <StructuredTextViewer
                    routine={routine}
                    style={{ width: '100%', height: '100%' }}
                  />
                ) : isFBDRoutine && routine.fbd ? (
                  <FBDDiagram
                    body={routine.fbd}
                    width="100%"
                    height="100%"
                    showControls
                  />
                ) : (
                  <VirtualizedLadderDiagram
                    routine={routine}
                    style={{ width: '100%', height: '100%' }}
                  />
                )}
              </div>
            </div>
          );
        }
        return (
          <div key={`aoi-routine-${tabData.aoiName}-${tabData.routineIndex}`} style={containerStyle}>
            <p style={styles.noSelection}>AOI routine not found</p>
          </div>
        );
      }
      case 'routine': {
        const routine = controller.programs[tabData.programIndex]?.routines[tabData.routineIndex];
        if (routine) {
          const isSTRoutine = routine.type === 'ST';
          const isRLLRoutine = routine.type === 'RLL';
          const isFBDRoutine = routine.type === 'FBD' && Boolean(routine.fbd);
          
          if (!isSTRoutine && !isRLLRoutine && !isFBDRoutine) {
            return (
              <div key={`routine-${tabData.programIndex}-${tabData.routineIndex}`} style={containerStyle}>
                <div style={styles.emptyState}>
                  <p style={styles.emptyStateTitle}>{routine.type} Visualization Not Supported</p>
                  <p style={styles.emptyStateText}>
                    {routine.type === 'SFC'
                        ? 'Sequential Function Chart (SFC) visualization is not yet supported'
                        : `${routine.type} routine visualization is not yet supported`
                    }
                  </p>
                </div>
              </div>
            );
          }
          
          return (
            <div key={`routine-${tabData.programIndex}-${tabData.routineIndex}`} style={containerStyle}>
              <div style={styles.routineTabContent}>
                {isRLLRoutine && (
                  <div style={styles.routineToolbar}>
                    <div style={styles.routineToolbarText}>
                      Open a synthetic one-rung diff preview for this routine.
                    </div>
                    <button
                      style={styles.routineToolbarButton}
                      onClick={() => openTab(
                        {
                          type: 'inline-diff-demo',
                          programIndex: tabData.programIndex,
                          routineIndex: tabData.routineIndex,
                        },
                        `${routine.name} Diff Demo`,
                      )}
                    >
                      Open One-Rung Inline Diff
                    </button>
                  </div>
                )}
                <div style={styles.ladderContent}>
                {isSTRoutine ? (
                  <StructuredTextViewer
                    routine={routine}
                    style={{ width: '100%', height: '100%' }}
                  />
                ) : isFBDRoutine && routine.fbd ? (
                  <FBDDiagram
                    body={routine.fbd}
                    width="100%"
                    height="100%"
                    showControls
                  />
                ) : (
                  <VirtualizedLadderDiagram
                    routine={routine}
                    style={{ width: '100%', height: '100%' }}
                  />
                )}
                </div>
              </div>
            </div>
          );
        }
        return (
          <div key={`routine-${tabData.programIndex}-${tabData.routineIndex}`} style={containerStyle}>
            <p style={styles.noSelection}>Routine not found</p>
          </div>
        );
      }
      case 'inline-diff-demo': {
        const routine = controller.programs[tabData.programIndex]?.routines[tabData.routineIndex];
        const program = controller.programs[tabData.programIndex];
        const programLabel = program?.name || `Program ${tabData.programIndex + 1}`;

        if (routine) {
          return (
            <div key={`inline-diff-demo-${tabData.programIndex}-${tabData.routineIndex}`} style={containerStyle}>
              <InlineDiffDemoPanel routine={routine} programLabel={programLabel} />
            </div>
          );
        }

        return (
          <div key={`inline-diff-demo-${tabData.programIndex}-${tabData.routineIndex}`} style={containerStyle}>
            <p style={styles.noSelection}>Routine not found for inline diff preview</p>
          </div>
        );
      }
      case 'module': {
        const module = controller.modules.find(m => m.id === tabData.moduleId);
        if (module) {
          return (
            <div key={`module-${tabData.moduleId}`} style={containerStyle}>
              <div style={styles.infoPanelContent}>
                <ModuleInfoTable module={module} />
              </div>
            </div>
          );
        }
        return (
          <div key={`module-${tabData.moduleId}`} style={containerStyle}>
            <p style={styles.noSelection}>Module not found</p>
          </div>
        );
      }
      default:
        return null;
    }
  }, [controller, allDataTypes, openTab]);

  // Render main content based on active tab
  const renderMainContent = () => {
    if (!controller) return null;

    if (tabs.length === 0) {
      return (
        <div style={styles.emptyState}>
          <p style={styles.emptyStateTitle}>No Content Selected</p>
          <p style={styles.emptyStateText}>Select an item from the navigation panel to view its contents</p>
        </div>
      );
    }

    // Render all tabs (keeping inactive ones mounted but hidden for performance)
    return (
      <>
        {tabs.map(tab => renderTabContent(tab.data, tab.id === activeTabId))}
      </>
    );
  };

  // Event handlers for navigator selections
  const handleRoutineSelect = useCallback((programIndex: number, routineIndex: number, routine: NormalizedRoutine) => {
    openTab(
      { type: 'routine', programIndex, routineIndex },
      routine.name
    );
  }, [openTab]);

  const handleControllerTagsSelect = useCallback(() => {
    openTab({ type: 'controller-tags' }, 'Controller Tags');
  }, [openTab]);

  const handleProgramTagsSelect = useCallback((programIndex: number) => {
    if (!controller) return;
    const program = controller.programs[programIndex];
    openTab(
      { type: 'program-tags', programIndex, programName: program.name },
      `${program.name} Tags`
    );
  }, [controller, openTab]);

  const handleControllerInfoSelect = useCallback(() => {
    openTab({ type: 'controller-info' }, 'Controller Info');
  }, [openTab]);

  const handleDataTypeSelect = useCallback((dataType: NormalizedDataType) => {
    openTab(
      { type: 'data-type', dataTypeName: dataType.name },
      dataType.name
    );
  }, [openTab]);

  const handleAOIParametersSelect = useCallback((aoi: NormalizedAOI) => {
    openTab(
      { type: 'aoi-parameters', aoiName: aoi.name },
      `${aoi.name} Parameters`
    );
  }, [openTab]);

  const handleAOILocalTagsSelect = useCallback((aoi: NormalizedAOI) => {
    openTab(
      { type: 'aoi-local-tags', aoiName: aoi.name },
      `${aoi.name} Local Tags`
    );
  }, [openTab]);

  const handleAOIRoutineSelect = useCallback((aoi: NormalizedAOI, routineIndex: number, routine: NormalizedRoutine) => {
    openTab(
      { type: 'aoi-routine', aoiName: aoi.name, routineIndex },
      `${aoi.name}:${routine.name}`
    );
  }, [openTab]);

  const handleModuleSelect = useCallback((module: NormalizedModule) => {
    openTab(
      { type: 'module', moduleId: module.id, moduleName: module.name },
      module.catalogNumber ? `${module.name} (${module.catalogNumber})` : module.name
    );
  }, [openTab]);

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
              selectedItemId={selectedNavigatorItemId}
              onRoutineSelect={handleRoutineSelect}
              onControllerTagsSelect={handleControllerTagsSelect}
              onProgramTagsSelect={handleProgramTagsSelect}
              onControllerInfoSelect={handleControllerInfoSelect}
              onDataTypeSelect={handleDataTypeSelect}
              onModuleSelect={handleModuleSelect}
              onAOIParametersSelect={handleAOIParametersSelect}
              onAOILocalTagsSelect={handleAOILocalTagsSelect}
              onAOIRoutineSelect={handleAOIRoutineSelect}
            />
          </aside>

          {/* Main Content Area */}
          <div style={styles.diagramContainer}>
            <TabBar
              tabs={tabs}
              activeTabId={activeTabId}
              onTabSelect={selectTab}
              onTabClose={closeTab}
            />
            <div style={styles.tabContent}>
              {renderMainContent()}
            </div>
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
    height: '100%',
    backgroundColor: colors.background,
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
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
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
  diagramContainer: {
    flex: 1,
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minWidth: 0,
    minHeight: 0,
  },
  tabContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minHeight: 0,
    position: 'relative' as const,
  },
  ladderContent: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
  },
  routineTabContent: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
  routineToolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    padding: '10px 12px',
    borderBottom: `1px solid ${colors.border}`,
    backgroundColor: '#f4f6f8',
    flexShrink: 0,
  },
  routineToolbarText: {
    fontSize: '12px',
    color: colors.textLight,
  },
  routineToolbarButton: {
    padding: '6px 10px',
    borderRadius: '4px',
    border: `1px solid ${colors.primary}`,
    backgroundColor: colors.surface,
    color: colors.primaryDark,
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  inlineDiffDemoPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '16px',
    overflow: 'auto',
    backgroundColor: '#f4f6f8',
    minHeight: 0,
  },
  inlineDiffDemoHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '16px',
    flexWrap: 'wrap',
  },
  inlineDiffDemoTitle: {
    margin: 0,
    fontSize: '18px',
    color: colors.text,
  },
  inlineDiffDemoDescription: {
    margin: '6px 0 0 0',
    fontSize: '13px',
    lineHeight: 1.5,
    color: colors.textLight,
    maxWidth: '720px',
  },
  inlineDiffDemoScenarioDescription: {
    margin: '0',
    fontSize: '13px',
    lineHeight: 1.5,
    color: colors.text,
  },
  inlineDiffDemoControls: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    minWidth: '280px',
  },
  inlineDiffDemoLabel: {
    fontSize: '12px',
    color: colors.textLight,
    fontWeight: 600,
  },
  inlineDiffDemoSelect: {
    padding: '8px 10px',
    borderRadius: '4px',
    border: `1px solid ${colors.border}`,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: '13px',
  },
  inlineDiffDemoMetaRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
  },
  inlineDiffDemoMetaCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '12px',
    borderRadius: '6px',
    border: `1px solid ${colors.border}`,
    backgroundColor: colors.surface,
  },
  inlineDiffDemoMetaLabel: {
    fontSize: '11px',
    color: colors.textLight,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
  },
  inlineDiffDemoMetaValue: {
    fontSize: '15px',
    color: colors.text,
  },
  inlineDiffDemoHighlights: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  inlineDiffDemoHighlightPill: {
    padding: '6px 10px',
    borderRadius: '999px',
    backgroundColor: '#e8eef7',
    color: colors.primaryDark,
    fontSize: '12px',
    fontWeight: 600,
  },
  inlineDiffDemoCanvas: {
    borderRadius: '6px',
    border: `1px solid ${colors.border}`,
    backgroundColor: colors.surface,
    overflow: 'auto',
  },
  inlineDiffDemoCanvasInner: {
    minWidth: '100%',
    padding: '12px',
  },
  inlineDiffDemoRawGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '12px',
  },
  inlineDiffDemoRawCard: {
    borderRadius: '6px',
    border: `1px solid ${colors.border}`,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  inlineDiffDemoRawHeader: {
    padding: '10px 12px',
    borderBottom: `1px solid ${colors.border}`,
    backgroundColor: '#f8f9fb',
    fontSize: '12px',
    fontWeight: 600,
    color: colors.text,
  },
  inlineDiffDemoRawText: {
    margin: 0,
    padding: '12px',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
    fontSize: '12px',
    lineHeight: 1.5,
    color: colors.text,
    backgroundColor: colors.surface,
    overflow: 'auto',
  },
  noSelection: {
    color: colors.textLight,
    textAlign: 'center',
    padding: '40px',
    fontSize: '13px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    padding: '40px',
    backgroundColor: '#f5f5f5',
  },
  emptyStateTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#666666',
    marginBottom: '8px',
  },
  emptyStateText: {
    fontSize: '13px',
    color: '#999999',
    textAlign: 'center',
    maxWidth: '300px',
    lineHeight: 1.5,
  },
  infoPanelContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    padding: '12px',
    minHeight: 0,
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
