import { BaseEdge, type Edge, type EdgeProps } from '@xyflow/react';

export type FBDFlowEdgeData = {
  path: string;
};

export type FBDFlowEdge = Edge<FBDFlowEdgeData, 'fbdWire'>;

export function FBDEdge({ id, data, style, markerEnd, interactionWidth }: EdgeProps<FBDFlowEdge>) {
  if (!data?.path) return null;
  return (
    <BaseEdge
      id={id}
      path={data.path}
      style={style}
      markerEnd={markerEnd}
      interactionWidth={interactionWidth}
    />
  );
}
