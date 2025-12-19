/**
 * Non-volatile memory types - persisted to localStorage
 */

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
  /** Zero approach warning enabled (BU22 ON/OFF) */
  zeroApproachEnabled: boolean;
  /** Beep distance - distance from zero when beeping starts (in inches) */
  bpDist: number;
  /** Beep tolerance - hysteresis to prevent beep flutter when leaving zero (in inches) */
  bpTolr: number;
}

/**
 * Default non-volatile memory values
 */
export const DEFAULT_NON_VOLATILE_MEMORY: NonVolatileMemory = {
  beepEnabled: true,
  defaultUnit: 'inch',
  precision: 4,
  bootMessageMode: 'show',
  zeroApproachEnabled: false,
  bpDist: 0.002,
  bpTolr: 0.0000,
};

/**
 * localStorage key for non-volatile memory persistence
 */
export const NON_VOLATILE_MEMORY_STORAGE_KEY = 'el400-dro-non-volatile-memory';
