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
  type ReactNode,
  type Dispatch,
} from 'react';
import type { DROStatePayload } from './types';
import type {
  DROStateName,
  DROStateData as DROStateData,
  DROEventPayload,
} from './droStateMachine';
import {
  INITIAL_DRO_STATE,
  INITIAL_DRO_STATE_DATA,
} from './droStateMachine';
import { droReducer } from './reducer';

// ─────────────────────────────────────────────────────────────────
// INITIAL STATE
// ─────────────────────────────────────────────────────────────────

const INITIAL_DRO_STATE_PAYLOAD: DROStatePayload = {
  stateName: INITIAL_DRO_STATE,
  stateData: INITIAL_DRO_STATE_DATA,
};

// ─────────────────────────────────────────────────────────────────
// CONTEXT
// ─────────────────────────────────────────────────────────────────

interface DROContextValue {
  state: DROStateName;
  data: DROStateData;
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
  const [{ stateName: state, stateData: data }, dispatch] = useReducer(droReducer, initialState);

  return (
    <DROReactContext.Provider value={{ state, data, dispatch }}>
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

/** Get dispatch function for sending events */
export function useDROEventDispatch(): Dispatch<DROEventPayload> {
  return useDROContextInternal().dispatch;
}
