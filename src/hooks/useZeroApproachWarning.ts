/**
 * Hook for Zero Approach Warning (US-024)
 * 
 * Monitors distance-to-go and triggers continuous beep when within threshold of zero.
 * 
 * Behavior:
 * - Beeping starts when |distance| <= BP DIST
 * - Beeping stops when |distance| > BP DIST + BP TOLR
 * - BP TOLR provides hysteresis to prevent flutter
 * - Works in distance-to-go mode, SDM, and center-finding result states
 */

import { useEffect, useRef } from 'react';
import { useNonVolatileMemoryContext } from '../context/NonVolatileMemoryContext';
import { useDROState, useDROContext, isResultState } from '../dro-state-machine';
import { useVolatileMemory } from './useVolatileMemory';
import { startZeroApproachBeep, stopZeroApproachBeep } from '../utils/audioManager';
import { fromMmToAnyUnit } from '../utils/unitConversion';

/**
 * Hook to handle zero approach warning beep
 */
export function useZeroApproachWarning(): void {
  const { nvMem } = useNonVolatileMemoryContext();
  const droState = useDROState();
  const droCtx = useDROContext();
  const vMem = useVolatileMemory();
  const isBeepingRef = useRef(false);

  useEffect(() => {
    // Only active when zero approach is enabled
    if (!nvMem.zeroApproachEnabled) {
      if (isBeepingRef.current) {
        stopZeroApproachBeep();
        isBeepingRef.current = false;
      }
      return;
    }

    // Only check in center finding result state (shows distance-to-go)
    if (!isResultState(droState) || droCtx.stateDataType !== 'center-finding' || !droCtx.centerResult) {
      if (isBeepingRef.current) {
        stopZeroApproachBeep();
        isBeepingRef.current = false;
      }
      return;
    }

    // Calculate distance-to-go for each axis (in mm, then convert to inches)
    // BP DIST is always in inches, so we need to convert
    const center = droCtx.centerResult;
    const current = vMem.displayValues;
    
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
      distanceX > (bpDist + bpTolr) && 
      distanceY > (bpDist + bpTolr) && 
      distanceZ > (bpDist + bpTolr);
    
    // Start beeping if within threshold and not already beeping
    if (withinThreshold && !isBeepingRef.current) {
      void startZeroApproachBeep();
      isBeepingRef.current = true;
    }
    
    // Stop beeping if outside hysteresis zone and currently beeping
    if (outsideHysteresis && isBeepingRef.current) {
      stopZeroApproachBeep();
      isBeepingRef.current = false;
    }
    
    // Cleanup on unmount
    return () => {
      if (isBeepingRef.current) {
        stopZeroApproachBeep();
        isBeepingRef.current = false;
      }
    };
  }, [
    nvMem.zeroApproachEnabled,
    nvMem.bpDist,
    nvMem.bpTolr,
    droState,
    droCtx,
    vMem.displayValues,
  ]);
}
