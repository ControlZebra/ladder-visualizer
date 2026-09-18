/** Vendor-neutral controller task kind. */
export type NormalizedTaskType = 'Continuous' | 'Periodic' | 'Event';

/** Controller execution class where the source declares one. */
export type NormalizedTaskClass = 'Standard' | 'Safety';

/** Event trigger details for an event task. */
export interface NormalizedTaskEvent {
  trigger?: string;
  tag?: string;
  timeoutEnabled?: boolean;
}

/** Controller task and its ordered program schedule. */
export interface NormalizedTask {
  name: string;
  type: NormalizedTaskType;
  description?: string;
  /** Source numeric value; the L5X schema does not encode a unit. */
  rate?: number;
  priority?: number;
  /** Source numeric value; the L5X schema does not encode a unit. */
  watchdog?: number;
  disableUpdateOutputs?: boolean;
  inhibited?: boolean;
  verified?: boolean;
  class?: NormalizedTaskClass;
  event?: NormalizedTaskEvent;
  /** Ordered program names; stable cross-document IDs remain issue #12. */
  scheduledProgramNames: string[];
}
