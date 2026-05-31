/**
 * Taper Calculation Feature - unit tests (US-045)
 *
 * Manual Section 9.2.2: from two ends of a taper the DRO derives the taper
 * Radius (R) and included Angle (theta). The `tAPEr on` axis (Section 6.2)
 * selects which axis displays the angle; the paired axis shows the radius.
 *
 *   Taper ON axis | Radius (R) | Angle (theta)
 *   --------------|------------|--------------
 *   X axis        | Z axis     | X axis
 *   Z axis        | X axis     | Z axis
 *   Z' axis       | X axis     | Z' axis
 *
 * theta = atan(deltaR / deltaL), where deltaR is the travel on the radius axis
 * and deltaL is the travel on the length axis, measured from the position at
 * which the function was entered.
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

  describe('AC 45.3 / 45.4: angle and radius display per taper-on axis', () => {
    it('taper on X: angle on X = atan(dX/dZ), radius on Z = dX (mm)', () => {
      // Entered at origin, moved X by 5mm (radius), Z by 50mm (length).
      const ctx = contextWith('X', 5, 0, 50);
      const result = taperReducer(
        activeState({ x: 0, y: 0, z: 0 }),
        { eventName: 'MILL_STATE_CHANGED' },
        ctx
      );
      expect(result).not.toBeNull();
      // angle = atan(5/50) = 5.7106 deg on X (the taper-on axis)
      expect(result!.display.X as number).toBeCloseTo(5.7106, 3);
      // radius = dX = 5 on Z (mm unit -> default is inch; convert)
      expect(result!.display.Z as number).toBeCloseTo(5 / 25.4, 4);
    });

    it('taper on Z: angle on Z = atan(dX/dZ), radius on X = dX', () => {
      // Realistic taper: dX = 5mm radius travel, dZ = 50mm length travel.
      const ctx = contextWith('Z', 5, 0, 50);
      const result = taperReducer(
        activeState({ x: 0, y: 0, z: 0 }),
        { eventName: 'MILL_STATE_CHANGED' },
        ctx
      );
      expect(result).not.toBeNull();
      // taper on Z -> radius axis is X, length axis is Z; only the display
      // routing differs from taper-on-X (angle now on Z, radius now on X).
      // half-angle = atan(dX/dZ) = atan(5/50) = 5.7106 deg on Z
      expect(result!.display.Z as number).toBeCloseTo(5.7106, 3);
      // radius shown on X = dX travel = 5mm (default inch unit -> convert)
      expect(result!.display.X as number).toBeCloseTo(5 / 25.4, 4);
    });

    it("taper on Z' pairs radius on X (lathe 4th-axis variant)", () => {
      const ctx = contextWith('Zprime', 10, 0, 40);
      const result = taperReducer(
        activeState({ x: 0, y: 0, z: 0 }),
        { eventName: 'MILL_STATE_CHANGED' },
        ctx
      );
      expect(result).not.toBeNull();
      // angle on Z (Z' maps to Z display on this 3-axis sim)
      expect(result!.display.Z as number).toBeCloseTo((Math.atan2(10, 40) * 180) / Math.PI, 3);
      expect(result!.display.X as number).toBeCloseTo(10 / 25.4, 4);
    });

    it('uses entry position as the zero reference (deltas, not absolute)', () => {
      // Entered at (100, 0, 200); moved to (105, 0, 250) => dX=5, dZ=50
      const ctx = contextWith('X', 105, 0, 250);
      const result = taperReducer(
        activeState({ x: 100, y: 0, z: 200 }),
        { eventName: 'MILL_STATE_CHANGED' },
        ctx
      );
      expect(result!.display.X as number).toBeCloseTo(5.7106, 3);
    });

    it('shows zero angle and radius before any movement', () => {
      const ctx = contextWith('X', 0, 0, 0);
      const result = taperReducer(
        activeState({ x: 0, y: 0, z: 0 }),
        { eventName: 'MILL_STATE_CHANGED' },
        ctx
      );
      expect(result!.display.X as number).toBeCloseTo(0, 4);
      expect(result!.display.Z as number).toBeCloseTo(0, 4);
    });

    it('AC 45.6: radius respects mm unit when configured', () => {
      const ctx: DROReducerContext = {
        millState: { ...createDefaultMillState('mock'), connected: true, position: { x: 5, y: 0, z: 50 } },
        nvMem: { ...DEFAULT_NON_VOLATILE_MEMORY, taperOnAxis: 'X', defaultUnit: 'mm' },
      };
      const result = taperReducer(
        activeState({ x: 0, y: 0, z: 0 }),
        { eventName: 'MILL_STATE_CHANGED' },
        ctx
      );
      // mm mode: radius shown directly as 5
      expect(result!.display.Z as number).toBeCloseTo(5, 4);
      // angle is always degrees regardless of unit
      expect(result!.display.X as number).toBeCloseTo(5.7106, 3);
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

  describe('degenerate geometry', () => {
    it('pure radius move with zero length gives 90 degree angle', () => {
      const ctx = contextWith('X', 5, 0, 0);
      const result = taperReducer(
        activeState({ x: 0, y: 0, z: 0 }),
        { eventName: 'MILL_STATE_CHANGED' },
        ctx
      );
      expect(result!.display.X as number).toBeCloseTo(90, 3);
    });

    it('negative deltas produce a negative angle', () => {
      const ctx = contextWith('X', -5, 0, 50);
      const result = taperReducer(
        activeState({ x: 0, y: 0, z: 0 }),
        { eventName: 'MILL_STATE_CHANGED' },
        ctx
      );
      expect(result!.display.X as number).toBeCloseTo(-5.7106, 3);
    });
  });
});
