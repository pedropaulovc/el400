/**
 * Inch/MM Mode Feature Reducer
 *
 * Requests controller-owned CNCjs units; display-only modes update local settings.
 */

import type { FeatureReducer, DROReducerContext } from '../types';
import { computeNormalDisplay } from '../utils/displayComputation';
import { useSettingsStore } from '../../settingsStore';
import { useMillStore } from '../../millStore';

/** Shared unit-button path. Only detected display-only controllers toggle locally. */
export function toggleUnit(context: DROReducerContext): DROReducerContext {
  if (context.millState.controllerType === 'cncjs' &&
      context.millState.unitControl?.control !== 'display') {
    const confirmed = context.millState.unitControl?.confirmed;
    const target = (confirmed ?? context.nvMem.defaultUnit) === 'inch' ? 'mm' : 'inch';
    void useMillStore.getState().requestUnits(target);
    return context;
  }
  const newUnit = context.nvMem.defaultUnit === 'inch' ? 'mm' : 'inch';
  useSettingsStore.getState().updateNvMem({ defaultUnit: newUnit });
  return { ...context, nvMem: { ...context.nvMem, defaultUnit: newUnit } };
}

export const inchMmReducer: FeatureReducer = (state, event, context) => {
  const { stateName, vMem } = state;
  const { eventName } = event;

  // Only handle BTN_INCH_MM in idle state
  if (stateName !== 'idle' || eventName !== 'BTN_INCH_MM') {
    return null;
  }

  const updatedContext = toggleUnit(context);

  return {
    ...state,
    display: computeNormalDisplay(vMem, updatedContext),
  };
};
