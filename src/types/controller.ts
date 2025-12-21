import { DataType } from './data-types';
import { Tag } from './tags';
import { Program } from './programs';
import { MapDevice } from './devices';

/**
 * SFC Execution Control options
 */
export type SfcExecutionControl = 'CurrentActive' | 'ExecuteUntilFalse';

/**
 * SFC Restart Position options
 */
export type SfcRestartPosition = 'MostRecent' | 'InitialStep';

/**
 * SFC Last Scan options
 */
export type SfcLastScan = 'DontScan' | 'ProgrammaticReset';

/**
 * Add-On Instruction definition
 */
export interface AOI {
  name: string;
  // Add more fields as needed when we parse AOIs
}

/**
 * Root interface for the controller JSON export
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
