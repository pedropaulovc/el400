/**
 * Bolt Circle (PCD) Feature Reducer
 *
 * Handles bolt circle drilling pattern generation for full circles.
 * Supports:
 * - CIRCLE/ARC mode selection (toggle with key 6)
 * - Parameter entry: center X/Y, radius, angle, hole count
 * - Distance-to-go navigation between holes
 * - Hole navigation: 6=next, 4=prev, 8=show current, 2=jump to specific
 */

import type { FeatureReducer } from '../types';
import {
  INITIAL_DRO_STATE_DATA,
  INITIAL_BOLT_CIRCLE_DATA,
  isBoltCircleActive,
} from '../droStateMachine';
import { getBufferValue } from './keypad';

export const boltCircleReducer: FeatureReducer = (statePayload, eventPayload, _context) => {
  const { stateName: state, stateData: data, vMem } = statePayload;
  const { eventName } = eventPayload;

  // Handle entering PCD mode from idle
  if (state === 'idle' && eventName === 'BTN_PCD') {
    // Must be in ABS mode to run macro
    if (vMem.mode !== 'abs') {
      return null; // Ignore if not in ABS mode
    }
    return {
      stateName: 'pcd-menu-select',
      stateData: INITIAL_BOLT_CIRCLE_DATA,
      vMem,
    };
  }

  // Handle bolt circle states
  if (!isBoltCircleActive(state)) return null;

  const boltData = data.stateDataType === 'bolt-circle' ? data : INITIAL_BOLT_CIRCLE_DATA;

  // KEY_CLEAR exits the macro at any point
  if (eventName === 'KEY_CLEAR') {
    return { stateName: 'idle', stateData: INITIAL_DRO_STATE_DATA, vMem };
  }

  switch (state) {
    case 'pcd-menu-select': {
      // Toggle between CIRCLE and ARC with key 6
      if (eventName === 'KEY_6_RIGHT') {
        const newMode = boltData.pcdMode === 'CIRCLE' ? 'ARC' : 'CIRCLE';
        return {
          stateName: 'pcd-menu-select',
          stateData: { ...boltData, pcdMode: newMode },
          vMem,
        };
      }
      // Press ENT to confirm selection
      if (eventName === 'KEY_ENTER') {
        if (boltData.pcdMode === 'CIRCLE') {
          // For now, only CIRCLE mode is implemented
          return {
            stateName: 'pcd-circle-center-x',
            stateData: boltData,
            vMem: { ...vMem, inputBuffer: '' },
          };
        }
        // ARC mode not yet implemented
        return { stateName: 'idle', stateData: INITIAL_DRO_STATE_DATA, vMem };
      }
      return statePayload;
    }

    case 'pcd-circle-center-x': {
      // Enter X coordinate of center
      if (eventName === 'KEY_ENTER') {
        const value = getBufferValue(vMem.inputBuffer);
        if (value === null) return null;
        return {
          stateName: 'pcd-circle-center-y',
          stateData: { ...boltData, centerX: value },
          vMem: { ...vMem, inputBuffer: '' },
        };
      }
      return statePayload;
    }

    case 'pcd-circle-center-y': {
      // Enter Y coordinate of center
      if (eventName === 'KEY_ENTER') {
        const value = getBufferValue(vMem.inputBuffer);
        if (value === null) return null;
        return {
          stateName: 'pcd-circle-radius',
          stateData: { ...boltData, centerY: value },
          vMem: { ...vMem, inputBuffer: '' },
        };
      }
      return statePayload;
    }

    case 'pcd-circle-radius': {
      // Enter radius of circle
      if (eventName === 'KEY_ENTER') {
        const value = getBufferValue(vMem.inputBuffer);
        if (value === null || value <= 0) return null;
        return {
          stateName: 'pcd-circle-angle',
          stateData: { ...boltData, radius: value },
          vMem: { ...vMem, inputBuffer: '' },
        };
      }
      return statePayload;
    }

    case 'pcd-circle-angle': {
      // Enter starting angle (0-359 degrees)
      if (eventName === 'KEY_ENTER') {
        const value = getBufferValue(vMem.inputBuffer);
        if (value === null) return null;
        // Normalize angle to 0-359 range
        const normalizedAngle = ((value % 360) + 360) % 360;
        return {
          stateName: 'pcd-circle-holes',
          stateData: { ...boltData, startAngle: normalizedAngle },
          vMem: { ...vMem, inputBuffer: '' },
        };
      }
      return statePayload;
    }

    case 'pcd-circle-holes': {
      // Enter number of holes (2-999)
      if (eventName === 'KEY_ENTER') {
        const value = getBufferValue(vMem.inputBuffer);
        if (value === null || value < 2 || value > 999) return null;
        
        // Switch to INC mode for distance-to-go display
        const newVMem = {
          ...vMem,
          mode: 'inc' as const,
          inputBuffer: '',
        };
        
        return {
          stateName: 'pcd-circle-navigate',
          stateData: { ...boltData, holeCount: Math.floor(value), currentHole: 1 },
          vMem: newVMem,
        };
      }
      return statePayload;
    }

    case 'pcd-circle-navigate': {
      // All parameters are set, navigate between holes
      const { centerX, centerY, radius, startAngle, holeCount, currentHole } = boltData;
      
      if (centerX === null || centerY === null || radius === null || 
          startAngle === null || holeCount === null) {
        // Invalid state, return to idle
        return { stateName: 'idle', stateData: INITIAL_DRO_STATE_DATA, vMem };
      }

      // Key 6: Advance to next hole
      if (eventName === 'KEY_6_RIGHT') {
        const nextHole = currentHole >= holeCount ? 1 : currentHole + 1;
        return {
          stateName: 'pcd-circle-navigate',
          stateData: { ...boltData, currentHole: nextHole },
          vMem,
        };
      }

      // Key 4: Go to previous hole
      if (eventName === 'KEY_4_LEFT') {
        const prevHole = currentHole <= 1 ? holeCount : currentHole - 1;
        return {
          stateName: 'pcd-circle-navigate',
          stateData: { ...boltData, currentHole: prevHole },
          vMem,
        };
      }

      // Key 8: Show current hole number (no state change, just display update)
      if (eventName === 'KEY_8_UP') {
        // Just return current state, display will show hole number
        return statePayload;
      }

      // Key 2: Jump to specific hole
      if (eventName === 'KEY_2_DOWN') {
        // Enter hole number selection mode
        return {
          stateName: 'pcd-circle-navigate',
          stateData: boltData,
          vMem: { ...vMem, inputBuffer: '' },
        };
      }

      // If there's a number in the buffer and user presses ENTER, jump to that hole
      if (eventName === 'KEY_ENTER' && vMem.inputBuffer !== '') {
        const targetHole = getBufferValue(vMem.inputBuffer);
        if (targetHole !== null && targetHole >= 1 && targetHole <= holeCount) {
          return {
            stateName: 'pcd-circle-navigate',
            stateData: { ...boltData, currentHole: Math.floor(targetHole) },
            vMem: { ...vMem, inputBuffer: '' },
          };
        }
        return null;
      }

      return statePayload;
    }

    default:
      return statePayload;
  }
};
