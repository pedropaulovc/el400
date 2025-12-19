/**
 * Zero Approach Warning Feature Reducer
 *
 * Handles MILL_STATE_CHANGED events to trigger zero approach warning beep.
 * Monitors distance-to-go and triggers continuous beep when within threshold of zero.
 *
 * Note: This reducer has side effects (audio playback) which is generally not recommended
 * but is necessary for real-time audio feedback based on machine position changes.
 */

import type { FeatureReducer, DROReducerContext, DROStatePayload } from '../types';
import { isResultState } from '../droStateMachine';
import { fromMmToAnyUnit } from '../../utils/unitConversion';
import { startZeroApproachBeep, stopZeroApproachBeep } from '../../utils/audioManager';
import type { AxisValues } from '../../types/volatileMemory';

// Module-level state to track beeping status for hysteresis
let isCurrentlyBeeping = false;

/**
 * Calculate display values based on current mode.
 * Returns values in mm (internal storage unit).
 */
function getDisplayValues(
  vMem: DROStatePayload['vMem'],
  context: DROReducerContext
): AxisValues {
  const { millState } = context;

  if (vMem.mode === 'abs') {
    if (millState.connected) {
      // Use external machine position with work offsets applied
      return {
        X: millState.position.x - vMem.workOffsets.X,
        Y: millState.position.y - vMem.workOffsets.Y,
        Z: millState.position.z - vMem.workOffsets.Z,
      };
    }
    // Manual mode: use manual values directly
    return vMem.manualAbsoluteValues;
  }

  // INC mode
  return vMem.incrementalValues;
}

export const zeroApproachWarningReducer: FeatureReducer = (statePayload, eventPayload, context) => {
  const { eventName } = eventPayload;
  const { nvMem } = context;

  // Only handle MILL_STATE_CHANGED events
  if (eventName !== 'MILL_STATE_CHANGED') return null;

  // Only active when zero approach is enabled
  if (!nvMem.zeroApproachEnabled) {
    if (isCurrentlyBeeping) {
      stopZeroApproachBeep();
      isCurrentlyBeeping = false;
    }
    return statePayload;
  }

  // Only check in center finding result state (shows distance-to-go)
  if (
    !isResultState(statePayload.stateName) ||
    statePayload.stateData.stateDataType !== 'center-finding'
  ) {
    if (isCurrentlyBeeping) {
      stopZeroApproachBeep();
      isCurrentlyBeeping = false;
    }
    return statePayload;
  }

  // Type is guaranteed to be CenterFindingData here
  const centerData = statePayload.stateData;
  const center = centerData.centerResult;
  if (!center) {
    if (isCurrentlyBeeping) {
      stopZeroApproachBeep();
      isCurrentlyBeeping = false;
    }
    return statePayload;
  }

  const current = getDisplayValues(statePayload.vMem, context);

  // Calculate distance-to-go for each axis (in mm, then convert to inches)
  // BP DIST is always in inches, so we need to convert
  const distanceX = Math.abs(fromMmToAnyUnit(center.X - current.X, 'inch'));
  const distanceY = Math.abs(fromMmToAnyUnit(center.Y - current.Y, 'inch'));
  const distanceZ = Math.abs(fromMmToAnyUnit(center.Z - current.Z, 'inch'));

  // Check if any axis is within beep threshold
  const bpDist = nvMem.bpDist;
  const bpTolr = nvMem.bpTolr;

  const withinThreshold =
    distanceX <= bpDist ||
    distanceY <= bpDist ||
    distanceZ <= bpDist;

  const outsideHysteresis =
    distanceX > bpDist + bpTolr &&
    distanceY > bpDist + bpTolr &&
    distanceZ > bpDist + bpTolr;

  // Start beeping if within threshold and not already beeping
  if (withinThreshold && !isCurrentlyBeeping) {
    void startZeroApproachBeep();
    isCurrentlyBeeping = true;
  }

  // Stop beeping if outside hysteresis zone and currently beeping
  if (outsideHysteresis && isCurrentlyBeeping) {
    stopZeroApproachBeep();
    isCurrentlyBeeping = false;
  }

  // Return state unchanged - this reducer only has side effects
  return statePayload;
};
