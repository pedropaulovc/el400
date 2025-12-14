/**
 * Hook for managing the power-on display sequence.
 * Shows model/version info briefly when the DRO starts up.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

export interface UsePowerOnSequenceReturn {
  /** Whether to show the power-on message */
  showPowerOnMessage: boolean;
  /** Dismiss the power-on message early (e.g., on button press) */
  dismissPowerOnMessage: () => void;
}

/**
 * Hook for managing the power-on display sequence.
 *
 * @param durationMs - How long to show the power-on message (default 1000ms)
 */
export function usePowerOnSequence(durationMs: number = 1000): UsePowerOnSequenceReturn {
  const powerOnTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check if we should bypass power-on (for tests or URL param)
  const shouldBypassPowerOn = useMemo(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const powerOnParam = params.get('powerOn');

      if (powerOnParam === 'force') {
        return false;
      }

      if (powerOnParam === 'skip') {
        return true;
      }
    }

    return import.meta.env.MODE === 'test';
  }, []);

  const [showPowerOnMessage, setShowPowerOnMessage] = useState(!shouldBypassPowerOn);

  useEffect(() => {
    if (!showPowerOnMessage) {
      return;
    }

    powerOnTimerRef.current = setTimeout(() => {
      setShowPowerOnMessage(false);
    }, durationMs);

    return () => {
      if (powerOnTimerRef.current) {
        clearTimeout(powerOnTimerRef.current);
        powerOnTimerRef.current = null;
      }
    };
  }, [showPowerOnMessage, durationMs]);

  const dismissPowerOnMessage = useCallback(() => {
    if (powerOnTimerRef.current) {
      clearTimeout(powerOnTimerRef.current);
      powerOnTimerRef.current = null;
    }
    setShowPowerOnMessage(false);
  }, []);

  return {
    showPowerOnMessage,
    dismissPowerOnMessage,
  };
}
