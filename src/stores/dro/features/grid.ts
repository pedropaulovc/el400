/**
 * Grid Drilling Feature Reducer (US-020)
 *
 * Generates a rectangular grid of holes for mounting plates and
 * perforation patterns. Mirrors the bolt-hole circle feature.
 *
 * Workflow:
 * - Intro: shows "Grid" briefly, then auto-advances
 * - Parameter entry: start X/Y, pitch X, pitch Y, tilt angle, holes X, holes Y
 * - Navigate: shows distance-to-go to each hole (6=next, 4=prev, 8=show, 2=jump)
 *
 * The grid X axis is tilted by `angle` degrees from the machine +X axis
 * (CCW positive). The grid Y axis is perpendicular (angle + 90°). Holes are
 * numbered row-major: hole# = row * holesX + col + 1.
 *
 * Manual reference: §9.1.5 Grid Function (DRILLING A GRID OF HOLES).
 */

import { useEffect, type Dispatch } from 'react';
import type { FeatureReducer, DROReducerContext } from '../types';
import type { DROStateName, GridData, DROEventPayload } from '../droStateMachine';
import {
  INITIAL_DRO_STATE_DATA,
  INITIAL_GRID_DATA,
  isGridActive,
} from '../droStateMachine';
import type { VolatileMemoryState } from '../../../types/volatileMemory';
import {
  getBufferValue,
  appendDigit,
  appendDecimal,
  toggleSign,
  removeLastChar,
  KEY_TO_DIGIT,
} from './buffer-utils';
import {
  computeNormalDisplay,
  createDisplay,
  type DisplayState,
} from '../utils/displayComputation';
import { fromMmToAnyUnit, fromAnyUnitToMm } from '../../../utils/unitConversion';

/** Duration the "Grid" intro message shows before auto-advancing. */
export const GRID_INTRO_DURATION_MS = 1000;

/** Prompt text shown for each parameter entry state. */
const GRID_DISPLAY_TEXT: Record<string, string> = {
  'grid-start-x': 'EntCnt0',
  'grid-start-y': 'EntCnt1',
  'grid-pitch-x': 'PItCh X',
  'grid-pitch-y': 'PItCh Y',
  'grid-angle': 'AnGLE',
  'grid-holes-x': 'hoLE X',
  'grid-holes-y': 'hoLE Y',
};

/** States that accept numeric input for parameter entry. */
const PARAMETER_ENTRY_STATES: DROStateName[] = [
  'grid-start-x',
  'grid-start-y',
  'grid-pitch-x',
  'grid-pitch-y',
  'grid-angle',
  'grid-holes-x',
  'grid-holes-y',
];

function isParameterEntryState(state: DROStateName): boolean {
  return PARAMETER_ENTRY_STATES.includes(state);
}

/**
 * Calculate the position (in mm) of a specific hole in the grid.
 * Holes are numbered row-major; row i, column j map to:
 *   X = startX + j*pitchX*cos(angle) + i*pitchY*cos(angle + 90°)
 *   Y = startY + j*pitchX*sin(angle) + i*pitchY*sin(angle + 90°)
 *
 * @param gridData - Grid configuration
 * @param holeNumber - 1-indexed hole number
 */
function calculateHolePosition(
  gridData: GridData,
  holeNumber: number
): { x: number; y: number } {
  const { startX, startY, pitchX, pitchY, angle, holesX } = gridData;
  if (
    startX === null ||
    startY === null ||
    pitchX === null ||
    pitchY === null ||
    angle === null ||
    holesX === null ||
    holesX < 1
  ) {
    return { x: 0, y: 0 };
  }

  const index = holeNumber - 1;
  const col = index % holesX;
  const row = Math.floor(index / holesX);

  const angleRad = (angle * Math.PI) / 180;
  const perpRad = ((angle + 90) * Math.PI) / 180;

  return {
    x: startX + col * pitchX * Math.cos(angleRad) + row * pitchY * Math.cos(perpRad),
    y: startY + col * pitchX * Math.sin(angleRad) + row * pitchY * Math.sin(perpRad),
  };
}

/** Total number of holes in the grid (0 until both counts are set). */
function totalHoles(gridData: GridData): number {
  if (gridData.holesX === null || gridData.holesY === null) return 0;
  return gridData.holesX * gridData.holesY;
}

/**
 * Compute distance-to-go display: (hole position - current position),
 * always in the user's preferred unit.
 */
function computeGridNavigateDisplay(
  gridData: GridData,
  vMem: VolatileMemoryState,
  context: DROReducerContext
): DisplayState {
  const holePos = calculateHolePosition(gridData, gridData.currentHole);

  const { millState } = context;
  const currentX = millState.connected
    ? millState.position.x - vMem.workOffsets.X
    : vMem.manualAbsoluteValues.X;
  const currentY = millState.connected
    ? millState.position.y - vMem.workOffsets.Y
    : vMem.manualAbsoluteValues.Y;

  const unit = context.nvMem.defaultUnit;

  return createDisplay(
    fromMmToAnyUnit(holePos.x - currentX, unit),
    fromMmToAnyUnit(holePos.y - currentY, unit),
    computeNormalDisplay(vMem, context).Z
  );
}

/** Parse the buffer to a numeric value for display (empty/invalid => 0). */
function formatBufferForDisplay(buffer: string): number {
  if (!buffer || buffer === '-' || buffer === '.' || buffer === '-.') {
    return 0;
  }
  const value = parseFloat(buffer);
  return isNaN(value) ? 0 : value;
}

/**
 * Compute display for a parameter entry state.
 * For start-x: X shows the buffer value, Y shows the prompt (mirrors bolt-hole).
 * For all others: X shows the prompt, Y shows the buffer value.
 */
function computeParameterEntryDisplay(
  state: DROStateName,
  vMem: VolatileMemoryState
): DisplayState {
  const promptText = GRID_DISPLAY_TEXT[state] ?? '';
  const bufferValue = formatBufferForDisplay(vMem.inputBuffer);

  if (state === 'grid-start-x') {
    return createDisplay(bufferValue, promptText, '');
  }

  return createDisplay(promptText, bufferValue, '');
}

/** Map each parameter entry state to the next state in the chain. */
const NEXT_PARAMETER_STATE: Record<string, DROStateName> = {
  'grid-start-x': 'grid-start-y',
  'grid-start-y': 'grid-pitch-x',
  'grid-pitch-x': 'grid-pitch-y',
  'grid-pitch-y': 'grid-angle',
  'grid-angle': 'grid-holes-x',
  'grid-holes-x': 'grid-holes-y',
};

export const gridReducer: FeatureReducer = (statePayload, eventPayload, context) => {
  const { stateName: state, stateData: data, vMem } = statePayload;
  const { eventName } = eventPayload;

  if (!isGridActive(state)) return null;

  const gridData = data.stateDataType === 'grid' ? data : INITIAL_GRID_DATA;

  // Update display when mill position changes
  if (eventName === 'MILL_STATE_CHANGED') {
    if (state === 'grid-navigate') {
      return {
        ...statePayload,
        display: computeGridNavigateDisplay(gridData, vMem, context),
      };
    }
    if (isParameterEntryState(state)) {
      return {
        ...statePayload,
        display: computeParameterEntryDisplay(state, vMem),
      };
    }
    return statePayload;
  }

  // KEY_CLEAR: backspace if buffer has content, otherwise exit to idle (ABS restored)
  if (eventName === 'KEY_CLEAR') {
    if (vMem.inputBuffer !== '') {
      const newBuffer = removeLastChar(vMem.inputBuffer);
      return {
        ...statePayload,
        vMem: { ...vMem, inputBuffer: newBuffer },
        display: isParameterEntryState(state)
          ? computeParameterEntryDisplay(state, { ...vMem, inputBuffer: newBuffer })
          : statePayload.display,
      };
    }
    const restoredVMem = { ...vMem, mode: 'abs' as const };
    return {
      stateName: 'idle',
      stateData: INITIAL_DRO_STATE_DATA,
      vMem: restoredVMem,
      display: computeNormalDisplay(restoredVMem, context),
    };
  }

  // Digit / decimal / sign input in parameter entry states
  if (isParameterEntryState(state)) {
    const digit = KEY_TO_DIGIT[eventName];
    if (digit !== undefined) {
      const newBuffer = appendDigit(vMem.inputBuffer, digit);
      return {
        ...statePayload,
        vMem: { ...vMem, inputBuffer: newBuffer },
        display: computeParameterEntryDisplay(state, { ...vMem, inputBuffer: newBuffer }),
      };
    }

    if (eventName === 'KEY_DECIMAL') {
      const newBuffer = appendDecimal(vMem.inputBuffer);
      return {
        ...statePayload,
        vMem: { ...vMem, inputBuffer: newBuffer },
        display: computeParameterEntryDisplay(state, { ...vMem, inputBuffer: newBuffer }),
      };
    }

    if (eventName === 'KEY_SIGN') {
      const newBuffer = toggleSign(vMem.inputBuffer);
      return {
        ...statePayload,
        vMem: { ...vMem, inputBuffer: newBuffer },
        display: computeParameterEntryDisplay(state, { ...vMem, inputBuffer: newBuffer }),
      };
    }
  }

  switch (state) {
    case 'grid-intro': {
      if (eventName === 'GRID_INTRO_TIMEOUT') {
        const newVMem = { ...vMem, inputBuffer: '' };
        return {
          stateName: 'grid-start-x',
          stateData: gridData,
          vMem: newVMem,
          display: computeParameterEntryDisplay('grid-start-x', newVMem),
        };
      }
      return statePayload;
    }

    case 'grid-start-x': {
      if (eventName === 'KEY_ENTER') {
        const value = getBufferValue(vMem.inputBuffer);
        if (value === null) return null;
        const valueMm = fromAnyUnitToMm(value, context.nvMem.defaultUnit);
        return advanceParameter(statePayload, { ...gridData, startX: valueMm });
      }
      return null;
    }

    case 'grid-start-y': {
      if (eventName === 'KEY_ENTER') {
        const value = getBufferValue(vMem.inputBuffer);
        if (value === null) return null;
        const valueMm = fromAnyUnitToMm(value, context.nvMem.defaultUnit);
        return advanceParameter(statePayload, { ...gridData, startY: valueMm });
      }
      return null;
    }

    case 'grid-pitch-x': {
      if (eventName === 'KEY_ENTER') {
        const value = getBufferValue(vMem.inputBuffer);
        if (value === null || value <= 0) return null;
        const valueMm = fromAnyUnitToMm(value, context.nvMem.defaultUnit);
        return advanceParameter(statePayload, { ...gridData, pitchX: valueMm });
      }
      return null;
    }

    case 'grid-pitch-y': {
      if (eventName === 'KEY_ENTER') {
        const value = getBufferValue(vMem.inputBuffer);
        if (value === null || value <= 0) return null;
        const valueMm = fromAnyUnitToMm(value, context.nvMem.defaultUnit);
        return advanceParameter(statePayload, { ...gridData, pitchY: valueMm });
      }
      return null;
    }

    case 'grid-angle': {
      if (eventName === 'KEY_ENTER') {
        const value = getBufferValue(vMem.inputBuffer);
        if (value === null) return null;
        const normalizedAngle = ((value % 360) + 360) % 360;
        return advanceParameter(statePayload, { ...gridData, angle: normalizedAngle });
      }
      return null;
    }

    case 'grid-holes-x': {
      if (eventName === 'KEY_ENTER') {
        const value = getBufferValue(vMem.inputBuffer);
        if (value === null || value < 1 || value > 99) return null;
        return advanceParameter(statePayload, { ...gridData, holesX: Math.floor(value) });
      }
      return null;
    }

    case 'grid-holes-y': {
      if (eventName === 'KEY_ENTER') {
        const value = getBufferValue(vMem.inputBuffer);
        if (value === null || value < 1 || value > 99) return null;

        const newData: GridData = {
          ...gridData,
          holesY: Math.floor(value),
          currentHole: 1,
        };
        // Switch to INC mode for distance-to-go display
        const newVMem = { ...vMem, mode: 'inc' as const, inputBuffer: '' };
        return {
          stateName: 'grid-navigate',
          stateData: newData,
          vMem: newVMem,
          display: computeGridNavigateDisplay(newData, newVMem, context),
        };
      }
      return null;
    }

    case 'grid-navigate': {
      const total = totalHoles(gridData);
      const { currentHole } = gridData;

      if (total < 1) {
        return {
          stateName: 'idle',
          stateData: INITIAL_DRO_STATE_DATA,
          vMem,
          display: computeNormalDisplay(vMem, context),
        };
      }

      // Key 6: next hole (wrap to 1)
      if (eventName === 'KEY_6_RIGHT') {
        const nextHole = currentHole >= total ? 1 : currentHole + 1;
        const newData = { ...gridData, currentHole: nextHole };
        return {
          stateName: 'grid-navigate',
          stateData: newData,
          vMem: { ...vMem, inputBuffer: '' },
          display: computeGridNavigateDisplay(newData, vMem, context),
        };
      }

      // Key 4: previous hole (wrap to last)
      if (eventName === 'KEY_4_LEFT') {
        const prevHole = currentHole <= 1 ? total : currentHole - 1;
        const newData = { ...gridData, currentHole: prevHole };
        return {
          stateName: 'grid-navigate',
          stateData: newData,
          vMem: { ...vMem, inputBuffer: '' },
          display: computeGridNavigateDisplay(newData, vMem, context),
        };
      }

      // Key 8: show current hole number in buffer
      if (eventName === 'KEY_8_UP') {
        return {
          ...statePayload,
          vMem: { ...vMem, inputBuffer: String(currentHole) },
        };
      }

      // Key 2: clear buffer to prepare a jump
      if (eventName === 'KEY_2_DOWN') {
        return {
          ...statePayload,
          vMem: { ...vMem, inputBuffer: '' },
        };
      }

      // ENTER with a buffered number: jump to that hole
      if (eventName === 'KEY_ENTER' && vMem.inputBuffer !== '') {
        const targetHole = getBufferValue(vMem.inputBuffer);
        if (targetHole !== null && targetHole >= 1 && targetHole <= total) {
          const newData = { ...gridData, currentHole: Math.floor(targetHole) };
          return {
            stateName: 'grid-navigate',
            stateData: newData,
            vMem: { ...vMem, inputBuffer: '' },
            display: computeGridNavigateDisplay(newData, vMem, context),
          };
        }
        return null;
      }

      // Digit entry for jump target (non-arrow digit keys: 0,1,3,5,7,9)
      const digit = KEY_TO_DIGIT[eventName];
      if (digit !== undefined) {
        return {
          ...statePayload,
          vMem: { ...vMem, inputBuffer: appendDigit(vMem.inputBuffer, digit) },
        };
      }

      return null;
    }

    default:
      return null;
  }
};

/**
 * Store a parameter and advance to the next entry state with a cleared buffer.
 * Only used from the parameter entry chain (start-x .. holes-x).
 */
function advanceParameter(statePayload: Parameters<FeatureReducer>[0], newData: GridData) {
  const nextState = NEXT_PARAMETER_STATE[statePayload.stateName];
  if (nextState === undefined) return null;
  const newVMem = { ...statePayload.vMem, inputBuffer: '' };
  return {
    stateName: nextState,
    stateData: newData,
    vMem: newVMem,
    display: computeParameterEntryDisplay(nextState, newVMem),
  };
}

/**
 * Hook to manage the grid intro timing.
 * Auto-advances from intro state after GRID_INTRO_DURATION_MS.
 */
export function useGridIntro(
  dispatch: Dispatch<DROEventPayload>,
  droState: DROStateName
) {
  useEffect(() => {
    if (droState === 'grid-intro') {
      const timer = setTimeout(() => {
        dispatch({ eventName: 'GRID_INTRO_TIMEOUT' });
      }, GRID_INTRO_DURATION_MS);
      return () => { clearTimeout(timer); };
    }
    return undefined;
  }, [droState, dispatch]);
}
