import type {
  NormalizedFBDConnection,
  NormalizedFBDConnector,
  NormalizedFBDElement,
  NormalizedFBDPort,
  NormalizedFBDSheet,
} from '../types';

export interface FBDPoint {
  x: number;
  y: number;
}

export interface FBDRect extends FBDPoint {
  width: number;
  height: number;
}

export interface FBDPortLayout {
  port: NormalizedFBDPort | {
    id: 'value';
    label: 'Value';
    direction: 'input' | 'output';
    side: 'left' | 'right';
    order: 0;
    defaultVisible: true;
    visible: true;
  };
  point: FBDPoint;
}

export interface FBDElementLayout {
  element: NormalizedFBDElement;
  bounds: FBDRect;
  ports: FBDPortLayout[];
}

export type FBDRouteKind = 'forward' | 'backward' | 'feedback';

export interface FBDConnectionLayout {
  connection: NormalizedFBDConnection;
  source: FBDPortLayout;
  destination: FBDPortLayout;
  points: FBDPoint[];
  path: string;
  routeKind: FBDRouteKind;
}

export type FBDLayoutDiagnosticCode =
  | 'FBD_LAYOUT_DUPLICATE_ELEMENT_ID'
  | 'FBD_LAYOUT_MISSING_ELEMENT'
  | 'FBD_LAYOUT_MISSING_PORT'
  | 'FBD_LAYOUT_INVALID_DIRECTION'
  | 'FBD_CONNECTOR_BLANK_NAME'
  | 'FBD_CONNECTOR_AMBIGUOUS_SOURCE'
  | 'FBD_CONNECTOR_UNMATCHED'
  | 'FBD_CONNECTOR_CASE_VARIANT';

export interface FBDLayoutDiagnostic {
  code: FBDLayoutDiagnosticCode;
  message: string;
  sheetIndex?: number;
  elementId?: string;
  connectionIndex?: number;
  connectorName?: string;
}

export interface FBDSheetLayout {
  sheet: NormalizedFBDSheet;
  elements: FBDElementLayout[];
  connections: FBDConnectionLayout[];
  diagnostics: FBDLayoutDiagnostic[];
  bounds: FBDRect;
  viewBox: string;
}

export interface FBDConnectorLocation {
  sheetIndex: number;
  element: NormalizedFBDConnector;
}

export interface FBDConnectorRelationship {
  name: string;
  producer: FBDConnectorLocation;
  consumers: FBDConnectorLocation[];
}

export interface FBDConnectorIndex {
  relationships: FBDConnectorRelationship[];
  diagnostics: FBDLayoutDiagnostic[];
}
