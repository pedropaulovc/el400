/**
 * Polar Coordinates Feature Reducer (US-030, manual §9.1.7)
 *
 * Polar mode is a DISPLAY mode, not a hole pattern: one axis displays the
 * radius (R) and another displays the angle (θ) for a selected plane. It does
 * not change the underlying coordinate system, only the display format.
 *
 * Flow:
 *   1. Fn -> navigate to PoLAr -> ENT enters plane selection (menu.ts).
 *   2. polar-select-plane: ◄/► cycle plane (X-Y / X-Z / Y-Z), ENT confirms.
 *   3. polar-coordinates: counting mode showing R and θ, updated live as the
 *      position changes. C exits back to Cartesian (idle).
 *
 * Plane -> R/θ axis mapping (manual table):
 *   X-Y  -> R from X axis, θ from Y axis
 *   X-Z  -> R from X axis, θ from Z axis
 *   Y-Z  -> R from Y axis, θ from Z axis
 *
 * R = sqrt(a² + b²), θ = atan2(b, a) in degrees (0° = first plane axis,
 * CCW positive). R is a length and is unit-converted for display; θ is an
 * angle and is always shown in degrees regardless of the inch/mm setting.
 */

import type { FeatureReducer, DROReducerContext, DROStatePayload } from '../types';
import type { Axis } from '../../../types/volatileMemory';
import type { DROStateName, PolarData, PolarPlane } from '../droStateMachine';
import { INITIAL_DRO_STATE_DATA, INITIAL_POLAR_DATA } from '../droStateMachine';
import {
  computeAxisPositionMm,
  computeNormalDisplay,
  createDisplay,
  type DisplayState,
} from '../utils/displayComputation';
import { fromMmToAnyUnit } from '../../../utils/unitConversion';

/** Display text shown on the X axis for each plane during selection. */
const PLANE_TEXT_MAP: Record<PolarPlane, string> = {
  'X-Y': 'h-Y',
  'X-Z': 'h-Z',
  'Y-Z': 'Y-Z',
};

/** Plane selection ring - bidirectional, wraps around. */
const PLANE_RING: PolarPlane[] = ['X-Y', 'X-Z', 'Y-Z'];

/** Which axis feeds R and which feeds θ for each plane (manual table). */
const PLANE_AXES: Record<PolarPlane, { radiusAxis: Axis; angleAxis: Axis }> = {
  'X-Y': { radiusAxis: 'X', angleAxis: 'Y' },
  'X-Z': { radiusAxis: 'X', angleAxis: 'Z' },
  'Y-Z': { radiusAxis: 'Y', angleAxis: 'Z' },
};

function getNextPlane(current: PolarPlane): PolarPlane {
  const idx = PLANE_RING.indexOf(current);
  return PLANE_RING[(idx + 1) % PLANE_RING.length] ?? current;
}

function getPrevPlane(current: PolarPlane): PolarPlane {
  const idx = PLANE_RING.indexOf(current);
  return PLANE_RING[(idx - 1 + PLANE_RING.length) % PLANE_RING.length] ?? current;
}

/** Plane selection display: X shows plane text, Y and Z blank. */
function computePlaneSelectDisplay(plane: PolarPlane): DisplayState {
  return createDisplay(PLANE_TEXT_MAP[plane], '', '');
}

/**
 * Compute the polar display for the selected plane.
 * R (unit-converted length) goes on the radius axis, θ (degrees) on the angle
 * axis, and the third axis is blanked.
 */
function computePolarDisplay(
  plane: PolarPlane,
  context: DROReducerContext,
  vMem: DROStatePayload['vMem']
): DisplayState {
  const { radiusAxis, angleAxis } = PLANE_AXES[plane];
  const a = computeAxisPositionMm(radiusAxis, vMem, context);
  const b = computeAxisPositionMm(angleAxis, vMem, context);

  const radiusMm = Math.hypot(a, b);
  const radius = fromMmToAnyUnit(radiusMm, context.nvMem.defaultUnit);
  const angleDeg = (Math.atan2(b, a) * 180) / Math.PI;

  const display: Record<Axis, DisplayState[Axis]> = { X: '', Y: '', Z: '' };
  display[radiusAxis] = radius;
  display[angleAxis] = angleDeg;
  return createDisplay(display.X, display.Y, display.Z);
}

/** Read the current plane from state data, falling back to the X-Y default. */
function planeFromData(data: DROStatePayload['stateData']): PolarPlane {
  return data.stateDataType === 'polar' ? data.plane : INITIAL_POLAR_DATA.plane;
}

function makePolarData(plane: PolarPlane): PolarData {
  return { ...INITIAL_POLAR_DATA, plane };
}

function exitToIdle(
  vMem: DROStatePayload['vMem'],
  context: DROReducerContext
): DROStatePayload {
  return {
    stateName: 'idle',
    stateData: INITIAL_DRO_STATE_DATA,
    vMem,
    display: computeNormalDisplay(vMem, context),
  };
}

function isPolarState(state: DROStateName): boolean {
  return state === 'polar-select-plane' || state === 'polar-coordinates';
}

export const polarReducer: FeatureReducer = (current, event, context) => {
  const { stateName: state, stateData: data, vMem } = current;

  if (!isPolarState(state)) return null;

  const plane = planeFromData(data);

  // C exits polar mode from any polar state and returns to Cartesian.
  if (event.eventName === 'KEY_CLEAR') {
    return exitToIdle(vMem, context);
  }

  if (state === 'polar-select-plane') {
    switch (event.eventName) {
      case 'KEY_6_RIGHT': {
        const next = getNextPlane(plane);
        return {
          stateName: state,
          stateData: makePolarData(next),
          vMem,
          display: computePlaneSelectDisplay(next),
        };
      }
      case 'KEY_4_LEFT': {
        const prev = getPrevPlane(plane);
        return {
          stateName: state,
          stateData: makePolarData(prev),
          vMem,
          display: computePlaneSelectDisplay(prev),
        };
      }
      case 'KEY_ENTER':
        return {
          stateName: 'polar-coordinates',
          stateData: makePolarData(plane),
          vMem,
          display: computePolarDisplay(plane, context, vMem),
        };
      default:
        return current;
    }
  }

  // polar-coordinates counting mode: recompute R/θ as the position changes.
  if (event.eventName === 'MILL_STATE_CHANGED') {
    return {
      ...current,
      display: computePolarDisplay(plane, context, vMem),
    };
  }

  return current;
};
