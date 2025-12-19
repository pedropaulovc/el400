/**
 * DRO State Machine Context
 *
 * React context provider and hooks for the DRO state machine.
 */
/* eslint-disable react-refresh/only-export-components -- Context files commonly export both Provider and hooks */

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type ReactNode,
  type Dispatch,
} from 'react';
import type { DROStatePayload, DROReducerContext } from './types';
import type {
  DROStateName,
  DROStateData as DROStateData,
  DROEventPayload,
} from './droStateMachine';
import { INITIAL_DRO_STATE_PAYLOAD } from './droStateMachine';
import { droReducer } from './reducer';
import { useMillStateContext } from '../context/MillStateContext';
import { useNonVolatileMemoryContext } from '../context/NonVolatileMemoryContext';
import type { VolatileMemoryState } from '../types/volatileMemory';

// ─────────────────────────────────────────────────────────────────
// CONTEXT
// ─────────────────────────────────────────────────────────────────

interface DROContextValue {
  state: DROStateName;
  data: DROStateData;
  vMem: VolatileMemoryState;
  dispatch: Dispatch<DROEventPayload>;
}

const DROReactContext = createContext<DROContextValue | null>(null);

// ─────────────────────────────────────────────────────────────────
// PROVIDER
// ─────────────────────────────────────────────────────────────────

export interface DROStateMachineProviderProps {
  children: ReactNode;
  initialState?: DROStatePayload;
}

export function DROStateMachineProvider({
  children,
  initialState = INITIAL_DRO_STATE_PAYLOAD,
}: DROStateMachineProviderProps) {
  const { millState } = useMillStateContext();
  const { nvMem } = useNonVolatileMemoryContext();

  // Create a reducer wrapper that injects the context
  const reducerWithContext = useCallback(
    (current: DROStatePayload, event: DROEventPayload): DROStatePayload => {
      const context: DROReducerContext = { millState, nvMem };
      return droReducer(current, event, context);
    },
    [millState, nvMem]
  );

  const [{ stateName: state, stateData: data, vMem }, dispatch] = useReducer(
    reducerWithContext,
    initialState
  );

  return (
    <DROReactContext.Provider value={{ state, data, vMem, dispatch }}>
      {children}
    </DROReactContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────────────────────────────

function useDROContextInternal(): DROContextValue {
  const context = useContext(DROReactContext);
  if (!context) {
    throw new Error('useDROState must be used within a DROProvider');
  }
  return context;
}

/** Get current DRO state */
export function useDROStateName(): DROStateName {
  return useDROContextInternal().state;
}

/** Get DRO context data (stored points, results, etc.) */
export function useDROStateData(): DROStateData {
  return useDROContextInternal().data;
}

/** Get volatile memory state */
export function useDROVolatileMemory(): VolatileMemoryState {
  return useDROContextInternal().vMem;
}

/** Get dispatch function for sending events */
export function useDROEventDispatch(): Dispatch<DROEventPayload> {
  return useDROContextInternal().dispatch;
}
