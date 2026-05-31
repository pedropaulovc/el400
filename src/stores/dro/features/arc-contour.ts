/**
 * Arc Contouring (Step Drilling) Feature Reducer (US-018)
 *
 * Positions overlapping holes along an arc so the operator can cut a smooth
 * curved edge. Mirrors the bolt-hole circle feature:
 * - Timed intro message ("ArC Cnt") before parameter entry
 * - Parameter entry: center X/Y, radius, start/end angle, tool diameter
 * - Cut-type selection (INT / EXT / MID) toggled with key 6
 * - MAX CUT entry; the system derives the number of steps from arc length
 * - Distance-to-go navigation between points: 6=next, 4=prev, 8=show#, 2=jump
 *
 * Manual reference: §9.1.3 Arc Contouring Function.
 */

import { useEffect, type Dispatch } from 'react';
import type { FeatureReducer, DROReducerContext } from '../types';
import type {
  DROStateName,
  ArcData,
  ArcCutType,
  DROEventPayload,
} from '../droStateMachine';
import {
  INITIAL_DRO_STATE_DATA,
  INITIAL_ARC_DATA,
  isArcContourActive,
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

/**
 * Duration in milliseconds for the arc contour intro message ("ArC Cnt")
 * before auto-advancing to parameter entry.
 */
export const ARC_CONTOUR_INTRO_DURATION_MS = 1000;

/** Display text for arc contour parameter-entry states. */
const ARC_CONTOUR_DISPLAY_TEXT: Record<string, string> = {
  'arc-contour-intro': 'ArC Cnt',
  'arc-contour-center-x': 'EntCnt0',
  'arc-contour-center-y': 'EntCnt1',
  'arc-contour-radius': 'rAdiUS',
  'arc-contour-start-angle': 'Str AnG',
  'arc-contour-end-angle': 'End AnG',
  'arc-contour-tool-diameter': 'tooL d',
  'arc-contour-max-cut': 'nAX CUt',
};

/** Display text for each cut type, shown in the cut-type selection state. */
const CUT_TYPE_DISPLAY_TEXT: Record<ArcCutType, string> = {
  INT: 'int CUt',
  EXT: 'EXt CUt',
  MID: 'mid CUt',
};

/** Order cut types cycle through when pressing key 6. */
const CUT_TYPE_CYCLE: ArcCutType[] = ['INT', 'EXT', 'MID'];

/** States that accept numeric input for parameter entry. */
const PARAMETER_ENTRY_STATES: DROStateName[] = [
  'arc-contour-center-x',
  'arc-contour-center-y',
  'arc-contour-radius',
  'arc-contour-start-angle',
  'arc-contour-end-angle',
  'arc-contour-tool-diameter',
  'arc-contour-max-cut',
];

/** Check if current state accepts numeric input. */
function isParameterEntryState(state: DROStateName): boolean {
  return PARAMETER_ENTRY_STATES.includes(state);
}

/** Inputs needed to compute arc geometry (radius/angles in mm + degrees). */
interface ArcGeometryInput {
  radius: number;
  startAngle: number;
  endAngle: number;
  toolDiameter: number;
  cutType: ArcCutType;
  maxCut: number;
}

/**
 * Effective radius the tool center travels, accounting for cut type.
 * INT pulls inside by the tool radius, EXT pushes outside, MID stays on the radius.
 */
function effectiveRadius(radius: number, toolDiameter: number, cutType: ArcCutType): number {
  const toolRadius = toolDiameter / 2;
  if (cutType === 'INT') return radius - toolRadius;
  if (cutType === 'EXT') return radius + toolRadius;
  return radius;
}

/** Absolute angular span of the arc, in degrees. */
function arcSpanDegrees(startAngle: number, endAngle: number): number {
  return Math.abs(endAngle - startAngle);
}

/**
 * Number of steps along the arc: ceil(arc length / max cut).
 * Arc length uses the effective (cut-adjusted) radius so the tool path spacing
 * is what actually gets cut. The point count is steps + 1.
 */
export function calculateArcStepCount(input: ArcGeometryInput): number {
  const r = effectiveRadius(input.radius, input.toolDiameter, input.cutType);
  const spanRad = (arcSpanDegrees(input.startAngle, input.endAngle) * Math.PI) / 180;
  const arcLength = Math.abs(r) * spanRad;
  if (input.maxCut <= 0) return 0;
  return Math.max(1, Math.ceil(arcLength / input.maxCut));
}

/**
 * Position {x, y} (mm) of a specific point along the arc.
 * Points are evenly distributed from start angle to end angle on the effective
 * radius. @param pointNumber is 1-indexed (point 1 = start angle).
 */
export function calculateArcPointPosition(
  arcData: ArcData,
  pointNumber: number
): { x: number; y: number } {
  const { centerX, centerY, radius, startAngle, endAngle, toolDiameter, cutType, pointCount } =
    arcData;
  if (
    centerX === null ||
    centerY === null ||
    radius === null ||
    startAngle === null ||
    endAngle === null ||
    toolDiameter === null ||
    pointCount === null ||
    pointCount < 1
  ) {
    return { x: 0, y: 0 };
  }

  const r = effectiveRadius(radius, toolDiameter, cutType);
  const steps = Math.max(1, pointCount - 1);
  const fraction = (pointNumber - 1) / steps;
  const angle = startAngle + (endAngle - startAngle) * fraction;
  const angleRad = (angle * Math.PI) / 180;

  return {
    x: centerX + r * Math.cos(angleRad),
    y: centerY + r * Math.sin(angleRad),
  };
}

/**
 * Compute display showing distance-to-go to the current arc point.
 * Shows (pointPosition - currentPosition) in the user's preferred unit.
 */
function computeArcNavigateDisplay(
  arcData: ArcData,
  vMem: VolatileMemoryState,
  context: DROReducerContext
): DisplayState {
  const pointPos = calculateArcPointPosition(arcData, arcData.currentPoint);

  const { millState } = context;
  const currentX = millState.connected
    ? millState.position.x - vMem.workOffsets.X
    : vMem.manualAbsoluteValues.X;
  const currentY = millState.connected
    ? millState.position.y - vMem.workOffsets.Y
    : vMem.manualAbsoluteValues.Y;

  const unit = context.nvMem.defaultUnit;

  return createDisplay(
    fromMmToAnyUnit(pointPos.x - currentX, unit),
    fromMmToAnyUnit(pointPos.y - currentY, unit),
    computeNormalDisplay(vMem, context).Z
  );
}

/**
 * Format buffer value for display.
 * Empty/partial buffers show 0; otherwise the parsed numeric value.
 */
function formatBufferForDisplay(buffer: string): number {
  if (!buffer || buffer === '-' || buffer === '.' || buffer === '-.') {
    return 0;
  }
  const value = parseFloat(buffer);
  return isNaN(value) ? 0 : value;
}

/**
 * Compute display for parameter entry states.
 * center-x shows the buffer value on X and the prompt on Y; all other prompts
 * show the prompt text on X and the buffer value on Y. Z is always blank.
 */
function computeParameterEntryDisplay(
  state: DROStateName,
  vMem: VolatileMemoryState
): DisplayState {
  const promptText = ARC_CONTOUR_DISPLAY_TEXT[state] ?? '';
  const bufferValue = formatBufferForDisplay(vMem.inputBuffer);

  if (state === 'arc-contour-center-x') {
    return createDisplay(bufferValue, promptText, '');
  }
  return createDisplay(promptText, bufferValue, '');
}

/** Compute display for the cut-type selection state (cut text on X, 0 on Y). */
function computeCutTypeDisplay(arcData: ArcData): DisplayState {
  return createDisplay(CUT_TYPE_DISPLAY_TEXT[arcData.cutType], 0, '');
}

export const arcContourReducer: FeatureReducer = (statePayload, eventPayload, context) => {
  const { stateName: state, stateData: data, vMem } = statePayload;
  const { eventName } = eventPayload;

  // Entry into arc-contour-intro is handled by idleReducer.
  if (!isArcContourActive(state)) return null;

  const arcData = data.stateDataType === 'arc' ? data : INITIAL_ARC_DATA;

  // Keep displays in sync when the mill position changes.
  if (eventName === 'MILL_STATE_CHANGED') {
    if (state === 'arc-contour-navigate') {
      return { ...statePayload, display: computeArcNavigateDisplay(arcData, vMem, context) };
    }
    if (isParameterEntryState(state)) {
      return { ...statePayload, display: computeParameterEntryDisplay(state, vMem) };
    }
    return statePayload;
  }

  // KEY_CLEAR: backspace when the buffer has content, otherwise exit to idle.
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

  // Digit / decimal / sign input in parameter entry states.
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
    case 'arc-contour-intro': {
      if (eventName === 'ARC_CONTOUR_INTRO_TIMEOUT') {
        const newVMem = { ...vMem, inputBuffer: '' };
        return {
          stateName: 'arc-contour-center-x',
          stateData: arcData,
          vMem: newVMem,
          display: computeParameterEntryDisplay('arc-contour-center-x', newVMem),
        };
      }
      return statePayload;
    }

    case 'arc-contour-center-x': {
      if (eventName === 'KEY_ENTER') {
        const value = getBufferValue(vMem.inputBuffer);
        if (value === null) return null;
        const valueMm = fromAnyUnitToMm(value, context.nvMem.defaultUnit);
        const newData = { ...arcData, centerX: valueMm };
        const newVMem = { ...vMem, inputBuffer: '' };
        return {
          stateName: 'arc-contour-center-y',
          stateData: newData,
          vMem: newVMem,
          display: computeParameterEntryDisplay('arc-contour-center-y', newVMem),
        };
      }
      return null;
    }

    case 'arc-contour-center-y': {
      if (eventName === 'KEY_ENTER') {
        const value = getBufferValue(vMem.inputBuffer);
        if (value === null) return null;
        const valueMm = fromAnyUnitToMm(value, context.nvMem.defaultUnit);
        const newData = { ...arcData, centerY: valueMm };
        const newVMem = { ...vMem, inputBuffer: '' };
        return {
          stateName: 'arc-contour-radius',
          stateData: newData,
          vMem: newVMem,
          display: computeParameterEntryDisplay('arc-contour-radius', newVMem),
        };
      }
      return null;
    }

    case 'arc-contour-radius': {
      if (eventName === 'KEY_ENTER') {
        const value = getBufferValue(vMem.inputBuffer);
        if (value === null || value <= 0) return null;
        const valueMm = fromAnyUnitToMm(value, context.nvMem.defaultUnit);
        const newData = { ...arcData, radius: valueMm };
        const newVMem = { ...vMem, inputBuffer: '' };
        return {
          stateName: 'arc-contour-start-angle',
          stateData: newData,
          vMem: newVMem,
          display: computeParameterEntryDisplay('arc-contour-start-angle', newVMem),
        };
      }
      return null;
    }

    case 'arc-contour-start-angle': {
      if (eventName === 'KEY_ENTER') {
        const value = getBufferValue(vMem.inputBuffer);
        if (value === null) return null;
        const newData = { ...arcData, startAngle: value };
        const newVMem = { ...vMem, inputBuffer: '' };
        return {
          stateName: 'arc-contour-end-angle',
          stateData: newData,
          vMem: newVMem,
          display: computeParameterEntryDisplay('arc-contour-end-angle', newVMem),
        };
      }
      return null;
    }

    case 'arc-contour-end-angle': {
      if (eventName === 'KEY_ENTER') {
        const value = getBufferValue(vMem.inputBuffer);
        if (value === null) return null;
        // Reject a zero-span arc - there is nothing to contour.
        if (arcData.startAngle !== null && value === arcData.startAngle) return null;
        const newData = { ...arcData, endAngle: value };
        const newVMem = { ...vMem, inputBuffer: '' };
        return {
          stateName: 'arc-contour-tool-diameter',
          stateData: newData,
          vMem: newVMem,
          display: computeParameterEntryDisplay('arc-contour-tool-diameter', newVMem),
        };
      }
      return null;
    }

    case 'arc-contour-tool-diameter': {
      if (eventName === 'KEY_ENTER') {
        const value = getBufferValue(vMem.inputBuffer);
        if (value === null || value < 0) return null;
        const valueMm = fromAnyUnitToMm(value, context.nvMem.defaultUnit);
        const newData = { ...arcData, toolDiameter: valueMm };
        const newVMem = { ...vMem, inputBuffer: '' };
        return {
          stateName: 'arc-contour-cut-type',
          stateData: newData,
          vMem: newVMem,
          display: computeCutTypeDisplay(newData),
        };
      }
      return null;
    }

    case 'arc-contour-cut-type': {
      // Key 6 cycles INT -> EXT -> MID -> INT.
      if (eventName === 'KEY_6_RIGHT') {
        const idx = CUT_TYPE_CYCLE.indexOf(arcData.cutType);
        const nextCutType = CUT_TYPE_CYCLE[(idx + 1) % CUT_TYPE_CYCLE.length] ?? 'INT';
        const newData = { ...arcData, cutType: nextCutType };
        return {
          stateName: 'arc-contour-cut-type',
          stateData: newData,
          vMem,
          display: computeCutTypeDisplay(newData),
        };
      }
      // ENTER confirms and moves to MAX CUT entry.
      if (eventName === 'KEY_ENTER') {
        const newVMem = { ...vMem, inputBuffer: '' };
        return {
          stateName: 'arc-contour-max-cut',
          stateData: arcData,
          vMem: newVMem,
          display: computeParameterEntryDisplay('arc-contour-max-cut', newVMem),
        };
      }
      return null;
    }

    case 'arc-contour-max-cut': {
      if (eventName === 'KEY_ENTER') {
        const value = getBufferValue(vMem.inputBuffer);
        if (value === null || value <= 0) return null;
        const valueMm = fromAnyUnitToMm(value, context.nvMem.defaultUnit);
        if (
          arcData.radius === null ||
          arcData.startAngle === null ||
          arcData.endAngle === null ||
          arcData.toolDiameter === null
        ) {
          return null;
        }
        const steps = calculateArcStepCount({
          radius: arcData.radius,
          startAngle: arcData.startAngle,
          endAngle: arcData.endAngle,
          toolDiameter: arcData.toolDiameter,
          cutType: arcData.cutType,
          maxCut: valueMm,
        });
        const newData: ArcData = {
          ...arcData,
          maxCut: valueMm,
          pointCount: steps + 1,
          currentPoint: 1,
        };
        // Switch to INC mode for distance-to-go navigation.
        const newVMem = { ...vMem, mode: 'inc' as const, inputBuffer: '' };
        return {
          stateName: 'arc-contour-navigate',
          stateData: newData,
          vMem: newVMem,
          display: computeArcNavigateDisplay(newData, newVMem, context),
        };
      }
      return null;
    }

    case 'arc-contour-navigate': {
      const { pointCount, currentPoint } = arcData;

      if (pointCount === null) {
        return {
          stateName: 'idle',
          stateData: INITIAL_DRO_STATE_DATA,
          vMem,
          display: computeNormalDisplay(vMem, context),
        };
      }

      // Key 6: advance to next point (wrap to first).
      if (eventName === 'KEY_6_RIGHT') {
        const nextPoint = currentPoint >= pointCount ? 1 : currentPoint + 1;
        const newData = { ...arcData, currentPoint: nextPoint };
        return {
          stateName: 'arc-contour-navigate',
          stateData: newData,
          vMem: { ...vMem, inputBuffer: '' },
          display: computeArcNavigateDisplay(newData, vMem, context),
        };
      }

      // Key 4: previous point (wrap to last).
      if (eventName === 'KEY_4_LEFT') {
        const prevPoint = currentPoint <= 1 ? pointCount : currentPoint - 1;
        const newData = { ...arcData, currentPoint: prevPoint };
        return {
          stateName: 'arc-contour-navigate',
          stateData: newData,
          vMem: { ...vMem, inputBuffer: '' },
          display: computeArcNavigateDisplay(newData, vMem, context),
        };
      }

      // Key 8: show current point number in the buffer.
      if (eventName === 'KEY_8_UP') {
        return { ...statePayload, vMem: { ...vMem, inputBuffer: String(currentPoint) } };
      }

      // Key 2: clear buffer to start a jump entry.
      if (eventName === 'KEY_2_DOWN') {
        return { ...statePayload, vMem: { ...vMem, inputBuffer: '' } };
      }

      // ENTER with a buffered number jumps to that point.
      if (eventName === 'KEY_ENTER' && vMem.inputBuffer !== '') {
        const target = getBufferValue(vMem.inputBuffer);
        if (target !== null && target >= 1 && target <= pointCount) {
          const newData = { ...arcData, currentPoint: Math.floor(target) };
          return {
            stateName: 'arc-contour-navigate',
            stateData: newData,
            vMem: { ...vMem, inputBuffer: '' },
            display: computeArcNavigateDisplay(newData, vMem, context),
          };
        }
        return null;
      }

      // Digit keys (non-arrow) accumulate a jump target.
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
 * Hook to manage arc contour intro timing.
 * Auto-advances from the intro state after ARC_CONTOUR_INTRO_DURATION_MS.
 *
 * @param dispatch - DRO state machine dispatch function
 * @param droState - Current DRO state
 */
export function useArcContourIntro(
  dispatch: Dispatch<DROEventPayload>,
  droState: DROStateName
) {
  useEffect(() => {
    if (droState === 'arc-contour-intro') {
      const timer = setTimeout(() => {
        dispatch({ eventName: 'ARC_CONTOUR_INTRO_TIMEOUT' });
      }, ARC_CONTOUR_INTRO_DURATION_MS);
      return () => { clearTimeout(timer); };
    }
    return undefined;
  }, [droState, dispatch]);
}
