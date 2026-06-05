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
  MeasurementMode,
  CountingMode,
  ProbeDroType,
  KeypadLockState,
  DisplayResolutionValue,
  ScaleResolutionValue,
  TaperOnAxis,
  AngularFormat,
  ZeroApproachDistance,
  ZeroApproachTolerance,
} from '../../../types/nonVolatileMemory';
import {
  DEFAULT_SCALE_RESOLUTION,
  DEFAULT_DISPLAY_RESOLUTION,
  DEFAULT_ANGULAR_RESOLUTION,
} from '../../../types/nonVolatileMemory';
import { useSettingsStore } from '../../settingsStore';
import { RESTORE_DEFAULTS_ID, RESTORE_DEFAULTS_LABEL } from './restore-defaults';
// Re-export so the registry's restore row id/label stay importable from the
// setup-parameters module alongside the other parameter ids (US-028).
export { RESTORE_DEFAULTS_ID, RESTORE_DEFAULTS_LABEL };

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
   * `End`, which carry no value and are acted on with `ent` instead. For
   * parameters whose option set depends on committed state, this is the *default*
   * (fallback) set; `choicesFor` overrides it conditionally (see below).
   */
  readonly choices: readonly SetupParameterChoice[];
  /**
   * Optional context-aware choice set. When present, the shell cycles through
   * the choices this returns for the current read context instead of the static
   * `choices`. Used by dP (US-040 AC 40.4), whose option set switches between the
   * linear micron values and the angular DMS formats depending on the axis's
   * counting mode. Resolve via `resolveChoices` so callers without a context
   * fall back to the static `choices`.
   */
  readonly choicesFor?: (ctx: SetupReadContext) => readonly SetupParameterChoice[];
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
   * hold immediately (e.g. Direction, US-002). Parameters WITHOUT a `commit`
   * keep the draft-only semantics (changes buffered in `draftValues`).
   */
  readonly commit?: (ctx: SetupReadContext, value: string) => void;
  /**
   * Optional SAU CHG persistence hook (US-027). When present, the SAV CHG menu
   * item writes this parameter's buffered draft value to nvMem on ENT. This is
   * the draft/commit counterpart to `commit`: draft-only parameters define
   * `persist` (not `commit`), so their edits live in `draftValues` and are
   * written through here only when the operator confirms SAV CHG — exiting setup
   * any other way discards them (AC27.6). Commit-on-change parameters do NOT
   * define `persist` (they already wrote on every cycle), so SAV CHG skips them.
   */
  readonly persist?: (ctx: SetupReadContext, value: string) => void;
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

/** The dP (display resolution) parameter id (US-022) -- its per-axis draft key. */
export const DISPLAY_RESOLUTION_ID = 'display-resolution';

/**
 * dP choices: the same nine measuring resolutions in microns as SC, ascending.
 * Labels carry the `dP` prefix and a one-decimal micron value as shown on the
 * device ("dP 5.0"). dP is the display-only counterpart of SC (US-022) and is
 * independent of it (AC22.3).
 */
export const DISPLAY_RESOLUTION_CHOICES: readonly SetupParameterChoice[] = [
  { value: '0.1', label: 'dP 0.1' },
  { value: '0.2', label: 'dP 0.2' },
  { value: '0.5', label: 'dP 0.5' },
  { value: '1', label: 'dP 1.0' },
  { value: '2', label: 'dP 2.0' },
  { value: '5', label: 'dP 5.0' },
  { value: '10', label: 'dP 10.0' },
  { value: '20', label: 'dP 20.0' },
  { value: '50', label: 'dP 50.0' },
];

/**
 * Angular dP choices: the three degree formats the display-resolution parameter
 * offers when the axis counts in `angular` mode (manual §6.2 "Display resolution
 * (Angular)", US-040 AC 40.4). Order matches the manual table; `dd.mn`
 * (degrees-minutes) is first and is the angular default. The OCR labels
 * `dd.πn / dd.πn.SS / dd.dEC` reconcile to these seven-segment-renderable
 * literals (`.` separators stand in for the °/'/" the panel cannot draw).
 */
export const ANGULAR_RESOLUTION_CHOICES: readonly SetupParameterChoice[] = [
  { value: 'dd-mn', label: 'dd.mn' },
  { value: 'dd-mn-ss', label: 'dd.mn.SS' },
  { value: 'dd-dec', label: 'dd.dEC' },
];

/** The per-axis counting-direction parameter id (US-002) -- its draft key. */
export const DIRECTION_ID = 'direction';

/** The global Z depth-sense parameter id (US-002, AC 2.4) -- its draft key. */
export const Z_DEPTH_ID = 'z-depth';

/** The global `ZERO AP` (Near-Zero Warning on/off) parameter id (US-024). */
export const ZERO_APPROACH_ID = 'zero-approach';

/** The global `BP DIST` (approach distance) parameter id (US-024, AC24.4). */
export const ZERO_APPROACH_DIST_ID = 'zero-approach-dist';

/** The global `BP TOLR` (departure tolerance) parameter id (US-024, AC24.5). */
export const ZERO_APPROACH_TOLR_ID = 'zero-approach-tolr';

/**
 * BP DIST choices: the approach distances (inch) at which the warning engages.
 * Anchored at the manual's 0.002" (≈50 micron) default; the video example uses
 * 0.004"/0.010". Stored as inch strings (the device's native tolerance unit).
 */
export const ZERO_APPROACH_DIST_CHOICES: readonly SetupParameterChoice[] = [
  { value: '0.002', label: 'bP .002' },
  { value: '0.004', label: 'bP .004' },
  { value: '0.005', label: 'bP .005' },
  { value: '0.010', label: 'bP .010' },
  { value: '0.020', label: 'bP .020' },
];

/**
 * BP TOLR choices: departure hysteresis (inch) the axis must travel beyond
 * BP DIST before the warning clears. Default 0 (clears at the band edge).
 */
export const ZERO_APPROACH_TOLR_CHOICES: readonly SetupParameterChoice[] = [
  { value: '0', label: 'tL .000' },
  { value: '0.002', label: 'tL .002' },
  { value: '0.005', label: 'tL .005' },
  { value: '0.010', label: 'tL .010' },
];

/** The per-axis radius/diameter measurement-mode parameter id (US-041) -- its draft key. */
export const MEASUREMENT_MODE_ID = 'measurement-mode';

/**
 * The `CALib` (calibration) parameter id. Manual §6.2 lists CALiB between LEFt
 * and EnF; the routine itself (scale calibration / error compensation, §6.3) is
 * not modelled, so this row is a non-functional placeholder added for menu
 * completeness: it is choiceless and has no ENT handler, so the setup reducer's
 * fall-through makes ENT and left/right no-ops.
 */
export const CALIBRATION_ID = 'calibration';

/** The global touch-probe DRO-type parameter id (US-032, §10.1.1) -- its draft key. */
export const PROBE_DRO_TYPE_ID = 'probe-dro-type';

/** The global encoder-fail warning parameter id (US-042) -- its draft key. */
export const ENF_ID = 'enf';

/** The global keypad-beep parameter id (US-025) -- its draft key. */
export const BEEP_ID = 'beep';

/** The global keypad-lock parameter id (US-043, §6.2 `LoC`) -- its draft key. */
export const KEYPAD_LOCK_ID = 'keypad-lock';

/** The global display sleep-timer parameter id (US-026, §6.2) -- its draft key. */
export const SLEEP_TIMEOUT_ID = 'sleep-timeout';

/**
 * SLEEP T choices: the idle timeout in minutes the left/right keys cycle through
 * (manual §6.2 `SLEEP t`, range 0-120). `'0'` is the disabled sentinel, shown as
 * `SLP oFF` (the display never sleeps); the remaining values are a representative
 * ladder of common timeouts up to the 120-minute maximum, each shown as `SLP <n>`.
 * Stored as the integer minute count string so commit can parse it back to a
 * number for nvMem.sleepTimeout.
 */
export const SLEEP_TIMEOUT_MINUTES = [0, 1, 2, 5, 10, 15, 20, 30, 45, 60, 90, 120] as const;

/** Build the 7-segment label for a sleep-timeout minute value (0 => disabled). */
export function sleepTimeoutLabel(minutes: number): string {
  return minutes === 0 ? 'SLP oFF' : `SLP ${String(minutes)}`;
}

/** SLEEP T choices derived from the minute ladder (value = integer-minutes string). */
export const SLEEP_TIMEOUT_CHOICES: readonly SetupParameterChoice[] =
  SLEEP_TIMEOUT_MINUTES.map((m) => ({ value: String(m), label: sleepTimeoutLabel(m) }));

/** The SAU CHG (save changes) parameter id (US-027) -- ENT commits drafts to nvMem. */
export const SAVE_CHANGES_ID = 'save-changes';

/**
 * The `rSt oEm` (Restore Defaults) parameter id (US-028). Terminal-entry item
 * like SAV CHG / oEm mod: ENT runs the reset (restore to the OEM baseline if one
 * was captured, else factory defaults) and shows the `IN ProG` dwell. The
 * state-machine hand-off lives in `setup.ts` / `restore-defaults.ts`; the registry
 * only carries the row. The id/label are defined in `restore-defaults.ts` and
 * imported above.
 */

/**
 * The `oEm mod` (OEM Mode) parameter id (US-044). Terminal-entry item like
 * SAV CHG: ENT prompts for the password gate and, once entered, stores the live
 * config as the custom default baseline (nvMem.oemDefaults). The state-machine
 * hand-off lives in `setup.ts` / `oem-mode.ts`; the registry only carries the row.
 */
export const OEM_MODE_ID = 'oem-mode';

/** The terminal `End` parameter id -- selecting it with `ent` exits setup. */
export const SETUP_END_ID = 'end';

/**
 * The ordered list of setup parameters. This array order IS the authoritative
 * menu order the operator scrolls with up/down (DOWN = toward End).
 *
 * Ordering source, in priority order:
 * - EL400 operation manual section 6.2 "Parameters Setting" / "table 2" is the
 *   canonical navigable order: LinEAr, SC, dP, rAd, LEFt, CALiB, EnF,
 *   (AUH Fn / SErIAL), dro, (Prb dLY / PULSE), tAPEr, (Adition), LoC, SLEEP,
 *   SAU ChG, rSt oEm, oEm mod, End. Parenthesised rows are not yet implemented
 *   here, so they are simply absent.
 * - The DRO PROS video walkthrough (el400-dro-overview-video/MANUAL.md, Part 1
 *   §1.4-1.19) covers the implemented extras the §6.2 table omits: the
 *   zero-approach trio (bU22 / bP / tL, §1.13) and bEEP (§1.14) sit just after
 *   LoC and before SLEEP. `dEP nEG` (Z depth-sense, US-002 AC2.4) has no §6.2
 *   row and is grouped with the other geometry settings.
 *
 * When adding a new parameter, insert it at the position the §6.2 table (or, for
 * a table-less extra, the video) dictates -- NOT merely appended before End.
 * The `setup.integration.test.tsx` order test locks this sequence end-to-end.
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
    // Draft-only: SC buffers its edit and is written to nvMem only on SAU CHG
    // (US-027). Exiting setup without saving discards the change (AC27.6).
    persist: (ctx, value) => {
      const axis = ctx.axis ?? 'X';
      useSettingsStore.getState().updateNvMem({
        scaleResolution: {
          ...ctx.nvMem.scaleResolution,
          [axis]: value as ScaleResolutionValue,
        },
      });
    },
  },
  {
    id: DISPLAY_RESOLUTION_ID,
    label: 'dP 5.0',
    scope: 'per-axis',
    choices: DISPLAY_RESOLUTION_CHOICES,
    // The dP option set is conditional on the axis's counting mode (US-040
    // AC 40.4): angular axes cycle the DMS formats, linear axes the micron
    // values. The static `choices` above is the linear fallback (used on the
    // SELECT prompt and by context-free callers).
    choicesFor: (ctx) =>
      isAngularAxis(ctx) ? ANGULAR_RESOLUTION_CHOICES : DISPLAY_RESOLUTION_CHOICES,
    // Seed from the selected axis's committed resolution. For an angular axis
    // that is the DMS format (nvMem.angularResolution); for a linear axis the
    // micron value (nvMem.displayResolution). On the SELECT prompt (axis null)
    // fall back to X. Guard against a stale persisted value no longer in the
    // active choice set by defaulting to the mill default.
    readValue: (ctx) => {
      const axis = ctx.axis ?? 'X';
      if (isAngularAxis(ctx)) {
        const committed = ctx.nvMem.angularResolution[axis];
        const isValid = ANGULAR_RESOLUTION_CHOICES.some((c) => c.value === committed);
        return isValid ? committed : DEFAULT_ANGULAR_RESOLUTION[axis];
      }
      const committed = ctx.nvMem.displayResolution[axis];
      const isValid = DISPLAY_RESOLUTION_CHOICES.some((c) => c.value === committed);
      return isValid ? committed : DEFAULT_DISPLAY_RESOLUTION[axis];
    },
    // Commit-on-change (US-022 / US-040): persist the per-axis resolution
    // immediately so the readout updates on exit. dP is a display-only transform
    // (AC22.5); SAU CHG (US-027) is not yet wired, so this surgical path -- the
    // same one Direction (US-002) uses -- makes the effect visible. Angular axes
    // write the DMS format to a separate nvMem slot so switching counting mode
    // back and forth preserves each axis's linear micron and angular format
    // choices independently.
    commit: (ctx, value) => {
      const axis = ctx.axis ?? 'X';
      if (isAngularAxis(ctx)) {
        useSettingsStore.getState().updateNvMem({
          angularResolution: {
            ...ctx.nvMem.angularResolution,
            [axis]: value as AngularFormat,
          },
        });
        return;
      }
      useSettingsStore.getState().updateNvMem({
        displayResolution: {
          ...ctx.nvMem.displayResolution,
          [axis]: value as DisplayResolutionValue,
        },
      });
    },
  },
  {
    id: MEASUREMENT_MODE_ID,
    label: 'rAd',
    scope: 'per-axis',
    choices: [
      { value: 'radius', label: 'rAd' },
      { value: 'diameter', label: 'diA' },
    ],
    // Seed from the selected axis's committed measurement mode (US-041). On the
    // SELECT prompt (axis null) fall back to X. radius is the mill default (AC 41.3).
    readValue: (ctx) => ctx.nvMem.measurementMode[ctx.axis ?? 'X'],
    // Commit-on-change (US-041): persist the per-axis mode immediately so the
    // readout switches between 1:1 (radius) and 2× (diameter) on exit and on
    // every later position update -- the same surgical path as Direction (US-002).
    commit: (ctx, value) => {
      const axis = ctx.axis ?? 'X';
      useSettingsStore.getState().updateNvMem({
        measurementMode: {
          ...ctx.nvMem.measurementMode,
          [axis]: value as MeasurementMode,
        },
      });
    },
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
    id: CALIBRATION_ID,
    // Manual §6.2 abbreviation table renders this `CAL ib`; the OCR's pre-`i`
    // space is a glyph-width artifact (cf. `d iA`->`diA`, `r iGht`->`riGht`), so
    // the faithful label is `CALib`. Non-functional placeholder (see id comment):
    // no choices, no commit/persist; ENT and left/right are no-ops in the reducer.
    label: 'CALib',
    scope: 'global',
    choices: [],
    readValue: () => '',
  },
  {
    id: ENF_ID,
    label: 'EnF oFF',
    scope: 'global',
    // Default-first ordering: 'off' (the default, AC 42.1) seeds before 'on'.
    choices: [
      { value: 'off', label: 'EnF oFF' },
      { value: 'on', label: 'EnF on' },
    ],
    // Encoder-fail warning (US-042). Reads its OWN nvMem flag, decoupled from
    // beepEnabled (US-025's field).
    readValue: (ctx) => (ctx.nvMem.encoderFailWarning ? 'on' : 'off'),
    // Commit-on-change (US-042): persist immediately so a later signal-loss
    // event shows `no SIG` without waiting for SAU CHG (recommended on, AC 42.6).
    // ENF is therefore NOT a draft-only / SAU CHG (US-027) param -- it has NO
    // `persist`; SAV CHG skips commit-on-change params (already saved).
    commit: (_ctx, value) => {
      useSettingsStore.getState().updateNvMem({ encoderFailWarning: value === 'on' });
    },
  },
  {
    id: PROBE_DRO_TYPE_ID,
    label: 'dro t',
    scope: 'global',
    choices: [
      { value: 'transmit', label: 'dro t' },
      { value: 'freeze', label: 'dro F' },
    ],
    // Global touch-probe DRO type (US-032, §10.1.1). Seeded from nvMem.
    readValue: (ctx) => ctx.nvMem.probeDroType,
    // Commit-on-change: persist immediately so the probe freeze/transmit
    // behaviour takes hold on exit (same path as Direction / Z depth).
    commit: (_ctx, value) => {
      useSettingsStore.getState().updateNvMem({ probeDroType: value as ProbeDroType });
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
    // Reads the committed taper-on axis (US-045); the value is seeded from nvMem.
    readValue: (ctx) => ctx.nvMem.taperOnAxis,
    // Draft-only: the taper-on axis is written to nvMem only on SAU CHG (US-027).
    persist: (_ctx, value) => {
      useSettingsStore.getState().updateNvMem({ taperOnAxis: value as TaperOnAxis });
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
    id: KEYPAD_LOCK_ID,
    label: 'LoC oFF',
    scope: 'global',
    choices: [
      { value: 'off', label: 'LoC oFF' },
      { value: 'on', label: 'LoC on' },
    ],
    // Global keypad lock (US-043, §6.2 `LoC`). Seeded from nvMem.
    readValue: (ctx) => ctx.nvMem.keypadLock,
    // Commit-on-change: persist immediately so the lock takes hold the moment the
    // operator cycles the choice (same surgical path as Direction / Z depth /
    // probe type). Persisting to nvMem (localStorage-backed) also means the lock
    // survives a power cycle (AC 43.6). Crucially, committing on cycle -- not only
    // on exit -- keeps the UNLOCK reachable: while `LoC on`, the gate already lets
    // the wrench/setup key and all in-setup navigation through, so cycling back to
    // `LoC oFF` here unlocks even though the panel was locked on entry.
    commit: (_ctx, value) => {
      useSettingsStore.getState().updateNvMem({ keypadLock: value as KeypadLockState });
    },
  },
  {
    id: ZERO_APPROACH_ID,
    label: 'bU22 oF',
    scope: 'global',
    // ZERO AP toggles the Near-Zero Warning (BU22). The 7-segment panel has no
    // 'Z' glyph for "buzz", so the device renders it as `bU22` (AC24.2).
    choices: [
      { value: 'on', label: 'bU22 on' },
      { value: 'off', label: 'bU22 oF' },
    ],
    readValue: (ctx) => (ctx.nvMem.zeroApproachEnabled ? 'on' : 'off'),
    // Commit-on-change (US-024): persist immediately so the warning engages on
    // exit without the generic SAU CHG save engine, mirroring Direction (US-002).
    commit: (_ctx, value) => {
      useSettingsStore.getState().updateNvMem({ zeroApproachEnabled: value === 'on' });
    },
  },
  {
    id: ZERO_APPROACH_DIST_ID,
    label: 'bP .002',
    scope: 'global',
    choices: ZERO_APPROACH_DIST_CHOICES,
    // Seed from the committed BP DIST; guard a stale value back to the default.
    readValue: (ctx) => {
      const committed = ctx.nvMem.zeroApproachDistance;
      const isValid = ZERO_APPROACH_DIST_CHOICES.some((c) => c.value === committed);
      return isValid ? committed : '0.002';
    },
    commit: (_ctx, value) => {
      useSettingsStore
        .getState()
        .updateNvMem({ zeroApproachDistance: value as ZeroApproachDistance });
    },
  },
  {
    id: ZERO_APPROACH_TOLR_ID,
    label: 'tL .000',
    scope: 'global',
    choices: ZERO_APPROACH_TOLR_CHOICES,
    // Seed from the committed BP TOLR; guard a stale value back to the default.
    readValue: (ctx) => {
      const committed = ctx.nvMem.zeroApproachTolerance;
      const isValid = ZERO_APPROACH_TOLR_CHOICES.some((c) => c.value === committed);
      return isValid ? committed : '0';
    },
    commit: (_ctx, value) => {
      useSettingsStore
        .getState()
        .updateNvMem({ zeroApproachTolerance: value as ZeroApproachTolerance });
    },
  },
  {
    id: BEEP_ID,
    label: 'bEEP on',
    scope: 'global',
    // Default-first ordering: 'on' is the default (AC25.2), so it seeds first.
    // The manual section 6.2 table omits a buzzer row, so the on/off glyphs
    // follow the device's sibling on/off parameters (`EnF on`/`EnF oFF`,
    // `LoC on`/`LoC off`): `bEEP on` / `bEEP oFF`.
    choices: [
      { value: 'on', label: 'bEEP on' },
      { value: 'off', label: 'bEEP oFF' },
    ],
    // Keypad beep (US-025). Reads its OWN nvMem flag, decoupled from
    // encoderFailWarning (US-042's field).
    readValue: (ctx) => (ctx.nvMem.beepEnabled ? 'on' : 'off'),
    // Commit-on-change (US-025): persist immediately so key presses fall silent
    // (or resume beeping) the moment the operator cycles the choice -- the gate
    // in playClickSound reads beepEnabled live on every press (AC25.3, AC25.4).
    commit: (_ctx, value) => {
      useSettingsStore.getState().updateNvMem({ beepEnabled: value === 'on' });
    },
  },
  {
    id: SLEEP_TIMEOUT_ID,
    label: sleepTimeoutLabel(0),
    scope: 'global',
    choices: SLEEP_TIMEOUT_CHOICES,
    // Global display sleep timeout in minutes (US-026, §6.2). Seeded from nvMem;
    // guard against a stale persisted value that is not one of the ladder choices
    // by falling back to the disabled sentinel.
    readValue: (ctx) => {
      const committed = String(ctx.nvMem.sleepTimeout);
      const isValid = SLEEP_TIMEOUT_CHOICES.some((c) => c.value === committed);
      return isValid ? committed : '0';
    },
    // Commit-on-change (US-026): persist immediately, same surgical path as
    // Direction / dP, so the sleep timer takes effect on exit. Parses the choice
    // value back to an integer minute count for nvMem.sleepTimeout.
    commit: (_ctx, value) => {
      useSettingsStore.getState().updateNvMem({ sleepTimeout: Number(value) });
    },
  },
  {
    id: SAVE_CHANGES_ID,
    // Manual section 6.2 names this `SAu ChG`; the seven-segment panel has no
    // lowercase 'u' glyph, so the renderable label uses uppercase 'U' (as in
    // 'AnGULAr'). Terminal item: no choices, acted on with ENT (AC27.1/27.2).
    label: 'SAU ChG',
    scope: 'global',
    choices: [],
    readValue: () => '',
  },
  {
    id: RESTORE_DEFAULTS_ID,
    // Manual §6.2 `r5t oEñ` (Restore default settings). The panel renders
    // r,S,t,o,E,m, so the faithful label is `rSt oEm`. Terminal-entry item: no
    // choices; ENT runs the restore + `IN ProG` dwell (US-028). Handled in setup.ts.
    label: RESTORE_DEFAULTS_LABEL,
    scope: 'global',
    choices: [],
    readValue: () => '',
  },
  {
    id: OEM_MODE_ID,
    // Manual §6.2 `oEñ ñod` (OEM Mode). The seven-segment panel renders 'm' (the
    // OCR's 'ñ'), so the faithful label is `oEm mod`. Terminal-entry item: no
    // choices; ENT opens the password gate (AC 44.1/44.2). Handled in setup.ts.
    label: 'oEm mod',
    scope: 'global',
    choices: [],
    readValue: () => '',
  },
  {
    id: SETUP_END_ID,
    label: 'End',
    scope: 'global',
    choices: [],
    readValue: () => '',
  },
];

/**
 * Whether the axis currently being configured counts in `angular` mode (US-040).
 * Per-axis parameters read the selected axis's mode; on the SELECT prompt
 * (axis null) fall back to X. Used to pick the conditional dP option set.
 */
function isAngularAxis(ctx: SetupReadContext): boolean {
  return ctx.nvMem.countingMode[ctx.axis ?? 'X'] === 'angular';
}

/**
 * Resolve the choices a parameter cycles through for the given read context.
 * Parameters with a `choicesFor` accessor (e.g. dP, whose option set depends on
 * counting mode, US-040 AC 40.4) get their context-aware set; all others fall
 * back to their static `choices`.
 */
export function resolveChoices(
  param: SetupParameter,
  ctx: SetupReadContext
): readonly SetupParameterChoice[] {
  return param.choicesFor?.(ctx) ?? param.choices;
}

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
 *
 * Pass `ctx` for parameters with conditional choices (dP, US-040) so the lookup
 * runs against the active set; without it the static `choices` are used.
 */
export function choiceIndexOf(
  param: SetupParameter,
  value: string,
  ctx?: SetupReadContext
): number {
  const choices = ctx ? resolveChoices(param, ctx) : param.choices;
  const idx = choices.findIndex((c) => c.value === value);
  return idx === -1 ? 0 : idx;
}

/**
 * Cycle a choice index by `delta` with wrap-around (AC 39.4).
 * Returns 0 for parameters with no choices.
 *
 * Pass `ctx` for parameters with conditional choices (dP, US-040) so the cycle
 * length matches the active set; without it the static `choices` are used.
 */
export function wrapChoiceIndex(
  param: SetupParameter,
  index: number,
  delta: number,
  ctx?: SetupReadContext
): number {
  const choices = ctx ? resolveChoices(param, ctx) : param.choices;
  const count = choices.length;
  if (count === 0) return 0;
  return (((index + delta) % count) + count) % count;
}

/**
 * Resolve the label to show for a parameter given the current draft value:
 * the matching choice's label, or the parameter's own label when no choice
 * matches (terminal items, unseeded params).
 *
 * Pass `ctx` for parameters with conditional choices (dP, US-040) so the label
 * is drawn from the active set (e.g. the angular DMS labels for an angular axis);
 * without it the static `choices` are used.
 */
export function labelForValue(
  param: SetupParameter,
  value: string,
  ctx?: SetupReadContext
): string {
  const choices = ctx ? resolveChoices(param, ctx) : param.choices;
  const choice = choices.find((c) => c.value === value);
  return choice?.label ?? param.label;
}

/** Index of registry parameters by id for O(1) draft-key resolution. */
const PARAMETERS_BY_ID = new Map(SETUP_PARAMETERS.map((p) => [p.id, p]));

/** A parsed draft key: the scope (axis or GLOBAL) and the parameter id. */
interface ParsedDraftKey {
  readonly axis: SetupAxis;
  readonly paramId: string;
}

/**
 * Parse a `draftValues` key of the form `<axis|GLOBAL>:<paramId>`. Parameter ids
 * may contain hyphens but never colons, so split on the FIRST colon only. A
 * `GLOBAL` scope resolves to a null axis; otherwise the scope is the X/Y/Z axis.
 */
function parseDraftKey(key: string): ParsedDraftKey | null {
  const sep = key.indexOf(':');
  if (sep === -1) return null;
  const scope = key.slice(0, sep);
  const paramId = key.slice(sep + 1);
  const axis = scope === 'GLOBAL' ? null : (scope as SetupAxis);
  return { axis, paramId };
}

/**
 * Commit buffered draft values to nvMem on SAU CHG (US-027). For each draft key,
 * resolve its parameter and, if the parameter defines a `persist` writer, call it
 * with the draft value and an axis-scoped read context. Parameters that persist
 * on every change (`commit`-based, e.g. Direction) define no `persist`, so they
 * are skipped here — they are already saved. Unknown ids and `persist`-less
 * parameters are ignored, making this safe to call with any draft map.
 *
 * Each writer reads the LIVE nvMem (not a captured snapshot) so that successive
 * per-axis writes to the same nested object (e.g. SC on X then SC on Y) compose
 * instead of clobbering one another.
 */
export function commitDrafts(draftValues: Record<string, string>): void {
  for (const [key, value] of Object.entries(draftValues)) {
    const parsed = parseDraftKey(key);
    if (parsed === null) continue;
    const param = PARAMETERS_BY_ID.get(parsed.paramId);
    if (param?.persist === undefined) continue;
    const liveNvMem = useSettingsStore.getState().nvMem;
    param.persist({ nvMem: liveNvMem, axis: parsed.axis }, value);
  }
}
