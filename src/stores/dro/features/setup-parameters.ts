/**
 * Setup Parameter Registry
 *
 * The setup menu (US-039) is a navigation shell shared by every per-axis and
 * global configuration story (US-021..US-028, US-031, US-040..US-044). This
 * file defines the *registry* of parameters the shell scrolls through. Adding a
 * new setup option is intentionally trivial: append one `SetupParameter` entry
 * to `SETUP_PARAMETERS` (see "Adding a new parameter" below) -- no changes to
 * the reducer or state machine are required.
 *
 * ## Adding a new parameter
 * 1. Append a `SetupParameter` to `SETUP_PARAMETERS`, before the `End` entry.
 * 2. Give it a unique `id`, the 7-segment `label` shown when it is highlighted,
 *    a `scope` ('per-axis' or 'global'), and a `choices` list (the values the
 *    left/right keys cycle through). Each choice has a `value` (stored in the
 *    draft) and the `label` shown on the display.
 * 3. Provide `readValue(ctx)` to seed the current value from committed state.
 *    `ctx.nvMem` is the persisted store; for `per-axis` params, `ctx.axis` is
 *    the axis being configured (null on the SELECT prompt -- fall back to X),
 *    so seed from the right per-axis slot (see `scale-resolution` / SC, the
 *    first real per-axis nvMem-backed parameter, for the pattern). When the
 *    owning story implements commit, wire the chosen value into `SAU CHG`
 *    handling (US-027).
 * 4. That's it. The shell handles highlight rendering, up/down item navigation
 *    with wrap-around, and left/right choice cycling with wrap-around
 *    automatically.
 *
 * The `End` item is special: it has no choices and exits setup when `ent` is
 * pressed (AC 39.7).
 */

import type {
  NonVolatileMemory,
  AxisDirection,
  ZDepthSense,
  CountingMode,
} from '../../../types/nonVolatileMemory';
import { DEFAULT_SCALE_RESOLUTION } from '../../../types/nonVolatileMemory';
import { useSettingsStore } from '../../settingsStore';

/** Scope of a setup parameter: per-axis values differ per X/Y/Z; global apply to all. */
export type SetupParameterScope = 'per-axis' | 'global';

/** Axis a per-axis parameter is being read for; null while on the SELECT prompt. */
export type SetupAxis = 'X' | 'Y' | 'Z' | null;

/** A single selectable choice for a parameter (the values left/right cycle through). */
export interface SetupParameterChoice {
  /** Stable value stored in the draft (e.g. 'mm', 'on'). */
  readonly value: string;
  /** 7-segment label shown when this choice is selected (e.g. 'mm', 'EnF on'). */
  readonly label: string;
}

/** Read-only view of committed state a parameter may seed its current value from. */
export interface SetupReadContext {
  readonly nvMem: NonVolatileMemory;
  /**
   * Axis currently being configured (per-axis params seed from this slot); null
   * on the SELECT prompt, where per-axis params fall back to the X value.
   */
  readonly axis: SetupAxis;
}

/** Definition of one setup parameter in the navigable list. */
export interface SetupParameter {
  /** Unique stable identifier (used as the draft key). */
  readonly id: string;
  /** 7-segment label shown when this parameter is highlighted in the list. */
  readonly label: string;
  /** Whether the value is scoped per individual axis or applies globally. */
  readonly scope: SetupParameterScope;
  /**
   * Choices the left/right keys cycle through. Empty for terminal items like
   * `End`, which carry no value and are acted on with `ent` instead.
   */
  readonly choices: readonly SetupParameterChoice[];
  /**
   * Seed the current value from committed state. Returns the `value` of the
   * choice that should be shown first. Terminal items return ''.
   */
  readonly readValue: (ctx: SetupReadContext) => string;
  /**
   * Optional commit-on-change hook. When present, the setup shell persists the
   * chosen value to nvMem the moment the user cycles the choice (left/right),
   * instead of buffering it in the discard-on-exit draft. This is the surgical
   * per-parameter persistence path used by parameters whose effect must take
   * hold immediately (e.g. Direction, US-002); it is NOT the generic SAU CHG
   * save engine (US-027), which remains unimplemented. Parameters WITHOUT a
   * `commit` keep the draft-only semantics (changes discarded on exit).
   */
  readonly commit?: (ctx: SetupReadContext, value: string) => void;
}

/** The SC (scale resolution) parameter id -- used as its per-axis draft key. */
export const SCALE_RESOLUTION_ID = 'scale-resolution';

/**
 * SC choices: the nine measuring-system resolutions in microns, ascending
 * (manual section 6.2 / specs: 0.1/0.2/0.5/1/2/5/10/20/50 micron). Labels carry
 * the `SC` prefix and a one-decimal micron value as shown on the device
 * ("SC 5.0"). Exported so sibling resolution stories (e.g. dP, US-022) can reuse
 * the identical option set.
 */
export const SCALE_RESOLUTION_CHOICES: readonly SetupParameterChoice[] = [
  { value: '0.1', label: 'SC 0.1' },
  { value: '0.2', label: 'SC 0.2' },
  { value: '0.5', label: 'SC 0.5' },
  { value: '1', label: 'SC 1.0' },
  { value: '2', label: 'SC 2.0' },
  { value: '5', label: 'SC 5.0' },
  { value: '10', label: 'SC 10.0' },
  { value: '20', label: 'SC 20.0' },
  { value: '50', label: 'SC 50.0' },
];

/** The per-axis counting-mode parameter id (US-040) -- its draft key. */
export const COUNTING_MODE_ID = 'counting-mode';

/** The per-axis counting-direction parameter id (US-002) -- its draft key. */
export const DIRECTION_ID = 'direction';

/** The global Z depth-sense parameter id (US-002, AC 2.4) -- its draft key. */
export const Z_DEPTH_ID = 'z-depth';

/** The terminal `End` parameter id -- selecting it with `ent` exits setup. */
export const SETUP_END_ID = 'end';

/**
 * The ordered list of setup parameters, following the section 6.2 table.
 *
 * Only a foundational subset is wired here as proof of the framework (US-039):
 * - `counting-mode` (per-axis): Linear / Angular -- a real per-axis nvMem-backed
 *   parameter with commit-on-change; angular axes display wrapped degrees (US-040).
 * - `enf` (global): encoder-fail warning On / Off, backed by nvMem.beepEnabled
 *   as a stand-in committed value -- proof of a global parameter reading real
 *   settings (full ENF semantics land in US-042).
 * - `End`: terminal exit item.
 *
 * Later stories append their own entries here.
 */
export const SETUP_PARAMETERS: readonly SetupParameter[] = [
  {
    id: COUNTING_MODE_ID,
    label: 'LinEAr',
    scope: 'per-axis',
    choices: [
      { value: 'linear', label: 'LinEAr' },
      { value: 'angular', label: 'AnGULAr' },
    ],
    // Seed from the selected axis's committed counting mode (US-040). On the
    // SELECT prompt (axis null) fall back to X. Default is linear (AC 40.1/40.6).
    readValue: (ctx) => ctx.nvMem.countingMode[ctx.axis ?? 'X'],
    // Commit-on-change (US-040): persist the per-axis mode immediately so the
    // readout switches to angular degrees (or back to linear distance) on exit
    // and on every later encoder update -- same surgical path as Direction.
    commit: (ctx, value) => {
      const axis = ctx.axis ?? 'X';
      useSettingsStore.getState().updateNvMem({
        countingMode: {
          ...ctx.nvMem.countingMode,
          [axis]: value as CountingMode,
        },
      });
    },
  },
  {
    id: 'enf',
    label: 'EnF on',
    scope: 'global',
    choices: [
      { value: 'on', label: 'EnF on' },
      { value: 'off', label: 'EnF oFF' },
    ],
    // Proof: read a real global nvMem flag (beepEnabled stands in until US-042).
    readValue: (ctx) => (ctx.nvMem.beepEnabled ? 'on' : 'off'),
  },
  {
    id: SCALE_RESOLUTION_ID,
    label: 'SC 5.0',
    scope: 'per-axis',
    choices: SCALE_RESOLUTION_CHOICES,
    // Seed from the selected axis's committed scale resolution (nvMem). On the
    // SELECT prompt (axis null) fall back to X. Guard against a stale persisted
    // value that is no longer a valid choice by defaulting to the mill default.
    readValue: (ctx) => {
      const axis = ctx.axis ?? 'X';
      const committed = ctx.nvMem.scaleResolution[axis];
      // Defend against a stale persisted value no longer in the choice set by
      // falling back to the mill default for that axis.
      const isValid = SCALE_RESOLUTION_CHOICES.some((c) => c.value === committed);
      return isValid ? committed : DEFAULT_SCALE_RESOLUTION[axis];
    },
  },
  {
    id: 'taper-on',
    label: 'tAPEr on',
    scope: 'global',
    choices: [
      { value: 'X', label: 'tAPEr X' },
      { value: 'Z', label: 'tAPEr Z' },
      { value: 'Zprime', label: 'tAPEr Z1' },
    ],
    // Reads the committed taper-on axis (US-045). Full commit wiring lands with
    // setup save (US-027); the value is seeded from nvMem here.
    readValue: (ctx) => ctx.nvMem.taperOnAxis,
  },
  {
    id: DIRECTION_ID,
    label: 'LEFt',
    scope: 'per-axis',
    choices: [
      { value: 'normal', label: 'LEFt' },
      { value: 'reversed', label: 'riGht' },
    ],
    // Seed from the selected axis's committed counting direction. On the SELECT
    // prompt (axis null) fall back to X.
    readValue: (ctx) => ctx.nvMem.axisDirection[ctx.axis ?? 'X'],
    // Commit-on-change (US-002): persist the per-axis direction immediately so
    // the readout sign flips on exit and on every later position update.
    commit: (ctx, value) => {
      const axis = ctx.axis ?? 'X';
      useSettingsStore.getState().updateNvMem({
        axisDirection: {
          ...ctx.nvMem.axisDirection,
          [axis]: value as AxisDirection,
        },
      });
    },
  },
  {
    id: Z_DEPTH_ID,
    label: 'dEP nEG',
    scope: 'global',
    choices: [
      { value: 'depth-negative', label: 'dEP nEG' },
      { value: 'depth-positive', label: 'dEP PoS' },
    ],
    // Global Z depth-sense preference (AC 2.4).
    readValue: (ctx) => ctx.nvMem.zDepthSense,
    // Commit-on-change (US-002): persist immediately, same path as Direction.
    commit: (_ctx, value) => {
      useSettingsStore.getState().updateNvMem({ zDepthSense: value as ZDepthSense });
    },
  },
  {
    id: SETUP_END_ID,
    label: 'End',
    scope: 'global',
    choices: [],
    readValue: () => '',
  },
];

/** Look up a parameter by index, clamped to the registry bounds. */
export function getParameterAt(index: number): SetupParameter {
  const count = SETUP_PARAMETERS.length;
  // Index is always kept in-range by the navigation helpers; clamp defensively.
  const safeIndex = ((index % count) + count) % count;
  const param = SETUP_PARAMETERS[safeIndex];
  if (param === undefined) {
    throw new Error('SETUP_PARAMETERS is empty');
  }
  return param;
}

/** Total number of parameters in the registry. */
export const SETUP_PARAMETER_COUNT = SETUP_PARAMETERS.length;

/**
 * Advance an item index by `delta` with wrap-around (AC 39.3).
 * e.g. past the last item wraps to the first; before the first wraps to last.
 */
export function wrapItemIndex(index: number, delta: number): number {
  const count = SETUP_PARAMETER_COUNT;
  return (((index + delta) % count) + count) % count;
}

/**
 * Find the index of a choice value within a parameter, defaulting to 0 when the
 * value is not one of the choices (e.g. terminal items or stale drafts).
 */
export function choiceIndexOf(param: SetupParameter, value: string): number {
  const idx = param.choices.findIndex((c) => c.value === value);
  return idx === -1 ? 0 : idx;
}

/**
 * Cycle a choice index by `delta` with wrap-around (AC 39.4).
 * Returns 0 for parameters with no choices.
 */
export function wrapChoiceIndex(param: SetupParameter, index: number, delta: number): number {
  const count = param.choices.length;
  if (count === 0) return 0;
  return (((index + delta) % count) + count) % count;
}

/**
 * Resolve the label to show for a parameter given the current draft value:
 * the matching choice's label, or the parameter's own label when no choice
 * matches (terminal items, unseeded params).
 */
export function labelForValue(param: SetupParameter, value: string): string {
  const choice = param.choices.find((c) => c.value === value);
  return choice?.label ?? param.label;
}
