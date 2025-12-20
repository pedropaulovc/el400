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
  useMode,
  isFunctionMenuSelectionState,
  isResultState,
  isCalculatorActive,
  MODEL_NUMBER,
  SOFTWARE_VERSION,
} from '../stores/dro';
import {
  useWorkOffsetX, useWorkOffsetY, useWorkOffsetZ,
  useIncrementalX, useIncrementalY, useIncrementalZ,
  useManualAbsoluteX, useManualAbsoluteY, useManualAbsoluteZ,
} from '../stores/droStore';
import {
  useMillConnected,
  useMillPositionX, useMillPositionY, useMillPositionZ,
} from '../stores/millStore';
import type { DROState, DROContext as DROContextType } from '../stores/dro';
import type { Axis } from '../types/volatileMemory';
import { useDefaultUnit } from '../stores/settingsStore';
import { fromMmToAnyUnit } from '../utils/unitConversion';
import type { AxisDisplayValue } from '../components/Axis';

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
 * Shared computation function for display values.
 * Parameterized by axis to avoid code duplication.
 */
function computeDisplayValueForAxis(
  axis: Axis,
  droState: DROState,
  droCtx: DROContextType,
  displayValue: number,
  defaultUnit: 'inch' | 'mm'
): AxisDisplayValue {
  // Boot sequence
  if (droState === 'boot' || droState === 'boot-show-message') {
    if (axis === 'X') return MODEL_NUMBER;
    if (axis === 'Y') return SOFTWARE_VERSION;
    return '';
  }

  // Calculator mode - no unit conversion
  if (isCalculatorActive(droState)) {
    const calcData = droCtx.stateDataType === 'calculator' ? droCtx : null;
    if (axis === 'X') return calcData?.currentValue ?? 0;
    if (axis === 'Y') return CALC_OPERATION_MAP[droState] ?? '';
    return '';
  }

  // Function menu selection
  if (isFunctionMenuSelectionState(droState)) {
    if (axis === 'X') return MENU_TEXT_MAP[droState] ?? '';
    return '';
  }

  // Center finding result - show distance-to-go with unit conversion
  if (isResultState(droState) && droCtx.stateDataType === 'center-finding' && droCtx.centerResult) {
    const center = droCtx.centerResult;
    return fromMmToAnyUnit(center[axis] - displayValue, defaultUnit);
  }

  // Normal operation - show position with unit conversion
  return fromMmToAnyUnit(displayValue, defaultUnit);
}

/**
 * Hook that computes display value for the X axis only.
 * Uses granular selectors - only re-renders when X-related values change.
 */
export function useDisplayValueX(): AxisDisplayValue {
  // Granular selectors for X axis only
  const mode = useMode();
  const connected = useMillConnected();
  const millPosX = useMillPositionX();
  const workOffsetX = useWorkOffsetX();
  const incrementalX = useIncrementalX();
  const manualAbsX = useManualAbsoluteX();

  // Shared state (needed for mode detection)
  const droState = useDROState();
  const droCtx = useDROContext();
  const defaultUnit = useDefaultUnit();

  // Compute display value for X
  const displayValue = useMemo(() => {
    if (mode === 'abs') {
      return connected ? millPosX - workOffsetX : manualAbsX;
    }
    return incrementalX;
  }, [mode, connected, millPosX, workOffsetX, manualAbsX, incrementalX]);

  // TODO: Extract granular selectors for droCtx properties (stateDataType, currentValue, centerResult)
  // to avoid unnecessary recalculations when unrelated droCtx properties change.
  return useMemo(
    () => computeDisplayValueForAxis('X', droState, droCtx, displayValue, defaultUnit),
    [droState, droCtx, displayValue, defaultUnit]
  );
}

/**
 * Hook that computes display value for the Y axis only.
 * Uses granular selectors - only re-renders when Y-related values change.
 */
export function useDisplayValueY(): AxisDisplayValue {
  // Granular selectors for Y axis only
  const mode = useMode();
  const connected = useMillConnected();
  const millPosY = useMillPositionY();
  const workOffsetY = useWorkOffsetY();
  const incrementalY = useIncrementalY();
  const manualAbsY = useManualAbsoluteY();

  // Shared state (needed for mode detection)
  const droState = useDROState();
  const droCtx = useDROContext();
  const defaultUnit = useDefaultUnit();

  // Compute display value for Y
  const displayValue = useMemo(() => {
    if (mode === 'abs') {
      return connected ? millPosY - workOffsetY : manualAbsY;
    }
    return incrementalY;
  }, [mode, connected, millPosY, workOffsetY, manualAbsY, incrementalY]);

  // TODO: Extract granular selectors for droCtx properties (stateDataType, currentValue, centerResult)
  // to avoid unnecessary recalculations when unrelated droCtx properties change.
  return useMemo(
    () => computeDisplayValueForAxis('Y', droState, droCtx, displayValue, defaultUnit),
    [droState, droCtx, displayValue, defaultUnit]
  );
}

/**
 * Hook that computes display value for the Z axis only.
 * Uses granular selectors - only re-renders when Z-related values change.
 */
export function useDisplayValueZ(): AxisDisplayValue {
  // Granular selectors for Z axis only
  const mode = useMode();
  const connected = useMillConnected();
  const millPosZ = useMillPositionZ();
  const workOffsetZ = useWorkOffsetZ();
  const incrementalZ = useIncrementalZ();
  const manualAbsZ = useManualAbsoluteZ();

  // Shared state (needed for mode detection)
  const droState = useDROState();
  const droCtx = useDROContext();
  const defaultUnit = useDefaultUnit();

  // Compute display value for Z
  const displayValue = useMemo(() => {
    if (mode === 'abs') {
      return connected ? millPosZ - workOffsetZ : manualAbsZ;
    }
    return incrementalZ;
  }, [mode, connected, millPosZ, workOffsetZ, manualAbsZ, incrementalZ]);

  // TODO: Extract granular selectors for droCtx properties (stateDataType, currentValue, centerResult)
  // to avoid unnecessary recalculations when unrelated droCtx properties change.
  return useMemo(
    () => computeDisplayValueForAxis('Z', droState, droCtx, displayValue, defaultUnit),
    [droState, droCtx, displayValue, defaultUnit]
  );
}
