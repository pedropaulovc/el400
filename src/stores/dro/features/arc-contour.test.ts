/**
 * Tests for Arc Contouring (Step Drilling) Feature Reducer (US-018)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  arcContourReducer,
  useArcContourIntro,
  ARC_CONTOUR_INTRO_DURATION_MS,
  calculateArcStepCount,
  calculateArcPointPosition,
} from './arc-contour';
import { INITIAL_ARC_DATA, type DROStateName, type ArcData } from '../droStateMachine';
import { DEFAULT_TEST_CONTEXT } from '../test-utils';
import type { DROStatePayload } from '../types';
import { INITIAL_VOLATILE_MEMORY_STATE } from '../../../types/volatileMemory';
import { INITIAL_DISPLAY_STATE } from '../utils/displayComputation';

/** Context with mm units so buffered values are interpreted as mm (no conversion). */
const MM_CTX = {
  ...DEFAULT_TEST_CONTEXT,
  nvMem: { ...DEFAULT_TEST_CONTEXT.nvMem, defaultUnit: 'mm' as const },
};

/** Build a state payload for a given arc-contour state + data (mm units). */
function arcState(
  stateName: DROStateName,
  data: Partial<ArcData> = {},
  vMemOverrides = {}
): DROStatePayload {
  return {
    stateName,
    stateData: { ...INITIAL_ARC_DATA, ...data },
    vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, mode: 'abs', ...vMemOverrides },
    display: INITIAL_DISPLAY_STATE,
  };
}

describe('arcContourReducer', () => {
  describe('ignores unrelated states', () => {
    it('returns null when not in an arc-contour state', () => {
      const state = arcState('idle');
      expect(arcContourReducer(state, { eventName: 'KEY_5' }, MM_CTX)).toBeNull();
    });
  });

  describe('arc-contour-intro state', () => {
    it('transitions to center-x on ARC_CONTOUR_INTRO_TIMEOUT', () => {
      const state = arcState('arc-contour-intro');
      const result = arcContourReducer(
        state,
        { eventName: 'ARC_CONTOUR_INTRO_TIMEOUT' },
        MM_CTX
      );
      expect(result?.stateName).toBe('arc-contour-center-x');
      expect(result?.display.Y).toBe('EntCnt0');
    });

    it('ignores key input during intro', () => {
      const state = arcState('arc-contour-intro');
      const result = arcContourReducer(state, { eventName: 'KEY_5' }, MM_CTX);
      expect(result).toBe(state);
    });
  });

  describe('parameter entry flow', () => {
    it('refreshes the parameter prompt display on MILL_STATE_CHANGED', () => {
      const state = arcState('arc-contour-radius', { centerX: 0, centerY: 0 }, { inputBuffer: '5' });
      const result = arcContourReducer(state, { eventName: 'MILL_STATE_CHANGED' }, MM_CTX);
      expect(result?.stateName).toBe('arc-contour-radius');
      expect(result?.display.X).toBe('rAdiUS');
    });

    it('advances center-x -> center-y storing value in mm (mm units)', () => {
      const state = arcState('arc-contour-center-x', {}, { inputBuffer: '10' });
      const result = arcContourReducer(state, { eventName: 'KEY_ENTER' }, MM_CTX);
      expect(result?.stateName).toBe('arc-contour-center-y');
      const data = result?.stateData;
      expect(data?.stateDataType).toBe('arc');
      if (data?.stateDataType === 'arc') expect(data.centerX).toBeCloseTo(10, 4);
      expect(result?.vMem.inputBuffer).toBe('');
    });

    it('advances center-y -> radius', () => {
      const state = arcState('arc-contour-center-y', { centerX: 10 }, { inputBuffer: '20' });
      const result = arcContourReducer(state, { eventName: 'KEY_ENTER' }, MM_CTX);
      expect(result?.stateName).toBe('arc-contour-radius');
      if (result?.stateData.stateDataType === 'arc')
        expect(result.stateData.centerY).toBeCloseTo(20, 4);
    });

    it('rejects zero or negative radius', () => {
      const state = arcState('arc-contour-radius', { centerX: 0, centerY: 0 }, { inputBuffer: '0' });
      const result = arcContourReducer(state, { eventName: 'KEY_ENTER' }, MM_CTX);
      expect(result).toBeNull();
    });

    it('advances radius -> start-angle for a valid radius', () => {
      const state = arcState('arc-contour-radius', { centerX: 0, centerY: 0 }, { inputBuffer: '25' });
      const result = arcContourReducer(state, { eventName: 'KEY_ENTER' }, MM_CTX);
      expect(result?.stateName).toBe('arc-contour-start-angle');
      if (result?.stateData.stateDataType === 'arc')
        expect(result.stateData.radius).toBeCloseTo(25, 4);
    });

    it('advances start-angle -> end-angle', () => {
      const state = arcState(
        'arc-contour-start-angle',
        { centerX: 0, centerY: 0, radius: 25 },
        { inputBuffer: '30' }
      );
      const result = arcContourReducer(state, { eventName: 'KEY_ENTER' }, MM_CTX);
      expect(result?.stateName).toBe('arc-contour-end-angle');
      if (result?.stateData.stateDataType === 'arc')
        expect(result.stateData.startAngle).toBe(30);
    });

    it('advances end-angle -> tool-diameter', () => {
      const state = arcState(
        'arc-contour-end-angle',
        { centerX: 0, centerY: 0, radius: 25, startAngle: 30 },
        { inputBuffer: '120' }
      );
      const result = arcContourReducer(state, { eventName: 'KEY_ENTER' }, MM_CTX);
      expect(result?.stateName).toBe('arc-contour-tool-diameter');
      if (result?.stateData.stateDataType === 'arc')
        expect(result.stateData.endAngle).toBe(120);
    });

    it('rejects equal start and end angle (zero arc span)', () => {
      const state = arcState(
        'arc-contour-end-angle',
        { centerX: 0, centerY: 0, radius: 25, startAngle: 30 },
        { inputBuffer: '30' }
      );
      const result = arcContourReducer(state, { eventName: 'KEY_ENTER' }, MM_CTX);
      expect(result).toBeNull();
    });

    it('advances tool-diameter -> cut-type', () => {
      const state = arcState(
        'arc-contour-tool-diameter',
        { centerX: 0, centerY: 0, radius: 25, startAngle: 30, endAngle: 120 },
        { inputBuffer: '5' }
      );
      const result = arcContourReducer(state, { eventName: 'KEY_ENTER' }, MM_CTX);
      expect(result?.stateName).toBe('arc-contour-cut-type');
      if (result?.stateData.stateDataType === 'arc')
        expect(result.stateData.toolDiameter).toBeCloseTo(5, 4);
    });

    it('rejects negative tool diameter', () => {
      const state = arcState(
        'arc-contour-tool-diameter',
        { centerX: 0, centerY: 0, radius: 25, startAngle: 30, endAngle: 120 },
        { inputBuffer: '-2' }
      );
      const result = arcContourReducer(state, { eventName: 'KEY_ENTER' }, MM_CTX);
      expect(result).toBeNull();
    });
  });

  describe('cut-type selection', () => {
    const base = {
      centerX: 0,
      centerY: 0,
      radius: 25,
      startAngle: 30,
      endAngle: 120,
      toolDiameter: 5,
    };

    it('defaults to INT and cycles INT -> EXT -> MID -> INT with key 6', () => {
      let state = arcState('arc-contour-cut-type', { ...base, cutType: 'INT' });
      expect(state.stateData.stateDataType === 'arc' && state.stateData.cutType).toBe('INT');

      let result = arcContourReducer(state, { eventName: 'KEY_6_RIGHT' }, MM_CTX);
      expect(result?.stateData.stateDataType === 'arc' && result.stateData.cutType).toBe('EXT');
      expect(result?.display.X).toBe('EXt CUt');

      state = result!;
      result = arcContourReducer(state, { eventName: 'KEY_6_RIGHT' }, MM_CTX);
      expect(result?.stateData.stateDataType === 'arc' && result.stateData.cutType).toBe('MID');
      expect(result?.display.X).toBe('mid CUt');

      state = result!;
      result = arcContourReducer(state, { eventName: 'KEY_6_RIGHT' }, MM_CTX);
      expect(result?.stateData.stateDataType === 'arc' && result.stateData.cutType).toBe('INT');
      expect(result?.display.X).toBe('int CUt');
    });

    it('confirms cut type with ENTER and advances to max-cut', () => {
      const state = arcState('arc-contour-cut-type', { ...base, cutType: 'EXT' });
      const result = arcContourReducer(state, { eventName: 'KEY_ENTER' }, MM_CTX);
      expect(result?.stateName).toBe('arc-contour-max-cut');
      if (result?.stateData.stateDataType === 'arc') expect(result.stateData.cutType).toBe('EXT');
    });
  });

  describe('max-cut entry and step calculation', () => {
    const base = {
      centerX: 0,
      centerY: 0,
      radius: 25,
      startAngle: 30,
      endAngle: 120,
      toolDiameter: 5,
      cutType: 'MID' as const,
    };

    it('rejects zero max cut', () => {
      const state = arcState('arc-contour-max-cut', base, { inputBuffer: '0' });
      const result = arcContourReducer(state, { eventName: 'KEY_ENTER' }, MM_CTX);
      expect(result).toBeNull();
    });

    it('computes step count and switches to navigate in INC mode', () => {
      // 90deg arc, MID cut radius 25mm -> arc length = 25 * (pi/2) = 39.27mm
      // maxCut 5mm -> ceil(39.27/5) = 8 steps -> 9 points
      const state = arcState('arc-contour-max-cut', base, { inputBuffer: '5' });
      const result = arcContourReducer(state, { eventName: 'KEY_ENTER' }, MM_CTX);
      expect(result?.stateName).toBe('arc-contour-navigate');
      expect(result?.vMem.mode).toBe('inc');
      if (result?.stateData.stateDataType === 'arc') {
        expect(result.stateData.maxCut).toBeCloseTo(5, 4);
        expect(result.stateData.pointCount).toBe(9);
        expect(result.stateData.currentPoint).toBe(1);
      }
    });
  });

  describe('navigation', () => {
    function navState(point = 1) {
      return arcState(
        'arc-contour-navigate',
        {
          centerX: 0,
          centerY: 0,
          radius: 25,
          startAngle: 0,
          endAngle: 90,
          toolDiameter: 5,
          cutType: 'MID',
          maxCut: 5,
          pointCount: 9,
          currentPoint: point,
        },
        { mode: 'inc' }
      );
    }

    it('advances to next point with key 6', () => {
      const result = arcContourReducer(navState(1), { eventName: 'KEY_6_RIGHT' }, MM_CTX);
      if (result?.stateData.stateDataType === 'arc') expect(result.stateData.currentPoint).toBe(2);
    });

    it('goes to previous point with key 4', () => {
      const result = arcContourReducer(navState(3), { eventName: 'KEY_4_LEFT' }, MM_CTX);
      if (result?.stateData.stateDataType === 'arc') expect(result.stateData.currentPoint).toBe(2);
    });

    it('wraps from last to first with key 6', () => {
      const result = arcContourReducer(navState(9), { eventName: 'KEY_6_RIGHT' }, MM_CTX);
      if (result?.stateData.stateDataType === 'arc') expect(result.stateData.currentPoint).toBe(1);
    });

    it('wraps from first to last with key 4', () => {
      const result = arcContourReducer(navState(1), { eventName: 'KEY_4_LEFT' }, MM_CTX);
      if (result?.stateData.stateDataType === 'arc') expect(result.stateData.currentPoint).toBe(9);
    });

    it('shows current point number with key 8', () => {
      const result = arcContourReducer(navState(3), { eventName: 'KEY_8_UP' }, MM_CTX);
      expect(result?.vMem.inputBuffer).toBe('3');
    });

    it('jumps to a specific point with number entry + enter', () => {
      const state = navState(1);
      const withBuffer = { ...state, vMem: { ...state.vMem, inputBuffer: '5' } };
      const result = arcContourReducer(withBuffer, { eventName: 'KEY_ENTER' }, MM_CTX);
      if (result?.stateData.stateDataType === 'arc') expect(result.stateData.currentPoint).toBe(5);
    });

    it('rejects out-of-range jump target', () => {
      const state = navState(1);
      const withBuffer = { ...state, vMem: { ...state.vMem, inputBuffer: '99' } };
      const result = arcContourReducer(withBuffer, { eventName: 'KEY_ENTER' }, MM_CTX);
      expect(result).toBeNull();
    });

    it('clears the buffer to start a jump with key 2', () => {
      const state = navState(3);
      const withBuffer = { ...state, vMem: { ...state.vMem, inputBuffer: '7' } };
      const result = arcContourReducer(withBuffer, { eventName: 'KEY_2_DOWN' }, MM_CTX);
      expect(result?.vMem.inputBuffer).toBe('');
    });

    it('accumulates digit keys into the jump buffer', () => {
      const result = arcContourReducer(navState(1), { eventName: 'KEY_7' }, MM_CTX);
      expect(result?.vMem.inputBuffer).toBe('7');
    });

    it('updates the distance-to-go display on MILL_STATE_CHANGED', () => {
      const result = arcContourReducer(navState(1), { eventName: 'MILL_STATE_CHANGED' }, MM_CTX);
      expect(result?.stateName).toBe('arc-contour-navigate');
      expect(typeof result?.display.X).toBe('number');
    });

    it('exits to idle when pointCount is null', () => {
      const state = arcState('arc-contour-navigate', { pointCount: null });
      const result = arcContourReducer(state, { eventName: 'KEY_6_RIGHT' }, MM_CTX);
      expect(result?.stateName).toBe('idle');
    });
  });

  describe('exit handling', () => {
    it('exits to idle on KEY_CLEAR with empty buffer and restores ABS mode', () => {
      const state = arcState('arc-contour-radius', { centerX: 0, centerY: 0 }, { mode: 'inc' });
      const result = arcContourReducer(state, { eventName: 'KEY_CLEAR' }, MM_CTX);
      expect(result?.stateName).toBe('idle');
      expect(result?.vMem.mode).toBe('abs');
    });

    it('backspaces buffer on KEY_CLEAR when buffer has content', () => {
      const state = arcState('arc-contour-radius', { centerX: 0, centerY: 0 }, { inputBuffer: '25' });
      const result = arcContourReducer(state, { eventName: 'KEY_CLEAR' }, MM_CTX);
      expect(result?.stateName).toBe('arc-contour-radius');
      expect(result?.vMem.inputBuffer).toBe('2');
    });
  });
});

describe('calculateArcStepCount', () => {
  it('returns ceil(arcLength / maxCut) for a 90 degree MID arc', () => {
    // radius 25mm, 90deg, MID -> length 39.27mm, maxCut 5 -> 8
    expect(
      calculateArcStepCount({ radius: 25, startAngle: 0, endAngle: 90, toolDiameter: 5, cutType: 'MID', maxCut: 5 })
    ).toBe(8);
  });

  it('uses INT effective radius (radius - toolRadius)', () => {
    // INT radius = 25 - 2.5 = 22.5mm, 90deg -> length 35.34mm, maxCut 5 -> 8
    expect(
      calculateArcStepCount({ radius: 25, startAngle: 0, endAngle: 90, toolDiameter: 5, cutType: 'INT', maxCut: 5 })
    ).toBe(8);
  });

  it('uses EXT effective radius (radius + toolRadius)', () => {
    // EXT radius = 25 + 2.5 = 27.5mm, 90deg -> length 43.20mm, maxCut 5 -> 9
    expect(
      calculateArcStepCount({ radius: 25, startAngle: 0, endAngle: 90, toolDiameter: 5, cutType: 'EXT', maxCut: 5 })
    ).toBe(9);
  });

  it('handles arcs that wrap past 360 by using absolute span', () => {
    // span = |350 - 10| = 340deg
    const n = calculateArcStepCount({
      radius: 25,
      startAngle: 10,
      endAngle: 350,
      toolDiameter: 0,
      cutType: 'MID',
      maxCut: 5,
    });
    // length = 25 * 340deg in rad = 148.35mm -> ceil/5 = 30
    expect(n).toBe(30);
  });
});

describe('calculateArcPointPosition', () => {
  const base: ArcData = {
    stateDataType: 'arc',
    centerX: 10,
    centerY: 20,
    radius: 25,
    startAngle: 0,
    endAngle: 90,
    toolDiameter: 5,
    cutType: 'MID',
    maxCut: 5,
    pointCount: 9,
    currentPoint: 1,
  };

  it('places point 1 at the start angle on the MID radius', () => {
    const p = calculateArcPointPosition({ ...base }, 1);
    // 0deg, radius 25 from center (10,20) -> (35, 20)
    expect(p.x).toBeCloseTo(35, 4);
    expect(p.y).toBeCloseTo(20, 4);
  });

  it('places the last point at the end angle', () => {
    const p = calculateArcPointPosition({ ...base }, 9);
    // 90deg, radius 25 from center (10,20) -> (10, 45)
    expect(p.x).toBeCloseTo(10, 4);
    expect(p.y).toBeCloseTo(45, 4);
  });

  it('offsets inward for INT cut', () => {
    // INT effective radius = 22.5; point 1 at 0deg -> (10 + 22.5, 20) = (32.5, 20)
    const p = calculateArcPointPosition({ ...base, cutType: 'INT' }, 1);
    expect(p.x).toBeCloseTo(32.5, 4);
    expect(p.y).toBeCloseTo(20, 4);
  });

  it('offsets outward for EXT cut', () => {
    // EXT effective radius = 27.5; point 1 at 0deg -> (37.5, 20)
    const p = calculateArcPointPosition({ ...base, cutType: 'EXT' }, 1);
    expect(p.x).toBeCloseTo(37.5, 4);
    expect(p.y).toBeCloseTo(20, 4);
  });

  it('spaces points so consecutive gaps stay within max cut', () => {
    const p1 = calculateArcPointPosition({ ...base }, 1);
    const p2 = calculateArcPointPosition({ ...base }, 2);
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    expect(dist).toBeLessThanOrEqual((base.maxCut ?? 0) + 1e-6);
  });
});

describe('useArcContourIntro hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('dispatches ARC_CONTOUR_INTRO_TIMEOUT after the intro duration', () => {
    const dispatch = vi.fn();
    renderHook(() => { useArcContourIntro(dispatch, 'arc-contour-intro'); });
    expect(dispatch).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(ARC_CONTOUR_INTRO_DURATION_MS + 10); });
    expect(dispatch).toHaveBeenCalledWith({ eventName: 'ARC_CONTOUR_INTRO_TIMEOUT' });
  });

  it('does not dispatch when not in intro state', () => {
    const dispatch = vi.fn();
    renderHook(() => { useArcContourIntro(dispatch, 'idle'); });
    act(() => { vi.advanceTimersByTime(ARC_CONTOUR_INTRO_DURATION_MS + 10); });
    expect(dispatch).not.toHaveBeenCalled();
  });
});
