/**
 * Near-Zero Warning hook (US-024)
 *
 * Subscribes to the per-axis zero-approach state in the DRO store (derived from
 * the live readout via MILL_STATE_CHANGED) and plays the continuous warning beep
 * (AC24.3) for as long as ANY axis is within `BP DIST` of zero. The beep is a
 * synthesised tone distinct from the key-press click (AC24.8). Returns whether
 * the warning is currently active so the UI can render the visual indicator.
 */

import { useEffect } from 'react';
import { useZeroApproachActive } from '../stores/droStore';
import { playZeroApproachBeep } from '../utils/audio';

/** Interval (ms) between repeated warning beeps while inside the approach band. */
export const ZERO_APPROACH_BEEP_INTERVAL_MS = 400;

export function useZeroApproachWarning(): boolean {
  const active = useZeroApproachActive();

  useEffect(() => {
    if (!active) return;

    // Beep immediately on engaging, then repeat for the continuous alarm.
    void playZeroApproachBeep();
    const id = setInterval(() => {
      void playZeroApproachBeep();
    }, ZERO_APPROACH_BEEP_INTERVAL_MS);

    return () => {
      clearInterval(id);
    };
  }, [active]);

  return active;
}
