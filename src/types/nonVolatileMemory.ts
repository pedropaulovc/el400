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
 * Per-axis counting mode (manual section 6.2 `LinEAr` / `AnGULAr`, US-040).
 * `'linear'` is a translation scale (glass/magnetic) reading distance in the
 * user's linear unit; `'angular'` is a rotary encoder reading an angle in
 * degrees. The choice picks which display-resolution option set applies (linear
 * micron values vs. the angular degree formats) and, for angular axes, switches
 * the readout to wrapped degrees instead of unit-converted distance.
 */
export type CountingMode = 'linear' | 'angular';

/** Per-axis counting mode. */
export interface CountingModeByAxis {
  X: CountingMode;
  Y: CountingMode;
  Z: CountingMode;
}

/**
 * Z depth-sense preference (AC 2.4). `'depth-negative'` is the standard
 * convention (cutting deeper makes Z more negative); `'depth-positive'` inverts
 * the Z display sign so increasing cutting depth increases the displayed value.
 * Composes with the per-axis Direction inside `directionSign`.
 */
export type ZDepthSense = 'depth-negative' | 'depth-positive';

/**
 * `BP DIST` approach distance for the Near-Zero Warning (US-024, manual §8.3,
 * setup `ZERO AP` / video §1.13). Stored as an inch string — the device's native
 * tolerance unit — so it is independent of the display unit; the warning engages
 * once an axis is within this distance of zero. The 0.002" default matches the
 * manual's "within 50 microns of the set value".
 */
export type ZeroApproachDistance = '0.002' | '0.004' | '0.005' | '0.010' | '0.020';

/**
 * `BP TOLR` departure tolerance for the Near-Zero Warning (US-024). Hysteresis
 * width (inch string) the axis must travel BEYOND `BP DIST` before the warning
 * clears, preventing beep flutter at the threshold. Default 0.0000" (the warning
 * clears as soon as the axis leaves the approach band).
 */
export type ZeroApproachTolerance = '0' | '0.002' | '0.005' | '0.010';

/**
 * Per-axis radius/diameter measurement mode (manual section 6.2 `rAd` / `diA`,
 * US-041). `'radius'` (radial) is the mill default: the display equals actual
 * axis movement 1:1. `'diameter'` (diametric) is the lathe convention: the
 * displayed value is doubled, so a 1.000 cut depth shows 2.000 (the turned
 * diameter). It is a display-only ×2 scale applied in `displayComputation`; it
 * never mutates stored machine position, offsets, or macro coordinate math.
 * Setup-menu labels map `'radius'→rAd` and `'diameter'→diA`. Per note *6 it is
 * configurable per individual axis (AC 41.5) and is meaningful only while the
 * axis counting mode is Linear (AC 41.7).
 */
export type MeasurementMode = 'radius' | 'diameter';

/** Per-axis measurement mode (radius vs diameter). */
export interface MeasurementModeByAxis {
  X: MeasurementMode;
  Y: MeasurementMode;
  Z: MeasurementMode;
}

/**
 * Touch-probe DRO type (manual §10.1.1, setup `dro t` / `dro F`).
 * - 'transmit' (`dro t`): the readout keeps counting on a probe trigger and
 *   flashes the probe message; used with the datum/measurement functions.
 * - 'freeze' (`dro F`): the readout freezes the coordinates on a probe trigger
 *   until the probe clears.
 */
export type ProbeDroType = 'transmit' | 'freeze';

/**
 * Keypad lock state (manual §6.2 `LoC`, note *3; video §1.12). Modelled as an
 * enum (not a leaked boolean) so the lock status can cross module boundaries
 * safely (the root reducer reads it, the `LoC` setup parameter commits it).
 * - 'off' (`LoC off`, default): the front panel is live.
 * - 'on'  (`LoC on`): every front-panel key is disabled except the wrench/setup
 *   key, so the operator cannot accidentally zero an axis or change a value and
 *   lose the datum. The live position readout keeps updating regardless (US-043).
 */
export type KeypadLockState = 'off' | 'on';

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
  /** Near-Zero Warning on/off — setup `ZERO AP` / `BU22` toggle (US-024, AC24.2) */
  zeroApproachEnabled: boolean;
  /** Near-Zero Warning approach distance — setup `BP DIST` (US-024, AC24.4) */
  zeroApproachDistance: ZeroApproachDistance;
  /** Near-Zero Warning departure tolerance — setup `BP TOLR` (US-024, AC24.5) */
  zeroApproachTolerance: ZeroApproachTolerance;
  /** Per-axis radius/diameter display mode - rAd/diA parameter (US-041, manual section 6.2) */
  measurementMode: MeasurementModeByAxis;
  /** Per-axis counting mode: linear scale vs angular (rotary) encoder (US-040) */
  countingMode: CountingModeByAxis;
  /** Touch-probe DRO type: transmit (count + flash) or freeze (US-032, §10.1.1) */
  probeDroType: ProbeDroType;
  /**
   * Encoder-fail warning - EnF parameter (US-042, manual section 6.2). When
   * true, an axis that loses its encoder signal shows `no SIG`. Default off
   * (legacy behavior). Independent of beepEnabled (US-025).
   */
  encoderFailWarning: boolean;
  /** Keypad lock: 'off' (live) or 'on' (front panel locked) - LoC parameter (US-043, §6.2) */
  keypadLock: KeypadLockState;
  /**
   * Display sleep-timer idle period in minutes - SLEEP T parameter (US-026,
   * manual section 6.2 / §6.2 note *4). After this many minutes with no key press
   * or axis movement the display sleeps (dims) and the wrench LED flashes; any key
   * or movement wakes it. `0` disables the timer (the display never sleeps).
   * Valid range 0-120.
   */
  sleepTimeout: number;
}

/** SLEEP T disabled sentinel: 0 minutes means the display never sleeps (US-026). */
export const SLEEP_TIMEOUT_DISABLED = 0;

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

/** Mill default measurement mode: radius (1:1) on every axis (AC 41.3, manual section 6.2). */
export const DEFAULT_MEASUREMENT_MODE: MeasurementModeByAxis = {
  X: 'radius',
  Y: 'radius',
  Z: 'radius',
};

/**
 * Mill default counting mode: linear on every axis (AC 40.6 — all DRO PROS mill
 * kits ship with linear scales; angular is for rotary-axis installs).
 */
export const DEFAULT_COUNTING_MODE: CountingModeByAxis = {
  X: 'linear',
  Y: 'linear',
  Z: 'linear',
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
  // Near-Zero Warning defaults (US-024): off until the operator enables it, with
  // the manual's 0.002" (≈50 micron) approach band and no departure hysteresis.
  zeroApproachEnabled: false,
  zeroApproachDistance: '0.002',
  zeroApproachTolerance: '0',
  measurementMode: DEFAULT_MEASUREMENT_MODE,
  countingMode: DEFAULT_COUNTING_MODE,
  probeDroType: 'transmit',
  encoderFailWarning: false,
  keypadLock: 'off',
  sleepTimeout: SLEEP_TIMEOUT_DISABLED,
};

/**
 * localStorage key for non-volatile memory persistence
 */
export const NON_VOLATILE_MEMORY_STORAGE_KEY = 'el400-dro-non-volatile-memory';
