/**
 * Type Guards Tests
 *
 * Tests for DRO mode state type guard functions.
 */

import { describe, it, expect } from 'vitest';
import {
  isFunctionMenuSelectionState,
  isCollectingPoints,
  isCenterLineState,
  isCenterCircleState,
  isResultState,
  isFunctionActive,
} from './index';
import type { DROStateName } from './droStateMachine';

describe('isFunctionMenuSelectionState', () => {
  it('should return true for function menu selection states', () => {
    const menuStates: DROStateName[] = [
      'function-menu-center',
      'function-menu-circle',
      'function-menu-line',
      'function-menu-linear',
      'function-menu-polar',
    ];

    for (const state of menuStates) {
      expect(isFunctionMenuSelectionState(state)).toBe(true);
    }
  });

  it('should return false for non-menu states', () => {
    const nonMenuStates: DROStateName[] = [
      'boot',
      'boot-show-message',
      'idle',
      'abs-inc-mode',
      'inch-mm-mode',
    ];

    for (const state of nonMenuStates) {
      expect(isFunctionMenuSelectionState(state)).toBe(false);
    }
  });

  it('should return false for point collection states', () => {
    const pointStates: DROStateName[] = [
      'function-menu-center-line-point-1',
      'function-menu-center-line-point-2',
      'function-menu-center-circle-point-1',
      'function-menu-center-circle-point-2',
      'function-menu-center-circle-point-3',
    ];

    for (const state of pointStates) {
      expect(isFunctionMenuSelectionState(state)).toBe(false);
    }
  });

  it('should return false for result states', () => {
    const resultStates: DROStateName[] = [
      'function-menu-center-line-result',
      'function-menu-center-circle-result',
    ];

    for (const state of resultStates) {
      expect(isFunctionMenuSelectionState(state)).toBe(false);
    }
  });
});

describe('isCollectingPoints', () => {
  it('should return true for all point collection states', () => {
    const pointStates: DROStateName[] = [
      'function-menu-center-line-point-1',
      'function-menu-center-line-point-2',
      'function-menu-center-circle-point-1',
      'function-menu-center-circle-point-2',
      'function-menu-center-circle-point-3',
    ];

    for (const state of pointStates) {
      expect(isCollectingPoints(state)).toBe(true);
    }
  });

  it('should return false for non-point states', () => {
    const nonPointStates: DROStateName[] = [
      'boot',
      'boot-show-message',
      'idle',
      'abs-inc-mode',
      'inch-mm-mode',
      'function-menu-center',
      'function-menu-circle',
      'function-menu-center-line-result',
      'function-menu-center-circle-result',
    ];

    for (const state of nonPointStates) {
      expect(isCollectingPoints(state)).toBe(false);
    }
  });
});

describe('isCenterLineState', () => {
  it('should return true for center-line states', () => {
    const lineStates: DROStateName[] = [
      'function-menu-center-line-point-1',
      'function-menu-center-line-point-2',
      'function-menu-center-line-result',
    ];

    for (const state of lineStates) {
      expect(isCenterLineState(state)).toBe(true);
    }
  });

  it('should return false for center-circle states', () => {
    const circleStates: DROStateName[] = [
      'function-menu-center-circle-point-1',
      'function-menu-center-circle-point-2',
      'function-menu-center-circle-point-3',
      'function-menu-center-circle-result',
    ];

    for (const state of circleStates) {
      expect(isCenterLineState(state)).toBe(false);
    }
  });

  it('should return false for non-center-finding states', () => {
    const otherStates: DROStateName[] = [
      'boot',
      'boot-show-message',
      'idle',
      'function-menu-center',
      'function-menu-circle',
    ];

    for (const state of otherStates) {
      expect(isCenterLineState(state)).toBe(false);
    }
  });
});

describe('isCenterCircleState', () => {
  it('should return true for center-circle states', () => {
    const circleStates: DROStateName[] = [
      'function-menu-center-circle-point-1',
      'function-menu-center-circle-point-2',
      'function-menu-center-circle-point-3',
      'function-menu-center-circle-result',
    ];

    for (const state of circleStates) {
      expect(isCenterCircleState(state)).toBe(true);
    }
  });

  it('should return false for center-line states', () => {
    const lineStates: DROStateName[] = [
      'function-menu-center-line-point-1',
      'function-menu-center-line-point-2',
      'function-menu-center-line-result',
    ];

    for (const state of lineStates) {
      expect(isCenterCircleState(state)).toBe(false);
    }
  });

  it('should return false for non-center-finding states', () => {
    const otherStates: DROStateName[] = [
      'boot',
      'boot-show-message',
      'idle',
      'function-menu-center',
      'function-menu-circle',
    ];

    for (const state of otherStates) {
      expect(isCenterCircleState(state)).toBe(false);
    }
  });
});

describe('isResultState', () => {
  it('should return true for result states', () => {
    const resultStates: DROStateName[] = [
      'function-menu-center-line-result',
      'function-menu-center-circle-result',
    ];

    for (const state of resultStates) {
      expect(isResultState(state)).toBe(true);
    }
  });

  it('should return false for point collection states', () => {
    const pointStates: DROStateName[] = [
      'function-menu-center-line-point-1',
      'function-menu-center-line-point-2',
      'function-menu-center-circle-point-1',
      'function-menu-center-circle-point-2',
      'function-menu-center-circle-point-3',
    ];

    for (const state of pointStates) {
      expect(isResultState(state)).toBe(false);
    }
  });

  it('should return false for menu and other states', () => {
    const otherStates: DROStateName[] = [
      'boot',
      'boot-show-message',
      'idle',
      'function-menu-center',
      'function-menu-circle',
    ];

    for (const state of otherStates) {
      expect(isResultState(state)).toBe(false);
    }
  });
});

describe('isFunctionActive', () => {
  it('should return true for all function-menu-* states', () => {
    const functionStates: DROStateName[] = [
      'function-menu-center',
      'function-menu-circle',
      'function-menu-line',
      'function-menu-linear',
      'function-menu-polar',
      'function-menu-center-line-point-1',
      'function-menu-center-line-point-2',
      'function-menu-center-line-result',
      'function-menu-center-circle-point-1',
      'function-menu-center-circle-point-2',
      'function-menu-center-circle-point-3',
      'function-menu-center-circle-result',
    ];

    for (const state of functionStates) {
      expect(isFunctionActive(state)).toBe(true);
    }
  });

  it('should return false for non-function states', () => {
    const nonFunctionStates: DROStateName[] = [
      'boot',
      'boot-show-message',
      'idle',
      'abs-inc-mode',
      'inch-mm-mode',
    ];

    for (const state of nonFunctionStates) {
      expect(isFunctionActive(state)).toBe(false);
    }
  });
});

describe('type guard combinations', () => {
  it('should correctly categorize menu selection states', () => {
    const state: DROStateName = 'function-menu-center';

    expect(isFunctionMenuSelectionState(state)).toBe(true);
    expect(isFunctionActive(state)).toBe(true);
    expect(isCollectingPoints(state)).toBe(false);
    expect(isResultState(state)).toBe(false);
    expect(isCenterLineState(state)).toBe(false);
    expect(isCenterCircleState(state)).toBe(false);
  });

  it('should correctly categorize point collection states', () => {
    const state: DROStateName = 'function-menu-center-line-point-1';

    expect(isFunctionMenuSelectionState(state)).toBe(false);
    expect(isFunctionActive(state)).toBe(true);
    expect(isCollectingPoints(state)).toBe(true);
    expect(isResultState(state)).toBe(false);
    expect(isCenterLineState(state)).toBe(true);
    expect(isCenterCircleState(state)).toBe(false);
  });

  it('should correctly categorize result states', () => {
    const state: DROStateName = 'function-menu-center-circle-result';

    expect(isFunctionMenuSelectionState(state)).toBe(false);
    expect(isFunctionActive(state)).toBe(true);
    expect(isCollectingPoints(state)).toBe(false);
    expect(isResultState(state)).toBe(true);
    expect(isCenterLineState(state)).toBe(false);
    expect(isCenterCircleState(state)).toBe(true);
  });

  it('should correctly categorize idle state', () => {
    const state: DROStateName = 'idle';

    expect(isFunctionMenuSelectionState(state)).toBe(false);
    expect(isFunctionActive(state)).toBe(false);
    expect(isCollectingPoints(state)).toBe(false);
    expect(isResultState(state)).toBe(false);
    expect(isCenterLineState(state)).toBe(false);
    expect(isCenterCircleState(state)).toBe(false);
  });
});
