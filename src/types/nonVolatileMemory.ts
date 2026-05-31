/**
 * Non-volatile memory types - persisted to localStorage
 */

/**
 * Axis on which the taper angle is displayed (Section 6.2 `tAPEr on`, used by
 * the Taper Calculation function in Section 9.2.2). The other axis of the pair
 * shows the radius. 'Zprime' is the lathe 4th-axis variant; on this 3-axis mill
 * simulator it behaves like 'Z' for the radius pairing.
 */
export type TaperOnAxis = 'X' | 'Z' | 'Zprime';

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
  /** Axis on which the Taper function displays the angle (Section 6.2). */
  taperOnAxis: TaperOnAxis;
}

/**
 * Default non-volatile memory values
 */
export const DEFAULT_NON_VOLATILE_MEMORY: NonVolatileMemory = {
  beepEnabled: true,
  defaultUnit: 'inch',
  precision: 4,
  bootMessageMode: 'show',
  taperOnAxis: 'X',
};

/**
 * localStorage key for non-volatile memory persistence
 */
export const NON_VOLATILE_MEMORY_STORAGE_KEY = 'el400-dro-non-volatile-memory';
