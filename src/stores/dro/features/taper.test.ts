/**
 * Taper Calculation Feature - unit tests (US-045)
 *
 * Manual Section 9.2.2: movement between two taper ends produces a radius
 * magnitude and an acute half-angle. The angle is shown in the manual's DMS
 * form; the real X/Y/Z `tAPEr on` choice selects its display.
 *
 * theta = atan(|deltaX| / |deltaZ|)
 */

import { describe, it, expect } from 'vitest';
import { taperReducer } from './taper';
import { createTestState, DEFAULT_TEST_CONTEXT } from '../test-utils';
import type { DROReducerContext } from '../types';
import type { TaperData } from '../droStateMachine';
import { INITIAL_TAPER_DATA } from '../droStateMachine';
import { createDefaultMillState } from '../../../types/millState';
import { DEFAULT_NON_VOLATILE_MEMORY } from '../../../types/nonVolatileMemory';
import type { TaperOnAxis } from '../../../types/nonVolatileMemory';

/** Build a connected-mill context with the taper-on axis configured. */
function contextWith(taperOnAxis: TaperOnAxis, x: number, y: number, z: number): DROReducerContext {
  const millState = createDefaultMillState('mock');
  millState.connected = true;
  millState.position = { x, y, z };
  return {
    millState,
    nvMem: { ...DEFAULT_NON_VOLATILE_MEMORY, taperOnAxis },
  };
}

/** Enter the taper-active state with a captured entry position. */
function activeState(entry: { x: number; y: number; z: number }) {
  const data: TaperData = {
    ...INITIAL_TAPER_DATA,
    entryX: entry.x,
    entryY: entry.y,
    entryZ: entry.z,
  };
  return createTestState('taper-active', data);
}

describe('taperReducer', () => {
  it('ignores states it does not own', () => {
    const result = taperReducer(
      createTestState('idle'),
      { eventName: 'MILL_STATE_CHANGED' },
      DEFAULT_TEST_CONTEXT
    );
    expect(result).toBeNull();
  });

  describe('radius/half-angle display per real taper-on axis', () => {
    it('taper on X: DMS angle on X and radius on Z', () => {
      const result = taperReducer(
        activeState({ x: 0, y: 0, z: 0 }),
        { eventName: 'MILL_STATE_CHANGED' },
        contextWith('X', 5, 0, 50)
      );

      expect(result?.display.X).toBe('5.42.38');
      expect(result?.display.Z as number).toBeCloseTo(5 / 25.4, 4);
    });

    it('taper on Y: radius on X and DMS angle on Y', () => {
      const result = taperReducer(
        activeState({ x: 0, y: 0, z: 0 }),
        { eventName: 'MILL_STATE_CHANGED' },
        contextWith('Y', 5, 0, 50)
      );

      expect(result?.display.X as number).toBeCloseTo(5 / 25.4, 4);
      expect(result?.display.Y).toBe('5.42.38');
      expect(result?.display.Z).toBe('');
    });

    it('taper on Z: radius on X and DMS angle on Z', () => {
      const result = taperReducer(
        activeState({ x: 0, y: 0, z: 0 }),
        { eventName: 'MILL_STATE_CHANGED' },
        contextWith('Z', 5, 0, 50)
      );

      expect(result?.display.X as number).toBeCloseTo(5 / 25.4, 4);
      expect(result?.display.Z).toBe('5.42.38');
    });

    it('uses entry position as the measurement origin', () => {
      const result = taperReducer(
        activeState({ x: 100, y: 0, z: 200 }),
        { eventName: 'MILL_STATE_CHANGED' },
        contextWith('X', 105, 0, 250)
      );
      expect(result?.display.X).toBe('5.42.38');
    });

    it('radius respects millimetre mode while angle stays DMS', () => {
      const ctx: DROReducerContext = {
        millState: {
          ...createDefaultMillState('mock'),
          connected: true,
          position: { x: 5, y: 0, z: 50 },
        },
        nvMem: {
          ...DEFAULT_NON_VOLATILE_MEMORY,
          taperOnAxis: 'X',
          defaultUnit: 'mm',
        },
      };
      const result = taperReducer(
        activeState({ x: 0, y: 0, z: 0 }),
        { eventName: 'MILL_STATE_CHANGED' },
        ctx
      );

      expect(result?.display.X).toBe('5.42.38');
      expect(result?.display.Z).toBeCloseTo(5, 4);
    });
  });

  describe('AC 45.5: exit', () => {
    it('KEY_CLEAR exits to idle', () => {
      const result = taperReducer(
        activeState({ x: 0, y: 0, z: 0 }),
        { eventName: 'KEY_CLEAR' },
        contextWith('X', 0, 0, 0)
      );
      expect(result).not.toBeNull();
      expect(result!.stateName).toBe('idle');
    });
  });

  describe('signed and degenerate geometry', () => {
    it('each signed traversal produces the same positive radius and acute half-angle', () => {
      const states = [
        contextWith('Z', 5, 0, 50),
        contextWith('Z', -5, 0, 50),
        contextWith('Z', 5, 0, -50),
        contextWith('Z', -5, 0, -50),
      ].map((context) => taperReducer(
        activeState({ x: 0, y: 0, z: 0 }),
        { eventName: 'MILL_STATE_CHANGED' },
        context
      ));

      for (const result of states) {
        expect(result?.display.X as number).toBeCloseTo(5 / 25.4, 4);
        expect(result?.display.Z).toBe('5.42.38');
      }
    });

    it('shows INVALID when axial length is zero, including the entry position', () => {
      const noMovement = taperReducer(
        activeState({ x: 0, y: 0, z: 0 }),
        { eventName: 'MILL_STATE_CHANGED' },
        contextWith('X', 0, 0, 0)
      );
      const radiusOnly = taperReducer(
        activeState({ x: 0, y: 0, z: 0 }),
        { eventName: 'MILL_STATE_CHANGED' },
        contextWith('X', 5, 0, 0)
      );

      expect(noMovement?.display.X).toBe('inuAL d');
      expect(radiusOnly?.display.X).toBe('inuAL d');
      expect(radiusOnly?.display.Z as number).toBeCloseTo(5 / 25.4, 4);
    });
  });
});
