/**
 * Tests for Grid Drilling Feature Reducer (US-020)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { gridReducer, useGridIntro, GRID_INTRO_DURATION_MS } from './grid';
import { INITIAL_GRID_DATA, type DROStateName } from '../droStateMachine';
import { DEFAULT_TEST_CONTEXT } from '../test-utils';
import type { DROStatePayload } from '../types';
import { INITIAL_VOLATILE_MEMORY_STATE } from '../../../types/volatileMemory';
import { INITIAL_DISPLAY_STATE } from '../utils/displayComputation';

/** mm context for asserting raw mm storage with no conversion */
const mmContext = {
  ...DEFAULT_TEST_CONTEXT,
  nvMem: { ...DEFAULT_TEST_CONTEXT.nvMem, defaultUnit: 'mm' as const },
};

describe('gridReducer', () => {
  describe('non-grid states', () => {
    it('should return null for non-grid states', () => {
      const state: DROStatePayload = {
        stateName: 'idle',
        stateData: { stateDataType: 'none' },
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
        display: INITIAL_DISPLAY_STATE,
      };

      const result = gridReducer(state, { eventName: 'BTN_GRID' }, DEFAULT_TEST_CONTEXT);
      expect(result).toBeNull();
    });
  });

  describe('grid-intro state', () => {
    it('should transition to grid-start-x on GRID_INTRO_TIMEOUT', () => {
      const state: DROStatePayload = {
        stateName: 'grid-intro',
        stateData: INITIAL_GRID_DATA,
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, mode: 'abs' },
        display: { X: 'Grid', Y: 0, Z: '' },
      };

      const result = gridReducer(state, { eventName: 'GRID_INTRO_TIMEOUT' }, DEFAULT_TEST_CONTEXT);

      expect(result).not.toBeNull();
      expect(result?.stateName).toBe('grid-start-x');
      expect(result?.stateData.stateDataType).toBe('grid');
      // center-x style: X shows buffer (0), Y shows prompt
      expect(result?.display.X).toBe(0);
      expect(result?.display.Y).toBe('EntCnt0');
      expect(result?.display.Z).toBe('');
    });

    it('should ignore key input during intro', () => {
      const state: DROStatePayload = {
        stateName: 'grid-intro',
        stateData: INITIAL_GRID_DATA,
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
        display: { X: 'Grid', Y: 0, Z: '' },
      };

      const result = gridReducer(state, { eventName: 'KEY_5' }, DEFAULT_TEST_CONTEXT);
      expect(result).toBe(state);
    });

    it('should exit to idle with KEY_CLEAR from intro', () => {
      const state: DROStatePayload = {
        stateName: 'grid-intro',
        stateData: INITIAL_GRID_DATA,
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
        display: INITIAL_DISPLAY_STATE,
      };

      const result = gridReducer(state, { eventName: 'KEY_CLEAR' }, DEFAULT_TEST_CONTEXT);
      expect(result?.stateName).toBe('idle');
    });
  });

  describe('parameter entry flow', () => {
    it('should accept start X and advance to start Y', () => {
      const state: DROStatePayload = {
        stateName: 'grid-start-x',
        stateData: INITIAL_GRID_DATA,
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '12.7' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = gridReducer(state, { eventName: 'KEY_ENTER' }, mmContext);

      expect(result?.stateName).toBe('grid-start-y');
      if (result?.stateData.stateDataType === 'grid') {
        expect(result.stateData.startX).toBeCloseTo(12.7, 4);
      }
      expect(result?.vMem.inputBuffer).toBe('');
      expect(result?.display.X).toBe('EntCnt1');
      expect(result?.display.Y).toBe(0);
    });

    it('should convert start X from inches to mm', () => {
      const state: DROStatePayload = {
        stateName: 'grid-start-x',
        stateData: INITIAL_GRID_DATA,
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '0.5' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = gridReducer(state, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);
      if (result?.stateData.stateDataType === 'grid') {
        // 0.5 inch = 12.7mm
        expect(result.stateData.startX).toBeCloseTo(12.7, 4);
      }
    });

    it('should accept start Y and advance to pitch X', () => {
      const state: DROStatePayload = {
        stateName: 'grid-start-y',
        stateData: { ...INITIAL_GRID_DATA, startX: 0 },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '5' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = gridReducer(state, { eventName: 'KEY_ENTER' }, mmContext);

      expect(result?.stateName).toBe('grid-pitch-x');
      if (result?.stateData.stateDataType === 'grid') {
        expect(result.stateData.startY).toBeCloseTo(5, 4);
      }
      expect(result?.display.X).toBe('PItCh X');
      expect(result?.display.Y).toBe(0);
    });

    it('should accept pitch X and advance to pitch Y', () => {
      const state: DROStatePayload = {
        stateName: 'grid-pitch-x',
        stateData: { ...INITIAL_GRID_DATA, startX: 0, startY: 0 },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '10' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = gridReducer(state, { eventName: 'KEY_ENTER' }, mmContext);

      expect(result?.stateName).toBe('grid-pitch-y');
      if (result?.stateData.stateDataType === 'grid') {
        expect(result.stateData.pitchX).toBeCloseTo(10, 4);
      }
      expect(result?.display.X).toBe('PItCh Y');
    });

    it('should reject zero or negative pitch X', () => {
      const state: DROStatePayload = {
        stateName: 'grid-pitch-x',
        stateData: { ...INITIAL_GRID_DATA, startX: 0, startY: 0 },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '0' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = gridReducer(state, { eventName: 'KEY_ENTER' }, mmContext);
      expect(result).toBeNull();
    });

    it('should accept pitch Y and advance to angle', () => {
      const state: DROStatePayload = {
        stateName: 'grid-pitch-y',
        stateData: { ...INITIAL_GRID_DATA, startX: 0, startY: 0, pitchX: 10 },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '8' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = gridReducer(state, { eventName: 'KEY_ENTER' }, mmContext);

      expect(result?.stateName).toBe('grid-angle');
      if (result?.stateData.stateDataType === 'grid') {
        expect(result.stateData.pitchY).toBeCloseTo(8, 4);
      }
      expect(result?.display.X).toBe('AnGLE');
    });

    it('should reject zero or negative pitch Y', () => {
      const state: DROStatePayload = {
        stateName: 'grid-pitch-y',
        stateData: { ...INITIAL_GRID_DATA, startX: 0, startY: 0, pitchX: 10 },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '0' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = gridReducer(state, { eventName: 'KEY_ENTER' }, mmContext);
      expect(result).toBeNull();
    });

    it('should accept angle and advance to holes X', () => {
      const state: DROStatePayload = {
        stateName: 'grid-angle',
        stateData: { ...INITIAL_GRID_DATA, startX: 0, startY: 0, pitchX: 10, pitchY: 8 },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '45' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = gridReducer(state, { eventName: 'KEY_ENTER' }, mmContext);

      expect(result?.stateName).toBe('grid-holes-x');
      if (result?.stateData.stateDataType === 'grid') {
        expect(result.stateData.angle).toBe(45);
      }
      expect(result?.display.X).toBe('hoLE X');
    });

    it('should normalize angle to 0-359 range', () => {
      const state: DROStatePayload = {
        stateName: 'grid-angle',
        stateData: { ...INITIAL_GRID_DATA, startX: 0, startY: 0, pitchX: 10, pitchY: 8 },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '400' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = gridReducer(state, { eventName: 'KEY_ENTER' }, mmContext);
      if (result?.stateData.stateDataType === 'grid') {
        expect(result.stateData.angle).toBe(40);
      }
    });

    it('should accept holes X and advance to holes Y', () => {
      const state: DROStatePayload = {
        stateName: 'grid-holes-x',
        stateData: { ...INITIAL_GRID_DATA, startX: 0, startY: 0, pitchX: 10, pitchY: 8, angle: 0 },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '5' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = gridReducer(state, { eventName: 'KEY_ENTER' }, mmContext);

      expect(result?.stateName).toBe('grid-holes-y');
      if (result?.stateData.stateDataType === 'grid') {
        expect(result.stateData.holesX).toBe(5);
      }
      expect(result?.display.X).toBe('hoLE Y');
    });

    it('should reject holes X less than 1', () => {
      const state: DROStatePayload = {
        stateName: 'grid-holes-x',
        stateData: { ...INITIAL_GRID_DATA, startX: 0, startY: 0, pitchX: 10, pitchY: 8, angle: 0 },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '0' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = gridReducer(state, { eventName: 'KEY_ENTER' }, mmContext);
      expect(result).toBeNull();
    });

    it('should accept holes Y, switch to INC, and enter navigate', () => {
      const state: DROStatePayload = {
        stateName: 'grid-holes-y',
        stateData: {
          ...INITIAL_GRID_DATA,
          startX: 0,
          startY: 0,
          pitchX: 10,
          pitchY: 8,
          angle: 0,
          holesX: 5,
        },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '5', mode: 'abs' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = gridReducer(state, { eventName: 'KEY_ENTER' }, mmContext);

      expect(result?.stateName).toBe('grid-navigate');
      expect(result?.vMem.mode).toBe('inc');
      if (result?.stateData.stateDataType === 'grid') {
        expect(result.stateData.holesY).toBe(5);
        expect(result.stateData.currentHole).toBe(1);
      }
    });

    it('should reject holes Y greater than 99', () => {
      const state: DROStatePayload = {
        stateName: 'grid-holes-y',
        stateData: {
          ...INITIAL_GRID_DATA,
          startX: 0,
          startY: 0,
          pitchX: 10,
          pitchY: 8,
          angle: 0,
          holesX: 5,
        },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '100' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = gridReducer(state, { eventName: 'KEY_ENTER' }, mmContext);
      expect(result).toBeNull();
    });

    it('should floor fractional holes counts', () => {
      const state: DROStatePayload = {
        stateName: 'grid-holes-x',
        stateData: { ...INITIAL_GRID_DATA, startX: 0, startY: 0, pitchX: 10, pitchY: 8, angle: 0 },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '3.9' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = gridReducer(state, { eventName: 'KEY_ENTER' }, mmContext);
      if (result?.stateData.stateDataType === 'grid') {
        expect(result.stateData.holesX).toBe(3);
      }
    });

    it('should append digit, decimal and sign to buffer in parameter entry', () => {
      const base: DROStatePayload = {
        stateName: 'grid-start-x',
        stateData: INITIAL_GRID_DATA,
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '1' },
        display: { X: 1, Y: 'EntCnt0', Z: '' },
      };

      const digit = gridReducer(base, { eventName: 'KEY_5' }, mmContext);
      expect(digit?.vMem.inputBuffer).toBe('15');

      const decimal = gridReducer(base, { eventName: 'KEY_DECIMAL' }, mmContext);
      expect(decimal?.vMem.inputBuffer).toBe('1.');

      const sign = gridReducer(base, { eventName: 'KEY_SIGN' }, mmContext);
      expect(sign?.vMem.inputBuffer).toBe('-1');
    });
  });

  describe('total holes (AC20.9)', () => {
    it('should produce holesX * holesY holes', () => {
      const state: DROStatePayload = {
        stateName: 'grid-holes-y',
        stateData: {
          ...INITIAL_GRID_DATA,
          startX: 0,
          startY: 0,
          pitchX: 10,
          pitchY: 8,
          angle: 0,
          holesX: 5,
        },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '5' },
        display: INITIAL_DISPLAY_STATE,
      };

      const result = gridReducer(state, { eventName: 'KEY_ENTER' }, mmContext);
      // Navigate forward through all holes and back to first => 25 total
      let cur = result!;
      let count = 1;
      while (count < 100) {
        const next = gridReducer(cur, { eventName: 'KEY_6_RIGHT' }, mmContext)!;
        if (next.stateData.stateDataType === 'grid' && next.stateData.currentHole === 1) {
          break;
        }
        count++;
        cur = next;
      }
      expect(count).toBe(25);
    });
  });

  describe('hole positions (AC20.10, AC20.11, AC20.12)', () => {
    function navigateState(over: Record<string, unknown> = {}): DROStatePayload {
      return {
        stateName: 'grid-navigate',
        stateData: {
          ...INITIAL_GRID_DATA,
          startX: 0,
          startY: 0,
          pitchX: 10,
          pitchY: 8,
          angle: 0,
          holesX: 3,
          holesY: 3,
          currentHole: 1,
          ...over,
        },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, mode: 'inc' },
        display: INITIAL_DISPLAY_STATE,
      };
    }

    it('axis-aligned grid at 0 degrees: hole 2 is one pitch X over (AC20.12)', () => {
      // Hole 1 at (0,0), hole 2 at (pitchX, 0) = (10, 0)
      const state = navigateState({ currentHole: 2 });
      const result = gridReducer(state, { eventName: 'MILL_STATE_CHANGED' }, mmContext);
      // distance-to-go from origin (0,0): X=10, Y=0
      expect(result?.display.X).toBeCloseTo(10, 3);
      expect(result?.display.Y).toBeCloseTo(0, 3);
    });

    it('axis-aligned grid: hole 4 (start of row 2) is one pitch Y up (AC20.11)', () => {
      // 3x3 grid, row-major. Hole 4 = row 1, col 0 => (0, pitchY) = (0, 8)
      const state = navigateState({ currentHole: 4 });
      const result = gridReducer(state, { eventName: 'MILL_STATE_CHANGED' }, mmContext);
      expect(result?.display.X).toBeCloseTo(0, 3);
      expect(result?.display.Y).toBeCloseTo(8, 3);
    });

    it('rotated grid at 45 degrees (AC20.10)', () => {
      // pitchX = pitchY = 1mm to make numbers clean, start (0,0)
      // Hole 2 (row 0, col 1): X = cos45 = 0.7071, Y = sin45 = 0.7071
      const col1 = navigateState({ pitchX: 1, pitchY: 1, angle: 45, currentHole: 2 });
      const r1 = gridReducer(col1, { eventName: 'MILL_STATE_CHANGED' }, mmContext);
      expect(r1?.display.X).toBeCloseTo(0.7071, 3);
      expect(r1?.display.Y).toBeCloseTo(0.7071, 3);

      // Hole 4 (row 1, col 0): X = cos(135) = -0.7071, Y = sin(135) = 0.7071
      const row1 = navigateState({ pitchX: 1, pitchY: 1, angle: 45, currentHole: 4 });
      const r2 = gridReducer(row1, { eventName: 'MILL_STATE_CHANGED' }, mmContext);
      expect(r2?.display.X).toBeCloseTo(-0.7071, 3);
      expect(r2?.display.Y).toBeCloseTo(0.7071, 3);
    });
  });

  describe('hole navigation', () => {
    const navState: DROStatePayload = {
      stateName: 'grid-navigate',
      stateData: {
        ...INITIAL_GRID_DATA,
        startX: 0,
        startY: 0,
        pitchX: 10,
        pitchY: 8,
        angle: 0,
        holesX: 5,
        holesY: 5,
        currentHole: 1,
      },
      vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, mode: 'inc' },
      display: INITIAL_DISPLAY_STATE,
    };

    it('advances to next hole with KEY_6_RIGHT', () => {
      const result = gridReducer(navState, { eventName: 'KEY_6_RIGHT' }, mmContext);
      if (result?.stateData.stateDataType === 'grid') {
        expect(result.stateData.currentHole).toBe(2);
      }
    });

    it('wraps to hole 1 from last hole with KEY_6_RIGHT', () => {
      const last: DROStatePayload = {
        ...navState,
        stateData: { ...(navState.stateData as typeof INITIAL_GRID_DATA), currentHole: 25 },
      };
      const result = gridReducer(last, { eventName: 'KEY_6_RIGHT' }, mmContext);
      if (result?.stateData.stateDataType === 'grid') {
        expect(result.stateData.currentHole).toBe(1);
      }
    });

    it('goes to previous hole with KEY_4_LEFT', () => {
      const hole2: DROStatePayload = {
        ...navState,
        stateData: { ...(navState.stateData as typeof INITIAL_GRID_DATA), currentHole: 2 },
      };
      const result = gridReducer(hole2, { eventName: 'KEY_4_LEFT' }, mmContext);
      if (result?.stateData.stateDataType === 'grid') {
        expect(result.stateData.currentHole).toBe(1);
      }
    });

    it('wraps to last hole from hole 1 with KEY_4_LEFT', () => {
      const result = gridReducer(navState, { eventName: 'KEY_4_LEFT' }, mmContext);
      if (result?.stateData.stateDataType === 'grid') {
        expect(result.stateData.currentHole).toBe(25);
      }
    });

    it('shows current hole number in buffer with KEY_8_UP', () => {
      const result = gridReducer(navState, { eventName: 'KEY_8_UP' }, mmContext);
      expect(result?.vMem.inputBuffer).toBe('1');
    });

    it('clears buffer with KEY_2_DOWN', () => {
      const buffered: DROStatePayload = {
        ...navState,
        vMem: { ...navState.vMem, inputBuffer: '7' },
      };
      const result = gridReducer(buffered, { eventName: 'KEY_2_DOWN' }, mmContext);
      expect(result?.vMem.inputBuffer).toBe('');
    });

    it('jumps to specific hole with buffered number and ENTER', () => {
      const jump: DROStatePayload = {
        ...navState,
        vMem: { ...navState.vMem, inputBuffer: '10' },
      };
      const result = gridReducer(jump, { eventName: 'KEY_ENTER' }, mmContext);
      if (result?.stateData.stateDataType === 'grid') {
        expect(result.stateData.currentHole).toBe(10);
      }
    });

    it('rejects jump out of range', () => {
      const jump: DROStatePayload = {
        ...navState,
        vMem: { ...navState.vMem, inputBuffer: '26' },
      };
      const result = gridReducer(jump, { eventName: 'KEY_ENTER' }, mmContext);
      expect(result).toBeNull();
    });

    it('accepts digit input in navigate state', () => {
      const result = gridReducer(navState, { eventName: 'KEY_3' }, mmContext);
      expect(result?.vMem.inputBuffer).toBe('3');
    });

    it('exits to idle when navigate state has missing holes count', () => {
      const broken: DROStatePayload = {
        stateName: 'grid-navigate',
        stateData: INITIAL_GRID_DATA,
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
        display: INITIAL_DISPLAY_STATE,
      };
      const result = gridReducer(broken, { eventName: 'KEY_6_RIGHT' }, mmContext);
      expect(result?.stateName).toBe('idle');
    });
  });

  describe('exiting grid mode', () => {
    it('exits to idle with KEY_CLEAR when buffer empty', () => {
      const state: DROStatePayload = {
        stateName: 'grid-pitch-x',
        stateData: { ...INITIAL_GRID_DATA, startX: 0, startY: 0 },
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
        display: INITIAL_DISPLAY_STATE,
      };
      const result = gridReducer(state, { eventName: 'KEY_CLEAR' }, mmContext);
      expect(result?.stateName).toBe('idle');
    });

    it('erases last digit with KEY_CLEAR when buffer has content', () => {
      const state: DROStatePayload = {
        stateName: 'grid-pitch-x',
        stateData: { ...INITIAL_GRID_DATA, startX: 0, startY: 0 },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '123' },
        display: INITIAL_DISPLAY_STATE,
      };
      const result = gridReducer(state, { eventName: 'KEY_CLEAR' }, mmContext);
      expect(result?.stateName).toBe('grid-pitch-x');
      expect(result?.vMem.inputBuffer).toBe('12');
    });

    it('restores ABS mode when exiting from navigate', () => {
      const state: DROStatePayload = {
        stateName: 'grid-navigate',
        stateData: {
          ...INITIAL_GRID_DATA,
          startX: 0,
          startY: 0,
          pitchX: 10,
          pitchY: 8,
          angle: 0,
          holesX: 3,
          holesY: 3,
          currentHole: 2,
        },
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, mode: 'inc' },
        display: INITIAL_DISPLAY_STATE,
      };
      const result = gridReducer(state, { eventName: 'KEY_CLEAR' }, mmContext);
      expect(result?.stateName).toBe('idle');
      expect(result?.vMem.mode).toBe('abs');
    });
  });

  describe('edge cases', () => {
    it('returns null for unhandled event in start-x', () => {
      const state: DROStatePayload = {
        stateName: 'grid-start-x',
        stateData: INITIAL_GRID_DATA,
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
        display: INITIAL_DISPLAY_STATE,
      };
      const result = gridReducer(state, { eventName: 'BTN_ABS_INC' }, mmContext);
      expect(result).toBeNull();
    });

    it('returns null when buffer empty on ENTER in start-x', () => {
      const state: DROStatePayload = {
        stateName: 'grid-start-x',
        stateData: INITIAL_GRID_DATA,
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '' },
        display: INITIAL_DISPLAY_STATE,
      };
      const result = gridReducer(state, { eventName: 'KEY_ENTER' }, mmContext);
      expect(result).toBeNull();
    });

    it('updates display on MILL_STATE_CHANGED in parameter entry', () => {
      const state: DROStatePayload = {
        stateName: 'grid-start-x',
        stateData: INITIAL_GRID_DATA,
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, inputBuffer: '5' },
        display: INITIAL_DISPLAY_STATE,
      };
      const result = gridReducer(state, { eventName: 'MILL_STATE_CHANGED' }, mmContext);
      expect(result?.display.X).toBe(5);
      expect(result?.display.Y).toBe('EntCnt0');
    });

    it('handles MILL_STATE_CHANGED in intro state unchanged', () => {
      const state: DROStatePayload = {
        stateName: 'grid-intro',
        stateData: INITIAL_GRID_DATA,
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
        display: { X: 'Grid', Y: 0, Z: '' },
      };
      const result = gridReducer(state, { eventName: 'MILL_STATE_CHANGED' }, mmContext);
      expect(result).toBe(state);
    });
  });
});

describe('useGridIntro hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('dispatches GRID_INTRO_TIMEOUT after intro duration in intro state', () => {
    const mockDispatch = vi.fn();
    renderHook(() => {
      useGridIntro(mockDispatch, 'grid-intro');
    });

    expect(mockDispatch).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(GRID_INTRO_DURATION_MS);
    });
    expect(mockDispatch).toHaveBeenCalledWith({ eventName: 'GRID_INTRO_TIMEOUT' });
  });

  it('does not dispatch when not in intro state', () => {
    const mockDispatch = vi.fn();
    renderHook(() => {
      useGridIntro(mockDispatch, 'idle');
    });
    act(() => {
      vi.advanceTimersByTime(GRID_INTRO_DURATION_MS + 100);
    });
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('cleans up timer when leaving intro state', () => {
    const mockDispatch = vi.fn();
    const { rerender } = renderHook(
      ({ state }: { state: DROStateName }) => {
        useGridIntro(mockDispatch, state);
      },
      { initialProps: { state: 'grid-intro' as DROStateName } }
    );
    act(() => {
      vi.advanceTimersByTime(GRID_INTRO_DURATION_MS / 2);
    });
    rerender({ state: 'idle' as DROStateName });
    act(() => {
      vi.advanceTimersByTime(GRID_INTRO_DURATION_MS);
    });
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
