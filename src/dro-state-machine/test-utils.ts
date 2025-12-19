/**
 * Test utilities for DRO state machine tests.
 */

import type { DROReducerContext, DROStatePayload } from './types';
import type { DROStateName, DROStateData } from './droStateMachine';
import { INITIAL_DRO_STATE_DATA } from './droStateMachine';
import { INITIAL_VOLATILE_MEMORY_STATE } from '../types/volatileMemory';
import { DEFAULT_NON_VOLATILE_MEMORY } from '../types/nonVolatileMemory';
import { createDefaultMillState } from '../types/millState';

/**
 * Default mock context for reducer tests.
 */
export const DEFAULT_TEST_CONTEXT: DROReducerContext = {
  millState: createDefaultMillState('noop'),
  nvMem: DEFAULT_NON_VOLATILE_MEMORY,
};

/**
 * Create a state payload with default vMem for testing.
 */
export function createTestState(
  stateName: DROStateName,
  stateData: DROStateData = INITIAL_DRO_STATE_DATA
): DROStatePayload {
  return {
    stateName,
    stateData,
    vMem: INITIAL_VOLATILE_MEMORY_STATE,
  };
}
