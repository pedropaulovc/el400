/**
 * Hook for computing display values for the DRO axes.
 *
 * Encapsulates all display logic including:
 * - Boot message display
 * - Calculator mode values
 * - Function menu text
 * - Center finding results
 * - Normal position values with unit conversion
 *
 * Components consuming this hook don't need to know about
 * calculator mode or unit conversion - they just render the values.
 */

import { useMemo } from 'react';
import {
  useDROState,
  useDROContext,
  isFunctionMenuSelectionState,
  isResultState,
  isCalculatorActive,
  isBoltCircleActive,
  MODEL_NUMBER,
  SOFTWARE_VERSION,
} from '../dro-state-machine';
import { useVolatileMemory } from './useVolatileMemory';
import { useNonVolatileMemoryContext } from '../context/NonVolatileMemoryContext';
import { fromMmToAnyUnit } from '../utils/unitConversion';
import type { AxisDisplayValue } from '../components/Axis';

export interface DisplayAxisValues {
  X: AxisDisplayValue;
  Y: AxisDisplayValue;
  Z: AxisDisplayValue;
}

/** Menu text displayed for each function menu state */
const MENU_TEXT_MAP: Record<string, string> = {
  'function-menu-center': 'CEntrE',
  'function-menu-circle': 'CirCLE',
  'function-menu-line': 'LinE',
  'function-menu-linear': 'LinEAr',
  'function-menu-polar': 'PoLAr',
};

/** Calculator operation text displayed in Y window */
const CALC_OPERATION_MAP: Record<string, string> = {
  'calculator-idle': '',
  'calculator-add': 'Add',
  'calculator-sub': 'SUb',
  'calculator-multi': 'mULtI',
  'calculator-div': 'dIv',
};

/**
 * Hook that computes display values for all three axes.
 *
 * Handles all display modes:
 * - Boot: Shows model number and software version
 * - Calculator: Shows current value and operation (no unit conversion)
 * - Function menu: Shows menu option text
 * - Center finding (collecting): Shows current position
 * - Center finding (result): Shows distance-to-go
 * - Normal: Shows position values with unit conversion
 *
 * @returns Display values ready to render, already unit-converted where appropriate
 */
export function useDisplayValues(): DisplayAxisValues {
  const vMem = useVolatileMemory();
  const droState = useDROState();
  const droCtx = useDROContext();
  const { nvMem } = useNonVolatileMemoryContext();

  return useMemo(() => {
    const unit = nvMem.defaultUnit;

    // Boot message
    if (droState === 'boot-show-message') {
      return { X: MODEL_NUMBER, Y: SOFTWARE_VERSION, Z: '' };
    }

    // Calculator mode - no unit conversion
    if (isCalculatorActive(droState)) {
      const calcData = droCtx.stateDataType === 'calculator' ? droCtx : null;
      const operation = CALC_OPERATION_MAP[droState] ?? '';
      return {
        X: calcData?.currentValue ?? 0,
        Y: operation,
        Z: '',
      };
    }

    // Bolt circle (PCD) mode - prompts and distance-to-go
    if (isBoltCircleActive(droState)) {
      const boltData = droCtx.stateDataType === 'bolt-circle' ? droCtx : null;
      
      switch (droState) {
        case 'pcd-menu-select':
          return { X: boltData?.pcdMode ?? 'CIRCLE', Y: '', Z: '' };
        case 'pcd-circle-center-x':
          return { X: 'EntCnt 0', Y: '', Z: '' };
        case 'pcd-circle-center-y':
          return { X: 'EntCnt 1', Y: '', Z: '' };
        case 'pcd-circle-radius':
          return { X: 'rAdIUS', Y: '', Z: '' };
        case 'pcd-circle-angle':
          return { X: 'AngLE', Y: '', Z: '' };
        case 'pcd-circle-holes':
          return { X: 'hoLES', Y: '', Z: '' };
        case 'pcd-circle-navigate': {
          // Show distance-to-go to current hole
          if (boltData && boltData.centerX !== null && boltData.centerY !== null &&
              boltData.radius !== null && boltData.startAngle !== null && boltData.holeCount !== null) {
            // Calculate target position for current hole
            const angle = boltData.startAngle + ((boltData.currentHole - 1) * 360 / boltData.holeCount);
            const angleRadians = (angle * Math.PI) / 180;
            const targetX = boltData.centerX + boltData.radius * Math.cos(angleRadians);
            const targetY = boltData.centerY + boltData.radius * Math.sin(angleRadians);
            
            // Get current position
            const current = vMem.displayValues;
            
            // Return distance-to-go with unit conversion
            return {
              X: fromMmToAnyUnit(targetX - current.X, unit),
              Y: fromMmToAnyUnit(targetY - current.Y, unit),
              Z: fromMmToAnyUnit(0, unit), // Z stays at 0 for bolt circle
            };
          }
          return { X: 0, Y: 0, Z: 0 };
        }
      }
    }

    // Function menu selection
    if (isFunctionMenuSelectionState(droState)) {
      const menuText = MENU_TEXT_MAP[droState] ?? '';
      return { X: menuText, Y: '', Z: '' };
    }

    // Center finding result - show distance-to-go with unit conversion
    if (isResultState(droState) && droCtx.stateDataType === 'center-finding' && droCtx.centerResult) {
      const center = droCtx.centerResult;
      const current = vMem.displayValues;
      return {
        X: fromMmToAnyUnit(center.X - current.X, unit),
        Y: fromMmToAnyUnit(center.Y - current.Y, unit),
        Z: fromMmToAnyUnit(center.Z - current.Z, unit),
      };
    }

    // Collecting points or normal operation - show position with unit conversion
    // This covers: idle, collecting points, transitional states
    const values = vMem.displayValues;
    return {
      X: fromMmToAnyUnit(values.X, unit),
      Y: fromMmToAnyUnit(values.Y, unit),
      Z: fromMmToAnyUnit(values.Z, unit),
    };
  }, [droState, droCtx, vMem.displayValues, nvMem.defaultUnit]);
}
