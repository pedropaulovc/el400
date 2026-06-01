/**
 * Volatile memory types - DRO runtime state that is lost on refresh.
 */

/**
 * Axis values for X, Y, Z
 */
export interface AxisValues {
  X: number;
  Y: number;
  Z: number;
}

export type Axis = 'X' | 'Y' | 'Z';
export type DatumMode = 'abs' | 'inc';

/**
 * Display power state (US-026 sleep timer). `'awake'` is the normal lit display;
 * `'asleep'` dims/blanks the readout and flashes the wrench LED after the SLEEP T
 * idle period elapses. Modelled as an enum (not a boolean) so further power
 * states (e.g. a future deep-dim) can be added without churning call sites.
 */
export type DisplayPower = 'awake' | 'asleep';

export const ZERO_AXIS_VALUES: AxisValues = { X: 0, Y: 0, Z: 0 };

/**
 * DRO volatile memory - runtime state managed by DRO reducer
 * Note: Boot stage is now managed by DROModeContext
 */
export interface VolatileMemory {
  displayValues: AxisValues;
  absolute: AxisValues;
  incremental: AxisValues;
  mode: DatumMode;
  workOffsets: AxisValues;
  activeAxis: Axis | null;
}

/**
 * Volatile memory state stored in the DRO reducer.
 * This is the "source of truth" state that the reducer manages.
 * displayValues and absolute are computed from this state + millState.
 */
export interface VolatileMemoryState {
  mode: DatumMode;
  activeAxis: Axis | null;
  workOffsets: AxisValues;
  incrementalValues: AxisValues;
  manualAbsoluteValues: AxisValues;
  inputBuffer: string;
  /**
   * Sub Datum Memory points (US-009/010/011), keyed by 1-indexed step number,
   * coordinates in mm. Retained across SDM sessions so Learn/Program writes are
   * recallable by Run (manual §8.2: the DRO stores up to 1000 sub-datums).
   */
  sdmPoints: Record<number, AxisValues>;
  /**
   * Display power state (US-026 sleep timer). `'asleep'` after the SLEEP T idle
   * period; any key or axis movement returns it to `'awake'`. Position tracking
   * continues in the background while asleep (no data loss).
   */
  displayPower: DisplayPower;
  /**
   * Machine position captured when the display went to sleep (US-026). Used to
   * detect a real jog while asleep: a MILL_STATE_CHANGED whose position differs
   * from this baseline wakes the display. null whenever the display is awake.
   */
  sleepBaselinePosition: AxisValues | null;
}

/**
 * Initial volatile memory state
 */
export const INITIAL_VOLATILE_MEMORY_STATE: VolatileMemoryState = {
  mode: 'abs',
  activeAxis: null,
  workOffsets: ZERO_AXIS_VALUES,
  incrementalValues: ZERO_AXIS_VALUES,
  manualAbsoluteValues: ZERO_AXIS_VALUES,
  inputBuffer: '',
  sdmPoints: {},
  displayPower: 'awake',
  sleepBaselinePosition: null,
};

/**
 * Actions for modifying volatile memory
 * Note: clearKeyPressed is now handled by DROModeContext
 */
export interface VolatileMemoryActions {
  toggleMode: () => void;
  setMode: (mode: DatumMode) => void;
  zeroAxis: (axis: Axis) => void;
  setAxisValue: (axis: Axis, value: number) => void;
  selectAxis: (axis: Axis | null) => void;
  halfAxis: (axis: Axis) => void;
}
