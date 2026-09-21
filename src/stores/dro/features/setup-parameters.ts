import type { NonVolatileMemory, ScaleResolutionValue, AngularFormat } from '../../../types/nonVolatileMemory';
import { DEFAULT_SCALE_RESOLUTION } from '../../../types/nonVolatileMemory';
import type { AxisCalibration } from '../../../types/calibration';
import { useSettingsStore } from '../../settingsStore';
import { RESTORE_DEFAULTS_ID, RESTORE_DEFAULTS_LABEL } from './restore-defaults';
export { RESTORE_DEFAULTS_ID, RESTORE_DEFAULTS_LABEL };

export type SetupParameterScope = 'per-axis' | 'global';
export type SetupAxis = 'X' | 'Y' | 'Z' | null;
export interface SetupParameterChoice { readonly value: string; readonly label: string }
export interface SetupReadContext { readonly nvMem: NonVolatileMemory; readonly axis: SetupAxis }
export interface SetupParameter {
  readonly id: string;
  readonly label: string;
  readonly scope: SetupParameterScope;
  readonly choices: readonly SetupParameterChoice[];
  readonly choicesFor?: (ctx: SetupReadContext) => readonly SetupParameterChoice[];
  readonly numeric?: {
    min: number; max: number; precision: number;
    /** Canonical storage unit for values edited in the active display unit. */
    storageUnit?: 'inch';
    /** Literal zero-padding for integer setting views, independent of axis dP. */
    integerWidth?: number;
  };
  readonly readValue: (ctx: SetupReadContext) => string;
  /** Pure configuration update; the registry never writes the store while editing. */
  readonly apply?: (ctx: SetupReadContext, value: string) => Partial<NonVolatileMemory>;
}

export const SCALE_RESOLUTION_ID = 'scale-resolution';
export const COUNTING_MODE_ID = 'counting-mode';
export const DISPLAY_RESOLUTION_ID = 'display-resolution';
export const DIRECTION_ID = 'direction';
export const Z_DEPTH_ID = 'z-depth';
export const ZERO_APPROACH_ID = 'zero-approach';
export const ZERO_APPROACH_DIST_ID = 'zero-approach-dist';
export const ZERO_APPROACH_TOLR_ID = 'zero-approach-tolr';
export const MEASUREMENT_MODE_ID = 'measurement-mode';
export const CALIBRATION_ID = 'calibration';
export const AUX_FN_ID = 'aux-fn';
export const PROBE_DRO_TYPE_ID = 'probe-dro-type';
export const PROBE_DELAY_ID = 'probe-delay';
export const SERIAL_MODE_ID = 'serial-mode';
export const OUTPUT_MODE_ID = 'output-mode';
export const ENF_ID = 'enf';
export const BEEP_ID = 'beep';
export const KEYPAD_LOCK_ID = 'keypad-lock';
export const SLEEP_TIMEOUT_ID = 'sleep-timeout';
export const SAVE_CHANGES_ID = 'save-changes';
export const OEM_MODE_ID = 'oem-mode';
export const SETUP_END_ID = 'end';

const resolutions = ['0.1', '0.2', '0.5', '1', '2', '5', '10', '20', '50'];
export const SCALE_RESOLUTION_CHOICES: readonly SetupParameterChoice[] = resolutions.map(value => ({ value, label: `SC ${Number(value).toFixed(1)}` }));
export const DISPLAY_RESOLUTION_CHOICES: readonly SetupParameterChoice[] = resolutions.map(value => ({ value, label: `dP ${Number(value).toFixed(1)}` }));
export const ANGULAR_RESOLUTION_CHOICES: readonly SetupParameterChoice[] = [
  { value: 'dd-mn', label: 'dd.mn' }, { value: 'dd-mn-ss', label: 'dd.mn.SS' }, { value: 'dd-dec', label: 'dd.dEC' },
];

export const SETUP_PARAMETERS: readonly SetupParameter[] = [
  {
    id: COUNTING_MODE_ID, label: 'LinEAr', scope: 'per-axis',
    choices: [{ value: 'linear', label: 'LinEAr' }, { value: 'angular', label: 'AnGULAr' }],
    readValue: ({ nvMem, axis }) => nvMem.countingMode[axis ?? 'X'],
    apply: ({ nvMem, axis }, value) => ({ countingMode: { ...nvMem.countingMode, [axis ?? 'X']: value } }),
  },
  {
    id: SCALE_RESOLUTION_ID, label: 'SC 5.0', scope: 'per-axis', choices: SCALE_RESOLUTION_CHOICES,
    readValue: ({ nvMem, axis }) => {
      const selectedAxis = axis ?? 'X';
      const value = nvMem.scaleResolution[selectedAxis];
      return SCALE_RESOLUTION_CHOICES.some(choice => choice.value === value)
        ? value : DEFAULT_SCALE_RESOLUTION[selectedAxis];
    },
    apply: ({ nvMem, axis }, value) => ({ scaleResolution: { ...nvMem.scaleResolution, [axis ?? 'X']: value } }),
  },
  {
    id: DISPLAY_RESOLUTION_ID, label: 'dP 5.0', scope: 'per-axis', choices: DISPLAY_RESOLUTION_CHOICES,
    choicesFor: ({ nvMem, axis }) => nvMem.countingMode[axis ?? 'X'] === 'angular' ? ANGULAR_RESOLUTION_CHOICES : DISPLAY_RESOLUTION_CHOICES,
    readValue: ({ nvMem, axis }) => nvMem.countingMode[axis ?? 'X'] === 'angular' ? nvMem.angularResolution[axis ?? 'X'] : nvMem.displayResolution[axis ?? 'X'],
    apply: ({ nvMem, axis }, value) => ANGULAR_RESOLUTION_CHOICES.some(choice => choice.value === value)
      ? { angularResolution: { ...nvMem.angularResolution, [axis ?? 'X']: value as AngularFormat } }
      : { displayResolution: { ...nvMem.displayResolution, [axis ?? 'X']: value as ScaleResolutionValue } },
  },
  {
    id: MEASUREMENT_MODE_ID, label: 'rAd', scope: 'per-axis',
    choices: [{ value: 'radius', label: 'rAd' }, { value: 'diameter', label: 'diA' }],
    readValue: ({ nvMem, axis }) => nvMem.measurementMode[axis ?? 'X'],
    apply: ({ nvMem, axis }, value) => ({ measurementMode: { ...nvMem.measurementMode, [axis ?? 'X']: value } }),
  },
  {
    id: DIRECTION_ID, label: 'LEFt', scope: 'per-axis',
    choices: [{ value: 'normal', label: 'LEFt' }, { value: 'reversed', label: 'riGht' }],
    readValue: ({ nvMem, axis }) => nvMem.axisDirection[axis ?? 'X'],
    apply: ({ nvMem, axis }, value) => ({ axisDirection: { ...nvMem.axisDirection, [axis ?? 'X']: value } }),
  },
  {
    id: CALIBRATION_ID, label: 'CALib', scope: 'per-axis', choices: [],
    readValue: ({ nvMem, axis }) => JSON.stringify(nvMem.calibration[axis ?? 'X']),
    apply: ({ nvMem, axis }, value) => ({ calibration: { ...nvMem.calibration, [axis ?? 'X']: JSON.parse(value) as AxisCalibration } }),
  },
  {
    id: ENF_ID, label: 'EnF oFF', scope: 'global',
    choices: [{ value: 'off', label: 'EnF oFF' }, { value: 'on', label: 'EnF on' }],
    readValue: ({ nvMem }) => nvMem.encoderFailWarning ? 'on' : 'off',
    apply: (_ctx, value) => ({ encoderFailWarning: value === 'on' }),
  },
  { id: AUX_FN_ID, label: 'AUX Fn', scope: 'global', choices: [], readValue: () => '' },
  {
    id: SERIAL_MODE_ID, label: 'SEr iAL', scope: 'global',
    choices: [{ value: 'request', label: 'SEr iAL' }, { value: 'continuous', label: 'SEr Con' }],
    readValue: ({ nvMem }) => nvMem.serialMode,
    apply: (_ctx, value) => ({ serialMode: value === 'continuous' ? 'continuous' : 'request' }),
  },
  {
    id: PROBE_DRO_TYPE_ID, label: 'dro t', scope: 'global',
    choices: [{ value: 'transmit', label: 'dro t' }, { value: 'freeze', label: 'dro F' }],
    readValue: ({ nvMem }) => nvMem.probeDroType,
    apply: (_ctx, value) => ({ probeDroType: value === 'freeze' ? 'freeze' : 'transmit' }),
  },
  {
    id: PROBE_DELAY_ID, label: 'Prb dLY', scope: 'global', choices: [], numeric: { min: 1, max: 60, precision: 0 },
    readValue: ({ nvMem }) => String(nvMem.probeDelaySeconds),
    apply: (_ctx, value) => ({ probeDelaySeconds: Number(value) }),
  },
  {
    id: OUTPUT_MODE_ID, label: 'PULSE', scope: 'global',
    choices: [{ value: 'pulse', label: 'PULSE' }, { value: 'continuous', label: 'Cont' }],
    readValue: ({ nvMem }) => nvMem.outputMode,
    apply: (_ctx, value) => ({ outputMode: value === 'continuous' ? 'continuous' : 'pulse' }),
  },
  {
    id: 'taper-on', label: 'tAPEr on', scope: 'global',
    choices: [{ value: 'X', label: 'tAPEr X' }, { value: 'Y', label: 'tAPEr Y' }, { value: 'Z', label: 'tAPEr Z' }],
    readValue: ({ nvMem }) => nvMem.taperOnAxis,
    apply: (_ctx, value) => ({ taperOnAxis: value as 'X' | 'Y' | 'Z' }),
  },
  {
    id: Z_DEPTH_ID, label: 'dEP nEG', scope: 'global',
    choices: [{ value: 'depth-negative', label: 'dEP nEG' }, { value: 'depth-positive', label: 'dEP PoS' }],
    readValue: ({ nvMem }) => nvMem.zDepthSense,
    apply: (_ctx, value) => ({ zDepthSense: value === 'depth-positive' ? 'depth-positive' : 'depth-negative' }),
  },
  {
    id: KEYPAD_LOCK_ID, label: 'LoC oFF', scope: 'global',
    choices: [{ value: 'off', label: 'LoC oFF' }, { value: 'on', label: 'LoC on' }],
    readValue: ({ nvMem }) => nvMem.keypadLock,
    apply: (_ctx, value) => ({ keypadLock: value === 'on' ? 'on' : 'off' }),
  },
  {
    id: ZERO_APPROACH_ID, label: 'ZEro AP', scope: 'per-axis',
    choices: [{ value: 'on', label: 'bU22 on' }, { value: 'off', label: 'bU22 oF' }],
    readValue: ({ nvMem, axis }) => nvMem.zeroApproachEnabled[axis ?? 'X'] ? 'on' : 'off',
    apply: ({ nvMem, axis }, value) => ({ zeroApproachEnabled: { ...nvMem.zeroApproachEnabled, [axis ?? 'X']: value === 'on' } }),
  },
  {
    id: ZERO_APPROACH_DIST_ID, label: 'BP diSt', scope: 'per-axis', choices: [], numeric: { min: 0, max: 999.9999, precision: 4, storageUnit: 'inch' },
    readValue: ({ nvMem, axis }) => nvMem.zeroApproachDistance[axis ?? 'X'],
    apply: ({ nvMem, axis }, value) => ({ zeroApproachDistance: { ...nvMem.zeroApproachDistance, [axis ?? 'X']: value } }),
  },
  {
    id: ZERO_APPROACH_TOLR_ID, label: 'BP toLr', scope: 'per-axis', choices: [], numeric: { min: 0, max: 999.9999, precision: 4, storageUnit: 'inch' },
    readValue: ({ nvMem, axis }) => nvMem.zeroApproachTolerance[axis ?? 'X'],
    apply: ({ nvMem, axis }, value) => ({ zeroApproachTolerance: { ...nvMem.zeroApproachTolerance, [axis ?? 'X']: value } }),
  },
  {
    id: BEEP_ID, label: 'bEEP on', scope: 'global',
    choices: [{ value: 'on', label: 'bEEP on' }, { value: 'off', label: 'bEEP oFF' }],
    readValue: ({ nvMem }) => nvMem.beepEnabled ? 'on' : 'off',
    apply: (_ctx, value) => ({ beepEnabled: value === 'on' }),
  },
  {
    id: SLEEP_TIMEOUT_ID, label: 'SLEEP t', scope: 'global', choices: [], numeric: { min: 0, max: 120, precision: 0, integerWidth: 3 },
    readValue: ({ nvMem }) => String(nvMem.sleepTimeout),
    apply: (_ctx, value) => ({ sleepTimeout: Number(value) }),
  },
  { id: SAVE_CHANGES_ID, label: 'SAU ChG', scope: 'global', choices: [], readValue: () => '' },
  { id: RESTORE_DEFAULTS_ID, label: RESTORE_DEFAULTS_LABEL, scope: 'global', choices: [], readValue: () => '' },
  { id: OEM_MODE_ID, label: 'oEm mod', scope: 'global', choices: [], readValue: () => '' },
  { id: SETUP_END_ID, label: 'End', scope: 'global', choices: [], readValue: () => '' },
];

export function resolveChoices(param: SetupParameter, ctx: SetupReadContext): readonly SetupParameterChoice[] {
  return param.choicesFor?.(ctx) ?? param.choices;
}
export const SETUP_PARAMETER_COUNT = SETUP_PARAMETERS.length;
export function getParameterAt(index: number): SetupParameter {
  const parameter = SETUP_PARAMETERS[((index % SETUP_PARAMETER_COUNT) + SETUP_PARAMETER_COUNT) % SETUP_PARAMETER_COUNT];
  if (parameter === undefined) throw new Error('Setup parameter index is out of range');
  return parameter;
}
export function wrapItemIndex(index: number, delta: number): number {
  return ((index + delta) % SETUP_PARAMETER_COUNT + SETUP_PARAMETER_COUNT) % SETUP_PARAMETER_COUNT;
}
export function choiceIndexOf(param: SetupParameter, value: string, ctx?: SetupReadContext): number {
  return Math.max(0, (ctx ? resolveChoices(param, ctx) : param.choices).findIndex(choice => choice.value === value));
}
export function wrapChoiceIndex(param: SetupParameter, index: number, delta: number, ctx?: SetupReadContext): number {
  const count = (ctx ? resolveChoices(param, ctx) : param.choices).length;
  return count === 0 ? 0 : ((index + delta) % count + count) % count;
}
export function labelForValue(param: SetupParameter, value: string, ctx?: SetupReadContext): string {
  if (param.id === ZERO_APPROACH_ID) return param.label;
  return (ctx ? resolveChoices(param, ctx) : param.choices).find(choice => choice.value === value)?.label ?? param.label;
}

/** A single preview path serves conditional editors and the eventual atomic save. */
export function applySetupDrafts(nvMem: NonVolatileMemory, drafts: Record<string, string>): NonVolatileMemory {
  let next = nvMem;
  for (const [key, value] of Object.entries(drafts)) {
    const [scope, id] = key.split(':');
    if (scope !== 'GLOBAL' && scope !== 'X' && scope !== 'Y' && scope !== 'Z') continue;
    const param = SETUP_PARAMETERS.find(row => row.id === id);
    if (!param?.apply) continue;
    next = { ...next, ...param.apply({ nvMem: next, axis: scope === 'GLOBAL' ? null : scope }, value) };
  }
  return next;
}
export function commitDrafts(draftValues: Record<string, string>): void {
  const store = useSettingsStore.getState();
  store.updateNvMem(applySetupDrafts(store.nvMem, draftValues));
}
