/**
 * AOI Registration utilities for parsing
 * 
 * Handles automatic registration of AOIs from parsed controllers
 * into the global instruction registry.
 */

import type { NormalizedController, NormalizedAOI } from '../types/normalized';
import { 
  globalInstructionRegistry, 
  registerAOI as registerAOIToRegistry,
  clearAOIs as clearAOIsFromRegistry,
  type AOIRegistrationInfo,
  type RegistrationOptions,
} from '../types/instruction-registry';

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

/**
 * Register AOIs from a NormalizedController into the global instruction registry.
 * This enables BOX symbols to display proper parameter labels for AOI instructions.
 * 
 * @param controller - The parsed normalized controller
 * @param options - Registration options (e.g., overwrite existing)
 */
export function registerAOIsFromController(
  controller: NormalizedController,
  options: RegistrationOptions = { overwrite: true }
): void {
  if (!controller.aois || controller.aois.length === 0) {
    return;
  }

  for (const aoi of controller.aois) {
    const registrationInfo = normalizedAOIToRegistrationInfo(aoi);
    registerAOIToRegistry(globalInstructionRegistry, registrationInfo, options);
  }
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
