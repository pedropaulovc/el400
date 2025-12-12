/**
 * DRO settings types - persisted to localStorage
 */

/**
 * User-configurable DRO settings
 */
export interface DROSettings {
  /** Audio feedback on button press */
  beepEnabled: boolean;
  /** Default unit on startup */
  defaultUnit: 'inch' | 'mm';
  /** Decimal places for display (e.g., 4 for 0.0001) */
  precision: number;
}

/**
 * Default settings for the DRO
 */
export const DEFAULT_SETTINGS: DROSettings = {
  beepEnabled: true,
  defaultUnit: 'inch',
  precision: 4,
};

/**
 * localStorage key for settings persistence
 */
export const SETTINGS_STORAGE_KEY = 'el400-dro-settings';
