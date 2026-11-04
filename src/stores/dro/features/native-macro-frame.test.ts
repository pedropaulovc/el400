import { describe, expect, it, vi } from 'vitest';
import { angleHoleReducer } from './angle-hole';
import { arcContourReducer } from './arc-contour';
import { boltHoleReducer } from './bolt-hole';
import { distanceToGoReducer } from './distance-to-go';
import { gridReducer } from './grid';
import { linearBoltHoleReducer } from './linear-bolt-hole';
import { sdmReducer } from './sdm';
import {
  INITIAL_ANGLE_HOLE_DATA, INITIAL_ARC_DATA, INITIAL_BOLT_HOLE_DATA,
  INITIAL_GRID_DATA, INITIAL_LINEAR_BOLT_HOLE_DATA, INITIAL_PRESET_DATA, INITIAL_SDM_DATA,
} from '../droStateMachine';
import { createTestState, DEFAULT_TEST_CONTEXT } from '../test-utils';
import { INITIAL_VOLATILE_MEMORY_STATE } from '../../../types/volatileMemory';
import { useMillStore } from '../../millStore';
import type { DROStatePayload } from '../types';

const context = {
  ...DEFAULT_TEST_CONTEXT,
  nvMem: { ...DEFAULT_TEST_CONTEXT.nvMem, defaultUnit: 'mm' as const },
  millState: {
    ...DEFAULT_TEST_CONTEXT.millState,
    connected: true,
    position: { x: 100, y: 200, z: 300 },
    workPosition: { x: 10, y: 15, z: 20 },
    workPositionControl: { availability: 'ready' as const, pending: null, error: null },
  },
};
const vMem = {
  ...INITIAL_VOLATILE_MEMORY_STATE,
  mode: 'inc' as const,
  workOffsets: { X: 1, Y: 2, Z: 3 },
  incrementalOffsets: { X: 70, Y: 160, Z: 250 },
};

const cases: { name: string; state: DROStatePayload; reducer: typeof angleHoleReducer }[] = [
  {
    name: 'distance-to-go', reducer: distanceToGoReducer,
    state: createTestState('distance-to-go', { ...INITIAL_PRESET_DATA, presetTargets: { X: 30, Y: 40, Z: null } }),
  },
  {
    name: 'angle hole', reducer: angleHoleReducer,
    state: createTestState('angle-hole-navigate', { ...INITIAL_ANGLE_HOLE_DATA, startX: 30, startY: 40, pitch: 10, lineAngle: 0, holeCount: 3, currentHole: 1 }),
  },
  {
    name: 'arc contour', reducer: arcContourReducer,
    state: createTestState('arc-contour-navigate', { ...INITIAL_ARC_DATA, centerX: 20, centerY: 40, radius: 10, startAngle: 0, endAngle: 90, toolDiameter: 0, cutType: 'MID', maxCut: 5, pointCount: 3, currentPoint: 1 }),
  },
  {
    name: 'bolt hole', reducer: boltHoleReducer,
    state: createTestState('bolt-hole-circle-navigate', { ...INITIAL_BOLT_HOLE_DATA, centerX: 20, centerY: 40, radius: 10, startAngle: 0, holeCount: 4, currentHole: 1 }),
  },
  {
    name: 'grid', reducer: gridReducer,
    state: createTestState('grid-navigate', { ...INITIAL_GRID_DATA, startX: 30, startY: 40, pitchX: 10, pitchY: 10, angle: 0, holesX: 2, holesY: 2, currentHole: 1 }),
  },
  {
    name: 'SDM run', reducer: sdmReducer,
    state: createTestState('sdm-run-active', { ...INITIAL_SDM_DATA, sdmMode: 'RUN', currentStep: 1, points: { 1: { X: 30, Y: 40, Z: 20 } } }),
  },
];

describe('native CNCjs macro coordinate frames', () => {
  it.each(cases)('$name navigation subtracts WPos, not MPos or the local INC datum', ({ state, reducer }) => {
    const request = vi.spyOn(useMillStore.getState(), 'requestWorkPosition').mockResolvedValue();
    try {
      const result = reducer({ ...state, vMem }, { eventName: 'MILL_STATE_CHANGED' }, context)!;
      expect(result.vMem.mode).toBe('inc');
      expect(result.display.X).toBeCloseTo(20);
      expect(result.display.Y).toBeCloseTo(25);
      expect(result.stateData).toEqual(state.stateData);
      expect(result.vMem.workOffsets).toEqual(vMem.workOffsets);
      expect(result.vMem.incrementalOffsets).toEqual(vMem.incrementalOffsets);
      expect(request).not.toHaveBeenCalled();
    } finally {
      request.mockRestore();
    }
  });

  it.each(cases)('$name shows no Conn for unknown native WPos instead of NaN', ({ state, reducer }) => {
    const { workPosition: _workPosition, ...millState } = context.millState;
    const unknown = { ...context, millState };
    const result = reducer({ ...state, vMem }, { eventName: 'MILL_STATE_CHANGED' }, unknown)!;
    expect(result.stateName).toBe(state.stateName);
    expect(result.display.X).toBe('no Conn');
    expect(result.display.Y).toBe('no Conn');
    expect(result.stateData).toEqual(state.stateData);
  });

  it('linear navigation shows no Conn for unknown native WPos', () => {
    const state = createTestState('linear-bolt-hole-navigate', {
      ...INITIAL_LINEAR_BOLT_HOLE_DATA, axis: 'X', pitch: 10, holeCount: 3, currentHole: 2,
    });
    const { workPosition: _workPosition, ...millState } = context.millState;
    const unknown = { ...context, millState };
    const result = linearBoltHoleReducer({ ...state, vMem }, { eventName: 'MILL_STATE_CHANGED' }, unknown)!;
    expect(result.stateName).toBe('linear-bolt-hole-navigate');
    expect(result.display.X).toBe('no Conn');
    expect(result.display.Y).toBe('no Conn');
  });

  it.each(['busy', 'unavailable'] as const)('does not advance linear axis selection while native control is %s', (availability) => {
    const request = vi.spyOn(useMillStore.getState(), 'requestWorkPosition').mockResolvedValue();
    try {
      const axis = createTestState('linear-bolt-hole-axis', INITIAL_LINEAR_BOLT_HOLE_DATA);
      const blocked = {
        ...context,
        millState: {
          ...context.millState,
          workPositionControl: { availability, pending: availability === 'busy' ? { y: 0 } : null, error: null },
        },
      };
      const state = { ...axis, vMem: { ...vMem, mode: 'abs' as const } };
      const result = linearBoltHoleReducer(state, { eventName: 'BTN_SELECT_X' }, blocked);
      expect(result?.stateName ?? state.stateName).toBe('linear-bolt-hole-axis');
      expect((result ?? state).vMem.mode).toBe('abs');
      expect((result ?? state).vMem.workOffsets).toEqual(vMem.workOffsets);
      expect((result ?? state).vMem.incrementalOffsets).toEqual(vMem.incrementalOffsets);
      expect(request).not.toHaveBeenCalled();
    } finally {
      request.mockRestore();
    }
  });

  it('learns SDM points in the current INC frame without writing the controller', () => {
    const request = vi.spyOn(useMillStore.getState(), 'requestWorkPosition').mockResolvedValue();
    try {
      const state = createTestState('sdm-learn-position', { ...INITIAL_SDM_DATA, currentStep: 1, learnPhase: 'step-shown' });
      const result = sdmReducer({ ...state, vMem }, { eventName: 'BTN_SELECT_X' }, context)!;
      expect(result.stateData).toEqual(expect.objectContaining({ points: { 1: { X: 30, Y: 40, Z: 50 } } }));
      expect(result.vMem.workOffsets).toEqual(vMem.workOffsets);
      expect(result.vMem.incrementalOffsets).toEqual(vMem.incrementalOffsets);
      expect(request).not.toHaveBeenCalled();
    } finally {
      request.mockRestore();
    }
  });

  it('retains a learned SDM point and step when native ABS WPos is unknown', () => {
    const request = vi.spyOn(useMillStore.getState(), 'requestWorkPosition').mockResolvedValue();
    try {
      const points = { 1: { X: 4, Y: 5, Z: 6 } };
      const state = createTestState('sdm-learn-position', {
        ...INITIAL_SDM_DATA, currentStep: 1, learnPhase: 'step-shown', points,
      });
      const { workPosition: _workPosition, ...millState } = context.millState;
      const result = sdmReducer(
        { ...state, vMem: { ...vMem, mode: 'abs' } },
        { eventName: 'BTN_SELECT_X' }, { ...context, millState }
      )!;
      expect(result.stateName).toBe('sdm-learn-position');
      expect(result.stateData).toEqual(expect.objectContaining({ currentStep: 1, learnPhase: 'step-shown', points }));
      expect(request).not.toHaveBeenCalled();
    } finally {
      request.mockRestore();
    }
  });

  it('linear pattern requests ABS zero without optimistic datum mutation, then navigates from confirmed WPos', () => {
    const request = vi.spyOn(useMillStore.getState(), 'requestWorkPosition').mockResolvedValue();
    try {
      const axis = createTestState('linear-bolt-hole-axis', INITIAL_LINEAR_BOLT_HOLE_DATA);
      const selected = linearBoltHoleReducer({ ...axis, vMem: { ...vMem, mode: 'abs' } }, { eventName: 'BTN_SELECT_X' }, context)!;
      expect(request).toHaveBeenCalledOnce();
      expect(request).toHaveBeenCalledWith({ x: 0 });
      expect(selected.stateName).toBe('linear-bolt-hole-axis');
      expect(selected.vMem.mode).toBe('abs');
      expect(selected.vMem.workOffsets).toEqual(vMem.workOffsets);
      expect(selected.vMem.incrementalOffsets).toEqual(vMem.incrementalOffsets);
      expect(selected.vMem.manualAbsoluteValues).toEqual(vMem.manualAbsoluteValues);
      // An unchanged cached WPos is not acceptance or confirmation.
      const unconfirmed = linearBoltHoleReducer(selected, { eventName: 'MILL_STATE_CHANGED' }, context)!;
      expect(unconfirmed.stateName).toBe('linear-bolt-hole-axis');
      const pendingContext = {
        ...context,
        millState: {
          ...context.millState,
          workPositionControl: { availability: 'busy' as const, pending: { x: 0 }, error: null },
        },
      };
      const pending = linearBoltHoleReducer(unconfirmed, { eventName: 'MILL_STATE_CHANGED' }, pendingContext)!;
      expect(pending.stateName).toBe('linear-bolt-hole-axis');
      const zeroedContext = { ...context, millState: { ...context.millState, workPosition: { x: 0, y: 15, z: 20 } } };
      const ready = linearBoltHoleReducer(pending, { eventName: 'MILL_STATE_CHANGED' }, zeroedContext)!;
      expect(ready.stateName).toBe('linear-bolt-hole-pitch');
      expect(ready.vMem.mode).toBe('inc');

      const navigation = { ...ready, stateName: 'linear-bolt-hole-navigate' as const, stateData: { ...INITIAL_LINEAR_BOLT_HOLE_DATA, axis: 'X' as const, pitch: 10, holeCount: 3, currentHole: 3 } };
      const confirmed = { ...context, millState: { ...context.millState, workPosition: { x: 3, y: 15, z: 20 } } };
      const result = linearBoltHoleReducer(navigation, { eventName: 'MILL_STATE_CHANGED' }, confirmed)!;
      expect(result.display.X).toBeCloseTo(17);
      expect(result.display.Y).toBeCloseTo(15);
      expect(request).toHaveBeenCalledOnce();
    } finally {
      request.mockRestore();
    }
  });

  it.each(['failure', 'disconnect'] as const)('does not advance linear parameters after native origin %s', (failure) => {
    const request = vi.spyOn(useMillStore.getState(), 'requestWorkPosition').mockResolvedValue();
    try {
      const axis = createTestState('linear-bolt-hole-axis', INITIAL_LINEAR_BOLT_HOLE_DATA);
      const initial = { ...axis, vMem: { ...vMem, mode: 'abs' as const } };
      const selected = linearBoltHoleReducer(initial, { eventName: 'BTN_SELECT_X' }, context)!;
      const pending = linearBoltHoleReducer(selected, { eventName: 'MILL_STATE_CHANGED' }, {
        ...context,
        millState: {
          ...context.millState,
          workPositionControl: { availability: 'busy', pending: { x: 0 }, error: null },
        },
      })!;
      const failed = linearBoltHoleReducer(pending, { eventName: 'MILL_STATE_CHANGED' }, {
        ...context,
        millState: {
          ...context.millState,
          connected: failure !== 'disconnect',
          workPositionControl: { availability: 'unavailable', pending: null, error: failure === 'failure' ? 'G10 failed' : null },
        },
      })!;
      const recovered = linearBoltHoleReducer(failed, { eventName: 'MILL_STATE_CHANGED' }, context)!;
      expect(recovered.stateName).toBe('linear-bolt-hole-axis');
      expect(recovered.vMem).toEqual(initial.vMem);
      expect(request).toHaveBeenCalledOnce();
      const retried = linearBoltHoleReducer(recovered, { eventName: 'BTN_SELECT_X' }, context)!;
      expect(retried.stateName).toBe('linear-bolt-hole-axis');
      expect(request).toHaveBeenCalledTimes(2);
    } finally {
      request.mockRestore();
    }
  });
});
