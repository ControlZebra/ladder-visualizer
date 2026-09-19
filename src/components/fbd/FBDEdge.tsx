import { BaseEdge, type Edge, type EdgeProps } from '@xyflow/react';
import type { FBDPoint } from '../../layout';

export type FBDFlowEdgeData = {
  path: string;
  endpoints?: readonly [FBDPoint, FBDPoint];
};

export type FBDFlowEdge = Edge<FBDFlowEdgeData, 'fbdWire'>;

export function FBDEdge({ id, data, style, markerEnd, interactionWidth }: EdgeProps<FBDFlowEdge>) {
  if (!data?.path) return null;
  return (
    <>
      <BaseEdge
        id={id}
        path={data.path}
        style={style}
        markerEnd={markerEnd}
        interactionWidth={interactionWidth}
      />
      {data.endpoints?.map((point, index) => (
        <circle
          key={`${id}-endpoint-${index}`}
          className="fbd-wire-endpoint"
          cx={point.x}
          cy={point.y}
          r={3.25}
          aria-hidden="true"
        />
      ))}
    </>
  );
}
