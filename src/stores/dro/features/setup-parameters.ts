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
 * 3. Provide `readValue(ctx)` to seed the current value from committed state
 *    (nvMem for now) and -- when the owning story implements commit -- wire the
 *    chosen value into `SAU CHG` handling (US-027).
 * 4. That's it. The shell handles highlight rendering, up/down item navigation
 *    with wrap-around, and left/right choice cycling with wrap-around
 *    automatically.
 *
 * The `End` item is special: it has no choices and exits setup when `ent` is
 * pressed (AC 39.7).
 */

import type { NonVolatileMemory } from '../../../types/nonVolatileMemory';

/** Scope of a setup parameter: per-axis values differ per X/Y/Z; global apply to all. */
export type SetupParameterScope = 'per-axis' | 'global';

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
}

/** The terminal `End` parameter id -- selecting it with `ent` exits setup. */
export const SETUP_END_ID = 'end';

/**
 * The ordered list of setup parameters, following the section 6.2 table.
 *
 * Only a foundational subset is wired here as proof of the framework (US-039):
 * - `counting-mode` (per-axis): Linear / Angular -- proof of a per-axis draft
 *   parameter (full behavior lands in US-040).
 * - `enf` (global): encoder-fail warning On / Off, backed by nvMem.beepEnabled
 *   as a stand-in committed value -- proof of a global parameter reading real
 *   settings (full ENF semantics land in US-042).
 * - `End`: terminal exit item.
 *
 * Later stories append their own entries here.
 */
export const SETUP_PARAMETERS: readonly SetupParameter[] = [
  {
    id: 'counting-mode',
    label: 'LinEAr',
    scope: 'per-axis',
    choices: [
      { value: 'linear', label: 'LinEAr' },
      { value: 'angular', label: 'AnGULAr' },
    ],
    // No committed home yet (US-040 owns this) -- always seed to Linear.
    readValue: () => 'linear',
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
