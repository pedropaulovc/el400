/**
 * Unit tests for the Linear Bolt Hole feature reducer (US-029).
 */

import { describe, it, expect } from 'vitest';
import { linearBoltHoleReducer } from './linear-bolt-hole';
import { INITIAL_LINEAR_BOLT_HOLE_DATA, type LinearBoltHoleData } from '../droStateMachine';
import { DEFAULT_TEST_CONTEXT } from '../test-utils';
import type { DROStatePayload } from '../types';
import { INITIAL_VOLATILE_MEMORY_STATE } from '../../../types/volatileMemory';
import { INITIAL_DISPLAY_STATE } from '../utils/displayComputation';

/** mm-mode context so numeric values map 1:1 with displayed values. */
const MM_CONTEXT = {
  ...DEFAULT_TEST_CONTEXT,
  nvMem: { ...DEFAULT_TEST_CONTEXT.nvMem, defaultUnit: 'mm' as const },
};

function dataWith(overrides: Partial<LinearBoltHoleData>): LinearBoltHoleData {
  return { ...INITIAL_LINEAR_BOLT_HOLE_DATA, ...overrides };
}

describe('linearBoltHoleReducer', () => {
  describe('non-linear states', () => {
    it('returns null for states it does not own', () => {
      const state: DROStatePayload = {
        stateName: 'idle',
        stateData: { stateDataType: 'none' },
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
        display: INITIAL_DISPLAY_STATE,
      };
      expect(linearBoltHoleReducer(state, { eventName: 'KEY_ENTER' }, MM_CONTEXT)).toBeNull();
    });
  });

  describe('axis selection (linear-bolt-hole-axis)', () => {
    const axisState: DROStatePayload = {
      stateName: 'linear-bolt-hole-axis',
      stateData: INITIAL_LINEAR_BOLT_HOLE_DATA,
      vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, mode: 'abs' },
      display: { X: 'AXIS', Y: '', Z: '' },
    };

    it('selects X, resets the X axis (ABS), and switches to INC mode', () => {
      const seeded: DROStatePayload = {
        ...axisState,
        vMem: { ...axisState.vMem, manualAbsoluteValues: { X: 5, Y: 1, Z: 2 } },
      };
      const result = linearBoltHoleReducer(seeded, { eventName: 'BTN_SELECT_X' }, MM_CONTEXT);
      expect(result?.stateName).toBe('linear-bolt-hole-pitch');
      expect(result?.vMem.mode).toBe('inc');
      // In manual (not connected) mode, reset zeroes the ABS value for the axis
      expect(result?.vMem.manualAbsoluteValues.X).toBe(0);
      // Other axes are untouched
      expect(result?.vMem.manualAbsoluteValues.Y).toBe(1);
      if (result?.stateData.stateDataType === 'linear-bolt-hole') {
        expect(result.stateData.axis).toBe('X');
      }
    });

    it('selects Y and shows the pitch prompt on X', () => {
      const result = linearBoltHoleReducer(axisState, { eventName: 'BTN_SELECT_Y' }, MM_CONTEXT);
      expect(result?.stateName).toBe('linear-bolt-hole-pitch');
      if (result?.stateData.stateDataType === 'linear-bolt-hole') {
        expect(result.stateData.axis).toBe('Y');
      }
      // Y is the value axis (0), X shows the prompt
      expect(result?.display.X).toBe('PitCh');
      expect(result?.display.Y).toBe(0);
    });

    it('selects Z', () => {
      const result = linearBoltHoleReducer(axisState, { eventName: 'BTN_SELECT_Z' }, MM_CONTEXT);
      if (result?.stateData.stateDataType === 'linear-bolt-hole') {
        expect(result.stateData.axis).toBe('Z');
      }
    });

    it('ignores non-axis keys while selecting axis', () => {
      expect(linearBoltHoleReducer(axisState, { eventName: 'KEY_5' }, MM_CONTEXT)).toBeNull();
      expect(linearBoltHoleReducer(axisState, { eventName: 'KEY_ENTER' }, MM_CONTEXT)).toBeNull();
    });

    it('exits to idle/ABS with KEY_CLEAR from axis selection', () => {
      const result = linearBoltHoleReducer(axisState, { eventName: 'KEY_CLEAR' }, MM_CONTEXT);
      expect(result?.stateName).toBe('idle');
      expect(result?.vMem.mode).toBe('abs');
    });
  });

  describe('pitch entry (linear-bolt-hole-pitch)', () => {
    const pitchState: DROStatePayload = {
      stateName: 'linear-bolt-hole-pitch',
      stateData: dataWith({ axis: 'X' }),
      vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, mode: 'inc' },
      display: { X: 0, Y: 'PitCh', Z: '' },
    };

    it('appends digits and shows the value on the selected axis (X)', () => {
      const r1 = linearBoltHoleReducer(pitchState, { eventName: 'KEY_1' }, MM_CONTEXT);
      expect(r1?.vMem.inputBuffer).toBe('1');
      expect(r1?.display.X).toBe(1);
      expect(r1?.display.Y).toBe('PitCh');
    });

    it('supports decimal entry', () => {
      let r = linearBoltHoleReducer(pitchState, { eventName: 'KEY_1' }, MM_CONTEXT)!;
      r = linearBoltHoleReducer(r, { eventName: 'KEY_DECIMAL' }, MM_CONTEXT)!;
      r = linearBoltHoleReducer(r, { eventName: 'KEY_5' }, MM_CONTEXT)!;
      expect(r.vMem.inputBuffer).toBe('1.5');
      expect(r.display.X).toBeCloseTo(1.5, 4);
    });

    it('supports sign toggle', () => {
      let r = linearBoltHoleReducer(pitchState, { eventName: 'KEY_5' }, MM_CONTEXT)!;
      r = linearBoltHoleReducer(r, { eventName: 'KEY_SIGN' }, MM_CONTEXT)!;
      expect(r.vMem.inputBuffer).toBe('-5');
    });

    it('backspaces with KEY_CLEAR when buffer has content', () => {
      const seeded = { ...pitchState, vMem: { ...pitchState.vMem, inputBuffer: '12' } };
      const r = linearBoltHoleReducer(seeded, { eventName: 'KEY_CLEAR' }, MM_CONTEXT);
      expect(r?.stateName).toBe('linear-bolt-hole-pitch');
      expect(r?.vMem.inputBuffer).toBe('1');
    });

    it('confirms a valid pitch (mm) and advances to holes entry', () => {
      const seeded = { ...pitchState, vMem: { ...pitchState.vMem, inputBuffer: '10' } };
      const r = linearBoltHoleReducer(seeded, { eventName: 'KEY_ENTER' }, MM_CONTEXT);
      expect(r?.stateName).toBe('linear-bolt-hole-holes');
      if (r?.stateData.stateDataType === 'linear-bolt-hole') {
        expect(r.stateData.pitch).toBeCloseTo(10, 4);
      }
      expect(r?.vMem.inputBuffer).toBe('');
      expect(r?.display.Y).toBe('hoLES');
    });

    it('converts pitch from inches to mm in inch mode', () => {
      const seeded = { ...pitchState, vMem: { ...pitchState.vMem, inputBuffer: '1' } };
      const r = linearBoltHoleReducer(seeded, { eventName: 'KEY_ENTER' }, DEFAULT_TEST_CONTEXT);
      if (r?.stateData.stateDataType === 'linear-bolt-hole') {
        expect(r.stateData.pitch).toBeCloseTo(25.4, 4); // 1 inch
      }
    });

    it('rejects a non-positive pitch', () => {
      const zero = { ...pitchState, vMem: { ...pitchState.vMem, inputBuffer: '0' } };
      expect(linearBoltHoleReducer(zero, { eventName: 'KEY_ENTER' }, MM_CONTEXT)).toBeNull();
      const neg = { ...pitchState, vMem: { ...pitchState.vMem, inputBuffer: '-5' } };
      expect(linearBoltHoleReducer(neg, { eventName: 'KEY_ENTER' }, MM_CONTEXT)).toBeNull();
    });

    it('rejects ENTER with an empty buffer', () => {
      expect(linearBoltHoleReducer(pitchState, { eventName: 'KEY_ENTER' }, MM_CONTEXT)).toBeNull();
    });
  });

  describe('holes entry (linear-bolt-hole-holes)', () => {
    const holesState: DROStatePayload = {
      stateName: 'linear-bolt-hole-holes',
      stateData: dataWith({ axis: 'X', pitch: 10 }),
      vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, mode: 'inc' },
      display: { X: 0, Y: 'hoLES', Z: '' },
    };

    it('accepts a hole count and moves to navigate showing distance-to-go to hole 1 (0)', () => {
      const seeded = { ...holesState, vMem: { ...holesState.vMem, inputBuffer: '5' } };
      const r = linearBoltHoleReducer(seeded, { eventName: 'KEY_ENTER' }, MM_CONTEXT);
      expect(r?.stateName).toBe('linear-bolt-hole-navigate');
      if (r?.stateData.stateDataType === 'linear-bolt-hole') {
        expect(r.stateData.holeCount).toBe(5);
        expect(r.stateData.currentHole).toBe(1);
      }
      // Hole 1 is at the reset origin; distance-to-go on X is 0
      expect(r?.display.X).toBeCloseTo(0, 4);
    });

    it('floors a fractional hole count', () => {
      const seeded = { ...holesState, vMem: { ...holesState.vMem, inputBuffer: '5.9' } };
      const r = linearBoltHoleReducer(seeded, { eventName: 'KEY_ENTER' }, MM_CONTEXT);
      if (r?.stateData.stateDataType === 'linear-bolt-hole') {
        expect(r.stateData.holeCount).toBe(5);
      }
    });

    it('rejects a hole count below 2', () => {
      const seeded = { ...holesState, vMem: { ...holesState.vMem, inputBuffer: '1' } };
      expect(linearBoltHoleReducer(seeded, { eventName: 'KEY_ENTER' }, MM_CONTEXT)).toBeNull();
    });

    it('rejects a hole count above 999', () => {
      const seeded = { ...holesState, vMem: { ...holesState.vMem, inputBuffer: '1000' } };
      expect(linearBoltHoleReducer(seeded, { eventName: 'KEY_ENTER' }, MM_CONTEXT)).toBeNull();
    });
  });

  describe('navigation (linear-bolt-hole-navigate)', () => {
    const navState: DROStatePayload = {
      stateName: 'linear-bolt-hole-navigate',
      stateData: dataWith({ axis: 'X', pitch: 10, holeCount: 5, currentHole: 1 }),
      vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, mode: 'inc' },
      display: INITIAL_DISPLAY_STATE,
    };

    it('advances to the next hole with KEY_6_RIGHT and shows pitch distance', () => {
      const r = linearBoltHoleReducer(navState, { eventName: 'KEY_6_RIGHT' }, MM_CONTEXT);
      if (r?.stateData.stateDataType === 'linear-bolt-hole') {
        expect(r.stateData.currentHole).toBe(2);
      }
      // Hole 2 sits at 1*pitch = 10mm from the reset origin; current X is 0
      expect(r?.display.X).toBeCloseTo(10, 4);
    });

    it('wraps from the last hole to the first with KEY_6_RIGHT', () => {
      const atLast = { ...navState, stateData: dataWith({ axis: 'X', pitch: 10, holeCount: 5, currentHole: 5 }) };
      const r = linearBoltHoleReducer(atLast, { eventName: 'KEY_6_RIGHT' }, MM_CONTEXT);
      if (r?.stateData.stateDataType === 'linear-bolt-hole') {
        expect(r.stateData.currentHole).toBe(1);
      }
    });

    it('goes to the previous hole with KEY_4_LEFT', () => {
      const atTwo = { ...navState, stateData: dataWith({ axis: 'X', pitch: 10, holeCount: 5, currentHole: 2 }) };
      const r = linearBoltHoleReducer(atTwo, { eventName: 'KEY_4_LEFT' }, MM_CONTEXT);
      if (r?.stateData.stateDataType === 'linear-bolt-hole') {
        expect(r.stateData.currentHole).toBe(1);
      }
    });

    it('wraps from the first hole to the last with KEY_4_LEFT', () => {
      const r = linearBoltHoleReducer(navState, { eventName: 'KEY_4_LEFT' }, MM_CONTEXT);
      if (r?.stateData.stateDataType === 'linear-bolt-hole') {
        expect(r.stateData.currentHole).toBe(5);
      }
    });

    it('shows distance-to-go relative to the current Y axis position too', () => {
      // Selected axis is Y; Z and X should show their normal INC positions.
      const yNav: DROStatePayload = {
        stateName: 'linear-bolt-hole-navigate',
        stateData: dataWith({ axis: 'Y', pitch: 20, holeCount: 3, currentHole: 2 }),
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, mode: 'inc', manualAbsoluteValues: { X: 7, Y: 5, Z: 0 } },
        display: INITIAL_DISPLAY_STATE,
      };
      const r = linearBoltHoleReducer(yNav, { eventName: 'MILL_STATE_CHANGED' }, MM_CONTEXT);
      // Hole 2 at 1*20 = 20mm; current Y ABS = 5 -> distance 15
      expect(r?.display.Y).toBeCloseTo(15, 4);
      // X shows its normal ABS position
      expect(r?.display.X).toBeCloseTo(7, 4);
    });

    it('exits to idle when hole count is missing (defensive)', () => {
      const broken: DROStatePayload = {
        stateName: 'linear-bolt-hole-navigate',
        stateData: dataWith({ axis: 'X', pitch: 10, holeCount: null }),
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, mode: 'inc' },
        display: INITIAL_DISPLAY_STATE,
      };
      const r = linearBoltHoleReducer(broken, { eventName: 'KEY_6_RIGHT' }, MM_CONTEXT);
      expect(r?.stateName).toBe('idle');
    });

    it('ignores unhandled events', () => {
      expect(linearBoltHoleReducer(navState, { eventName: 'BTN_ABS_INC' }, MM_CONTEXT)).toBeNull();
    });

    it('exits to idle/ABS with KEY_CLEAR', () => {
      const r = linearBoltHoleReducer(navState, { eventName: 'KEY_CLEAR' }, MM_CONTEXT);
      expect(r?.stateName).toBe('idle');
      expect(r?.vMem.mode).toBe('abs');
    });
  });

  describe('MILL_STATE_CHANGED', () => {
    it('updates the navigate display as position changes', () => {
      const nav: DROStatePayload = {
        stateName: 'linear-bolt-hole-navigate',
        stateData: dataWith({ axis: 'X', pitch: 10, holeCount: 5, currentHole: 3 }),
        vMem: { ...INITIAL_VOLATILE_MEMORY_STATE, mode: 'inc', manualAbsoluteValues: { X: 5, Y: 0, Z: 0 } },
        display: INITIAL_DISPLAY_STATE,
      };
      const r = linearBoltHoleReducer(nav, { eventName: 'MILL_STATE_CHANGED' }, MM_CONTEXT);
      // Hole 3 at 2*10 = 20mm; current X ABS = 5 -> distance 15
      expect(r?.display.X).toBeCloseTo(15, 4);
    });

    it('returns the state unchanged for non-navigate states', () => {
      const pitch: DROStatePayload = {
        stateName: 'linear-bolt-hole-pitch',
        stateData: dataWith({ axis: 'X' }),
        vMem: INITIAL_VOLATILE_MEMORY_STATE,
        display: INITIAL_DISPLAY_STATE,
      };
      const r = linearBoltHoleReducer(pitch, { eventName: 'MILL_STATE_CHANGED' }, MM_CONTEXT);
      expect(r).toBe(pitch);
    });
  });
});
