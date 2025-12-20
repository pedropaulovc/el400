/**
 * Inch/MM Mode Feature Reducer
 *
 * Handles inch/mm unit toggling from idle state.
 * Updates nvMem.defaultUnit and recomputes display.
 */

import type { FeatureReducer } from '../types';
import { computeNormalDisplay } from '../utils/displayComputation';
import { useSettingsStore } from '../../settingsStore';

export const inchMmReducer: FeatureReducer = (state, event, context) => {
  const { stateName, vMem } = state;
  const { eventName } = event;

  // Only handle BTN_INCH_MM in idle state
  if (stateName !== 'idle' || eventName !== 'BTN_INCH_MM') {
    return null;
  }

  // Toggle unit in nvMem (side effect)
  const currentUnit = context.nvMem.defaultUnit;
  const newUnit: 'inch' | 'mm' = currentUnit === 'inch' ? 'mm' : 'inch';
  useSettingsStore.getState().updateNvMem({ defaultUnit: newUnit });

  // Create updated context with new unit for display computation
  const updatedContext = {
    ...context,
    nvMem: { ...context.nvMem, defaultUnit: newUnit },
  };

  return {
    ...state,
    display: computeNormalDisplay(vMem, updatedContext),
  };
};
