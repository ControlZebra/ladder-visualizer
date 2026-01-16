/**
 * Instruction Registry Pattern Implementation
 * 
 * Provides an extensible way to define and register PLC instructions,
 * replacing hardcoded arrays and switch statements with a centralized registry.
 */

/**
 * Instruction category types
 */
export type InstructionCategory = 'input' | 'output' | 'compare' | 'math' | 'timer' | 'counter' | 'other';

/**
 * Symbol type for rendering
 */
export type SymbolType = 'contact' | 'coil' | 'box';

/**
 * Definition of a single instruction
 */
export interface InstructionDefinition {
  /** Instruction mnemonic (e.g., 'XIC', 'OTE', 'TON') */
  mnemonic: string;
  /** Category for classification and rendering decisions */
  category: InstructionCategory;
  /** Human-readable display name */
  displayName: string;
  /** Labels for parameters/operands */
  parameterLabels: string[];
  /** Symbol type for rendering */
  symbolType: SymbolType;
  /** Optional description of the instruction */
  description?: string;
}

/**
 * Options for registering instructions
 */
export interface RegistrationOptions {
  /** Whether to overwrite existing definitions */
  overwrite?: boolean;
}

/**
 * Instruction Registry class for managing instruction definitions
 */
export class InstructionRegistry {
  private definitions: Map<string, InstructionDefinition> = new Map();
  private categoryIndex: Map<InstructionCategory, Set<string>> = new Map();

  constructor() {
    // Initialize category index
    this.categoryIndex.set('input', new Set());
    this.categoryIndex.set('output', new Set());
    this.categoryIndex.set('compare', new Set());
    this.categoryIndex.set('math', new Set());
    this.categoryIndex.set('timer', new Set());
    this.categoryIndex.set('counter', new Set());
    this.categoryIndex.set('other', new Set());
  }

  /**
   * Register a new instruction definition
   */
  register(definition: InstructionDefinition, options: RegistrationOptions = {}): void {
    const { overwrite = false } = options;
    
    if (!overwrite && this.definitions.has(definition.mnemonic)) {
      throw new Error(`Instruction '${definition.mnemonic}' is already registered. Use overwrite option to replace.`);
    }

    // Remove from old category if overwriting
    if (overwrite && this.definitions.has(definition.mnemonic)) {
      const oldDef = this.definitions.get(definition.mnemonic)!;
      this.categoryIndex.get(oldDef.category)?.delete(definition.mnemonic);
    }

    this.definitions.set(definition.mnemonic, definition);
    this.categoryIndex.get(definition.category)?.add(definition.mnemonic);
  }

  /**
   * Register multiple instructions at once
   */
  registerAll(definitions: InstructionDefinition[], options: RegistrationOptions = {}): void {
    for (const def of definitions) {
      this.register(def, options);
    }
  }

  /**
   * Get an instruction definition by mnemonic
   */
  get(mnemonic: string): InstructionDefinition | undefined {
    return this.definitions.get(mnemonic);
  }

  /**
   * Check if an instruction is registered
   */
  has(mnemonic: string): boolean {
    return this.definitions.has(mnemonic);
  }

  /**
   * Get the category for a mnemonic
   */
  getCategory(mnemonic: string): InstructionCategory {
    const def = this.definitions.get(mnemonic);
    return def?.category ?? 'other';
  }

  /**
   * Get the display name for a mnemonic
   */
  getDisplayName(mnemonic: string): string {
    const def = this.definitions.get(mnemonic);
    return def?.displayName ?? mnemonic;
  }

  /**
   * Get parameter labels for a mnemonic
   */
  getParameterLabels(mnemonic: string): string[] {
    const def = this.definitions.get(mnemonic);
    return def?.parameterLabels ?? [];
  }

  /**
   * Get symbol type for a mnemonic
   */
  getSymbolType(mnemonic: string): SymbolType {
    const def = this.definitions.get(mnemonic);
    return def?.symbolType ?? 'box';
  }

  /**
   * Get all mnemonics in a category
   */
  getMnemonicsByCategory(category: InstructionCategory): string[] {
    const set = this.categoryIndex.get(category);
    return set ? Array.from(set) : [];
  }

  /**
   * Get all registered mnemonics
   */
  getAllMnemonics(): string[] {
    return Array.from(this.definitions.keys());
  }

  /**
   * Get all registered definitions
   */
  getAllDefinitions(): InstructionDefinition[] {
    return Array.from(this.definitions.values());
  }

  /**
   * Clear all registered instructions
   */
  clear(): void {
    this.definitions.clear();
    for (const set of this.categoryIndex.values()) {
      set.clear();
    }
  }

  /**
   * Create a new registry with all definitions from this one
   */
  clone(): InstructionRegistry {
    const newRegistry = new InstructionRegistry();
    for (const def of this.definitions.values()) {
      newRegistry.register({ ...def });
    }
    return newRegistry;
  }
}

// ============================================================================
// Default Instruction Definitions
// ============================================================================

/**
 * Contact instruction definitions (input category)
 */
export const CONTACT_INSTRUCTIONS: InstructionDefinition[] = [
  {
    mnemonic: 'XIC',
    category: 'input',
    displayName: 'Examine If Closed',
    parameterLabels: ['Bit'],
    symbolType: 'contact',
    description: 'Examines a bit for an ON condition',
  },
  {
    mnemonic: 'XIO',
    category: 'input',
    displayName: 'Examine If Open',
    parameterLabels: ['Bit'],
    symbolType: 'contact',
    description: 'Examines a bit for an OFF condition',
  },
];

/**
 * Coil instruction definitions (output category)
 */
export const COIL_INSTRUCTIONS: InstructionDefinition[] = [
  {
    mnemonic: 'OTE',
    category: 'output',
    displayName: 'Output Energize',
    parameterLabels: ['Bit'],
    symbolType: 'coil',
    description: 'Turns on a bit when rung conditions are true',
  },
  {
    mnemonic: 'OTL',
    category: 'output',
    displayName: 'Output Latch',
    parameterLabels: ['Bit'],
    symbolType: 'coil',
    description: 'Latches a bit ON and keeps it on',
  },
  {
    mnemonic: 'OTU',
    category: 'output',
    displayName: 'Output Unlatch',
    parameterLabels: ['Bit'],
    symbolType: 'coil',
    description: 'Unlatches a bit (turns it OFF)',
  },
];

/**
 * Compare instruction definitions
 */
export const COMPARE_INSTRUCTIONS: InstructionDefinition[] = [
  {
    mnemonic: 'EQU',
    category: 'compare',
    displayName: 'Equal',
    parameterLabels: ['Source A', 'Source B'],
    symbolType: 'box',
    description: 'Tests whether Source A equals Source B',
  },
  {
    mnemonic: 'NEQ',
    category: 'compare',
    displayName: 'Not Equal',
    parameterLabels: ['Source A', 'Source B'],
    symbolType: 'box',
    description: 'Tests whether Source A is not equal to Source B',
  },
  {
    mnemonic: 'GEQ',
    category: 'compare',
    displayName: 'Greater Than or Eql (A>=B)',
    parameterLabels: ['Source A', 'Source B'],
    symbolType: 'box',
    description: 'Tests whether Source A is greater than or equal to Source B',
  },
  {
    mnemonic: 'LEQ',
    category: 'compare',
    displayName: 'Less Than or Eql (A<=B)',
    parameterLabels: ['Source A', 'Source B'],
    symbolType: 'box',
    description: 'Tests whether Source A is less than or equal to Source B',
  },
  {
    mnemonic: 'GRT',
    category: 'compare',
    displayName: 'Greater Than (A>B)',
    parameterLabels: ['Source A', 'Source B'],
    symbolType: 'box',
    description: 'Tests whether Source A is greater than Source B',
  },
  {
    mnemonic: 'LES',
    category: 'compare',
    displayName: 'Less Than (A<B)',
    parameterLabels: ['Source A', 'Source B'],
    symbolType: 'box',
    description: 'Tests whether Source A is less than Source B',
  },
  {
    mnemonic: 'LIM',
    category: 'compare',
    displayName: 'Limit',
    parameterLabels: ['Low Limit', 'Test', 'High Limit'],
    symbolType: 'box',
    description: 'Tests whether a value is within a range',
  },
];

/**
 * Math instruction definitions
 */
export const MATH_INSTRUCTIONS: InstructionDefinition[] = [
  {
    mnemonic: 'ADD',
    category: 'math',
    displayName: 'Add',
    parameterLabels: ['Source A', 'Source B', 'Dest'],
    symbolType: 'box',
    description: 'Adds Source A and Source B, stores in Dest',
  },
  {
    mnemonic: 'SUB',
    category: 'math',
    displayName: 'Subtract',
    parameterLabels: ['Source A', 'Source B', 'Dest'],
    symbolType: 'box',
    description: 'Subtracts Source B from Source A, stores in Dest',
  },
  {
    mnemonic: 'MUL',
    category: 'math',
    displayName: 'Multiply',
    parameterLabels: ['Source A', 'Source B', 'Dest'],
    symbolType: 'box',
    description: 'Multiplies Source A by Source B, stores in Dest',
  },
  {
    mnemonic: 'DIV',
    category: 'math',
    displayName: 'Divide',
    parameterLabels: ['Source A', 'Source B', 'Dest'],
    symbolType: 'box',
    description: 'Divides Source A by Source B, stores in Dest',
  },
  {
    mnemonic: 'MOV',
    category: 'math',
    displayName: 'Move',
    parameterLabels: ['Source', 'Dest'],
    symbolType: 'box',
    description: 'Moves Source value to Dest',
  },
  {
    mnemonic: 'CPT',
    category: 'math',
    displayName: 'Compute',
    parameterLabels: ['Dest', 'Expression'],
    symbolType: 'box',
    description: 'Computes an expression and stores result in Dest',
  },
  {
    mnemonic: 'ATN',
    category: 'math',
    displayName: 'Arc Tangent',
    parameterLabels: ['Source', 'Dest'],
    symbolType: 'box',
    description: 'Calculates arc tangent of Source, stores in Dest',
  },
  {
    mnemonic: 'XPY',
    category: 'math',
    displayName: 'X To Power of Y',
    parameterLabels: ['Source A', 'Source B', 'Dest'],
    symbolType: 'box',
    description: 'Raises Source A to the power of Source B',
  },
  {
    mnemonic: 'SQR',
    category: 'math',
    displayName: 'Square Root',
    parameterLabels: ['Source', 'Dest'],
    symbolType: 'box',
    description: 'Calculates square root of Source, stores in Dest',
  },
];

/**
 * Timer instruction definitions
 */
export const TIMER_INSTRUCTIONS: InstructionDefinition[] = [
  {
    mnemonic: 'TON',
    category: 'timer',
    displayName: 'Timer On Delay',
    parameterLabels: ['Timer', 'Preset', 'Accum'],
    symbolType: 'box',
    description: 'Counts time when rung is true',
  },
  {
    mnemonic: 'TOF',
    category: 'timer',
    displayName: 'Timer Off Delay',
    parameterLabels: ['Timer', 'Preset', 'Accum'],
    symbolType: 'box',
    description: 'Counts time when rung is false',
  },
  {
    mnemonic: 'RTO',
    category: 'timer',
    displayName: 'Retentive Timer On',
    parameterLabels: ['Timer', 'Preset', 'Accum'],
    symbolType: 'box',
    description: 'Counts accumulated time, retains value when rung is false',
  },
];

/**
 * Counter instruction definitions
 */
export const COUNTER_INSTRUCTIONS: InstructionDefinition[] = [
  {
    mnemonic: 'CTU',
    category: 'counter',
    displayName: 'Count Up',
    parameterLabels: ['Counter', 'Preset', 'Accum'],
    symbolType: 'box',
    description: 'Increments counter on false-to-true transition',
  },
  {
    mnemonic: 'CTD',
    category: 'counter',
    displayName: 'Count Down',
    parameterLabels: ['Counter', 'Preset', 'Accum'],
    symbolType: 'box',
    description: 'Decrements counter on false-to-true transition',
  },
  {
    mnemonic: 'RES',
    category: 'counter',
    displayName: 'Reset',
    parameterLabels: ['Structure'],
    symbolType: 'box',
    description: 'Resets a timer or counter structure',
  },
];

/**
 * Other instruction definitions
 */
export const OTHER_INSTRUCTIONS: InstructionDefinition[] = [
  {
    mnemonic: 'NOP',
    category: 'other',
    displayName: 'No Operation',
    parameterLabels: [],
    symbolType: 'box',
    description: 'Placeholder, performs no operation',
  },
  {
    mnemonic: 'ONS',
    category: 'other',
    displayName: 'One Shot',
    parameterLabels: ['Storage Bit'],
    symbolType: 'box',
    description: 'Triggers output for one scan when input transitions true',
  },
  {
    mnemonic: 'JSR',
    category: 'other',
    displayName: 'Jump to Subroutine',
    parameterLabels: ['Routine Name', 'Input Par', 'Return Par'],
    symbolType: 'box',
    description: 'Jumps to a subroutine',
  },
  {
    mnemonic: 'RET',
    category: 'other',
    displayName: 'Return',
    parameterLabels: ['Return Par'],
    symbolType: 'box',
    description: 'Returns from a subroutine',
  },
  {
    mnemonic: 'AFI',
    category: 'other',
    displayName: 'Always False',
    parameterLabels: [],
    symbolType: 'box',
    description: 'Always provides a false result',
  },
];

/**
 * All default instruction definitions
 */
export const DEFAULT_INSTRUCTIONS: InstructionDefinition[] = [
  ...CONTACT_INSTRUCTIONS,
  ...COIL_INSTRUCTIONS,
  ...COMPARE_INSTRUCTIONS,
  ...MATH_INSTRUCTIONS,
  ...TIMER_INSTRUCTIONS,
  ...COUNTER_INSTRUCTIONS,
  ...OTHER_INSTRUCTIONS,
];

// ============================================================================
// Global Registry Instance
// ============================================================================

/**
 * Global instruction registry instance, pre-populated with default instructions
 */
export const globalInstructionRegistry = new InstructionRegistry();

// Pre-populate with default instructions
globalInstructionRegistry.registerAll(DEFAULT_INSTRUCTIONS);

/**
 * Get the global instruction registry
 */
export function getInstructionRegistry(): InstructionRegistry {
  return globalInstructionRegistry;
}

/**
 * Create a new instruction registry with default instructions
 */
export function createInstructionRegistry(): InstructionRegistry {
  const registry = new InstructionRegistry();
  registry.registerAll(DEFAULT_INSTRUCTIONS);
  return registry;
}

/**
 * Create an empty instruction registry
 */
export function createEmptyInstructionRegistry(): InstructionRegistry {
  return new InstructionRegistry();
}
