/** Capture limit used by a controller trend. */
export type NormalizedTrendCaptureSizeType = 'No Limit' | 'Samples' | 'Time Period';

/** Whether a trend begins or ends from a configured event. */
export type NormalizedTrendTriggerType = 'Event Trigger' | 'No Trigger';

/** Source used by one side of a trend trigger comparison. */
export type NormalizedTrendTriggerTargetType = 'Target Tag' | 'Target Value';

/** How pre- or post-trigger capture length is measured. */
export type NormalizedTrendSampleType = 'Samples' | 'Time Period';

/** Logical join between two configured trigger conditions. */
export type NormalizedTrendLogicalOperation = 'AND' | 'OR';

/** Display shape declared for a trend pen. */
export type NormalizedTrendPenType = 'Analog' | 'Digital' | 'Full-Width';

/** One sampled value rendered by a controller trend. */
export interface NormalizedTrendPen {
  name?: string;
  description?: string;
  color?: string;
  visible?: boolean;
  width?: number;
  type?: NormalizedTrendPenType;
  style?: number;
  marker?: number;
  min?: number;
  max?: number;
  engineeringUnits?: string;
}

/** Controller trend definition in source order. */
export interface NormalizedTrend {
  name?: string;
  /** Schema-declared identity. Kept as a string to preserve unsigned-long precision. */
  uid?: string;
  description?: string;
  samplePeriod?: number;
  numberOfCaptures?: number;
  captureSizeType?: NormalizedTrendCaptureSizeType;
  captureSize?: number;
  startTriggerType?: NormalizedTrendTriggerType;
  startTriggerTag1?: string;
  startTriggerOperation1?: number;
  startTriggerTargetType1?: NormalizedTrendTriggerTargetType;
  startTriggerTargetValue1?: string;
  startTriggerTargetTag1?: string;
  startTriggerLogicalOperation?: NormalizedTrendLogicalOperation;
  startTriggerTag2?: string;
  startTriggerOperation2?: number;
  startTriggerTargetType2?: NormalizedTrendTriggerTargetType;
  startTriggerTargetValue2?: string;
  startTriggerTargetTag2?: string;
  preSampleType?: NormalizedTrendSampleType;
  preSamples?: number;
  stopTriggerType?: NormalizedTrendTriggerType;
  stopTriggerTag1?: string;
  stopTriggerOperation1?: number;
  stopTriggerTargetType1?: NormalizedTrendTriggerTargetType;
  stopTriggerTargetValue1?: string;
  stopTriggerTargetTag1?: string;
  stopTriggerLogicalOperation?: NormalizedTrendLogicalOperation;
  stopTriggerTag2?: string;
  stopTriggerOperation2?: number;
  stopTriggerTargetType2?: NormalizedTrendTriggerTargetType;
  stopTriggerTargetValue2?: string;
  stopTriggerTargetTag2?: string;
  postSampleType?: NormalizedTrendSampleType;
  postSamples?: number;
  trendxVersion?: string;
  pens: NormalizedTrendPen[];
}

/** One tag reference retained in a quick-watch list. */
export interface NormalizedWatchTag {
  specifier?: string;
  scope?: string;
}

/** Named, ordered collection of controller or program tag specifiers. */
export interface NormalizedQuickWatchList {
  name?: string;
  watchTags: NormalizedWatchTag[];
}
