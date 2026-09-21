/** Cumulative coordinates relative to the SLEC start, in millimetres. */
export interface CalibrationPoint {
  measuredMm: number;
  referenceMm: number;
}

export type AxisCalibration =
  | { kind: 'none' }
  | { kind: 'lec'; factor: number }
  | { kind: 'angular'; factor: number }
  | { kind: 'ppr'; pulsesPerRevolution: number }
  | { kind: 'slec'; originMm: number; points: CalibrationPoint[] };

/** Setup-local workflow. Nothing here is durable until SAU CHG. */
export interface CalibrationEditor {
  phase: 'method' | 'lec-menu' | 'measure' | 'reference' | 'factor' | 'ppr'
    | 'slec-menu' | 'slec-reference' | 'slec-measure' | 'slec-value'
    | 'slec-edit' | 'slec-edit-value';
  method: 'lec' | 'slec' | 'angular';
  menuIndex: number;
  datumMm: number;
  measuredMm: number;
  buffer: string;
  originMm: number;
  points: CalibrationPoint[];
  segmentIndex: number;
  editField: 'measuredMm' | 'referenceMm';
}
