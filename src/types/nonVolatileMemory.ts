/**
 * Non-volatile memory types - persisted to localStorage
 */

/** Valid SC scale-resolution values in microns (manual section 6.2). */
export type ScaleResolutionValue =
  | '0.1'
  | '0.2'
  | '0.5'
  | '1'
  | '2'
  | '5'
  | '10'
  | '20'
  | '50';

/**
 * Per-axis scale (measuring-system) resolution in microns. Each axis can carry
 * a different magnetic-scale resolution (manual note *6: applicable per axis).
 */
export interface ScaleResolutionByAxis {
  X: ScaleResolutionValue;
  Y: ScaleResolutionValue;
  Z: ScaleResolutionValue;
}

/**
 * User-configurable settings that persist across sessions
 */
export interface NonVolatileMemory {
  /** Audio feedback on button press */
  beepEnabled: boolean;
  /** Default unit on startup */
  defaultUnit: 'inch' | 'mm';
  /** Decimal places for display (e.g., 4 for 0.0001) */
  precision: number;
  /** Whether to show boot message on startup */
  bootMessageMode: 'show' | 'skip';
  /** Per-axis measuring-system (scale) resolution in microns - SC parameter (US-021) */
  scaleResolution: ScaleResolutionByAxis;
}

/** Mill default scale resolution: 5 micron on every axis (manual section 6.2). */
export const DEFAULT_SCALE_RESOLUTION: ScaleResolutionByAxis = {
  X: '5',
  Y: '5',
  Z: '5',
};

/**
 * Default non-volatile memory values
 */
export const DEFAULT_NON_VOLATILE_MEMORY: NonVolatileMemory = {
  beepEnabled: true,
  defaultUnit: 'inch',
  precision: 4,
  bootMessageMode: 'show',
  scaleResolution: DEFAULT_SCALE_RESOLUTION,
};

/**
 * localStorage key for non-volatile memory persistence
 */
export const NON_VOLATILE_MEMORY_STORAGE_KEY = 'el400-dro-non-volatile-memory';
