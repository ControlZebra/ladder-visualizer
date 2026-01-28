import { DataType } from './data-types';
import { Tag } from './tags';
import { Program } from './programs';
import { MapDevice } from './devices';

/**
 * SFC Execution Control options
 * @deprecated Use NormalizedController instead. This type will be removed in a future version.
 */
export type SfcExecutionControl = 'CurrentActive' | 'ExecuteUntilFalse';

/**
 * SFC Restart Position options
 * @deprecated Use NormalizedController instead. This type will be removed in a future version.
 */
export type SfcRestartPosition = 'MostRecent' | 'InitialStep';

/**
 * SFC Last Scan options
 * @deprecated Use NormalizedController instead. This type will be removed in a future version.
 */
export type SfcLastScan = 'DontScan' | 'ProgrammaticReset';

/**
 * Add-On Instruction definition
 * @deprecated Use NormalizedAOI instead. This type will be removed in a future version.
 */
export interface AOI {
  name: string;
  // Add more fields as needed when we parse AOIs
}

/**
 * Root interface for the controller JSON export
 * @deprecated Use NormalizedController instead. This type will be removed in a future version.
 * @see NormalizedController for the new vendor-agnostic format
 */
export interface ControllerExport {
  serial_number: string;
  comm_path: string;
  sfc_execution_control: SfcExecutionControl;
  sfc_restart_position: SfcRestartPosition;
  sfc_last_scan: SfcLastScan;
  created_date: string;
  modified_date: string;
  data_types: DataType[];
  tags: Tag[];
  programs: Program[];
  aois: AOI[];
  map_devices: MapDevice[];
}
