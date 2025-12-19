/**
 * Grid Drilling Feature Reducer
 *
 * Handles grid drilling pattern generation with rectangular grids.
 * Implements US-020: Grid Drilling Pattern
 */

import type { FeatureReducer, DROStatePayload } from '../types';
import type { DROEventPayload } from '../droStateMachine';
import { INITIAL_GRID_DRILLING_DATA } from '../droStateMachine';

/**
 * Calculate all hole positions for a grid pattern.
 * 
 * @param startX - X coordinate of first hole
 * @param startY - Y coordinate of first hole
 * @param pitchX - Spacing in X direction
 * @param pitchY - Spacing in Y direction
 * @param angle - Grid rotation angle in degrees (0-359)
 * @param holesX - Number of holes in X direction (columns)
 * @param holesY - Number of holes in Y direction (rows)
 * @returns Array of hole positions {x, y}
 */
export function calculateGridPositions(
  startX: number,
  startY: number,
  pitchX: number,
  pitchY: number,
  angle: number,
  holesX: number,
  holesY: number
): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  const angleRad = (angle * Math.PI) / 180;
  
  // For each row (i) and column (j), calculate position
  for (let i = 0; i < holesY; i++) {
    for (let j = 0; j < holesX; j++) {
      // X = start_x + (j × pitch_x × cos(angle)) + (i × pitch_y × cos(angle + 90°))
      // Y = start_y + (j × pitch_x × sin(angle)) + (i × pitch_y × sin(angle + 90°))
      const x = startX + 
                j * pitchX * Math.cos(angleRad) + 
                i * pitchY * Math.cos(angleRad + Math.PI / 2);
      const y = startY + 
                j * pitchX * Math.sin(angleRad) + 
                i * pitchY * Math.sin(angleRad + Math.PI / 2);
      
      positions.push({ x, y });
    }
  }
  
  return positions;
}

/**
 * Parse input buffer value.
 * Returns null if buffer is empty or invalid.
 */
function parseInputValue(buffer: string): number | null {
  if (buffer === '') return null;
  const value = parseFloat(buffer);
  return isNaN(value) ? null : value;
}

/**
 * Grid drilling reducer - handles grid pattern generation workflow.
 */
export const gridDrillingReducer: FeatureReducer = (
  state: DROStatePayload,
  event: DROEventPayload
): DROStatePayload | null => {
  const { stateName, stateData, vMem } = state;

  // Handle BTN_GRID from idle state - start grid drilling
  if (stateName === 'idle' && event.eventName === 'BTN_GRID') {
    return {
      ...state,
      stateName: 'grid-drilling-start-x',
      stateData: INITIAL_GRID_DRILLING_DATA,
      vMem: { ...vMem, inputBuffer: '' },
    };
  }

  // Only handle grid drilling states from here
  if (!stateName.startsWith('grid-drilling-')) {
    return null;
  }

  // Ensure we have grid drilling data
  if (stateData.stateDataType !== 'grid-drilling') {
    return null;
  }

  const gridData = stateData;

  // Handle KEY_CLEAR - cancel and return to idle
  if (event.eventName === 'KEY_CLEAR') {
    return {
      ...state,
      stateName: 'idle',
      stateData: { stateDataType: 'none' },
      vMem: { ...vMem, inputBuffer: '' },
    };
  }

  // Handle KEY_ENTER - advance to next state
  if (event.eventName === 'KEY_ENTER') {
    const value = parseInputValue(vMem.inputBuffer);

    switch (stateName) {
      case 'grid-drilling-start-x':
        if (value === null) return state;
        return {
          ...state,
          stateName: 'grid-drilling-start-y',
          stateData: { ...gridData, startX: value },
          vMem: { ...vMem, inputBuffer: '' },
        };

      case 'grid-drilling-start-y':
        if (value === null) return state;
        return {
          ...state,
          stateName: 'grid-drilling-pitch-x',
          stateData: { ...gridData, startY: value },
          vMem: { ...vMem, inputBuffer: '' },
        };

      case 'grid-drilling-pitch-x':
        if (value === null || value <= 0) return state;
        return {
          ...state,
          stateName: 'grid-drilling-pitch-y',
          stateData: { ...gridData, pitchX: value },
          vMem: { ...vMem, inputBuffer: '' },
        };

      case 'grid-drilling-pitch-y':
        if (value === null || value <= 0) return state;
        return {
          ...state,
          stateName: 'grid-drilling-angle',
          stateData: { ...gridData, pitchY: value },
          vMem: { ...vMem, inputBuffer: '' },
        };

      case 'grid-drilling-angle':
        if (value === null || value < 0 || value >= 360) return state;
        return {
          ...state,
          stateName: 'grid-drilling-holes-x',
          stateData: { ...gridData, angle: value },
          vMem: { ...vMem, inputBuffer: '' },
        };

      case 'grid-drilling-holes-x':
        if (value === null || value < 1 || !Number.isInteger(value)) return state;
        return {
          ...state,
          stateName: 'grid-drilling-holes-y',
          stateData: { ...gridData, holesX: Math.floor(value) },
          vMem: { ...vMem, inputBuffer: '' },
        };

      case 'grid-drilling-holes-y': {
        if (value === null || value < 1 || !Number.isInteger(value)) return state;
        
        // Calculate all hole positions
        const holesY = Math.floor(value);
        if (!gridData.startX || !gridData.startY || !gridData.pitchX || !gridData.pitchY || 
            gridData.angle === null || !gridData.holesX) {
          return state;
        }
        
        const positions = calculateGridPositions(
          gridData.startX,
          gridData.startY,
          gridData.pitchX,
          gridData.pitchY,
          gridData.angle,
          gridData.holesX,
          holesY
        );

        return {
          ...state,
          stateName: 'grid-drilling-navigate',
          stateData: {
            ...gridData,
            holesY,
            holePositions: positions,
            currentHole: 1,
          },
          vMem: { ...vMem, inputBuffer: '' },
        };
      }

      default:
        return state;
    }
  }

  // Handle navigation in grid-drilling-navigate state
  if (stateName === 'grid-drilling-navigate') {
    const totalHoles = gridData.holePositions.length;

    // KEY_6_RIGHT - next hole
    if (event.eventName === 'KEY_6_RIGHT') {
      const nextHole = gridData.currentHole < totalHoles ? gridData.currentHole + 1 : 1;
      return {
        ...state,
        stateData: { ...gridData, currentHole: nextHole },
      };
    }

    // KEY_4_LEFT - previous hole
    if (event.eventName === 'KEY_4_LEFT') {
      const prevHole = gridData.currentHole > 1 ? gridData.currentHole - 1 : totalHoles;
      return {
        ...state,
        stateData: { ...gridData, currentHole: prevHole },
      };
    }

    // KEY_2_DOWN - jump to specific hole number
    if (event.eventName === 'KEY_2_DOWN') {
      const holeNum = parseInputValue(vMem.inputBuffer);
      if (holeNum !== null && holeNum >= 1 && holeNum <= totalHoles && Number.isInteger(holeNum)) {
        return {
          ...state,
          stateData: { ...gridData, currentHole: Math.floor(holeNum) },
          vMem: { ...vMem, inputBuffer: '' },
        };
      }
      return state;
    }
  }

  // No handler for this event
  return null;
};
