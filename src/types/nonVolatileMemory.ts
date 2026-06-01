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
 * Valid dP display-resolution values in microns (manual section 6.2). Same set
 * of nine resolutions as the scale resolution SC; dP is the *display-only*
 * counterpart (US-022) and is independent of SC (AC22.3).
 */
export type DisplayResolutionValue = ScaleResolutionValue;

/**
 * Per-axis display resolution in microns - dP parameter (US-022). Controls how
 * many decimal places the readout shows for each axis; never affects the stored
 * machine position or measurement accuracy (AC22.5).
 */
export interface DisplayResolutionByAxis {
  X: DisplayResolutionValue;
  Y: DisplayResolutionValue;
  Z: DisplayResolutionValue;
}

/**
 * Axis on which the taper angle is displayed (Section 6.2 `tAPEr on`, used by
 * the Taper Calculation function in Section 9.2.2). The other axis of the pair
 * shows the radius. 'Zprime' is the lathe 4th-axis variant; on this 3-axis mill
 * simulator it behaves like 'Z' for the radius pairing.
 */
export type TaperOnAxis = 'X' | 'Z' | 'Zprime';

/**
 * Per-axis counting direction (manual section 6.2 `dir`). `'normal'` follows the
 * tool's-eye standard convention (displayed value increases as the tool moves in
 * the positive machine direction); `'reversed'` flips the displayed sign. Setup
 * menu labels map `'normal'→LEFT` and `'reversed'→riGht`.
 */
export type AxisDirection = 'normal' | 'reversed';

/** Per-axis counting direction. */
export interface AxisDirectionByAxis {
  X: AxisDirection;
  Y: AxisDirection;
  Z: AxisDirection;
}

/**
 * Z depth-sense preference (AC 2.4). `'depth-negative'` is the standard
 * convention (cutting deeper makes Z more negative); `'depth-positive'` inverts
 * the Z display sign so increasing cutting depth increases the displayed value.
 * Composes with the per-axis Direction inside `directionSign`.
 */
export type ZDepthSense = 'depth-negative' | 'depth-positive';

/**
 * Touch-probe DRO type (manual §10.1.1, setup `dro t` / `dro F`).
 * - 'transmit' (`dro t`): the readout keeps counting on a probe trigger and
 *   flashes the probe message; used with the datum/measurement functions.
 * - 'freeze' (`dro F`): the readout freezes the coordinates on a probe trigger
 *   until the probe clears.
 */
export type ProbeDroType = 'transmit' | 'freeze';

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
  /** Per-axis display resolution in microns - dP parameter (US-022, display-only) */
  displayResolution: DisplayResolutionByAxis;
  /** Axis on which the Taper function displays the angle (Section 6.2). */
  taperOnAxis: TaperOnAxis;
  /** Per-axis counting direction - dir parameter (US-002, manual section 6.2) */
  axisDirection: AxisDirectionByAxis;
  /** Z depth-sense preference: standard depth-negative or depth-positive (AC 2.4) */
  zDepthSense: ZDepthSense;
  /** Touch-probe DRO type: transmit (count + flash) or freeze (US-032, §10.1.1) */
  probeDroType: ProbeDroType;
}

/** Mill default counting direction: normal (standard convention) on every axis. */
export const DEFAULT_AXIS_DIRECTION: AxisDirectionByAxis = {
  X: 'normal',
  Y: 'normal',
  Z: 'normal',
};

/** Mill default scale resolution: 5 micron on every axis (manual section 6.2). */
export const DEFAULT_SCALE_RESOLUTION: ScaleResolutionByAxis = {
  X: '5',
  Y: '5',
  Z: '5',
};

/**
 * Mill default display resolution: 5 micron on every axis (manual `dP 5.0`,
 * section 6.2). On the 8-cell panel this renders 4 decimals in both units,
 * matching the device's and the simulator's default 4-decimal readout (AC22.2).
 */
export const DEFAULT_DISPLAY_RESOLUTION: DisplayResolutionByAxis = {
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
  displayResolution: DEFAULT_DISPLAY_RESOLUTION,
  taperOnAxis: 'X',
  axisDirection: DEFAULT_AXIS_DIRECTION,
  zDepthSense: 'depth-negative',
  probeDroType: 'transmit',
};

/**
 * localStorage key for non-volatile memory persistence
 */
export const NON_VOLATILE_MEMORY_STORAGE_KEY = 'el400-dro-non-volatile-memory';
