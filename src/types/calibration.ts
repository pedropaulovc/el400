/** Cumulative coordinates relative to the SLEC start, in millimetres. */
export interface CalibrationPoint {
  measuredMm: number;
  referenceMm: number;
}

/** Durable per-axis compensation applied before datum and display transforms. */
export type AxisCalibration =
  | { kind: 'none' }
  | { kind: 'lec'; factor: number }
  | { kind: 'angular'; factor: number }
  | { kind: 'ppr'; pulsesPerRevolution: number }
  | { kind: 'slec'; originMm: number; points: CalibrationPoint[] };
