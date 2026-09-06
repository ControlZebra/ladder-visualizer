/**
 * AOI Registration utilities for parsing
 * 
 * Builds controller-scoped instruction contexts and provides legacy opt-in
 * registration in the global instruction registry.
 */

import type { NormalizedController, NormalizedAOI } from '../types/normalized';
import { 
  createInstructionRegistry,
  globalInstructionRegistry, 
  registerAOI as registerAOIToRegistry,
  clearAOIs as clearAOIsFromRegistry,
  type AOIRegistrationInfo,
  type InstructionContext,
  type InstructionRegistry,
  type RegistrationOptions,
} from '../types/instruction-registry';
import { isBranchGroup, type RungElement } from '../types/instructions';

/**
 * Convert a NormalizedAOI to AOIRegistrationInfo for registry registration
 */
function normalizedAOIToRegistrationInfo(aoi: NormalizedAOI): AOIRegistrationInfo {
  return {
    name: aoi.name,
    description: aoi.description,
    parameters: aoi.parameters.map(p => ({
      name: p.name,
      usage: p.usage,
      visible: p.visible,
    })),
  };
}

function registerControllerAOIs(
  controller: NormalizedController,
  registry: InstructionRegistry,
  options: RegistrationOptions,
): void {
  for (const aoi of controller.aois ?? []) {
    registerAOIToRegistry(registry, normalizedAOIToRegistrationInfo(aoi), options);
  }
}

function classifyElements(elements: RungElement[], registry: InstructionRegistry): void {
  for (const element of elements) {
    if (isBranchGroup(element)) {
      for (const branch of element.branches) {
        classifyElements(branch, registry);
      }
      continue;
    }

    element.category = registry.getCategory(element.mnemonic);
  }
}

export interface FinalizedController {
  controller: NormalizedController;
  context: InstructionContext;
}

/**
 * Create isolated instruction metadata for a parsed controller and classify
 * every rung against that same controller-scoped registry.
 */
export function createInstructionContextFromController(
  controller: NormalizedController,
): InstructionContext {
  const instructionRegistry = createInstructionRegistry();
  registerControllerAOIs(controller, instructionRegistry, { overwrite: true });

  return { instructionRegistry };
}

/** Classify a newly normalized controller using its isolated metadata. */
export function applyInstructionContextToController(
  controller: NormalizedController,
  context: InstructionContext,
): void {
  const routines = [
    ...controller.programs.flatMap((program) => program.routines),
    ...controller.aois.flatMap((aoi) => aoi.routines),
  ];

  for (const routine of routines) {
    for (const rung of routine.rungs) {
      // The flat and tree collections can contain distinct instruction objects,
      // so both public representations must be classified explicitly.
      for (const instruction of rung.instructions) {
        instruction.category = context.instructionRegistry.getCategory(instruction.mnemonic);
      }
      classifyElements(rung.elements, context.instructionRegistry);
    }
  }
}

/**
 * Complete normalization by creating controller-scoped instruction metadata
 * and applying it to every public rung representation before returning data.
 * Keeping these operations together prevents parsers from exposing provisional
 * categories produced before the controller's AOI definitions are available.
 */
export function finalizeController(controller: NormalizedController): FinalizedController {
  const context = createInstructionContextFromController(controller);
  applyInstructionContextToController(controller, context);

  return { controller, context };
}

/**
 * Register AOIs from a NormalizedController into the global instruction registry.
 * This enables BOX symbols to display proper parameter labels for AOI instructions.
 * 
 * @param controller - The parsed normalized controller
 * @param options - Registration options (e.g., overwrite existing)
 * @deprecated Prefer the isolated context returned by parse functions. This
 * helper remains for integrations that intentionally use global state.
 */
export function registerAOIsFromController(
  controller: NormalizedController,
  options: RegistrationOptions = { overwrite: true }
): void {
  registerControllerAOIs(controller, globalInstructionRegistry, options);
}

/**
 * Clear all AOI registrations from the global registry.
 * Call this before loading a new controller to avoid stale AOI definitions.
 * 
 * @returns Number of AOIs removed
 */
export function clearAOIs(): number {
  return clearAOIsFromRegistry(globalInstructionRegistry);
}
