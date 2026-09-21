import type { FeatureReducer } from '../types';
import type { Axis } from '../../../types/volatileMemory';
import { INITIAL_DRO_STATE_DATA } from '../droStateMachine';
import { computeAxisPositionMm, computeMachinePositionMm, computeNormalDisplay, createDisplay } from '../utils/displayComputation';

/** Manual §7.5: HALF first, then select the axis whose datum is to be halved. */
export const halfReducer: FeatureReducer = (state, event, context) => {
  if (state.stateName === 'idle' && event.eventName === 'BTN_HALF') {
    return {
      ...state,
      stateName: 'half-select',
      vMem: { ...state.vMem, activeAxis: null, inputBuffer: '' },
      display: createDisplay('SELECt', '', ''),
    };
  }
  if (state.stateName !== 'half-select') return null;
  if (event.eventName === 'KEY_CLEAR') {
    return { ...state, stateName: 'idle', display: computeNormalDisplay(state.vMem, context) };
  }
  const axis: Axis | null = event.eventName === 'BTN_SELECT_X' ? 'X'
    : event.eventName === 'BTN_SELECT_Y' ? 'Y'
      : event.eventName === 'BTN_SELECT_Z' ? 'Z' : null;
  if (axis === null) return state;
  const vMem = state.vMem;
  // Halve in the pre-display coordinate frame: sign, unit and diameter transforms
  // are linear and must not be inverted twice when moving the datum.
  const half = computeAxisPositionMm(axis, vMem, context) / 2;
  const field = context.millState.connected
    ? vMem.mode === 'abs' ? 'workOffsets' : 'incrementalOffsets'
    : vMem.mode === 'abs' ? 'manualAbsoluteValues' : 'incrementalValues';
  const value = context.millState.connected
    ? computeMachinePositionMm(axis, vMem, context) - half : half;
  const newVMem = { ...vMem, activeAxis: axis, [field]: { ...vMem[field], [axis]: value } };
  return {
    stateName: 'idle', stateData: INITIAL_DRO_STATE_DATA, vMem: newVMem,
    display: computeNormalDisplay(newVMem, context),
  };
};
