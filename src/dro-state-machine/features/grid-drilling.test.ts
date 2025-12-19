/**
 * Grid Drilling Feature Integration Tests
 * 
 * Tests the complete workflow for grid drilling pattern generation.
 */

import { describe, test, expect } from 'vitest';
import { gridDrillingReducer, calculateGridPositions } from './grid-drilling';
import type { DROStatePayload } from '../types';
import { INITIAL_VOLATILE_MEMORY_STATE } from '../../types/volatileMemory';
import { INITIAL_GRID_DRILLING_DATA } from '../droStateMachine';

// Mock context for testing
const mockContext = {
  millState: {
    connected: false,
    position: { x: 0, y: 0, z: 0 },
    probe: { pinState: '', triggered: false, active: false },
    controllerType: 'mock' as const,
  },
  nvMem: {
    defaultUnit: 'inch' as const,
    beepEnabled: true,
    precision: 4,
    bootMessageMode: 'show' as const,
  },
};

describe('Grid Drilling Feature', () => {
  describe('calculateGridPositions', () => {
    test('calculates 3x3 grid at 0 degrees', () => {
      const positions = calculateGridPositions(0, 0, 1, 1, 0, 3, 3);
      
      expect(positions).toHaveLength(9);
      // Row 0
      expect(positions[0]?.x).toBeCloseTo(0);
      expect(positions[0]?.y).toBeCloseTo(0);
      expect(positions[1]?.x).toBeCloseTo(1);
      expect(positions[1]?.y).toBeCloseTo(0);
      expect(positions[2]?.x).toBeCloseTo(2);
      expect(positions[2]?.y).toBeCloseTo(0);
      // Row 1
      expect(positions[3]?.x).toBeCloseTo(0);
      expect(positions[3]?.y).toBeCloseTo(1);
      expect(positions[4]?.x).toBeCloseTo(1);
      expect(positions[4]?.y).toBeCloseTo(1);
      expect(positions[5]?.x).toBeCloseTo(2);
      expect(positions[5]?.y).toBeCloseTo(1);
      // Row 2
      expect(positions[6]?.x).toBeCloseTo(0);
      expect(positions[6]?.y).toBeCloseTo(2);
      expect(positions[7]?.x).toBeCloseTo(1);
      expect(positions[7]?.y).toBeCloseTo(2);
      expect(positions[8]?.x).toBeCloseTo(2);
      expect(positions[8]?.y).toBeCloseTo(2);
    });

    test('calculates 2x3 grid with offset start position', () => {
      const positions = calculateGridPositions(0.5, 0.25, 0.35, 0.35, 0, 2, 3);
      
      expect(positions).toHaveLength(6);
      // Row 0
      expect(positions[0]?.x).toBeCloseTo(0.5);
      expect(positions[0]?.y).toBeCloseTo(0.25);
      expect(positions[1]?.x).toBeCloseTo(0.85);
      expect(positions[1]?.y).toBeCloseTo(0.25);
      // Row 1
      expect(positions[2]?.x).toBeCloseTo(0.5);
      expect(positions[2]?.y).toBeCloseTo(0.6);
    });

    test('calculates rotated grid at 45 degrees', () => {
      const positions = calculateGridPositions(0, 0, 1, 1, 45, 2, 2);
      
      expect(positions).toHaveLength(4);
      const cos45 = Math.cos(Math.PI / 4);
      const sin45 = Math.sin(Math.PI / 4);
      
      // Position (0,0) - first hole
      expect(positions[0]?.x).toBeCloseTo(0);
      expect(positions[0]?.y).toBeCloseTo(0);
      
      // Position (1,0) - second hole (moved in X direction)
      expect(positions[1]?.x).toBeCloseTo(cos45);
      expect(positions[1]?.y).toBeCloseTo(sin45);
      
      // Position (0,1) - third hole (moved in Y direction)
      expect(positions[2]?.x).toBeCloseTo(-sin45);
      expect(positions[2]?.y).toBeCloseTo(cos45);
      
      // Position (1,1) - fourth hole
      expect(positions[3]?.x).toBeCloseTo(cos45 - sin45);
      expect(positions[3]?.y).toBeCloseTo(sin45 + cos45);
    });

    test('calculates grid at 90 degrees (vertical)', () => {
      const positions = calculateGridPositions(0, 0, 1, 1, 90, 3, 2);
      
      expect(positions).toHaveLength(6);
      // At 90 degrees, X direction becomes vertical up, Y direction becomes horizontal left
      expect(positions[0]?.x).toBeCloseTo(0);
      expect(positions[0]?.y).toBeCloseTo(0);
      expect(positions[1]?.x).toBeCloseTo(0);
      expect(positions[1]?.y).toBeCloseTo(1);
    });
  });

  describe('State machine transitions', () => {
    test('BTN_GRID from idle starts grid drilling', () => {
      const state: DROStatePayload = {
        stateName: 'idle',
        stateData: { stateDataType: 'none' },
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
      };

      const result = gridDrillingReducer(state, { eventName: 'BTN_GRID' }, mockContext);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('grid-drilling-start-x');
      expect(result?.stateData.stateDataType).toBe('grid-drilling');
      expect(result?.vMem.inputBuffer).toBe('');
    });

    test('enters start X coordinate', () => {
      const state: DROStatePayload = {
        stateName: 'grid-drilling-start-x',
        stateData: INITIAL_GRID_DRILLING_DATA,
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '0.5' },
      };

      const result = gridDrillingReducer(state, { eventName: 'KEY_ENTER' }, mockContext);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('grid-drilling-start-y');
      if (result?.stateData.stateDataType === 'grid-drilling') {
        expect(result.stateData.startX).toBe(0.5);
      }
    });

    test('enters start Y coordinate', () => {
      const state: DROStatePayload = {
        stateName: 'grid-drilling-start-y',
        stateData: { ...INITIAL_GRID_DRILLING_DATA, startX: 0.5 },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '0.25' },
      };

      const result = gridDrillingReducer(state, { eventName: 'KEY_ENTER' }, mockContext);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('grid-drilling-pitch-x');
      if (result?.stateData.stateDataType === 'grid-drilling') {
        expect(result.stateData.startY).toBe(0.25);
      }
    });

    test('enters pitch X', () => {
      const state: DROStatePayload = {
        stateName: 'grid-drilling-pitch-x',
        stateData: { ...INITIAL_GRID_DRILLING_DATA, startX: 0.5, startY: 0.25 },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '0.35' },
      };

      const result = gridDrillingReducer(state, { eventName: 'KEY_ENTER' }, mockContext);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('grid-drilling-pitch-y');
      if (result?.stateData.stateDataType === 'grid-drilling') {
        expect(result.stateData.pitchX).toBe(0.35);
      }
    });

    test('enters pitch Y', () => {
      const state: DROStatePayload = {
        stateName: 'grid-drilling-pitch-y',
        stateData: { ...INITIAL_GRID_DRILLING_DATA, startX: 0.5, startY: 0.25, pitchX: 0.35 },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '0.35' },
      };

      const result = gridDrillingReducer(state, { eventName: 'KEY_ENTER' }, mockContext);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('grid-drilling-angle');
      if (result?.stateData.stateDataType === 'grid-drilling') {
        expect(result.stateData.pitchY).toBe(0.35);
      }
    });

    test('enters angle', () => {
      const state: DROStatePayload = {
        stateName: 'grid-drilling-angle',
        stateData: { 
          ...INITIAL_GRID_DRILLING_DATA, 
          startX: 0.5, 
          startY: 0.25, 
          pitchX: 0.35,
          pitchY: 0.35,
        },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '45' },
      };

      const result = gridDrillingReducer(state, { eventName: 'KEY_ENTER' }, mockContext);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('grid-drilling-holes-x');
      if (result?.stateData.stateDataType === 'grid-drilling') {
        expect(result.stateData.angle).toBe(45);
      }
    });

    test('enters holes X', () => {
      const state: DROStatePayload = {
        stateName: 'grid-drilling-holes-x',
        stateData: { 
          ...INITIAL_GRID_DRILLING_DATA, 
          startX: 0.5, 
          startY: 0.25, 
          pitchX: 0.35,
          pitchY: 0.35,
          angle: 45,
        },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '5' },
      };

      const result = gridDrillingReducer(state, { eventName: 'KEY_ENTER' }, mockContext);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('grid-drilling-holes-y');
      if (result?.stateData.stateDataType === 'grid-drilling') {
        expect(result.stateData.holesX).toBe(5);
      }
    });

    test('enters holes Y and calculates positions', () => {
      const state: DROStatePayload = {
        stateName: 'grid-drilling-holes-y',
        stateData: { 
          ...INITIAL_GRID_DRILLING_DATA, 
          startX: 0.5, 
          startY: 0.25, 
          pitchX: 0.35,
          pitchY: 0.35,
          angle: 0,
          holesX: 3,
        },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '3' },
      };

      const result = gridDrillingReducer(state, { eventName: 'KEY_ENTER' }, mockContext);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('grid-drilling-navigate');
      if (result?.stateData.stateDataType === 'grid-drilling') {
        expect(result.stateData.holesY).toBe(3);
        expect(result.stateData.holePositions).toHaveLength(9); // 3x3 = 9 holes
        expect(result.stateData.currentHole).toBe(1);
      }
    });

    test('accepts 0 as start coordinate', () => {
      const state: DROStatePayload = {
        stateName: 'grid-drilling-start-x',
        stateData: INITIAL_GRID_DRILLING_DATA,
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '0' },
      };

      const result = gridDrillingReducer(state, { eventName: 'KEY_ENTER' }, mockContext);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('grid-drilling-start-y');
      if (result?.stateData.stateDataType === 'grid-drilling') {
        expect(result.stateData.startX).toBe(0);
      }
    });

    test('accepts 0 as angle', () => {
      const state: DROStatePayload = {
        stateName: 'grid-drilling-angle',
        stateData: { 
          ...INITIAL_GRID_DRILLING_DATA, 
          startX: 0, 
          startY: 0,
          pitchX: 1,
          pitchY: 1,
        },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '0' },
      };

      const result = gridDrillingReducer(state, { eventName: 'KEY_ENTER' }, mockContext);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('grid-drilling-holes-x');
      if (result?.stateData.stateDataType === 'grid-drilling') {
        expect(result.stateData.angle).toBe(0);
      }
    });

    test('navigates to next hole with KEY_6_RIGHT', () => {
      const positions = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
      ];
      
      const state: DROStatePayload = {
        stateName: 'grid-drilling-navigate',
        stateData: { 
          ...INITIAL_GRID_DRILLING_DATA,
          startX: 0,
          startY: 0,
          pitchX: 1,
          pitchY: 1,
          angle: 0,
          holesX: 3,
          holesY: 1,
          holePositions: positions,
          currentHole: 1,
        },
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
      };

      const result = gridDrillingReducer(state, { eventName: 'KEY_6_RIGHT' }, mockContext);

      expect(result).not.toBeNull();
      if (result?.stateData.stateDataType === 'grid-drilling') {
        expect(result.stateData.currentHole).toBe(2);
      }
    });

    test('navigates to previous hole with KEY_4_LEFT', () => {
      const positions = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
      ];
      
      const state: DROStatePayload = {
        stateName: 'grid-drilling-navigate',
        stateData: { 
          ...INITIAL_GRID_DRILLING_DATA,
          startX: 0,
          startY: 0,
          pitchX: 1,
          pitchY: 1,
          angle: 0,
          holesX: 3,
          holesY: 1,
          holePositions: positions,
          currentHole: 2,
        },
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
      };

      const result = gridDrillingReducer(state, { eventName: 'KEY_4_LEFT' }, mockContext);

      expect(result).not.toBeNull();
      if (result?.stateData.stateDataType === 'grid-drilling') {
        expect(result.stateData.currentHole).toBe(1);
      }
    });

    test('wraps to first hole when advancing past last hole', () => {
      const positions = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
      ];
      
      const state: DROStatePayload = {
        stateName: 'grid-drilling-navigate',
        stateData: { 
          ...INITIAL_GRID_DRILLING_DATA,
          startX: 0,
          startY: 0,
          pitchX: 1,
          pitchY: 1,
          angle: 0,
          holesX: 3,
          holesY: 1,
          holePositions: positions,
          currentHole: 3,
        },
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
      };

      const result = gridDrillingReducer(state, { eventName: 'KEY_6_RIGHT' }, mockContext);

      expect(result).not.toBeNull();
      if (result?.stateData.stateDataType === 'grid-drilling') {
        expect(result.stateData.currentHole).toBe(1);
      }
    });

    test('KEY_CLEAR cancels and returns to idle', () => {
      const state: DROStatePayload = {
        stateName: 'grid-drilling-start-x',
        stateData: INITIAL_GRID_DRILLING_DATA,
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
      };

      const result = gridDrillingReducer(state, { eventName: 'KEY_CLEAR' }, mockContext);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('idle');
      expect(result?.stateData.stateDataType).toBe('none');
    });

    test('rejects negative pitch values', () => {
      const state: DROStatePayload = {
        stateName: 'grid-drilling-pitch-x',
        stateData: { ...INITIAL_GRID_DRILLING_DATA, startX: 0, startY: 0 },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '-1' },
      };

      const result = gridDrillingReducer(state, { eventName: 'KEY_ENTER' }, mockContext);

      expect(result).not.toBeNull();
      // Should stay in same state
      expect(result?.stateName).toBe('grid-drilling-pitch-x');
    });

    test('rejects angle >= 360 degrees', () => {
      const state: DROStatePayload = {
        stateName: 'grid-drilling-angle',
        stateData: { 
          ...INITIAL_GRID_DRILLING_DATA, 
          startX: 0, 
          startY: 0,
          pitchX: 1,
          pitchY: 1,
        },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '360' },
      };

      const result = gridDrillingReducer(state, { eventName: 'KEY_ENTER' }, mockContext);

      expect(result).not.toBeNull();
      // Should stay in same state
      expect(result?.stateName).toBe('grid-drilling-angle');
    });

    test('rejects non-integer hole counts', () => {
      const state: DROStatePayload = {
        stateName: 'grid-drilling-holes-x',
        stateData: { 
          ...INITIAL_GRID_DRILLING_DATA, 
          startX: 0, 
          startY: 0,
          pitchX: 1,
          pitchY: 1,
          angle: 0,
        },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '3.5' },
      };

      const result = gridDrillingReducer(state, { eventName: 'KEY_ENTER' }, mockContext);

      expect(result).not.toBeNull();
      // Should stay in same state
      expect(result?.stateName).toBe('grid-drilling-holes-x');
    });
  });
});
