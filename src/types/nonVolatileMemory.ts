/**
 * Non-volatile memory types - persisted to localStorage
 */

export type Axis = 'X' | 'Y' | 'Z';

/**
 * Per-axis configuration settings
 */
export interface AxisConfig {
  /** Scale type: linear for mills, angular for rotary axes */
  scaleType: 'linear' | 'angular';
  /** Scale resolution in microns (1, 2, 5, 10, 20) */
  scaleResolution: number;
  /** Display resolution (affects decimal places shown) */
  displayResolution: number;
  /** Scale direction (left or right counting) */
  scaleDirection: 'left' | 'right';
  /** Error compensation enabled */
  errorCompensationEnabled: boolean;
  /** Radius or diameter display mode (for angular scales) */
  radiusDiameter: 'radius' | 'diameter';
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
  /** Per-axis configuration */
  axisConfig: {
    X: AxisConfig;
    Y: AxisConfig;
    Z: AxisConfig;
  };
  /** Zero approach warning enabled */
  zeroApproachEnabled: boolean;
  /** Zero approach distance (when beeping starts) */
  zeroApproachDistance: number;
  /** Zero approach tolerance (hysteresis) */
  zeroApproachTolerance: number;
  /** Sleep timer in minutes (0 = disabled) */
  sleepTimer: number;
}

/**
 * Default axis configuration (5 micron scales, standard for mills)
 */
const DEFAULT_AXIS_CONFIG: AxisConfig = {
  scaleType: 'linear',
  scaleResolution: 5, // 5 microns (0.005mm / 0.0002")
  displayResolution: 5, // 5 microns (0.005mm / 0.0002")
  scaleDirection: 'left',
  errorCompensationEnabled: false,
  radiusDiameter: 'radius',
};

/**
 * Default non-volatile memory values
 */
export const DEFAULT_NON_VOLATILE_MEMORY: NonVolatileMemory = {
  beepEnabled: true,
  defaultUnit: 'inch',
  precision: 4,
  bootMessageMode: 'show',
  axisConfig: {
    X: { ...DEFAULT_AXIS_CONFIG },
    Y: { ...DEFAULT_AXIS_CONFIG },
    Z: { ...DEFAULT_AXIS_CONFIG },
  },
  zeroApproachEnabled: false,
  zeroApproachDistance: 0.002, // 0.002" default approach distance
  zeroApproachTolerance: 0.0, // 0.0000" default tolerance
  sleepTimer: 0, // 0 = disabled
};

/**
 * localStorage key for non-volatile memory persistence
 */
export const NON_VOLATILE_MEMORY_STORAGE_KEY = 'el400-dro-non-volatile-memory';
