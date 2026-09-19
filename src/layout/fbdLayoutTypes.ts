import type {
  NormalizedFBDAttachment,
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

export interface FBDAttachmentLayout {
  attachment: NormalizedFBDAttachment;
  from: FBDElementLayout;
  to: FBDElementLayout;
  points: FBDPoint[];
  path: string;
}

export type FBDLayoutDiagnosticCode =
  | 'FBD_LAYOUT_UNPLACEABLE_ELEMENT'
  | 'FBD_LAYOUT_DUPLICATE_ELEMENT_ID'
  | 'FBD_LAYOUT_DUPLICATE_PORT_ID'
  | 'FBD_LAYOUT_AMBIGUOUS_PORT'
  | 'FBD_LAYOUT_MISSING_ELEMENT'
  | 'FBD_LAYOUT_MISSING_PORT'
  | 'FBD_LAYOUT_INVALID_DIRECTION'
  | 'FBD_ATTACHMENT_MISSING_ELEMENT'
  | 'FBD_ATTACHMENT_AMBIGUOUS_ELEMENT'
  | 'FBD_ATTACHMENT_INVALID_SOURCE'
  | 'FBD_ATTACHMENT_INVALID_TARGET'
  | 'FBD_RENDER_SHEET_FAILURE'
  | 'FBD_CONNECTOR_BLANK_NAME'
  | 'FBD_CONNECTOR_AMBIGUOUS_SOURCE'
  | 'FBD_CONNECTOR_UNMATCHED'
  | 'FBD_CONNECTOR_CASE_VARIANT';

export interface FBDLayoutDiagnostic {
  code: FBDLayoutDiagnosticCode;
  message: string;
  sheetIndex?: number;
  elementId?: string;
  portId?: string;
  connectionIndex?: number;
  attachmentIndex?: number;
  connectorName?: string;
}

export interface FBDSheetLayout {
  sheet: NormalizedFBDSheet;
  elements: FBDElementLayout[];
  connections: FBDConnectionLayout[];
  attachments: FBDAttachmentLayout[];
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
